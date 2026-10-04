import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface DealsStarFlowFieldProps {
  hoveredDealId?: string | null;
  hoveredYRatio?: number | null; // Normalized Y position [0, 1] of hovered deal
  hasDeals?: boolean;
  className?: string;
}

// ── 3D SIMPLEX NOISE GLSL ROUTINES ──────────────────────────────────────────
const noiseGLSL = `
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

// ── STAR FLOW VERTEX SHADER ─────────────────────────────────────────────────
const starVertexShader = `
${noiseGLSL}

attribute vec3 aSeed;
attribute float aLayer;      // 0.0 = Background, 1.0 = Midground Streams, 2.0 = Foreground
attribute float aStreamId;   // 0.0 = ambient, 1.0-5.0 = 5 distinct curved space-time flow streams
attribute float aSpeed;      // Individual speed multiplier
attribute float aIsStreak;   // 1.0 for 1-3% velocity streak particles, 0.0 otherwise
attribute float aSize;
attribute float aBaseAlpha;

uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uCursor2D;
uniform float uCursorActive;
uniform float uHoverActive;
uniform float uHoverY;       // Local Y target of hovered deal
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
varying float vIsStreak;

// Rotation around arbitrary axis
vec3 rotateAxis(vec3 p, vec3 axis, float angle) {
  return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
}

void main() {
  vec3 pos = position;

  // ── 1. Continuous 3D Flow Field Along Curved Space-Time Streams ────────────
  // Flow progress over time: particles travel continuously along their stream
  float flowCycle = fract(aSeed.x + uTime * 0.024 * aSpeed);
  float flowPhase = flowCycle * 6.283185;

  // ── 2. The 3–5 Broad Flowing Particle Currents ─────────────────────────────
  vec3 streamOffset = vec3(0.0);
  if (aStreamId > 0.5) {
    float sId = floor(aStreamId);

    // Curved Stream 1: Upper Transverse Current (arches across upper workspace)
    if (sId < 1.5) {
      streamOffset.x += sin(flowPhase + pos.y * 0.002) * 160.0;
      streamOffset.y += cos(flowPhase * 0.7 + pos.x * 0.0015) * 80.0;
      streamOffset.z += sin(flowPhase * 0.5) * 120.0;
    }
    // Curved Stream 2: Central Equatorial Swell (flowing from deep Z into front right)
    else if (sId < 2.5) {
      streamOffset.x += cos(flowPhase + pos.z * 0.002) * 190.0;
      streamOffset.y += sin(flowPhase * 0.8) * 100.0;
      streamOffset.z += cos(flowPhase * 0.6) * 180.0;
    }
    // Curved Stream 3: Lower Diagonal Drift (sweeps diagonally beneath empty state)
    else if (sId < 3.5) {
      streamOffset.x += sin(flowPhase * 0.9 + pos.y * 0.003) * 170.0;
      streamOffset.y += -cos(flowPhase * 0.6 + pos.x * 0.002) * 110.0;
      streamOffset.z += sin(flowPhase * 0.7) * 140.0;
    }
    // Curved Stream 4: Arching Counter-Stream (loops diagonally from back-right to front-left)
    else if (sId < 4.5) {
      streamOffset.x += -cos(flowPhase * 0.85 + pos.y * 0.002) * 180.0;
      streamOffset.y += sin(flowPhase * 0.75 + pos.z * 0.0015) * 90.0;
      streamOffset.z += cos(flowPhase * 0.5) * 160.0;
    }
    // Curved Stream 5: Deep Space Undercurrent
    else {
      streamOffset.x += sin(flowPhase * 0.6) * 130.0;
      streamOffset.y += cos(flowPhase * 0.5) * 70.0;
      streamOffset.z += sin(flowPhase * 0.4) * 200.0;
    }
  }

  // ── 3. Large-Scale Low-Frequency Spatial Wave (Spans entire workspace) ──────
  float macroWave = sin(pos.x * 0.0014 + pos.y * 0.0018 + uTime * 0.06) * 130.0;
  pos.z += macroWave;
  pos += streamOffset;

  // ── 4. Curving Around Enormous Invisible Sphere (Requirement 15) ───────────
  // Field wraps around an enormous invisible spherical structure centered at (40, -60, -220)
  vec3 sphereCenter = vec3(40.0, -60.0, -220.0);
  vec3 toCenter = pos - sphereCenter;
  float distToSphere = length(toCenter);
  vec3 sphereNorm = normalize(toCenter);
  // Gentle spherical deflection gives invisible giant curvature
  pos += sphereNorm * sin(distToSphere * 0.0026 - uTime * 0.09) * 55.0;

  // ── 5. Organic 3D Space-Time Turbulence & Density Morphing (30-60s cycle) ──
  float tDensity = uTime * (6.283185 / 45.0);
  vec3 noiseCoord = pos * 0.0012 + vec3(tDensity * 0.14, tDensity * 0.10, tDensity * 0.08);
  vec3 turbulence = vec3(
    snoise(noiseCoord),
    snoise(noiseCoord + vec3(4.3, 1.7, 8.2)),
    snoise(noiseCoord + vec3(8.5, 3.1, 5.7))
  ) * 55.0;
  pos += turbulence;

  // ── 6. Slow Underlying 3D Field Rotation (~115s revolution) ────────────────
  vec3 rotAxis = normalize(vec3(0.18, 1.0, 0.12));
  float rotAngle = uTime * (6.283185 / 115.0);
  // Layer parallax: foreground rotates slightly faster than deep background
  rotAngle *= (1.0 + (aLayer - 1.0) * 0.06);
  vec3 rotPos = rotateAxis(pos, rotAxis, rotAngle);

  // ── 7. Camera View Space Transformation ───────────────────────────────────
  vec4 mvPosition = modelViewMatrix * vec4(rotPos, 1.0);

  // ── 8. Cursor Localized Interaction (Gentle Deflection & Brighten) ─────────
  float distToCursor = length(mvPosition.xy - uCursor2D);
  float interactionBoost = 0.0;
  if (uCursorActive > 0.01 && distToCursor < 180.0) {
    float repel = (1.0 - distToCursor / 180.0) * uCursorActive;
    vec2 pushDir = normalize(mvPosition.xy - uCursor2D);
    mvPosition.xy += pushDir * repel * 10.0; // Subtle max 10px shift
    interactionBoost += repel * 0.40;        // Gentle luminosity boost
  }

  // ── 9. Deal Hover Inspection Surge ─────────────────────────────────────────
  if (uHoverActive > 0.01) {
    float distY = abs(mvPosition.y - uHoverY);
    float hoverReach = smoothstep(190.0, 0.0, distY) * uHoverActive;
    // Curved wave moving towards the hovered deal
    mvPosition.x += sin(uTime * 2.0 + mvPosition.y * 0.018) * hoverReach * 8.0;
    interactionBoost += hoverReach * 0.45;
  }

  gl_Position = projectionMatrix * mvPosition;

  // ── 10. Title Area Readability Shielding ───────────────────────────────────
  vec2 screenNorm = (gl_Position.xy / gl_Position.w);
  float titleCalm = 1.0;
  if (screenNorm.x < -0.06 && screenNorm.y > 0.06) {
    float distFromTitle = length(vec2(screenNorm.x + 0.06, screenNorm.y - 0.06));
    titleCalm = smoothstep(0.0, 0.45, distFromTitle);
  }

  // ── 11. 3D Star Depth & Size Scaling ──────────────────────────────────────
  vDepth = -mvPosition.z;
  vIsStreak = aIsStreak;

  // Size by layer:
  // Layer 0 (Background): 0.8-1.4px
  // Layer 1 (Midground): 1.5-2.6px
  // Layer 2 (Foreground): 2.8-4.8px
  float layerSizeMult = aLayer < 0.5 ? 0.85 : aLayer < 1.5 ? 1.45 : 2.4;
  float basePtSize = aSize * layerSizeMult;

  // Occasional streak elongation
  if (aIsStreak > 0.5) {
    basePtSize *= 1.6;
  }

  gl_PointSize = basePtSize * uPixelRatio * (420.0 / max(1.0, vDepth));
  gl_PointSize = clamp(gl_PointSize, 0.8, 16.0);

  // ── 12. Monochromatic Palette: Starlight White, Cool Slate, Subtle Cyan ────
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

    vec3 pCol = aLayer < 0.5 ? colSec : colMain;
    if (aSeed.y > 0.82) {
      pCol = colAcc;
    } else if (aSeed.y > 0.74) {
      pCol = colHi;
    }

    if (aIsStreak > 0.5) {
      pCol = mix(pCol, colAcc, 0.5);
    }

    vColor = pCol;

    // Opacity: Background 0.18-0.28, Middle 0.28-0.40, Foreground 0.40-0.55
    float targetAlpha = aLayer < 0.5
      ? mix(0.18, 0.28, aBaseAlpha)
      : aLayer < 1.5
      ? mix(0.28, 0.40, aBaseAlpha)
      : mix(0.40, 0.55, aBaseAlpha);

    if (aSeed.y > 0.82) {
      targetAlpha = mix(0.25, 0.45, aBaseAlpha);
    }

    float depthFade = smoothstep(1800.0, 400.0, vDepth);
    vAlpha = clamp(targetAlpha * depthFade * (1.0 + interactionBoost) * mix(0.50, 1.0, titleCalm), 0.0, 1.0);
    gl_PointSize = clamp(basePtSize * uPixelRatio * (520.0 / max(1.0, vDepth)), 1.15, 14.0);
  } else {
    // ── DARK MODE (100% UNCHANGED) ─────────────────────────────────────────
    vec3 colSlate = vec3(0.42, 0.48, 0.58);
    vec3 colWhite = vec3(0.96, 0.98, 1.00);
    vec3 colIce   = vec3(0.58, 0.82, 0.86);
    vec3 colCyan  = vec3(0.22, 0.74, 0.97);

    vec3 pCol = colSlate;
    if (aSeed.y > 0.80) {
      pCol = colWhite;
    } else if (aSeed.y > 0.70) {
      pCol = colIce;
    } else if (aSeed.y > 0.66) {
      pCol = colCyan;
    }

    if (aIsStreak > 0.5) {
      pCol = mix(pCol, colCyan, 0.5);
    }

    vColor = pCol;

    float layerAlpha = aLayer < 0.5 ? 0.35 : aLayer < 1.5 ? 0.75 : 1.0;
    float depthFade = smoothstep(1800.0, 400.0, vDepth);

    float finalAlpha = aBaseAlpha * layerAlpha * depthFade * (1.0 + interactionBoost) * mix(0.40, 1.0, titleCalm);
    vAlpha = clamp(finalAlpha, 0.0, 1.0);
  }
}
`;

// ── STAR FLOW FRAGMENT SHADER ───────────────────────────────────────────────
const starFragmentShader = `
uniform float uGlobalOpacity;
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
varying float vIsStreak;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);

  if (vIsStreak > 0.5) {
    coord.x *= 1.6;
    coord.y *= 0.75;
  }

  float dist = length(coord);
  if (dist > 0.5) discard;

  if (uIsLight > 0.5) {
    // Light mode: Clean circular Gaussian point cloud with normal blending
    float radial = smoothstep(0.5, 0.08, dist);
    float finalAlpha = vAlpha * radial * uGlobalOpacity;
    if (finalAlpha < 0.003) discard;
    gl_FragColor = vec4(vColor, finalAlpha);
  } else {
    // Dark mode: Exact preserved luminous point with additive core (100% unchanged)
    float radial = smoothstep(0.5, 0.06, dist);
    radial = pow(radial, 1.5);
    float core = smoothstep(0.18, 0.0, dist) * 0.42;
    vec3 color = vColor + vec3(core);
    color = mix(color, vec3(0.55, 0.80, 0.86), 0.04);

    float finalAlpha = vAlpha * radial * uGlobalOpacity;
    if (finalAlpha < 0.003) discard;

    gl_FragColor = vec4(color, finalAlpha);
  }
}
`;

// ── SUBTLE DATA CONNECTIONS (Thin lines between nearby nodes) ────────────────
const lineVertexShader = `
uniform float uTime;
attribute vec2 aSeeds;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float pulse = sin(uTime * 0.8 + aSeeds.x * 6.28) * 0.5 + 0.5;
  vAlpha = pulse * smoothstep(1800.0, 400.0, -mvPosition.z) * 0.22;
}
`;

const lineFragmentShader = `
uniform float uGlobalOpacity;
uniform float uIsLight;
varying float vAlpha;

void main() {
  float alpha = vAlpha * uGlobalOpacity;
  if (alpha < 0.004) discard;
  if (uIsLight > 0.5) {
    gl_FragColor = vec4(0.086, 0.467, 0.910, alpha * 0.65);
  } else {
    gl_FragColor = vec4(0.35, 0.78, 0.95, alpha);
  }
}
`;

export function DealsStarFlowField({
  hoveredDealId = null,
  hoveredYRatio = null,
  hasDeals = false,
  className = "",
}: DealsStarFlowFieldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hoveredDealRef = useRef<string | null>(hoveredDealId);
  const hoveredYRef = useRef<number | null>(hoveredYRatio);
  const hasDealsRef = useRef<boolean>(hasDeals);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -2000,
    y: -2000,
    active: false,
  });

  useEffect(() => {
    hoveredDealRef.current = hoveredDealId;
  }, [hoveredDealId]);

  useEffect(() => {
    hoveredYRef.current = hoveredYRatio;
  }, [hoveredYRatio]);

  useEffect(() => {
    hasDealsRef.current = hasDeals;
  }, [hasDeals]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── 1. Three.js Scene, Camera, Renderer ─────────────────────────────────
    const scene = new THREE.Scene();

    const cameraDist = 1200;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 6000);
    camera.position.set(0, 0, cameraDist);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // Transparent
    container.appendChild(renderer.domElement);

    // ── 2. Frustum Geometry ─────────────────────────────────────────────────
    const calcFrustum = (w: number, h: number) => {
      const frustumH = 2.0 * cameraDist * Math.tan((45.0 * Math.PI) / 360.0); // ~994
      const frustumW = frustumH * (w / h);
      return { frustumW, frustumH };
    };
    let dims = calcFrustum(width, height);

    // ── 3. Particle Density by Viewport (3,000–14,000 GPU Particles) ────────
    const calcParticleCount = (w: number) => {
      if (w < 600) return 3000;
      if (w < 900) return 6000;
      if (w < 1200) return 9500;
      return 14000;
    };
    const particleCount = calcParticleCount(width);

    const positions = new Float32Array(particleCount * 3);
    const seeds = new Float32Array(particleCount * 3);
    const layers = new Float32Array(particleCount);
    const streamIds = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const isStreaks = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const baseAlphas = new Float32Array(particleCount);

    // Cluster centers for subtle data nodes (Requirement 13)
    const clusterNodes: THREE.Vector3[] = [];
    const numClusters = 8;
    for (let c = 0; c < numClusters; c++) {
      clusterNodes.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * dims.frustumW * 0.9,
          (Math.random() - 0.5) * dims.frustumH * 0.85,
          (Math.random() - 0.5) * 400.0
        )
      );
    }

    // ── 4. Generate Stratified 3D Star-Flow Field ───────────────────────────
    for (let i = 0; i < particleCount; i++) {
      const rndLayer = Math.random();
      let layerVal = 1.0; // Midground default
      let sizeVal = 1.6;
      let alphaVal = 0.55;

      if (rndLayer < 0.40) {
        // Layer 0: Background faint stars (40%)
        layerVal = 0.0;
        sizeVal = 0.9 + Math.random() * 0.6;
        alphaVal = 0.18 + Math.random() * 0.22;
      } else if (rndLayer < 0.85) {
        // Layer 1: Midground flowing stream stars (45%)
        layerVal = 1.0;
        sizeVal = 1.5 + Math.random() * 1.1;
        alphaVal = 0.42 + Math.random() * 0.35;
      } else {
        // Layer 2: Foreground bright stars (15%)
        layerVal = 2.0;
        sizeVal = 2.6 + Math.random() * 1.6;
        alphaVal = 0.70 + Math.random() * 0.28;
      }

      // 15% of particles cluster around data nodes (commercial data clusters)
      let px = 0;
      let py = 0;
      let pz = 0;

      if (Math.random() < 0.15) {
        const cluster = clusterNodes[i % numClusters];
        const rad = 60.0 + Math.random() * 120.0;
        const ang = Math.random() * Math.PI * 2.0;
        px = cluster.x + Math.cos(ang) * rad;
        py = cluster.y + Math.sin(ang) * rad;
        pz = cluster.z + (Math.random() - 0.5) * 80.0;
      } else {
        // Broad spatial coverage across workspace
        px = (Math.random() - 0.5) * dims.frustumW * 1.6;
        py = (Math.random() - 0.5) * dims.frustumH * 1.6;
        pz = (Math.random() - 0.5) * 800.0;
      }

      positions[i * 3 + 0] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      seeds[i * 3 + 0] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();

      layers[i] = layerVal;

      // Assign to one of 5 curved space-time flow streams (70% in streams, 30% ambient field)
      let streamVal = 0.0;
      if (Math.random() < 0.70) {
        streamVal = 1.0 + Math.floor(Math.random() * 5.0);
      }
      streamIds[i] = streamVal;

      // Speed variation (mostly very slow, some slightly faster)
      speeds[i] = 0.65 + Math.random() * 0.75;

      // Occasional star streak (1-3% of particles)
      const isStreak = Math.random() < 0.024 ? 1.0 : 0.0;
      isStreaks[i] = isStreak;
      if (isStreak > 0.5) {
        speeds[i] *= 1.4;
      }

      sizes[i] = sizeVal;
      baseAlphas[i] = alphaVal;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    starGeometry.setAttribute("aLayer", new THREE.BufferAttribute(layers, 1));
    starGeometry.setAttribute("aStreamId", new THREE.BufferAttribute(streamIds, 1));
    starGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    starGeometry.setAttribute("aIsStreak", new THREE.BufferAttribute(isStreaks, 1));
    starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute("aBaseAlpha", new THREE.BufferAttribute(baseAlphas, 1));

    const starUniforms = {
      uTime: { value: prefersReducedMotion ? 10.0 : 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uCursor2D: { value: new THREE.Vector2(-2000, -2000) },
      uCursorActive: { value: 0 },
      uHoverActive: { value: 0 },
      uHoverY: { value: 0 },
      uGlobalOpacity: { value: hasDeals ? 0.45 : 0.85 },
      uIsLight: { value: 0 },
    };

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // ── 5. Subtle Data Connection Lines (Requirement 14) ────────────────────
    // Extremely faint, sparse connections between cluster nodes
    const linePositions: number[] = [];
    const lineSeeds: number[] = [];
    for (let c1 = 0; c1 < clusterNodes.length; c1++) {
      for (let c2 = c1 + 1; c2 < clusterNodes.length; c2++) {
        const d = clusterNodes[c1].distanceTo(clusterNodes[c2]);
        if (d < 380.0) {
          linePositions.push(
            clusterNodes[c1].x, clusterNodes[c1].y, clusterNodes[c1].z,
            clusterNodes[c2].x, clusterNodes[c2].y, clusterNodes[c2].z
          );
          lineSeeds.push(Math.random(), Math.random(), Math.random(), Math.random());
        }
      }
    }

    let lineSegments: THREE.LineSegments | null = null;
    let lineMaterial: THREE.ShaderMaterial | null = null;
    let lineGeometry: THREE.BufferGeometry | null = null;

    if (linePositions.length > 0) {
      lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
      lineGeometry.setAttribute("aSeeds", new THREE.Float32BufferAttribute(lineSeeds, 2));

      lineMaterial = new THREE.ShaderMaterial({
        vertexShader: lineVertexShader,
        fragmentShader: lineFragmentShader,
        uniforms: {
          uTime: starUniforms.uTime,
          uGlobalOpacity: starUniforms.uGlobalOpacity,
          uIsLight: starUniforms.uIsLight,
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineSegments);
    }

    // ── 6. Mouse Interaction Tracking ───────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const viewX = (clientX - width / 2) * (dims.frustumW / width);
      const viewY = -(clientY - height / 2) * (dims.frustumH / height);

      mouseRef.current = {
        x: viewX,
        y: viewY,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    // ── 7. Resize Handler ───────────────────────────────────────────────────
    const handleResize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      dims = calcFrustum(width, height);
      starUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // ── 8. Animation 60fps Render Loop ───────────────────────────────────────
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Check current theme dynamically
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      starUniforms.uIsLight.value = isLight ? 1.0 : 0.0;

      // Dynamically switch blending mode
      const targetBlending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (starMaterial.blending !== targetBlending) {
        starMaterial.blending = targetBlending;
        starMaterial.needsUpdate = true;
      }
      if (lineMaterial && lineMaterial.blending !== targetBlending) {
        lineMaterial.blending = targetBlending;
        lineMaterial.needsUpdate = true;
      }

      // Opacity: 0.85 on empty state, 0.45 when actual deal cards overlay
      const targetOpacity = isLight
        ? hasDealsRef.current
          ? 0.35
          : 0.72
        : hasDealsRef.current
        ? 0.45
        : 0.85;

      starUniforms.uGlobalOpacity.value +=
        (targetOpacity - starUniforms.uGlobalOpacity.value) * 0.05;

      // Cursor position smoothing
      const mouse = mouseRef.current;
      if (mouse.active) {
        starUniforms.uCursor2D.value.lerp(new THREE.Vector2(mouse.x, mouse.y), 0.08);
        starUniforms.uCursorActive.value += (1.0 - starUniforms.uCursorActive.value) * 0.08;
      } else {
        starUniforms.uCursorActive.value *= 0.94;
      }

      // Deal row hover inspection activation
      const isHovered = hoveredDealRef.current !== null ? 1.0 : 0.0;
      starUniforms.uHoverActive.value += (isHovered - starUniforms.uHoverActive.value) * 0.08;

      if (hoveredYRef.current !== null) {
        const target3DY = -(hoveredYRef.current - 0.5) * dims.frustumH;
        starUniforms.uHoverY.value += (target3DY - starUniforms.uHoverY.value) * 0.1;
      }

      if (!prefersReducedMotion) {
        starUniforms.uTime.value = elapsedTime;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // ── 9. Cleanup on Unmount ───────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      resizeObserver.disconnect();

      starGeometry.dispose();
      starMaterial.dispose();
      if (lineGeometry) lineGeometry.dispose();
      if (lineMaterial) lineMaterial.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`deals-star-flow-canvas ${className}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    />
  );
}
