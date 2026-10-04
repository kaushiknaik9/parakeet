import React, { useEffect, useRef } from "react";

interface CinematicSpaceBackgroundProps {
  hoveredCard?: "live" | "offline" | null;
  className?: string;
}

interface DistantStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface SphereParticle {
  // Base unit sphere coordinates
  uX: number;
  uY: number;
  uZ: number;
  rNorm: number; // slight volumetric depth thickness around 1.0
  baseSize: number;
  baseAlpha: number;
  color: string;
  isCore: boolean;
  // Dynamic offset from cursor interaction
  offX: number;
  offY: number;
  targetOffX: number;
  targetOffY: number;
}

interface OrbitalRingSpec {
  radiusMult: number;
  pitch: number; // inclination angle
  roll: number;  // tilt azimuth
  speedMult: number;
  color: string;
  accentArc?: { start: number; length: number };
}

export function CinematicSpaceBackground({
  hoveredCard = null,
  className = "",
}: CinematicSpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const animFrameRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -2000, y: -2000, active: false });
  const hoveredCardRef = useRef<"live" | "offline" | null>(hoveredCard);
  const hoverStateRef = useRef<{ speed: number; scale: number; glowLeft: number; glowRight: number }>({
    speed: 1,
    scale: 1,
    glowLeft: 0,
    glowRight: 0,
  });

  useEffect(() => {
    hoveredCardRef.current = hoveredCard;
  }, [hoveredCard]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // ── 1. Calculate Giant Sphere Radius (1.4x – 1.8x Viewport Height) ──
    const computeSphereRadius = (w: number, h: number) => {
      if (w < 640) return Math.max(h * 0.65, 400);
      if (w < 1024) return Math.max(h * 0.74, 560);
      return Math.max(h * 0.82, 700);
    };

    let sphereRadius = computeSphereRadius(width, height);

    // ── 2. Distant Background Star Field ─────────────────────────────────
    const distantStars: DistantStar[] = [];
    const initDistantStars = () => {
      distantStars.length = 0;
      const count = width < 768 ? 60 : 140;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.02 + Math.random() * 0.03;
        const baseAlpha = 0.08 + Math.random() * 0.18;
        distantStars.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 0.6 + Math.random() * 0.45,
          alpha: baseAlpha,
          baseAlpha,
          twinkleSpeed: 0.01 + Math.random() * 0.02,
          twinklePhase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.4 ? "#94A3B8" : "#8CC9D2",
        });
      }
    };

    // ── 3. 3D Spherical Particle Field Generation ───────────────────────
    // Fibonacci sphere distribution for uniform, elegant mathematical coverage
    const sphereParticles: SphereParticle[] = [];

    const initSphereParticles = () => {
      sphereParticles.length = 0;
      const count = width < 768 ? 750 : width < 1024 ? 1200 : 1750;

      for (let i = 0; i < count; i++) {
        const k = (i + 0.5) / count;
        // Latitude polar angle [0, PI]
        const phi = Math.acos(1 - 2 * k);
        // Golden ratio longitude angle
        const theta = i * 2.399963229728653;

        // Volumetric shell thickness (~6% of radius)
        const thickness = 0.97 + 0.06 * Math.sin(i * 17.3 + Math.cos(k * 23.1));

        const uX = Math.sin(phi) * Math.cos(theta);
        const uY = Math.cos(phi);
        const uZ = Math.sin(phi) * Math.sin(theta);

        const rand = Math.random();
        let baseSize = 0.85 + Math.random() * 0.55;
        let baseAlpha = 0.22 + Math.random() * 0.38;
        let color = "#8CC9D2";

        if (rand > 0.90) {
          // Luminous computational nodes
          baseSize = 1.4 + Math.random() * 0.6;
          baseAlpha = 0.65 + Math.random() * 0.35;
          color = "#FFFFFF";
        } else if (rand > 0.65) {
          color = "#C8EEF3";
        } else if (rand < 0.25) {
          color = "#64748B";
        }

        sphereParticles.push({
          uX,
          uY,
          uZ,
          rNorm: thickness,
          baseSize,
          baseAlpha,
          color,
          isCore: false,
          offX: 0,
          offY: 0,
          targetOffX: 0,
          targetOffY: 0,
        });
      }

      // Add concentrated computational central core particles (~90 particles)
      const coreCount = width < 768 ? 40 : 80;
      for (let i = 0; i < coreCount; i++) {
        const k = (i + 0.5) / coreCount;
        const phi = Math.acos(1 - 2 * k);
        const theta = i * 2.399963229728653;
        const rad = 0.03 + Math.random() * 0.13; // close to center

        sphereParticles.push({
          uX: Math.sin(phi) * Math.cos(theta),
          uY: Math.cos(phi),
          uZ: Math.sin(phi) * Math.sin(theta),
          rNorm: rad,
          baseSize: 1.1 + Math.random() * 0.7,
          baseAlpha: 0.45 + Math.random() * 0.45,
          color: Math.random() > 0.3 ? "#FFFFFF" : "#38BDF8",
          isCore: true,
          offX: 0,
          offY: 0,
          targetOffX: 0,
          targetOffY: 0,
        });
      }
    };

    // ── 4. 4 Giant Orbital Contours Wrapping Around the Sphere ─────────
    const orbitalRings: OrbitalRingSpec[] = [
      {
        radiusMult: 1.04,
        pitch: 0.24, // ~13.7 deg inclination
        roll: 0.10,
        speedMult: 1.0,
        color: "rgba(140, 201, 210, 0.24)",
        accentArc: { start: 0, length: 0.45 },
      },
      {
        radiusMult: 1.02,
        pitch: 1.12, // high inclination polar orbit (~64 deg)
        roll: 0.55,
        speedMult: -0.75,
        color: "rgba(56, 189, 248, 0.22)",
      },
      {
        radiusMult: 1.09,
        pitch: -0.58, // transverse reverse orbit (~ -33 deg)
        roll: -0.42,
        speedMult: 0.85,
        color: "rgba(148, 163, 184, 0.18)",
      },
      {
        radiusMult: 1.15,
        pitch: 0.85,
        roll: -0.80,
        speedMult: -0.55,
        color: "rgba(200, 240, 248, 0.16)",
      },
    ];

    // Latitude contour lines (6 parallels across the sphere)
    const latitudeLevels = [0.72, 0.44, 0.15, -0.15, -0.44, -0.72];

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    const resizeCanvas = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      sphereRadius = computeSphereRadius(width, height);

      initDistantStars();
      initSphereParticles();
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);
    resizeCanvas();

    let time = 0;
    let running = true;

    // Smooth cursor perspective bias
    let smoothYawBias = 0;
    let smoothPitchBias = 0;

    // ── 5. Main 60fps Render Loop ─────────────────────────────────────
    const render = () => {
      if (!running) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear with dark void
      ctx.clearRect(0, 0, width, height);

      // Compute exact center relative to the main content area (accounting for sidebar)
      const sidebarOffset = width > 800 ? 256 : 0;
      const contentWidth = width - sidebarOffset;
      const cx = sidebarOffset + contentWidth * 0.50;
      const cy = height * 0.50;

      // ── Step A: Atmospheric Ambient Background Glow ──────────────────
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const glowTime = time * 0.00018;
      const ambX = cx + Math.sin(glowTime) * 0.08 * contentWidth;
      const ambY = cy + Math.cos(glowTime * 0.9) * 0.08 * height;

      const bgGlow = ctx.createRadialGradient(
        ambX,
        ambY,
        50,
        ambX,
        ambY,
        Math.max(contentWidth * 0.75, 700)
      );
      if (isLight) {
        bgGlow.addColorStop(0, "rgba(56, 189, 248, 0.07)");
        bgGlow.addColorStop(0.5, "rgba(140, 201, 210, 0.02)");
        bgGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      } else {
        bgGlow.addColorStop(0, "rgba(14, 26, 44, 0.40)");
        bgGlow.addColorStop(0.5, "rgba(8, 14, 24, 0.20)");
        bgGlow.addColorStop(1, "rgba(4, 6, 8, 0)");
      }

      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // ── Step B: Card Hover Ambient Reactions ─────────────────────────
      const targetHoverLeft = hoveredCardRef.current === "live" ? 1 : 0;
      const targetHoverRight = hoveredCardRef.current === "offline" ? 1 : 0;
      hoverStateRef.current.glowLeft += (targetHoverLeft - hoverStateRef.current.glowLeft) * 0.08;
      hoverStateRef.current.glowRight += (targetHoverRight - hoverStateRef.current.glowRight) * 0.08;

      const targetSpeed = hoveredCardRef.current === "offline" ? 1.30 : 1.0;
      const targetScale = hoveredCardRef.current === "live" ? 1.025 : 1.0;
      hoverStateRef.current.speed += (targetSpeed - hoverStateRef.current.speed) * 0.05;
      hoverStateRef.current.scale += (targetScale - hoverStateRef.current.scale) * 0.05;

      const speedMult = hoverStateRef.current.speed;
      const currentRadius = sphereRadius * hoverStateRef.current.scale;

      if (hoverStateRef.current.glowLeft > 0.01) {
        const leftX = sidebarOffset + contentWidth * 0.32;
        const leftY = height * 0.50;
        const grad = ctx.createRadialGradient(leftX, leftY, 10, leftX, leftY, 280);
        grad.addColorStop(0, `rgba(56, 189, 248, ${0.08 * hoverStateRef.current.glowLeft})`);
        grad.addColorStop(1, "rgba(56, 189, 248, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      if (hoverStateRef.current.glowRight > 0.01) {
        const rightX = sidebarOffset + contentWidth * 0.68;
        const rightY = height * 0.50;
        const grad = ctx.createRadialGradient(rightX, rightY, 10, rightX, rightY, 280);
        grad.addColorStop(0, `rgba(140, 201, 210, ${0.09 * hoverStateRef.current.glowRight})`);
        grad.addColorStop(1, "rgba(140, 201, 210, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // ── Step C: Draw Distant Background Stars ─────────────────────────
      for (let s of distantStars) {
        if (!prefersReducedMotion) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0) s.x = width;
          if (s.x > width) s.x = 0;
          if (s.y < 0) s.y = height;
          if (s.y > height) s.y = 0;

          s.alpha = s.baseAlpha * (0.8 + 0.2 * Math.sin(time * s.twinkleSpeed + s.twinklePhase));
        }

        ctx.fillStyle = isLight
          ? (s.color === "#FFFFFF" || s.color === "#C8EEF3" ? "#0284C7" : "#64748B")
          : s.color;
        ctx.globalAlpha = isLight ? s.alpha * 0.75 : s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Step D: Giant 3D Sphere Mathematics & Projection ──────────────
      const R = currentRadius;
      // Camera perspective distance (D = 2.4 * R)
      const D = R * 2.4;

      // Mouse perspective bias (subtle tilt towards cursor)
      const mouse = mouseRef.current;
      if (mouse.active) {
        const targetYaw = ((mouse.x - cx) / width) * 0.07;
        const targetPitch = -((mouse.y - cy) / height) * 0.07;
        smoothYawBias += (targetYaw - smoothYawBias) * 0.04;
        smoothPitchBias += (targetPitch - smoothPitchBias) * 0.04;
      } else {
        smoothYawBias *= 0.96;
        smoothPitchBias *= 0.96;
      }

      // Extremely slow rotation: ~96 seconds per full rotation
      const rotSpeed = prefersReducedMotion ? 0 : (time * ((Math.PI * 2) / (96 * 60)) * speedMult);
      const totalYaw = rotSpeed + smoothYawBias;
      const basePitch = 0.22 + smoothPitchBias; // Fixed architectural tilt (~12.6 deg)

      const cosYaw = Math.cos(totalYaw);
      const sinYaw = Math.sin(totalYaw);
      const cosPitch = Math.cos(basePitch);
      const sinPitch = Math.sin(basePitch);

      // Rotation helper: rotate (x, y, z) by yaw around Y, then pitch around X
      const projectPoint3D = (x0: number, y0: number, z0: number) => {
        // Yaw around Y
        const x1 = x0 * cosYaw - z0 * sinYaw;
        const z1 = x0 * sinYaw + z0 * cosYaw;
        const y1 = y0;

        // Pitch around X
        const y2 = y1 * cosPitch - z1 * sinPitch;
        const z2 = y1 * sinPitch + z1 * cosPitch;
        const x2 = x1;

        // Perspective projection: P = D / (D - z2)
        const P = D / (D - z2);
        const sX = cx + x2 * P;
        const sY = cy + y2 * P;

        return { sX, sY, z: z2, P };
      };

      // ── Step E: Atmospheric Rim (Faint Spherical Silhouette Glow) ────
      // Reveals spherical curvature at limb without drawing an artificial border line
      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.08);
      rimGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
      rimGrad.addColorStop(0.85, "rgba(140, 201, 210, 0.065)");
      rimGrad.addColorStop(0.97, "rgba(56, 189, 248, 0.035)");
      rimGrad.addColorStop(1, "rgba(56, 189, 248, 0)");

      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
      ctx.fill();

      // ── Step F: 4 Giant Orbital Contours (Separated into Back & Front)
      // Rings wrap around the sphere: points with Z < 0 render behind, Z >= 0 render in front
      const backRingPoints: Array<Array<{ sX: number; sY: number; alpha: number }>> = [];
      const frontRingPoints: Array<Array<{ sX: number; sY: number; alpha: number }>> = [];

      for (let rIdx = 0; rIdx < orbitalRings.length; rIdx++) {
        const ring = orbitalRings[rIdx];
        const rRing = R * ring.radiusMult;
        const cosR = Math.cos(ring.pitch);
        const sinR = Math.sin(ring.pitch);
        const cosRoll = Math.cos(ring.roll);
        const sinRoll = Math.sin(ring.roll);

        const ringSpin = prefersReducedMotion ? 0 : time * ((Math.PI * 2) / (70 * 60)) * ring.speedMult;
        const steps = 72;
        const backPts: Array<{ sX: number; sY: number; alpha: number }> = [];
        const frontPts: Array<{ sX: number; sY: number; alpha: number }> = [];

        for (let i = 0; i <= steps; i++) {
          const theta = ringSpin + (i / steps) * Math.PI * 2;
          // Unrotated ring in X-Z plane
          const rx0 = Math.cos(theta) * rRing;
          const rz0 = Math.sin(theta) * rRing;
          const ry0 = 0;

          // Apply ring inclination
          const ry1 = ry0 * cosR - rz0 * sinR;
          const rz1 = ry0 * sinR + rz0 * cosR;
          const rx1 = rx0 * cosRoll - ry1 * sinRoll;
          const ry2 = rx0 * sinRoll + ry1 * cosRoll;

          // Project to screen with global sphere yaw/pitch
          const p = projectPoint3D(rx1, ry2, rz1);

          if (p.z < 0) {
            backPts.push({ sX: p.sX, sY: p.sY, alpha: Math.max(0.04, 0.12 * (1 + p.z / rRing)) });
          } else {
            frontPts.push({ sX: p.sX, sY: p.sY, alpha: 0.18 + 0.22 * (p.z / rRing) });
          }
        }
        backRingPoints.push(backPts);
        frontRingPoints.push(frontPts);
      }

      // Draw Back Ring Segments (Disappearing behind sphere)
      for (let rIdx = 0; rIdx < backRingPoints.length; rIdx++) {
        const pts = backRingPoints[rIdx];
        if (pts.length < 2) continue;
        ctx.strokeStyle = isLight ? "rgba(22, 119, 232, 0.12)" : orbitalRings[rIdx].color;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx.moveTo(pts[i].sX, pts[i].sY);
          else ctx.lineTo(pts[i].sX, pts[i].sY);
        }
        ctx.globalAlpha = isLight ? 0.35 : 0.45;
        ctx.stroke();
      }

      // ── Step G: Subtle Spherical Latitude Parallels ──────────────────
      // Technical horizontal contour curves following spherical curvature
      for (const lat of latitudeLevels) {
        const yCoord = lat * R;
        const latRadius = Math.sqrt(Math.max(0, R * R - yCoord * yCoord));
        const steps = 40;

        ctx.strokeStyle = isLight ? "rgba(22, 119, 232, 0.10)" : "rgba(140, 201, 210, 0.085)";
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        let started = false;

        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const x0 = Math.cos(theta) * latRadius;
          const z0 = Math.sin(theta) * latRadius;
          const p = projectPoint3D(x0, yCoord, z0);

          // Render only front-facing half of latitude curve for clean crisp readability
          if (p.z >= -R * 0.15) {
            if (!started) {
              ctx.moveTo(p.sX, p.sY);
              started = true;
            } else {
              ctx.lineTo(p.sX, p.sY);
            }
          } else {
            started = false;
          }
        }
        ctx.globalAlpha = isLight ? 0.45 : 0.7;
        ctx.stroke();
      }

      // ── Step H: 3D Spherical Particle Field Rendering ────────────────
      // Scanning arc longitude angle (~20 seconds per rotation)
      const scanPeriod = 20 * 60;
      const scanLongitude = prefersReducedMotion
        ? 0.5
        : ((time * ((Math.PI * 2) / scanPeriod) * speedMult) % (Math.PI * 2));

      // Central core pulse (heartbeat rhythm ~3.5s)
      const pulseTime = time * ((Math.PI * 2) / (3.5 * 60));
      const corePulse = 0.5 + 0.5 * Math.sin(pulseTime);

      for (let pt of sphereParticles) {
        const rActual = pt.rNorm * R;
        const x0 = pt.uX * rActual;
        const y0 = pt.uY * rActual;
        const z0 = pt.uZ * rActual;

        // Project with 3D rotation
        const p = projectPoint3D(x0, y0, z0);

        // Normalized depth in [-1, +1]
        const zNorm = p.z / R;

        // Cursor repel interaction
        if (mouse.active) {
          const dx = p.sX - mouse.x;
          const dy = p.sY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140 && dist > 0.1) {
            const push = (1 - dist / 140) * 12 * (zNorm > 0 ? 1.0 : 0.4);
            pt.targetOffX = (dx / dist) * push;
            pt.targetOffY = (dy / dist) * push;
          }
        }

        // Spring damping back to orbit
        pt.offX += (pt.targetOffX - pt.offX) * 0.08;
        pt.offY += (pt.targetOffY - pt.offY) * 0.08;
        pt.targetOffX *= 0.93;
        pt.targetOffY *= 0.93;

        const screenX = p.sX + pt.offX;
        const screenY = p.sY + pt.offY;

        // Depth shading:
        // Front hemisphere (zNorm > 0): bright, clear, volumetric
        // Back hemisphere (zNorm < 0): faint, embedded in darkness
        let alpha = 0;
        if (zNorm >= 0) {
          alpha = pt.baseAlpha * (0.35 + 0.65 * Math.pow(zNorm, 1.15));
        } else {
          alpha = pt.baseAlpha * 0.14 * Math.max(0, 1 + zNorm);
        }

        // Central region density boost (Requirement 6)
        if (!pt.isCore) {
          const distFromScreenCenter = Math.sqrt((screenX - cx) ** 2 + (screenY - cy) ** 2) / R;
          if (distFromScreenCenter < 0.42) {
            alpha *= 1 + (1 - distFromScreenCenter / 0.42) * 0.35;
          }
        } else {
          // Core particle: heartbeat pulse
          alpha *= 1 + corePulse * 0.45 + (hoveredCardRef.current === "offline" ? 0.35 : 0);
        }

        // Scanning arc longitude response (Requirement 14)
        const particleLon = Math.atan2(pt.uZ, pt.uX) + Math.PI; // [0, 2*PI]
        let lonDiff = (scanLongitude - particleLon) % (Math.PI * 2);
        if (lonDiff < 0) lonDiff += Math.PI * 2;

        if (lonDiff < 0.42 && zNorm > -0.2) {
          const scanBoost = Math.pow(1 - lonDiff / 0.42, 2) * 0.42;
          alpha += scanBoost;
        }

        // Size scaled by perspective
        const renderRadius = Math.max(0.65, pt.baseSize * p.P * (zNorm > 0.5 ? 1.15 : 0.9));

        if (isLight) {
          ctx.fillStyle = alpha > 0.60
            ? "#4BA3FF"
            : alpha > 0.35
            ? "#8FA8BE"
            : "#B7C6D5";
          ctx.globalAlpha = Math.min(0.55, Math.max(0.18, alpha * 0.85));
        } else {
          ctx.fillStyle = alpha > 0.65 ? "#FFFFFF" : pt.color;
          ctx.globalAlpha = Math.min(0.9, alpha);
        }
        ctx.beginPath();
        ctx.arc(screenX, screenY, renderRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle soft blue aura on closest luminous crest particles
        if (zNorm > 0.6 && alpha > 0.6) {
          ctx.fillStyle = isLight ? "rgba(22, 119, 232, 0.12)" : "rgba(56, 189, 248, 0.20)";
          ctx.beginPath();
          ctx.arc(screenX, screenY, renderRadius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Step I: Draw Front Orbital Ring Segments (Passing in front) ──
      for (let rIdx = 0; rIdx < frontRingPoints.length; rIdx++) {
        const pts = frontRingPoints[rIdx];
        if (pts.length < 2) continue;
        const ring = orbitalRings[rIdx];

        ctx.strokeStyle = isLight ? "rgba(22, 119, 232, 0.15)" : ring.color;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx.moveTo(pts[i].sX, pts[i].sY);
          else ctx.lineTo(pts[i].sX, pts[i].sY);
        }
        ctx.globalAlpha = isLight ? 0.65 : 0.85;
        ctx.stroke();

        // Render delicate tick marks at key points on the front ring
        if (pts.length > 8) {
          ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.40)" : "rgba(200, 240, 248, 0.45)";
          for (let k = 0; k < pts.length; k += Math.floor(pts.length / 6)) {
            ctx.beginPath();
            ctx.arc(pts[k].sX, pts[k].sY, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ── Step J: Subtle Central Computational Core ─────────────────────
      // Technical reticle crosshair at center of sphere (Requirement 13)
      ctx.strokeStyle = isLight
        ? `rgba(2, 132, 199, ${0.26 + corePulse * 0.14})`
        : `rgba(180, 225, 235, ${0.18 + corePulse * 0.12})`;
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 1.0;
      // Horizontal ticks
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx - 6, cy);
      ctx.moveTo(cx + 6, cy);
      ctx.lineTo(cx + 18, cy);
      // Vertical ticks
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy - 6);
      ctx.moveTo(cx, cy + 6);
      ctx.lineTo(cx, cy + 18);
      ctx.stroke();

      // Micro central heartbeat glow
      const coreAura = ctx.createRadialGradient(cx, cy, 1, cx, cy, 24);
      coreAura.addColorStop(0, `rgba(56, 189, 248, ${0.28 + corePulse * 0.20})`);
      coreAura.addColorStop(0.5, "rgba(140, 201, 210, 0.08)");
      coreAura.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = coreAura;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      time += 1;

      if (!prefersReducedMotion) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render();
    } else {
      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`cinematic-space-bg ${className}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 62, // directly beneath topbar
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
