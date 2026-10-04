import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface InventoryFlowFieldProps {
  className?: string;
}

// ── 3D SIMPLEX NOISE GLSL ───────────────────────────────────────────────────
const simplexNoiseGLSL = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// ── VERTEX SHADER: 3D DIGITAL INVENTORY / SUPPLY CHAIN PARTICLES ─────────────
const vertexShader = `
uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uCursor3D;
uniform float uCursorActive;
uniform float uIsLight;

attribute float aBrightness;
attribute float aSize;

varying vec3 vColor;
varying float vAlpha;

${simplexNoiseGLSL}

// Smooth maximum utility for organic merging of flow ridges
float smax(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
  return mix(b, a, h) + k * h * (1.0 - h);
}

// Curved supply-chain stream flow ridge
float supplyStream(vec2 p, vec2 origin, vec2 dir, float width, float amp, float curvePhase) {
  vec2 d = p - origin;
  float t = dot(d, dir);
  float curve = sin(t * 0.18 + curvePhase) * 1.8;
  float dist = abs(dot(d, vec2(-dir.y, dir.x)) - curve);
  float shape = exp(-pow(dist / width, 2.0));
  return shape * amp;
}

void main() {
  // Calm, technical supply flow motion
  float t = uTime * 0.048;

  float xCoord = position.x;
  float zCoord = position.z;

  // 1. 2D Domain Warping for supply-chain data curvature
  vec2 warp = vec2(xCoord * 0.045, zCoord * 0.05);
  float wx = xCoord + snoise(vec3(warp, 1.4 + t * 0.2)) * 2.5;
  float wz = zCoord + snoise(vec3(warp + vec2(3.7, 2.1), 2.2 + t * 0.18)) * 2.2;

  // 2. 3–4 Broad Flowing Supply / Logistics Streams
  // Stream 1: Primary Transverse Logistics Corridor (diagonally crossing from upper left to mid-right)
  float stream1 = supplyStream(vec2(wx, wz), vec2(-18.0, -12.0), normalize(vec2(1.3, 0.7)), 3.8, 3.2, t * 0.4);

  // Stream 2: Warehouse Stock Elevation (curving along right flank)
  float stream2 = supplyStream(vec2(wx, wz), vec2(14.0, -15.0), normalize(vec2(-0.4, 1.2)), 4.2, 2.8, t * 0.3 + 2.1);

  // Stream 3: Foreground Intake Flow (soft elevation sweeping across foreground)
  float stream3 = supplyStream(vec2(wx, wz), vec2(-8.0, 4.0), normalize(vec2(1.2, 0.2)), 3.4, 1.8, t * 0.35 + 4.2);

  // Stream 4: Distant Horizon Ledger Line
  float stream4 = supplyStream(vec2(wx, wz), vec2(0.0, -16.0), normalize(vec2(1.0, 0.05)), 4.8, 2.2, t * 0.25 + 1.1);

  // Merge the streams naturally into a cohesive 3D landscape
  float majorStreams = smax(stream1, stream2, 0.65);
  majorStreams = smax(majorStreams, stream3, 0.65);
  majorStreams = smax(majorStreams, stream4, 0.65);

  // Low frequency micro-drift (stock movement rhythm)
  float stockDrift = snoise(vec3(wx * 0.08, wz * 0.08, t * 0.35)) * 0.55;

  // Central depression: keep the table/card area clean and readable
  float centerDist = length(vec2(xCoord * 0.55, zCoord * 0.75 + 1.5));
  float centerCalm = smoothstep(3.5, 15.0, centerDist);

  float finalY = -2.8 + (majorStreams * 0.75 + stockDrift) * mix(0.45, 1.0, centerCalm);

  vec3 finalPos = vec3(xCoord, finalY, zCoord);

  // 3. Localized Cursor Interaction (particles bend, brighten, and move near pointer)
  float cursorDist = distance(finalPos, uCursor3D);
  float cursorRadius = 6.2;
  float cursorInfluence = 0.0;
  if (cursorDist < cursorRadius && uCursorActive > 0.01) {
    float normDist = 1.0 - (cursorDist / cursorRadius);
    cursorInfluence = pow(normDist, 2.0) * uCursorActive;
    vec3 pushDir = normalize(finalPos - uCursor3D);
    finalPos += pushDir * cursorInfluence * 1.4;
    finalPos.y += cursorInfluence * 0.8;
  }

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // 4. Depth Stratification (Foreground larger & brighter, background tiny & subtle)
  float depthFactor = clamp((zCoord - (-18.0)) / (7.5 - (-18.0)), 0.0, 1.0);

  // Depth-based particle sizing
  float baseSize = mix(1.1, 2.8, depthFactor) * aSize;
  baseSize += cursorInfluence * 1.5;
  gl_PointSize = baseSize * uPixelRatio * (32.0 / -mvPosition.z);

  // 5. Technical Palette: Soft White, Cool Slate, Subtle ARMOR Cyan Accents
  vec3 colBg = vec3(0.36, 0.48, 0.52);       // distant cool slate
  vec3 colMid = vec3(0.72, 0.82, 0.86);      // midground pale slate
  vec3 colFg = vec3(0.92, 0.96, 0.98);       // foreground soft starlight white
  vec3 colAccent = vec3(0.22, 0.66, 0.98);   // ARMOR blue / cyan (#38BDF8)

  vec3 baseColor = depthFactor < 0.5
    ? mix(colBg, colMid, depthFactor / 0.5)
    : mix(colMid, colFg, (depthFactor - 0.5) / 0.5);

  // Topographic lighting on crests & streams
  float heightNorm = clamp((finalY - (-2.8)) / 3.8, 0.0, 1.0);
  float crest = smoothstep(0.55, 0.95, heightNorm);

  // Subtle traveling stock pulse along streams
  float pulse = sin(wx * 0.35 - t * 2.2 + wz * 0.25);
  float pulseBright = smoothstep(0.85, 1.0, pulse) * crest;

  vec3 litColor = mix(baseColor, colAccent, pulseBright * 0.65 + cursorInfluence * 0.4);
  vColor = mix(litColor, vec3(1.0, 1.0, 1.0), crest * 0.45);

  // 6. Density & Framing: Concentrated around stream formations, clean negative space
  float streamDensity = smoothstep(0.12, 1.6, majorStreams);
  float horizonFade = smoothstep(-18.0, -14.0, zCoord);
  float lateralFade = smoothstep(25.5, 19.0, abs(xCoord));

  float alpha = (0.22 + streamDensity * 0.55 + crest * 0.25 + aBrightness * 0.12)
    * horizonFade * lateralFade;

  // Reduce opacity in the central region for maximum table legibility
  alpha *= mix(0.38, 1.0, centerCalm);
  alpha += cursorInfluence * 0.35;

  if (uIsLight > 0.5) {
    // ── LIGHT MODE: UNIFIED ARMOR LIGHT-MODE DATA PARTICLE SYSTEM ──────────
    // Main particles:              #8FA8BE (0.561, 0.659, 0.745)
    // Secondary particles:         #B7C6D5 (0.718, 0.776, 0.835)
    // ARMOR Blue accent particles: #4BA3FF (0.294, 0.639, 1.000)
    // Very subtle highlight:       #1677E8 (0.086, 0.467, 0.910)
    vec3 colMain = vec3(0.561, 0.659, 0.745);
    vec3 colSec  = vec3(0.718, 0.776, 0.835);
    vec3 colAcc  = vec3(0.294, 0.639, 1.000);
    vec3 colHi   = vec3(0.086, 0.467, 0.910);

    vec3 lightCol = depthFactor < 0.45 ? colSec : colMain;
    if (pulseBright > 0.45) {
      lightCol = mix(lightCol, colAcc, 0.85);
    } else if (crest > 0.60) {
      lightCol = mix(lightCol, colHi, 0.55);
    }
    vColor = lightCol;

    // Opacity: Background 0.18-0.28, Middle 0.28-0.40, Foreground 0.40-0.55, Accent 0.25-0.45
    float targetAlpha = depthFactor < 0.42
      ? mix(0.18, 0.28, depthFactor / 0.42)
      : depthFactor < 0.75
      ? mix(0.28, 0.40, (depthFactor - 0.42) / 0.33)
      : mix(0.40, 0.55, (depthFactor - 0.75) / 0.25);

    if (pulseBright > 0.45) {
      targetAlpha = mix(0.25, 0.45, pulseBright);
    }

    alpha = targetAlpha * horizonFade * lateralFade * mix(0.55, 1.0, centerCalm);
    gl_PointSize = clamp(baseSize * uPixelRatio * (38.0 / -mvPosition.z), 1.25, 4.0);
  }

  vAlpha = clamp(alpha, 0.0, 0.92);
}
`;

// ── FRAGMENT SHADER: CIRCULAR GAUSSIAN PARTICLES ────────────────────────────
const fragmentShader = `
uniform float uIsLight;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float distSq = dot(coord, coord);
  if (distSq > 0.25) discard;

  if (uIsLight > 0.5) {
    float radial = smoothstep(0.5, 0.08, length(coord));
    float finalAlpha = vAlpha * radial;
    if (finalAlpha < 0.003) discard;
    gl_FragColor = vec4(vColor, finalAlpha);
  } else {
    float radial = 1.0 - smoothstep(0.0, 0.25, distSq);
    float core = 1.0 - smoothstep(0.0, 0.06, distSq);
    gl_FragColor = vec4(vColor, vAlpha * (radial * 0.65 + core * 0.35));
  }
}
`;

export function InventoryFlowField({ className = "" }: InventoryFlowFieldProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // ── 1. Scene, Camera & High-Performance WebGL Renderer ─────────────────
    const scene = new THREE.Scene();
    scene.background = null;

    let width = container.clientWidth || (window.innerWidth - 256);
    let height = container.clientHeight || (window.innerHeight - 62);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    // Elevated downward-pitch perspective for deep supply-chain terrain
    camera.position.set(0, 6.8, 19.0);
    camera.rotation.set(-0.31, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── 2. Structured 3D Coordinate Grid (120 x 55 = 6,600 Particles) ─────
    const COLS = 120;
    const ROWS = 55;
    const count = COLS * ROWS;

    const positions = new Float32Array(count * 3);
    const brightness = new Float32Array(count);
    const sizes = new Float32Array(count);

    const minX = -26.0;
    const maxX = 26.0;
    const minZ = -18.0;
    const maxZ = 8.0;

    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      const v = r / (ROWS - 1);
      const z = minZ + v * (maxZ - minZ);
      for (let c = 0; c < COLS; c++) {
        const u = c / (COLS - 1);
        const x = minX + u * (maxX - minX);

        // Micro-jitter to prevent artificial grid rigidity while keeping contour continuity
        const jx = (Math.sin(c * 17.1 + r * 31.7) * 0.5 + 0.5) * 0.14 - 0.07;
        const jz = (Math.cos(c * 23.3 + r * 19.1) * 0.5 + 0.5) * 0.14 - 0.07;

        positions[idx * 3 + 0] = x + jx;
        positions[idx * 3 + 1] = -2.8;
        positions[idx * 3 + 2] = z + jz;

        brightness[idx] = Math.random();
        sizes[idx] = 0.8 + Math.random() * 0.45;

        idx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    // ── 3. Shaders & Dynamic Uniforms ──────────────────────────────────────
    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uCursor3D: { value: new THREE.Vector3(0, -999, 0) },
      uCursorActive: { value: 0.0 },
      uIsLight: { value: 0.0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ── 4. Smooth Localized Pointer / Cursor Interaction ───────────────────
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.8);
    const mouseNorm = new THREE.Vector2(-999, -999);
    let cursor3DTarget = new THREE.Vector3(0, -2.8, 0);
    let cursor3DCurrent = new THREE.Vector3(0, -2.8, 0);
    let cursorActiveTarget = 0.0;
    let cursorActiveCurrent = 0.0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseNorm.set(x, y);

      raycaster.setFromCamera(mouseNorm, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        cursor3DTarget.copy(hit);
        cursorActiveTarget = 1.0;
      }
    };

    const handlePointerLeave = () => {
      cursorActiveTarget = 0.0;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    // ── 5. Responsive Resize Handling ──────────────────────────────────────
    const handleResize = () => {
      width = container.clientWidth || (window.innerWidth - 256);
      height = container.clientHeight || (window.innerHeight - 62);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      const pr = Math.min(window.devicePixelRatio || 1, 2.0);
      renderer.setPixelRatio(pr);
      uniforms.uPixelRatio.value = pr;
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // ── 6. Continuous 60fps Hypnotic Animation Loop ─────────────────────────
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();

      // Check current theme dynamically
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      uniforms.uIsLight.value = isLight ? 1.0 : 0.0;
      const targetBlending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (material.blending !== targetBlending) {
        material.blending = targetBlending;
        material.needsUpdate = true;
      }

      // Cursor position interpolation
      cursor3DCurrent.lerp(cursor3DTarget, 0.06);
      cursorActiveCurrent += (cursorActiveTarget - cursorActiveCurrent) * 0.05;
      uniforms.uCursor3D.value.copy(cursor3DCurrent);
      uniforms.uCursorActive.value = cursorActiveCurrent;

      if (!prefersReducedMotion) {
        uniforms.uTime.value = time;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // ── 7. Teardown on Unmount ──────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      resizeObserver.disconnect();

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`inventory-flow-canvas ${className}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 62,
        left: 256,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric Backlighting Gradient Behind Supply Formations ───────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: -1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "0%",
            left: "50%",
            width: "85vw",
            height: "55vh",
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse at 50% 80%, rgba(56, 189, 248, 0.06) 0%, rgba(15, 23, 42, 0.05) 50%, transparent 80%)",
            filter: "blur(110px)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
