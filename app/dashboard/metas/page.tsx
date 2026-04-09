'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { usePlan } from '@/lib/usePlan'
import { Target, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react'
import { FeatureLock } from '@/app/dashboard/components/FeatureLock'

import GoalCard from './components/GoalCard'
import GoalSetup from './components/GoalSetup'
import AICoachPanel from './components/AICoachPanel'
import HistoricalChart from './components/HistoricalChart'

import type { GoalProgress, GoalTemplate } from '@/lib/goals/types'
import { buildCoachPayload } from '@/lib/goals/aggregations'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Metas Estratégicas',
    subtitle: 'Acompanhe e gerencie suas metas com inteligência',
    refresh: 'Atualizar',
    loading: 'Carregando metas...',
    noGoals: 'Nenhuma meta ativa para este mês. Ative metas abaixo.',
    months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    activeGoals: 'Metas Ativas',
    setup: 'Configurar Metas',
  },
  en: {
    title: 'Strategic Goals',
    subtitle: 'Track and manage your goals with intelligence',
    refresh: 'Refresh',
    loading: 'Loading goals...',
    noGoals: 'No active goals for this month. Activate goals below.',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    activeGoals: 'Active Goals',
    setup: 'Configure Goals',
  },
  es: {
    title: 'Metas Estratégicas',
    subtitle: 'Siga y gestione sus metas con inteligencia',
    refresh: 'Actualizar',
    loading: 'Cargando metas...',
    noGoals: 'Ninguna meta activa para este mes. Active metas abajo.',
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    activeGoals: 'Metas Activas',
    setup: 'Configurar Metas',
  },
}

type Lang = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MetasPage() {
  const { user, org, activeOrgName } = useAuth()
  const orgId = useActiveOrgId()
  const { hasFeature } = usePlan()

  const lang = ((user as any)?.language as Lang) || 'pt'
  const currency = (org as any)?.currency || 'BRL'
  const t = TRANSLATIONS[lang]

  // Month selector
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const monthStr = useMemo(() => {
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  }, [selectedDate])

  const monthLabel = useMemo(() => {
    return `${t.months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }, [selectedDate, t])

  const prevMonth = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  // State
  const [progressList, setProgressList] = useState<GoalProgress[]>([])
  const [templates, setTemplates] = useState<GoalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/goals?org_id=_templates_')
        // Templates are fetched from goal_templates table via a separate approach
        // Let's fetch them from Supabase directly via the goals list
      } catch {}
    }
    // We'll get templates from the progress endpoint or goals endpoint
  }, [])

  // Fetch progress
  const fetchProgress = useCallback(async (showLoader = true) => {
    if (!orgId) return

    if (showLoader) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await fetch(`/api/goals/progress?org_id=${orgId}&month=${monthStr}`)
      if (res.ok) {
        const data = await res.json()
        setProgressList(data)

        // Extract unique templates
        const tplMap = new Map<string, GoalTemplate>()
        data.forEach((p: GoalProgress) => {
          if (p.template) tplMap.set(p.template.id, p.template)
        })
        // We also need all templates for setup — fetch from goals list
      }

      // Fetch all templates for the setup panel
      const tplRes = await fetch(`/api/goals?org_id=${orgId}&month=${monthStr}`)
      if (tplRes.ok) {
        const goalsData = await tplRes.json()
        const tplMap = new Map<string, GoalTemplate>()
        goalsData.forEach((g: any) => {
          if (g.goal_templates) tplMap.set(g.goal_templates.id, g.goal_templates)
        })
        // Merge with progress templates
        progressList.forEach(p => {
          if (p.template) tplMap.set(p.template.id, p.template)
        })
      }
    } catch (err) {
      console.error('Failed to fetch goals progress:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orgId, monthStr])

  // Fetch all templates from DB for setup
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (!orgId) return
      try {
        // Get templates from a dedicated call — since we don't have a templates-only endpoint,
        // we'll query org_goals which joins goal_templates, plus we need all templates
        // Let's use the Supabase client directly
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data } = await supabase
          .from('goal_templates')
          .select('*')
          .order('sort_order', { ascending: true })

        if (data) setTemplates(data)
      } catch {}
    }
    fetchAllTemplates()
  }, [orgId])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Build coach payload
  const coachPayload = useMemo(() => {
    if (progressList.length === 0) return null

    return buildCoachPayload(
      activeOrgName || 'Org',
      monthStr.slice(0, 7),
      progressList[0]?.daysElapsed || 1,
      progressList[0]?.daysRemaining || 0,
      progressList.map(p => ({
        templateId: p.goal.template_id,
        target: p.targetValue,
        current: p.currentValue,
        pct: p.percentage,
        projected: p.projectedValue,
        streak: p.streak?.current_streak || 0,
      })),
      1 // team size placeholder
    )
  }, [progressList, activeOrgName, monthStr])

  // Active goals for setup
  const activeGoals = useMemo(() => progressList.map(p => p.goal), [progressList])

  if (!orgId) return null

  return (
    <FeatureLock feature="hasFinancialModule" lang={lang} variant="replace"
      title={lang === 'pt' ? 'Módulo de Metas' : lang === 'es' ? 'Módulo de Metas' : 'Goals Module'}
      description={lang === 'pt' ? 'Gerencie metas estratégicas com auto-tracking e coaching IA' : lang === 'es' ? 'Gestione metas estratégicas con auto-tracking y coaching IA' : 'Manage strategic goals with auto-tracking and AI coaching'}
    >
      <div className="space-y-6 pb-16">
        {/* ═══════════════════════════════════════════════════════════════════════
            HEADER
            ═══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-primary-subtle)', border: '1px solid rgba(90, 122, 230, 0.2)' }}
            >
              <Target size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Month selector */}
            <div className="flex items-center gap-1 rounded-xl px-1 py-1" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold px-3 min-w-[140px] text-center" style={{ color: 'var(--color-text-primary)' }}>
                {monthLabel}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchProgress(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl transition-all"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-tertiary)',
              }}
              title={t.refresh}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            AI COACH
            ═══════════════════════════════════════════════════════════════════════ */}
        <AICoachPanel
          orgId={orgId}
          orgName={activeOrgName || 'Org'}
          month={monthStr}
          payload={coachPayload}
          lang={lang}
        />

        {/* ═══════════════════════════════════════════════════════════════════════
            LOADING
            ═══════════════════════════════════════════════════════════════════════ */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.loading}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            GOAL CARDS GRID
            ═══════════════════════════════════════════════════════════════════════ */}
        {!loading && progressList.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {t.activeGoals} ({progressList.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {progressList.map((progress) => (
                <GoalCard
                  key={progress.goal.id}
                  progress={progress}
                  lang={lang}
                  currency={currency}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && progressList.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
          >
            <Target size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noGoals}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            GOAL SETUP
            ═══════════════════════════════════════════════════════════════════════ */}
        {!loading && templates.length > 0 && (
          <GoalSetup
            templates={templates}
            activeGoals={activeGoals}
            orgId={orgId}
            month={monthStr}
            lang={lang}
            currency={currency}
            onGoalActivated={() => fetchProgress(false)}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            HISTORICAL CHART
            ═══════════════════════════════════════════════════════════════════════ */}
        {!loading && progressList.length > 0 && (
          <HistoricalChart
            progressList={progressList}
            month={monthStr}
            lang={lang}
          />
        )}
      </div>
    </FeatureLock>
  )
}
