import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const GOLD = 'rgba(201,169,110,0.5)';

interface Bokeh {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

export const AmbientGlow: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  const bokeh: Bokeh[] = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: (i * 11.3 + Math.sin(i * 2.1) * 12 + 100) % 100,
        top: (i * 17.9 + Math.cos(i * 1.7) * 15 + 100) % 100,
        size: 1.5 + (i % 4) * 1.2,
        duration: 4 + (i % 5),
        delay: (i * 0.37) % 4,
      })),
    [],
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Slow-breathing color blobs */}
      <motion.div
        animate={prefersReducedMotion ? {} : { x: [0, 30, -10, 0], y: [0, -20, 10, 0], opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '-15%',
          width: '65%',
          height: '35%',
          background: 'radial-gradient(circle, rgba(160,60,90,0.18) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
      <motion.div
        animate={prefersReducedMotion ? {} : { x: [0, -25, 15, 0], y: [0, 15, -15, 0], opacity: [0.1, 0.18, 0.1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '-15%',
          width: '60%',
          height: '30%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.16) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />

      {/* Bokeh / dew glow particles */}
      {bokeh.map((b) => (
        <motion.div
          key={b.id}
          animate={
            prefersReducedMotion
              ? {}
              : { opacity: [0, 0.7, 0], scale: [0.6, 1, 0.6] }
          }
          transition={{ duration: b.duration, repeat: Infinity, delay: b.delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            borderRadius: '50%',
            background: GOLD,
            boxShadow: `0 0 ${b.size * 3}px ${GOLD}`,
            opacity: prefersReducedMotion ? 0.25 : 0,
          }}
        />
      ))}
    </div>
  );
};
