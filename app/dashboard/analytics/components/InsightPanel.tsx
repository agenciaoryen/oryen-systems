'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import type { AIInsightResult } from '@/lib/analytics/types'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Insights Gerados por IA',
    generate: 'Gerar Insights',
    regenerate: 'Regenerar',
    generating: 'Analisando dados...',
    cooldown: 'Aguarde',
    seconds: 's',
    generatedAt: 'Gerado em',
    error: 'Erro ao gerar insights. Tente novamente.',
    rateLimit: 'Limite diário atingido (20/dia). Tente amanhã.',
    noData: 'Clique em "Gerar Insights" para receber uma análise inteligente dos seus dados.',
    actions: 'Ações Recomendadas',
  },
  en: {
    title: 'AI-Generated Insights',
    generate: 'Generate Insights',
    regenerate: 'Regenerate',
    generating: 'Analyzing data...',
    cooldown: 'Wait',
    seconds: 's',
    generatedAt: 'Generated at',
    error: 'Error generating insights. Please try again.',
    rateLimit: 'Daily limit reached (20/day). Try again tomorrow.',
    noData: 'Click "Generate Insights" to receive an intelligent analysis of your data.',
    actions: 'Recommended Actions',
  },
  es: {
    title: 'Insights Generados por IA',
    generate: 'Generar Insights',
    regenerate: 'Regenerar',
    generating: 'Analizando datos...',
    cooldown: 'Espere',
    seconds: 's',
    generatedAt: 'Generado en',
    error: 'Error al generar insights. Intente nuevamente.',
    rateLimit: 'Límite diario alcanzado (20/día). Intente mañana.',
    noData: 'Haga clic en "Generar Insights" para recibir un análisis inteligente de sus datos.',
    actions: 'Acciones Recomendadas',
  },
}

type Lang = keyof typeof TRANSLATIONS

const COOLDOWN_SECONDS = 60
const CACHE_KEY_PREFIX = 'oryen:analytics:insight:'

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  orgId: string
  orgName: string
  rangeDays: number
  lang?: Lang
  currency?: string
}

export default function InsightPanel({ orgId, orgName, rangeDays, lang = 'pt', currency = 'BRL' }: Props) {
  const t = TRANSLATIONS[lang]

  const [insight, setInsight] = useState<AIInsightResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Load from localStorage cache on mount
  useEffect(() => {
    const cacheKey = `${CACHE_KEY_PREFIX}${orgId}:${rangeDays}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as AIInsightResult
        // Check if cached within last 24h
        const age = Date.now() - new Date(parsed.generated_at).getTime()
        if (age < 24 * 60 * 60 * 1000) {
          setInsight(parsed)
        }
      }
    } catch {}
  }, [orgId, rangeDays])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const generateInsight = useCallback(async () => {
    if (!orgId || loading || cooldown > 0) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, lang, range_days: rangeDays }),
      })

      if (res.status === 429) {
        setError(t.rateLimit)
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error('API error')
      }

      const data: AIInsightResult = await res.json()
      setInsight(data)

      // Cache
      const cacheKey = `${CACHE_KEY_PREFIX}${orgId}:${rangeDays}`
      localStorage.setItem(cacheKey, JSON.stringify(data))

      // Start cooldown
      setCooldown(COOLDOWN_SECONDS)
    } catch (err) {
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [orgId, lang, rangeDays, loading, cooldown, t])

  const formattedTime = insight
    ? new Date(insight.generated_at).toLocaleString(
        lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US',
        { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }
      )
    : ''

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        borderLeft: '4px solid var(--color-primary)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gradient accent background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle at top right, rgba(99,102,241,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            {t.title}
          </h3>
        </div>

        <button
          onClick={generateInsight}
          disabled={loading || cooldown > 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: loading || cooldown > 0 ? 'not-allowed' : 'pointer',
            background: loading || cooldown > 0 ? 'var(--color-bg-elevated)' : 'var(--color-primary)',
            color: loading || cooldown > 0 ? 'var(--color-text-muted)' : 'white',
            transition: 'all 0.15s',
            opacity: loading || cooldown > 0 ? 0.7 : 1,
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              {t.generating}
            </>
          ) : cooldown > 0 ? (
            <>
              <Clock size={14} />
              {t.cooldown} {cooldown}{t.seconds}
            </>
          ) : (
            <>
              <Sparkles size={14} />
              {insight ? t.regenerate : t.generate}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Content */}
      {insight ? (
        <div>
          {/* Insight paragraph */}
          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.7',
              color: 'var(--color-text-secondary)',
              margin: '0 0 16px 0',
            }}
          >
            {insight.insight}
          </p>

          {/* Alert chips */}
          {insight.alerts.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                {t.actions}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {insight.alerts.map((alert, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: i === 0
                        ? 'rgba(239, 68, 68, 0.08)'
                        : i === 1
                        ? 'rgba(245, 158, 11, 0.08)'
                        : 'rgba(99, 102, 241, 0.08)',
                      color: i === 0
                        ? '#ef4444'
                        : i === 1
                        ? '#f59e0b'
                        : '#6366f1',
                      border: `1px solid ${
                        i === 0
                          ? 'rgba(239, 68, 68, 0.2)'
                          : i === 1
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(99, 102, 241, 0.2)'
                      }`,
                    }}
                  >
                    <AlertCircle size={12} />
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {t.generatedAt}: {formattedTime}
          </div>
        </div>
      ) : !loading ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>
          {t.noData}
        </p>
      ) : null}
    </div>
  )
}
