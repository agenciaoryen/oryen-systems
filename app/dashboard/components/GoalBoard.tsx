'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'
import PaceIndicator from '@/app/dashboard/metas/components/PaceIndicator'
import StreakBadge from '@/app/dashboard/metas/components/StreakBadge'
import { GOAL_COLORS } from '@/lib/goals/constants'
import type { GoalProgress } from '@/lib/goals/types'
import { Target, TrendingUp, ArrowRight, Sparkles, Loader2 } from 'lucide-react'

const LOCALE_MAP: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-CL' }

const HOT_LEAD_STAGES = ['qualificado', 'reuniao', 'fechamento', 'proposta', 'negociacao']

const ACTION_BY_PACE: Record<string, Record<string, string>> = {
  pt: {
    ahead: 'Continue assim — revise seus leads quentes e priorize follow-up hoje.',
    on_track: 'Continue assim — revise seus leads quentes e priorize follow-up hoje.',
    behind: 'Você está atrás. Agende 3 reuniões extras esta semana para voltar ao ritmo.',
    critical: 'Alerta: você precisa acelerar. Hora de intensificar prospecção.',
  },
  en: {
    ahead: 'Keep it up — review your hot leads and prioritize follow-up today.',
    on_track: 'Keep it up — review your hot leads and prioritize follow-up today.',
    behind: "You're behind. Schedule 3 extra meetings this week to get back on track.",
    critical: 'Alert: you need to accelerate. Time to intensify prospecting.',
  },
  es: {
    ahead: 'Sigue así — revisa tus leads calientes y prioriza el seguimiento hoy.',
    on_track: 'Sigue así — revisa tus leads calientes y prioriza el seguimiento hoy.',
    behind: 'Estás atrasado. Agenda 3 reuniones extra esta semana para volver al ritmo.',
    critical: 'Alerta: necesitas acelerar. Es hora de intensificar la prospección.',
  },
}

const T = {
  pt: {
    loading: 'Carregando metas...',
    noGoalTitle: 'Defina sua meta mensal',
    noGoalDesc: 'Acompanhe seu progresso diário e receba orientações para bater sua meta. Em menos de 1 minuto.',
    createGoal: 'Criar meta de receita',
    creating: 'Criando...',
    projection: 'Ritmo atual',
    byEndOfMonth: 'até o fim do mês',
    kirman: 'O que você fez hoje que te aproxima de',
    hotLeads: 'Leads quentes',
    noHotLeads: 'Nenhum lead quente encontrado',
    viewLeads: 'Ver leads',
    viewFullGoals: 'Ver metas completas',
    thisMonth: 'este mês',
  },
  en: {
    loading: 'Loading goals...',
    noGoalTitle: 'Set your monthly goal',
    noGoalDesc: 'Track your daily progress and get guidance to hit your goal. In under 1 minute.',
    createGoal: 'Create revenue goal',
    creating: 'Creating...',
    projection: 'Current pace',
    byEndOfMonth: 'by end of month',
    kirman: 'What did you do today that gets you closer to',
    hotLeads: 'Hot leads',
    noHotLeads: 'No hot leads found',
    viewLeads: 'View leads',
    viewFullGoals: 'View all goals',
    thisMonth: 'this month',
  },
  es: {
    loading: 'Cargando metas...',
    noGoalTitle: 'Define tu meta mensual',
    noGoalDesc: 'Sigue tu progreso diario y recibe orientación para alcanzar tu meta. En menos de 1 minuto.',
    createGoal: 'Crear meta de ingresos',
    creating: 'Creando...',
    projection: 'Ritmo actual',
    byEndOfMonth: 'hasta fin de mes',
    kirman: '¿Qué hiciste hoy que te acerca a',
    hotLeads: 'Leads calientes',
    noHotLeads: 'Sin leads calientes',
    viewLeads: 'Ver leads',
    viewFullGoals: 'Ver todas las metas',
    thisMonth: 'este mes',
  },
}

interface HotLead {
  id: string
  name: string | null
  stage: string | null
  total_em_vendas: number | null
}

interface Props {
  orgId: string
  lang?: 'pt' | 'en' | 'es'
  currency?: string
  hasFinancialModule?: boolean
}

function Skeleton() {
  return (
    <div className="p-5 sm:p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--color-border)' }} />
        <div className="space-y-2 flex-1">
          <div className="h-4 rounded w-32" style={{ background: 'var(--color-border)' }} />
          <div className="h-3 rounded w-20" style={{ background: 'var(--color-border)' }} />
        </div>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--color-border)' }} />
      <div className="space-y-2">
        <div className="h-3 rounded w-3/4" style={{ background: 'var(--color-border)' }} />
        <div className="h-3 rounded w-1/2" style={{ background: 'var(--color-border)' }} />
      </div>
    </div>
  )
}

export default function GoalBoard({ orgId, lang = 'pt', currency = 'BRL', hasFinancialModule = false }: Props) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<GoalProgress | null>(null)
  const [hotLeads, setHotLeads] = useState<HotLead[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(false)

  const t = T[lang]
  const locale = LOCALE_MAP[lang] || 'pt-BR'
  const actionText = progress ? ACTION_BY_PACE[lang]?.[progress.pace] || ACTION_BY_PACE[lang].on_track : ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(false)

    try {
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

      const [goalsRes, leadsRes] = await Promise.all([
        fetch(`/api/goals/progress?org_id=${orgId}&month=${month}`),
        supabase
          .from('leads')
          .select('id, name, stage, total_em_vendas')
          .eq('org_id', orgId)
          .in('stage', HOT_LEAD_STAGES)
          .order('updated_at', { ascending: false })
          .limit(3),
      ])

      if (!goalsRes.ok) throw new Error('Failed to fetch goals')

      const goalsData: GoalProgress[] = await goalsRes.json()

      // Prioritize: revenue > deals > leads > first available
      const priorityOrder = ['revenue', 'deals_closed', 'leads_captured']
      let primary = goalsData.find(g => priorityOrder.includes(g.template.id)) || goalsData[0] || null

      setProgress(primary)

      if (leadsRes.error) {
        console.warn('GoalBoard: leads fetch error', leadsRes.error)
        setHotLeads([])
      } else {
        setHotLeads(leadsRes.data || [])
      }
    } catch (err) {
      console.error('GoalBoard: load error', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (orgId) loadData()
  }, [orgId, loadData])

  const handleCreateGoal = async () => {
    if (!orgId || creating) return
    setCreating(true)
    try {
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          template_id: 'revenue',
          target_value: 10000,
          period_start: month,
        }),
      })
      if (!res.ok) throw new Error('Failed to create goal')
      await loadData()
    } catch (err) {
      console.error('GoalBoard: create goal error', err)
    } finally {
      setCreating(false)
    }
  }

  // Silent error — hide widget, don't break dashboard
  if (error) return null

  if (loading) return <Skeleton />

  // State B: no goals
  if (!progress) {
    return (
      <div
        className="rounded-2xl overflow-hidden p-5 sm:p-6 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(79, 111, 255, 0.12), rgba(110, 95, 255, 0.08))',
          border: '1px solid rgba(79, 111, 255, 0.25)',
        }}
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className="p-2.5 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(79, 111, 255, 0.15)', color: '#4F6FFF' }}
          >
            <Target size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {t.noGoalTitle}
            </h3>
            <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
              {t.noGoalDesc}
            </p>
          </div>
        </div>
        <button
          onClick={handleCreateGoal}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #4F6FFF, #6E5FFF)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(79, 111, 255, 0.3)',
          }}
        >
          {creating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {creating ? t.creating : t.createGoal}
        </button>
      </div>
    )
  }

  // State A: active goal
  const { template, currentValue, targetValue, percentage, pace, projectedValue, daysRemaining, streak } = progress
  const color = GOAL_COLORS[template.id] || '#4F6FFF'
  const goalName = template[`name_${lang}` as keyof typeof template] as string || template.name_pt
  const isCurrency = template.unit === 'currency'
  const displayCurrent = isCurrency ? formatPrice(currentValue, currency, locale) : String(currentValue)
  const displayTarget = isCurrency ? formatPrice(targetValue, currency, locale) : String(targetValue)
  const displayProjected = isCurrency ? formatPrice(projectedValue, currency, locale) : String(projectedValue)
  const displayNeeded = isCurrency
    ? formatPrice(targetValue > currentValue ? (targetValue - currentValue) / Math.max(1, daysRemaining) : 0, currency, locale)
    : String(targetValue > currentValue ? Math.round((targetValue - currentValue) / Math.max(1, daysRemaining)) : 0)

  return (
    <div
      className="rounded-2xl overflow-hidden p-5 sm:p-6"
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="p-2 rounded-xl flex-shrink-0"
            style={{ background: `${color}18`, color }}
          >
            <Target size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {goalName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <PaceIndicator pace={pace} lang={lang} size="sm" />
              <StreakBadge streak={streak} lang={lang} />
            </div>
          </div>
        </div>
        {hasFinancialModule && (
          <a
            href="/dashboard/metas"
            className="flex-shrink-0 text-[10px] sm:text-xs font-medium flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t.viewFullGoals} <ArrowRight size={12} />
          </a>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {displayCurrent}
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            <span style={{ color }}>{Math.round(percentage)}%</span> de {displayTarget}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, percentage)}%`,
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            }}
          />
        </div>
      </div>

      {/* Projection + Kirman row */}
      <div className="space-y-2 mb-4">
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {t.projection}: <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{displayProjected}</span> {t.byEndOfMonth}
          {daysRemaining > 0 && (
            <> &middot; <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{daysRemaining}d</span></>
          )}
        </p>
        <p className="text-xs sm:text-sm font-medium italic leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          "{t.kirman} {displayTarget} {t.thisMonth}?"
        </p>
      </div>

      {/* Bottom section: Hot leads + Action */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {/* Hot leads */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            {t.hotLeads}
          </p>
          {hotLeads.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {t.noHotLeads}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {hotLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate mr-2" style={{ color: 'var(--color-text-primary)' }}>
                    {lead.name || 'Sem nome'}
                  </span>
                  {lead.total_em_vendas && lead.total_em_vendas > 0 ? (
                    <span className="flex-shrink-0 font-semibold" style={{ color: 'var(--color-success)' }}>
                      {formatPrice(lead.total_em_vendas, currency, locale)}
                    </span>
                  ) : (
                    <span
                      className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                    >
                      {lead.stage || 'lead'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <a
            href="/dashboard/leads"
            className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t.viewLeads} <ArrowRight size={10} />
          </a>
        </div>

        {/* Suggested action */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Ação sugerida
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {pace === 'critical' && daysRemaining > 0
              ? actionText.replace('intensificar prospecção', `fechar ${displayNeeded}/dia até o fim do mês`)
              : actionText}
          </p>
        </div>
      </div>
    </div>
  )
}
