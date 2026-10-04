import React, { useEffect, useRef } from "react";

interface DealsIntelligenceBackgroundProps {
  hoveredDealId?: string | null;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  color: string;
  depth: 0 | 1 | 2; // 0 = background, 1 = mid, 2 = foreground
  offX: number;
  offY: number;
  targetOffX: number;
  targetOffY: number;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  connections: number[];
}

interface DataPulse {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  active: boolean;
  cooldown: number;
}

interface FlowCurve {
  points: Array<{ x: number; y: number }>;
  alpha: number;
  width: number;
}

export function DealsIntelligenceBackground({
  hoveredDealId = null,
  className = "",
}: DealsIntelligenceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -2000,
    y: -2000,
    active: false,
  });

  const hoveredDealRef = useRef<string | null>(hoveredDealId);
  useEffect(() => {
    hoveredDealRef.current = hoveredDealId;
  }, [hoveredDealId]);

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

    // ── 1. Initialize Particles (180–240 count across 3 depths) ────────
    const particleCount = width < 768 ? 90 : width < 1200 ? 150 : 210;
    const particles: Particle[] = [];

    const getPalette = (isLight: boolean) => {
      if (isLight) {
        return {
          bg: ["#0284C7", "#0369A1", "#64748B", "#0284C7"],
          mid: ["#0284C7", "#0EA5E9", "#38BDF8"],
          fore: ["#0284C7", "#0369A1"],
        };
      }
      return {
        bg: ["#FFFFFF", "#C8EEF3", "#94A3B8", "#8CC9D2"],
        mid: ["#8CC9D2", "#C8EEF3", "#38BDF8"],
        fore: ["#FFFFFF", "#E0F2FE"],
      };
    };

    for (let i = 0; i < particleCount; i++) {
      const depthVal: 0 | 1 | 2 = i < particleCount * 0.45 ? 0 : i < particleCount * 0.82 ? 1 : 2;
      const size =
        depthVal === 0
          ? 0.7 + Math.random() * 0.5
          : depthVal === 1
          ? 1.0 + Math.random() * 0.6
          : 1.4 + Math.random() * 0.7;

      const baseAlpha =
        depthVal === 0
          ? 0.05 + Math.random() * 0.07
          : depthVal === 1
          ? 0.08 + Math.random() * 0.09
          : 0.12 + Math.random() * 0.10;

      const speedFactor = depthVal === 0 ? 0.08 : depthVal === 1 ? 0.14 : 0.22;
      const vx = (Math.random() - 0.5) * speedFactor;
      const vy = (Math.random() - 0.5) * speedFactor;

      // Keep title area (top-left: x < 0.38, y < 0.30) calmer by biasing distribution slightly
      let x = Math.random() * width;
      let y = Math.random() * height;
      if (x < width * 0.35 && y < height * 0.28 && Math.random() > 0.25) {
        x = width * 0.35 + Math.random() * (width * 0.65);
      }

      particles.push({
        x,
        y,
        vx,
        vy,
        size,
        baseAlpha,
        alpha: baseAlpha,
        color: "#C8EEF3",
        depth: depthVal,
        offX: 0,
        offY: 0,
        targetOffX: 0,
        targetOffY: 0,
      });
    }

    // ── 2. Initialize Sparse Deal Intelligence Network (18–24 Nodes) ────
    // Structured primarily on the right side and lower-middle
    const nodeCount = width < 768 ? 10 : 20;
    const nodes: NetworkNode[] = [];

    for (let i = 0; i < nodeCount; i++) {
      // Clustered across right side (0.42 to 0.94) and mid-lower (0.24 to 0.88)
      const nx = width * (0.42 + Math.random() * 0.52);
      const ny = height * (0.22 + Math.random() * 0.68);
      nodes.push({
        x: nx,
        y: ny,
        baseX: nx,
        baseY: ny,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        radius: 1.6 + Math.random() * 1.4,
        alpha: 0.16 + Math.random() * 0.18,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        connections: [],
      });
    }

    // Create sparse, deliberate relationships (max 2-3 links per node within distance threshold)
    const maxLinkDist = width < 768 ? 120 : 180;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (
          dist < maxLinkDist &&
          nodes[i].connections.length < 3 &&
          nodes[j].connections.length < 3
        ) {
          nodes[i].connections.push(j);
          nodes[j].connections.push(i);
        }
      }
    }

    // ── 3. Data Pulses Traveling Along Network Connections ───────────────
    const pulses: DataPulse[] = [];
    const pulseCount = 3;
    for (let p = 0; p < pulseCount; p++) {
      // Pick random node with connections
      const connectedNodes = nodes
        .map((n, idx) => ({ n, idx }))
        .filter((item) => item.n.connections.length > 0);

      if (connectedNodes.length > 0) {
        const pick = connectedNodes[Math.floor(Math.random() * connectedNodes.length)];
        const to = pick.n.connections[Math.floor(Math.random() * pick.n.connections.length)];
        pulses.push({
          fromNode: pick.idx,
          toNode: to,
          progress: Math.random(),
          speed: 0.0028 + Math.random() * 0.0025,
          active: true,
          cooldown: 0,
        });
      }
    }

    // ── 4. Deal Flow Visualization Paths (Curved Splines) ───────────────
    // Flowing from left/center towards the contract cluster on the right
    const generateFlowCurves = (): FlowCurve[] => {
      const curves: FlowCurve[] = [];
      const count = 4;
      for (let k = 0; k < count; k++) {
        const startY = height * (0.28 + k * 0.16);
        const midY1 = startY + (Math.sin(k * 1.5) * 60 - 20);
        const midY2 = startY + (Math.cos(k * 1.8) * 80 + 30);
        const endY = height * (0.35 + k * 0.15);

        curves.push({
          points: [
            { x: width * 0.18, y: startY },
            { x: width * 0.42, y: midY1 },
            { x: width * 0.68, y: midY2 },
            { x: width * 0.94, y: endY },
          ],
          alpha: 0.045 + k * 0.015,
          width: 0.75 + (k % 2) * 0.35,
        });
      }
      return curves;
    };
    let flowCurves = generateFlowCurves();

    // ── 5. Mouse Interaction Tracking ──────────────────────────────────
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
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      flowCurves = generateFlowCurves();
    };

    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);
    resizeCanvas();

    // ── 6. 60fps Animation Render Loop ──────────────────────────────────
    let time = 0;
    let running = true;

    const render = () => {
      if (!running) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear canvas cleanly
      ctx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const palette = getPalette(isLight);

      // ── Step A: Large Atmospheric Computational Glow ──────────────────
      // Positioned around center-right (0.65 width, 0.52 height)
      const glowCx = width * 0.64;
      const glowCy = height * 0.52;
      const glowRadius = Math.max(width * 0.65, 650);

      const atmGlow = ctx.createRadialGradient(
        glowCx,
        glowCy,
        30,
        glowCx,
        glowCy,
        glowRadius
      );
      if (isLight) {
        atmGlow.addColorStop(0, "rgba(56, 189, 248, 0.055)");
        atmGlow.addColorStop(0.45, "rgba(140, 201, 210, 0.02)");
        atmGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      } else {
        atmGlow.addColorStop(0, "rgba(14, 28, 52, 0.22)");
        atmGlow.addColorStop(0.5, "rgba(8, 16, 32, 0.10)");
        atmGlow.addColorStop(1, "rgba(4, 6, 8, 0)");
      }
      ctx.fillStyle = atmGlow;
      ctx.fillRect(0, 0, width, height);

      // ── Step B: Giant Probe Connection Arc (10–15% Far-Background Arc) ─
      // Faint concentric orbital curve echoing ARMOR's spherical sensor
      const probeArcCx = width * 0.98;
      const probeArcCy = height * 0.88;
      const probeArcRadius = Math.max(width, height) * 0.85;

      ctx.save();
      ctx.beginPath();
      // Draw 35-degree segment pointing towards middle of screen
      const arcStart = Math.PI * 0.95;
      const arcEnd = Math.PI * 1.25;
      ctx.arc(probeArcCx, probeArcCy, probeArcRadius, arcStart, arcEnd);
      ctx.strokeStyle = isLight ? "rgba(2, 132, 199, 0.09)" : "rgba(140, 201, 210, 0.08)";
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // Second nested concentric arc
      ctx.beginPath();
      ctx.arc(probeArcCx, probeArcCy, probeArcRadius * 1.03, arcStart + 0.04, arcEnd - 0.03);
      ctx.strokeStyle = isLight ? "rgba(2, 132, 199, 0.05)" : "rgba(56, 189, 248, 0.05)";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Subtle tick markers along the primary arc
      const tickCount = 6;
      ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.20)" : "rgba(180, 230, 240, 0.22)";
      for (let tk = 0; tk <= tickCount; tk++) {
        const theta = arcStart + (tk / tickCount) * (arcEnd - arcStart);
        const tx = probeArcCx + Math.cos(theta) * probeArcRadius;
        const ty = probeArcCy + Math.sin(theta) * probeArcRadius;
        ctx.beginPath();
        ctx.arc(tx, ty, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ── Step C: Low-Frequency Particle Waves (Space-Time Fabric) ───────
      // 2–3 broad, slow, organic wave lines flowing across the bottom
      const waveCount = 3;
      for (let w = 0; w < waveCount; w++) {
        const waveBaseY = height * (0.68 + w * 0.11);
        const waveAmp = 14 + w * 6;
        const waveFreq = 0.0022 - w * 0.0004;
        const wavePhase = time * (0.008 - w * 0.002) + w * 2.1;

        ctx.beginPath();
        let first = true;
        const waveSteps = Math.floor(width / 24);
        for (let s = 0; s <= waveSteps; s++) {
          const wx = (s / waveSteps) * width;
          // Organic modulation
          const wy =
            waveBaseY +
            Math.sin(wx * waveFreq + wavePhase) * waveAmp +
            Math.cos(wx * (waveFreq * 1.6) - wavePhase * 0.8) * (waveAmp * 0.35);

          if (first) {
            ctx.moveTo(wx, wy);
            first = false;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.strokeStyle = isLight
          ? `rgba(2, 132, 199, ${0.055 - w * 0.012})`
          : `rgba(140, 201, 210, ${0.065 - w * 0.015})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // ── Step D: Deal Flow Visualization Paths (Curved Splines) ─────────
      for (let fc of flowCurves) {
        ctx.beginPath();
        ctx.moveTo(fc.points[0].x, fc.points[0].y);
        ctx.bezierCurveTo(
          fc.points[1].x,
          fc.points[1].y,
          fc.points[2].x,
          fc.points[2].y,
          fc.points[3].x,
          fc.points[3].y
        );
        ctx.strokeStyle = isLight
          ? `rgba(2, 132, 199, ${fc.alpha * 1.1})`
          : `rgba(56, 189, 248, ${fc.alpha})`;
        ctx.lineWidth = fc.width;
        ctx.stroke();
      }

      // ── Step E: Deal Intelligence Network Lines & Nodes ────────────────
      // Update nodes slow drift & cursor response
      const mouse = mouseRef.current;
      for (let n of nodes) {
        if (!prefersReducedMotion) {
          n.x += n.vx;
          n.y += n.vy;
          // Soft boundary return
          if (n.x < n.baseX - 40 || n.x > n.baseX + 40) n.vx *= -1;
          if (n.y < n.baseY - 40 || n.y > n.baseY + 40) n.vy *= -1;
        }

        // Slight cursor push
        if (mouse.active) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130 && dist > 0.1) {
            const push = (1 - dist / 130) * 4;
            n.x += (dx / dist) * push * 0.06;
            n.y += (dy / dist) * push * 0.06;
          }
        }
      }

      // Draw Connection Lines between nodes
      ctx.save();
      for (let i = 0; i < nodes.length; i++) {
        const na = nodes[i];
        for (let j of na.connections) {
          if (j > i) {
            const nb = nodes[j];
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.strokeStyle = isLight
              ? "rgba(2, 132, 199, 0.11)"
              : "rgba(140, 201, 210, 0.095)";
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Draw Network Nodes
      for (let n of nodes) {
        n.pulsePhase += n.pulseSpeed;
        const pulse = 0.5 + 0.5 * Math.sin(n.pulsePhase);
        const r = n.radius * (0.95 + pulse * 0.18);
        const alpha = n.alpha * (0.8 + pulse * 0.35);

        // Soft halo on nodes
        ctx.fillStyle = isLight
          ? `rgba(2, 132, 199, ${alpha * 0.4})`
          : `rgba(56, 189, 248, ${alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Solid core
        ctx.fillStyle = isLight ? "#0284C7" : alpha > 0.25 ? "#FFFFFF" : "#C8EEF3";
        ctx.globalAlpha = Math.min(0.85, alpha * 1.5);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // ── Step F: Occasional Traveling Data Pulses ────────────────────────
      for (let p of pulses) {
        if (!p.active) {
          p.cooldown -= 1;
          if (p.cooldown <= 0) {
            // Pick a new random connection
            const fromN = nodes[p.fromNode];
            if (fromN.connections.length > 0) {
              p.toNode = fromN.connections[Math.floor(Math.random() * fromN.connections.length)];
              p.progress = 0;
              p.active = true;
            }
          }
          continue;
        }

        if (!prefersReducedMotion) {
          p.progress += p.speed;
        }

        if (p.progress >= 1) {
          p.active = false;
          p.fromNode = p.toNode;
          p.cooldown = 40 + Math.floor(Math.random() * 80);
          continue;
        }

        const na = nodes[p.fromNode];
        const nb = nodes[p.toNode];
        if (na && nb) {
          const px = na.x + (nb.x - na.x) * p.progress;
          const py = na.y + (nb.y - na.y) * p.progress;

          // Pulse glow
          ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.35)" : "rgba(56, 189, 248, 0.45)";
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Pulse bright head
          ctx.fillStyle = isLight ? "#0284C7" : "#FFFFFF";
          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Step G: Primary Background Particle Field ─────────────────────
      for (let pt of particles) {
        if (!prefersReducedMotion) {
          pt.x += pt.vx;
          pt.y += pt.vy;
          if (pt.x < 0) pt.x = width;
          if (pt.x > width) pt.x = 0;
          if (pt.y < 0) pt.y = height;
          if (pt.y > height) pt.y = 0;
        }

        // Cursor repel interaction
        if (mouse.active) {
          const dx = pt.x - mouse.x;
          const dy = pt.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110 && dist > 0.1) {
            const push = (1 - dist / 110) * 8 * (pt.depth === 2 ? 1.0 : pt.depth === 1 ? 0.7 : 0.4);
            pt.targetOffX = (dx / dist) * push;
            pt.targetOffY = (dy / dist) * push;
          }
        }

        pt.offX += (pt.targetOffX - pt.offX) * 0.08;
        pt.offY += (pt.targetOffY - pt.offY) * 0.08;
        pt.targetOffX *= 0.94;
        pt.targetOffY *= 0.94;

        const px = pt.x + pt.offX;
        const py = pt.y + pt.offY;

        let alpha = pt.baseAlpha;
        // Subtle twinkle
        alpha *= 0.85 + 0.15 * Math.sin(time * 0.02 + pt.x);

        ctx.fillStyle = isLight
          ? pt.depth === 2
            ? "#0284C7"
            : pt.depth === 1
            ? "#0EA5E9"
            : "#64748B"
          : pt.depth === 2
          ? "#FFFFFF"
          : pt.depth === 1
          ? "#C8EEF3"
          : "#8CC9D2";

        ctx.globalAlpha = Math.min(0.85, alpha);
        ctx.beginPath();
        ctx.arc(px, py, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

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
      className={`deals-intelligence-bg ${className}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 62,
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
