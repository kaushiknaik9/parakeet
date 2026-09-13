import React from 'react';
import { motion } from 'framer-motion';

/**
 * Spotlight
 * A large diagonal stage-spotlight beam that originates from the page edge.
 * Set triggerOnView=true to animate in via whileInView (scroll-triggered).
 *
 * Props:
 *   className      – positioning classes on the SVG
 *   fill           – beam color (default "white")
 *   opacity        – peak opacity of the beam (default 0.35)
 *   triggerOnView  – if true, fades in from 0 when scrolled into view
 *   delay          – animation delay in seconds (default 0)
 */
const Spotlight = ({
  className = '',
  fill = 'white',
  opacity = 0.35,
  triggerOnView = false,
  delay = 0,
}) => {
  const variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.svg
      className={`pointer-events-none absolute select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      // scroll-triggered or always-visible
      {...(triggerOnView
        ? {
            initial: 'hidden',
            whileInView: 'visible',
            viewport: { once: true, margin: '-80px' },
            variants,
          }
        : { initial: { opacity }, animate: { opacity } })}
    >
      <g filter="url(#sf)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity={opacity}
        />
      </g>
      <defs>
        <filter
          id="sf"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </motion.svg>
  );
};

export default Spotlight;
