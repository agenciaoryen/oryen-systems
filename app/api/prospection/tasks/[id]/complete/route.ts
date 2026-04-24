// POST /api/prospection/tasks/:id/complete
// Marca a task como concluída, registra log em step_executions e avança o enrollment.
// Para tasks de call, recebe um "outcome" que define o comportamento:
//   answered_positive → advance
//   voicemail / no_answer / busy → retry em X horas
//   answered_rejected / wrong_number → exit
//   (configurável via step.outcomes_policy)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { id: taskId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { outcome, notes, variant_used } = body as {
      outcome?: string
      notes?: string
      variant_used?: string
    }

    // Buscar task + step + enrollment
    const { data: task, error: taskErr } = await supabase
      .from('prospection_tasks')
      .select(`
        id, enrollment_id, step_id, lead_id, assignee_user_id, status, org_id,
        step:prospection_steps(id, position, channel, outcomes_policy, sequence_id),
        enrollment:prospection_enrollments(id, sequence_id, current_step_position, status, org_id)
      `)
      .eq('id', taskId)
      .eq('org_id', orgId)
      .single()

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 })
    }

    if (task.status === 'done') {
      return NextResponse.json({ error: 'Task já concluída' }, { status: 400 })
    }

    const step = Array.isArray(task.step) ? task.step[0] : task.step
    const enrollment = Array.isArray(task.enrollment) ? task.enrollment[0] : task.enrollment

    if (!step || !enrollment) {
      return NextResponse.json({ error: 'Step ou enrollment inválido' }, { status: 500 })
    }

    // Resolver ação baseada em outcome (pra calls) ou advance padrão
    let action: string = 'advance'
    if (step.channel === 'call' && outcome && step.outcomes_policy) {
      const policy = step.outcomes_policy as Record<string, string>
      action = policy[outcome] ?? 'advance'
    }

    const now = new Date().toISOString()

    // 1. Marca task como done
    await supabase
      .from('prospection_tasks')
      .update({
        status: 'done',
        outcome: outcome ?? null,
        notes: notes ?? null,
        completed_at: now,
        assignee_user_id: task.assignee_user_id ?? auth.userId,
      })
      .eq('id', taskId)

    // 2. Loga execução
    await supabase.from('prospection_step_executions').insert({
      org_id: orgId,
      enrollment_id: enrollment.id,
      step_id: step.id,
      lead_id: task.lead_id,
      result: 'success',
      outcome: outcome ?? null,
      executed_by_user_id: auth.userId,
      variant_used: variant_used ?? null,
    })

    // 3. Executa ação no enrollment
    await executeAction(action, enrollment, task, orgId)

    return NextResponse.json({ ok: true, action })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Executor de ação do outcome ───
async function executeAction(
  action: string,
  enrollment: any,
  task: any,
  orgId: string
) {
  if (action === 'advance') {
    await advanceEnrollment(enrollment, orgId)
    return
  }

  if (action.startsWith('retry_in_')) {
    const hours = parseInt(action.replace('retry_in_', '').replace('h', ''), 10)
    if (Number.isFinite(hours) && hours > 0) {
      await createRetryTask(task, hours)
    }
    return
  }

  if (action.startsWith('exit:')) {
    const reason = action.replace('exit:', '')
    await supabase
      .from('prospection_enrollments')
      .update({
        status: 'exited',
        exit_reason: reason,
        completed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)
    return
  }

  if (action.startsWith('jump_to:')) {
    const newPosition = parseInt(action.replace('jump_to:', ''), 10)
    if (Number.isFinite(newPosition)) {
      await supabase
        .from('prospection_enrollments')
        .update({ current_step_position: newPosition, next_action_at: null })
        .eq('id', enrollment.id)
    }
    return
  }
}

async function advanceEnrollment(enrollment: any, orgId: string) {
  const nextPosition = enrollment.current_step_position + 1

  // Verifica se há próximo step
  const { data: nextStep } = await supabase
    .from('prospection_steps')
    .select('id, position, day_offset')
    .eq('sequence_id', enrollment.sequence_id)
    .eq('position', nextPosition)
    .maybeSingle()

  if (!nextStep) {
    // Acabou a sequence
    await supabase
      .from('prospection_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)
    return
  }

  // Atualiza enrollment pro próximo step e define next_action_at
  const nextActionAt = new Date()
  nextActionAt.setDate(nextActionAt.getDate() + (nextStep.day_offset || 0))

  await supabase
    .from('prospection_enrollments')
    .update({
      current_step_position: nextPosition,
      next_action_at: nextActionAt.toISOString(),
    })
    .eq('id', enrollment.id)
}

async function createRetryTask(originalTask: any, hoursDelay: number) {
  const retryDue = new Date()
  retryDue.setHours(retryDue.getHours() + hoursDelay)

  await supabase.from('prospection_tasks').insert({
    org_id: originalTask.org_id,
    enrollment_id: originalTask.enrollment_id,
    step_id: originalTask.step_id,
    lead_id: originalTask.lead_id,
    assignee_user_id: originalTask.assignee_user_id,
    due_at: retryDue.toISOString(),
    status: 'pending',
    retry_of_task_id: originalTask.id,
  })
}
