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
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Data states
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [sources, setSources] = useState<SourceConversion[]>([])
  const [velocity, setVelocity] = useState<PipelineVelocityType[]>([])
  const [brokers, setBrokers] = useState<BrokerStats[]>([])
  const [followUp, setFollowUp] = useState<FollowUpStatsType | null>(null)
  const [projection, setProjection] = useState<RevenueProjectionType | null>(null)

  const startDate = useMemo(() => subDays(new Date(), range), [range])

  const loadData = useCallback(async () => {
    if (!activeOrgId) {
      console.warn('[Analytics] activeOrgId is null — skipping data load')
      setDebugInfo('activeOrgId is null')
      setLoading(false)
      return
    }
    setLoading(true)
    setDebugInfo(null)

    try {
      // Diagnóstico: verificar se pipeline_stages e leads existem para esta org
      const [stagesCheck, leadsCheck] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('id, name, position', { count: 'exact', head: true })
          .eq('org_id', activeOrgId)
          .eq('is_active', true),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', activeOrgId)
          .gte('created_at', startDate.toISOString()),
      ])

      const stagesCount = stagesCheck.count ?? 0
      const leadsCount = leadsCheck.count ?? 0

      console.log(`[Analytics] org=${activeOrgId} | pipeline_stages=${stagesCount} | leads(${range}d)=${leadsCount}`)
      if (stagesCheck.error) console.error('[Analytics] pipeline_stages error:', stagesCheck.error)
      if (leadsCheck.error) console.error('[Analytics] leads error:', leadsCheck.error)

      if (stagesCount === 0 || leadsCount === 0) {
        setDebugInfo(
          stagesCount === 0
            ? `no_pipeline_stages (org: ${activeOrgId.slice(0, 8)}…)`
            : `no_leads_in_period (stages: ${stagesCount}, leads ${range}d: ${leadsCount})`
        )
      }

      const [funnelData, sourcesData, velocityData, brokersData, followUpData, projectionData] = await Promise.all([
        getLeadFunnelByStage(supabase, activeOrgId, startDate),
        getConversionBySource(supabase, activeOrgId, startDate),
        getPipelineVelocity(supabase, activeOrgId, startDate),
        getBrokerPerformance(supabase, activeOrgId, startDate),
        getFollowUpStats(supabase, activeOrgId, startDate),
        getRevenueProjection(supabase, activeOrgId),
      ])

      console.log(`[Analytics] Results — funnel: ${funnelData.length}, sources: ${sourcesData.length}, velocity: ${velocityData.length}, brokers: ${brokersData.length}`)

      setFunnel(funnelData)
      setSources(sourcesData)
      setVelocity(velocityData)
      setBrokers(brokersData)
      setFollowUp(followUpData)
      setProjection(projectionData)
    } catch (err) {
      console.error('[Analytics] load error:', err)
      setDebugInfo(`error: ${err instanceof Error ? err.message : String(err)}`)
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

      {/* Debug banner — visible only when issue detected */}
      {!loading && debugInfo && (
        <div className="rounded-lg p-4 text-sm" style={{
          background: 'var(--color-warning-subtle, rgba(245,158,11,0.1))',
          border: '1px solid rgba(245,158,11,0.3)',
          color: 'var(--color-text-secondary)',
        }}>
          <strong style={{ color: '#f59e0b' }}>
            {debugInfo.startsWith('no_pipeline_stages')
              ? (lang === 'pt' ? 'Pipeline não configurado' : lang === 'es' ? 'Pipeline no configurado' : 'Pipeline not configured')
              : debugInfo.startsWith('no_leads')
              ? (lang === 'pt' ? 'Sem leads no período' : lang === 'es' ? 'Sin leads en el período' : 'No leads in period')
              : debugInfo.startsWith('activeOrgId')
              ? (lang === 'pt' ? 'Organização não carregada' : lang === 'es' ? 'Organización no cargada' : 'Organization not loaded')
              : (lang === 'pt' ? 'Erro ao carregar dados' : lang === 'es' ? 'Error al cargar datos' : 'Error loading data')
            }
          </strong>
          {' — '}
          {debugInfo.startsWith('no_pipeline_stages')
            ? (lang === 'pt'
              ? 'Vá em Configurações → Pipeline para criar as etapas do funil.'
              : lang === 'es'
              ? 'Ve a Configuración → Pipeline para crear las etapas del embudo.'
              : 'Go to Settings → Pipeline to create funnel stages.')
            : debugInfo.startsWith('no_leads')
            ? (lang === 'pt'
              ? `Nenhum lead foi criado nos últimos ${range} dias. Tente ampliar o período.`
              : lang === 'es'
              ? `Ningún lead fue creado en los últimos ${range} días. Intenta ampliar el período.`
              : `No leads created in the last ${range} days. Try a longer period.`)
            : debugInfo.startsWith('activeOrgId')
            ? (lang === 'pt' ? 'Recarregue a página.' : lang === 'es' ? 'Recarga la página.' : 'Reload the page.')
            : debugInfo
          }
          <span className="block mt-1 text-xs" style={{ opacity: 0.6 }}>debug: {debugInfo}</span>
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
