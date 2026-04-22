'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BackButtonProps {
  fallbackHref: string
  label?: string
}

export default function BackButton({ fallbackHref, label = 'Voltar' }: BackButtonProps) {
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    // Só oferece "voltar" se houve navegação prévia nesta mesma sessão
    setCanGoBack(typeof window !== 'undefined' && window.history.length > 1)
  }, [])

  const handleClick = () => {
    if (canGoBack) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:gap-3"
      style={{ color: 'var(--color-text-secondary)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
      aria-label={label}
    >
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  )
}
