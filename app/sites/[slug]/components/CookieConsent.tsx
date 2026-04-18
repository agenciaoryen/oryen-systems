'use client'

import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      // Pequeno delay para não aparecer instantaneamente
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom"
      style={{ background: 'color-mix(in srgb, var(--color-bg-elevated) 95%, transparent)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--color-border-subtle)' }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-center sm:text-left" style={{ color: 'var(--color-text-secondary)' }}>
          Este site usa cookies para melhorar sua experiência de navegação. Ao continuar, você concorda com nossa política de privacidade.
        </p>
        <button
          onClick={accept}
          className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: 'var(--site-primary)', color: 'var(--color-text-on-primary)' }}
        >
          Aceitar
        </button>
      </div>
    </div>
  )
}
