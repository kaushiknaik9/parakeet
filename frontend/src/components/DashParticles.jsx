import React, { useEffect, useRef } from 'react';

/**
 * DashParticles
 * Replicates a "dash/speed-line" particle cluster radiating from the bottom-right,
 * with cursor interactivity (parallax + repulsion).
 */
export const DashParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    // Mouse tracking for interaction
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    
    const onMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener('mousemove', onMouseMove);

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    const COUNT = 220;
    
    // Generate particles
    const pts = Array.from({ length: COUNT }, () => {
      return {
        // Base random position spread across an area larger than screen
        x: Math.random() * canvas.width * 1.5 - canvas.width * 0.2,
        y: Math.random() * canvas.height * 1.5 - canvas.height * 0.2,
        
        // Base angle for the dash orientation (approx -135 degrees, going top-left)
        baseAngle: (Math.random() * -30 - 120) * (Math.PI / 180),
        
        // Physics
        vx: 0,
        vy: 0,
        
        // Depth determines size and parallax amount
        depth: Math.random() * 0.8 + 0.2,
        
        length: Math.random() * 8 + 4,
        thickness: Math.random() * 1.8 + 0.5,
        baseOpacity: Math.random() * 0.7 + 0.1,
      };
    });

    const isLightMode = () => document.querySelector('.light') !== null;
    const isVoidMode = () => document.querySelector('.void') !== null;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth mouse follow for parallax
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Global parallax offset derived from mouse distance to center
      const parallaxX = (mouse.x - centerX) * -0.05;
      const parallaxY = (mouse.y - centerY) * -0.05;

      const light = isLightMode();
      const voidM = isVoidMode();

      let baseR = 230, baseG = 203, baseB = 168; // Warm default
      if (voidM) {
         baseR = 99; baseG = 102; baseB = 241; // Indigo
      } else if (light) {
         baseR = 15; baseG = 23; baseB = 42; // Slate
      }

      for (const p of pts) {
        // Natural drift towards top-left
        const driftSpeed = p.depth * 0.8;
        p.x += Math.cos(p.baseAngle) * driftSpeed;
        p.y += Math.sin(p.baseAngle) * driftSpeed;

        // Repulsion from mouse cursor
        const dx = (p.x + parallaxX * p.depth * 10) - mouse.x;
        const dy = (p.y + parallaxY * p.depth * 10) - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const repulseRadius = 160;
        if (dist < repulseRadius && dist > 0) {
          const force = (repulseRadius - dist) / repulseRadius;
          // push particle away
          p.vx += (dx / dist) * force * 0.5;
          p.vy += (dy / dist) * force * 0.5;
        }

        // Apply physics
        p.x += p.vx;
        p.y += p.vy;
        
        // Friction
        p.vx *= 0.85;
        p.vy *= 0.85;

        // Screen wrap around (if it floats entirely off top-left, reset to bottom-right)
        if (p.x < -100 || p.y < -100) {
          p.x = canvas.width + Math.random() * 200;
          p.y = canvas.height + Math.random() * 200;
          p.vx = 0;
          p.vy = 0;
        }

        // Final render position includes parallax
        const renderX = p.x + parallaxX * p.depth * 10;
        const renderY = p.y + parallaxY * p.depth * 10;

        // Determine particle orientation (slightly altered by velocity)
        const angle = Math.atan2(Math.sin(p.baseAngle) * driftSpeed + p.vy, Math.cos(p.baseAngle) * driftSpeed + p.vx);

        ctx.beginPath();
        ctx.moveTo(renderX, renderY);
        ctx.lineTo(renderX + Math.cos(angle) * p.length, renderY + Math.sin(angle) * p.length);
        
        ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${p.baseOpacity})`;
        ctx.lineWidth = p.thickness * p.depth; // closer particles are thicker
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};
