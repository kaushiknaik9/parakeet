import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface DealsVolumetricSphereProps {
  hoveredDealId?: string | null;
  hoveredYRatio?: number | null; // Normalized Y position [0, 1] of hovered deal
  hasDeals?: boolean;
  className?: string;
}

// ── 3D SIMPLEX NOISE & VOLUMETRIC SPHERICAL COMPUTATIONAL FIELD SHADERS ─────

const sphereVertexShader = `
// 3D Simplex Noise (Stefan Gustavson / Ashima Arts)
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

attribute vec3 aSeed;
attribute float aLayer;    // 1 = foreground dense, 2 = main surface, 3 = secondary field, 4 = far-side, 5 = atmospheric
attribute float aOrbital;  // 0.0 = field particle, 1.0-4.0 = distinct orbital stream trajectories
attribute float aSize;
attribute float aBaseAlpha;

uniform float uTime;
uniform float uPixelRatio;
uniform float uSphereRadius;
uniform vec2 uCursor2D;
uniform float uCursorActive;
uniform float uHoverActive;
uniform float uHoverY;     // Local Y target of hovered deal
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

// Rotation around arbitrary axis
vec3 rotateAxis(vec3 p, vec3 axis, float angle) {
  return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
}

void main() {
  vec3 pos = position;
  vec3 normDir = normalize(pos);

  // ── 1. Slow Majestic Spherical Rotation (~105s revolution) & Layer Parallax (Animation 1 & 4) ──
  vec3 rotAxis = normalize(vec3(0.24, 1.0, 0.16));
  // Differential layer parallax: near layers move slightly faster than deep layers
  float layerSpeedMult = 1.0 + (aLayer - 2.0) * 0.045;
  float rotAngle = uTime * (6.283185 / 105.0) * layerSpeedMult;
  vec3 rotPos = rotateAxis(pos, rotAxis, rotAngle);
  vec3 rotDir = normalize(rotPos);

  // ── 2. Reference Composition: 5 Major Curved Dune Formations Wrapped on Sphere ───────────────────
  // Slow evolution cycle (32-second period for density morphing - Animation 3)
  float tNoise = uTime * (6.283185 / 32.0);
  vec3 pWarp = rotDir * 1.8 + vec3(tNoise * 0.16, tNoise * 0.10, tNoise * 0.08);

  vec3 warpVec = vec3(
    snoise(pWarp),
    snoise(pWarp + vec3(4.3, 1.7, 9.2)),
    snoise(pWarp + vec3(8.5, 3.1, 5.7))
  );

  // Dune Formation 1: Transverse Equatorial Grand Dune
  float r1 = snoise(rotDir * 2.1 + warpVec * 0.55);
  float dune1 = pow(1.0 - abs(r1), 1.9);

  // Dune Formation 2: Northern Crescent Dune Arch
  float r2 = snoise(rotDir * 2.8 - warpVec * 0.45 + vec3(2.1, 5.4, 1.2));
  float dune2 = pow(1.0 - abs(r2), 1.8);

  // Dune Formation 3: Southern Longitudinal Seif Dune
  float r3 = snoise(rotDir * 1.9 + vec3(warpVec.y, -warpVec.x, warpVec.z) * 0.6 + vec3(6.3, 1.8, 4.5));
  float dune3 = pow(1.0 - abs(r3), 2.0);

  // Dune Formation 4: Front-Facing Transverse Barchan Dune
  float r4 = snoise(rotDir * 3.2 + warpVec * 0.35 + vec3(tNoise * 0.08, 0.0, 0.0));
  float dune4 = pow(1.0 - abs(r4), 1.7);

  // Formation 5: Macro Valleys & Inter-Dune Voids (32s breathing evolution)
  float macroField = snoise(rotDir * 0.85 + warpVec * 0.30 + vec3(0.0, tNoise * 0.12, 0.0));
  float breath = sin(uTime * (6.283185 / 32.0) + aSeed.x * 6.28) * 0.12;
  float voidMask = smoothstep(-0.08 + breath, 0.32 + breath, macroField);

  // Combine major dune ridges
  float maxDune = max(max(dune1, dune2), max(dune3, dune4));
  float terrainDensity = (maxDune * 0.82 + 0.18) * voidMask;

  // Layer 5 (atmospheric halo) preserves subtle diffuse presence
  if (aLayer > 4.5) {
    terrainDensity = max(terrainDensity, 0.35);
  }

  // Complete void culling in deep dark gaps
  if (terrainDensity < 0.02) {
    terrainDensity = 0.0;
  }

  // ── 3. Tangential Surface Flow Along Curved Paths (Animation 2) ──────────────────────────────
  vec3 flowTangent = cross(rotDir, vec3(0.0, 1.0, 0.0));
  if (length(flowTangent) < 0.001) flowTangent = vec3(1.0, 0.0, 0.0);
  flowTangent = normalize(flowTangent);
  vec3 flowBitangent = normalize(cross(rotDir, flowTangent));

  float flowAngle = snoise(rotDir * 1.5 + vec3(uTime * 0.03)) * 3.14159;
  vec3 surfaceTangent = flowTangent * cos(flowAngle) + flowBitangent * sin(flowAngle);

  float flowDrift = sin(uTime * 0.25 + aSeed.y * 6.28) * 0.025 * uSphereRadius;
  rotPos += surfaceTangent * flowDrift;

  // Physical 3D Terrain Elevation: particle dunes lift off spherical base
  rotPos += rotDir * ((maxDune * 0.11 - 0.035) * uSphereRadius * voidMask);

  // ── 4. Distinct Orbital Stream Trajectories ──────────────────────────────────────────────────
  if (aOrbital > 0.5) {
    float streamIdx = floor(aOrbital);
    vec3 orbitAxis;
    float orbitSpeedMult;

    if (streamIdx < 1.5) {
      orbitAxis = normalize(vec3(0.88, 0.45, 0.12));
      orbitSpeedMult = 1.35;
    } else if (streamIdx < 2.5) {
      orbitAxis = normalize(vec3(-0.35, 0.90, 0.25));
      orbitSpeedMult = -1.15;
    } else if (streamIdx < 3.5) {
      orbitAxis = normalize(vec3(0.18, 0.30, 0.94));
      orbitSpeedMult = 0.95;
    } else {
      orbitAxis = normalize(vec3(-0.72, -0.65, 0.22));
      orbitSpeedMult = -0.85;
    }

    float streamAngle = rotAngle * orbitSpeedMult + aSeed.z * 6.28;
    rotPos = rotateAxis(rotPos, orbitAxis, streamAngle * 0.25);
    terrainDensity = max(terrainDensity, 0.70);
  }

  // ── 5. Camera View Space Transformation ──────────────────────────────────────────────────────
  vec4 mvPosition = modelViewMatrix * vec4(rotPos, 1.0);

  // ── 6. Cursor Localized Proximity Interaction (Animation 5) ──────────────────────────────────
  float distToCursor = length(mvPosition.xy - uCursor2D);
  float interactionBoost = 0.0;
  if (uCursorActive > 0.01 && distToCursor < 170.0) {
    float repel = (1.0 - distToCursor / 170.0) * uCursorActive;
    vec2 pushDir = normalize(mvPosition.xy - uCursor2D);
    mvPosition.xy += pushDir * repel * 8.0; // Subtle max 8px drift
    interactionBoost += repel * 0.35; // Gentle luminosity boost
  }

  // ── 7. Deal Row Hover Inspection Surge ───────────────────────────────────────────────────────
  if (uHoverActive > 0.01) {
    float distY = abs(mvPosition.y - uHoverY);
    float hoverReach = smoothstep(190.0, 0.0, distY) * uHoverActive;
    mvPosition.x += sin(uTime * 1.8 + mvPosition.y * 0.02) * hoverReach * 6.0;
    interactionBoost += hoverReach * 0.40;
  }

  gl_Position = projectionMatrix * mvPosition;

  // ── 8. Calm Title Area Shielding (Preserves Directory Header Legibility) ─────────────────────
  vec2 screenNorm = (gl_Position.xy / gl_Position.w);
  float titleCalm = 1.0;
  if (screenNorm.x < -0.06 && screenNorm.y > 0.06) {
    float distFromTitle = length(vec2(screenNorm.x + 0.06, screenNorm.y - 0.06));
    titleCalm = smoothstep(0.0, 0.40, distFromTitle);
  }

  // ── 9. Volumetric Depth Shading & Point Size ─────────────────────────────────────────────────
  float zNorm = (rotPos.z / uSphereRadius); // [-1.0 (back), +1.0 (front)]
  vDepth = zNorm;

  // Perspective size attenuation: foreground larger (1.8-3.6px), background tiny (0.7-1.2px)
  float basePtSize = aSize * (1.0 + (zNorm + 1.0) * 0.40);
  gl_PointSize = basePtSize * uPixelRatio * (380.0 / max(1.0, -mvPosition.z));
  gl_PointSize = clamp(gl_PointSize, 0.8, 14.0);

  // ── 10. Monochromatic Palette: Soft White, Cool Slate, Subtle Cyan ───────────────────────────
  vec3 colSlate = vec3(0.44, 0.50, 0.60); // Cool gray #708099 (65%)
  vec3 colWhite = vec3(0.96, 0.98, 1.00); // Soft starlight white #F5F8FF (20%)
  vec3 colIce   = vec3(0.58, 0.82, 0.86); // Soft arctic cyan #94D1DC (10%)
  vec3 colCyan  = vec3(0.22, 0.74, 0.97); // ARMOR electric cyan #38BDF8 (5%)

  if (uIsLight > 0.5) {
    colSlate = vec3(0.25, 0.32, 0.42);
    colWhite = vec3(0.01, 0.45, 0.82);
    colIce   = vec3(0.05, 0.65, 0.91);
    colCyan  = vec3(0.22, 0.74, 0.97);
  }

  vec3 pCol = colSlate;
  if (aSeed.x > 0.80) {
    pCol = colWhite;
  } else if (aSeed.x > 0.70) {
    pCol = colIce;
  } else if (aSeed.x > 0.65) {
    pCol = colCyan;
  }

  // Dune crest illumination bonus
  float crestBonus = maxDune * 0.32;
  pCol = mix(pCol, colWhite, crestBonus * 0.45);
  vColor = pCol;

  // Depth alpha attenuation:
  // Front hemisphere is crisp and luminous; back hemisphere dissolves into deep black space
  float depthAlpha = zNorm > 0.0
    ? (0.50 + 0.50 * pow(zNorm, 1.05))
    : (0.50 * max(0.0, 1.0 + zNorm * 0.96));

  if (aLayer > 4.5) {
    depthAlpha *= 0.55;
  }

  float finalAlpha = aBaseAlpha * depthAlpha * terrainDensity * (1.0 + interactionBoost + crestBonus * 0.25) * mix(0.40, 1.0, titleCalm);
  vAlpha = clamp(finalAlpha, 0.0, 1.0);
}
`;

const sphereFragmentShader = `
uniform float uGlobalOpacity;
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  // Soft circular particle profile with antialiased gaussian falloff
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float radial = smoothstep(0.5, 0.08, dist);
  radial = pow(radial, 1.4);

  // Luminous core for primary particles
  float core = smoothstep(0.18, 0.0, dist) * 0.38;
  vec3 color = vColor + vec3(core);

  // Environmental lighting tinting
  color = mix(color, vec3(0.55, 0.78, 0.82), 0.05);

  float finalAlpha = vAlpha * radial * uGlobalOpacity;
  if (finalAlpha < 0.003) discard;

  gl_FragColor = vec4(color, finalAlpha);
}
`;

export function DealsVolumetricSphere({
  hoveredDealId = null,
  hoveredYRatio = null,
  hasDeals = false,
  className = "",
}: DealsVolumetricSphereProps) {
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

    // ── 1. Three.js Scene, Camera, Renderer ─────────────────────────────
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
    renderer.setClearColor(0x000000, 0); // Transparent background
    container.appendChild(renderer.domElement);

    // ── 2. Massive Sphere Radius (80–95% Workspace Span, Extends Beyond Viewport) ──
    const calcDimensions = (w: number, h: number) => {
      const frustumH = 2.0 * cameraDist * Math.tan((45.0 * Math.PI) / 360.0); // ~994.1
      const frustumW = frustumH * (w / h);
      // Diameter target: ~165% of height and ~145% of width
      const targetRadius = Math.max(frustumH * 0.84, frustumW * 0.74);
      // Center position relative to main workspace: X = 52%, Y = 55%
      const centerOffsetX = frustumW * 0.02;
      const centerOffsetY = -frustumH * 0.05;
      return { frustumW, frustumH, radius: targetRadius, centerOffsetX, centerOffsetY };
    };

    let dims = calcDimensions(width, height);
    let sphereRadius = dims.radius;

    // ── 3. Particle Density (8,000–16,000 Based on Viewport) ────────────
    const calcParticleCount = (w: number) => {
      if (w < 600) return 4500;
      if (w < 900) return 8000;
      if (w < 1200) return 12000;
      return 16000;
    };
    const particleCount = calcParticleCount(width);

    const positions = new Float32Array(particleCount * 3);
    const seeds = new Float32Array(particleCount * 3);
    const layers = new Float32Array(particleCount);
    const orbitals = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const baseAlphas = new Float32Array(particleCount);

    // ── 4. Generate 5-Layer Stratified Volumetric Spherical Distribution ─
    // Layer 1 (22%): Foreground dense formations
    // Layer 2 (35%): Main spherical surface
    // Layer 3 (20%): Secondary nested particle field
    // Layer 4 (15%): Far-side particles
    // Layer 5 (8%):  Very faint atmospheric particles
    for (let i = 0; i < particleCount; i++) {
      const layerRoll = Math.random();
      let layerVal: number;
      let radiusMult: number;
      let sizeVal: number;
      let alphaVal: number;
      let phi: number;
      let theta: number;

      if (layerRoll < 0.22) {
        // Layer 1: Foreground dense formations
        layerVal = 1.0;
        radiusMult = 0.98 + Math.random() * 0.18;
        // Bias toward front hemisphere (z > 0)
        phi = Math.acos(1.0 - Math.random() * 1.3);
        theta = Math.random() * Math.PI * 2.0;
        sizeVal = 2.4 + Math.random() * 1.6;
        alphaVal = 0.70 + Math.random() * 0.25;
      } else if (layerRoll < 0.57) {
        // Layer 2: Main spherical surface
        layerVal = 2.0;
        radiusMult = 0.92 + Math.random() * 0.12;
        phi = Math.acos(1.0 - 2.0 * Math.random());
        theta = Math.random() * Math.PI * 2.0;
        sizeVal = 1.6 + Math.random() * 1.1;
        alphaVal = 0.45 + Math.random() * 0.30;
      } else if (layerRoll < 0.77) {
        // Layer 3: Secondary particle field (nested interior volume)
        layerVal = 3.0;
        radiusMult = 0.76 + Math.random() * 0.16;
        phi = Math.acos(1.0 - 2.0 * Math.random());
        theta = Math.random() * Math.PI * 2.0;
        sizeVal = 1.2 + Math.random() * 0.8;
        alphaVal = 0.30 + Math.random() * 0.22;
      } else if (layerRoll < 0.92) {
        // Layer 4: Far-side particles (back curvature)
        layerVal = 4.0;
        radiusMult = 0.90 + Math.random() * 0.18;
        // Bias toward back hemisphere (z < 0)
        phi = Math.acos(-1.0 + Math.random() * 1.3);
        theta = Math.random() * Math.PI * 2.0;
        sizeVal = 0.85 + Math.random() * 0.55;
        alphaVal = 0.16 + Math.random() * 0.16;
      } else {
        // Layer 5: Very faint atmospheric particles
        layerVal = 5.0;
        radiusMult = 1.15 + Math.random() * 0.28;
        phi = Math.acos(1.0 - 2.0 * Math.random());
        theta = Math.random() * Math.PI * 2.0;
        sizeVal = 1.0 + Math.random() * 0.8;
        alphaVal = 0.08 + Math.random() * 0.12;
      }

      const uX = Math.sin(phi) * Math.cos(theta);
      const uY = Math.cos(phi);
      const uZ = Math.sin(phi) * Math.sin(theta);
      const actualRadius = sphereRadius * radiusMult;

      positions[i * 3 + 0] = uX * actualRadius;
      positions[i * 3 + 1] = uY * actualRadius;
      positions[i * 3 + 2] = uZ * actualRadius;

      seeds[i * 3 + 0] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();

      layers[i] = layerVal;

      // ~8% of particles belong to 4 distinct orbital trajectory streams
      let orbitalVal = 0.0;
      const rndOrbital = Math.random();
      if (rndOrbital < 0.08) {
        orbitalVal = 1.0 + Math.floor(Math.random() * 4.0);
      }
      orbitals[i] = orbitalVal;

      sizes[i] = sizeVal;
      baseAlphas[i] = alphaVal;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute("aLayer", new THREE.BufferAttribute(layers, 1));
    geometry.setAttribute("aOrbital", new THREE.BufferAttribute(orbitals, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aBaseAlpha", new THREE.BufferAttribute(baseAlphas, 1));

    const uniforms = {
      uTime: { value: prefersReducedMotion ? 12.0 : 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uSphereRadius: { value: sphereRadius },
      uCursor2D: { value: new THREE.Vector2(-2000, -2000) },
      uCursorActive: { value: 0 },
      uHoverActive: { value: 0 },
      uHoverY: { value: 0 },
      uGlobalOpacity: { value: hasDeals ? 0.58 : 0.90 },
      uIsLight: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: sphereVertexShader,
      fragmentShader: sphereFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.position.set(dims.centerOffsetX, dims.centerOffsetY, 0);
    scene.add(points);

    // ── 5. Mouse Interaction Tracking ──────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // View space coordinates relative to scene center
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

    // ── 6. Resize Handler ──────────────────────────────────────────────
    const handleResize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      dims = calcDimensions(width, height);
      sphereRadius = dims.radius;
      uniforms.uSphereRadius.value = sphereRadius;
      uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);

      points.position.set(dims.centerOffsetX, dims.centerOffsetY, 0);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // ── 7. Animation 60fps Render Loop ──────────────────────────────────
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Check current theme dynamically
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      uniforms.uIsLight.value = isLight ? 1.0 : 0.0;

      // Hero Opacity: 0.90 on empty state (the hero visual), 0.58 when real deals exist (environmental field)
      const targetOpacity = isLight
        ? hasDealsRef.current
          ? 0.45
          : 0.78
        : hasDealsRef.current
        ? 0.58
        : 0.90;

      uniforms.uGlobalOpacity.value +=
        (targetOpacity - uniforms.uGlobalOpacity.value) * 0.05;

      // Cursor position smoothing
      const mouse = mouseRef.current;
      if (mouse.active) {
        uniforms.uCursor2D.value.lerp(new THREE.Vector2(mouse.x, mouse.y), 0.08);
        uniforms.uCursorActive.value += (1.0 - uniforms.uCursorActive.value) * 0.08;
      } else {
        uniforms.uCursorActive.value *= 0.94;
      }

      // Deal row hover inspection activation
      const isHovered = hoveredDealRef.current !== null ? 1.0 : 0.0;
      uniforms.uHoverActive.value += (isHovered - uniforms.uHoverActive.value) * 0.08;

      if (hoveredYRef.current !== null) {
        // Map [0, 1] normalized Y to 3D frustum space [-dims.frustumH/2, +dims.frustumH/2]
        const target3DY = -(hoveredYRef.current - 0.5) * dims.frustumH;
        uniforms.uHoverY.value += (target3DY - uniforms.uHoverY.value) * 0.1;
      }

      if (!prefersReducedMotion) {
        uniforms.uTime.value = elapsedTime;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // ── 8. Cleanup on Unmount ──────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
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
      className={`deals-volumetric-sphere-canvas ${className}`}
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
