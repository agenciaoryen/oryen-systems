import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'

// GET — current streaks for org
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const orgId = resolveOrgId(auth, searchParams.get('org_id'))

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
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const org_id = resolveOrgId(auth, body.org_id)
  const { month } = body

  if (!month) {
    return NextResponse.json({ error: 'month required' }, { status: 400 })
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
