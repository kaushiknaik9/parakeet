import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ParticleMorphSceneProps {
  className?: string;
}

// ── GLSL SHADER PIPELINE FOR 14-LAYER 3D SPACE-TIME FABRIC ──────────────────

const vertexShader = `
// 3D Simplex Noise by Stefan Gustavson / Ashima Arts
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

attribute vec3 aPosition;
attribute float aScale;
attribute float aBrightness;

uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uCursor3D;
uniform float uCursorActive;
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

// Polynomial smooth maximum (Inigo Quilez)
// Blends two elevation fields into one continuous geological landform
// without unnatural additive stacking or sharp seams
float smax(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(a, b, h) + k * h * (1.0 - h);
}

// Broad Asymmetric Gaussian Dune Body:
// Occupies a substantial area of the X/Z plane with wide windward ramp and steeper slipface
float duneBody(float dist, float sigmaWind, float sigmaSlip, float x, float xCenter, float xHalfWidth, float amp) {
  // Asymmetric cross-section: long gentle windward slope vs steeper slipface
  float sigma = dist < 0.0 ? sigmaWind : sigmaSlip;
  float transverse = exp(-(dist * dist) / (2.0 * sigma * sigma));
  
  // Longitudinal envelope: broad plateau along the dune ridge
  float xRatio = (x - xCenter) / xHalfWidth;
  float longitudinal = exp(-pow(xRatio, 4.0));
  
  // Organic crest variation along the ridge
  float crestVar = 1.0 + 0.12 * sin(x * 0.15 + 0.4);
  
  return amp * crestVar * transverse * longitudinal;
}

void main() {
  // ── 2D DOMAIN-WARPED CONTINUOUS 3D DESERT TERRAIN ───────────────────────
  // Replaces parallel spreadsheet bands with an authentic continuous desert topography:
  // 1. 2D domain warping curves ridges in multiple natural directions
  // 2. 6 broad dune masses (60% large-scale geometry)
  // 3. 2D medium dune undulations (30% medium-scale geometry)
  // 4. Fine wind ripple variation (10% fine geometry)
  // 5. Coherent coordinate displacement bends particle rows along contour lines
  // 6. Topographic chiaroscuro lighting: bright crests, medium slopes, dark valleys
  float t = uTime * 0.10;

  float zCoord = aPosition.z;
  float xCoord = aPosition.x;

  // ── 1. 2D DOMAIN WARPING ─────────────────────────────────────────────────
  // Warps (X, Z) before sampling terrain to break parallel lines and curve ridges in 3D
  vec2 warpCoord = vec2(xCoord * 0.045, zCoord * 0.050);
  float warpX = snoise(vec3(warpCoord, 1.2)) * 2.8;
  float warpZ = snoise(vec3(warpCoord + vec2(3.1, 1.7), 2.5)) * 2.2;
  float wx = xCoord + warpX;
  float wz = zCoord + warpZ;

  // ── 2. CONTINENTAL MACRO BEDROCK ─────────────────────────────────────────
  float macroBedrock = -wz * 0.035 - 0.0010 * wx * wx;

  // ── 3. SIX MAJOR BROAD DUNE MASSES IN WARPED 2D SPACE (60% of total) ─────
  // Dune 1: Major Foreground Dune (Z ≈ 3.2, X ≈ -2.0, broad windward slope beneath camera)
  float r1 = 3.2 - 0.015 * (wx + 2.0) * (wx + 2.0) + 0.12 * wx;
  float d1 = wz - r1;
  float b1 = duneBody(d1, 6.2, 2.8, wx, -2.0, 16.0, 4.5);

  // Dune 2: Transverse Grand Ridge (diagonal right-to-center)
  float r2 = -1.5 - 0.32 * wx + 1.8 * sin(wx * 0.11 + 0.4);
  float d2 = wz - r2;
  float b2 = duneBody(d2, 5.5, 2.6, wx, 7.0, 15.0, 4.2);

  // Dune 3: Mid-Ground Mega-Dune (S-curving crescent across center-left)
  float r3 = -5.8 + 0.014 * (wx - 3.5) * (wx - 3.5) - 0.20 * wx + 1.5 * cos(wx * 0.13);
  float d3 = wz - r3;
  float b3 = duneBody(d3, 5.0, 2.4, wx, -6.0, 16.0, 3.8);

  // Dune 4: Mid-Distance Seif Ridge (weaving through mid-to-back distance)
  float r4 = -9.8 - 0.22 * wx + 1.6 * sin(wx * 0.15 + 1.4);
  float d4 = wz - r4;
  float b4 = duneBody(d4, 4.6, 2.2, wx, 4.0, 17.0, 3.4);

  // Dune 5: Distant Erg Range (sweeping background dune silhouette)
  float r5 = -13.5 + 0.008 * wx * wx + 0.08 * wx + 0.8 * cos(wx * 0.17);
  float d5 = wz - r5;
  float b5 = duneBody(d5, 4.2, 2.0, wx, -2.0, 18.0, 2.8);

  // Dune 6: Horizon Sand Sea (fading into the black sky)
  float r6 = -16.5 + 0.005 * wx * wx + 0.6 * sin(wx * 0.20);
  float d6 = wz - r6;
  float b6 = duneBody(d6, 3.8, 1.9, wx, 0.0, 20.0, 2.2);

  // Seamless geological merging via smooth maximum
  float majorDunes = 0.0;
  majorDunes = smax(majorDunes, b1, 1.8);
  majorDunes = smax(majorDunes, b2, 1.8);
  majorDunes = smax(majorDunes, b3, 1.7);
  majorDunes = smax(majorDunes, b4, 1.6);
  majorDunes = smax(majorDunes, b5, 1.5);
  majorDunes = smax(majorDunes, b6, 1.4);

  // ── 4. INTERDUNE VALLEYS (Visible low ground, not holes) ─────────────────
  float lowMask = clamp((2.0 - majorDunes) / 2.0, 0.0, 1.0);
  float v1 = exp(-pow((wx - 4.0) * 0.10, 2.0) - pow((wz - 0.8) * 0.22, 2.0)) * 1.4;
  float v2 = exp(-pow((wx + 6.0) * 0.09, 2.0) - pow((wz - (-3.8)) * 0.20, 2.0)) * 1.3;
  float v3 = exp(-pow((wx - 3.0) * 0.09, 2.0) - pow((wz - (-8.0)) * 0.20, 2.0)) * 1.2;
  float valleys = (v1 + v2 + v3) * lowMask;

  // ── 5. MEDIUM-SCALE 2D DUNE TOPOLOGY (30% of total) ──────────────────────
  float med1 = sin(wz * 0.55 + wx * 0.16 + snoise(vec3(wx * 0.06, wz * 0.06, 3.4)) * 1.2);
  med1 = (med1 > 0.0 ? pow(med1, 0.85) : -pow(-med1, 1.15)) * 0.95;

  float med2 = cos(wz * 0.80 - wx * 0.20 + snoise(vec3(wx * 0.07 + 1.8, wz * 0.07, 4.1)) * 1.0);
  med2 = (med2 > 0.0 ? pow(med2, 0.85) : -pow(-med2, 1.15)) * 0.75;

  float slopeWeight = 0.45 + 0.55 * clamp(majorDunes / 2.5, 0.0, 1.0);
  float mediumTopology = (med1 + med2) * slopeWeight;

  // ── 6. FINE WIND RIPPLE VARIATION (10% of total) ─────────────────────────
  float fineVariation = snoise(vec3(wx * 0.12, wz * 0.14, t * 0.15)) * 0.35;

  // ── 7. SPACE-TIME LIVING BREATHING ───────────────────────────────────────
  float breathe = 0.12 * sin(t * 0.85 + wx * 0.06 + wz * 0.08);

  // Total continuous heightfield displacement above bedrock
  float rawDisplacement = macroBedrock + majorDunes - valleys + mediumTopology + fineVariation + breathe;

  // Horizon damping: ensures landscape flattens toward distant horizon (preserves dark sky behind headline)
  float horizonDamp = smoothstep(-18.5, -15.5, zCoord);
  // Edge damping: softens dunes at lateral borders
  float edgeDamp = smoothstep(24.5, 18.0, abs(xCoord));

  float baseElevation = -3.2 + rawDisplacement * 0.85 * horizonDamp * edgeDamp;

  // ── 8. COHERENT GRID DISPLACEMENT IN X AND Z (Bending Spreadsheet Rows) ──
  // Particle rows bend naturally along topographic contour lines
  vec3 contourCoord = vec3(xCoord * 0.045, zCoord * 0.055, 1.8);
  float contourDispX = snoise(contourCoord) * 0.90;
  float contourDispZ = snoise(contourCoord + vec3(3.2, 4.5, 0.0)) * 0.80;

  // ── 9. SUBTLE CURSOR INTERACTION — TOUCHING FABRIC ───────────────────────
  float distToCursor = length(aPosition.xz - uCursor3D.xz);
  float cursorRadius = 6.5; // Broad, soft deformation radius
  float cursorInfluence = exp(-(distToCursor * distToCursor) / (cursorRadius * cursorRadius));
  float cursorDeflection = -0.42 * cursorInfluence * uCursorActive;

  vec3 finalPos = aPosition;
  finalPos.x = xCoord + contourDispX;
  finalPos.z = zCoord + contourDispZ;
  finalPos.y = baseElevation + cursorDeflection;

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // ── 10. PARTICLE SIZING & PERSPECTIVE DEPTH COMPRESSION ──────────────────
  // Foreground: 1.5-2.0px, Middle: 1.0-1.5px, Background: 0.5-1.0px
  vDepth = -mvPosition.z;
  float pSize = (aScale * uPixelRatio * 2.1) * (18.5 / vDepth);
  if (uIsLight > 0.5) {
    gl_PointSize = clamp(pSize * 1.35, 1.15, 3.4);
  } else {
    gl_PointSize = clamp(pSize, 0.55, 2.2);
  }

  // ── 11. TOPOGRAPHIC CHIAROSCURO LIGHTING & COLOR PALETTE ─────────────────
  float depthFactor = clamp((zCoord - (-18.0)) / (7.5 - (-18.0)), 0.0, 1.0);

  if (uIsLight > 0.5) {
    // ── LIGHT MODE: UNIFIED ARMOR LIGHT-MODE DATA PARTICLE SYSTEM ──────────
    // Main particles:              #8FA8BE (0.561, 0.659, 0.745)
    // Secondary particles:         #B7C6D5 (0.718, 0.776, 0.835)
    // ARMOR Blue accent particles: #4BA3FF (0.294, 0.639, 1.000)
    // Very subtle highlight:       #1677E8 (0.086, 0.467, 0.910)
    vec3 colPrimary = vec3(0.561, 0.659, 0.745);
    vec3 colSecondary = vec3(0.718, 0.776, 0.835);
    vec3 colAccent = vec3(0.294, 0.639, 1.000);
    vec3 colHighlight = vec3(0.086, 0.467, 0.910);

    vec3 lightColor;
    float lightAlpha;

    // Depth created through varying opacity:
    // Background particles: opacity 0.18–0.28
    // Middle particles:     opacity 0.28–0.40
    // Foreground particles: opacity 0.40–0.55
    if (depthFactor < 0.42) {
      float f = depthFactor / 0.42;
      lightColor = colSecondary;
      lightAlpha = mix(0.18, 0.28, f);
    } else if (depthFactor < 0.75) {
      float f = (depthFactor - 0.42) / 0.33;
      lightColor = mix(colSecondary, colPrimary, f);
      lightAlpha = mix(0.28, 0.40, f);
    } else {
      float f = (depthFactor - 0.75) / 0.25;
      lightColor = colPrimary;
      lightAlpha = mix(0.40, 0.55, f);
    }

    // Blue accent particles (opacity 0.25–0.45) on select crest frequencies
    if (aBrightness > 0.82) {
      lightColor = mix(lightColor, colAccent, 0.85);
      lightAlpha = mix(0.25, 0.45, (aBrightness - 0.82) / 0.18);
    } else if (aBrightness > 0.75) {
      lightColor = mix(lightColor, colHighlight, 0.55);
      lightAlpha = mix(0.22, 0.35, (aBrightness - 0.75) / 0.07);
    }

    float horizonFade = smoothstep(-18.5, -15.5, zCoord);
    float lateralFade = smoothstep(24.5, 18.0, abs(xCoord));

    vColor = lightColor;
    vAlpha = clamp(lightAlpha * horizonFade * lateralFade, 0.0, 1.0);
  } else {
    // ── DARK MODE (100% UNCHANGED) ─────────────────────────────────────────
    vec3 colBg = vec3(0.361, 0.502, 0.529);   // #5C8087
    vec3 colMid = vec3(0.725, 0.831, 0.847);  // #B9D4D8
    vec3 colFg = vec3(0.867, 0.937, 0.949);   // #DDEFF2

    vec3 baseColor;
    if (depthFactor < 0.5) {
      baseColor = mix(colBg, colMid, depthFactor / 0.5);
    } else {
      baseColor = mix(colMid, colFg, (depthFactor - 0.5) / 0.5);
    }

    // Topographic lighting: bright crests, medium slopes, dark valleys
    float heightAboveFloor = clamp((finalPos.y - (-3.6)) / 4.2, 0.0, 1.0);
    float crest = smoothstep(0.65, 0.95, heightAboveFloor);
    float valleyShadow = smoothstep(0.35, 0.05, heightAboveFloor);

    // Valleys take on deep shadowed cyan, crests catch pure white specular gleam
    vec3 litColor = mix(baseColor, vec3(0.24, 0.35, 0.38), valleyShadow * 0.45);
    vColor = mix(litColor, vec3(1.0, 1.0, 1.0), crest * 0.65);

    // Full terrain visibility & depth opacity (no empty black holes)
    float valleyFloorAlpha = 0.38 + 0.42 * depthFactor;
    float crestBonus = crest * 0.30;
    float horizonFade = smoothstep(-18.5, -15.5, zCoord);
    float lateralFade = smoothstep(24.5, 18.0, abs(xCoord));

    vAlpha = clamp((valleyFloorAlpha + aBrightness * 0.12 + crestBonus) * horizonFade * lateralFade, 0.0, 1.0);
  }
}
`;

const fragmentShader = `
precision highp float;

uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  // Circular soft particle with Gaussian-like falloff
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  if (uIsLight > 0.5) {
    // Light mode: Clean, soft Gaussian edge without white glow blowout
    float radial = smoothstep(0.5, 0.10, dist);
    float alpha = radial * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  } else {
    // Dark mode: Exact preserved luminous point with additive core (100% unchanged)
    float radial = smoothstep(0.5, 0.08, dist);
    radial = pow(radial, 1.6);
    float core = smoothstep(0.18, 0.0, dist) * 0.40;
    vec3 color = vColor + vec3(core);
    color = mix(color, vec3(0.55, 0.78, 0.82), 0.06);
    float alpha = radial * vAlpha;
    gl_FragColor = vec4(color, alpha);
  }
}
`;

export interface ParticleMorphSceneProps {
  className?: string;
  theme?: "dark" | "light";
}

export function ParticleMorphScene({ className = "", theme }: ParticleMorphSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animFrameIdRef = useRef<number>(0);

  const applyTheme = (isLight: boolean) => {
    if (sceneRef.current && materialRef.current) {
      const bgColor = isLight ? 0xF6F8FB : 0x040608;
      sceneRef.current.background = new THREE.Color(bgColor);
      sceneRef.current.fog = new THREE.FogExp2(bgColor, 0.016);
      materialRef.current.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      materialRef.current.uniforms.uIsLight.value = isLight ? 1.0 : 0.0;
      materialRef.current.needsUpdate = true;
    }
  };

  useEffect(() => {
    const isLight = (theme ?? (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme"))) === "light";
    applyTheme(isLight);
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      applyTheme(isLight);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    const isLight = (theme ?? (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme"))) === "light";

    // 1. Scene & Elevated Perspective Camera (21° Downward Tilt — Preserved)
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const bgColor = isLight ? 0xF6F8FB : 0x040608;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.016);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 1000);
    const baseCamY = isMobile ? 8.4 : 7.6;
    const baseCamZ = isMobile ? 20.5 : 18.5;
    camera.position.set(0, baseCamY, baseCamZ);
    camera.rotation.x = -0.36; // Preserved downward pitch

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: "high-performance",
      alpha: true,
    });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. FIXED X-Z SPACE-TIME FABRIC GRID
    // Desktop: 185 x 80 = 14,800 particles (strictly in 10,000–15,000 budget)
    // Tablet: 130 x 60 = 7,800 particles
    // Mobile: 80 x 40 = 3,200 particles
    const numX = prefersReducedMotion ? 80 : isMobile ? 80 : isTablet ? 130 : 185;
    const numZ = prefersReducedMotion ? 40 : isMobile ? 40 : isTablet ? 60 : 80;
    const particleCount = numX * numZ;

    const geometry = new THREE.BufferGeometry();

    const aPosition = new Float32Array(particleCount * 3);
    const aScale = new Float32Array(particleCount);
    const aBrightness = new Float32Array(particleCount);

    const fabricWidth = 48.0;
    const fabricDepth = 26.0;

    let pIdx = 0;
    for (let iz = 0; iz < numZ; iz++) {
      const v = iz / (numZ - 1); // 0.0 (horizon) to 1.0 (foreground)
      // Z spans from -18.5 (distant horizon) to +7.5 (foreground)
      const zTerrain = -18.5 + v * fabricDepth;

      for (let ix = 0; ix < numX; ix++) {
        const u = ix / (numX - 1); // 0.0 (far left) to 1.0 (far right)
        const xTerrain = (u - 0.5) * fabricWidth;
        const yTerrain = -2.8;

        const i = pIdx++;
        const i3 = i * 3;

        // Structurally fixed grid coordinates
        aPosition[i3] = xTerrain;
        aPosition[i3 + 1] = yTerrain;
        aPosition[i3 + 2] = zTerrain;

        // Size variation (microscopic dust: 0.85 to 1.45)
        const sizeHash = Math.abs((Math.sin(ix * 12.9898 + iz * 78.233) * 43758.5453) % 1);
        aScale[i] = 0.85 + sizeHash * 0.45;
        aBrightness[i] = sizeHash;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(aPosition, 3));
    geometry.setAttribute("aPosition", new THREE.BufferAttribute(aPosition, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
    geometry.setAttribute("aBrightness", new THREE.BufferAttribute(aBrightness, 1));

    // 4. Custom GPU ShaderMaterial
    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2.0) },
        uCursor3D: { value: new THREE.Vector3(0, -2.8, 0) },
        uCursorActive: { value: 0.0 },
        uIsLight: { value: isLight ? 1.0 : 0.0 },
      },
      transparent: true,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = shaderMaterial;

    const points = new THREE.Points(geometry, shaderMaterial);
    scene.add(points);

    // 5. Cursor Interaction Setup — Touching Fabric (Preserved)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.8);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const cursor3DTarget = new THREE.Vector3(0, -2.8, 0);
    const cursor3DCurrent = new THREE.Vector3(0, -2.8, 0);
    let cursorActiveTarget = 0.0;
    let cursorActiveCurrent = 0.0;

    const mouseOffset = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouseOffset.targetX = nx;
      mouseOffset.targetY = ny;

      pointer.x = nx;
      pointer.y = ny;

      raycaster.setFromCamera(pointer, camera);
      const intersectPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
        cursor3DTarget.copy(intersectPoint);
        cursorActiveTarget = 1.0;
      }
    };

    const handlePointerLeave = () => {
      cursorActiveTarget = 0.0;
      mouseOffset.targetX = 0;
      mouseOffset.targetY = 0;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      const pr = Math.min(window.devicePixelRatio || 1, 2.0);
      renderer.setPixelRatio(pr);
      shaderMaterial.uniforms.uPixelRatio.value = pr;
    };
    window.addEventListener("resize", handleResize);

    // Pause animation when tab is hidden
    let isTabVisible = true;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Reduced Motion Support
    if (prefersReducedMotion) {
      shaderMaterial.uniforms.uTime.value = 14.0;
      shaderMaterial.uniforms.uCursorActive.value = 0.0;
      renderer.render(scene, camera);
      return () => {
        window.removeEventListener("mousemove", handlePointerMove);
        document.removeEventListener("mouseleave", handlePointerLeave);
        window.removeEventListener("resize", handleResize);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        geometry.dispose();
        shaderMaterial.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }

    // 6. Smooth Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (!isTabVisible) return;

      const time = clock.getElapsedTime();

      // Damped cursor interpolation
      cursor3DCurrent.lerp(cursor3DTarget, 0.06);
      cursorActiveCurrent += (cursorActiveTarget - cursorActiveCurrent) * 0.05;

      shaderMaterial.uniforms.uTime.value = time;
      shaderMaterial.uniforms.uCursor3D.value.copy(cursor3DCurrent);
      shaderMaterial.uniforms.uCursorActive.value = cursorActiveCurrent;

      // Subtle 2-3% mouse camera offset with damping
      mouseOffset.x += (mouseOffset.targetX - mouseOffset.x) * 0.03;
      mouseOffset.y += (mouseOffset.targetY - mouseOffset.y) * 0.03;

      camera.position.x = mouseOffset.x * 0.35;
      camera.position.y = baseCamY + mouseOffset.y * 0.22;
      camera.position.z = baseCamZ;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      geometry.dispose();
      shaderMaterial.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`particle-morph-container ${className}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      {/* ── ATMOSPHERIC BACKLIGHTING BENEATH/BEHIND THE FABRIC ─────────────── */}
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
          className="particle-morph-backlight"
          style={{
            position: "absolute",
            bottom: "0%",
            left: "50%",
            width: "85vw",
            height: "50vh",
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse at 50% 80%, rgba(92, 128, 135, 0.12) 0%, rgba(15, 23, 42, 0.08) 50%, transparent 80%)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
