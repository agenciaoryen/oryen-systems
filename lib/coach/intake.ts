// lib/coach/intake.ts
// Pre-fetch CRM data snapshot for the Oryen Coach — parallel Supabase queries
// Pattern: follows lib/sdr/intake.ts — pure code, 0 tokens, ~100ms

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CoachDataSnapshot {
  leads: {
    total: number
    hot_leads: number
    new_today: number
    no_response: number
  }
  follow_ups: {
    pending: number
    overdue: number
    completed_today: number
    completion_rate: number
  }
  calendar: {
    meetings_today: number
    meetings_this_week: number
    visits_scheduled: number
  }
  deals: {
    in_negotiation: number
    total_pipeline_value: number
    closed_this_month: number
    closed_this_month_value: number
    avg_cycle_days: number | null
  }
  goals: {
    active: Array<{
      template_id: string
      target: number
      current: number
      pct: number
      pace: 'ahead' | 'on_track' | 'behind' | 'critical'
      projected: number
      days_remaining: number
    }>
    total_goals: number
    ahead_count: number
    behind_count: number
  }
  activity: {
    prospection_done_today: number
    messages_sent_today: number
    documents_pending: number
  }
  context: {
    org_name: string
    user_name: string
    org_niche: string
    org_language: string
    current_month: string
    days_elapsed: number
    days_remaining: number
    time_of_day: string
    day_of_week: string
  }
}

function getDaysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export async function loadCoachData(orgId: string, userId: string): Promise<CoachDataSnapshot> {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const todayStart = new Date(todayStr).toISOString()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Month boundaries
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const daysRemaining = daysInMonth - daysElapsed

  // Week boundaries
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000).toISOString()

  const [
    leadsTotalRes,
    hotLeadsRes,
    newTodayRes,
    noResponseRes,
    followUpsPendingRes,
    followUpsOverdueRes,
    followUpsDoneRes,
    followUpsDone7dRes,
    meetingsTodayRes,
    meetingsWeekRes,
    visitsScheduledRes,
    dealsNegRes,
    dealsWonRes,
    leadsAllRes,
    goalsRes,
    goalSnapshotsRes,
    prospectionDoneRes,
    messagesSentRes,
    docsPendingRes,
    orgRes,
    userRes,
  ] = await Promise.all([
    // Leads: total
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    // Leads: hot (score >= 56)
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('score', 56),
    // Leads: new today
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', todayStart),
    // Leads: no response (last sdr message from user > 3d with no recent assistant reply)
    supabase.from('sdr_messages').select('lead_id').eq('org_id', orgId).eq('role', 'user').lt('created_at', threeDaysAgo).limit(100),
    // Follow-ups: pending
    supabase.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['pending', 'active']),
    // Follow-ups: overdue (pending + next_attempt_at < now)
    supabase.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['pending', 'active']).lte('next_attempt_at', now.toISOString()),
    // Follow-ups: completed today
    supabase.from('follow_up_queue').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'responded').gte('responded_at', todayStart),
    // Follow-ups: last 7 days (for completion rate)
    supabase.from('follow_up_queue').select('status').eq('org_id', orgId).gte('created_at', sevenDaysAgo).limit(200),
    // Calendar: meetings today
    supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('event_date', todayStr).eq('status', 'scheduled'),
    // Calendar: meetings this week
    supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('event_date', weekStart).lte('event_date', todayStr).eq('status', 'scheduled'),
    // Calendar: visits scheduled
    supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('event_type', ['visit', 'visita']).eq('status', 'scheduled'),
    // Deals: in negotiation
    supabase.from('leads').select('id, total_em_vendas, updated_at').eq('org_id', orgId).in('stage', ['proposta', 'negociacao', 'fechamento', 'negotiation', 'proposal', 'closing']).gt('total_em_vendas', 0),
    // Deals: closed this month
    supabase.from('leads').select('id, total_em_vendas').eq('org_id', orgId).in('stage', ['won', 'ganhou', 'ganho', 'fechado']).gte('deal_closed_at', monthStart).lte('deal_closed_at', monthEnd),
    // All leads (for avg cycle days)
    supabase.from('leads').select('id, stage, created_at, deal_closed_at').eq('org_id', orgId).in('stage', ['won', 'ganhou', 'ganho', 'fechado', 'lost', 'perdido', 'perdeu']).not('deal_closed_at', 'is', null).gte('deal_closed_at', sevenDaysAgo).limit(50),
    // Goals: active
    supabase.from('org_goals').select('id, template_id, target_value, current_value').eq('org_id', orgId).eq('status', 'active').limit(10),
    // Goal snapshots (for pace/projection)
    supabase.from('goal_snapshots').select('goal_id, current_value, snapshot_date').eq('org_id', orgId).gte('snapshot_date', monthStart).order('snapshot_date', { ascending: false }).limit(50),
    // Activity: prospection tasks done today
    supabase.from('prospection_tasks').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'done').gte('completed_at', todayStart),
    // Activity: messages sent today (outbound from sdr_messages)
    supabase.from('sdr_messages').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'assistant').gte('created_at', todayStart),
    // Activity: documents pending
    supabase.from('lead_documents').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['draft', 'ready', 'sent']),
    // Org info
    supabase.from('orgs').select('name, niche, language').eq('id', orgId).single(),
    // User info
    supabase.from('users').select('full_name').eq('id', userId).single(),
  ])

  // Process no-response: unique leads
  const noRespLeads = new Set((noResponseRes.data || []).map((m: any) => m.lead_id))
  // Remove leads that have recent assistant replies
  if (noRespLeads.size > 0) {
    const leadIds = Array.from(noRespLeads)
    const { data: recentOutbound } = await supabase
      .from('sdr_messages')
      .select('lead_id')
      .eq('org_id', orgId)
      .eq('role', 'assistant')
      .in('lead_id', leadIds)
      .gte('created_at', threeDaysAgo)
      .limit(100)

    for (const m of recentOutbound || []) {
      noRespLeads.delete(m.lead_id)
    }
  }

  // Process goals
  const goalsList = goalsRes.data || []
  const snapshots = goalSnapshotsRes.data || []
  const snapshotByGoal = new Map<string, number[]>()
  for (const s of snapshots) {
    if (!snapshotByGoal.has(s.goal_id)) snapshotByGoal.set(s.goal_id, [])
    snapshotByGoal.get(s.goal_id)!.push(s.current_value)
  }

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const timeOfDay = now.getHours() < 12 ? 'manhã' : now.getHours() < 18 ? 'tarde' : 'noite'
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

  // Process deals
  const deals = dealsNegRes.data || []
  const dealsWon = dealsWonRes.data || []
  const allLeads = leadsAllRes.data || []
  let avgCycleDays: number | null = null
  if (allLeads.length > 0) {
    let totalDays = 0
    let count = 0
    for (const l of allLeads) {
      if (l.created_at && l.deal_closed_at) {
        const days = getDaysSince(l.created_at)
        if (days > 0) { totalDays += days; count++ }
      }
    }
    avgCycleDays = count > 0 ? Math.round(totalDays / count) : null
  }

  // Process follow-up completion rate
  const fuData = followUpsDone7dRes.data || []
  const fuTotal7d = fuData.length
  const fuCompleted7d = fuData.filter((f: any) => f.status === 'responded').length
  const completionRate = fuTotal7d > 0 ? Math.round((fuCompleted7d / fuTotal7d) * 100) : 0

  // Process goals with pace
  const activeGoals = goalsList.map((g: any) => {
    const pct = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0
    const projected = daysElapsed > 0 ? Math.round((g.current_value / daysElapsed) * daysInMonth) : 0
    const expectedPct = daysElapsed > 0 ? Math.round((daysElapsed / daysInMonth) * 100) : 0
    let pace: CoachDataSnapshot['goals']['active'][0]['pace'] = 'on_track'
    if (pct >= expectedPct + 10) pace = 'ahead'
    else if (pct < expectedPct - 20) pace = 'critical'
    else if (pct < expectedPct - 5) pace = 'behind'

    // Map template_id to display name
    const templateNames: Record<string, string> = {
      revenue: 'Receita',
      deals_closed: 'Negócios fechados',
      leads_captured: 'Leads captados',
      response_time: 'Tempo de resposta',
      follow_up_rate: 'Taxa de follow-up',
      meetings: 'Reuniões',
      conversion_rate: 'Taxa de conversão',
    }

    return {
      template_id: g.template_id,
      target: g.target_value,
      current: g.current_value,
      pct,
      pace,
      projected,
      days_remaining: daysRemaining,
    }
  })

  // Compute ahead/behind counts
  const aheadCount = activeGoals.filter((g) => g.pace === 'ahead').length
  const behindCount = activeGoals.filter((g) => g.pace === 'behind' || g.pace === 'critical').length

  return {
    leads: {
      total: leadsTotalRes.count || 0,
      hot_leads: hotLeadsRes.count || 0,
      new_today: newTodayRes.count || 0,
      no_response: noRespLeads.size,
    },
    follow_ups: {
      pending: followUpsPendingRes.count || 0,
      overdue: followUpsOverdueRes.count || 0,
      completed_today: followUpsDoneRes.count || 0,
      completion_rate: completionRate,
    },
    calendar: {
      meetings_today: meetingsTodayRes.count || 0,
      meetings_this_week: meetingsWeekRes.count || 0,
      visits_scheduled: visitsScheduledRes.count || 0,
    },
    deals: {
      in_negotiation: deals.length,
      total_pipeline_value: deals.reduce((sum: number, d: any) => sum + (d.total_em_vendas || 0), 0),
      closed_this_month: dealsWon.length,
      closed_this_month_value: dealsWon.reduce((sum: number, d: any) => sum + (d.total_em_vendas || 0), 0),
      avg_cycle_days: avgCycleDays,
    },
    goals: {
      active: activeGoals,
      total_goals: activeGoals.length,
      ahead_count: aheadCount,
      behind_count: behindCount,
    },
    activity: {
      prospection_done_today: prospectionDoneRes.count || 0,
      messages_sent_today: messagesSentRes.count || 0,
      documents_pending: docsPendingRes.count || 0,
    },
    context: {
      org_name: orgRes.data?.name || 'sua imobiliária',
      user_name: userRes.data?.full_name || 'Corretor',
      org_niche: orgRes.data?.niche || 'real_estate',
      org_language: orgRes.data?.language || 'pt',
      current_month: monthLabel,
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      time_of_day: timeOfDay,
      day_of_week: dayNames[dayOfWeek],
    },
  }
}
