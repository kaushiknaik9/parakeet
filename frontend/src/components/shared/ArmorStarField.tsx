import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ArmorStarFieldProps {
  hasContent?: boolean;
  hasAgreements?: boolean;
  className?: string;
}

// ── 3D SIMPLEX NOISE GLSL ROUTINES ──────────────────────────────────────────
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

// ── 1. PRIMARY FLOWING WAVE FORMATIONS VERTEX SHADER ────────────────────────
const waveVertexShader = `
${simplexNoiseGLSL}

attribute vec3 aPosition;
attribute vec2 aGridUV;
attribute float aScale;
attribute float aPhase;
attribute float aAccent;

uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uCursor3D;
uniform float uCursorActive;
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

// Inigo Quilez polynomial smooth maximum for blending wave formations
float smax(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(a, b, h) + k * h * (1.0 - h);
}

// Broad Asymmetric Gaussian Wave Profile
float waveBody(float dist, float sigmaFore, float sigmaBack, float x, float xCenter, float xHalfWidth, float amp) {
  float sigma = dist < 0.0 ? sigmaFore : sigmaBack;
  float transverse = exp(-(dist * dist) / (2.0 * sigma * sigma));
  float xRatio = (x - xCenter) / xHalfWidth;
  float longitudinal = exp(-pow(xRatio, 4.0));
  float crestVar = 1.0 + 0.14 * sin(x * 0.16 + 0.5);
  return amp * crestVar * transverse * longitudinal;
}

void main() {
  float t = uTime * 0.11;
  float zCoord = aPosition.z;
  float xCoord = aPosition.x;

  // ── 1. 2D Domain Warping ──────────────────────────────────────────────────
  vec2 warpCoord = vec2(xCoord * 0.042, zCoord * 0.048);
  float warpX = snoise(vec3(warpCoord, 1.2 + t * 0.08)) * 3.0;
  float warpZ = snoise(vec3(warpCoord + vec2(3.6, 1.8), 2.4 + t * 0.06)) * 2.4;
  float wx = xCoord + warpX;
  float wz = zCoord + warpZ;

  // ── 2. Space-Time Slope ───────────────────────────────────────────────────
  float macroBedrock = -wz * 0.040 - 0.0009 * wx * wx;

  // ── 3. Five Major Flowing Celestial Waves ─────────────────────────────────
  float r1 = 3.6 - 0.016 * (wx + 1.5) * (wx + 1.5) + 0.15 * wx;
  float d1 = wz - r1;
  float b1 = waveBody(d1, 6.0, 2.7, wx, -1.5, 17.0, 4.6);

  float r2 = -1.8 - 0.30 * wx + 1.9 * sin(wx * 0.11 + 0.4);
  float d2 = wz - r2;
  float b2 = waveBody(d2, 5.4, 2.5, wx, 6.0, 16.0, 4.3);

  float r3 = -6.4 + 0.015 * (wx - 3.0) * (wx - 3.0) - 0.22 * wx + 1.6 * cos(wx * 0.13);
  float d3 = wz - r3;
  float b3 = waveBody(d3, 4.8, 2.3, wx, -5.0, 17.0, 3.9);

  float r4 = -10.8 - 0.20 * wx + 1.5 * sin(wx * 0.15 + 1.3);
  float d4 = wz - r4;
  float b4 = waveBody(d4, 4.4, 2.1, wx, 3.5, 18.0, 3.4);

  float r5 = -14.8 + 0.007 * wx * wx + 0.10 * wx + 0.8 * cos(wx * 0.18);
  float d5 = wz - r5;
  float b5 = waveBody(d5, 4.0, 1.9, wx, -1.0, 19.0, 2.7);

  float waves = 0.0;
  waves = smax(waves, b1, 1.8);
  waves = smax(waves, b2, 1.8);
  waves = smax(waves, b3, 1.7);
  waves = smax(waves, b4, 1.6);
  waves = smax(waves, b5, 1.5);

  float lowMask = clamp((2.2 - waves) / 2.2, 0.0, 1.0);
  float v1 = exp(-pow((wx - 4.0) * 0.10, 2.0) - pow((wz - 0.8) * 0.20, 2.0)) * 1.3;
  float v2 = exp(-pow((wx + 5.5) * 0.09, 2.0) - pow((wz - (-4.0)) * 0.18, 2.0)) * 1.2;
  float valleys = (v1 + v2) * lowMask;

  float med1 = sin(wz * 0.52 + wx * 0.15 + snoise(vec3(wx * 0.06, wz * 0.06, 3.4)) * 1.1);
  med1 = (med1 > 0.0 ? pow(med1, 0.85) : -pow(-med1, 1.15)) * 0.90;
  float med2 = cos(wz * 0.75 - wx * 0.18 + snoise(vec3(wx * 0.07 + 1.8, wz * 0.07, 4.0)) * 0.95);
  med2 = (med2 > 0.0 ? pow(med2, 0.85) : -pow(-med2, 1.15)) * 0.70;
  float slopeWeight = 0.45 + 0.55 * clamp(waves / 2.5, 0.0, 1.0);
  float mediumTopology = (med1 + med2) * slopeWeight;

  float fineDust = snoise(vec3(wx * 0.12, wz * 0.14, t * 0.18)) * 0.35;
  float breathe = 0.18 * sin(t * 0.85 + wx * 0.07 + wz * 0.09 + aPhase);
  float surfaceFlow = sin(wx * 0.18 + wz * 0.14 - t * 1.6) * 0.28;

  float rawDisplacement = macroBedrock + waves - valleys + mediumTopology + fineDust + breathe + surfaceFlow;

  float horizonDamp = smoothstep(-19.5, -15.5, zCoord);
  float edgeDamp = smoothstep(27.0, 20.0, abs(xCoord));
  float baseElevation = -3.2 + rawDisplacement * 0.85 * horizonDamp * edgeDamp;

  vec3 contourCoord = vec3(xCoord * 0.045, zCoord * 0.055, 1.8);
  float contourDispX = snoise(contourCoord) * 0.85;
  float contourDispZ = snoise(contourCoord + vec3(3.2, 4.5, 0.0)) * 0.75;

  float distToCursor = length(aPosition.xz - uCursor3D.xz);
  float cursorInfluence = exp(-(distToCursor * distToCursor) / (6.5 * 6.5)) * uCursorActive;
  float cursorDeflection = -0.42 * cursorInfluence;

  vec3 finalPos = aPosition;
  finalPos.x = xCoord + contourDispX;
  finalPos.z = zCoord + contourDispZ;
  finalPos.y = baseElevation + cursorDeflection;

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vDepth = -mvPosition.z;

  // Particle Sizing
  float pSize = (aScale * uPixelRatio * 2.25) * (20.0 / max(6.0, vDepth));
  gl_PointSize = clamp(pSize, 0.95, 3.2);

  // Topographic Chiaroscuro Colors
  float depthFactor = clamp((zCoord - (-19.0)) / (7.5 - (-19.0)), 0.0, 1.0);

  // ARMOR Dark Mode Palette:
  // Primary (foreground): rgba(220, 235, 255, 0.65) -> vec3(0.863, 0.922, 1.0)
  // Secondary (midground): rgba(60, 150, 255, 0.35) -> vec3(0.235, 0.588, 1.0)
  // Deep Background: vec3(0.12, 0.28, 0.45)
  // Subtle Blue Accent: rgba(30, 130, 255, 0.10) -> vec3(0.118, 0.510, 1.0)
  vec3 colBg = vec3(0.12, 0.28, 0.45);
  vec3 colMid = vec3(0.235, 0.588, 1.0);
  vec3 colFg = vec3(0.863, 0.922, 1.0);
  vec3 colCyan = vec3(0.118, 0.510, 1.0);

  vec3 baseColor = depthFactor < 0.5
    ? mix(colBg, colMid, depthFactor / 0.5)
    : mix(colMid, colFg, (depthFactor - 0.5) / 0.5);

  if (aAccent > 0.5) {
    baseColor = colCyan;
  }

  float heightAboveFloor = clamp((finalPos.y - (-3.6)) / 4.2, 0.0, 1.0);
  float crest = smoothstep(0.65, 0.95, heightAboveFloor);
  float valleyShadow = smoothstep(0.35, 0.05, heightAboveFloor);

  float horizonFade = smoothstep(-19.5, -13.0, zCoord);
  float lateralFade = smoothstep(27.0, 19.0, abs(xCoord));
  float valleyFloorAlpha = 0.52;
  float crestBonus = crest * 0.38;
  float cursorBoost = cursorInfluence * 0.25;

  vec2 screenPos = gl_Position.xy / max(0.001, gl_Position.w);
  float distToSearch = length(vec2(screenPos.x - (-0.58), screenPos.y - 0.42) * vec2(1.0, 1.4));
  float searchCalm = mix(0.72, 1.0, smoothstep(0.10, 0.46, distToSearch));

  if (uIsLight > 0.5) {
    // Light Mode Palette
    vec3 colMain = vec3(0.561, 0.659, 0.745); // #8FA8BE
    vec3 colSec  = vec3(0.718, 0.776, 0.835); // #B7C6D5
    vec3 colAcc  = vec3(0.294, 0.639, 1.000); // #4BA3FF
    vec3 colHi   = vec3(0.086, 0.467, 0.910); // #1677E8

    vec3 lightCol = depthFactor < 0.45 ? colSec : colMain;
    if (aAccent > 0.5) {
      lightCol = colAcc;
    } else if (crest > 0.60) {
      lightCol = mix(lightCol, colHi, 0.45);
    }
    vColor = lightCol;

    float targetAlpha = depthFactor < 0.42
      ? mix(0.18, 0.28, depthFactor / 0.42)
      : depthFactor < 0.75
      ? mix(0.28, 0.40, (depthFactor - 0.42) / 0.33)
      : mix(0.40, 0.55, (depthFactor - 0.75) / 0.25);

    if (aAccent > 0.5) {
      targetAlpha = 0.38;
    }
    vAlpha = clamp(targetAlpha * horizonFade * lateralFade * searchCalm, 0.0, 0.95);
    gl_PointSize = clamp(pSize * 1.25, 1.25, 3.8);
  } else {
    vec3 litColor = mix(baseColor, vec3(0.14, 0.22, 0.32), valleyShadow * 0.40);
    vColor = mix(litColor, vec3(1.0, 1.0, 1.0), crest * 0.65);
    vAlpha = clamp((valleyFloorAlpha + crestBonus + cursorBoost) * horizonFade * lateralFade * searchCalm, 0.0, 1.0);
  }
}
`;

// ── 1. PRIMARY FLOWING WAVE FORMATIONS FRAGMENT SHADER ──────────────────────
const waveFragmentShader = `
precision highp float;

uniform float uGlobalOpacity;
uniform float uIsLight;
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  if (uIsLight > 0.5) {
    float radial = smoothstep(0.5, 0.08, dist);
    float finalAlpha = vAlpha * radial * uGlobalOpacity;
    if (finalAlpha < 0.003) discard;
    gl_FragColor = vec4(vColor, finalAlpha);
  } else {
    float radial = pow(smoothstep(0.5, 0.08, dist), 1.6);
    float core = smoothstep(0.18, 0.0, dist) * 0.45;
    vec3 col = vColor + vec3(core);

    float finalAlpha = vAlpha * radial * uGlobalOpacity;
    if (finalAlpha < 0.005) discard;

    gl_FragColor = vec4(col, finalAlpha);
  }
}
`;

// ── 2. INDEPENDENT DRIFTING STARS VERTEX SHADER ─────────────────────────────
const starDriftVertexShader = `
uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uCursor3D;
uniform float uCursorActive;
uniform float uIsLight;

attribute vec3 aDriftVelocity;
attribute float aStarScale;
attribute float aTwinkleSpeed;
attribute float aPhase;
attribute float aAccent;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;

  pos += aDriftVelocity * uTime * 0.85;

  vec3 boxMin = vec3(-36.0, -12.0, -30.0);
  vec3 boxRange = vec3(72.0, 26.0, 45.0);
  pos = mod(pos - boxMin, boxRange) + boxMin;

  pos.x += sin(uTime * 0.20 + aPhase) * 0.6;
  pos.y += cos(uTime * 0.16 + aPhase) * 0.5;

  float distToCursor = length(pos.xz - uCursor3D.xz);
  if (distToCursor < 6.0 && uCursorActive > 0.01) {
    float rep = (1.0 - distToCursor / 6.0) * uCursorActive;
    pos.xz += normalize(pos.xz - uCursor3D.xz) * rep * 1.2;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depth = -mvPosition.z;
  float pSize = (aStarScale * uPixelRatio * 2.0) * (20.0 / max(5.0, depth));
  gl_PointSize = clamp(pSize, 0.85, 2.6);

  float twinkle = 0.70 + 0.30 * sin(uTime * aTwinkleSpeed + aPhase * 6.28318);
  if (uIsLight > 0.5) {
    vec3 starCol = aAccent > 0.5 ? vec3(0.294, 0.639, 1.000) : vec3(0.561, 0.659, 0.745);
    vColor = starCol;
    vAlpha = clamp(twinkle * 0.35, 0.18, 0.45);
    gl_PointSize = clamp(pSize * 1.25, 1.25, 3.2);
  } else {
    vec3 starCol = aAccent > 0.5 ? vec3(0.235, 0.588, 1.0) : vec3(0.863, 0.922, 1.0);
    vColor = starCol;
    vAlpha = clamp(twinkle * 0.78, 0.25, 0.95);
  }
}
`;

// ── 2. INDEPENDENT DRIFTING STARS FRAGMENT SHADER ───────────────────────────
const starDriftFragmentShader = `
precision highp float;

uniform float uGlobalOpacity;
uniform float uIsLight;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  if (uIsLight > 0.5) {
    float radial = smoothstep(0.5, 0.06, dist);
    float finalAlpha = vAlpha * radial * uGlobalOpacity;
    if (finalAlpha < 0.003) discard;
    gl_FragColor = vec4(vColor, finalAlpha);
  } else {
    float radial = pow(smoothstep(0.5, 0.06, dist), 1.5);
    float core = smoothstep(0.16, 0.0, dist) * 0.40;
    vec3 col = vColor + vec3(core);

    float finalAlpha = vAlpha * radial * uGlobalOpacity;
    if (finalAlpha < 0.005) discard;

    gl_FragColor = vec4(col, finalAlpha);
  }
}
`;

export function ArmorStarField({
  hasContent = false,
  hasAgreements = false,
  className = "",
}: ArmorStarFieldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const activeContent = hasContent || hasAgreements;
  const hasContentRef = useRef<boolean>(activeContent);

  useEffect(() => {
    hasContentRef.current = activeContent;
  }, [activeContent]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;

    // ── 1. Three.js Scene, Camera, Renderer ─────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    const baseCamY = isMobile ? 8.2 : 7.5;
    const baseCamZ = isMobile ? 22.0 : 20.0;
    camera.position.set(0, baseCamY, baseCamZ);
    camera.rotation.x = -0.34;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    container.appendChild(canvas);

    // ── 2. Primary Layer: Flowing Celestial Wave Formations (12,000 Particles)
    const numX = prefersReducedMotion ? 80 : isMobile ? 90 : isTablet ? 120 : 150;
    const numZ = prefersReducedMotion ? 45 : isMobile ? 50 : isTablet ? 65 : 80;
    const waveCount = numX * numZ;

    const waveGeometry = new THREE.BufferGeometry();
    const wavePos = new Float32Array(waveCount * 3);
    const waveUV = new Float32Array(waveCount * 2);
    const waveScale = new Float32Array(waveCount);
    const wavePhase = new Float32Array(waveCount);
    const waveAccent = new Float32Array(waveCount);

    const terrainWidth = 52.0;
    const terrainDepth = 26.0;

    let pIdx = 0;
    for (let iz = 0; iz < numZ; iz++) {
      const v = iz / (numZ - 1);
      const zTerrain = -19.0 + v * terrainDepth;

      for (let ix = 0; ix < numX; ix++) {
        const u = ix / (numX - 1);
        const xTerrain = (u - 0.5) * terrainWidth;
        const yTerrain = -3.2;

        const i = pIdx++;
        const i3 = i * 3;
        const i2 = i * 2;

        wavePos[i3 + 0] = xTerrain;
        wavePos[i3 + 1] = yTerrain;
        wavePos[i3 + 2] = zTerrain;

        waveUV[i2 + 0] = u;
        waveUV[i2 + 1] = v;

        const sizeHash = Math.abs(
          (Math.sin(ix * 12.9898 + iz * 78.233) * 43758.5453) % 1
        );
        waveScale[i] = 0.90 + sizeHash * 0.55;
        wavePhase[i] = sizeHash * 6.28318;
        waveAccent[i] = sizeHash > 0.96 ? 1.0 : 0.0;
      }
    }

    waveGeometry.setAttribute("position", new THREE.BufferAttribute(wavePos, 3));
    waveGeometry.setAttribute("aPosition", new THREE.BufferAttribute(wavePos, 3));
    waveGeometry.setAttribute("aGridUV", new THREE.BufferAttribute(waveUV, 2));
    waveGeometry.setAttribute("aScale", new THREE.BufferAttribute(waveScale, 1));
    waveGeometry.setAttribute("aPhase", new THREE.BufferAttribute(wavePhase, 1));
    waveGeometry.setAttribute("aAccent", new THREE.BufferAttribute(waveAccent, 1));

    const initialOpacity = activeContent ? 0.48 : 0.82;
    const waveUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2.0) },
      uCursor3D: { value: new THREE.Vector3(-2000, 0, -2000) },
      uCursorActive: { value: 0 },
      uGlobalOpacity: { value: initialOpacity },
      uIsLight: { value: 0 },
    };

    const waveMaterial = new THREE.ShaderMaterial({
      vertexShader: waveVertexShader,
      fragmentShader: waveFragmentShader,
      uniforms: waveUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const wavePoints = new THREE.Points(waveGeometry, waveMaterial);
    scene.add(wavePoints);

    // ── 3. Secondary Layer: Independent Drifting 3D Stars (1,800 Stars) ─────
    const driftCount = prefersReducedMotion ? 400 : isMobile ? 600 : 1800;
    const driftGeometry = new THREE.BufferGeometry();
    const driftPos = new Float32Array(driftCount * 3);
    const driftVel = new Float32Array(driftCount * 3);
    const driftScale = new Float32Array(driftCount);
    const driftTwinkle = new Float32Array(driftCount);
    const driftPhase = new Float32Array(driftCount);
    const driftAccent = new Float32Array(driftCount);

    for (let i = 0; i < driftCount; i++) {
      const i3 = i * 3;
      driftPos[i3 + 0] = (Math.random() - 0.5) * 72.0;
      driftPos[i3 + 1] = (Math.random() - 0.5) * 26.0 + 1.0;
      driftPos[i3 + 2] = (Math.random() - 0.5) * 45.0 - 7.0;

      driftVel[i3 + 0] = (Math.random() - 0.5) * 0.45;
      driftVel[i3 + 1] = (Math.random() - 0.5) * 0.25;
      driftVel[i3 + 2] = (Math.random() - 0.5) * 0.35;

      driftScale[i] = 0.85 + Math.random() * 0.80;
      driftTwinkle[i] = 0.8 + Math.random() * 2.2;
      driftPhase[i] = Math.random();
      driftAccent[i] = Math.random() < 0.05 ? 1.0 : 0.0;
    }

    driftGeometry.setAttribute("position", new THREE.BufferAttribute(driftPos, 3));
    driftGeometry.setAttribute("aDriftVelocity", new THREE.BufferAttribute(driftVel, 3));
    driftGeometry.setAttribute("aStarScale", new THREE.BufferAttribute(driftScale, 1));
    driftGeometry.setAttribute("aTwinkleSpeed", new THREE.BufferAttribute(driftTwinkle, 1));
    driftGeometry.setAttribute("aPhase", new THREE.BufferAttribute(driftPhase, 1));
    driftGeometry.setAttribute("aAccent", new THREE.BufferAttribute(driftAccent, 1));

    const driftUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2.0) },
      uCursor3D: { value: new THREE.Vector3(-2000, 0, -2000) },
      uCursorActive: { value: 0 },
      uGlobalOpacity: { value: initialOpacity },
      uIsLight: { value: 0 },
    };

    const driftMaterial = new THREE.ShaderMaterial({
      vertexShader: starDriftVertexShader,
      fragmentShader: starDriftFragmentShader,
      uniforms: driftUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const driftPoints = new THREE.Points(driftGeometry, driftMaterial);
    scene.add(driftPoints);

    // ── 4. Mouse Raycasting on Ground Plane ──────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.5);
    const planeIntersect = new THREE.Vector3();

    const cursor3DTarget = new THREE.Vector3(-2000, 0, -2000);
    const cursor3DCurrent = new THREE.Vector3(-2000, 0, -2000);
    let cursorActiveTarget = 0;
    let cursorActiveCurrent = 0;

    const mouseOffset = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouseOffset.targetX = ndcX;
      mouseOffset.targetY = ndcY;

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (raycaster.ray.intersectPlane(groundPlane, planeIntersect)) {
        cursor3DTarget.copy(planeIntersect);
        cursorActiveTarget = 1.0;
      }
    };

    const handlePointerLeave = () => {
      cursorActiveTarget = 0;
      mouseOffset.targetX = 0;
      mouseOffset.targetY = 0;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    // ── 5. Responsive Resize Handling ───────────────────────────────────────
    const handleResize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      const pr = Math.min(window.devicePixelRatio || 1, 2.0);
      renderer.setPixelRatio(pr);
      waveUniforms.uPixelRatio.value = pr;
      driftUniforms.uPixelRatio.value = pr;
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // ── 6. Continuous 60fps Animation Loop ──────────────────────────────────
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();

      // Check current theme dynamically
      const isLight =
        document.documentElement.getAttribute("data-theme") === "light";
      waveUniforms.uIsLight.value = isLight ? 1.0 : 0.0;
      driftUniforms.uIsLight.value = isLight ? 1.0 : 0.0;

      const targetBlending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (waveMaterial.blending !== targetBlending) {
        waveMaterial.blending = targetBlending;
        waveMaterial.needsUpdate = true;
      }
      if (driftMaterial.blending !== targetBlending) {
        driftMaterial.blending = targetBlending;
        driftMaterial.needsUpdate = true;
      }

      // Dynamic opacity adaptation
      const targetOpacity = isLight
        ? hasContentRef.current
          ? 0.40
          : 0.72
        : hasContentRef.current
        ? 0.48
        : 0.82;

      waveUniforms.uGlobalOpacity.value +=
        (targetOpacity - waveUniforms.uGlobalOpacity.value) * 0.05;
      driftUniforms.uGlobalOpacity.value = waveUniforms.uGlobalOpacity.value;

      // Cursor position interpolation
      cursor3DCurrent.lerp(cursor3DTarget, 0.06);
      cursorActiveCurrent +=
        (cursorActiveTarget - cursorActiveCurrent) * 0.05;

      waveUniforms.uCursor3D.value.copy(cursor3DCurrent);
      waveUniforms.uCursorActive.value = cursorActiveCurrent;
      driftUniforms.uCursor3D.value.copy(cursor3DCurrent);
      driftUniforms.uCursorActive.value = cursorActiveCurrent;

      // Subtle mouse parallax camera offset
      mouseOffset.x += (mouseOffset.targetX - mouseOffset.x) * 0.03;
      mouseOffset.y += (mouseOffset.targetY - mouseOffset.y) * 0.03;
      camera.position.x = mouseOffset.x * 0.35;
      camera.position.y = baseCamY + mouseOffset.y * 0.22;
      camera.position.z = baseCamZ;

      if (!prefersReducedMotion) {
        waveUniforms.uTime.value = time;
        driftUniforms.uTime.value = time;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // ── 7. Cleanup on Unmount ───────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      resizeObserver.disconnect();

      waveGeometry.dispose();
      waveMaterial.dispose();
      driftGeometry.dispose();
      driftMaterial.dispose();
      renderer.dispose();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`background-animation armor-star-field-canvas ${className}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Atmospheric Backlighting Gradient Behind Particles ──────────────── */}
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
              "radial-gradient(ellipse at 50% 80%, rgba(30, 130, 255, 0.10) 0%, rgba(5, 8, 13, 0.05) 50%, transparent 80%)",
            filter: "blur(110px)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

// Aliases for unified consistency across all screens
export const ActivityFlowField = ArmorStarField;
export const SettingsStarField = ArmorStarField;
export const AgreementsStarField = ArmorStarField;
