import React, { useEffect, useRef, useState } from 'react';

/** Desktop-only halo that trails the pointer. Never rendered on touch/coarse-pointer devices. */
export const CursorGlow: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)');
    setEnabled(mql.matches);
    const onChange = () => setEnabled(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (raf.current !== null) return;
      raf.current = requestAnimationFrame(() => {
        if (dotRef.current) {
          dotRef.current.style.transform = `translate3d(${pos.current.x - 90}px, ${pos.current.y - 90}px, 0)`;
        }
        raf.current = null;
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,169,110,0.14) 0%, transparent 70%)',
        filter: 'blur(6px)',
        pointerEvents: 'none',
        zIndex: 160,
        willChange: 'transform',
      }}
    />
  );
};
