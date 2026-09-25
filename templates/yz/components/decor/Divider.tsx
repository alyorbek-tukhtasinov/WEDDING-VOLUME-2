import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const GOLD = '#C9A96E';

interface DividerProps {
  width?: number;
  style?: React.CSSProperties;
}

/** Filigree ornamental divider that "draws itself" in when scrolled into view. */
export const Divider: React.FC<DividerProps> = ({ width = 140, style }) => {
  const prefersReducedMotion = useReducedMotion();
  const h = width * 0.16;

  const pathD = `M2 ${h / 2}
    C ${width * 0.18} ${h * 0.1}, ${width * 0.32} ${h * 0.1}, ${width * 0.42} ${h / 2}
    C ${width * 0.46} ${h * 0.75}, ${width * 0.54} ${h * 0.75}, ${width * 0.58} ${h / 2}
    C ${width * 0.68} ${h * 0.1}, ${width * 0.82} ${h * 0.1}, ${width - 2} ${h / 2}`;

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      style={{ display: 'block', overflow: 'visible', ...style }}
      aria-hidden="true"
    >
      <motion.path
        d={pathD}
        stroke={GOLD}
        strokeWidth={1}
        fill="none"
        strokeLinecap="round"
        opacity={0.75}
        initial={prefersReducedMotion ? undefined : { pathLength: 0, opacity: 0 }}
        whileInView={prefersReducedMotion ? undefined : { pathLength: 1, opacity: 0.75 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
      <circle cx={width / 2} cy={h / 2} r={2} fill={GOLD} opacity={0.85} />
    </svg>
  );
};
