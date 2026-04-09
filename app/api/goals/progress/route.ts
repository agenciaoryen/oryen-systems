import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeGoalValue } from '@/lib/goals/aggregations'
import { getPaceStatus, getProjectedValue, getDaysElapsed, getDaysRemaining, getDaysTotal, getProgressPercentage } from '@/lib/goals/pace'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — compute real-time progress for all active goals
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const orgId = searchParams.get('org_id')
  const month = searchParams.get('month')

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  // Fetch active goals
  let goalsQuery = supabaseAdmin
    .from('org_goals')
    .select('*, goal_templates(*)')
    .eq('org_id', orgId)
    .eq('is_active', true)

  if (month) goalsQuery = goalsQuery.eq('period_start', month)

  const { data: goals, error: goalsError } = await goalsQuery

  if (goalsError) {
    return NextResponse.json({ error: goalsError.message }, { status: 500 })
  }

  if (!goals || goals.length === 0) {
    return NextResponse.json([])
  }

  // Fetch streaks
  const { data: streaks } = await supabaseAdmin
    .from('goal_streaks')
    .select('*')
    .eq('org_id', orgId)

  const streakMap = new Map(
    (streaks || []).map(s => [`${s.template_id}:${s.broker_id || 'org'}`, s])
  )

  // Fetch users for broker names
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .eq('org_id', orgId)

  const userMap = new Map((users || []).map(u => [u.id, u.name || 'Sem nome']))

  // Compute progress for each goal in parallel
  const results = await Promise.all(
    goals.map(async (goal) => {
      const periodStart = new Date(goal.period_start)
      const periodEnd = new Date(goal.period_end)
      const template = goal.goal_templates

      // Compute current value
      const currentValue = await computeGoalValue(
        supabaseAdmin,
        orgId,
        goal.template_id,
        periodStart,
        periodEnd,
        goal.broker_id,
        goal.current_value
      )

      // Update cached current_value
      if (currentValue !== goal.current_value) {
        await supabaseAdmin
          .from('org_goals')
          .update({ current_value: currentValue, updated_at: new Date().toISOString() })
          .eq('id', goal.id)
      }

      const daysElapsed = getDaysElapsed(periodStart)
      const daysRemaining = getDaysRemaining(periodEnd)
      const daysTotal = getDaysTotal(periodStart, periodEnd)
      const projected = getProjectedValue(currentValue, daysElapsed, daysTotal)
      const pace = getPaceStatus(currentValue, goal.target_value, daysElapsed, daysTotal, goal.template_id)
      const percentage = getProgressPercentage(currentValue, goal.target_value, goal.template_id)

      const streakKey = `${goal.template_id}:${goal.broker_id || 'org'}`
      const streak = streakMap.get(streakKey) || null

      // Fetch trend (last 3 months of snapshots or org_goals)
      const trend: number[] = []
      for (let i = 3; i >= 1; i--) {
        const prevMonth = new Date(periodStart)
        prevMonth.setMonth(prevMonth.getMonth() - i)
        const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`

        const { data: prevGoal } = await supabaseAdmin
          .from('org_goals')
          .select('current_value')
          .eq('org_id', orgId)
          .eq('template_id', goal.template_id)
          .eq('period_start', prevMonthStr)
          .maybeSingle()

        trend.push(prevGoal?.current_value || 0)
      }

      return {
        goal: { ...goal, current_value: currentValue },
        template,
        currentValue,
        targetValue: goal.target_value,
        percentage: Math.round(percentage * 10) / 10,
        pace,
        projectedValue: Math.round(projected),
        daysRemaining,
        daysElapsed,
        streak,
        trend,
      }
    })
  )

  return NextResponse.json(results)
}
