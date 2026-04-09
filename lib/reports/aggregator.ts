// lib/reports/aggregator.ts
// Agrega métricas para geração de relatórios automatizados

import { SupabaseClient } from '@supabase/supabase-js'

export interface ReportData {
  orgName: string
  reportName: string
  period: string
  generatedAt: string
  // Operacionais
  leads_captados?: number
  canais_origem?: { name: string; count: number }[]
  mensagens_enviadas?: number
  ligacoes_feitas?: number
  leads_responderam?: number
  // Pipeline
  pipeline?: { label: string; count: number }[]
  // Financeiro
  receita_total?: number
  despesas_total?: number
  lucro_liquido?: number
  comissoes_pendentes?: number
  negocios_fechados?: number
  ticket_medio?: number
  // Site
  site_views?: number
  site_leads?: number
  site_conversion?: number
  // Goals
  meta_principal_progresso?: number
  meta_principal_target?: number
  meta_principal_nome?: string
  // Follow-up
  followup_pendentes?: number
  followup_responderam?: number
  followup_esgotados?: number
  // Extras
  currency?: string
}

function getPeriodRange(frequency: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  if (frequency === 'daily') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { start, end, label: now.toLocaleDateString('pt-BR') }
  }

  if (frequency === 'weekly') {
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    start.setHours(0, 0, 0, 0)
    return { start, end, label: `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}` }
  }

  // monthly
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start, end, label: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
}

export async function aggregateReportData(
  supabase: SupabaseClient,
  orgId: string,
  reportConfig: any
): Promise<ReportData> {
  const metrics = reportConfig.metrics || {}
  const baseMetrics = metrics.base || {}
  const pipelineStageIds: string[] = metrics.pipeline || []
  const financialMetrics = metrics.financial || {}
  const siteMetrics = metrics.site || {}
  const goalMetrics = metrics.goals || {}
  const followupMetrics = metrics.followup || {}

  const { start, end, label: period } = getPeriodRange(reportConfig.frequency)
  const startISO = start.toISOString()
  const endISO = end.toISOString()

  // Org name
  const { data: org } = await supabase.from('organizations').select('name, currency').eq('id', orgId).single()
  const orgName = org?.name || 'Organização'
  const currency = org?.currency || 'BRL'

  const data: ReportData = {
    orgName,
    reportName: reportConfig.name,
    period,
    generatedAt: new Date().toLocaleString('pt-BR'),
    currency,
  }

  // ═══ MÉTRICAS OPERACIONAIS ═══

  if (baseMetrics.leads_captados) {
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
    data.leads_captados = count || 0
  }

  if (baseMetrics.canais_origem) {
    const { data: leads } = await supabase
      .from('leads')
      .select('source')
      .eq('org_id', orgId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const sources: Record<string, number> = {}
    ;(leads || []).forEach(l => {
      const s = l.source || 'Direto'
      sources[s] = (sources[s] || 0) + 1
    })
    data.canais_origem = Object.entries(sources)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  if (baseMetrics.mensagens_enviadas) {
    const { count } = await supabase
      .from('sdr_messages')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'assistant')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
    data.mensagens_enviadas = count || 0
  }

  if (baseMetrics.leads_responderam) {
    const { data: msgs } = await supabase
      .from('sdr_messages')
      .select('phone')
      .eq('org_id', orgId)
      .eq('role', 'user')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const uniquePhones = new Set((msgs || []).map(m => m.phone))
    data.leads_responderam = uniquePhones.size
  }

  // ═══ PIPELINE ═══

  if (pipelineStageIds.length > 0) {
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name, label')
      .eq('org_id', orgId)
      .in('id', pipelineStageIds)
      .order('position')

    if (stages && stages.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('stage')
        .eq('org_id', orgId)

      const stageCount: Record<string, number> = {}
      ;(leads || []).forEach(l => { stageCount[l.stage] = (stageCount[l.stage] || 0) + 1 })

      data.pipeline = stages.map(s => ({
        label: s.label || s.name,
        count: stageCount[s.name] || 0,
      }))
    }
  }

  // ═══ FINANCEIRO ═══

  if (financialMetrics.receita || financialMetrics.despesas || financialMetrics.lucro) {
    const startDate = start.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const [revRes, expRes] = await Promise.all([
      supabase
        .from('financial_transactions')
        .select('amount')
        .eq('org_id', orgId)
        .eq('type', 'revenue')
        .eq('status', 'confirmed')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate),
      supabase
        .from('financial_transactions')
        .select('amount')
        .eq('org_id', orgId)
        .eq('type', 'expense')
        .eq('status', 'confirmed')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate),
    ])

    if (financialMetrics.receita) {
      data.receita_total = (revRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
    }
    if (financialMetrics.despesas) {
      data.despesas_total = (expRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
    }
    if (financialMetrics.lucro) {
      const rev = (revRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
      const exp = (expRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
      data.lucro_liquido = rev - exp
    }
  }

  if (financialMetrics.comissoes) {
    const { data: comms } = await supabase
      .from('commissions')
      .select('amount')
      .eq('org_id', orgId)
      .eq('status', 'pending')
    data.comissoes_pendentes = (comms || []).reduce((s, c) => s + (c.amount || 0), 0)
  }

  if (financialMetrics.negocios) {
    const { data: stagesWon } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('org_id', orgId)
      .eq('is_won', true)

    if (stagesWon && stagesWon.length > 0) {
      const wonNames = stagesWon.map(s => s.name)
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('stage', wonNames)
        .gte('updated_at', startISO)
        .lte('updated_at', endISO)
      data.negocios_fechados = count || 0
    }
  }

  if (financialMetrics.ticket_medio) {
    const { data: deals } = await supabase
      .from('leads')
      .select('total_em_vendas')
      .eq('org_id', orgId)
      .gt('total_em_vendas', 0)
      .gte('updated_at', startISO)
      .lte('updated_at', endISO)

    if (deals && deals.length > 0) {
      const total = deals.reduce((s, d) => s + (d.total_em_vendas || 0), 0)
      data.ticket_medio = total / deals.length
    }
  }

  // ═══ SITE ═══

  if (siteMetrics.views || siteMetrics.leads || siteMetrics.conversion) {
    const { data: events } = await supabase
      .from('property_events')
      .select('event_type, visitor_id')
      .eq('org_id', orgId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    if (events) {
      if (siteMetrics.views) {
        data.site_views = events.filter(e => e.event_type === 'view').length
      }
      if (siteMetrics.leads) {
        data.site_leads = events.filter(e => e.event_type === 'contact_submit').length
      }
      if (siteMetrics.conversion) {
        const views = events.filter(e => e.event_type === 'view').length
        const contacts = events.filter(e => e.event_type === 'contact_submit').length
        data.site_conversion = views > 0 ? Number(((contacts / views) * 100).toFixed(1)) : 0
      }
    }
  }

  // ═══ META PRINCIPAL ═══

  if (goalMetrics.meta_principal) {
    const { data: goals } = await supabase
      .from('goals')
      .select('name, target_value, current_value')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (goals && goals.length > 0) {
      const goal = goals[0]
      data.meta_principal_nome = goal.name
      data.meta_principal_target = goal.target_value
      data.meta_principal_progresso = goal.current_value
    }
  }

  // ═══ FOLLOW-UP ═══

  if (followupMetrics.status) {
    const [pendRes, respRes, exhRes] = await Promise.all([
      supabase.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['pending', 'active']),
      supabase.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'responded').gte('updated_at', startISO),
      supabase.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'exhausted').gte('updated_at', startISO),
    ])
    data.followup_pendentes = pendRes.count || 0
    data.followup_responderam = respRes.count || 0
    data.followup_esgotados = exhRes.count || 0
  }

  return data
}
