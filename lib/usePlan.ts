// lib/usePlan.ts
'use client'

import { useAuth } from '@/lib/AuthContext'
import { useMemo } from 'react'
import {
  resolvePlanConfig,
  PLAN_CONFIGS,
  type PlanName,
  type PlanFeatures,
  type PlanLimits,
  type PlanConfig,
} from './planConfig'

// Re-export types and functions so existing imports don't break
export type { PlanName, LegacyPlanName, AnyPlanName, PlanFeatures, PlanLimits, PlanConfig } from './planConfig'
export { PLAN_CONFIGS, resolvePlanConfig, getPlanConfig, getAllPlans, PLAN_AGENT_ACCESS, planHasAgent, getMinPlanForAgent } from './planConfig'

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function usePlan() {
  const { activePlan } = useAuth()

  // Resolve plano legado ou novo para config válida
  const rawPlanName = activePlan || 'starter'
  const planConfig = resolvePlanConfig(rawPlanName)
  // resolvedName para comparações (starter/pro/business/enterprise)
  // rawPlanName para planHasAgent (preserva 'basic' etc.)
  const resolvedName = planConfig.name

  // Helpers memoizados
  const helpers = useMemo(() => ({
    // Info do plano — plan usa raw para que planHasAgent resolva corretamente
    plan: rawPlanName,
    planConfig,
    displayName: planConfig.displayName,

    // Verificadores de features (usam planConfig, já resolvido)
    canUseAiAgents: planConfig.features.hasAiAgents,
    canUseAutomations: planConfig.features.hasAutomations,
    canUseReports: planConfig.features.hasReports,
    canUseApi: planConfig.features.hasApiAccess,
    canUseCampaigns: planConfig.features.hasCampaigns,
    canUseTrafficManager: planConfig.features.hasTrafficManager,
    canUseAdvancedDashboard: planConfig.features.hasAdvancedDashboard,

    // Limites
    maxUsers: planConfig.limits.maxUsers,
    maxLeads: planConfig.limits.maxActiveLeads,
    maxMessages: planConfig.limits.maxMonthlyMessages,
    maxProperties: planConfig.limits.maxProperties,
    maxDocuments: planConfig.limits.maxDocumentsPerMonth,
    maxSites: planConfig.limits.maxSites,

    // Helpers de comparação (usam resolvedName para funcionar com legados)
    isStarter: resolvedName === 'starter',
    isPro: resolvedName === 'pro',
    isBusiness: resolvedName === 'business',
    isEnterprise: resolvedName === 'enterprise',
    isPaid: true,
    isPremium: resolvedName === 'business' || resolvedName === 'enterprise',

    // Compat legado
    isBasic: resolvedName === 'starter',
    isGold: resolvedName === 'pro',
    isDiamond: resolvedName === 'business',

    // Verificador genérico de feature
    hasFeature: (feature: keyof PlanFeatures): boolean => {
      return planConfig.features[feature] ?? false
    },

    // Verificador de limite
    isWithinLimit: (current: number, limitKey: keyof PlanLimits): boolean => {
      const limit = planConfig.limits[limitKey]
      if (limit === -1) return true // ilimitado
      return current < limit
    },

    // Próximo plano para upgrade (usa resolvedName)
    getUpgradePlan: (): PlanName | null => {
      if (resolvedName === 'starter') return 'pro'
      if (resolvedName === 'pro') return 'business'
      if (resolvedName === 'business') return 'enterprise'
      return null
    },

    // Config do próximo plano
    getUpgradePlanConfig: (): PlanConfig | null => {
      const next = resolvedName === 'starter' ? 'pro'
                 : resolvedName === 'pro' ? 'business'
                 : resolvedName === 'business' ? 'enterprise'
                 : null
      return next ? PLAN_CONFIGS[next] : null
    },

    // Preço formatado
    getFormattedPrice: (currency: 'USD' | 'BRL' = 'USD'): string => {
      const price = currency === 'USD' ? planConfig.priceUsd : planConfig.priceBrl
      const symbol = currency === 'USD' ? '$' : 'R$'
      return `${symbol}${price.toFixed(0)}`
    }
  }), [rawPlanName, resolvedName, planConfig])

  return helpers
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

export function useCanUseFeature(feature: keyof PlanFeatures): boolean {
  const { hasFeature } = usePlan()
  return hasFeature(feature)
}

export function useIsBasicPlan(): boolean {
  const { isStarter } = usePlan()
  return isStarter
}

export function useCanUseAI(): boolean {
  const { canUseAiAgents } = usePlan()
  return canUseAiAgents
}
