// lib/usePlan.ts
'use client'

import { useAuth } from '@/lib/AuthContext'
import { useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

// Novos planos (v2 — Abril 2026)
export type PlanName = 'starter' | 'pro' | 'business' | 'enterprise'
// Plano legado (clientes antigos que ainda pagam $19)
export type LegacyPlanName = 'basic' | 'gold' | 'diamond'
// Todos os planos válidos (novos + legados)
export type AnyPlanName = PlanName | LegacyPlanName

export interface PlanFeatures {
  hasAiAgents: boolean
  hasAutomations: boolean
  hasReports: boolean
  hasApiAccess: boolean
  hasCampaigns: boolean
  hasTrafficManager: boolean
  hasAdvancedDashboard: boolean
  hasAiAnalytics: boolean
  hasCustomPipeline: boolean
  hasWhatsappIntegration: boolean
  hasOfficialWhatsapp: boolean
  hasPrioritySupport: boolean
  hasAccountManager: boolean
  hasFinancialModule: boolean
  hasAdvancedFinancial: boolean
}

export interface PlanLimits {
  maxUsers: number            // -1 = ilimitado
  maxActiveLeads: number      // -1 = ilimitado
  maxMonthlyMessages: number  // -1 = ilimitado
  maxWhatsappNumbers: number  // -1 = ilimitado
  maxProperties: number       // -1 = ilimitado
  maxDocumentsPerMonth: number // -1 = ilimitado
  maxSites: number            // -1 = ilimitado
}

export interface PlanConfig {
  name: PlanName
  displayName: string
  priceUsd: number
  priceBrl: number
  features: PlanFeatures
  limits: PlanLimits
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DOS PLANOS (fallback client-side)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PLANOS v2 (Abril 2026)
// Mesma IA em todos os planos — diferença é limite de uso e features de escala
// ═══════════════════════════════════════════════════════════════════════════════

const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  starter: {
    name: 'starter',
    displayName: 'Starter',
    priceUsd: 49,
    priceBrl: 249,
    features: {
      hasAiAgents: true,
      hasAutomations: false,
      hasReports: false,
      hasApiAccess: false,
      hasCampaigns: false,
      hasTrafficManager: false,
      hasAdvancedDashboard: false,
      hasAiAnalytics: false,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: false,
      hasPrioritySupport: false,
      hasAccountManager: false,
      hasFinancialModule: false,
      hasAdvancedFinancial: false,
    },
    limits: {
      maxUsers: 1,
      maxActiveLeads: 500,
      maxMonthlyMessages: 500,
      maxWhatsappNumbers: 1,
      maxProperties: 30,
      maxDocumentsPerMonth: 10,
      maxSites: 1,
    }
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    priceUsd: 99,
    priceBrl: 497,
    features: {
      hasAiAgents: true,
      hasAutomations: true,
      hasReports: true,
      hasApiAccess: false,
      hasCampaigns: false,
      hasTrafficManager: false,
      hasAdvancedDashboard: true,
      hasAiAnalytics: true,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: true,
      hasPrioritySupport: false,
      hasAccountManager: false,
      hasFinancialModule: true,
      hasAdvancedFinancial: false,
    },
    limits: {
      maxUsers: 3,
      maxActiveLeads: 2000,
      maxMonthlyMessages: 3000,
      maxWhatsappNumbers: 2,
      maxProperties: 100,
      maxDocumentsPerMonth: 50,
      maxSites: 1,
    }
  },
  business: {
    name: 'business',
    displayName: 'Business',
    priceUsd: 249,
    priceBrl: 1247,
    features: {
      hasAiAgents: true,
      hasAutomations: true,
      hasReports: true,
      hasApiAccess: true,
      hasCampaigns: true,
      hasTrafficManager: true,
      hasAdvancedDashboard: true,
      hasAiAnalytics: true,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: true,
      hasPrioritySupport: true,
      hasAccountManager: false,
      hasFinancialModule: true,
      hasAdvancedFinancial: true,
    },
    limits: {
      maxUsers: 8,
      maxActiveLeads: 8000,
      maxMonthlyMessages: 15000,
      maxWhatsappNumbers: 5,
      maxProperties: 500,
      maxDocumentsPerMonth: 200,
      maxSites: 3,
    }
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceUsd: 499,
    priceBrl: 2497,
    features: {
      hasAiAgents: true,
      hasAutomations: true,
      hasReports: true,
      hasApiAccess: true,
      hasCampaigns: true,
      hasTrafficManager: true,
      hasAdvancedDashboard: true,
      hasAiAnalytics: true,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: true,
      hasPrioritySupport: true,
      hasAccountManager: true,
      hasFinancialModule: true,
      hasAdvancedFinancial: true,
    },
    limits: {
      maxUsers: 25,
      maxActiveLeads: 30000,
      maxMonthlyMessages: 50000,
      maxWhatsappNumbers: 15,
      maxProperties: -1,
      maxDocumentsPerMonth: -1,
      maxSites: 10,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLANOS LEGADOS (para clientes antigos — NÃO aparecem na UI para novos clientes)
// Mapeiam para o plano novo mais próximo em termos de features
// ═══════════════════════════════════════════════════════════════════════════════

const LEGACY_PLAN_MAP: Record<LegacyPlanName, PlanName> = {
  basic: 'starter',
  gold: 'pro',
  diamond: 'business',
}

/**
 * Resolve qualquer nome de plano (novo ou legado) para um PlanConfig válido.
 * Clientes antigos com 'basic'/'gold'/'diamond' no banco são mapeados para
 * os novos planos equivalentes, mantendo os limites do novo plano.
 */
export function resolvePlanConfig(planName: string): PlanConfig {
  // Plano novo — retorna direto
  if (planName in PLAN_CONFIGS) {
    return PLAN_CONFIGS[planName as PlanName]
  }
  // Plano legado — mapeia para o equivalente novo
  if (planName in LEGACY_PLAN_MAP) {
    return PLAN_CONFIGS[LEGACY_PLAN_MAP[planName as LegacyPlanName]]
  }
  // Fallback seguro
  return PLAN_CONFIGS.starter
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function usePlan() {
  const { activePlan, activePlanStatus } = useAuth()

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

/**
 * Hook simples para verificar uma feature específica
 */
export function useCanUseFeature(feature: keyof PlanFeatures): boolean {
  const { hasFeature } = usePlan()
  return hasFeature(feature)
}

/**
 * Hook para verificar se está no plano starter (compat: antes era isBasicPlan)
 */
export function useIsBasicPlan(): boolean {
  const { isStarter } = usePlan()
  return isStarter
}

/**
 * Hook para verificar se tem acesso a IA
 */
export function useCanUseAI(): boolean {
  const { canUseAiAgents } = usePlan()
  return canUseAiAgents
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT DAS CONFIGS (para uso em server components ou APIs)
// ═══════════════════════════════════════════════════════════════════════════════

export { PLAN_CONFIGS }

export function getPlanConfig(planName: string): PlanConfig {
  return resolvePlanConfig(planName)
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIGS)
}