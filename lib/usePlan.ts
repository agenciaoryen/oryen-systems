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
  const planName = planConfig.name // Sempre retorna o nome novo (starter/pro/business/enterprise)

  // Helpers memoizados
  const helpers = useMemo(() => ({
    // Info do plano
    plan: planName,
    planConfig,
    displayName: planConfig.displayName,

    // Verificadores de features
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

    // Helpers de comparação (novos nomes)
    isStarter: planName === 'starter',
    isPro: planName === 'pro',
    isBusiness: planName === 'business',
    isEnterprise: planName === 'enterprise',
    isPaid: true, // Todos os planos v2 são pagos
    isPremium: planName === 'business' || planName === 'enterprise',

    // Compat legado — para não quebrar componentes que usam os nomes antigos
    isBasic: planName === 'starter',
    isGold: planName === 'pro',
    isDiamond: planName === 'business',

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

    // Próximo plano para upgrade
    getUpgradePlan: (): PlanName | null => {
      if (planName === 'starter') return 'pro'
      if (planName === 'pro') return 'business'
      if (planName === 'business') return 'enterprise'
      return null
    },

    // Config do próximo plano
    getUpgradePlanConfig: (): PlanConfig | null => {
      const next = planName === 'starter' ? 'pro'
                 : planName === 'pro' ? 'business'
                 : planName === 'business' ? 'enterprise'
                 : null
      return next ? PLAN_CONFIGS[next] : null
    },

    // Preço formatado
    getFormattedPrice: (currency: 'USD' | 'BRL' = 'USD'): string => {
      const price = currency === 'USD' ? planConfig.priceUsd : planConfig.priceBrl
      const symbol = currency === 'USD' ? '$' : 'R$'
      return `${symbol}${price.toFixed(0)}`
    }
  }), [planName, planConfig])

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
