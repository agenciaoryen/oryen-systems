'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const translations = {
  pt: {
    code: '404',
    title: 'Pagina nao encontrada',
    description: 'O endereco que voce tentou acessar nao existe ou foi movido para outro local.',
    home: 'Voltar ao inicio',
    dashboard: 'Ir para o painel',
  },
  en: {
    code: '404',
    title: 'Page not found',
    description: 'The address you tried to access does not exist or has been moved.',
    home: 'Back to home',
    dashboard: 'Go to dashboard',
  },
  es: {
    code: '404',
    title: 'Pagina no encontrada',
    description: 'La direccion a la que intentaste acceder no existe o fue movida.',
    home: 'Volver al inicio',
    dashboard: 'Ir al panel',
  },
};

type Lang = keyof typeof translations;

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'pt';
  const raw = navigator.language || 'pt';
  const prefix = raw.slice(0, 2).toLowerCase();
  if (prefix === 'es') return 'es';
  if (prefix === 'en') return 'en';
  return 'pt';
}

export default function NotFound() {
  const [lang, setLang] = useState<Lang>('pt');

  useEffect(() => {
    setLang(detectLang());
  }, []);

  const t = translations[lang];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-base)',
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        {/* Logo */}
        <span
          style={{
            fontFamily: 'var(--font-orbitron), sans-serif',
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '0.15em',
            background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block',
            marginBottom: 32,
          }}
        >
          ORYEN
        </span>

        {/* Error code */}
        <div
          style={{
            fontSize: '7rem',
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 16,
          }}
        >
          {t.code}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          {t.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '0.938rem',
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.6,
            marginBottom: 40,
          }}
        >
          {t.description}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 24px',
              borderRadius: 12,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#fff',
              background: 'var(--gradient-brand)',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            {t.home}
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 24px',
              borderRadius: 12,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            {t.dashboard}
          </Link>
        </div>
      </div>
    </div>
  );
}
