// lib/planLimits.ts
// Server-side helper para enforcement de limites de plano
// Usado nas API routes para verificar se a org pode criar mais recursos

import { createClient } from '@supabase/supabase-js'
import { getPlanConfig, type PlanLimits } from './usePlan'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type LimitCheckResult =
  | { allowed: true; current: number; limit: number }
  | { allowed: false; current: number; limit: number; plan: string }

/**
 * Busca o plano da org e retorna o PlanConfig resolvido (suporta legados).
 */
async function getOrgPlanConfig(orgId: string) {
  const { data: org } = await supabase
    .from('orgs')
    .select('plan')
    .eq('id', orgId)
    .single()

  return getPlanConfig(org?.plan || 'starter')
}

/**
 * Verifica se a org pode criar mais de um recurso com base no limite do plano.
 * Retorna { allowed: true/false, current, limit }.
 */
export async function checkPlanLimit(
  orgId: string,
  limitKey: keyof PlanLimits,
  table: string,
  filters?: Record<string, any>
): Promise<LimitCheckResult> {
  const config = await getOrgPlanConfig(orgId)
  const limit = config.limits[limitKey]

  // -1 = ilimitado
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 }
  }

  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value)
    }
  }

  const { count } = await query
  const current = count || 0

  if (current >= limit) {
    return { allowed: false, current, limit, plan: config.name }
  }

  return { allowed: true, current, limit }
}

/**
 * Verifica limite mensal (documentos, mensagens IA).
 * Conta apenas registros do mês atual.
 */
export async function checkMonthlyPlanLimit(
  orgId: string,
  limitKey: keyof PlanLimits,
  table: string,
  dateColumn: string = 'created_at',
  filters?: Record<string, any>
): Promise<LimitCheckResult> {
  const config = await getOrgPlanConfig(orgId)
  const limit = config.limits[limitKey]

  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte(dateColumn, startOfMonth)

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value)
    }
  }

  const { count } = await query
  const current = count || 0

  if (current >= limit) {
    return { allowed: false, current, limit, plan: config.name }
  }

  return { allowed: true, current, limit }
}
