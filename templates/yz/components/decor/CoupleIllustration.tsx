import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const GOLD = '#C9A96E';
const GOLD_SOFT = 'rgba(201,169,110,0.35)';
const GOLD_FILL = 'rgba(201,169,110,0.08)';

/** Simple line-art groom silhouette: head + tapered jacket torso + legs. */
const Groom: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x},0)`}>
    <circle cx={0} cy={8} r={6} stroke={GOLD} strokeWidth={1.3} fill={GOLD_FILL} />
    <path d="M-9,21 Q0,15 9,21 L8,46 Q0,50 -8,46 Z" stroke={GOLD} strokeWidth={1.3} fill={GOLD_FILL} strokeLinejoin="round" />
    <line x1={-4} y1={46} x2={-5} y2={58} stroke={GOLD} strokeWidth={1.3} strokeLinecap="round" />
    <line x1={4} y1={46} x2={5} y2={58} stroke={GOLD} strokeWidth={1.3} strokeLinecap="round" />
  </g>
);

/** Simple line-art bride silhouette: head + flared gown + veil hint. */
const Bride: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x},0)`}>
    <circle cx={0} cy={8} r={6} stroke={GOLD} strokeWidth={1.3} fill={GOLD_FILL} />
    <path d="M0,3 Q-9,10 -8,22" stroke={GOLD} strokeWidth={1} fill="none" opacity={0.6} />
    <path d="M-4,20 Q0,15 4,20 L13,55 Q0,60 -13,55 Z" stroke={GOLD} strokeWidth={1.3} fill={GOLD_FILL} strokeLinejoin="round" />
  </g>
);

const Heart: React.FC<{ x: number; y: number; size?: number; animated?: boolean }> = ({ x, y, size = 8, animated = true }) => (
  <motion.path
    d={`M${x} ${y + size * 0.3} C${x - size} ${y - size * 0.6}, ${x - size * 1.6} ${y + size * 0.5}, ${x} ${y + size * 1.5} C${x + size * 1.6} ${y + size * 0.5}, ${x + size} ${y - size * 0.6}, ${x} ${y + size * 0.3} Z`}
    fill={GOLD}
    animate={animated ? { scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] } : undefined}
    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    style={{ transformOrigin: `${x}px ${y}px` }}
  />
);

interface CoupleIllustrationProps {
  variant: 'holding-hands' | 'calendar-couple' | 'walking-map' | 'lantern';
  width?: number;
  style?: React.CSSProperties;
}

export const CoupleIllustration: React.FC<CoupleIllustrationProps> = ({ variant, width = 120, style }) => {
  const prefersReducedMotion = useReducedMotion();

  if (variant === 'holding-hands') {
    return (
      <svg width={width} height={width * 0.62} viewBox="0 0 120 74" style={style}>
        <Groom x={38} />
        <Bride x={82} />
        <path d="M46,42 Q60,50 74,42" stroke={GOLD_SOFT} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <Heart x={60} y={4} size={5} animated={!prefersReducedMotion} />
      </svg>
    );
  }

  if (variant === 'calendar-couple') {
    return (
      <svg width={width} height={width * 0.72} viewBox="0 0 120 86" style={style}>
        <Groom x={30} />
        <Bride x={62} />
        <path d="M38,42 Q46,48 54,42" stroke={GOLD_SOFT} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <g transform="translate(94,14)">
          <circle cx={0} cy={0} r={13} stroke={GOLD} strokeWidth={1.2} fill="none" opacity={0.8} />
          <motion.line
            x1={0} y1={0} x2={0} y2={-8}
            stroke={GOLD} strokeWidth={1.2} strokeLinecap="round"
            animate={prefersReducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '0px 0px' }}
          />
          <line x1={0} y1={0} x2={5} y2={2} stroke={GOLD} strokeWidth={1.1} strokeLinecap="round" opacity={0.7} />
        </g>
      </svg>
    );
  }

  if (variant === 'walking-map') {
    return (
      <svg width={width} height={width * 0.6} viewBox="0 0 120 72" style={style}>
        <motion.g
          animate={prefersReducedMotion ? undefined : { y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Groom x={34} />
          <Bride x={64} />
          <path d="M42,42 Q49,47 56,42" stroke={GOLD_SOFT} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </motion.g>
        {/* dashed path trailing behind, drawn in once visible */}
        <motion.path
          d="M6,66 Q40,58 78,64"
          stroke={GOLD_SOFT}
          strokeWidth={1.2}
          fill="none"
          strokeDasharray="3 5"
          initial={prefersReducedMotion ? undefined : { pathLength: 0 }}
          whileInView={prefersReducedMotion ? undefined : { pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <g transform="translate(100,54)">
          <path d="M0,0 C-7,0 -7,-11 0,-11 C7,-11 7,0 0,0 Z" stroke={GOLD} strokeWidth={1.2} fill={GOLD_FILL} />
          <circle cx={0} cy={-7} r={2.4} fill={GOLD} />
        </g>
      </svg>
    );
  }

  // lantern
  return (
    <motion.svg
      width={width * 0.5}
      height={width * 0.75}
      viewBox="0 0 60 90"
      style={style}
      animate={prefersReducedMotion ? undefined : { y: [0, -10, 0], rotate: [-2, 2, -2] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <line x1={30} y1={0} x2={30} y2={18} stroke={GOLD_SOFT} strokeWidth={1} />
      <rect x={12} y={18} width={36} height={44} rx={8} stroke={GOLD} strokeWidth={1.3} fill={GOLD_FILL} />
      <line x1={12} y1={30} x2={48} y2={30} stroke={GOLD_SOFT} strokeWidth={1} />
      <line x1={12} y1={50} x2={48} y2={50} stroke={GOLD_SOFT} strokeWidth={1} />
      <motion.circle
        cx={30} cy={40} r={7} fill={GOLD}
        animate={prefersReducedMotion ? undefined : { opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <path d="M12,62 Q30,72 48,62 L44,74 Q30,80 16,74 Z" stroke={GOLD} strokeWidth={1.2} fill={GOLD_FILL} />
      {!prefersReducedMotion &&
        [0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={30 + (i - 1) * 14}
            cy={86}
            r={1.4}
            fill={GOLD}
            animate={{ y: [0, -14, -20], opacity: [0, 0.8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
          />
        ))}
    </motion.svg>
  );
};
