'use client'

import { useState, useEffect } from 'react'
import { Target, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'

const TRANSLATIONS = {
  pt: {
    title: 'Meta de Receita',
    noGoal: 'Nenhuma meta definida para este mes.',
    achieved: 'Atingido',
    remaining: 'Faltam',
    ofGoal: 'da meta',
    goalReached: 'Meta atingida!',
  },
  en: {
    title: 'Revenue Goal',
    noGoal: 'No goal set for this month.',
    achieved: 'Achieved',
    remaining: 'Remaining',
    ofGoal: 'of goal',
    goalReached: 'Goal reached!',
  },
  es: {
    title: 'Meta de Ingresos',
    noGoal: 'Ninguna meta definida para este mes.',
    achieved: 'Alcanzado',
    remaining: 'Faltan',
    ofGoal: 'de la meta',
    goalReached: 'Meta alcanzada!',
  },
}

type Lang = keyof typeof TRANSLATIONS

interface Props {
  orgId: string
  currency: string
  lang: Lang
}

export default function GoalProgress({ orgId, currency, lang }: Props) {
  const t = TRANSLATIONS[lang]
  const locale = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US'
  const fmt = (v: number) => formatPrice(v, currency, locale)

  const [goal, setGoal] = useState<number | null>(null)
  const [achieved, setAchieved] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return

    const load = async () => {
      setLoading(true)
      const now = new Date()
      const refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const [goalRes, revenueRes] = await Promise.all([
        supabase
          .from('goals')
          .select('revenue_target')
          .eq('org_id', orgId)
          .eq('month', refMonth)
          .maybeSingle(),
        supabase
          .from('financial_transactions')
          .select('amount')
          .eq('org_id', orgId)
          .eq('type', 'revenue')
          .eq('status', 'confirmed')
          .eq('reference_month', refMonth),
      ])

      setGoal(goalRes.data?.revenue_target ?? null)
      setAchieved((revenueRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0))
      setLoading(false)
    }

    load()
  }, [orgId])

  if (loading) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="h-6 w-40 rounded animate-pulse mb-4" style={{ background: 'var(--color-bg-elevated)' }} />
        <div className="h-4 w-full rounded animate-pulse" style={{ background: 'var(--color-bg-elevated)' }} />
      </div>
    )
  }

  if (goal === null || goal <= 0) {
    return (
      <div className="rounded-xl p-5 text-center" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <Target size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noGoal}</p>
      </div>
    )
  }

  const pct = Math.min((achieved / goal) * 100, 100)
  const remaining = Math.max(goal - achieved, 0)
  const isReached = achieved >= goal

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h3>
        </div>
        <span className="text-xs font-medium" style={{ color: isReached ? '#10b981' : 'var(--color-text-muted)' }}>
          {pct.toFixed(0)}% {t.ofGoal}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 rounded-full overflow-hidden mb-3" style={{ background: 'var(--color-bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isReached
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, var(--color-primary), #818cf8)',
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.achieved}</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmt(achieved)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {isReached ? t.goalReached : t.remaining}
          </p>
          <p className="text-lg font-bold" style={{ color: isReached ? '#10b981' : 'var(--color-text-tertiary)' }}>
            {isReached ? fmt(goal) : fmt(remaining)}
          </p>
        </div>
      </div>
    </div>
  )
}
