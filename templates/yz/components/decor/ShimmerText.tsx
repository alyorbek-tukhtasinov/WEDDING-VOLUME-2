import React from 'react';
import { useReducedMotion } from 'motion/react';

interface ShimmerTextProps {
  text: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  style?: React.CSSProperties;
  className?: string;
}

const GOLD_GRADIENT = 'linear-gradient(100deg, #C9A96E 15%, #F8F0E3 45%, #C9A96E 65%, #a07840 85%)';

/** Standalone gold gradient sweep for plain (non-split) headings. */
export const ShimmerText: React.FC<ShimmerTextProps> = ({ text, as = 'span', style, className }) => {
  const prefersReducedMotion = useReducedMotion();
  const Tag = as as any;

  return (
    <Tag
      className={className}
      style={{
        ...style,
        backgroundImage: GOLD_GRADIENT,
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
        animation: prefersReducedMotion ? undefined : 'shimmerSweep 5s ease-in-out infinite',
      }}
    >
      {text}
    </Tag>
  );
};
