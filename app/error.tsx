'use client';

import { useEffect, useState } from 'react';

const translations = {
  pt: {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro inesperado. Tente novamente ou volte para a pagina inicial.',
    retry: 'Tentar novamente',
    home: 'Voltar ao inicio',
  },
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Try again or go back to the home page.',
    retry: 'Try again',
    home: 'Back to home',
  },
  es: {
    title: 'Algo salio mal',
    description: 'Ocurrio un error inesperado. Intenta de nuevo o vuelve a la pagina principal.',
    retry: 'Intentar de nuevo',
    home: 'Volver al inicio',
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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<Lang>('pt');

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    console.error('[Oryen Error Boundary]', error);
  }, [error]);

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

        {/* Error icon - simple circle with X */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-tertiary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
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
            marginBottom: 16,
          }}
        >
          {t.description}
        </p>

        {/* Error digest for debugging */}
        {error.digest && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'monospace',
              marginBottom: 32,
              opacity: 0.6,
            }}
          >
            Ref: {error.digest}
          </p>
        )}

        {!error.digest && <div style={{ marginBottom: 32 }} />}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
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
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {t.retry}
          </button>
          <a
            href="/"
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
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {t.home}
          </a>
        </div>
      </div>
    </div>
  );
}
