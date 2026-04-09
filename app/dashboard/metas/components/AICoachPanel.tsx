'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, AlertCircle, Clock, Target, Zap } from 'lucide-react'
import type { CoachResult } from '@/lib/goals/types'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Coach Estrategico IA',
    generate: 'Gerar Analise',
    regenerate: 'Regenerar',
    generating: 'Analisando metas...',
    cooldown: 'Aguarde',
    seconds: 's',
    generatedAt: 'Gerado em',
    error: 'Erro ao gerar coaching. Tente novamente.',
    rateLimit: 'Limite diario atingido (10/dia). Tente amanha.',
    noData: 'Clique em "Gerar Analise" para receber coaching estrategico baseado no seu progresso.',
    recommendations: 'Recomendacoes',
    paceAnalysis: 'Analise de Ritmo',
    priorityGoal: 'Meta Prioritaria',
  },
  en: {
    title: 'AI Strategy Coach',
    generate: 'Generate Analysis',
    regenerate: 'Regenerate',
    generating: 'Analyzing goals...',
    cooldown: 'Wait',
    seconds: 's',
    generatedAt: 'Generated at',
    error: 'Error generating coaching. Please try again.',
    rateLimit: 'Daily limit reached (10/day). Try again tomorrow.',
    noData: 'Click "Generate Analysis" to receive strategic coaching based on your progress.',
    recommendations: 'Recommendations',
    paceAnalysis: 'Pace Analysis',
    priorityGoal: 'Priority Goal',
  },
  es: {
    title: 'Coach Estrategico IA',
    generate: 'Generar Analisis',
    regenerate: 'Regenerar',
    generating: 'Analizando metas...',
    cooldown: 'Espere',
    seconds: 's',
    generatedAt: 'Generado en',
    error: 'Error al generar coaching. Intente nuevamente.',
    rateLimit: 'Limite diario alcanzado (10/dia). Intente manana.',
    noData: 'Haga clic en "Generar Analisis" para recibir coaching estrategico basado en su progreso.',
    recommendations: 'Recomendaciones',
    paceAnalysis: 'Analisis de Ritmo',
    priorityGoal: 'Meta Prioritaria',
  },
}

type Lang = keyof typeof TRANSLATIONS

const COOLDOWN_SECONDS = 60
const CACHE_KEY_PREFIX = 'oryen:goals:coach:'

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  orgId: string
  orgName: string
  month: string
  payload: Record<string, unknown> | null
  lang?: Lang
}

export default function AICoachPanel({ orgId, orgName, month, payload, lang = 'pt' }: Props) {
  const t = TRANSLATIONS[lang]

  const [result, setResult] = useState<CoachResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Load from localStorage cache
  useEffect(() => {
    const cacheKey = `${CACHE_KEY_PREFIX}${orgId}:${month}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as CoachResult
        const age = Date.now() - new Date(parsed.generated_at).getTime()
        if (age < 24 * 60 * 60 * 1000) {
          setResult(parsed)
        }
      }
    } catch {}
  }, [orgId, month])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const generate = useCallback(async () => {
    if (!payload || loading || cooldown > 0) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/goals/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, lang, payload }),
      })

      if (res.status === 429) {
        setError(t.rateLimit)
        return
      }

      if (!res.ok) {
        setError(t.error)
        return
      }

      const data = await res.json() as CoachResult
      setResult(data)
      setCooldown(COOLDOWN_SECONDS)

      // Cache
      const cacheKey = `${CACHE_KEY_PREFIX}${orgId}:${month}`
      localStorage.setItem(cacheKey, JSON.stringify(data))
    } catch {
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [orgId, lang, payload, loading, cooldown, month, t])

  const canGenerate = !loading && cooldown <= 0 && !!payload

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-indigo-subtle)', border: '1px solid rgba(110, 95, 255, 0.2)' }}
          >
            <Sparkles size={16} style={{ color: 'var(--color-indigo)' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h2>
            {result?.generated_at && (
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {t.generatedAt} {new Date(result.generated_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!canGenerate}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-40"
          style={{
            background: canGenerate ? 'var(--color-indigo-subtle)' : 'var(--color-bg-elevated)',
            color: canGenerate ? 'var(--color-indigo)' : 'var(--color-text-muted)',
            border: '1px solid rgba(110, 95, 255, 0.2)',
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
          ) : result ? (
            <>
              <RefreshCw size={14} />
              {t.regenerate}
            </>
          ) : (
            <>
              <Sparkles size={14} />
              {t.generate}
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {error && (
          <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--color-error)' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!result && !loading && !error && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
            {t.noData}
          </p>
        )}

        {loading && !result && (
          <div className="flex items-center justify-center py-8 gap-3">
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-indigo)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.generating}</span>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {result.summary}
            </p>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {t.recommendations}
                </h3>
                <div className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                      style={{ background: 'var(--color-bg-elevated)' }}
                    >
                      <Zap size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-indigo)' }} />
                      <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                        {rec}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pace analysis */}
            {result.pace_analysis && (
              <div className="rounded-lg px-4 py-3" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t.paceAnalysis}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {result.pace_analysis}
                </p>
              </div>
            )}

            {/* Priority goal */}
            {result.priority_goal && (
              <div className="flex items-start gap-2.5 rounded-lg px-4 py-3" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <Target size={14} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#ef4444' }}>
                    {t.priorityGoal}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                    {result.priority_goal}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
