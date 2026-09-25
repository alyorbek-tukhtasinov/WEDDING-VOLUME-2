import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useMotionValue, useReducedMotion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { gsap, ensureScrollTrigger, getScroller } from '../lib/scrollTrigger';
import { wedding, downloadICS } from '../wedding';


interface DetailCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  delay: number;
  isInView: boolean;
}

const DetailCard: React.FC<DetailCardProps> = ({ icon, label, value, subValue, delay, isInView }) => {
  const prefersReducedMotion = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const [sweepKey, setSweepKey] = useState(0);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 8);
    rotateX.set(-py * 8);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.pointerType === 'touch') return;
    setSweepKey((k) => k + 1);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{ duration: 0.7, delay }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 600,
        position: 'relative',
        borderRadius: '22px',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* Slowly rotating gold ring, clipped to a 1.5px sliver by the inner card's margin */}
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: '-60%',
            background: 'conic-gradient(from 0deg, transparent 0%, #C9A96E 8%, transparent 26%, transparent 100%)',
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          margin: prefersReducedMotion ? 0 : '1.5px',
          borderRadius: prefersReducedMotion ? '22px' : '20px',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: prefersReducedMotion ? '1px solid rgba(201,169,110,0.2)' : 'none',
          padding: '20px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          overflow: 'hidden',
        }}
      >
        {/* One-shot shine sweep on hover (desktop only) */}
        {!prefersReducedMotion && sweepKey > 0 && (
          <motion.div
            key={sweepKey}
            aria-hidden="true"
            initial={{ x: '-130%' }}
            animate={{ x: '220%' }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '35%',
              background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'rgba(201,169,110,0.12)',
          border: '1px solid rgba(201,169,110,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '10px',
            fontWeight: 400,
            color: '#C9A96E',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: '0 0 4px',
          }}>
            {label}
          </p>
          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '20px',
            fontWeight: 500,
            color: '#F8F0E3',
            margin: 0,
            lineHeight: 1.2,
          }}>
            {value}
          </p>
          {subValue && (
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '11px',
              fontWeight: 300,
              color: 'rgba(245,240,227,0.55)',
              margin: '3px 0 0',
            }}>
              {subValue}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};


export const DetailsSection: React.FC = () => {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });

  useEffect(() => {
    if (!ref.current || !bgRef.current) return;
    ensureScrollTrigger();
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          scroller: getScroller(),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

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
      <div ref={bgRef} style={{ position: 'absolute', top: '-6%', left: 0, right: 0, height: '112%', zIndex: 0, willChange: 'transform' }}>
        <img
          src={wedding().photos.details}
          alt="Wedding ceremony"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.25) saturate(0.8)' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(15,5,20,0.9) 0%, rgba(25,10,5,0.85) 100%)',
        }} />
        {/* Golden light orb */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)',
          zIndex: 1,
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '0 24px',
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
      }}>
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '10px' }}
        >
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '10px',
            fontWeight: 300,
            color: '#C9A96E',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}>
            ✦ ✦ ✦
          </p>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(28px, 8vw, 36px)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#F8F0E3',
            margin: 0,
          }}>
            {t.detailsTitle}
          </h2>
          <div style={{
            width: '80px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #C9A96E, transparent)',
            margin: '12px auto 0',
          }} />
        </motion.div>

        {/* Date Card */}
        <DetailCard
          delay={0.15}
          isInView={isInView}
          label={t.detailsDateLabel}
          value={t.detailsDateVal}
          icon={
            <motion.svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              initial={{ scaleY: 0.4 }}
              animate={isInView ? { scaleY: 1 } : { scaleY: 0.4 }}
              transition={{ duration: 0.6, delay: 0.35, ease: 'backOut' }}
              style={{ transformOrigin: 'top center' }}
            >
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="#C9A96E" strokeWidth="1.3"/>
              <path d="M3 9h18" stroke="#C9A96E" strokeWidth="1.3"/>
              <path d="M8 2v3M16 2v3" stroke="#C9A96E" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M8 13h2M12 13h1M8 17h2M12 17h1M16 13h1" stroke="#C9A96E" strokeWidth="1.3" strokeLinecap="round"/>
            </motion.svg>
          }
        />

        {/* Time Card */}
        <DetailCard
          delay={0.3}
          isInView={isInView}
          label={t.detailsTimeLabel}
          value={t.detailsTimeVal}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#C9A96E" strokeWidth="1.3"/>
              <motion.g
                style={{ transformOrigin: '12px 12px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
              >
                <path d="M12 7v5l3 3" stroke="#C9A96E" strokeWidth="1.3" strokeLinecap="round"/>
              </motion.g>
            </svg>
          }
        />

        {/* Venue Card */}
        <DetailCard
          delay={0.45}
          isInView={isInView}
          label={t.detailsVenueLabel}
          value={t.detailsVenueVal}
          subValue={t.detailsAddress}
          icon={
            <motion.svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              initial={{ y: -14, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: -14, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 11, delay: 0.6 }}
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#C9A96E" strokeWidth="1.3"/>
              <circle cx="12" cy="9" r="2.5" stroke="#C9A96E" strokeWidth="1.3"/>
            </motion.svg>
          }
        />

        {/* Add to calendar */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          onClick={downloadICS}
          whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(201,169,110,0.25)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '9px',
            width: '100%',
            padding: '13px',
            marginTop: '4px',
            borderRadius: '14px',
            background: 'rgba(201,169,110,0.1)',
            border: '1px solid rgba(201,169,110,0.3)',
            color: '#C9A96E',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="3" stroke="#C9A96E" strokeWidth="1.4"/>
            <path d="M3 9h18" stroke="#C9A96E" strokeWidth="1.4"/>
            <path d="M8 2v3M16 2v3" stroke="#C9A96E" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M12 13v5M9.5 15.5h5" stroke="#C9A96E" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {t.addToCalendar}
        </motion.button>

        {/* Bottom ornament */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.7 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}
        >
          <div style={{ width: '24px', height: '1px', background: 'rgba(201,169,110,0.4)' }} />
          <span style={{ color: 'rgba(201,169,110,0.5)', fontSize: '12px' }}>♡</span>
          <div style={{ width: '24px', height: '1px', background: 'rgba(201,169,110,0.4)' }} />
        </motion.div>
      </div>
    </section>
  );
};
