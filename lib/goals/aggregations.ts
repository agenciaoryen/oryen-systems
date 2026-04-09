// lib/goals/aggregations.ts
// Auto-tracking functions — each goal type has a query that computes current value from CRM data

import type { SupabaseClient } from '@supabase/supabase-js'

type GoalTracker = (
  supabase: SupabaseClient,
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
  brokerId?: string | null
) => Promise<number>

// ═══════════════════════════════════════════════════════════════════════════════
// 1. REVENUE — SUM(amount) from financial_transactions WHERE type='revenue'
// ═══════════════════════════════════════════════════════════════════════════════

export const trackRevenue: GoalTracker = async (supabase, orgId, periodStart, periodEnd, brokerId) => {
  const refMonth = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}-01`

  let query = supabase
    .from('financial_transactions')
    .select('amount')
    .eq('org_id', orgId)
    .eq('type', 'revenue')
    .eq('status', 'confirmed')
    .eq('reference_month', refMonth)

  if (brokerId) query = query.eq('broker_id', brokerId)

  const { data } = await query
  return (data || []).reduce((sum, r) => sum + Number(r.amount), 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DEALS CLOSED — COUNT leads in is_won stages within period
// ═══════════════════════════════════════════════════════════════════════════════

export const trackDealsClosed: GoalTracker = async (supabase, orgId, periodStart, periodEnd, brokerId) => {
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  // Get won stage names
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('org_id', orgId)
    .eq('is_won', true)

  if (!stages || stages.length === 0) return 0
  const wonNames = stages.map(s => s.name)

  let query = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('stage', wonNames)
    .gte('deal_closed_at', start)
    .lte('deal_closed_at', end)

  if (brokerId) query = query.eq('assigned_to', brokerId)

  const { count } = await query
  return count || 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. LEADS CAPTURED — COUNT leads created in period
// ═══════════════════════════════════════════════════════════════════════════════

export const trackLeadsCaptured: GoalTracker = async (supabase, orgId, periodStart, periodEnd, brokerId) => {
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  let query = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (brokerId) query = query.eq('assigned_to', brokerId)

  const { count } = await query
  return count || 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RESPONSE TIME — AVG minutes between assigned_at and first_response_at
// ═══════════════════════════════════════════════════════════════════════════════

export const trackResponseTime: GoalTracker = async (supabase, orgId, periodStart, periodEnd, brokerId) => {
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  let query = supabase
    .from('leads')
    .select('assigned_at, first_response_at')
    .eq('org_id', orgId)
    .not('assigned_at', 'is', null)
    .not('first_response_at', 'is', null)
    .gte('created_at', start)
    .lte('created_at', end)

  if (brokerId) query = query.eq('assigned_to', brokerId)

  const { data } = await query
  if (!data || data.length === 0) return 0

  let totalMinutes = 0
  let count = 0

  for (const lead of data) {
    if (lead.assigned_at && lead.first_response_at) {
      const diff = new Date(lead.first_response_at).getTime() - new Date(lead.assigned_at).getTime()
      if (diff > 0) {
        totalMinutes += diff / (1000 * 60)
        count++
      }
    }
  }

  return count > 0 ? Math.round(totalMinutes / count) : 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FOLLOW-UP RATE — % of follow-ups responded
// ═══════════════════════════════════════════════════════════════════════════════

export const trackFollowUpRate: GoalTracker = async (supabase, orgId, periodStart, periodEnd) => {
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  const { data } = await supabase
    .from('follow_up_queue')
    .select('status')
    .eq('org_id', orgId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (!data || data.length === 0) return 0

  const responded = data.filter(f => f.status === 'responded').length
  return Math.round((responded / data.length) * 100)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MEETINGS — COUNT calendar_events in period
// ═══════════════════════════════════════════════════════════════════════════════

export const trackMeetings: GoalTracker = async (supabase, orgId, periodStart, periodEnd, brokerId) => {
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  let query = supabase
    .from('calendar_events')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (brokerId) query = query.eq('user_id', brokerId)

  const { count } = await query
  return count || 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CONVERSION RATE — % leads won / total leads
// ═══════════════════════════════════════════════════════════════════════════════

export const trackConversionRate: GoalTracker = async (supabase, orgId, periodStart, periodEnd, brokerId) => {
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  // Get won stage names
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('org_id', orgId)
    .eq('is_won', true)

  const wonNames = (stages || []).map(s => s.name)

  let totalQuery = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', start)
    .lte('created_at', end)

  if (brokerId) totalQuery = totalQuery.eq('assigned_to', brokerId)

  const { count: total } = await totalQuery
  if (!total || total === 0) return 0

  let wonQuery = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('stage', wonNames)
    .gte('created_at', start)
    .lte('created_at', end)

  if (brokerId) wonQuery = wonQuery.eq('assigned_to', brokerId)

  const { count: won } = await wonQuery
  return Math.round(((won || 0) / total) * 100)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKER MAP — maps template_id to tracking function
// ═══════════════════════════════════════════════════════════════════════════════

export const TRACKER_MAP: Record<string, GoalTracker> = {
  revenue: trackRevenue,
  deals_closed: trackDealsClosed,
  leads_captured: trackLeadsCaptured,
  response_time: trackResponseTime,
  follow_up_rate: trackFollowUpRate,
  meetings: trackMeetings,
  conversion_rate: trackConversionRate,
}

/**
 * Compute current value for a goal. Returns the tracked value or the manual current_value.
 */
export async function computeGoalValue(
  supabase: SupabaseClient,
  orgId: string,
  templateId: string,
  periodStart: Date,
  periodEnd: Date,
  brokerId?: string | null,
  manualValue?: number
): Promise<number> {
  const tracker = TRACKER_MAP[templateId]
  if (!tracker) return manualValue || 0
  return tracker(supabase, orgId, periodStart, periodEnd, brokerId)
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD COACH PAYLOAD — compact JSON for AI coaching
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoachPayload {
  org_name: string
  month: string
  days_elapsed: number
  days_remaining: number
  goals: {
    type: string
    target: number
    current: number
    pct: number
    pace_projected: number
    streak: number
  }[]
  team_size: number
}

export function buildCoachPayload(
  orgName: string,
  month: string,
  daysElapsed: number,
  daysRemaining: number,
  goals: { templateId: string; target: number; current: number; pct: number; projected: number; streak: number }[],
  teamSize: number
): CoachPayload {
  return {
    org_name: orgName,
    month,
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    goals: goals.map(g => ({
      type: g.templateId,
      target: g.target,
      current: g.current,
      pct: Math.round(g.pct),
      pace_projected: Math.round(g.projected),
      streak: g.streak,
    })),
    team_size: teamSize,
  }
}
