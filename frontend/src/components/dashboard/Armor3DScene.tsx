import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface Armor3DSceneProps {
  scrollProgress: number; // 0.0 to 1.0
  activeStage: number; // 0 to 4
  isRecording?: boolean;
  onDocumentClick?: () => void;
  className?: string;
}

// Procedural high-performance circular soft particle texture
function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.2, "rgba(186, 230, 253, 0.9)");
    gradient.addColorStop(0.5, "rgba(56, 189, 248, 0.4)");
    gradient.addColorStop(0.8, "rgba(14, 165, 233, 0.1)");
    gradient.addColorStop(1, "rgba(14, 165, 233, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function Armor3DScene({
  scrollProgress,
  activeStage: _activeStage,
  isRecording = false,
  onDocumentClick,
  className = "",
}: Armor3DSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameIdRef = useRef<number>(0);

  // Mouse & interaction state
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isHoveringDoc: false });
  const [docHovered, setDocHovered] = useState(false);
  const scrollProgressRef = useRef(scrollProgress);
  scrollProgressRef.current = scrollProgress;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x06080d);
    scene.fog = new THREE.FogExp2(0x06080d, 0.018);

    // 2. Camera setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(0, 0, isMobile ? 26 : 22);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: "high-performance",
      alpha: false,
    });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Atmospheric Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
    scene.add(ambientLight);

    const cyanPoint = new THREE.PointLight(0x38bdf8, 3.8, 80);
    cyanPoint.position.set(-10, 14, 18);
    scene.add(cyanPoint);

    const violetPoint = new THREE.PointLight(0x818cf8, 2.2, 70);
    violetPoint.position.set(14, -10, 14);
    scene.add(violetPoint);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(0, 12, 16);
    scene.add(dirLight);

    // 5. Particle System Setup
    const particleTexture = createParticleTexture();
    const particleCount = prefersReducedMotion ? 2000 : isMobile ? 3200 : 7500;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Target position buffers for the 5 states
    const posWave = new Float32Array(particleCount * 3);
    const posListen = new Float32Array(particleCount * 3);
    const posGraph = new Float32Array(particleCount * 3);
    const posVerify = new Float32Array(particleCount * 3);
    const posDoc = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);

    // 7 Semantic Node Centers in 3D Space (State 3 - Understand)
    const nodeCenters: THREE.Vector3[] = [
      new THREE.Vector3(-6.5, 2.8, 0.5),   // 0: PARTY (Buyer/Seller)
      new THREE.Vector3(-3.2, 4.0, 1.2),   // 1: PRODUCT (SKU, Spec)
      new THREE.Vector3(-0.5, 1.8, -0.8),  // 2: QUANTITY (Units, Volume)
      new THREE.Vector3(2.8, 3.2, 1.5),    // 3: PRICE (Unit Rate)
      new THREE.Vector3(6.2, 1.2, 0.2),    // 4: PAYMENT (Net 30, Advance)
      new THREE.Vector3(3.5, -2.6, -1.0),  // 5: DELIVERY (FOB, Timeline)
      new THREE.Vector3(-2.2, -2.2, 0.8),  // 6: WARRANTY (12 Months SLA)
    ];

    // Colors: 75% white/slate, 20% electric cyan/blue, 5% violet
    const colorWhite = new THREE.Color(0xf1f5f9);
    const colorCyan = new THREE.Color(0x38bdf8);
    const colorElectricBlue = new THREE.Color(0x2563eb);
    const colorViolet = new THREE.Color(0xa78bfa);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const phaseVal = Math.random() * Math.PI * 2;
      phases[i] = phaseVal;
      speeds[i] = 0.5 + Math.random() * 0.8;

      // Color distribution
      const randColor = Math.random();
      let c = colorWhite;
      if (randColor > 0.95) c = colorViolet;
      else if (randColor > 0.75) c = colorCyan;
      else if (randColor > 0.65) c = colorElectricBlue;

      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      // State 1: Flowing 3D Waveform Ribbon
      const u = (i / particleCount) * 2 - 1; // -1 to 1
      const x1 = u * 15;
      const y1 = Math.sin(u * 5 + phaseVal) * 2.2 + (Math.random() - 0.5) * 1.5;
      const z1 = Math.cos(u * 4 + phaseVal) * 3.5 + (Math.random() - 0.5) * 2.5;
      posWave[i3] = x1;
      posWave[i3 + 1] = y1;
      posWave[i3 + 2] = z1;

      // State 2: Listen - Acoustic stream channels & diarization lines
      const lane = i % 4; // 4 conversation audio lanes
      const laneY = (lane - 1.5) * 2.2;
      const x2 = ((i % 100) / 100) * 18 - 9;
      const y2 = laneY + Math.sin(x2 * 0.8 + phaseVal) * 0.6;
      const z2 = (Math.random() - 0.5) * 2.0;
      posListen[i3] = x2;
      posListen[i3 + 1] = y2;
      posListen[i3 + 2] = z2;

      // State 3: Understand - Clustering around 7 semantic nodes
      const targetNode = nodeCenters[i % nodeCenters.length] ?? nodeCenters[0]!;
      const clusterRadius = 0.6 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      posGraph[i3] = targetNode.x + clusterRadius * Math.sin(phi) * Math.cos(theta);
      posGraph[i3 + 1] = targetNode.y + clusterRadius * Math.sin(phi) * Math.sin(theta);
      posGraph[i3 + 2] = targetNode.z + clusterRadius * Math.cos(phi);

      // State 4: Verify - Two opposing contradiction clusters (Price 780 vs Price 800)
      const isLeftDiscrepancy = i % 2 === 0;
      const centerX = isLeftDiscrepancy ? -4.5 : 4.5;
      const centerCol = isLeftDiscrepancy ? 0.5 : -0.5;
      const rad4 = 0.8 + Math.random() * 2.2;
      const th4 = Math.random() * Math.PI * 2;
      posVerify[i3] = centerX + rad4 * Math.cos(th4);
      posVerify[i3 + 1] = centerCol + rad4 * Math.sin(th4) * 0.8;
      posVerify[i3 + 2] = (Math.random() - 0.5) * 3;

      // State 5: Structure & Agreement - Orbiting around 3D document plane
      const onDoc = Math.random() > 0.4;
      if (onDoc) {
        // Aligned along document lines
        const dx = (Math.random() - 0.5) * 6.5;
        const dy = (Math.random() - 0.5) * 8.5;
        const dz = (Math.random() - 0.5) * 0.4;
        posDoc[i3] = dx;
        posDoc[i3 + 1] = dy;
        posDoc[i3 + 2] = dz;
      } else {
        // Orbiting halo
        const orbitRadius = 5.5 + Math.random() * 3.5;
        const orbitAngle = Math.random() * Math.PI * 2;
        posDoc[i3] = Math.cos(orbitAngle) * orbitRadius;
        posDoc[i3 + 1] = Math.sin(orbitAngle) * orbitRadius * 0.7;
        posDoc[i3 + 2] = (Math.random() - 0.5) * 4;
      }

      // Initial positions start at wave
      positions[i3] = posWave[i3] ?? 0;
      positions[i3 + 1] = posWave[i3 + 1] ?? 0;
      positions[i3 + 2] = posWave[i3 + 2] ?? 0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.32 : 0.28,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);

    // 6. Semantic Node Network (Lines + Node Mesh Indicators)
    const lineIndices = [
      0, 1, // Party <-> Product
      1, 2, // Product <-> Quantity
      2, 3, // Quantity <-> Price
      3, 4, // Price <-> Payment
      4, 5, // Payment <-> Delivery
      5, 6, // Delivery <-> Warranty
      6, 0, // Warranty <-> Party
      1, 3, // Product <-> Price
      2, 4, // Quantity <-> Payment
    ];

    const linePoints: number[] = [];
    for (let k = 0; k < lineIndices.length; k += 2) {
      const idxA = lineIndices[k] ?? 0;
      const idxB = lineIndices[k + 1] ?? 0;
      const a = nodeCenters[idxA] ?? nodeCenters[0]!;
      const b = nodeCenters[idxB] ?? nodeCenters[0]!;
      linePoints.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.Float32BufferAttribute(linePoints, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0, // Faded in during Stage 3
      blending: THREE.AdditiveBlending,
    });
    const networkLines = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(networkLines);

    // Node glowing spheres
    const nodeGroup = new THREE.Group();
    const sphereGeom = new THREE.SphereGeometry(0.35, 16, 16);
    nodeCenters.forEach((pos, idx) => {
      const isPrice = idx === 3;
      const sphereMat = new THREE.MeshBasicMaterial({
        color: isPrice ? 0x38bdf8 : 0x7dd3fc,
        transparent: true,
        opacity: 0.0,
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.copy(pos);
      nodeGroup.add(sphere);
    });
    scene.add(nodeGroup);

    // 7. 3D Agreement Document Plane
    const docGroup = new THREE.Group();
    docGroup.position.set(0, 0, 0);

    // Glass Document Body
    const docWidth = 7.2;
    const docHeight = 9.6;
    const docGeom = new THREE.PlaneGeometry(docWidth, docHeight);
    const docMat = new THREE.MeshPhysicalMaterial({
      color: 0x090e17,
      metalness: 0.2,
      roughness: 0.15,
      transmission: 0.6,
      transparent: true,
      opacity: 0.0, // Fades in Stage 4 & 5
      side: THREE.DoubleSide,
    });
    const docMesh = new THREE.Mesh(docGeom, docMat);
    docGroup.add(docMesh);

    // Cyan glowing document border
    const borderEdges = new THREE.EdgesGeometry(docGeom);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const docBorder = new THREE.LineSegments(borderEdges, borderMat);
    docGroup.add(docBorder);

    // Procedural document lines (contract clauses)
    const clauseLinesGeom = new THREE.BufferGeometry();
    const clausePoints: number[] = [];
    for (let r = 0; r < 7; r++) {
      const lineY = 3.2 - r * 1.0;
      const lineWidth = r === 0 ? 3.0 : r === 6 ? 2.5 : 5.4;
      clausePoints.push(-lineWidth / 2, lineY, 0.02, lineWidth / 2, lineY, 0.02);
    }
    clauseLinesGeom.setAttribute("position", new THREE.Float32BufferAttribute(clausePoints, 3));
    const clauseMat = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const clauseLines = new THREE.LineSegments(clauseLinesGeom, clauseMat);
    docGroup.add(clauseLines);

    // Seal emblem circle on document
    const sealGeom = new THREE.RingGeometry(0.5, 0.58, 32);
    const sealMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const seal = new THREE.Mesh(sealGeom, sealMat);
    seal.position.set(2.0, -3.2, 0.03);
    docGroup.add(seal);

    scene.add(docGroup);

    // Raycaster for document hover interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;

      pointer.x = nx;
      pointer.y = ny;

      // Only test raycast in Stage 4/5 when doc is visible
      if (scrollProgressRef.current > 0.65) {
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(docMesh);
        const isHovered = intersects.length > 0;
        if (isHovered !== mouseRef.current.isHoveringDoc) {
          mouseRef.current.isHoveringDoc = isHovered;
          setDocHovered(isHovered);
        }
      } else if (mouseRef.current.isHoveringDoc) {
        mouseRef.current.isHoveringDoc = false;
        setDocHovered(false);
      }
    };

    const handleClick = () => {
      if (mouseRef.current.isHoveringDoc && onDocumentClick) {
        onDocumentClick();
      }
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    container.addEventListener("click", handleClick);

    // Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    const clock = new THREE.Clock();
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (!isTabVisible) return;

      const _delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse damping (lerp)
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const p = scrollProgressRef.current; // 0.0 (hero) to 1.0 (agreement/dashboard)
      const recording = isRecordingRef.current;

      // ── CAMERA KINEMATICS & PARALLAX ───────────────────────────────────────
      let targetCamX = mouse.x * 1.5;
      let targetCamY = mouse.y * 1.2;
      let targetCamZ = isMobile ? 26 : 22;

      if (p < 0.2) {
        targetCamZ = isMobile ? 26 : 22;
        targetCamX += 0;
      } else if (p < 0.45) {
        targetCamZ = isMobile ? 24 : 19;
        targetCamX += -1.5;
      } else if (p < 0.7) {
        targetCamZ = isMobile ? 20 : 16;
        targetCamY += 0.5;
      } else if (p < 0.85) {
        targetCamZ = isMobile ? 22 : 18;
        targetCamX += 1.0;
      } else {
        targetCamZ = isMobile ? 21 : 16.5;
        targetCamX += 0;
      }

      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.position.z += (targetCamZ - camera.position.z) * 0.05;
      camera.lookAt(0, 0, 0);

      // ── PARTICLE INTERPOLATION ACROSS 5 STATES ──────────────────────────────
      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      const currentPos = posAttr.array as Float32Array;

      let w1 = 0, w2 = 0, w3 = 0, w4 = 0, w5 = 0;
      if (p <= 0.25) {
        const t = p / 0.25;
        w1 = 1 - t;
        w2 = t;
      } else if (p <= 0.5) {
        const t = (p - 0.25) / 0.25;
        w2 = 1 - t;
        w3 = t;
      } else if (p <= 0.75) {
        const t = (p - 0.5) / 0.25;
        w3 = 1 - t;
        w4 = t;
      } else {
        const t = (p - 0.75) / 0.25;
        w4 = 1 - t;
        w5 = t;
      }

      const audioPulse = recording
        ? 1.8 + Math.sin(time * 12) * 0.5
        : 1.0 + (mouse.isHoveringDoc ? 0.3 : 0.0);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const phase = phases[i] ?? 0;
        const speed = speeds[i] ?? 1.0;

        // Continuous organic wave oscillation
        const waveX = posWave[i3] ?? 0;
        const waveY =
          (posWave[i3 + 1] ?? 0) +
          Math.sin(time * speed + waveX * 0.3 + phase) * 0.45 * audioPulse;
        const waveZ =
          (posWave[i3 + 2] ?? 0) +
          Math.cos(time * 0.8 * speed + waveX * 0.2 + phase) * 0.5;

        // Listen flow
        const listenX = posListen[i3] ?? 0;
        const listenY =
          (posListen[i3 + 1] ?? 0) +
          Math.sin(time * 2.0 + listenX * 0.5 + phase) * 0.25 * audioPulse;
        const listenZ = posListen[i3 + 2] ?? 0;

        // Graph node oscillation
        const graphX = (posGraph[i3] ?? 0) + Math.sin(time * 1.5 + phase) * 0.15;
        const graphY = (posGraph[i3 + 1] ?? 0) + Math.cos(time * 1.2 + phase) * 0.15;
        const graphZ = (posGraph[i3 + 2] ?? 0) + Math.sin(time * 0.9 + phase) * 0.15;

        // Verify conflict pulse
        const verifyX = (posVerify[i3] ?? 0) + Math.sin(time * 2.5 + phase) * 0.2;
        const verifyY = (posVerify[i3 + 1] ?? 0) + Math.cos(time * 2.2 + phase) * 0.2;
        const verifyZ = posVerify[i3 + 2] ?? 0;

        // Document orbital motion
        let docX = posDoc[i3] ?? 0;
        let docY = posDoc[i3 + 1] ?? 0;
        let docZ = posDoc[i3 + 2] ?? 0;
        if (w5 > 0.05) {
          const orbitAngle = time * 0.4 * speed;
          const cosA = Math.cos(orbitAngle);
          const sinA = Math.sin(orbitAngle);
          const ox = docX * cosA - docZ * sinA;
          const oz = docX * sinA + docZ * cosA;
          docX = ox;
          docZ = oz;
        }

        // Interpolated target
        const targetX =
          w1 * waveX + w2 * listenX + w3 * graphX + w4 * verifyX + w5 * docX;
        const targetY =
          w1 * waveY + w2 * listenY + w3 * graphY + w4 * verifyY + w5 * docY;
        const targetZ =
          w1 * waveZ + w2 * listenZ + w3 * graphZ + w4 * verifyZ + w5 * docZ;

        // Smoothly glide particle toward target
        const currX = currentPos[i3] ?? 0;
        const currY = currentPos[i3 + 1] ?? 0;
        const currZ = currentPos[i3 + 2] ?? 0;

        currentPos[i3] = currX + (targetX - currX) * 0.12;
        currentPos[i3 + 1] = currY + (targetY - currY) * 0.12;
        currentPos[i3 + 2] = currZ + (targetZ - currZ) * 0.12;
      }
      posAttr.needsUpdate = true;

      // ── NETWORK GRAPH OPACITY & INTERACTION ────────────────────────────────
      const graphOpacity = Math.max(0, Math.min(0.65, (w3 + w4 * 0.5) * 0.9));
      lineMat.opacity = graphOpacity;
      nodeGroup.children.forEach((child, idx) => {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = graphOpacity * 1.2;
        const s = 1.0 + Math.sin(time * 3 + idx) * 0.15;
        child.scale.set(s, s, s);
      });

      // ── 3D DOCUMENT INTERACTIVITY & VISIBILITY ─────────────────────────────
      const docOpacity = Math.max(0, Math.min(0.9, w5 * 1.1 + w4 * 0.3));
      docMat.opacity = docOpacity * 0.85;
      borderMat.opacity = docOpacity * 0.95;
      clauseMat.opacity = docOpacity * 0.75;
      sealMat.opacity = docOpacity * 0.9;

      if (docOpacity > 0.01) {
        docGroup.visible = true;
        const targetRotY = (mouse.isHoveringDoc ? 0.0 : -0.18) + mouse.x * 0.12;
        const targetRotX = (mouse.isHoveringDoc ? 0.05 : 0.12) - mouse.y * 0.1;
        const targetZ = (mouse.isHoveringDoc ? 2.5 : 0.0) + Math.sin(time * 1.5) * 0.2;

        docGroup.rotation.y += (targetRotY - docGroup.rotation.y) * 0.08;
        docGroup.rotation.x += (targetRotX - docGroup.rotation.x) * 0.08;
        docGroup.position.z += (targetZ - docGroup.position.z) * 0.08;
        docGroup.position.y = Math.sin(time * 1.8) * 0.25;

        if (mouse.isHoveringDoc) {
          borderMat.color.setHex(0x7dd3fc);
        } else {
          borderMat.color.setHex(0x38bdf8);
        }
      } else {
        docGroup.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container.removeEventListener("click", handleClick);

      geometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      lineGeom.dispose();
      lineMat.dispose();
      sphereGeom.dispose();
      docGeom.dispose();
      docMat.dispose();
      borderEdges.dispose();
      borderMat.dispose();
      clauseLinesGeom.dispose();
      clauseMat.dispose();
      sealGeom.dispose();
      sealMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onDocumentClick]);

  return (
    <div
      ref={mountRef}
      className={`armor-3d-canvas-wrap ${className}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      {/* Interactive Document Hover Hint Pill */}
      {docHovered && scrollProgress > 0.65 && (
        <div
          style={{
            position: "absolute",
            bottom: "18%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(13, 17, 23, 0.92)",
            border: "1px solid rgba(56, 189, 248, 0.5)",
            borderRadius: 9999,
            padding: "8px 20px",
            color: "#38bdf8",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            boxShadow: "0 8px 30px rgba(56, 189, 248, 0.25)",
            backdropFilter: "blur(12px)",
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease-out",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#38bdf8",
              boxShadow: "0 0 10px #38bdf8",
            }}
          />
          CLICK TO REVIEW STRUCTURED AGREEMENT
        </div>
      )}
    </div>
  );
}
