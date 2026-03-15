import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher({ compact = false }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language;

  const langs = [
    { code: 'en', label: t('lang.en') },
    { code: 'si', label: t('lang.si') },
    { code: 'ta', label: t('lang.ta') },
  ];

  return (
    <div className={`lang-switcher ${compact ? 'lang-switcher-compact' : ''}`}>
      {langs.map((lang) => (
        <button
          key={lang.code}
          className={`lang-btn ${current === lang.code ? 'active' : ''}`}
          onClick={() => i18n.changeLanguage(lang.code)}
          title={lang.label}
        >
          {lang.label}
        </button>
      ))}

      <style>{`
        .lang-switcher {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--color-bg, rgba(0,0,0,0.15));
          border: 1px solid var(--color-border, rgba(255,255,255,0.15));
          border-radius: 8px;
          padding: 2px;
        }
        .lang-switcher-compact {
          background: rgba(0,0,0,0.2);
          border-color: rgba(255,255,255,0.1);
        }
        .lang-btn {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-text-muted, rgba(255,255,255,0.6));
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .lang-btn:hover {
          background: var(--color-surface-hover, rgba(255,255,255,0.1));
          color: var(--color-text, white);
        }
        .lang-btn.active {
          background: var(--button-color, #4f46e5);
          color: white;
        }
      `}</style>
    </div>
  );
}
