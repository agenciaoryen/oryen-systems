'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Shuffle, Users, AlertTriangle, Clock, TrendingUp,
  RefreshCw, Loader2, ArrowRight, UserCheck, UserX,
  Flame, BarChart3
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Distribuição de Leads',
    subtitle: 'Visão geral da carga de trabalho da equipe e distribuição de leads.',
    workload: 'Carga por Corretor',
    staleLeads: 'Leads Estagnados',
    recentAssignments: 'Atribuições Recentes',
    equity: 'Métricas de Equidade',
    totalActive: 'Leads Ativos',
    avgPerBroker: 'Média por Corretor',
    maxDiff: 'Maior Diferença',
    brokers: 'Corretores',
    reassign: 'Reatribuir',
    reassigning: 'Reatribuindo...',
    reassigned: 'Reatribuído!',
    noStale: 'Nenhum lead estagnado.',
    noAssignments: 'Nenhuma atribuição recente.',
    daysSinceUpdate: 'dias sem atualização',
    leadName: 'Lead',
    stage: 'Estágio',
    broker: 'Corretor',
    days: 'Dias',
    score: 'Score',
    from: 'De',
    to: 'Para',
    reason: 'Motivo',
    date: 'Data',
    activeLeads: 'Leads Ativos',
    conversionRate: 'Conv. %',
    avgResponse: 'Resp. Média',
    available: 'Disponível',
    unavailable: 'Indisponível',
    minutes: 'min',
    noData: 'Sem dados',
    refresh: 'Atualizar',
    loading: 'Carregando...',
    reasons: {
      auto_distribution: 'Auto (distribuição)',
      auto_reassign: 'Auto (timeout)',
      manual_reassign: 'Manual',
      broker_unavailable: 'Corretor indisponível',
      stale_lead_reassign: 'Lead estagnado',
      load_rebalance: 'Rebalanceamento',
    },
    unassigned: 'Não atribuído',
  },
  en: {
    title: 'Lead Distribution',
    subtitle: 'Team workload overview and lead distribution.',
    workload: 'Workload per Broker',
    staleLeads: 'Stale Leads',
    recentAssignments: 'Recent Assignments',
    equity: 'Equity Metrics',
    totalActive: 'Active Leads',
    avgPerBroker: 'Avg per Broker',
    maxDiff: 'Max Difference',
    brokers: 'Brokers',
    reassign: 'Reassign',
    reassigning: 'Reassigning...',
    reassigned: 'Reassigned!',
    noStale: 'No stale leads.',
    noAssignments: 'No recent assignments.',
    daysSinceUpdate: 'days without update',
    leadName: 'Lead',
    stage: 'Stage',
    broker: 'Broker',
    days: 'Days',
    score: 'Score',
    from: 'From',
    to: 'To',
    reason: 'Reason',
    date: 'Date',
    activeLeads: 'Active Leads',
    conversionRate: 'Conv. %',
    avgResponse: 'Avg Response',
    available: 'Available',
    unavailable: 'Unavailable',
    minutes: 'min',
    noData: 'No data',
    refresh: 'Refresh',
    loading: 'Loading...',
    reasons: {
      auto_distribution: 'Auto (distribution)',
      auto_reassign: 'Auto (timeout)',
      manual_reassign: 'Manual',
      broker_unavailable: 'Broker unavailable',
      stale_lead_reassign: 'Stale lead',
      load_rebalance: 'Rebalancing',
    },
    unassigned: 'Unassigned',
  },
  es: {
    title: 'Distribución de Leads',
    subtitle: 'Visión general de la carga de trabajo del equipo y distribución de leads.',
    workload: 'Carga por Corredor',
    staleLeads: 'Leads Estancados',
    recentAssignments: 'Asignaciones Recientes',
    equity: 'Métricas de Equidad',
    totalActive: 'Leads Activos',
    avgPerBroker: 'Promedio por Corredor',
    maxDiff: 'Mayor Diferencia',
    brokers: 'Corredores',
    reassign: 'Reasignar',
    reassigning: 'Reasignando...',
    reassigned: '¡Reasignado!',
    noStale: 'Ningún lead estancado.',
    noAssignments: 'Ninguna asignación reciente.',
    daysSinceUpdate: 'días sin actualización',
    leadName: 'Lead',
    stage: 'Etapa',
    broker: 'Corredor',
    days: 'Días',
    score: 'Score',
    from: 'De',
    to: 'Para',
    reason: 'Motivo',
    date: 'Fecha',
    activeLeads: 'Leads Activos',
    conversionRate: 'Conv. %',
    avgResponse: 'Resp. Promedio',
    available: 'Disponible',
    unavailable: 'No disponible',
    minutes: 'min',
    noData: 'Sin datos',
    refresh: 'Actualizar',
    loading: 'Cargando...',
    reasons: {
      auto_distribution: 'Auto (distribución)',
      auto_reassign: 'Auto (timeout)',
      manual_reassign: 'Manual',
      broker_unavailable: 'Corredor no disponible',
      stale_lead_reassign: 'Lead estancado',
      load_rebalance: 'Rebalanceo',
    },
    unassigned: 'Sin asignar',
  },
}

type Lang = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#8b5cf6', '#f97316']

const SCORE_COLORS: Record<string, string> = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#6b7280',
  lost: '#374151',
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function DistribuicaoPage() {
  const { user } = useAuth()
  const activeOrgId = useActiveOrgId()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = TRANSLATIONS[lang]

  const [loading, setLoading] = useState(true)
  const [workload, setWorkload] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [staleLeads, setStaleLeads] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [reassigning, setReassigning] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)

    try {
      const [workloadRes, staleRes, assignRes] = await Promise.all([
        fetch(`/api/distribution/workload?org_id=${activeOrgId}`).then(r => r.json()),
        fetch(`/api/distribution/stale?org_id=${activeOrgId}`).then(r => r.json()),
        supabase
          .from('lead_assignment_log')
          .select('*, leads:lead_id(name)')
          .eq('org_id', activeOrgId)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      setWorkload(workloadRes.workload || [])
      setSummary(workloadRes.summary || null)
      setStaleLeads(staleRes.stale_leads || [])

      // Resolve user names for assignments
      const logData = assignRes.data || []
      if (logData.length > 0) {
        const userIds = [...new Set([
          ...logData.map((a: any) => a.assigned_from).filter(Boolean),
          ...logData.map((a: any) => a.assigned_to).filter(Boolean),
        ])]
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds)
        const userMap = new Map((users || []).map((u: any) => [u.id, u.full_name]))
        logData.forEach((a: any) => {
          a.from_name = a.assigned_from ? userMap.get(a.assigned_from) || '?' : null
          a.to_name = a.assigned_to ? userMap.get(a.assigned_to) || '?' : null
          a.lead_name = a.leads?.name || '?'
        })
      }
      setAssignments(logData)
    } catch (err) {
      console.error('[Distribution] Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => { loadData() }, [loadData])

  const handleReassign = async (leadId: string) => {
    if (!activeOrgId) return
    setReassigning(leadId)
    try {
      await fetch('/api/distribution/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: activeOrgId, lead_id: leadId }),
      })
      await loadData()
    } finally {
      setReassigning(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  // Chart data
  const chartData = workload.map((w, i) => ({
    name: w.userName?.split(' ')[0] || 'Corretor',
    leads: w.activeLeads,
    fill: COLORS[i % COLORS.length],
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <Shuffle size={28} style={{ color: 'var(--color-primary)' }} />
            {t.title}
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t.subtitle}</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw size={16} />
          {t.refresh}
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t.totalActive, value: summary.total_active_leads, icon: Users, color: '#6366f1' },
            { label: t.avgPerBroker, value: summary.avg_per_broker, icon: BarChart3, color: '#22d3ee' },
            { label: t.maxDiff, value: summary.max_difference, icon: AlertTriangle, color: summary.max_difference > 5 ? '#ef4444' : '#10b981' },
            { label: t.brokers, value: summary.broker_count, icon: UserCheck, color: '#f59e0b' },
          ].map((kpi, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon size={18} style={{ color: kpi.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Workload Chart + Broker Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bar Chart */}
        <div className="p-5 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t.workload}</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)' }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                  itemStyle={{ color: 'var(--color-text-secondary)' }}
                />
                <Bar dataKey="leads" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>{t.noData}</p>
          )}
        </div>

        {/* Broker Table */}
        <div className="p-5 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t.equity}</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {workload.map((broker, i) => (
              <div key={broker.userId} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                >
                  {getInitials(broker.userName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{broker.userName}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {broker.isAvailable ? t.available : t.unavailable}
                    {broker.avgResponseTimeMin ? ` · ${broker.avgResponseTimeMin}${t.minutes}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{broker.activeLeads}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.activeLeads}</p>
                </div>
                <div className="text-right shrink-0 w-16">
                  <p className="text-sm font-semibold" style={{ color: broker.conversionRate > 20 ? '#10b981' : 'var(--color-text-secondary)' }}>
                    {broker.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.conversionRate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stale Leads */}
      <div className="p-5 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.staleLeads}</h2>
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: staleLeads.length > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: staleLeads.length > 0 ? '#f59e0b' : '#10b981' }}>
            {staleLeads.length}
          </span>
        </div>

        {staleLeads.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>{t.noStale}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {[t.leadName, t.stage, t.broker, t.days, t.score, ''].map((h, i) => (
                    <th key={i} className="text-left py-2 px-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staleLeads.slice(0, 15).map((lead) => (
                  <tr key={lead.leadId} className="transition-colors" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td className="py-2.5 px-3">
                      <Link href={`/dashboard/crm/${lead.leadId}`} className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                        {lead.leadName}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3" style={{ color: 'var(--color-text-secondary)' }}>{lead.stage}</td>
                    <td className="py-2.5 px-3" style={{ color: 'var(--color-text-secondary)' }}>{lead.assignedToName || t.unassigned}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background: lead.daysSinceUpdate > 10 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: lead.daysSinceUpdate > 10 ? '#ef4444' : '#f59e0b' }}>
                        {lead.daysSinceUpdate}d
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background: `${SCORE_COLORS[lead.scoreLabel] || '#6b7280'}20`, color: SCORE_COLORS[lead.scoreLabel] || '#6b7280' }}>
                        {lead.score} ({lead.scoreLabel})
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleReassign(lead.leadId)}
                        disabled={reassigning === lead.leadId}
                        className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: reassigning === lead.leadId ? 'var(--color-bg-elevated)' : 'var(--color-primary)',
                          color: reassigning === lead.leadId ? 'var(--color-text-muted)' : 'white',
                        }}
                      >
                        {reassigning === lead.leadId ? t.reassigning : t.reassign}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Assignments */}
      <div className="p-5 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} style={{ color: '#6366f1' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.recentAssignments}</h2>
        </div>

        {assignments.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>{t.noAssignments}</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {assignments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Shuffle size={14} style={{ color: '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    <Link href={`/dashboard/crm/${a.lead_id}`} className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                      {a.lead_name}
                    </Link>
                    {' '}
                    {a.from_name && (
                      <span style={{ color: 'var(--color-text-muted)' }}>{a.from_name} → </span>
                    )}
                    <span className="font-medium">{a.to_name || t.unassigned}</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {(t.reasons as any)[a.reason] || a.reason} · {formatDate(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
