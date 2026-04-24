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
    const { outcome, notes, variant_used, move_to_stage } = body as {
      outcome?: string
      notes?: string
      variant_used?: string
      move_to_stage?: string | null
    }

    // Buscar task + step + enrollment
    const { data: task, error: taskErr } = await supabase
      .from('prospection_tasks')
      .select(`
        id, enrollment_id, step_id, lead_id, assignee_user_id, status, org_id,
        step:prospection_steps(id, position, channel, title, outcomes_policy, sequence_id),
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

    // 3. Sincronização com CRM (atividade no timeline, updated_at, assigned_to)
    await syncLeadWithCrm({
      orgId,
      leadId: task.lead_id,
      userId: auth.userId,
      step,
      outcome: outcome ?? null,
      variantUsed: variant_used ?? null,
      moveToStage: move_to_stage ?? null,
    })

    // 4. Executa ação no enrollment
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

  // Busca step atual (pra calcular delta de day_offset) e próximo em paralelo
  const [{ data: currentStep }, { data: nextStep }] = await Promise.all([
    supabase
      .from('prospection_steps')
      .select('day_offset')
      .eq('sequence_id', enrollment.sequence_id)
      .eq('position', enrollment.current_step_position)
      .maybeSingle(),
    supabase
      .from('prospection_steps')
      .select('*')
      .eq('sequence_id', enrollment.sequence_id)
      .eq('position', nextPosition)
      .maybeSingle(),
  ])

  if (!nextStep) {
    // Acabou a sequence
    await supabase
      .from('prospection_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        next_action_at: null,
      })
      .eq('id', enrollment.id)
    return
  }

  // Delta de dias entre o step atual e o próximo
  // Ex: atual=dia 1, próximo=dia 1 → delta 0 (dispara agora)
  // Ex: atual=dia 3, próximo=dia 5 → delta 2 (dispara em 2 dias)
  const delta = Math.max(
    (nextStep.day_offset || 0) - (currentStep?.day_offset || 0),
    0
  )
  const nextActionAt = new Date()
  nextActionAt.setDate(nextActionAt.getDate() + delta)

  // Avança enrollment
  await supabase
    .from('prospection_enrollments')
    .update({
      current_step_position: nextPosition,
      next_action_at: nextActionAt.toISOString(),
    })
    .eq('id', enrollment.id)

  // Cria a task do próximo step IMEDIATAMENTE (pra não depender do cron)
  // Se o step é automatizado (ex: email), deixa o motor disparar no próximo ciclo
  if (nextStep.execution_mode === 'manual') {
    const assigneeId = await resolveAssignee(orgId, nextStep)
    await supabase.from('prospection_tasks').insert({
      org_id: orgId,
      enrollment_id: enrollment.id,
      step_id: nextStep.id,
      lead_id: enrollment.lead_id,
      assignee_user_id: assigneeId,
      due_at: nextActionAt.toISOString(),
      status: 'pending',
    })
  }
}

// Resolve o assignee da próxima task (specific_user / role_based / team_round_robin)
async function resolveAssignee(orgId: string, step: any): Promise<string | null> {
  if (step.assignee_mode === 'specific_user') {
    return step.assignee_user_id
  }

  let query = supabase.from('users').select('id').eq('org_id', orgId)
  if (step.assignee_mode === 'role_based' && step.assignee_role) {
    query = query.eq('role', step.assignee_role)
  }

  const { data: users } = await query
  if (!users || users.length === 0) return null

  // Round-robin por quem tem menos tasks abertas
  const counts: { id: string; count: number }[] = []
  for (const u of users) {
    const { count } = await supabase
      .from('prospection_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assignee_user_id', u.id)
      .in('status', ['pending', 'in_progress', 'overdue', 'queued'])
    counts.push({ id: u.id, count: count || 0 })
  }
  counts.sort((a, b) => a.count - b.count)
  return counts[0]?.id || null
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

// ─── SINCRONIZAÇÃO COM CRM ───
// Quando uma task é concluída:
//   • registra evento na timeline do lead (lead_events)
//   • atualiza leads.updated_at (pra refletir atividade recente)
//   • se o lead não tem responsável, define o user que executou como responsável
//   • se o BDR escolheu move_to_stage, atualiza leads.stage e registra evento de stage change
async function syncLeadWithCrm(input: {
  orgId: string
  leadId: string
  userId: string
  step: any
  outcome: string | null
  variantUsed: string | null
  moveToStage: string | null
}) {
  const { orgId, leadId, userId, step, outcome, variantUsed, moveToStage } = input

  // Busca estado atual do lead
  const { data: lead } = await supabase
    .from('leads')
    .select('id, stage, assigned_to')
    .eq('id', leadId)
    .eq('org_id', orgId)
    .single()

  if (!lead) return

  // 1. Timeline: registra task concluída
  await supabase.from('lead_events').insert({
    org_id: orgId,
    lead_id: leadId,
    type: 'prospection_task_done',
    user_id: userId,
    content: `Etapa ${step.position} · ${step.title || step.channel} concluída${
      outcome ? ` (${outcome})` : ''
    }`,
    details: {
      step_position: step.position,
      step_title: step.title,
      channel: step.channel,
      outcome,
      variant_used: variantUsed,
    },
  })

  // 2. Atualiza leads (updated_at, assigned_to se null, stage se move_to_stage)
  const leadUpdate: Record<string, any> = { updated_at: new Date().toISOString() }
  if (!lead.assigned_to) {
    leadUpdate.assigned_to = userId
  }
  if (moveToStage && moveToStage !== lead.stage) {
    leadUpdate.stage = moveToStage
  }

  await supabase.from('leads').update(leadUpdate).eq('id', leadId).eq('org_id', orgId)

  // 3. Se mudou stage, registra evento dedicado pra relatórios de fluxo
  if (moveToStage && moveToStage !== lead.stage) {
    await supabase.from('lead_events').insert({
      org_id: orgId,
      lead_id: leadId,
      type: 'stage_changed',
      user_id: userId,
      content: `Estágio alterado de "${lead.stage}" para "${moveToStage}"`,
      details: {
        from_stage: lead.stage,
        to_stage: moveToStage,
        source: 'prospection',
      },
    })
  }
}
