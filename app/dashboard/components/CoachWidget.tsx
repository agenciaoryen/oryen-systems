'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

const T = {
  pt: {
    title: 'Oryen Coach',
    open: 'Abrir Coach',
    loading: 'Carregando...',
    empty: 'Converse com seu coach pessoal de negócios.',
    latestInsight: 'Último insight',
  },
  en: {
    title: 'Oryen Coach',
    open: 'Open Coach',
    loading: 'Loading...',
    empty: 'Talk to your personal business coach.',
    latestInsight: 'Latest insight',
  },
  es: {
    title: 'Oryen Coach',
    open: 'Abrir Coach',
    loading: 'Cargando...',
    empty: 'Habla con tu coach personal de negocios.',
    latestInsight: 'Último insight',
  },
}

interface Props {
  orgId: string
  userId?: string
  lang?: 'pt' | 'en' | 'es'
  niche?: string | null
}

interface CoachMessage {
  id: string
  role: string
  body: string
  message_type: string
  created_at: string
}

function Skeleton() {
  return (
    <div className="p-4 sm:p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ background: 'var(--color-border)' }} />
        <div className="h-4 w-28 rounded" style={{ background: 'var(--color-border)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-2 rounded w-full" style={{ background: 'var(--color-border)' }} />
        <div className="h-2 rounded w-3/4" style={{ background: 'var(--color-border)' }} />
      </div>
    </div>
  )
}

export default function CoachWidget({ orgId, userId, lang = 'pt', niche }: Props) {
  const [latestMessage, setLatestMessage] = useState<CoachMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const t = T[lang]

  // Only available for real_estate niche
  if (niche && niche !== 'real_estate') return null

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(false)

    try {
      const res = await fetch(`/api/coach/conversation?org_id=${orgId}&check_greeting=true&lang=${lang}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const messages = data.messages || []
      // Get the last coach message
      const coachMessages = messages.filter((m: CoachMessage) => m.role === 'coach')
      if (coachMessages.length > 0) {
        setLatestMessage(coachMessages[coachMessages.length - 1])
      }
    } catch (err) {
      console.error('CoachWidget: load error', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [orgId, lang])

  useEffect(() => {
    if (orgId) loadData()
  }, [orgId, loadData])

  if (error) return null

  if (loading) return <Skeleton />

  // Trucate long messages for the widget
  const insightText = latestMessage?.body
    ? latestMessage.body.length > 160
      ? latestMessage.body.slice(0, 160) + '...'
      : latestMessage.body
    : null

  return (
    <div
      className="rounded-2xl overflow-hidden p-4 sm:p-5"
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="p-1 rounded-md"
            style={{ background: 'linear-gradient(135deg, rgba(79, 111, 255, 0.15), rgba(139, 92, 246, 0.15))' }}
          >
            <Sparkles size={14} style={{ color: '#4F6FFF' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t.title}
          </h3>
        </div>
        <Link
          href="/dashboard/coach"
          className="text-[10px] font-medium flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t.open} <ArrowRight size={10} />
        </Link>
      </div>

      {/* Content */}
      {insightText ? (
        <div
          className="p-3 rounded-xl text-xs leading-relaxed"
          style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {t.latestInsight}
          </span>
          {insightText}
        </div>
      ) : (
        <p className="text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {t.empty}
        </p>
      )}
    </div>
  )
}
