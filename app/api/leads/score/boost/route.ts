// app/api/leads/score/boost/route.ts
// POST: manually boost a lead's score by +20

import { NextRequest, NextResponse } from 'next/server'
import { trackActivity } from '@/lib/scoring/activity-tracker'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/leads/score/boost
 * Body: { org_id, lead_id }
 * Tracks a manual_boost activity (+20) and returns the new score.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, lead_id } = body

    if (!org_id || !lead_id) {
      return NextResponse.json(
        { error: 'org_id and lead_id required' },
        { status: 400 }
      )
    }

    // Verify lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', lead_id)
      .eq('org_id', org_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Track the manual boost activity (this also recalculates the score)
    await trackActivity(org_id, lead_id, 'manual_boost', {
      source: 'manual',
    })

    // Fetch updated score
    const { data: updated } = await supabase
      .from('leads')
      .select('score, score_label')
      .eq('id', lead_id)
      .single()

    return NextResponse.json({
      success: true,
      newScore: updated?.score ?? 0,
      newLabel: updated?.score_label ?? 'cold',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
