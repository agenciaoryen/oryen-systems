import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — current streaks for org
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const orgId = searchParams.get('org_id')

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('goal_streaks')
    .select('*')
    .eq('org_id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — evaluate month-end streaks
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { org_id, month } = body

  if (!org_id || !month) {
    return NextResponse.json({ error: 'org_id and month required' }, { status: 400 })
  }

  // Get all goals for the month
  const { data: goals } = await supabaseAdmin
    .from('org_goals')
    .select('template_id, broker_id, target_value, current_value')
    .eq('org_id', org_id)
    .eq('period_start', month)
    .eq('is_active', true)

  if (!goals || goals.length === 0) {
    return NextResponse.json({ evaluated: 0 })
  }

  let evaluated = 0

  for (const goal of goals) {
    const achieved = goal.current_value >= goal.target_value
    const brokerKey = goal.broker_id || null

    // Get or create streak
    const { data: existing } = await supabaseAdmin
      .from('goal_streaks')
      .select('*')
      .eq('org_id', org_id)
      .eq('template_id', goal.template_id)
      .is('broker_id', brokerKey)
      .maybeSingle()

    if (existing) {
      const newStreak = achieved ? existing.current_streak + 1 : 0
      const bestStreak = Math.max(existing.best_streak, newStreak)

      await supabaseAdmin
        .from('goal_streaks')
        .update({
          current_streak: newStreak,
          best_streak: bestStreak,
          last_achieved_month: achieved ? month : existing.last_achieved_month,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin
        .from('goal_streaks')
        .insert({
          org_id: org_id,
          template_id: goal.template_id,
          broker_id: brokerKey,
          current_streak: achieved ? 1 : 0,
          best_streak: achieved ? 1 : 0,
          last_achieved_month: achieved ? month : null,
        })
    }

    evaluated++
  }

  return NextResponse.json({ evaluated })
}
