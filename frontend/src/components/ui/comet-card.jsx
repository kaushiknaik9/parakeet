import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const CometCard = ({ children, className = "" }) => {
  const ref = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate normalized mouse position (-0.5 to +0.5)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative group rounded-2xl overflow-visible ${className}`}
    >
      {/* Comet Glow/Border Animation */}
      <div className="absolute -inset-[2px] rounded-2xl overflow-hidden -z-10 opacity-100 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.8)_360deg)] animate-[spin_4s_linear_infinite]" />
      </div>
      
      {/* Card Body inner background */}
      <div className="absolute inset-0 bg-[#1F2121] rounded-2xl -z-10 shadow-[inner_0_0_10px_rgba(255,255,255,0.05)] border border-white/10" />

      {/* 3D content container */}
      <div
        style={{ transform: "translateZ(30px)" }}
        className="w-full h-full relative rounded-2xl overflow-hidden"
      >
        {children}
      </div>
    </motion.div>
  );
};
