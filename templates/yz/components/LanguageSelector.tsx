import React from 'react';
import { motion } from 'motion/react';
import { useLanguage, Lang } from './LanguageContext';

export const LanguageSelector: React.FC = () => {
  const { lang, setLang, t } = useLanguage();

  const toggle = () => {
    setLang(lang === 'uz' ? 'ru' : 'uz');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 200,
      }}
    >
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          background: 'rgba(10,4,8,0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,169,110,0.3)',
          borderRadius: '24px',
          padding: '0',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {(['uz', 'ru'] as Lang[]).map((l) => (
          <motion.div
            key={l}
            animate={{
              background: lang === l ? 'rgba(201,169,110,0.25)' : 'transparent',
              color: lang === l ? '#C9A96E' : 'rgba(245,240,227,0.45)',
            }}
            transition={{ duration: 0.2 }}
            style={{
              padding: '8px 14px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {l.toUpperCase()}
          </motion.div>
        ))}
      </button>
    </motion.div>
  );
};
