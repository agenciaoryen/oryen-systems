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
  // Pipeline — distribuição atual (snapshot)
  pipeline?: { label: string; count: number }[]
  // Pipeline — fluxo dentro do período (quantos leads entraram em cada etapa)
  pipeline_flow?: { stage: string; label: string; count: number }[]
  // Atividade por responsável dentro do período
  user_activity?: {
    user_id: string | null
    user_name: string
    leads_created: number
    stage_changes: number
    calls_made: number
    meetings_attended: number
    proposals_sent: number
    notes_added: number
    total: number
  }[]
  // Matriz cruzada: responsável × etapa de destino
  // Responde "quantos leads o Davi moveu pra Contatado?"
  pipeline_flow_by_user?: {
    stages: { name: string; label: string }[]
    rows: {
      user_id: string | null
      user_name: string
      counts: Record<string, number>  // stage_name -> count
      total: number
    }[]
  }
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

/**
 * Monta o range a partir de strings 'YYYY-MM-DD'.
 * `from` e `to` são inclusivos — entrada é hora 00:00:00 do from e 23:59:59 do to.
 */
function getCustomRange(from: string, to: string): { start: Date; end: Date; label: string } {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T23:59:59.999`)
  const label = from === to
    ? start.toLocaleDateString('pt-BR')
    : `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
  return { start, end, label }
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

  // Suporta range custom (relatório manual) ou baseado em frequency (relatório agendado)
  const { start, end, label: period } =
    reportConfig.custom_from && reportConfig.custom_to
      ? getCustomRange(reportConfig.custom_from, reportConfig.custom_to)
      : getPeriodRange(reportConfig.frequency)
  const startISO = start.toISOString()
  const endISO = end.toISOString()

  // Org name
  const { data: org } = await supabase.from('orgs').select('name').eq('id', orgId).single()
  const { data: siteCfg } = await supabase.from('site_settings').select('currency').eq('org_id', orgId).maybeSingle()
  const orgName = org?.name || 'Organização'
  const currency = siteCfg?.currency || 'BRL'

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

  // ═══ PIPELINE FLOW — quantos leads foram MOVIDOS pra cada etapa no período ═══
  // Lê lead_events.type='stage_change' com details.to_stage preenchido (eventos após esta migração).
  // Filtra por org via inner join em leads.
  if (metrics.pipeline_flow) {
    const { data: flowEvents } = await supabase
      .from('lead_events')
      .select('details, leads!inner(org_id)')
      .eq('type', 'stage_change')
      .eq('leads.org_id', orgId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const flowCount: Record<string, number> = {}
    ;(flowEvents || []).forEach((e: any) => {
      const to = e.details?.to_stage
      if (to) flowCount[to] = (flowCount[to] || 0) + 1
    })

    // Busca as stages ativas pra compor labels na ordem correta
    const { data: stagesOrdered } = await supabase
      .from('pipeline_stages')
      .select('name, label')
      .eq('org_id', orgId)
      .order('position')

    data.pipeline_flow = (stagesOrdered || []).map((s: any) => ({
      stage: s.name,
      label: s.label || s.name,
      count: flowCount[s.name] || 0,
    }))
  }

  // ═══ ATIVIDADE POR RESPONSÁVEL ═══
  // Conta no período: leads criados por usuário (leads.assigned_to), stage changes,
  // chamadas, reuniões/visitas, propostas e notas por usuário (lead_events.user_id).
  if (metrics.user_activity) {
    // Membros da org pra mapear nomes
    const { data: members } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('org_id', orgId)

    const nameById = new Map<string, string>((members || []).map((m: any) => [m.id, m.full_name || 'Sem nome']))

    // Buckets por usuário
    const acc: Record<string, any> = {}
    const bucket = (userId: string | null) => {
      const key = userId || 'sdr_agent'
      if (!acc[key]) {
        acc[key] = {
          user_id: userId,
          user_name: userId ? (nameById.get(userId) || 'Desconhecido') : 'Agente IA',
          leads_created: 0,
          stage_changes: 0,
          calls_made: 0,
          meetings_attended: 0,
          proposals_sent: 0,
          notes_added: 0,
          total: 0,
        }
      }
      return acc[key]
    }

    // Leads criados no período (assigned_to como proxy de "quem cadastrou/responsável")
    const { data: newLeads } = await supabase
      .from('leads')
      .select('assigned_to, created_at')
      .eq('org_id', orgId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
    ;(newLeads || []).forEach((l: any) => {
      const b = bucket(l.assigned_to)
      b.leads_created++
      b.total++
    })

    // Eventos por usuário no período (stage_change, call_made, meeting_attended, proposal_sent, note)
    const { data: evtByUser } = await supabase
      .from('lead_events')
      .select('type, user_id, leads!inner(org_id)')
      .in('type', ['stage_change', 'call_made', 'meeting_attended', 'proposal_sent', 'note'])
      .eq('leads.org_id', orgId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
    ;(evtByUser || []).forEach((e: any) => {
      const b = bucket(e.user_id)
      if (e.type === 'stage_change') b.stage_changes++
      else if (e.type === 'call_made') b.calls_made++
      else if (e.type === 'meeting_attended') b.meetings_attended++
      else if (e.type === 'proposal_sent') b.proposals_sent++
      else if (e.type === 'note') b.notes_added++
      b.total++
    })

    data.user_activity = Object.values(acc).sort((a: any, b: any) => b.total - a.total)
  }

  // ═══ MATRIZ RESPONSÁVEL × ETAPA DE DESTINO ═══
  // Pra cada responsável, quantos leads moveu pra cada etapa no período.
  if (metrics.pipeline_flow_by_user) {
    const [eventsRes, stagesRes, membersRes] = await Promise.all([
      supabase
        .from('lead_events')
        .select('user_id, details, leads!inner(org_id)')
        .eq('type', 'stage_change')
        .eq('leads.org_id', orgId)
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      supabase
        .from('pipeline_stages')
        .select('name, label')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('position'),
      supabase
        .from('users')
        .select('id, full_name')
        .eq('org_id', orgId),
    ])

    const stages = (stagesRes.data || []).map((s: any) => ({ name: s.name, label: s.label || s.name }))
    const nameById2 = new Map<string, string>((membersRes.data || []).map((m: any) => [m.id, m.full_name || 'Sem nome']))

    const matrix: Record<string, Record<string, number>> = {}
    ;(eventsRes.data || []).forEach((e: any) => {
      const uid = e.user_id || 'sdr_agent'
      const toStage = e.details?.to_stage
      if (!toStage) return
      if (!matrix[uid]) matrix[uid] = {}
      matrix[uid][toStage] = (matrix[uid][toStage] || 0) + 1
    })

    const rows = Object.entries(matrix).map(([uid, counts]) => {
      const userId = uid === 'sdr_agent' ? null : uid
      const userName = userId ? (nameById2.get(userId) || 'Desconhecido') : 'Agente IA'
      const total = Object.values(counts).reduce((s: number, v: number) => s + v, 0)
      return { user_id: userId, user_name: userName, counts, total }
    }).sort((a, b) => b.total - a.total)

    data.pipeline_flow_by_user = { stages, rows }
  }

  return data
}
