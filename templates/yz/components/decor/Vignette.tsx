import React from 'react';

/** Soft edge-darkening overlay to focus attention toward the center of the phone frame. */
export const Vignette: React.FC = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 240,
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 55%, rgba(2,0,1,0.35) 100%)',
    }}
  />
);
