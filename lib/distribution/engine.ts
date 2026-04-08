// lib/distribution/engine.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Engine principal de distribuição de leads (Lead Roulette v2.2)
//
// Carrega config da org → carrega corretores elegíveis → executa estratégia
// → atualiza lead → loga atribuição → cria alerta
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import type {
  DistributionConfig,
  DistributionStrategy,
  BrokerProfile,
  LeadContext,
  AssignmentResult,
} from './types'
import { DEFAULT_DISTRIBUTION_CONFIG } from './types'
import { roundRobin } from './strategies/round-robin'
import { balancedLoad } from './strategies/balanced-load'
import { scoreWeighted } from './strategies/score-weighted'
import { expertiseMatch } from './strategies/expertise-match'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Estratégias registradas ───

const STRATEGIES: Record<DistributionStrategy, (brokers: BrokerProfile[], ctx: LeadContext) => AssignmentResult> = {
  round_robin: roundRobin,
  balanced_load: balancedLoad,
  score_weighted: scoreWeighted,
  expertise_match: expertiseMatch,
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export async function getDistributionConfig(orgId: string): Promise<DistributionConfig> {
  const { data } = await supabase
    .from('orgs')
    .select('distribution_config')
    .eq('id', orgId)
    .single()

  if (!data?.distribution_config) return DEFAULT_DISTRIBUTION_CONFIG

  return { ...DEFAULT_DISTRIBUTION_CONFIG, ...data.distribution_config }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ELIGIBLE BROKERS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadEligibleBrokers(orgId: string, config: DistributionConfig): Promise<BrokerProfile[]> {
  // Buscar todos os usuários da org com roles elegíveis
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, role, status')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .in('role', config.eligible_roles)

  if (!users || users.length === 0) return []

  // Buscar configs de broker (pode não existir para todos)
  const { data: brokerConfigs } = await supabase
    .from('broker_config')
    .select('*')
    .eq('org_id', orgId)
    .in('user_id', users.map(u => u.id))

  const configMap = new Map((brokerConfigs || []).map(bc => [bc.user_id, bc]))

  // Contar leads ativos por broker (stage ≠ won/lost)
  const brokers: BrokerProfile[] = []

  for (const user of users) {
    const bc = configMap.get(user.id)

    // Se tem config e está indisponível, pular
    if (bc && !bc.is_available) continue

    // Contar leads ativos
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('assigned_to', user.id)
      .not('stage', 'in', '("won","lost","perdido","ganho")')

    const activeCount = count || 0
    const maxLeads = bc?.max_active_leads ?? config.max_leads_per_broker

    // Se atingiu capacidade máxima, pular
    if (maxLeads !== null && activeCount >= maxLeads) continue

    brokers.push({
      userId: user.id,
      name: user.full_name || user.email || 'Corretor',
      role: user.role,
      isAvailable: bc?.is_available ?? true,
      maxActiveLeads: maxLeads,
      activeLeadCount: activeCount,
      regions: bc?.regions || [],
      cities: bc?.cities || [],
      propertyTypes: bc?.property_types || [],
      transactionTypes: bc?.transaction_types || [],
      priceRangeMin: bc?.price_range_min ? Number(bc.price_range_min) : null,
      priceRangeMax: bc?.price_range_max ? Number(bc.price_range_max) : null,
      conversionRate: bc?.conversion_rate ? Number(bc.conversion_rate) : 0,
      avgResponseTimeMin: bc?.avg_response_time_min ?? null,
    })
  }

  return brokers
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN LEAD
// ═══════════════════════════════════════════════════════════════════════════════

export async function assignLead(context: LeadContext): Promise<AssignmentResult> {
  const { leadId, orgId } = context

  const config = await getDistributionConfig(orgId)

  // Se distribuição desabilitada, não atribui
  if (!config.enabled) {
    return { assignedTo: null, strategy: config.strategy, reason: 'distribution_disabled' }
  }

  const brokers = await loadEligibleBrokers(orgId, config)

  if (brokers.length === 0) {
    console.log(`[Distribution] Nenhum corretor elegível para org ${orgId}`)
    return { assignedTo: null, strategy: config.strategy, reason: 'no_eligible_brokers' }
  }

  // Se só tem 1 corretor, atribui direto
  if (brokers.length === 1) {
    const result: AssignmentResult = {
      assignedTo: brokers[0].userId,
      strategy: config.strategy,
      reason: 'single_broker',
    }
    await applyAssignment(leadId, orgId, null, result, 'auto_distribution')
    return result
  }

  // Executar estratégia
  const strategyFn = STRATEGIES[config.strategy]
  let result = strategyFn(brokers, context)

  // Se estratégia não encontrou match, fallback para round_robin
  if (!result.assignedTo && config.strategy !== 'round_robin') {
    console.log(`[Distribution] Fallback para round_robin (${config.strategy} retornou null)`)
    result = roundRobin(brokers, context)
    result.reason = `fallback_from_${config.strategy}`
  }

  if (result.assignedTo) {
    await applyAssignment(leadId, orgId, null, result, 'auto_distribution')
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// REASSIGN LEAD
// ═══════════════════════════════════════════════════════════════════════════════

export async function reassignLead(
  leadId: string,
  orgId: string,
  reason: 'auto_reassign' | 'manual_reassign' | 'broker_unavailable' | 'stale_lead_reassign' | 'load_rebalance',
  newAssigneeId?: string,
  excludeUserId?: string
): Promise<AssignmentResult> {
  // Buscar atribuição atual
  const { data: lead } = await supabase
    .from('leads')
    .select('assigned_to')
    .eq('id', leadId)
    .single()

  const previousAssignee = lead?.assigned_to || null

  // Se foi especificado quem recebe, atribuir diretamente
  if (newAssigneeId) {
    const result: AssignmentResult = {
      assignedTo: newAssigneeId,
      strategy: 'round_robin',
      reason: 'manual_selection',
    }
    await applyAssignment(leadId, orgId, previousAssignee, result, reason)
    return result
  }

  // Caso contrário, rodar engine excluindo o broker atual
  const config = await getDistributionConfig(orgId)
  let brokers = await loadEligibleBrokers(orgId, config)

  // Excluir broker atual (e opcionalmente outro)
  const excludeIds = new Set<string>()
  if (previousAssignee) excludeIds.add(previousAssignee)
  if (excludeUserId) excludeIds.add(excludeUserId)
  brokers = brokers.filter(b => !excludeIds.has(b.userId))

  if (brokers.length === 0) {
    return { assignedTo: null, strategy: config.strategy, reason: 'no_eligible_brokers_for_reassign' }
  }

  const context: LeadContext = { leadId, orgId, source: 'reassign' }
  const strategyFn = STRATEGIES[config.strategy]
  let result = strategyFn(brokers, context)

  if (!result.assignedTo) {
    result = roundRobin(brokers, context)
  }

  if (result.assignedTo) {
    await applyAssignment(leadId, orgId, previousAssignee, result, reason)
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY ASSIGNMENT (atualiza lead, loga, cria alerta)
// ═══════════════════════════════════════════════════════════════════════════════

async function applyAssignment(
  leadId: string,
  orgId: string,
  previousAssignee: string | null,
  result: AssignmentResult,
  reason: string
) {
  const now = new Date().toISOString()

  // 1. Atualizar lead
  await supabase
    .from('leads')
    .update({
      assigned_to: result.assignedTo,
      assigned_at: now,
      updated_at: now,
    })
    .eq('id', leadId)
    .eq('org_id', orgId)

  // 2. Log de atribuição
  await supabase.from('lead_assignment_log').insert({
    org_id: orgId,
    lead_id: leadId,
    assigned_from: previousAssignee,
    assigned_to: result.assignedTo,
    reason,
    strategy_used: result.strategy,
    metadata: {
      match_score: result.matchScore,
      detail: result.reason,
    },
  })

  // 3. Criar alerta para o corretor atribuído
  if (result.assignedTo) {
    const { data: lead } = await supabase
      .from('leads')
      .select('name, phone')
      .eq('id', leadId)
      .single()

    const isReassign = reason !== 'auto_distribution'
    const title = isReassign
      ? `Lead reatribuído: ${lead?.name || 'Novo lead'}`
      : `Novo lead atribuído: ${lead?.name || 'Novo lead'}`

    await supabase.from('alerts').insert({
      user_id: result.assignedTo,
      type: 'urgent',
      title,
      description: isReassign
        ? `O lead ${lead?.name} (${lead?.phone || ''}) foi reatribuído para você. Motivo: ${reason}`
        : `Você recebeu um novo lead: ${lead?.name} (${lead?.phone || ''})`,
      action_link: `/dashboard/crm/${leadId}`,
      action_label: 'Ver lead',
      is_read: false,
    })
  }

  console.log(`[Distribution] ✓ Lead ${leadId} atribuído a ${result.assignedTo} | strategy: ${result.strategy} | reason: ${reason}`)
}
