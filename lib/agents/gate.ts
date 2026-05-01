// lib/agents/gate.ts
// ═══════════════════════════════════════════════════════════════════════════════
// PORTÃO ÚNICO DE EXECUÇÃO DE AGENTES IA
//
// Toda execução de agente IA (responder mensagem, enviar email, follow-up,
// captação de lead, etc) DEVE passar por aqui antes de tocar em side-effects.
//
// Verifica, na ordem:
//   1. Org existe e está ativa
//   2. Plano da org permite esse agentSlug (planHasAgent)
//   3. Existe agents row pra esse solution_slug ativa+não-pausada na org
//
// Se qualquer gate falhar, retorna allowed=false com motivo + nunca deixa
// o agente executar. Isso isola toda a lógica de gating num lugar só, em
// vez de espalhar checagens (incompletas) por cada endpoint.
//
// Esse é o primeiro componente da metodologia "agente = colaborador":
// "antes de o colaborador agir, conferir se ele está contratado, em cargo
// ativo, e se a empresa tem o plano que cobre esse cargo".
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { planHasAgent } from '@/lib/planConfig'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AgentDenyReason =
  | 'org_not_found'
  | 'org_inactive'
  | 'plan_does_not_include_agent'
  | 'agent_not_hired'
  | 'agent_paused'
  | 'agent_inactive'

export interface AgentGateResult {
  allowed: boolean
  reason?: AgentDenyReason
  message?: string
  agent?: { id: string; solution_slug: string; config: any; current_usage: any; status: string; is_active: boolean; is_paused: boolean } | null
  org?: { id: string; name: string; niche: string | null; language: string | null; country: string | null; timezone: string | null; plan_status: string | null } | null
}

/**
 * Verifica se um agente pode executar pra uma org. Retorna objeto detalhado
 * (não throw). Caller decide o que fazer com `allowed=false`.
 *
 * Slugs com sufixo de nicho (`sdr_imobiliario`, `followup_imobiliario`) são
 * aceitos como aliases dos genéricos (`sdr`, `followup`) na hora de checar
 * o plano — o plan config não distingue por nicho, só por capability.
 */
export async function isAgentAllowed(
  orgId: string | null | undefined,
  agentSlug: string
): Promise<AgentGateResult> {
  if (!orgId) {
    return { allowed: false, reason: 'org_not_found', message: 'org_id ausente' }
  }

  // 1. Org existe e está ativa
  const { data: org } = await supabase
    .from('orgs')
    .select('id, name, niche, language, country, timezone, plan_status, plan')
    .eq('id', orgId)
    .single()

  if (!org) {
    return { allowed: false, reason: 'org_not_found', message: `Org ${orgId} não encontrada` }
  }

  // plan_status indica se a org está ok pra cobrança/uso
  // (active, trial, past_due, etc — só bloqueia em estados explicitamente inativos)
  const inactiveStates = new Set(['cancelled', 'paused', 'banned'])
  if (org.plan_status && inactiveStates.has(org.plan_status)) {
    return {
      allowed: false,
      reason: 'org_inactive',
      message: `Org está com plan_status=${org.plan_status}`,
      org,
    }
  }

  // 2. Plano permite este agentSlug?
  const planName = (org as any).plan || 'starter'
  if (!planHasAgent(planName, agentSlug)) {
    return {
      allowed: false,
      reason: 'plan_does_not_include_agent',
      message: `Plano "${planName}" não inclui o agente "${agentSlug}"`,
      org,
    }
  }

  // 3. Existe agents row ativa pra este solution_slug?
  // Tenta o slug exato e variantes de nicho (sdr ↔ sdr_imobiliario etc).
  const slugVariants = [agentSlug]
  if (agentSlug === 'sdr') slugVariants.push('sdr_imobiliario')
  if (agentSlug === 'followup') slugVariants.push('followup_imobiliario')
  if (agentSlug === 'sdr_imobiliario') slugVariants.push('sdr')
  if (agentSlug === 'followup_imobiliario') slugVariants.push('followup')

  // Schema da tabela `agents` usa coluna text `status` ('active'|'paused'|'inactive').
  // Derivamos is_active/is_paused/is_inactive aqui pra manter API estável
  // mesmo se a coluna mudar de nome no futuro.
  const { data: rawAgent } = await supabase
    .from('agents')
    .select('id, solution_slug, status, config, current_usage')
    .eq('org_id', orgId)
    .in('solution_slug', slugVariants)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!rawAgent) {
    return {
      allowed: false,
      reason: 'agent_not_hired',
      message: `Agente "${agentSlug}" não foi contratado nesta org`,
      org,
    }
  }

  const agent = {
    id: rawAgent.id,
    solution_slug: rawAgent.solution_slug,
    config: rawAgent.config,
    current_usage: rawAgent.current_usage,
    status: rawAgent.status,
    is_active: rawAgent.status === 'active',
    is_paused: rawAgent.status === 'paused',
  }

  if (agent.is_paused) {
    return {
      allowed: false,
      reason: 'agent_paused',
      message: `Agente "${agentSlug}" está pausado nesta org`,
      org,
      agent,
    }
  }

  if (!agent.is_active) {
    return {
      allowed: false,
      reason: 'agent_inactive',
      message: `Agente "${agentSlug}" está inativo nesta org (status=${agent.status})`,
      org,
      agent,
    }
  }

  return { allowed: true, agent, org }
}

/**
 * Helper de logging — formato consistente em todo o app.
 */
export function logGateDenied(context: string, gate: AgentGateResult, extra?: Record<string, any>) {
  console.warn(
    `[gate:denied] ${context} | reason=${gate.reason} | org=${gate.org?.id || '?'} | message=${gate.message}`,
    extra ? extra : ''
  )
}
