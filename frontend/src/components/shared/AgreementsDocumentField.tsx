import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface AgreementsDocumentFieldProps {
  hoveredAgreementId?: string | null;
  hoveredYRatio?: number | null; // Normalized Y position [0, 1] of hovered agreement
  hasAgreements?: boolean;
  className?: string;
}

// ── 3D SIMPLEX NOISE GLSL ───────────────────────────────────────────────────
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

// ── DOCUMENT PARTICLES VERTEX SHADER ─────────────────────────────────────────
const docVertexShader = `
${noiseGLSL}

attribute vec3 aScatterPos; // Chaotic scattered coordinates before assembly
attribute vec3 aSeed;
attribute float aDocLayer;   // 0 = Front/Final, 1 = Review, 2 = Revision, 3 = Draft, 4 = Ambient Inflow
attribute float aClauseId;   // Clause paragraph block index for clause highlights
attribute float aSize;
attribute float aBaseAlpha;

uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uCursor2D;
uniform float uCursorActive;
uniform float uHoverActive;
uniform float uHoverY;       // Local Y target of hovered agreement
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
varying float vIsScan;

// Rotation around arbitrary axis
vec3 rotateAxis(vec3 p, vec3 axis, float angle) {
  return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
}

void main() {
  vec3 targetPos = position;

  // ── 1. Contract Assembly Cycle (Scattered Data -> Structured Clauses) ──────
  // Slow 26-second structuring cycle: particles organize into horizontal legal text rows
  float assembleTime = uTime * (6.283185 / 26.0) + aSeed.x * 0.5;
  float assembleCycle = sin(assembleTime) * 0.5 + 0.5;
  // 85% structured, 15% dynamic settling
  float assembleFactor = smoothstep(0.08, 0.92, assembleCycle);
  vec3 pos = mix(aScatterPos, targetPos, assembleFactor);

  // ── 2. Data Inflow Streams (Conversation Data -> Contract Plane) ───────────
  if (aDocLayer > 3.5) {
    // Ambient inflow particles spiral inward toward the document plane
    float flowProgress = fract(aSeed.y + uTime * 0.035);
    pos = mix(aScatterPos, targetPos, flowProgress);
    pos += vec3(
      sin(uTime * 0.4 + aSeed.z * 6.28) * 45.0,
      cos(uTime * 0.35 + aSeed.x * 6.28) * 35.0,
      sin(uTime * 0.25) * 60.0
    );
  }

  // ── 3. Document Stack 3D Depth & Slow Subtle Rotation (60-120s cycle) ──────
  // Extremely gentle tilt: perceives 3D depth without aggressive spinning
  vec3 rotAxis = normalize(vec3(0.12, 1.0, 0.08));
  float rotAngle = sin(uTime * (6.283185 / 90.0)) * 0.08; // Subtle +/- 4.5 degree swing
  // Layer parallax: deeper layers shift slightly
  rotAngle += (aDocLayer * 0.015);
  vec3 rotPos = rotateAxis(pos, rotAxis, rotAngle);

  // Slight permanent perspective inclination for document stack
  rotPos.z += (rotPos.x * 0.08 - rotPos.y * 0.05);

  // ── 4. Scanning & Verification Line (ARMOR Verifying Agreement Terms) ───────
  // Travels slowly top-to-bottom across document (-350 to +350 px)
  float scanY = sin(uTime * 0.40) * 320.0;
  float distToScan = abs(rotPos.y - scanY);
  float scanBoost = exp(-(distToScan * distToScan) / (2.0 * 28.0 * 28.0)) * 0.55;
  vIsScan = scanBoost;

  // ── 5. Clause Highlights (Occasional commercial term detection) ────────────
  float clausePhase = sin(uTime * 0.45 + aClauseId * 1.57);
  float clauseBoost = smoothstep(0.82, 0.98, clausePhase) * 0.45;

  // ── 6. Subtle Space-Time Ambient Field Behind Document ─────────────────────
  vec3 noiseWarp = vec3(
    snoise(rotPos * 0.0018 + vec3(uTime * 0.03)),
    snoise(rotPos * 0.0018 + vec3(2.5, uTime * 0.025, 0.0)),
    snoise(rotPos * 0.0018 + vec3(0.0, 4.1, uTime * 0.02))
  ) * 16.0;
  rotPos += noiseWarp;

  // ── 7. Camera View Space Transformation ───────────────────────────────────
  vec4 mvPosition = modelViewMatrix * vec4(rotPos, 1.0);

  // ── 8. Cursor Localized Interaction (Gentle Deflection & Brighten) ─────────
  float distToCursor = length(mvPosition.xy - uCursor2D);
  float interactionBoost = 0.0;
  if (uCursorActive > 0.01 && distToCursor < 160.0) {
    float repel = (1.0 - distToCursor / 160.0) * uCursorActive;
    vec2 pushDir = normalize(mvPosition.xy - uCursor2D);
    mvPosition.xy += pushDir * repel * 8.0; // Subtle max 8px shift
    interactionBoost += repel * 0.40;
  }

  // ── 9. Agreement Row Hover Inspection Surge ────────────────────────────────
  if (uHoverActive > 0.01) {
    float distY = abs(mvPosition.y - uHoverY);
    float hoverReach = smoothstep(160.0, 0.0, distY) * uHoverActive;
    mvPosition.x += sin(uTime * 2.2 + mvPosition.y * 0.02) * hoverReach * 6.0;
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

  // ── 11. Point Sizing & 3D Perspective Scaling ──────────────────────────────
  vDepth = -mvPosition.z;
  float layerSizeMult = aDocLayer < 0.5 ? 2.2 : aDocLayer < 1.5 ? 1.6 : aDocLayer < 2.5 ? 1.2 : 0.9;
  float basePtSize = aSize * layerSizeMult;

  if (scanBoost > 0.1 || clauseBoost > 0.1) {
    basePtSize *= 1.35;
  }

  gl_PointSize = basePtSize * uPixelRatio * (400.0 / max(1.0, vDepth));
  gl_PointSize = clamp(gl_PointSize, 0.8, 14.0);

  // ── 12. Colors: Soft White, Cool Slate, Legal ARMOR Cyan Accents ────────────
  vec3 colSlate = vec3(0.42, 0.48, 0.58); // Cool gray #6B7C93
  vec3 colWhite = vec3(0.96, 0.98, 1.00); // Soft legal starlight #F5F8FF
  vec3 colIce   = vec3(0.58, 0.82, 0.86); // Soft cyan #94D1DC
  vec3 colCyan  = vec3(0.22, 0.74, 0.97); // ARMOR electric cyan #38BDF8

  if (uIsLight > 0.5) {
    colSlate = vec3(0.25, 0.32, 0.42);
    colWhite = vec3(0.01, 0.45, 0.82);
    colIce   = vec3(0.05, 0.65, 0.91);
    colCyan  = vec3(0.22, 0.74, 0.97);
  }

  vec3 pCol = colSlate;
  if (aSeed.y > 0.75) {
    pCol = colWhite;
  } else if (aSeed.y > 0.60) {
    pCol = colIce;
  } else if (aSeed.y > 0.52) {
    pCol = colCyan;
  }

  // Scanning verification wave turns passing particles luminous cyan/white
  if (scanBoost > 0.05) {
    pCol = mix(pCol, colWhite, scanBoost);
    pCol = mix(pCol, colCyan, scanBoost * 0.7);
  }

  // Clause highlight
  if (clauseBoost > 0.05) {
    pCol = mix(pCol, colCyan, clauseBoost);
  }

  vColor = pCol;

  // Layer alpha attenuation: Front sheet is crisp; deeper sheets are progressively fainter
  float layerAlpha = aDocLayer < 0.5 ? 0.85 : aDocLayer < 1.5 ? 0.55 : aDocLayer < 2.5 ? 0.35 : 0.20;
  float depthFade = smoothstep(1800.0, 400.0, vDepth);

  float finalAlpha = aBaseAlpha * layerAlpha * depthFade * (1.0 + interactionBoost + scanBoost + clauseBoost) * mix(0.40, 1.0, titleCalm);
  vAlpha = clamp(finalAlpha, 0.0, 1.0);
}
`;

// ── DOCUMENT PARTICLES FRAGMENT SHADER ───────────────────────────────────────
const docFragmentShader = `
uniform float uGlobalOpacity;
uniform float uIsLight;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;
varying float vIsScan;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  // Crisp circular particle profile with slight rectangular legal text feel
  float radial = smoothstep(0.5, 0.08, dist);
  radial = pow(radial, 1.4);

  // Luminous core for primary particles
  float core = smoothstep(0.18, 0.0, dist) * 0.40;
  vec3 color = vColor + vec3(core);

  if (vIsScan > 0.1) {
    color += vec3(0.15, 0.35, 0.45) * vIsScan;
  }

  float finalAlpha = vAlpha * radial * uGlobalOpacity;
  if (finalAlpha < 0.003) discard;

  gl_FragColor = vec4(color, finalAlpha);
}
`;

// ── DOCUMENT FRAME LINES (Ultra-thin margins, dividers, and scanning line) ──
const frameVertexShader = `
uniform float uTime;
attribute float aLineType; // 0 = border/margin, 1 = divider rule
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Slow subtle tilt synchronized with document stack
  vec3 rotAxis = normalize(vec3(0.12, 1.0, 0.08));
  float rotAngle = sin(uTime * (6.283185 / 90.0)) * 0.08;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float pulse = sin(uTime * 0.6) * 0.15 + 0.85;
  vAlpha = (aLineType < 0.5 ? 0.28 : 0.18) * pulse;
}
`;

const frameFragmentShader = `
uniform float uGlobalOpacity;
varying float vAlpha;

void main() {
  float alpha = vAlpha * uGlobalOpacity;
  if (alpha < 0.003) discard;
  // Soft electric cyan legal frame
  gl_FragColor = vec4(0.35, 0.78, 0.95, alpha);
}
`;

export function AgreementsDocumentField({
  hoveredAgreementId = null,
  hoveredYRatio = null,
  hasAgreements = false,
  className = "",
}: AgreementsDocumentFieldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hoveredIdRef = useRef<string | null>(hoveredAgreementId);
  const hoveredYRef = useRef<number | null>(hoveredYRatio);
  const hasAgreementsRef = useRef<boolean>(hasAgreements);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -2000,
    y: -2000,
    active: false,
  });

  useEffect(() => {
    hoveredIdRef.current = hoveredAgreementId;
  }, [hoveredAgreementId]);

  useEffect(() => {
    hoveredYRef.current = hoveredYRatio;
  }, [hoveredYRatio]);

  useEffect(() => {
    hasAgreementsRef.current = hasAgreements;
  }, [hasAgreements]);

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
      if (w < 600) return 3200;
      if (w < 900) return 6500;
      if (w < 1200) return 10000;
      return 14000;
    };
    const particleCount = calcParticleCount(width);

    const positions = new Float32Array(particleCount * 3);
    const scatterPositions = new Float32Array(particleCount * 3);
    const seeds = new Float32Array(particleCount * 3);
    const docLayers = new Float32Array(particleCount);
    const clauseIds = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const baseAlphas = new Float32Array(particleCount);

    // Document Dimensions in 3D Frustum Space
    // 70-95% viewport width, 60-85% viewport height
    const docWidth = Math.min(dims.frustumW * 0.82, 1150.0);
    const docHeight = Math.min(dims.frustumH * 0.78, 760.0);
    const docCenterX = dims.frustumW * 0.04;
    const docCenterY = -dims.frustumH * 0.04;

    // ── 4. Generate Document Stack & Structured Clause Rows ─────────────────
    // Stack layers: 0 = Front/Final, 1 = Review, 2 = Revision, 3 = Draft, 4 = Inflow
    const numLayers = 4;
    const layerOffsets = [
      { z: +60, x: 0, y: 0 },
      { z: -30, x: +35, y: +25 },
      { z: -120, x: -30, y: -20 },
      { z: -210, x: +15, y: -40 },
    ];

    // Number of paragraph blocks on document
    const numClauses = 6;
    const clauseHeight = (docHeight * 0.72) / numClauses;

    for (let i = 0; i < particleCount; i++) {
      const isAmbientInflow = i > particleCount * 0.82;
      let targetX = 0;
      let targetY = 0;
      let targetZ = 0;
      let layerIndex = 0;
      let clauseIndex = 0;

      if (isAmbientInflow) {
        // Inflow ambient data particles starting from perimeter
        layerIndex = 4.0;
        clauseIndex = Math.floor(Math.random() * numClauses);
        targetX = docCenterX + (Math.random() - 0.5) * docWidth * 1.6;
        targetY = docCenterY + (Math.random() - 0.5) * docHeight * 1.6;
        targetZ = (Math.random() - 0.5) * 400.0;
      } else {
        // Structured document stack particle
        layerIndex = Math.floor(Math.random() * numLayers);
        const lOffset = layerOffsets[layerIndex];

        // Assign to clause block (0 to 5)
        clauseIndex = Math.floor(Math.random() * numClauses);
        const clauseBaseY =
          docHeight * 0.36 - clauseIndex * clauseHeight - Math.random() * (clauseHeight * 0.78);

        // Distribute along horizontal text-like rows
        const rowJitter = (Math.floor(Math.random() * 5) - 2) * 4.0;
        targetY = docCenterY + clauseBaseY + rowJitter + lOffset.y;

        // Horizontal line span across document width with legal margins
        const marginPadding = docWidth * 0.12;
        const usableWidth = docWidth - marginPadding * 2.0;
        // Paragraph line width variation (justified / ragged right)
        const lineFraction = 0.65 + Math.random() * 0.35;
        const lineX = (Math.random() - 0.5) * usableWidth * lineFraction;

        targetX = docCenterX + lineX + lOffset.x;
        targetZ = lOffset.z + (Math.random() - 0.5) * 8.0;
      }

      positions[i * 3 + 0] = targetX;
      positions[i * 3 + 1] = targetY;
      positions[i * 3 + 2] = targetZ;

      // Chaotic scatter coordinates before assembly
      scatterPositions[i * 3 + 0] = docCenterX + (Math.random() - 0.5) * dims.frustumW * 1.8;
      scatterPositions[i * 3 + 1] = docCenterY + (Math.random() - 0.5) * dims.frustumH * 1.8;
      scatterPositions[i * 3 + 2] = (Math.random() - 0.5) * 800.0;

      seeds[i * 3 + 0] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();

      docLayers[i] = layerIndex;
      clauseIds[i] = clauseIndex;

      // Size: Front layer is crisp (1.8-2.8px), deep layers are finer
      sizes[i] = 1.3 + Math.random() * 0.9;
      baseAlphas[i] = 0.45 + Math.random() * 0.35;
    }

    const docGeometry = new THREE.BufferGeometry();
    docGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    docGeometry.setAttribute("aScatterPos", new THREE.BufferAttribute(scatterPositions, 3));
    docGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    docGeometry.setAttribute("aDocLayer", new THREE.BufferAttribute(docLayers, 1));
    docGeometry.setAttribute("aClauseId", new THREE.BufferAttribute(clauseIds, 1));
    docGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    docGeometry.setAttribute("aBaseAlpha", new THREE.BufferAttribute(baseAlphas, 1));

    const docUniforms = {
      uTime: { value: prefersReducedMotion ? 12.0 : 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uCursor2D: { value: new THREE.Vector2(-2000, -2000) },
      uCursorActive: { value: 0 },
      uHoverActive: { value: 0 },
      uHoverY: { value: 0 },
      uGlobalOpacity: { value: hasAgreements ? 0.45 : 0.85 },
      uIsLight: { value: 0 },
    };

    const docMaterial = new THREE.ShaderMaterial({
      vertexShader: docVertexShader,
      fragmentShader: docFragmentShader,
      uniforms: docUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const docPoints = new THREE.Points(docGeometry, docMaterial);
    scene.add(docPoints);

    // ── 5. Document Frame Lines & Clause Dividers ───────────────────────────
    const framePositions: number[] = [];
    const lineTypes: number[] = [];

    // Outer margin frames for the top 2 document layers
    for (let l = 0; l < 2; l++) {
      const lOffset = layerOffsets[l];
      const hw = docWidth * 0.5;
      const hh = docHeight * 0.5;
      const cx = docCenterX + lOffset.x;
      const cy = docCenterY + lOffset.y;
      const cz = lOffset.z;

      // 4 perimeter border lines
      framePositions.push(
        cx - hw, cy - hh, cz,  cx + hw, cy - hh, cz,
        cx + hw, cy - hh, cz,  cx + hw, cy + hh, cz,
        cx + hw, cy + hh, cz,  cx - hw, cy + hh, cz,
        cx - hw, cy + hh, cz,  cx - hw, cy - hh, cz
      );
      for (let k = 0; k < 8; k++) lineTypes.push(0.0);

      // Horizontal clause divider lines
      for (let c = 1; c < numClauses; c++) {
        const divY = cy + hh - c * clauseHeight;
        framePositions.push(
          cx - hw * 0.85, divY, cz,
          cx + hw * 0.85, divY, cz
        );
        lineTypes.push(1.0, 1.0);
      }
    }

    const frameGeometry = new THREE.BufferGeometry();
    frameGeometry.setAttribute("position", new THREE.Float32BufferAttribute(framePositions, 3));
    frameGeometry.setAttribute("aLineType", new THREE.Float32BufferAttribute(lineTypes, 1));

    const frameMaterial = new THREE.ShaderMaterial({
      vertexShader: frameVertexShader,
      fragmentShader: frameFragmentShader,
      uniforms: {
        uTime: docUniforms.uTime,
        uGlobalOpacity: docUniforms.uGlobalOpacity,
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const frameLines = new THREE.LineSegments(frameGeometry, frameMaterial);
    scene.add(frameLines);

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
      docUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
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
      docUniforms.uIsLight.value = isLight ? 1.0 : 0.0;

      // Opacity: 0.85 on empty state, 0.45 when actual agreement cards/table overlay
      const targetOpacity = isLight
        ? hasAgreementsRef.current
          ? 0.35
          : 0.72
        : hasAgreementsRef.current
        ? 0.45
        : 0.85;

      docUniforms.uGlobalOpacity.value +=
        (targetOpacity - docUniforms.uGlobalOpacity.value) * 0.05;

      // Cursor position smoothing
      const mouse = mouseRef.current;
      if (mouse.active) {
        docUniforms.uCursor2D.value.lerp(new THREE.Vector2(mouse.x, mouse.y), 0.08);
        docUniforms.uCursorActive.value += (1.0 - docUniforms.uCursorActive.value) * 0.08;
      } else {
        docUniforms.uCursorActive.value *= 0.94;
      }

      // Agreement row hover inspection activation
      const isHovered = hoveredIdRef.current !== null ? 1.0 : 0.0;
      docUniforms.uHoverActive.value += (isHovered - docUniforms.uHoverActive.value) * 0.08;

      if (hoveredYRef.current !== null) {
        const target3DY = -(hoveredYRef.current - 0.5) * dims.frustumH;
        docUniforms.uHoverY.value += (target3DY - docUniforms.uHoverY.value) * 0.1;
      }

      if (!prefersReducedMotion) {
        docUniforms.uTime.value = elapsedTime;
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

      docGeometry.dispose();
      docMaterial.dispose();
      frameGeometry.dispose();
      frameMaterial.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`agreements-document-field-canvas ${className}`}
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
