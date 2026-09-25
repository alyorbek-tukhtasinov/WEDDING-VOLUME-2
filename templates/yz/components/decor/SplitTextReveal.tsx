import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { gsap, ensureScrollTrigger, getScroller } from '../../lib/scrollTrigger';

const GOLD_GRADIENT = 'linear-gradient(100deg, #C9A96E 15%, #F8F0E3 45%, #C9A96E 65%, #a07840 85%)';

interface SplitTextRevealProps {
  text: string;
  mode?: 'chars' | 'words';
  as?: 'span' | 'h1' | 'h2' | 'p';
  style?: React.CSSProperties;
  stagger?: number;
  duration?: number;
  delay?: number;
  /** Adds a per-unit gold gradient shimmer, staggered so it reads as a sweep across the whole word once the reveal finishes. */
  shimmer?: boolean;
}

export const SplitTextReveal: React.FC<SplitTextRevealProps> = ({
  text,
  mode = 'words',
  as = 'span',
  style,
  stagger,
  duration = 0.7,
  delay = 0,
  shimmer = false,
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const Tag = as as any;

  const units = mode === 'chars' ? Array.from(text) : text.split(' ');

  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return;
    ensureScrollTrigger();
    const el = containerRef.current;
    const targets = el.querySelectorAll('.split-unit-inner');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration,
          delay,
          stagger: stagger ?? (mode === 'chars' ? 0.025 : 0.06),
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            scroller: getScroller(),
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        },
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, mode, prefersReducedMotion]);

  const shimmerStyle: React.CSSProperties | undefined = shimmer
    ? {
        backgroundImage: GOLD_GRADIENT,
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
      }
    : undefined;

  if (prefersReducedMotion) {
    return <Tag style={{ ...style, ...shimmerStyle }}>{text}</Tag>;
  }

  return (
    <Tag ref={containerRef} style={style} aria-label={text}>
      {units.map((u, i) => (
        // The inter-word space is a plain sibling text node, not the last
        // character inside the overflow:hidden box below — a browser trims
        // trailing whitespace from the end of a shrink-to-fit inline-block's
        // own content line, which silently swallowed the space and glued
        // words together when it lived inside the reveal mask.
        <React.Fragment key={i}>
          <span
            aria-hidden="true"
            style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}
          >
            <span
              className="split-unit-inner"
              style={{
                display: 'inline-block',
                ...shimmerStyle,
                ...(shimmer
                  ? { animation: 'shimmerSweep 3.2s ease-in-out infinite', animationDelay: `${i * 0.05}s` }
                  : undefined),
              }}
            >
              {u === ' ' ? ' ' : u}
            </span>
          </span>
          {mode === 'words' && i < units.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </Tag>
  );
};
