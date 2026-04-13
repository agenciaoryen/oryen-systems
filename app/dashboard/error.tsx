'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'

const translations = {
  pt: {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro inesperado. Tente novamente ou volte para o painel.',
    retry: 'Tentar novamente',
    back: 'Voltar',
  },
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Try again or go back to the dashboard.',
    retry: 'Try again',
    back: 'Go back',
  },
  es: {
    title: 'Algo salio mal',
    description: 'Ocurrio un error inesperado. Intenta de nuevo o vuelve al panel.',
    retry: 'Intentar de nuevo',
    back: 'Volver',
  },
}

type Lang = keyof typeof translations

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'pt'
  const prefix = (navigator.language || 'pt').slice(0, 2).toLowerCase()
  if (prefix === 'es') return 'es'
  if (prefix === 'en') return 'en'
  return 'pt'
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [lang, setLang] = useState<Lang>('pt')

  useEffect(() => { setLang(detectLang()) }, [])
  useEffect(() => { console.error('[Oryen Dashboard Error]', error) }, [error])

  const t = translations[lang]

  return (
    <div
      className="min-h-[calc(100vh-100px)] flex items-center justify-center p-6"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--color-error-subtle)' }}
        >
          <AlertCircle size={32} style={{ color: 'var(--color-error)' }} />
        </div>

        <h1
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t.title}
        </h1>

        <p
          className="text-sm mb-2"
          style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}
        >
          {t.description}
        </p>

        {error.digest && (
          <p className="text-xs font-mono mb-6" style={{ color: 'var(--color-text-tertiary)', opacity: 0.6 }}>
            Ref: {error.digest}
          </p>
        )}

        {!error.digest && <div className="mb-6" />}

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <RefreshCw size={16} />
            {t.retry}
          </button>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back()
              } else {
                window.location.href = '/dashboard'
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            <ArrowLeft size={16} />
            {t.back}
          </button>
        </div>
      </div>
    </div>
  )
}
