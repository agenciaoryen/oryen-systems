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

    const currentUserId = auth.userId
    const requestedView = request.nextUrl.searchParams.get('view') // 'all' | UUID | null
    const isAdmin = auth.role === 'admin' || auth.isStaff

    // Se requisitou view != próprio user e NÃO é admin → bloqueia
    if (requestedView && requestedView !== currentUserId && !isAdmin) {
      return NextResponse.json({ error: 'Sem permissão para ver o dia de outro usuário' }, { status: 403 })
    }

    // Resolve o view efetivo
    // - 'all'           → todas as tasks da org (só admin)
    // - UUID específico → tasks daquele user (só admin pode mudar)
    // - null/próprio    → tasks do próprio user
    const viewMode: 'self' | 'all' | 'user' =
      requestedView === 'all'
        ? 'all'
        : requestedView && requestedView !== currentUserId
          ? 'user'
          : 'self'
    const viewUserId = viewMode === 'user' ? requestedView : currentUserId

    const now = new Date()
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const endOfTomorrow = new Date(endOfToday)
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)

    // Capacidade diária do user visualizado
    const { data: userRow } = await supabase
      .from('users')
      .select('daily_task_capacity')
      .eq('id', viewUserId || currentUserId)
      .single()
    const dailyCapacity = userRow?.daily_task_capacity ?? 50

    // Monta a query de tasks
    let tasksQuery = supabase
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
        lead:leads(id, name, phone, email, city, stage),
        assignee:users!prospection_tasks_assignee_user_id_fkey(id, full_name)
      `)
      .eq('org_id', orgId)
      .in('status', ['pending', 'in_progress', 'overdue', 'queued'])
      .lte('due_at', endOfTomorrow.toISOString())
      .order('due_at', { ascending: true })

    if (viewMode === 'self') {
      // Próprio user: tasks dele + orfãs (sem assignee ainda)
      tasksQuery = tasksQuery.or(`assignee_user_id.eq.${currentUserId},assignee_user_id.is.null`)
    } else if (viewMode === 'user') {
      // Admin vendo um user específico: só tasks daquele user
      tasksQuery = tasksQuery.eq('assignee_user_id', viewUserId!)
    }
    // viewMode === 'all': sem filtro de assignee, mostra tudo da org

    const { data: rawTasks, error } = await tasksQuery

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

    let doneTodayQuery = supabase
      .from('prospection_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'done')
      .gte('completed_at', new Date(now.toISOString().slice(0, 10)).toISOString())

    if (viewMode === 'self' || viewMode === 'user') {
      doneTodayQuery = doneTodayQuery.eq('assignee_user_id', viewUserId!)
    }

    const doneTodayCount = await doneTodayQuery

    // Stages do pipeline ATIVO da org (pro modal de conclusão e pill inline)
    const { data: stageRows } = await supabase
      .from('pipeline_stages')
      .select('name, label, color, position')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position', { ascending: true })

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
      user_id: currentUserId,
      view_mode: viewMode,
      view_user_id: viewUserId,
      is_admin: isAdmin,
      stages: (stageRows || []).map((s: any) => ({
        value: s.name,
        label: s.label || s.name,
        color: s.color,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
