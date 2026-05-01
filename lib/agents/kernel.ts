// lib/agents/kernel.ts
// ═══════════════════════════════════════════════════════════════════════════════
// KERNEL DE EXECUÇÃO DE AGENTES IA
//
// Função única `runAgentCapability` por onde TODA execução de agente passa.
// Garante, na ordem:
//   1. Identidade — busca org + agent
//   2. Gate de plano (planHasAgent) e estado (is_active, is_paused, is_inactive)
//   3. Capability — está no catálogo? Esse agente está autorizado a executar?
//   4. Aprovação (futuro: quota) — modo supervisão fica em pending
//   5. Loga 'running' em agent_actions (com input sanitizado)
//   6. Executa o handler
//   7. Loga 'success' / 'failed' / 'skipped' com resultado, duração, erro
//
// Caller NUNCA chama side-effects diretamente. Sempre passa pelo kernel:
//
//   const result = await runAgentCapability({
//     org_id: 'xxx',
//     agent_slug: 'bdr_email',
//     capability: 'send_email',
//     target: { type: 'lead', id: leadId },
//     triggered_by: { type: 'cron', label: 'prospection 15min' },
//     input: { subject, body, lead_email },
//     handler: async (ctx) => { ... }
//   })
//
// Esse design materializa a metodologia "agente = colaborador" — toda ação
// passa pela mesma porta, com mesmas verificações, e deixa o mesmo tipo de
// rastro auditável. Substitui no longo prazo a lógica espalhada por endpoints.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { isAgentAllowed, type AgentGateResult } from './gate'
import { getCapability, canAgentExecute, type CapabilityDefinition } from './capabilities'
import { getHandler } from './handler-registry'
import './handlers'  // garante registro de todos os handlers conhecidos

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type TriggerType = 'user' | 'system' | 'agent' | 'cron' | 'webhook'

export interface RunCapabilityInput {
  org_id: string
  agent_slug: string                       // ex: 'bdr_email', 'sdr', 'hunter_b2b'
  capability: string                        // ex: 'send_email'
  target?: {
    type: 'lead' | 'deal' | 'message' | 'task' | 'enrollment'
    id: string
  }
  triggered_by: {
    type: TriggerType
    id?: string
    label?: string
  }
  input?: Record<string, any>              // payload sanitizado (sem segredos)
  parent_action_id?: string                // pra handoff/linhagem
  // Handler opcional — se ausente, kernel resolve via handler-registry.
  // Caller passa explicitamente só pra override (testes, etc).
  handler?: (ctx: HandlerContext) => Promise<HandlerResult>
}

export interface HandlerContext {
  action_id: string
  org_id: string
  agent: { id: string; solution_slug: string; config: any; current_usage: any }
  capability: CapabilityDefinition
  target?: RunCapabilityInput['target']
  input: Record<string, any>
  // Org info pra handlers que precisam (idioma, país, nicho)
  org: { id: string; name: string; niche: string | null; language: string | null; country: string | null; timezone: string | null }
}

export interface HandlerResult {
  ok: boolean
  data?: any
  error?: string
  side_effects?: {
    // Capabilities podem disparar side-effects extras que ficam logados
    // como handoff (parent_action_id apontando pra esta action).
    handoffs?: Array<Omit<RunCapabilityInput, 'org_id' | 'triggered_by' | 'parent_action_id'>>
  }
}

export type RunStatus = 'success' | 'failed' | 'skipped' | 'denied' | 'pending_approval'

export interface RunCapabilityResult {
  status: RunStatus
  action_id: string | null
  data?: any
  error?: string
  denied_reason?: string
  duration_ms?: number
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function runAgentCapability(
  input: RunCapabilityInput
): Promise<RunCapabilityResult> {
  const startedAt = Date.now()

  // Sanitiza input pra logging — remove possíveis segredos
  const safeInput = sanitizeInput(input.input || {})

  // ─── 1. Capability existe no catálogo? ─────────────────────────────────
  const capability = getCapability(input.capability)
  if (!capability) {
    return {
      status: 'denied',
      action_id: null,
      denied_reason: 'capability_not_in_catalog',
      error: `Capability "${input.capability}" não está no catálogo`,
    }
  }

  // ─── 2. Gate de plano + estado (org + agent) ───────────────────────────
  const gate: AgentGateResult = await isAgentAllowed(input.org_id, input.agent_slug)
  if (!gate.allowed || !gate.agent || !gate.org) {
    // Loga deny pra ficar visível no audit (importante: cliente vai querer
    // saber QUANTAS vezes o sistema bloqueou)
    const { data: deniedRow } = await supabase
      .from('agent_actions')
      .insert({
        org_id: input.org_id,
        agent_id: gate.agent?.id || null,
        capability: input.capability,
        kind: capability.kind,
        target_type: input.target?.type || null,
        target_id: input.target?.id || null,
        triggered_by_type: input.triggered_by.type,
        triggered_by_id: input.triggered_by.id || null,
        triggered_by_label: input.triggered_by.label || null,
        status: 'denied',
        denied_reason: gate.reason || 'unknown',
        input: safeInput,
        error_message: gate.message,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        parent_action_id: input.parent_action_id || null,
      })
      .select('id')
      .single()

    return {
      status: 'denied',
      action_id: deniedRow?.id || null,
      denied_reason: gate.reason || 'unknown',
      error: gate.message,
      duration_ms: Date.now() - startedAt,
    }
  }

  // ─── 3. Esse agent está autorizado a executar essa capability? ────────
  if (!canAgentExecute(gate.agent.solution_slug, input.capability)) {
    const { data: deniedRow } = await supabase
      .from('agent_actions')
      .insert({
        org_id: input.org_id,
        agent_id: gate.agent.id,
        capability: input.capability,
        kind: capability.kind,
        target_type: input.target?.type || null,
        target_id: input.target?.id || null,
        triggered_by_type: input.triggered_by.type,
        triggered_by_id: input.triggered_by.id || null,
        triggered_by_label: input.triggered_by.label || null,
        status: 'denied',
        denied_reason: 'capability_not_allowed_for_agent',
        input: safeInput,
        error_message: `Agente ${gate.agent.solution_slug} não pode executar ${input.capability}`,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        parent_action_id: input.parent_action_id || null,
      })
      .select('id')
      .single()

    return {
      status: 'denied',
      action_id: deniedRow?.id || null,
      denied_reason: 'capability_not_allowed_for_agent',
      error: `Agente ${gate.agent.solution_slug} não pode executar ${input.capability}`,
      duration_ms: Date.now() - startedAt,
    }
  }

  // ─── 4. Modo de aprovação ─────────────────────────────────────────────
  // Lê config da agent pra ver se admin habilitou modo automático nesta
  // capability específica. Se não, usa default da capability.
  const agentApprovalOverrides = (gate.agent.config?.approval_overrides || {}) as Record<string, 'auto' | 'pending'>
  const approvalMode: 'auto' | 'pending' =
    agentApprovalOverrides[input.capability] || capability.default_approval

  // ─── 5. Cria action row 'running' (ou 'pending_approval') ─────────────
  const initialStatus: 'running' | 'pending_approval' =
    approvalMode === 'pending' ? 'pending_approval' : 'running'

  const { data: actionRow, error: insertErr } = await supabase
    .from('agent_actions')
    .insert({
      org_id: input.org_id,
      agent_id: gate.agent.id,
      capability: input.capability,
      kind: capability.kind,
      target_type: input.target?.type || null,
      target_id: input.target?.id || null,
      triggered_by_type: input.triggered_by.type,
      triggered_by_id: input.triggered_by.id || null,
      triggered_by_label: input.triggered_by.label || null,
      status: initialStatus === 'pending_approval' ? 'running' : 'running',
      approval_status: approvalMode === 'pending' ? 'pending' : 'auto',
      input: safeInput,
      parent_action_id: input.parent_action_id || null,
    })
    .select('id')
    .single()

  if (insertErr || !actionRow) {
    return {
      status: 'failed',
      action_id: null,
      error: `Falha ao criar agent_action: ${insertErr?.message || 'desconhecido'}`,
      duration_ms: Date.now() - startedAt,
    }
  }

  const actionId = actionRow.id

  // Se modo supervisão, NÃO executa — fica esperando aprovação humana
  if (approvalMode === 'pending') {
    return {
      status: 'pending_approval',
      action_id: actionId,
      duration_ms: Date.now() - startedAt,
    }
  }

  // ─── 6. Resolve e executa o handler ───────────────────────────────────
  // Prefere o handler do caller; se não veio, busca no registry.
  // Sem handler em nenhum dos dois caminhos, marca failed.
  const handlerFn = input.handler || getHandler(input.capability)
  if (!handlerFn) {
    const duration = Date.now() - startedAt
    await supabase
      .from('agent_actions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: `Sem handler registrado para capability "${input.capability}"`,
      })
      .eq('id', actionId)
    return {
      status: 'failed',
      action_id: actionId,
      error: `Sem handler registrado para "${input.capability}"`,
      duration_ms: duration,
    }
  }

  let handlerResult: HandlerResult
  try {
    handlerResult = await handlerFn({
      action_id: actionId,
      org_id: input.org_id,
      agent: gate.agent,
      capability,
      target: input.target,
      input: input.input || {},
      org: gate.org,
    })
  } catch (err: any) {
    const duration = Date.now() - startedAt
    await supabase
      .from('agent_actions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: err.message?.substring(0, 1000) || 'Erro desconhecido',
        error_stack: err.stack?.substring(0, 5000) || null,
      })
      .eq('id', actionId)

    return {
      status: 'failed',
      action_id: actionId,
      error: err.message,
      duration_ms: duration,
    }
  }

  // ─── 7. Loga resultado ─────────────────────────────────────────────────
  const duration = Date.now() - startedAt
  const finalStatus: RunStatus = handlerResult.ok ? 'success' : 'failed'

  await supabase
    .from('agent_actions')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      result: handlerResult.data ? sanitizeInput(handlerResult.data) : null,
      error_message: handlerResult.error?.substring(0, 1000) || null,
    })
    .eq('id', actionId)

  // ─── 8. Side-effects (handoffs) ───────────────────────────────────────
  // Se o handler retornou handoffs, executa cada um como filho desta action.
  // Não bloqueia — handoffs rodam em paralelo após o sucesso da pai.
  if (handlerResult.ok && handlerResult.side_effects?.handoffs) {
    for (const handoff of handlerResult.side_effects.handoffs) {
      runAgentCapability({
        org_id: input.org_id,
        triggered_by: { type: 'agent', id: gate.agent.id, label: `handoff de ${input.capability}` },
        parent_action_id: actionId,
        ...handoff,
      }).catch((err) => {
        console.error(`[kernel] handoff falhou (ação pai ${actionId}):`, err.message)
      })
    }
  }

  return {
    status: finalStatus,
    action_id: actionId,
    data: handlerResult.data,
    error: handlerResult.error,
    duration_ms: duration,
  }
}

// ─── Resume de action pendente após aprovação humana ─────────────────────────
//
// Quando capability tem default_approval='pending' (ex: send_whatsapp em cold
// outreach), o runAgentCapability retorna SEM executar o handler. A action
// fica em agent_actions com approval_status='pending' até o admin decidir.
//
// Se aprovada, a UI/API chama resumePendingAction(actionId) que:
//   1. Carrega a action e valida que está aprovada
//   2. Reverifica gates (plano/estado/capability) — situação pode ter mudado
//      entre o pedido inicial e a aprovação (ex: plano caiu, agente pausado)
//   3. Resolve handler do registry e executa com input persistido
//   4. Atualiza action com resultado
//
// Se rejeitada, marca como denied. Sem reexecução.

export async function resumePendingAction(
  actionId: string,
  approvedByUserId: string
): Promise<RunCapabilityResult> {
  const startedAt = Date.now()

  // 1. Carrega action
  const { data: action, error: loadErr } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', actionId)
    .single()

  if (loadErr || !action) {
    return {
      status: 'failed',
      action_id: actionId,
      error: 'Action não encontrada',
      duration_ms: Date.now() - startedAt,
    }
  }

  if (action.approval_status !== 'approved') {
    return {
      status: 'failed',
      action_id: actionId,
      error: `Action approval_status é "${action.approval_status}", não "approved"`,
      duration_ms: Date.now() - startedAt,
    }
  }

  if (action.status === 'success' || action.status === 'failed' || action.status === 'denied') {
    return {
      status: 'failed',
      action_id: actionId,
      error: `Action já foi processada (status=${action.status})`,
      duration_ms: Date.now() - startedAt,
    }
  }

  // 2. Reverifica gates (situação pode ter mudado desde o pedido)
  const capability = getCapability(action.capability)
  if (!capability) {
    await markActionFailed(actionId, 'Capability removida do catálogo após aprovação')
    return {
      status: 'failed',
      action_id: actionId,
      error: 'Capability removida do catálogo',
      duration_ms: Date.now() - startedAt,
    }
  }

  // Busca o agent atual pra reverificar
  const { data: agent } = await supabase
    .from('agents')
    .select('id, solution_slug, org_id')
    .eq('id', action.agent_id)
    .single()

  if (!agent) {
    await markActionFailed(actionId, 'Agente não existe mais')
    return {
      status: 'failed',
      action_id: actionId,
      error: 'Agente não existe mais',
      duration_ms: Date.now() - startedAt,
    }
  }

  const gate = await isAgentAllowed(agent.org_id, agent.solution_slug)
  if (!gate.allowed || !gate.agent || !gate.org) {
    await markActionDenied(actionId, gate.reason || 'unknown', gate.message || 'Gate falhou na re-verificação')
    return {
      status: 'denied',
      action_id: actionId,
      denied_reason: gate.reason || 'unknown',
      error: gate.message,
      duration_ms: Date.now() - startedAt,
    }
  }

  if (!canAgentExecute(gate.agent.solution_slug, action.capability)) {
    await markActionDenied(actionId, 'capability_not_allowed_for_agent', 'Re-verificação após aprovação')
    return {
      status: 'denied',
      action_id: actionId,
      denied_reason: 'capability_not_allowed_for_agent',
      duration_ms: Date.now() - startedAt,
    }
  }

  // 3. Resolve handler
  const handlerFn = getHandler(action.capability)
  if (!handlerFn) {
    await markActionFailed(actionId, `Sem handler registrado para "${action.capability}"`)
    return {
      status: 'failed',
      action_id: actionId,
      error: `Sem handler registrado para "${action.capability}"`,
      duration_ms: Date.now() - startedAt,
    }
  }

  // 4. Executa
  let handlerResult: HandlerResult
  try {
    handlerResult = await handlerFn({
      action_id: actionId,
      org_id: action.org_id,
      agent: gate.agent,
      capability,
      target: action.target_id ? { type: action.target_type, id: action.target_id } : undefined,
      input: action.input || {},
      org: gate.org,
    })
  } catch (err: any) {
    const duration = Date.now() - startedAt
    await supabase
      .from('agent_actions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: err.message?.substring(0, 1000) || 'Erro desconhecido',
        error_stack: err.stack?.substring(0, 5000) || null,
      })
      .eq('id', actionId)
    return {
      status: 'failed',
      action_id: actionId,
      error: err.message,
      duration_ms: duration,
    }
  }

  const duration = Date.now() - startedAt
  const finalStatus: RunStatus = handlerResult.ok ? 'success' : 'failed'

  await supabase
    .from('agent_actions')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      result: handlerResult.data ? sanitizeInput(handlerResult.data) : null,
      error_message: handlerResult.error?.substring(0, 1000) || null,
    })
    .eq('id', actionId)

  return {
    status: finalStatus,
    action_id: actionId,
    data: handlerResult.data,
    error: handlerResult.error,
    duration_ms: duration,
  }
}

// ─── Reject de action pendente ───────────────────────────────────────────────
export async function rejectPendingAction(
  actionId: string,
  rejectedByUserId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: action } = await supabase
    .from('agent_actions')
    .select('id, approval_status, status')
    .eq('id', actionId)
    .single()

  if (!action) return { ok: false, error: 'Action não encontrada' }

  if (action.approval_status !== 'pending') {
    return { ok: false, error: `Action não está pendente (approval_status=${action.approval_status})` }
  }

  await supabase
    .from('agent_actions')
    .update({
      status: 'denied',
      denied_reason: 'rejected_by_human',
      approval_status: 'rejected',
      rejection_reason: reason || null,
      approved_by_user_id: rejectedByUserId,
      approved_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', actionId)

  return { ok: true }
}

// ─── Helpers internos ────────────────────────────────────────────────────────
async function markActionFailed(actionId: string, message: string) {
  await supabase
    .from('agent_actions')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: message,
    })
    .eq('id', actionId)
}

async function markActionDenied(actionId: string, reason: string, message: string) {
  await supabase
    .from('agent_actions')
    .update({
      status: 'denied',
      denied_reason: reason,
      completed_at: new Date().toISOString(),
      error_message: message,
    })
    .eq('id', actionId)
}

// ─── Sanitização ─────────────────────────────────────────────────────────────

const SECRET_KEYS = new Set([
  'password', 'token', 'api_key', 'apikey', 'secret', 'authorization',
  'access_token', 'refresh_token', 'cloud_api_token', 'instance_token',
  'service_role_key', 'anon_key',
])

/**
 * Remove campos com nomes parecidos a segredos antes de logar input/result.
 * Não é segurança forte — é defesa em profundidade pra evitar vazar tokens
 * em audit log que admin vai ver.
 */
function sanitizeInput(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeInput)

  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]'
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitizeInput(v)
    } else {
      out[k] = v
    }
  }
  return out
}
