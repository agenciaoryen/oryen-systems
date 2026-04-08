'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { usePlan } from '@/lib/usePlan'
import { supabase } from '@/lib/supabase'
import { subDays } from 'date-fns'
import { TrendingUp, RefreshCw } from 'lucide-react'

import InsightPanel from './components/InsightPanel'
import PipelineHealth from './components/PipelineHealth'
import ChannelROI from './components/ChannelROI'
import TeamPerformance from './components/TeamPerformance'
import RevenueProjection from './components/RevenueProjection'

import {
  getLeadFunnelByStage,
  getConversionBySource,
  getPipelineVelocity,
  getBrokerPerformance,
  getFollowUpStats,
  getRevenueProjection,
} from '@/lib/analytics/aggregations'
import type {
  FunnelStage,
  SourceConversion,
  BrokerStats,
  PipelineVelocity as PipelineVelocityType,
  FollowUpStats as FollowUpStatsType,
  RevenueProjection as RevenueProjectionType,
  AnalyticsRange,
} from '@/lib/analytics/types'
import { FeatureLock } from '@/app/dashboard/components/FeatureLock'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Analytics IA',
    subtitle: 'Inteligência de dados com insights gerados por IA',
    refresh: 'Atualizar',
    loading: 'Carregando dados...',
    noData: 'Sem dados suficientes para o período selecionado.',
  },
  en: {
    title: 'AI Analytics',
    subtitle: 'Data intelligence with AI-generated insights',
    refresh: 'Refresh',
    loading: 'Loading data...',
    noData: 'Not enough data for the selected period.',
  },
  es: {
    title: 'Analytics IA',
    subtitle: 'Inteligencia de datos con insights generados por IA',
    refresh: 'Actualizar',
    loading: 'Cargando datos...',
    noData: 'Sin datos suficientes para el período seleccionado.',
  },
}

type Lang = keyof typeof TRANSLATIONS
const RANGE_OPTIONS: AnalyticsRange[] = [7, 15, 30, 90]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const { user, isStaff, activeOrg } = useAuth()
  const { canUseAdvancedDashboard, isBasic } = usePlan()
  const activeOrgId = useActiveOrgId()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = TRANSLATIONS[lang]
  const currency = (user as any)?.currency || 'BRL'

  const [range, setRange] = useState<AnalyticsRange>(30)
  const [loading, setLoading] = useState(true)

  // Data states
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [sources, setSources] = useState<SourceConversion[]>([])
  const [velocity, setVelocity] = useState<PipelineVelocityType[]>([])
  const [brokers, setBrokers] = useState<BrokerStats[]>([])
  const [followUp, setFollowUp] = useState<FollowUpStatsType | null>(null)
  const [projection, setProjection] = useState<RevenueProjectionType | null>(null)

  const startDate = useMemo(() => subDays(new Date(), range), [range])

  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)

    try {
      const [funnelData, sourcesData, velocityData, brokersData, followUpData, projectionData] = await Promise.all([
        getLeadFunnelByStage(supabase, activeOrgId, startDate),
        getConversionBySource(supabase, activeOrgId, startDate),
        getPipelineVelocity(supabase, activeOrgId, startDate),
        getBrokerPerformance(supabase, activeOrgId, startDate),
        getFollowUpStats(supabase, activeOrgId, startDate),
        getRevenueProjection(supabase, activeOrgId),
      ])

      setFunnel(funnelData)
      setSources(sourcesData)
      setVelocity(velocityData)
      setBrokers(brokersData)
      setFollowUp(followUpData)
      setProjection(projectionData)
    } catch (err) {
      console.error('Analytics load error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, startDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const hasMultipleBrokers = brokers.length > 1

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <TrendingUp size={28} style={{ color: 'var(--color-primary)' }} />
            {t.title}
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="rounded-lg p-1 flex overflow-x-auto"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            {RANGE_OPTIONS.map((d) => (
              <button key={d} onClick={() => setRange(d)}
                className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap"
                style={{
                  background: range === d ? 'var(--color-primary-subtle)' : 'transparent',
                  color: range === d ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                }}>
                {d}D
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={loadData} disabled={loading}
            className="p-2.5 rounded-lg transition-all disabled:opacity-50"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            title={t.refresh}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          <p>{t.loading}</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Section 1 — AI Insights (Gold+) */}
          <FeatureLock feature="hasAdvancedDashboard" lang={lang} variant="replace"
            title={lang === 'pt' ? 'Insights com IA' : lang === 'es' ? 'Insights con IA' : 'AI Insights'}>
            <InsightPanel
              orgId={activeOrgId || ''}
              orgName={activeOrg?.name || 'Org'}
              rangeDays={range}
              lang={lang}
              currency={currency}
            />
          </FeatureLock>

          {/* Section 2 — Pipeline Health (all plans) */}
          <PipelineHealth
            funnel={funnel}
            velocity={velocity}
            lang={lang}
            currency={currency}
          />

          {/* Section 3 — Channel ROI (Gold+) */}
          <FeatureLock feature="hasAdvancedDashboard" lang={lang} variant="replace"
            title={lang === 'pt' ? 'ROI por Canal' : lang === 'es' ? 'ROI por Canal' : 'Channel ROI'}>
            <ChannelROI
              sources={sources}
              lang={lang}
              currency={currency}
            />
          </FeatureLock>

          {/* Section 4 — Team Performance (Gold+, 2+ brokers) */}
          {hasMultipleBrokers && (
            <FeatureLock feature="hasAdvancedDashboard" lang={lang} variant="replace"
              title={lang === 'pt' ? 'Performance da Equipe' : lang === 'es' ? 'Rendimiento del Equipo' : 'Team Performance'}>
              <TeamPerformance
                brokers={brokers}
                followUp={followUp}
                lang={lang}
                currency={currency}
              />
            </FeatureLock>
          )}

          {/* Section 5 — Revenue Projection (all plans) */}
          <RevenueProjection
            projection={projection}
            lang={lang}
            currency={currency}
          />
        </>
      )}
    </div>
  )
}
