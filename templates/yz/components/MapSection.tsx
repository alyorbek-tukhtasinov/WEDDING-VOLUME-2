import React, { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { CoupleIllustration } from './decor/CoupleIllustration';

import { wedding } from '../wedding';
// Xarita va havolalar mijoz config'idan (venue.mapEmbed, googleMaps, yandexMaps)

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface MapLinkButtonProps {
  href: string;
  color: string;
  border: string;
  bg: string;
  icon: React.ReactNode;
  label: string;
}

const MapLinkButton: React.FC<MapLinkButtonProps> = ({ href, color, border, bg, icon, label }) => {
  const prefersReducedMotion = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [sweepKey, setSweepKey] = useState(0);
  const rippleId = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = rippleId.current++;
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 650);
  };

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      onPointerEnter={() => setSweepKey((k) => k + 1)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '14px',
        textDecoration: 'none',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '12px',
        fontWeight: 400,
        color,
        letterSpacing: '0.05em',
        overflow: 'hidden',
      }}
    >
      {!prefersReducedMotion && sweepKey > 0 && (
        <motion.span
          key={sweepKey}
          aria-hidden="true"
          initial={{ x: '-130%' }}
          animate={{ x: '220%' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '35%',
            background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.16), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 160, height: 160, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            borderRadius: '50%',
            background: color,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      ))}
      <motion.span whileHover={{ x: 2 }} style={{ display: 'flex' }}>
        {icon}
      </motion.span>
      {label}
    </motion.a>
  );
};

export const MapSection: React.FC = () => {
  const { t } = useLanguage();
  const w = wedding();
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });

  return (
    <section
      ref={ref}
      style={{
        height: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img
          src={w.photos.map}
          alt="Wedding background"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.3)' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,1,3,0.55) 0%, rgba(8,2,5,0.4) 35%, rgba(12,3,7,0.65) 70%, rgba(5,1,3,0.92) 100%)',
        }} />
      </div>

      <div style={{
        position: 'relative',
        zIndex: 5,
        width: '100%',
        maxWidth: '390px',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center' }}
        >
          <span style={{ fontSize: '22px' }}>📍</span>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(26px, 8vw, 34px)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#F8F0E3',
            margin: '6px 0 0',
          }}>
            {t.mapTitle}
          </h2>
          <div style={{
            width: '60px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #C9A96E, transparent)',
            margin: '10px auto 0',
          }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          style={{ marginTop: '-8px' }}
        >
          <CoupleIllustration variant="walking-map" width={100} />
        </motion.div>

        {w.mapEmbed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={isInView ? { opacity: 1, scale: 1, y: 0, boxShadow: ['0 8px 40px rgba(0,0,0,0.5)', '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(201,169,110,0.18)', '0 8px 40px rgba(0,0,0,0.5)'] } : { opacity: 0, scale: 0.95, y: 20 }}
          transition={isInView ? { opacity: { duration: 0.8, delay: 0.2 }, scale: { duration: 0.8, delay: 0.2 }, boxShadow: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 } } : { duration: 0.8, delay: 0.2 }}
          style={{
            width: '100%',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid rgba(201,169,110,0.25)',
            position: 'relative',
          }}
        >
          <iframe
            src={w.mapEmbed}
            title="Wedding venue map"
            width="100%"
            height="220"
            style={{ display: 'block', border: 'none', filter: 'invert(0.9) hue-rotate(180deg) saturate(0.7)' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />

          {/* Corner filigree */}
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', top: 10, left: 10, pointerEvents: 'none' }} aria-hidden="true">
            <path d="M2,2 L2,16 M2,2 L16,2" stroke="#C9A96E" strokeWidth="1" opacity="0.5" strokeLinecap="round" fill="none" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', top: 10, right: 10, pointerEvents: 'none' }} aria-hidden="true">
            <path d="M18,2 L18,16 M18,2 L4,2" stroke="#C9A96E" strokeWidth="1" opacity="0.5" strokeLinecap="round" fill="none" />
          </svg>

          {/* Pulsating venue pin */}
          {!prefersReducedMotion && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
              <motion.div
                animate={{ scale: [0.6, 2.2], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,90,90,0.5)' }}
              />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ position: 'relative' }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="rgba(255,90,90,0.9)" stroke="#fff" strokeWidth="0.8" />
                <circle cx="12" cy="9" r="2.5" fill="#fff" />
              </svg>
            </div>
          )}

          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '32px',
            background: 'linear-gradient(to top, rgba(10,2,5,0.9) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
        </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          style={{
            width: '100%',
            display: 'flex',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(201,169,110,0.2)',
            borderRadius: '18px',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '3px', background: 'linear-gradient(180deg, #C9A96E, transparent)', flexShrink: 0 }} />
          <div style={{ padding: '18px 22px' }}>
            <p style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '20px',
              fontWeight: 500,
              color: '#F8F0E3',
              margin: '0 0 4px',
            }}>
              {t.mapVenue}
            </p>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              fontWeight: 300,
              color: 'rgba(245,235,215,0.6)',
              margin: 0,
            }}>
              {t.mapAddress}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          style={{ display: 'flex', gap: '12px', width: '100%' }}
        >
          {w.googleMaps && <MapLinkButton
            href={w.googleMaps}
            color="#C9A96E"
            border="rgba(201,169,110,0.3)"
            bg="rgba(201,169,110,0.12)"
            label={t.mapOpen}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#C9A96E" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="2.5" stroke="#C9A96E" strokeWidth="1.5"/>
              </svg>
            }
          />}
          {w.yandexMaps && <MapLinkButton
            href={w.yandexMaps}
            color="rgba(255,160,160,0.85)"
            border="rgba(255,100,100,0.2)"
            bg="rgba(255,50,50,0.08)"
            label={t.mapOpenYandex}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="rgba(255,140,140,0.85)" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="2.5" stroke="rgba(255,140,140,0.85)" strokeWidth="1.5"/>
              </svg>
            }
          />}
        </motion.div>
      </div>
    </section>
  );
};
