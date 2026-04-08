// app/api/leads/score/route.ts
// POST: recalculate score for one lead or all leads in an org
// GET: get score and recent activities for a lead

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateLeadScore, recalculateAllScores } from '@/lib/scoring/lead-scorer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/leads/score?lead_id=xxx
 * Returns the lead's score, label, and 10 most recent activities.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const leadId = searchParams.get('lead_id')

    if (!leadId) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
    }

    // Fetch lead score and label
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, score, score_label, stage')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Fetch 10 most recent activities
    const { data: activities, error: actError } = await supabase
      .from('lead_activity_log')
      .select('id, activity_type, metadata, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (actError) {
      return NextResponse.json({ error: actError.message }, { status: 500 })
    }

    return NextResponse.json({
      score: lead.score ?? 0,
      label: lead.score_label ?? 'cold',
      activities: activities || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/leads/score
 * Body: { org_id, lead_id? }
 * If lead_id is provided, recalculate that lead only.
 * Otherwise, recalculate all leads in the org.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, lead_id } = body

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    let updated = 0

    if (lead_id) {
      await calculateLeadScore(org_id, lead_id)
      updated = 1
    } else {
      updated = await recalculateAllScores(org_id)
    }

    return NextResponse.json({ success: true, updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
