import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { LanguageSelector } from './components/LanguageSelector';
import { MusicProvider } from './components/MusicContext';
import { MusicPlayer } from './components/MusicPlayer';
import { EnvelopeIntro } from './components/EnvelopeIntro';
import { AmbientGlow } from './components/decor/AmbientGlow';
import { GrainOverlay } from './components/decor/GrainOverlay';
import { Vignette } from './components/decor/Vignette';
import { CursorGlow } from './components/decor/CursorGlow';
import { HeroSection } from './components/HeroSection';
import { InvitationSection } from './components/InvitationSection';
import { DetailsSection } from './components/DetailsSection';
import { CountdownSection } from './components/CountdownSection';
import { MapSection } from './components/MapSection';
import { GiftSection } from './components/GiftSection';

export default function App() {
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <LanguageProvider>
      <MusicProvider>
        <div
          style={{
            // On desktop: center a mobile-proportioned column
            minHeight: '100dvh',
            background: '#050102',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
          }}
        >
          {/* Desktop side panels */}
          <div
            style={{
              display: 'none',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at center, #0d0408 0%, #030001 100%)',
              zIndex: -1,
            }}
          />

          <AmbientGlow />

          {/* Phone container */}
          <div
            id="wedding-scroll"
            style={{
              width: '100%',
              maxWidth: '430px',
              height: '100dvh',
              overflowY: hasOpened ? 'scroll' : 'hidden',
              pointerEvents: hasOpened ? 'auto' : 'none',
              scrollSnapType: 'y mandatory',
              scrollBehavior: 'smooth',
              position: 'relative',
              // Hide scrollbar
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <style>{`
              #wedding-scroll::-webkit-scrollbar { display: none; }
              * { box-sizing: border-box; }
            `}</style>

            <HeroSection />
            <InvitationSection />
            <DetailsSection />
            <CountdownSection />
            <MapSection />
            <GiftSection />
          </div>

          {/* Global cinematic overlays */}
          <GrainOverlay />
          <Vignette />
          <CursorGlow />

          {/* Overlays (fixed, always on top) */}
          <LanguageSelector />
          <MusicPlayer />

          {/* Section progress indicator */}
          <SectionProgress totalSections={6} />

          {/* Envelope intro gate */}
          <AnimatePresence>
            {!hasOpened && <EnvelopeIntro onOpen={() => setHasOpened(true)} />}
          </AnimatePresence>
        </div>
      </MusicProvider>
    </LanguageProvider>
  );
}

// Dot progress indicator on the left edge, with i18n tooltip labels and a breathing active dot.
const SectionProgress: React.FC<{ totalSections: number }> = ({ totalSections }) => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const labels = [t.navHero, t.navInvitation, t.navDetails, t.navCountdown, t.navMap, t.navGift];

  useEffect(() => {
    const container = document.getElementById('wedding-scroll');
    if (!container) return;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const sectionHeight = container.clientHeight;
      const idx = Math.round(scrollTop / sectionHeight);
      setActiveIndex(Math.min(idx, totalSections - 1));
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [totalSections]);

  return (
    <div
      style={{
        position: 'fixed',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {Array.from({ length: totalSections }).map((_, i) => (
        <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <AnimatePresence>
            {hoverIndex === i && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  left: '16px',
                  whiteSpace: 'nowrap',
                  background: 'rgba(10,4,8,0.85)',
                  border: '1px solid rgba(201,169,110,0.3)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  color: '#C9A96E',
                  pointerEvents: 'none',
                }}
              >
                {labels[i]}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => {
              const container = document.getElementById('wedding-scroll');
              if (container) {
                container.scrollTo({ top: i * container.clientHeight, behavior: 'smooth' });
              }
            }}
            onPointerEnter={() => setHoverIndex(i)}
            onPointerLeave={() => setHoverIndex(null)}
            animate={
              activeIndex === i
                ? { boxShadow: ['0 0 6px rgba(201,169,110,0.4)', '0 0 14px rgba(201,169,110,0.85)', '0 0 6px rgba(201,169,110,0.4)'] }
                : { boxShadow: '0 0 0 rgba(201,169,110,0)' }
            }
            transition={activeIndex === i ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
            style={{
              width: activeIndex === i ? '6px' : '4px',
              height: activeIndex === i ? '20px' : '4px',
              borderRadius: '3px',
              background: activeIndex === i ? '#C9A96E' : 'rgba(201,169,110,0.3)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s',
            }}
          />
        </div>
      ))}
    </div>
  );
};
