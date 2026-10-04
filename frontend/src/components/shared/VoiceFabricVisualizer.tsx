import React, { useEffect, useRef, useState } from "react";

interface VoiceFabricVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  isPaused: boolean;
  height?: number;
  className?: string;
}

export function VoiceFabricVisualizer({
  stream,
  isRecording,
  isPaused,
  height = 240,
  className = "",
}: VoiceFabricVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meterFillRef = useRef<HTMLDivElement>(null);
  const meterDbRef = useRef<HTMLSpanElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Smoothed state arrays stored in refs to avoid React re-renders during 60fps loop
  const columnCount = 64;
  const smoothedHeightsRef = useRef<Float32Array>(new Float32Array(columnCount));
  const smoothedRmsRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Ambient floating particles
  const ambientParticlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }>
  >([]);

  // Initialize ambient micro-particles once
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 28; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0006,
        vy: (Math.random() - 0.5) * 0.0008,
        size: Math.random() * 1.5 + 0.8,
        alpha: Math.random() * 0.4 + 0.15,
      });
    }
    ambientParticlesRef.current = particles;
  }, []);

  // Setup Web Audio API when stream is available
  useEffect(() => {
    if (!stream) {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const ctx = audioCtxRef.current || new AudioCtxClass();
      audioCtxRef.current = ctx;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (err) {
      console.warn("AudioContext initialization warning:", err);
    }

    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    };
  }, [stream]);

  // Clean up AudioContext completely on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Main 60fps Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const freqBuffer = new Uint8Array(128);
    const timeBuffer = new Uint8Array(256);

    const render = () => {
      if (!running) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 640;
      const h = height;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Adaptive canvas background
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      ctx.fillStyle = isLight ? "#F6F8FA" : "#06090D";
      ctx.fillRect(0, 0, width, h);

      // Subtle ambient vignette glow behind the waveform
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        h / 2,
        10,
        width / 2,
        h / 2,
        Math.max(width / 2, 200)
      );
      if (isLight) {
        bgGrad.addColorStop(0, "rgba(56, 189, 248, 0.08)");
        bgGrad.addColorStop(0.5, "rgba(140, 201, 210, 0.03)");
        bgGrad.addColorStop(1, "rgba(246, 248, 250, 0)");
      } else {
        bgGrad.addColorStop(0, "rgba(56, 189, 248, 0.06)");
        bgGrad.addColorStop(0.5, "rgba(140, 201, 210, 0.02)");
        bgGrad.addColorStop(1, "rgba(6, 9, 13, 0)");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, h);

      // Acquire audio data
      let currentRms = 0;
      const analyser = analyserRef.current;
      const activeAudio = isRecording && !isPaused && !!analyser;

      if (activeAudio) {
        analyser.getByteFrequencyData(freqBuffer);
        analyser.getByteTimeDomainData(timeBuffer);

        // Compute RMS volume
        let sumSquares = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          const norm = (timeBuffer[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        currentRms = Math.sqrt(sumSquares / timeBuffer.length);
      }

      // Smooth RMS
      const targetRms = activeAudio ? currentRms : 0;
      smoothedRmsRef.current += (targetRms - smoothedRmsRef.current) * 0.18;
      const smoothedRms = smoothedRmsRef.current;

      // Update external meter elements without React re-render
      if (meterFillRef.current) {
        const percent = Math.min(100, Math.max(0, Math.round(smoothedRms * 280)));
        meterFillRef.current.style.width = `${percent}%`;
        meterFillRef.current.style.backgroundColor =
          percent > 85 ? "#F59E0B" : percent > 45 ? "#38BDF8" : "#8CC9D2";
      }
      if (meterDbRef.current) {
        if (activeAudio && smoothedRms > 0.005) {
          const db = Math.round(20 * Math.log10(Math.max(smoothedRms, 0.001)));
          meterDbRef.current.textContent = `${db} dB`;
        } else {
          meterDbRef.current.textContent = isPaused ? "PAUSED" : "-∞ dB";
        }
      }

      // Time progression
      const timeSpeed = isPaused ? 0.003 : activeAudio ? 0.028 : 0.012;
      timeRef.current += timeSpeed;
      const t = timeRef.current;

      // Render floating ambient micro-particles
      const particles = ambientParticlesRef.current;
      ctx.fillStyle = isLight ? "#0284C7" : "#8CC9D2";
      for (let p of particles) {
        p.x += p.vx * (1 + smoothedRms * 3);
        p.y += p.vy * (1 + smoothedRms * 3);
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        const px = p.x * width;
        const py = p.y * h;
        const alpha = p.alpha * (0.3 + smoothedRms * 1.5);
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Voice Waveform & Particle Fabric calculations
      const centerY = h / 2;
      const smoothedHeights = smoothedHeightsRef.current;
      const topPoints: Array<{ x: number; y: number }> = [];
      const bottomPoints: Array<{ x: number; y: number }> = [];
      const columnPoints: Array<Array<{ x: number; y: number; alpha: number; isNode: boolean }>> = [];

      const marginX = Math.max(30, width * 0.05);
      const usableWidth = width - marginX * 2;
      const colSpacing = usableWidth / (columnCount - 1);

      for (let i = 0; i < columnCount; i++) {
        const x = marginX + i * colSpacing;
        // Normalized coordinate [-1, 1] relative to center
        const normX = ((i / (columnCount - 1)) - 0.5) * 2;
        // Gaussian window envelope so edges taper gracefully
        const envelope = Math.exp(-3.2 * normX * normX);

        // Map column to frequency bins: speech energy sits prominently around bins 4-48
        // Mirror frequencies symmetrically around the center for visual elegance
        const distFromCenter = Math.abs(normX);
        const binIndex = Math.min(
          60,
          Math.max(2, Math.floor((1 - distFromCenter) * 44 + 4))
        );
        const rawFreq = activeAudio ? (freqBuffer[binIndex] || 0) / 255 : 0;

        // Target height combining frequency response, RMS volume, and baseline organic drift
        const voiceBoost = rawFreq * 0.7 + smoothedRms * 0.8;
        const targetAmp = activeAudio
          ? envelope * (6 + voiceBoost * (h * 0.42))
          : envelope * (4 + Math.sin(t * 1.6 + i * 0.25) * 2.5);

        // Smooth interpolation
        smoothedHeights[i] += (targetAmp - smoothedHeights[i]) * 0.22;
        const currentAmp = smoothedHeights[i];

        // Organic harmonic ripple
        const organicRipple =
          Math.sin(t * 2.2 + i * 0.28) * (2 + smoothedRms * 6) +
          Math.cos(t * 1.4 + normX * 3.5) * (1.5 + smoothedRms * 4);

        const halfHeight = Math.max(4, currentAmp + organicRipple);
        const topY = centerY - halfHeight;
        const botY = centerY + halfHeight;

        topPoints.push({ x, y: topY });
        bottomPoints.push({ x, y: botY });

        // Generate 7 vertical nodes per column for the space-time fabric
        const nodes: Array<{ x: number; y: number; alpha: number; isNode: boolean }> = [];
        const nodeFractions = [-1.0, -0.66, -0.33, 0.0, 0.33, 0.66, 1.0];

        for (const frac of nodeFractions) {
          const nodeY = centerY + frac * halfHeight;
          const nodeAlpha = Math.min(
            1,
            Math.max(
              0.15,
              (1 - Math.abs(frac) * 0.35) * (0.35 + smoothedRms * 1.6) * envelope
            )
          );
          nodes.push({
            x,
            y: nodeY,
            alpha: nodeAlpha,
            isNode: Math.abs(frac) === 1.0 || frac === 0.0 || Math.abs(frac) === 0.66,
          });
        }
        columnPoints.push(nodes);
      }

      // ── Step 1: Draw translucent glowing area between top and bottom contours
      if (topPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].y);
        for (let i = 1; i < topPoints.length; i++) {
          const prev = topPoints[i - 1];
          const curr = topPoints[i];
          const mx = (prev.x + curr.x) / 2;
          const my = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
        ctx.lineTo(topPoints[topPoints.length - 1].x, topPoints[topPoints.length - 1].y);

        for (let i = bottomPoints.length - 1; i >= 0; i--) {
          const curr = bottomPoints[i];
          if (i === bottomPoints.length - 1) {
            ctx.lineTo(curr.x, curr.y);
          } else {
            const next = bottomPoints[i + 1];
            const mx = (next.x + curr.x) / 2;
            const my = (next.y + curr.y) / 2;
            ctx.quadraticCurveTo(next.x, next.y, mx, my);
          }
        }
        ctx.closePath();

        const fabricGrad = ctx.createLinearGradient(0, centerY - h * 0.45, 0, centerY + h * 0.45);
        fabricGrad.addColorStop(0, "rgba(56, 189, 248, 0.08)");
        fabricGrad.addColorStop(0.5, "rgba(140, 201, 210, 0.025)");
        fabricGrad.addColorStop(1, "rgba(56, 189, 248, 0.08)");
        ctx.fillStyle = fabricGrad;
        ctx.fill();
      }

      // ── Step 2: Draw vertical wave filaments (columns connecting nodes)
      for (let i = 0; i < columnPoints.length; i++) {
        const nodes = columnPoints[i];
        if (nodes.length < 2) continue;

        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const colAlpha = Math.min(1, Math.max(0.12, (0.2 + smoothedRms * 1.2) * (1 - Math.abs((i / columnCount) - 0.5) * 1.4)));

        ctx.strokeStyle = isLight
          ? `rgba(2, 132, 199, ${colAlpha * 0.55})`
          : `rgba(140, 201, 210, ${colAlpha * 0.45})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }

      // ── Step 3: Draw horizontal structural mesh lines connecting adjacent columns at key levels
      const levelIndices = [0, 2, 3, 4, 6]; // Top, upper mid, center, lower mid, bottom
      for (const levelIdx of levelIndices) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < columnPoints.length; i++) {
          const pt = columnPoints[i][levelIdx];
          if (!pt) continue;
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            const prev = columnPoints[i - 1][levelIdx];
            const mx = (prev.x + pt.x) / 2;
            const my = (prev.y + pt.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
          }
        }
        const isCenter = levelIdx === 3;
        const lineAlpha = isCenter ? 0.35 + smoothedRms * 0.45 : 0.2 + smoothedRms * 0.3;
        ctx.strokeStyle = isCenter
          ? (isLight ? `rgba(2, 132, 199, ${Math.min(0.9, lineAlpha)})` : `rgba(56, 189, 248, ${Math.min(0.8, lineAlpha)})`)
          : (isLight ? `rgba(14, 165, 233, ${Math.min(0.6, lineAlpha)})` : `rgba(140, 201, 210, ${Math.min(0.5, lineAlpha)})`);
        ctx.lineWidth = isCenter ? 1.1 : 0.75;
        ctx.stroke();
      }

      // ── Step 4: Draw luminous particles at nodes
      for (let i = 0; i < columnPoints.length; i++) {
        const nodes = columnPoints[i];
        for (const pt of nodes) {
          if (!pt.isNode) continue;

          const energy = smoothedRms * 2;
          const radius = (pt.alpha > 0.6 ? 1.8 : 1.2) + energy * 0.6;

          // Subtle cyan halo
          if (pt.alpha > 0.4) {
            ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.20)" : "rgba(56, 189, 248, 0.25)";
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius * 2.2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Crisp luminous node core
          ctx.fillStyle = isLight
            ? (pt.alpha > 0.6 ? "#0284C7" : "#0369A1")
            : (pt.alpha > 0.6 ? "#FFFFFF" : "#C8EEF3");
          ctx.globalAlpha = Math.min(1, pt.alpha * 1.3);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, isPaused, height]);

  return (
    <div
      ref={containerRef}
      className={`voice-fabric-visualizer-wrap ${className}`}
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        userSelect: "none",
      }}
    >
      {/* ── Main Canvas Viewport ────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(140, 201, 210, 0.2)",
          boxShadow: isRecording && !isPaused
            ? "0 0 35px rgba(56, 189, 248, 0.15), inset 0 0 30px rgba(6, 9, 13, 0.95)"
            : "0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(6, 9, 13, 0.95)",
          background: "#06090D",
          transition: "box-shadow 0.4s ease, border-color 0.4s ease",
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

        {/* Ambient Top Badges */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--card)",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isRecording
                  ? isPaused
                    ? "var(--warning)"
                    : "var(--danger)"
                  : "var(--primary)",
                boxShadow: isRecording && !isPaused
                  ? "0 0 10px rgba(239, 68, 68, 0.5)"
                  : isPaused
                    ? "0 0 8px rgba(245, 158, 11, 0.5)"
                    : "none",
                animation: isRecording && !isPaused ? "pulse 1.8s infinite" : "none",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: isRecording
                  ? isPaused
                    ? "var(--warning-text)"
                    : "var(--danger-text)"
                  : "var(--primary)",
              }}
            >
              {isRecording
                ? isPaused
                  ? "RECORDING PAUSED"
                  : "LIVE VOICE STREAM"
                : "ACOUSTIC STANDBY"}
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--card)",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backdropFilter: "blur(8px)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
            }}
          >
            <span>DSP · 64 FILAMENTS</span>
          </div>
        </div>
      </div>

      {/* ── Real-Time Microphone Input Level Meter (Subtle Horizontal Bar) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 14px",
          borderRadius: 8,
          background: "var(--navy-soft)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--primary)",
            whiteSpace: "nowrap",
          }}
        >
          MIC INPUT
        </span>

        {/* Level Track with Gradient Fill */}
        <div
          style={{
            flex: 1,
            height: 5,
            background: "var(--border)",
            borderRadius: 3,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            ref={meterFillRef}
            style={{
              width: "0%",
              height: "100%",
              background: "var(--primary)",
              borderRadius: 3,
              transition: "width 0.06s ease, background-color 0.15s ease",
            }}
          />
        </div>

        {/* Live Decibel Readout */}
        <span
          ref={meterDbRef}
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            minWidth: 46,
            textAlign: "right",
          }}
        >
          -∞ dB
        </span>
      </div>
    </div>
  );
}
