// Tipos compartilhados do módulo de Prospecção.
// Espelham os ENUMs e tabelas definidos em sql/prospection_module.sql.

export type ProspectionChannel = 'whatsapp' | 'email' | 'call'

export type ProspectionExecutionMode = 'automated' | 'manual'

export type ProspectionAssigneeMode =
  | 'specific_user'
  | 'team_round_robin'
  | 'role_based'

export type ProspectionEnrollmentStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'exited'

export type ProspectionTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'skipped'
  | 'overdue'
  | 'queued'

export type ProspectionCallOutcome =
  | 'answered_positive'
  | 'answered_neutral'
  | 'answered_rejected'
  | 'voicemail'
  | 'no_answer'
  | 'busy'
  | 'wrong_number'

export type ProspectionTriggerEvent =
  | 'lead_created'
  | 'stage_changed'
  | 'stale_in_stage'
  | 'tag_added'
  | 'manual'

// ─── Ações que uma outcomes_policy pode declarar ───
// Formato string que o motor interpreta:
//   'advance'              → avança pro próximo step
//   'retry_in_Xh'          → recria task daqui a X horas no mesmo step
//   'exit:reason'          → remove da sequence com motivo
//   'jump_to:position'     → pula pra step específico
export type OutcomeAction = string

export interface OutcomesPolicy {
  [key: string]: OutcomeAction
}

// ─── Mensagens do step ───
export interface MessageTemplate {
  variant: string          // 'A', 'B', 'IG-A', 'APERTURA', ...
  label?: string           // descrição curta pra UI
  body: string             // corpo da mensagem
  subject?: string         // só pra email
}

// ─── Entidades ───

export interface ProspectionSequence {
  id: string
  org_id: string
  name: string
  description: string | null
  is_active: boolean
  exit_on_reply: boolean
  pause_weekends: boolean
  timezone_mode: 'org' | 'lead_tz'
  business_hours_start: string | null
  business_hours_end: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProspectionStep {
  id: string
  sequence_id: string
  position: number
  day_offset: number
  channel: ProspectionChannel
  execution_mode: ProspectionExecutionMode
  agent_slug: string | null
  assignee_mode: ProspectionAssigneeMode
  assignee_user_id: string | null
  assignee_role: string | null
  whatsapp_instance_id: string | null
  title: string | null
  instruction: string | null
  message_templates: MessageTemplate[]
  outcomes_policy: OutcomesPolicy | null
  created_at: string
}

export interface ProspectionEnrollmentRule {
  id: string
  org_id: string
  sequence_id: string
  name: string
  description: string | null
  priority: number
  trigger_event: ProspectionTriggerEvent
  conditions: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProspectionEnrollment {
  id: string
  org_id: string
  sequence_id: string
  lead_id: string
  current_step_position: number
  status: ProspectionEnrollmentStatus
  exit_reason: string | null
  enrolled_at: string
  next_action_at: string | null
  paused_at: string | null
  completed_at: string | null
  enrolled_by_rule_id: string | null
  enrolled_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface ProspectionTask {
  id: string
  org_id: string
  enrollment_id: string
  step_id: string
  lead_id: string
  assignee_user_id: string | null
  due_at: string
  status: ProspectionTaskStatus
  outcome: ProspectionCallOutcome | null
  retry_of_task_id: string | null
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// ─── Views compostas (para a tela "Meu Dia") ───
export interface TaskWithContext extends ProspectionTask {
  step: ProspectionStep
  sequence: Pick<ProspectionSequence, 'id' | 'name'>
  lead: {
    id: string
    name: string
    phone: string | null
    email: string | null
    city: string | null
    stage: string | null
  }
}

// ─── Helpers ───
export const CHANNEL_LABELS: Record<ProspectionChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Ligação',
}

export const CALL_OUTCOME_LABELS: Record<ProspectionCallOutcome, string> = {
  answered_positive: 'Atendeu · positivo',
  answered_neutral: 'Atendeu · neutro',
  answered_rejected: 'Atendeu · rejeitou',
  voicemail: 'Caixa postal',
  no_answer: 'Não atendeu',
  busy: 'Ocupado',
  wrong_number: 'Número errado',
}

export const STATUS_LABELS: Record<ProspectionTaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluída',
  skipped: 'Pulada',
  overdue: 'Atrasada',
  queued: 'Na fila',
}
