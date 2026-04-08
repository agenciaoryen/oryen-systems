'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'

const TRANSLATIONS = {
  pt: {
    title: 'Projecao de Receita',
    subtitle: 'Baseado no pipeline ponderado por etapa',
    closedRevenue: 'Receita Fechada',
    weightedPipeline: 'Pipeline Ponderado',
    projected: 'Projecao Total',
    stage: 'Etapa',
    leads: 'Leads',
    value: 'Valor',
    probability: 'Prob.',
    weighted: 'Ponderado',
    noData: 'Sem dados no pipeline.',
  },
  en: {
    title: 'Revenue Forecast',
    subtitle: 'Based on stage-weighted pipeline',
    closedRevenue: 'Closed Revenue',
    weightedPipeline: 'Weighted Pipeline',
    projected: 'Total Projection',
    stage: 'Stage',
    leads: 'Leads',
    value: 'Value',
    probability: 'Prob.',
    weighted: 'Weighted',
    noData: 'No pipeline data.',
  },
  es: {
    title: 'Proyeccion de Ingresos',
    subtitle: 'Basado en pipeline ponderado por etapa',
    closedRevenue: 'Ingresos Cerrados',
    weightedPipeline: 'Pipeline Ponderado',
    projected: 'Proyeccion Total',
    stage: 'Etapa',
    leads: 'Leads',
    value: 'Valor',
    probability: 'Prob.',
    weighted: 'Ponderado',
    noData: 'Sin datos en el pipeline.',
  },
}

type Lang = keyof typeof TRANSLATIONS

// Probabilidades por posicao do stage
const STAGE_PROBABILITIES: Record<number, number> = {
  1: 0.05, 2: 0.15, 3: 0.30, 4: 0.50, 5: 0.70, 6: 0.80, 7: 0.90,
}

interface StageData {
  name: string
  label: string
  position: number
  leads_count: number
  total_value: number
  probability: number
  weighted_value: number
}

interface Props {
  orgId: string
  currency: string
  lang: Lang
}

export default function ForecastPanel({ orgId, currency, lang }: Props) {
  const t = TRANSLATIONS[lang]
  const locale = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US'
  const fmt = (v: number) => formatPrice(v, currency, locale)

  const [stages, setStages] = useState<StageData[]>([])
  const [closedRevenue, setClosedRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return

    const load = async () => {
      setLoading(true)

      const now = new Date()
      const refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const [stagesRes, leadsRes, revenueRes] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('name, label, position, is_won, is_lost')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('position'),
        supabase
          .from('leads')
          .select('stage, total_em_vendas')
          .eq('org_id', orgId)
          .not('total_em_vendas', 'is', null)
          .gt('total_em_vendas', 0),
        supabase
          .from('financial_transactions')
          .select('amount')
          .eq('org_id', orgId)
          .eq('type', 'revenue')
          .eq('status', 'confirmed')
          .eq('reference_month', refMonth),
      ])

      const pipelineStages = (stagesRes.data || []).filter(s => !s.is_won && !s.is_lost)
      const leads = leadsRes.data || []

      const stageMap: Record<string, StageData> = {}
      for (const s of pipelineStages) {
        const prob = STAGE_PROBABILITIES[s.position] || 0.10
        stageMap[s.name] = {
          name: s.name,
          label: s.label || s.name,
          position: s.position,
          leads_count: 0,
          total_value: 0,
          probability: prob,
          weighted_value: 0,
        }
      }

      for (const lead of leads) {
        if (stageMap[lead.stage]) {
          stageMap[lead.stage].leads_count++
          stageMap[lead.stage].total_value += Number(lead.total_em_vendas)
        }
      }

      const stageList = Object.values(stageMap)
        .map(s => ({ ...s, weighted_value: s.total_value * s.probability }))
        .filter(s => s.leads_count > 0)
        .sort((a, b) => a.position - b.position)

      const closed = (revenueRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0)

      setStages(stageList)
      setClosedRevenue(closed)
      setLoading(false)
    }

    load()
  }, [orgId])

  const totalWeighted = stages.reduce((sum, s) => sum + s.weighted_value, 0)
  const totalProjected = closedRevenue + totalWeighted

  if (loading) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="h-6 w-48 rounded animate-pulse mb-4" style={{ background: 'var(--color-bg-elevated)' }} />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--color-bg-elevated)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--color-bg-elevated)' }}>
          <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.closedRevenue}</p>
          <p className="text-base font-bold mt-1" style={{ color: '#10b981' }}>{fmt(closedRevenue)}</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--color-bg-elevated)' }}>
          <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.weightedPipeline}</p>
          <p className="text-base font-bold mt-1" style={{ color: '#6366f1' }}>{fmt(totalWeighted)}</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.projected}</p>
          <p className="text-base font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{fmt(totalProjected)}</p>
        </div>
      </div>

      {/* Stage breakdown table */}
      {stages.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>{t.noData}</p>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[t.stage, t.leads, t.value, t.probability, t.weighted].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map(s => (
                <tr key={s.name}>
                  <td className="py-2 px-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.label}</td>
                  <td className="py-2 px-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{s.leads_count}</td>
                  <td className="py-2 px-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{fmt(s.total_value)}</td>
                  <td className="py-2 px-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>{(s.probability * 100).toFixed(0)}%</td>
                  <td className="py-2 px-3 text-sm font-medium" style={{ color: '#6366f1' }}>{fmt(s.weighted_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
