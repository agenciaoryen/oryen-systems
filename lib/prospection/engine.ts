// Motor do módulo de Prospecção.
// Roda periodicamente via Vercel Cron (/api/cron/prospection) e executa:
//
//   1. advanceEnrollments() — para cada enrollment ativo cujo next_action_at
//      já passou, executa o step atual:
//      • automated → dispara direto (ex: BDR Email)
//      • manual → cria task com assignee resolvido
//
//   2. markOverdueTasks() — tasks pending com due_at < now viram 'overdue'
//
//   3. processStaleLeads() — para cada rule com trigger_event='stale_in_stage',
//      varre leads parados no stage há N dias e tenta inscrevê-los
//
// Todas as operações usam service_role (bypassa RLS) pois rodam no servidor.

import { createClient } from '@supabase/supabase-js'
import { sendColdEmail } from '@/lib/email/sender'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT — chamado pelo cron
// ═══════════════════════════════════════════════════════════════════════════════

export interface EngineCycleResult {
  advanced: number
  tasks_created: number
  automated_executed: number
  overdue_marked: number
  stale_enrolled: number
  errors: string[]
}

export async function runFullCycle(): Promise<EngineCycleResult> {
  const result: EngineCycleResult = {
    advanced: 0,
    tasks_created: 0,
    automated_executed: 0,
    overdue_marked: 0,
    stale_enrolled: 0,
    errors: [],
  }

  try {
    const overdue = await markOverdueTasks()
    result.overdue_marked = overdue
  } catch (e: any) {
    result.errors.push(`overdue: ${e.message}`)
  }

  try {
    const adv = await advanceEnrollments()
    result.advanced = adv.advanced
    result.tasks_created = adv.tasks_created
    result.automated_executed = adv.automated_executed
  } catch (e: any) {
    result.errors.push(`advance: ${e.message}`)
  }

  try {
    const stale = await processStaleLeads()
    result.stale_enrolled = stale
  } catch (e: any) {
    result.errors.push(`stale: ${e.message}`)
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AVANÇAR ENROLLMENTS
// Para cada enrollment active cujo next_action_at <= now, executa o step atual.
// ═══════════════════════════════════════════════════════════════════════════════

async function advanceEnrollments() {
  const now = new Date().toISOString()

  const { data: enrollments, error } = await supabase
    .from('prospection_enrollments')
    .select(`
      id, org_id, sequence_id, lead_id, current_step_position, next_action_at
    `)
    .eq('status', 'active')
    .lte('next_action_at', now)
    .order('next_action_at', { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)
  if (!enrollments || enrollments.length === 0) {
    return { advanced: 0, tasks_created: 0, automated_executed: 0 }
  }

  let advanced = 0
  let tasksCreated = 0
  let automatedExecuted = 0

  for (const e of enrollments) {
    // Busca o step atual
    const { data: step } = await supabase
      .from('prospection_steps')
      .select('*')
      .eq('sequence_id', e.sequence_id)
      .eq('position', e.current_step_position)
      .maybeSingle()

    if (!step) {
      // Não há step nessa posição — enrollment completa
      await supabase
        .from('prospection_enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString(), next_action_at: null })
        .eq('id', e.id)
      advanced++
      continue
    }

    try {
      if (step.execution_mode === 'automated') {
        await executeAutomatedStep(e, step)
        automatedExecuted++
      } else {
        await createManualTask(e, step)
        tasksCreated++
      }

      // Enquanto não houver resposta do lead (manual) ou concluir (automated),
      // deixamos o enrollment parado — quem avança é a conclusão da task.
      // Porém pra steps automated, já avançamos o enrollment aqui.
      if (step.execution_mode === 'automated') {
        await advanceToNextStep(e.id, e.sequence_id, e.current_step_position)
        advanced++
      } else {
        // Pra manual, zeramos next_action_at pra não reprocessar (a task leva o controle)
        await supabase
          .from('prospection_enrollments')
          .update({ next_action_at: null })
          .eq('id', e.id)
      }
    } catch (err: any) {
      // Loga erro no step_executions e segue
      await supabase.from('prospection_step_executions').insert({
        org_id: e.org_id,
        enrollment_id: e.id,
        step_id: step.id,
        lead_id: e.lead_id,
        result: 'failed',
        metadata: { error: err.message },
      })
      console.error(`[prospection engine] step ${step.id} failed for enrollment ${e.id}:`, err)
    }
  }

  return { advanced, tasks_created: tasksCreated, automated_executed: automatedExecuted }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Avança enrollment para o próximo step (ou completa)
// ═══════════════════════════════════════════════════════════════════════════════

async function advanceToNextStep(
  enrollmentId: string,
  sequenceId: string,
  currentPosition: number
) {
  const nextPosition = currentPosition + 1

  const { data: nextStep } = await supabase
    .from('prospection_steps')
    .select('id, day_offset')
    .eq('sequence_id', sequenceId)
    .eq('position', nextPosition)
    .maybeSingle()

  if (!nextStep) {
    await supabase
      .from('prospection_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        next_action_at: null,
      })
      .eq('id', enrollmentId)
    return
  }

  // nextActionAt = agora + dias até next_step
  // Como o day_offset é relativo ao início do enrollment, simplificamos pra
  // "daqui a (day_offset do next step - day_offset do atual) dias".
  // Como não temos o atual aqui, vamos usar apenas o offset pra frente:
  // se o step atual era dia 2 e o próximo é dia 5, espera 3 dias.
  // Pra simplificar, usamos day_offset do próximo como "daqui X dias":
  // step anterior tinha day_offset Y, próximo tem Z, intervalo = Z - Y
  const { data: currentStep } = await supabase
    .from('prospection_steps')
    .select('day_offset')
    .eq('sequence_id', sequenceId)
    .eq('position', currentPosition)
    .maybeSingle()

  const delta = Math.max((nextStep.day_offset || 0) - (currentStep?.day_offset || 0), 0)
  const nextActionAt = new Date()
  nextActionAt.setDate(nextActionAt.getDate() + delta)

  await supabase
    .from('prospection_enrollments')
    .update({
      current_step_position: nextPosition,
      next_action_at: nextActionAt.toISOString(),
    })
    .eq('id', enrollmentId)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EXECUÇÃO DE STEPS AUTOMATIZADOS
// Hoje suportamos: bdr_email (dispara email via Resend)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeAutomatedStep(enrollment: any, step: any) {
  if (step.agent_slug === 'bdr_email') {
    await executeBdrEmailStep(enrollment, step)
    return
  }

  // Agents futuros: 'sdr', 'hunter', etc.
  throw new Error(`Agent não suportado: ${step.agent_slug}`)
}

async function executeBdrEmailStep(enrollment: any, step: any) {
  // Busca dados do lead
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, phone, city')
    .eq('id', enrollment.lead_id)
    .single()

  if (!lead) throw new Error('Lead não encontrado')
  if (!lead.email) {
    // Sem email, loga skip
    await supabase.from('prospection_step_executions').insert({
      org_id: enrollment.org_id,
      enrollment_id: enrollment.id,
      step_id: step.id,
      lead_id: enrollment.lead_id,
      result: 'skipped',
      metadata: { reason: 'lead_without_email' },
    })
    return
  }

  // Busca org (para o from name)
  const { data: org } = await supabase
    .from('orgs')
    .select('name')
    .eq('id', enrollment.org_id)
    .single()

  // Seleciona 1a variação do step (pode ser expandido pra rotacionar/AB)
  const templates = Array.isArray(step.message_templates) ? step.message_templates : []
  const tpl = templates[0]
  if (!tpl) throw new Error('Step sem message_templates')

  const subject = renderTemplate(tpl.subject || 'Continuação de nosso contato', { lead })
  const body = renderTemplate(tpl.body || '', { lead, org })

  await sendColdEmail({
    to: lead.email,
    subject,
    bodyText: body,
    fromName: org?.name || 'Oryen',
  })

  // Loga execução
  await supabase.from('prospection_step_executions').insert({
    org_id: enrollment.org_id,
    enrollment_id: enrollment.id,
    step_id: step.id,
    lead_id: enrollment.lead_id,
    result: 'success',
    variant_used: tpl.variant || 'A',
    metadata: { subject, channel: 'email' },
  })
}

function renderTemplate(body: string, ctx: { lead: any; org?: any }): string {
  return body
    .replace(/\{\{nombre\}\}/g, ctx.lead?.name || '')
    .replace(/\{\{nome\}\}/g, ctx.lead?.name || '')
    .replace(/\{\{name\}\}/g, ctx.lead?.name || '')
    .replace(/\{\{empresa\}\}/g, ctx.org?.name || '')
    .replace(/\{\{org\}\}/g, ctx.org?.name || '')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CRIAR TASK MANUAL (com resolução de assignee)
// ═══════════════════════════════════════════════════════════════════════════════

async function createManualTask(enrollment: any, step: any) {
  const assigneeUserId = await resolveAssignee(enrollment.org_id, step)

  const dueAt = new Date() // due agora mesmo (ou poderíamos respeitar business_hours)

  await supabase.from('prospection_tasks').insert({
    org_id: enrollment.org_id,
    enrollment_id: enrollment.id,
    step_id: step.id,
    lead_id: enrollment.lead_id,
    assignee_user_id: assigneeUserId,
    due_at: dueAt.toISOString(),
    status: 'pending',
  })
}

async function resolveAssignee(orgId: string, step: any): Promise<string | null> {
  if (step.assignee_mode === 'specific_user') {
    // Se o user específico está em opt-out (capacity=0), respeita e não atribui.
    if (!step.assignee_user_id) return null
    const { data: u } = await supabase
      .from('users')
      .select('id, daily_task_capacity')
      .eq('id', step.assignee_user_id)
      .maybeSingle()
    if (!u || (u.daily_task_capacity ?? 0) <= 0) return null
    return u.id
  }

  // team_round_robin ou role_based: escolhe user com menos tasks abertas
  // entre os que NÃO estão em opt-out (daily_task_capacity > 0).
  let query = supabase
    .from('users')
    .select('id, daily_task_capacity')
    .eq('org_id', orgId)
    .gt('daily_task_capacity', 0)
    .neq('status', 'inactive')

  if (step.assignee_mode === 'role_based' && step.assignee_role) {
    query = query.eq('role', step.assignee_role)
  }

  const { data: users } = await query

  if (!users || users.length === 0) return null

  // Para cada user, conta tasks abertas + tasks criadas hoje (contra limite diário)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  type Candidate = { id: string; openCount: number; todayCount: number; capacity: number }
  const candidates: Candidate[] = []
  for (const u of users) {
    const { count: openCount } = await supabase
      .from('prospection_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assignee_user_id', u.id)
      .in('status', ['pending', 'in_progress', 'overdue', 'queued'])

    const { count: todayCount } = await supabase
      .from('prospection_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assignee_user_id', u.id)
      .gte('created_at', todayStart.toISOString())

    candidates.push({
      id: u.id,
      openCount: openCount || 0,
      todayCount: todayCount || 0,
      capacity: u.daily_task_capacity ?? 50,
    })
  }

  // Filtra quem ainda tem capacidade hoje
  const available = candidates.filter((c) => c.todayCount < c.capacity)
  if (available.length === 0) return null

  // Round-robin pelo menor número de tasks abertas
  available.sort((a, b) => a.openCount - b.openCount)
  return available[0]?.id || null
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MARCAR TASKS OVERDUE
// ═══════════════════════════════════════════════════════════════════════════════

async function markOverdueTasks(): Promise<number> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('prospection_tasks')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_at', now)
    .select('id')

  if (error) throw new Error(error.message)
  return data?.length || 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PROCESSAR STALE LEADS
// Para cada rule com trigger_event='stale_in_stage' e stale_days configurado,
// varre leads no stage por mais de N dias e tenta inscrever.
// ═══════════════════════════════════════════════════════════════════════════════

async function processStaleLeads(): Promise<number> {
  const { data: rules, error } = await supabase
    .from('prospection_enrollment_rules')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_event', 'stale_in_stage')

  if (error) throw new Error(error.message)
  if (!rules || rules.length === 0) return 0

  let enrolled = 0

  for (const rule of rules) {
    const conditions = rule.conditions || {}
    const stage = conditions.stage
    const staleDays = Number(conditions.stale_days || 0)

    if (!stage || staleDays <= 0) continue

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - staleDays)

    // Busca leads da org no stage parados há >= staleDays
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('org_id', rule.org_id)
      .eq('stage', stage)
      .lt('updated_at', cutoff.toISOString())
      .limit(100)

    if (!leads) continue

    for (const lead of leads) {
      // Chama função SQL que faz todo o check + enroll
      const { data: result } = await supabase.rpc('prospection_try_enroll_lead', {
        p_lead_id: lead.id,
        p_event: 'stale_in_stage',
      })
      if (result) enrolled++
    }
  }

  return enrolled
}
