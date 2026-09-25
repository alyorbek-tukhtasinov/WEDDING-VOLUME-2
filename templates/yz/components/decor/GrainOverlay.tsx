import React from 'react';

/** Fixed film-grain texture over the whole viewport for cinematic depth. Pure SVG turbulence, no assets. */
export const GrainOverlay: React.FC = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 250,
      pointerEvents: 'none',
      opacity: 0.045,
      mixBlendMode: 'overlay',
    }}
  >
    <svg width="100%" height="100%">
      <filter id="grainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grainFilter)" />
    </svg>
  </div>
);
