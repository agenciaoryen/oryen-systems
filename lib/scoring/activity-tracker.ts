// lib/scoring/activity-tracker.ts
// Helper to log lead activities and trigger score recalculation

import { createClient } from '@supabase/supabase-js'
import { calculateLeadScore, SCORE_POINTS } from './lead-scorer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Tracks a lead activity, inserts it into lead_activity_log,
 * and recalculates the lead's score.
 */
export async function trackActivity(
  orgId: string,
  leadId: string,
  activityType: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Validate activity type
  if (!(activityType in SCORE_POINTS)) {
    console.warn(`[ActivityTracker] Unknown activity type: ${activityType}`)
  }

  // Insert activity log entry
  const { error } = await supabase.from('lead_activity_log').insert({
    org_id: orgId,
    lead_id: leadId,
    activity_type: activityType,
    metadata: metadata || null,
  })

  if (error) {
    console.error(`[ActivityTracker] Failed to insert activity: ${error.message}`)
    throw new Error(`Failed to track activity: ${error.message}`)
  }

  // Recalculate lead score
  try {
    await calculateLeadScore(orgId, leadId)
  } catch (e: any) {
    console.error(`[ActivityTracker] Failed to recalculate score for lead ${leadId}:`, e.message)
  }
}
