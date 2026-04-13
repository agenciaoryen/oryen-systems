// lib/planLimits.ts
// Server-side helper para enforcement de limites de plano + add-ons
// Usado nas API routes para verificar se a org pode criar mais recursos

import { createClient } from '@supabase/supabase-js'
import { getPlanConfig, type PlanLimits } from './planConfig'
import { calculateAddonBonus } from './addons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type LimitCheckResult =
  | { allowed: true; current: number; limit: number; baseLimit: number; addonBonus: number }
  | { allowed: false; current: number; limit: number; baseLimit: number; addonBonus: number; plan: string }

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
 * Busca add-ons ativos da org.
 */
async function getOrgAddons(orgId: string) {
  const { data } = await supabase
    .from('org_addons')
    .select('addon_type, quantity, status')
    .eq('org_id', orgId)
    .eq('status', 'active')

  return data || []
}

/**
 * Calcula o limite efetivo = base do plano + bônus de add-ons.
 * Se base = -1 (ilimitado), retorna -1 independente de add-ons.
 */
function getEffectiveLimit(baseLimit: number, addonBonus: number): number {
  if (baseLimit === -1) return -1
  return baseLimit + addonBonus
}

/**
 * Verifica se a org pode criar mais de um recurso com base no limite do plano + add-ons.
 * Retorna { allowed, current, limit, baseLimit, addonBonus }.
 */
export async function checkPlanLimit(
  orgId: string,
  limitKey: keyof PlanLimits,
  table: string,
  filters?: Record<string, any>
): Promise<LimitCheckResult> {
  const [config, addons] = await Promise.all([
    getOrgPlanConfig(orgId),
    getOrgAddons(orgId),
  ])

  const baseLimit = config.limits[limitKey]
  const addonBonus = calculateAddonBonus(addons, limitKey)
  const limit = getEffectiveLimit(baseLimit, addonBonus)

  // -1 = ilimitado
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, baseLimit, addonBonus }
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
    return { allowed: false, current, limit, baseLimit, addonBonus, plan: config.name }
  }

  return { allowed: true, current, limit, baseLimit, addonBonus }
}

/**
 * Verifica limite mensal (documentos, mensagens IA) + add-ons.
 * Conta apenas registros do mês atual.
 */
export async function checkMonthlyPlanLimit(
  orgId: string,
  limitKey: keyof PlanLimits,
  table: string,
  dateColumn: string = 'created_at',
  filters?: Record<string, any>
): Promise<LimitCheckResult> {
  const [config, addons] = await Promise.all([
    getOrgPlanConfig(orgId),
    getOrgAddons(orgId),
  ])

  const baseLimit = config.limits[limitKey]
  const addonBonus = calculateAddonBonus(addons, limitKey)
  const limit = getEffectiveLimit(baseLimit, addonBonus)

  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, baseLimit, addonBonus }
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
    return { allowed: false, current, limit, baseLimit, addonBonus, plan: config.name }
  }

  return { allowed: true, current, limit, baseLimit, addonBonus }
}
