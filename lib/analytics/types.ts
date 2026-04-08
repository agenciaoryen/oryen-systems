// lib/analytics/types.ts
// Tipos para o módulo AI Analytics v2.4

export type AnalyticsRange = 7 | 15 | 30 | 90

export interface FunnelStage {
  id: string
  name: string
  label: string
  color: string
  position: number
  isWon: boolean
  isLost: boolean
  leadCount: number
  stuckCount: number       // leads parados > 5 dias
  medianDays: number       // dias medianos no stage
  totalValue: number       // soma de total_em_vendas
  conversionFromPrev: number  // % que avançou do stage anterior
}

export interface SourceConversion {
  source: string
  totalLeads: number
  wonLeads: number
  conversionRate: number   // 0-100
  avgDealValue: number
  estimatedRevenue: number
}

export interface BrokerStats {
  userId: string
  name: string
  activeLeads: number
  wonLeads: number
  conversionRate: number
  avgResponseTimeMin: number
  followUpResponded: number
  followUpExhausted: number
  followUpTotal: number
}

export interface PipelineVelocity {
  stageId: string
  stageName: string
  stageLabel: string
  stageColor: string
  position: number
  medianDays: number
  leadCount: number
  stuckCount: number
}

export interface FollowUpStats {
  pending: number
  active: number
  responded: number
  exhausted: number
  cancelled: number
  total: number
  responseRate: number     // responded / total * 100
}

export interface SentimentPoint {
  date: string             // YYYY-MM-DD
  positive: number
  neutral: number
  negative: number
}

export interface RevenueProjection {
  closedThisMonth: number
  pipelineWeighted: number
  projected: number        // closedThisMonth + pipelineWeighted
  goalAmount: number | null
  goalProgress: number | null  // 0-100 se goal existe
  byStage: Array<{
    stageName: string
    stageLabel: string
    stageColor: string
    totalValue: number
    probability: number
    weightedValue: number
  }>
}

export interface InsightPayload {
  period_days: number
  leads_captured: number
  leads_won: number
  conversion_rate_pct: number
  conversion_rate_prev_period_pct: number
  avg_response_time_min: number
  top_source_by_volume: string
  top_source_by_conversion: string
  worst_source_response: { source: string; avg_min: number } | null
  pipeline_bottleneck: { stage: string; stuck_count: number; median_days: number } | null
  follow_up_exhaustion_rate_pct: number
  revenue_won: number
  revenue_in_pipeline: number
  goal_progress_pct: number | null
  broker_count: number
  top_broker: { name: string; conversion_pct: number } | null
  worst_broker_response: { name: string; avg_min: number } | null
}

export interface AIInsightResult {
  insight: string
  alerts: string[]
  generated_at: string
}
