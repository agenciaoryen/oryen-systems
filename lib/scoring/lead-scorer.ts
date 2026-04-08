// lib/scoring/lead-scorer.ts
// Core lead scoring logic with time decay

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- Point values per activity type ---

export const SCORE_POINTS: Record<string, number> = {
  inbound_message: 15,
  outbound_message: 2,
  meeting_scheduled: 25,
  meeting_attended: 30,
  meeting_no_show: -10,
  property_inquiry: 10,
  document_sent: 15,
  follow_up_responded: 20,
  follow_up_ignored: -5,
  stage_advanced: 15,
  stage_regressed: -10,
  long_inactivity: -15,
  positive_sentiment: 5,
  negative_sentiment: -5,
  site_lead: 5,
  manual_boost: 20,
}

// --- Label thresholds ---

export type ScoreLabel = 'hot' | 'warm' | 'cold' | 'lost'

const LOST_STAGES = ['perdido', 'lost']

export function getScoreLabel(score: number, stage: string): ScoreLabel {
  if (LOST_STAGES.includes((stage || '').toLowerCase())) {
    return 'lost'
  }
  if (score >= 56) return 'hot'
  if (score >= 26) return 'warm'
  return 'cold'
}

// --- Time decay helpers ---

function getDecayMultiplier(createdAt: string): number {
  const now = Date.now()
  const activityTime = new Date(createdAt).getTime()
  const daysDiff = (now - activityTime) / (1000 * 60 * 60 * 24)

  if (daysDiff > 60) return 0.25
  if (daysDiff > 30) return 0.5
  return 1
}

// --- Calculate score for a single lead ---

export async function calculateLeadScore(
  orgId: string,
  leadId: string
): Promise<{ score: number; label: ScoreLabel }> {
  // Fetch all activities for this lead
  const { data: activities, error } = await supabase
    .from('lead_activity_log')
    .select('activity_type, created_at')
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch activities: ${error.message}`)
  }

  let rawScore = 0

  if (activities && activities.length > 0) {
    for (const activity of activities) {
      const points = SCORE_POINTS[activity.activity_type] ?? 0
      const decay = getDecayMultiplier(activity.created_at)
      rawScore += points * decay
    }
  }

  // Check for long inactivity: last inbound message from lead > 7 days ago
  const { data: lastInbound } = await supabase
    .from('lead_activity_log')
    .select('created_at')
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .eq('activity_type', 'inbound_message')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastInbound) {
    const daysSince =
      (Date.now() - new Date(lastInbound.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
    if (daysSince > 7) {
      rawScore += SCORE_POINTS.long_inactivity
    }
  }

  // Clamp score to minimum 0
  const score = Math.max(0, Math.round(rawScore))

  // Fetch lead stage for label
  const { data: lead } = await supabase
    .from('leads')
    .select('stage')
    .eq('id', leadId)
    .single()

  const label = getScoreLabel(score, lead?.stage || '')

  // Persist score and label on the lead
  await supabase
    .from('leads')
    .update({ score, score_label: label })
    .eq('id', leadId)

  return { score, label }
}

// --- Recalculate scores for all leads in an org ---

export async function recalculateAllScores(orgId: string): Promise<number> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id')
    .eq('org_id', orgId)

  if (error) {
    throw new Error(`Failed to fetch leads: ${error.message}`)
  }

  if (!leads || leads.length === 0) return 0

  let updated = 0

  for (const lead of leads) {
    try {
      await calculateLeadScore(orgId, lead.id)
      updated++
    } catch (e) {
      console.error(`[LeadScorer] Failed to score lead ${lead.id}:`, e)
    }
  }

  return updated
}
