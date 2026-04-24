// GET /api/prospection/my-day
// Retorna as tasks do usuário autenticado agrupadas por "momento":
//   - overdue     → vencidas (due_at < now)
//   - now         → do momento atual (due_at entre now e now+1h)
//   - today       → resto do dia (due_at <= fim do dia)
//   - tomorrow    → dia seguinte (preview)
//   - responded   → leads que responderam e precisam de handoff manual
//
// Também retorna contagens e a capacidade diária do user.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, request.nextUrl.searchParams.get('org_id'))
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const userId = auth.userId

    const now = new Date()
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const endOfTomorrow = new Date(endOfToday)
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)

    // Capacidade diária do user
    const { data: userRow } = await supabase
      .from('users')
      .select('daily_task_capacity')
      .eq('id', userId)
      .single()
    const dailyCapacity = userRow?.daily_task_capacity ?? 50

    // Tasks ativas do user (ou team, onde assignee ainda é null)
    const { data: rawTasks, error } = await supabase
      .from('prospection_tasks')
      .select(`
        id, enrollment_id, step_id, lead_id, assignee_user_id,
        due_at, status, outcome, notes, created_at,
        step:prospection_steps(
          id, position, day_offset, channel, title, instruction,
          message_templates, outcomes_policy, execution_mode
        ),
        enrollment:prospection_enrollments(
          id, sequence_id, current_step_position, status,
          sequence:prospection_sequences(id, name)
        ),
        lead:leads(id, name, phone, email, city, stage)
      `)
      .eq('org_id', orgId)
      .in('status', ['pending', 'in_progress', 'overdue', 'queued'])
      .or(`assignee_user_id.eq.${userId},assignee_user_id.is.null`)
      .lte('due_at', endOfTomorrow.toISOString())
      .order('due_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tasks = rawTasks || []

    // Classifica cada task em seu bucket
    const buckets: {
      overdue: any[]
      now: any[]
      today: any[]
      tomorrow: any[]
    } = { overdue: [], now: [], today: [], tomorrow: [] }

    const nowPlus1h = new Date(now.getTime() + 60 * 60 * 1000)

    for (const t of tasks) {
      const due = new Date(t.due_at)
      if (due < now) {
        buckets.overdue.push(t)
      } else if (due <= nowPlus1h) {
        buckets.now.push(t)
      } else if (due <= endOfToday) {
        buckets.today.push(t)
      } else {
        buckets.tomorrow.push(t)
      }
    }

    // Leads que responderam e precisam de handoff (enrollments paused com exit_reason='replied')
    const { data: respondedEnrollments } = await supabase
      .from('prospection_enrollments')
      .select(`
        id, sequence_id, lead_id, status, exit_reason, paused_at, current_step_position,
        sequence:prospection_sequences(id, name),
        lead:leads(id, name, phone, email, city, stage)
      `)
      .eq('org_id', orgId)
      .eq('status', 'paused')
      .eq('exit_reason', 'replied')
      .order('paused_at', { ascending: false })
      .limit(20)

    const doneTodayCount = await supabase
      .from('prospection_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assignee_user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', new Date(now.toISOString().slice(0, 10)).toISOString())

    return NextResponse.json({
      buckets,
      responded: respondedEnrollments || [],
      counts: {
        overdue: buckets.overdue.length,
        now: buckets.now.length,
        today: buckets.today.length,
        tomorrow: buckets.tomorrow.length,
        responded: (respondedEnrollments || []).length,
        done_today: doneTodayCount.count || 0,
      },
      daily_capacity: dailyCapacity,
      user_id: userId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
