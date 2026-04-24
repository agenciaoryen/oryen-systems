// lib/analytics/aggregations.ts
// Funções de agregação de dados para AI Analytics v2.4
// Todas as funções são puras async, client-side com Supabase

import { SupabaseClient } from '@supabase/supabase-js'
import { subDays, startOfMonth, format, differenceInDays, differenceInMinutes } from 'date-fns'
import type {
  FunnelStage,
  SourceConversion,
  BrokerStats,
  PipelineVelocity,
  FollowUpStats,
  SentimentPoint,
  RevenueProjection,
  InsightPayload,
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Probabilidade de conversão por posição no pipeline (defaults conservadores)
const STAGE_PROBABILITY: Record<number, number> = {
  1: 0.05,  // 5%
  2: 0.15,
  3: 0.30,
  4: 0.50,
  5: 0.70,
  6: 0.80,
  7: 0.90,
}

function getStageProbability(position: number, isWon: boolean, isLost: boolean): number {
  if (isWon) return 1.0
  if (isLost) return 0
  return STAGE_PROBABILITY[position] ?? Math.min(0.05 + (position - 1) * 0.15, 0.90)
}

const STUCK_THRESHOLD_DAYS = 5

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FUNNEL POR STAGE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getLeadFunnelByStage(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date
): Promise<FunnelStage[]> {
  // Inclui leads criados NO período OU que tiveram mudança de estágio NO período
  // (leads antigos que estão avançando agora devem contar no funil atual).
  const isoDate = startDate.toISOString()
  const [stagesRes, leadsRes] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, label, color, position, is_won, is_lost')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position'),
    supabase
      .from('leads')
      .select('id, stage, total_em_vendas, last_stage_change_at, updated_at, created_at')
      .eq('org_id', orgId)
      .or(`created_at.gte.${isoDate},last_stage_change_at.gte.${isoDate}`),
  ])

  if (stagesRes.error || leadsRes.error) return []

  const stages = stagesRes.data || []
  const leads = leadsRes.data || []
  const now = new Date()

  // Build array imperatively — needs previous stage count for conversion calc
  const result: FunnelStage[] = []

  for (let idx = 0; idx < stages.length; idx++) {
    const stage = stages[idx]
    const stageLeads = leads.filter(l => l.stage === stage.name)
    const values = stageLeads.map(l => l.total_em_vendas || 0)
    const daysInStage = stageLeads.map(l => {
      const ref = l.last_stage_change_at || l.updated_at || l.created_at
      return ref ? differenceInDays(now, new Date(ref)) : 0
    })
    const stuckCount = daysInStage.filter(d => d > STUCK_THRESHOLD_DAYS).length

    const prevStageCount = idx > 0 ? result[idx - 1]?.leadCount || 0 : leads.length
    const conversionFromPrev = prevStageCount > 0
      ? Math.round((stageLeads.length / prevStageCount) * 100)
      : 0

    result.push({
      id: stage.id,
      name: stage.name,
      label: stage.label || stage.name,
      color: stage.color || '#6366f1',
      position: stage.position,
      isWon: stage.is_won || false,
      isLost: stage.is_lost || false,
      leadCount: stageLeads.length,
      stuckCount,
      medianDays: Math.round(median(daysInStage) * 10) / 10,
      totalValue: values.reduce((a, b) => a + b, 0),
      conversionFromPrev,
    })
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CONVERSÃO POR SOURCE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getConversionBySource(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date
): Promise<SourceConversion[]> {
  const [stagesRes, leadsRes] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('name, is_won')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .eq('is_won', true),
    supabase
      .from('leads')
      .select('id, source, stage, total_em_vendas')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString()),
  ])

  if (leadsRes.error) return []

  const wonStageNames = new Set((stagesRes.data || []).map(s => s.name))
  const leads = leadsRes.data || []

  const bySource: Record<string, { total: number; won: number; values: number[] }> = {}

  for (const lead of leads) {
    const src = lead.source || 'unknown'
    if (!bySource[src]) bySource[src] = { total: 0, won: 0, values: [] }
    bySource[src].total++
    if (wonStageNames.has(lead.stage)) {
      bySource[src].won++
      if (lead.total_em_vendas) bySource[src].values.push(lead.total_em_vendas)
    }
  }

  return Object.entries(bySource)
    .map(([source, data]) => ({
      source,
      totalLeads: data.total,
      wonLeads: data.won,
      conversionRate: data.total > 0 ? Math.round((data.won / data.total) * 1000) / 10 : 0,
      avgDealValue: data.values.length > 0
        ? Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length)
        : 0,
      estimatedRevenue: data.values.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.totalLeads - a.totalLeads)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. VELOCIDADE DO PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPipelineVelocity(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date
): Promise<PipelineVelocity[]> {
  // Inclui leads com movimento recente, não só criados no período
  const isoDate = startDate.toISOString()
  const [stagesRes, leadsRes] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, label, color, position, is_won, is_lost')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position'),
    supabase
      .from('leads')
      .select('id, stage, last_stage_change_at, updated_at, created_at')
      .eq('org_id', orgId)
      .or(`created_at.gte.${isoDate},last_stage_change_at.gte.${isoDate}`),
  ])

  if (stagesRes.error || leadsRes.error) return []

  const stages = stagesRes.data || []
  const leads = leadsRes.data || []
  const now = new Date()

  return stages
    .filter(s => !s.is_won && !s.is_lost)
    .map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage.name)
      const daysArr = stageLeads.map(l => {
        const ref = l.last_stage_change_at || l.updated_at || l.created_at
        return ref ? differenceInDays(now, new Date(ref)) : 0
      })

      return {
        stageId: stage.id,
        stageName: stage.name,
        stageLabel: stage.label || stage.name,
        stageColor: stage.color || '#6366f1',
        position: stage.position,
        medianDays: Math.round(median(daysArr) * 10) / 10,
        leadCount: stageLeads.length,
        stuckCount: daysArr.filter(d => d > STUCK_THRESHOLD_DAYS).length,
      }
    })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PERFORMANCE DOS CORRETORES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getBrokerPerformance(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date
): Promise<BrokerStats[]> {
  const [stagesRes, leadsRes, usersRes, followUpRes] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('name, is_won')
      .eq('org_id', orgId)
      .eq('is_won', true),
    supabase
      .from('leads')
      .select('id, assigned_to, stage, assigned_at, first_response_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('org_id', orgId)
      .in('role', ['admin', 'vendedor']),
    supabase
      .from('follow_up_queue')
      .select('lead_id, status')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString()),
  ])

  if (leadsRes.error || usersRes.error) return []

  const wonStages = new Set((stagesRes.data || []).map(s => s.name))
  const leads = leadsRes.data || []
  const users = usersRes.data || []
  const followUps = followUpRes.data || []

  const userMap = new Map(users.map(u => [u.id, u.full_name || 'Sem nome']))

  // Agrupar leads e follow-ups por assigned_to
  const brokerData: Record<string, {
    total: number; won: number; responseTimes: number[]; fuResponded: number; fuExhausted: number; fuTotal: number
  }> = {}

  // Map lead_id → assigned_to
  const leadAssignedTo = new Map(leads.map(l => [l.id, l.assigned_to]))

  for (const lead of leads) {
    const brokerId = lead.assigned_to
    if (!brokerId) continue
    if (!brokerData[brokerId]) {
      brokerData[brokerId] = { total: 0, won: 0, responseTimes: [], fuResponded: 0, fuExhausted: 0, fuTotal: 0 }
    }
    brokerData[brokerId].total++
    if (wonStages.has(lead.stage)) brokerData[brokerId].won++
    if (lead.assigned_at && lead.first_response_at) {
      const mins = differenceInMinutes(new Date(lead.first_response_at), new Date(lead.assigned_at))
      if (mins >= 0 && mins < 10080) { // max 7 dias
        brokerData[brokerId].responseTimes.push(mins)
      }
    }
  }

  // Follow-ups
  for (const fu of followUps) {
    const brokerId = leadAssignedTo.get(fu.lead_id)
    if (!brokerId || !brokerData[brokerId]) continue
    brokerData[brokerId].fuTotal++
    if (fu.status === 'responded') brokerData[brokerId].fuResponded++
    if (fu.status === 'exhausted') brokerData[brokerId].fuExhausted++
  }

  return Object.entries(brokerData)
    .filter(([id]) => userMap.has(id))
    .map(([id, data]) => ({
      userId: id,
      name: userMap.get(id) || 'Sem nome',
      activeLeads: data.total,
      wonLeads: data.won,
      conversionRate: data.total > 0 ? Math.round((data.won / data.total) * 1000) / 10 : 0,
      avgResponseTimeMin: data.responseTimes.length > 0
        ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length)
        : 0,
      followUpResponded: data.fuResponded,
      followUpExhausted: data.fuExhausted,
      followUpTotal: data.fuTotal,
    }))
    .sort((a, b) => b.wonLeads - a.wonLeads)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FOLLOW-UP STATS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getFollowUpStats(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date
): Promise<FollowUpStats> {
  const { data, error } = await supabase
    .from('follow_up_queue')
    .select('status')
    .eq('org_id', orgId)
    .gte('created_at', startDate.toISOString())

  if (error || !data) {
    return { pending: 0, active: 0, responded: 0, exhausted: 0, cancelled: 0, total: 0, responseRate: 0 }
  }

  const counts = { pending: 0, active: 0, responded: 0, exhausted: 0, cancelled: 0 }
  for (const row of data) {
    const status = row.status as keyof typeof counts
    if (status in counts) counts[status]++
  }

  const total = data.length
  const responseRate = total > 0 ? Math.round((counts.responded / total) * 1000) / 10 : 0

  return { ...counts, total, responseRate }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TENDÊNCIA DE SENTIMENTO
// ═══════════════════════════════════════════════════════════════════════════════

export async function getSentimentTrend(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date
): Promise<SentimentPoint[]> {
  const { data, error } = await supabase
    .from('sdr_messages')
    .select('sentiment, created_at')
    .eq('org_id', orgId)
    .eq('role', 'user')
    .gte('created_at', startDate.toISOString())
    .not('sentiment', 'is', null)

  if (error || !data) return []

  const byDate: Record<string, { positive: number; neutral: number; negative: number }> = {}

  for (const msg of data) {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd')
    if (!byDate[date]) byDate[date] = { positive: 0, neutral: 0, negative: 0 }
    const s = msg.sentiment as string
    if (s === 'positivo') byDate[date].positive++
    else if (s === 'negativo') byDate[date].negative++
    else byDate[date].neutral++
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PROJEÇÃO DE RECEITA
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRevenueProjection(
  supabase: SupabaseClient,
  orgId: string
): Promise<RevenueProjection> {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [stagesRes, leadsRes, goalsRes] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, label, color, position, is_won, is_lost')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position'),
    supabase
      .from('leads')
      .select('id, stage, total_em_vendas')
      .eq('org_id', orgId),
    supabase
      .from('goals')
      .select('revenue_target')
      .eq('org_id', orgId)
      .eq('month', monthStart)
      .maybeSingle(),
  ])

  if (stagesRes.error || leadsRes.error) {
    return { closedThisMonth: 0, pipelineWeighted: 0, projected: 0, goalAmount: null, goalProgress: null, byStage: [] }
  }

  const stages = stagesRes.data || []
  const leads = leadsRes.data || []
  const goalAmount = goalsRes.data?.revenue_target || null

  let closedThisMonth = 0
  let pipelineWeighted = 0
  const byStage: RevenueProjection['byStage'] = []

  for (const stage of stages) {
    const stageLeads = leads.filter(l => l.stage === stage.name)
    const totalValue = stageLeads.reduce((sum, l) => sum + (l.total_em_vendas || 0), 0)
    const probability = getStageProbability(stage.position, stage.is_won, stage.is_lost)
    const weighted = totalValue * probability

    if (stage.is_won) {
      closedThisMonth += totalValue
    } else if (!stage.is_lost) {
      pipelineWeighted += weighted
    }

    if (!stage.is_lost) {
      byStage.push({
        stageName: stage.name,
        stageLabel: stage.label || stage.name,
        stageColor: stage.color || '#6366f1',
        totalValue,
        probability: Math.round(probability * 100),
        weightedValue: Math.round(weighted),
      })
    }
  }

  const projected = closedThisMonth + pipelineWeighted
  const goalProgress = goalAmount ? Math.round((projected / goalAmount) * 100) : null

  return {
    closedThisMonth: Math.round(closedThisMonth),
    pipelineWeighted: Math.round(pipelineWeighted),
    projected: Math.round(projected),
    goalAmount,
    goalProgress,
    byStage,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. BUILD INSIGHT PAYLOAD (para a API de IA)
// ═══════════════════════════════════════════════════════════════════════════════

export async function buildInsightPayload(
  supabase: SupabaseClient,
  orgId: string,
  rangeDays: number
): Promise<InsightPayload> {
  const now = new Date()
  const startDate = subDays(now, rangeDays)
  const prevStartDate = subDays(now, rangeDays * 2)

  // Período atual e anterior em paralelo
  const [funnel, sources, brokers, followUp, projection, prevSources] = await Promise.all([
    getLeadFunnelByStage(supabase, orgId, startDate),
    getConversionBySource(supabase, orgId, startDate),
    getBrokerPerformance(supabase, orgId, startDate),
    getFollowUpStats(supabase, orgId, startDate),
    getRevenueProjection(supabase, orgId),
    getConversionBySource(supabase, orgId, prevStartDate),
  ])

  const totalLeads = sources.reduce((s, src) => s + src.totalLeads, 0)
  const totalWon = sources.reduce((s, src) => s + src.wonLeads, 0)
  const convRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 1000) / 10 : 0

  const prevTotalLeads = prevSources.reduce((s, src) => s + src.totalLeads, 0)
  const prevTotalWon = prevSources.reduce((s, src) => s + src.wonLeads, 0)
  const prevConvRate = prevTotalLeads > 0 ? Math.round((prevTotalWon / prevTotalLeads) * 1000) / 10 : 0

  const topByVolume = sources[0] || null
  const topByConversion = [...sources].sort((a, b) => b.conversionRate - a.conversionRate)[0] || null

  const avgResponseTime = brokers.length > 0
    ? Math.round(brokers.reduce((s, b) => s + b.avgResponseTimeMin, 0) / brokers.length)
    : 0

  // Worst source by response (aproximação: usa broker com maior tempo)
  const worstBrokerResp = [...brokers].sort((a, b) => b.avgResponseTimeMin - a.avgResponseTimeMin)[0] || null
  const topBroker = brokers[0] || null

  // Bottleneck: stage com mais leads parados
  const bottleneck = [...funnel]
    .filter(s => !s.isWon && !s.isLost && s.stuckCount > 0)
    .sort((a, b) => b.stuckCount - a.stuckCount)[0] || null

  const revenueWon = funnel.filter(s => s.isWon).reduce((s, st) => s + st.totalValue, 0)

  return {
    period_days: rangeDays,
    leads_captured: totalLeads,
    leads_won: totalWon,
    conversion_rate_pct: convRate,
    conversion_rate_prev_period_pct: prevConvRate,
    avg_response_time_min: avgResponseTime,
    top_source_by_volume: topByVolume?.source || 'N/A',
    top_source_by_conversion: topByConversion?.source || 'N/A',
    worst_source_response: null, // Simplificado — usa broker level
    pipeline_bottleneck: bottleneck
      ? { stage: bottleneck.label, stuck_count: bottleneck.stuckCount, median_days: bottleneck.medianDays }
      : null,
    follow_up_exhaustion_rate_pct: followUp.total > 0
      ? Math.round((followUp.exhausted / followUp.total) * 1000) / 10
      : 0,
    revenue_won: revenueWon,
    revenue_in_pipeline: projection.pipelineWeighted,
    goal_progress_pct: projection.goalProgress,
    broker_count: brokers.length,
    top_broker: topBroker
      ? { name: topBroker.name, conversion_pct: topBroker.conversionRate }
      : null,
    worst_broker_response: worstBrokerResp && worstBrokerResp.avgResponseTimeMin > 0
      ? { name: worstBrokerResp.name, avg_min: worstBrokerResp.avgResponseTimeMin }
      : null,
  }
}
