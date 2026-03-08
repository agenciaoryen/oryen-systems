// lib/usePlan.ts
'use client'

import { useAuth } from '@/lib/AuthContext'
import { useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type PlanName = 'basic' | 'gold' | 'diamond' | 'enterprise'

export interface PlanFeatures {
  hasAiAgents: boolean
  hasAutomations: boolean
  hasReports: boolean
  hasApiAccess: boolean
  hasCampaigns: boolean
  hasTrafficManager: boolean
  hasAdvancedDashboard: boolean
  hasCustomPipeline: boolean
  hasWhatsappIntegration: boolean
  hasOfficialWhatsapp: boolean
  hasPrioritySupport: boolean
  hasAccountManager: boolean
}

export interface PlanLimits {
  maxUsers: number          // -1 = ilimitado
  maxActiveLeads: number    // -1 = ilimitado
  maxMonthlyMessages: number // -1 = ilimitado, 0 = só manual
  maxWhatsappNumbers: number // -1 = ilimitado
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

const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  basic: {
    name: 'basic',
    displayName: 'Basic',
    priceUsd: 19,
    priceBrl: 97,
    features: {
      hasAiAgents: false,
      hasAutomations: false,
      hasReports: false,
      hasApiAccess: false,
      hasCampaigns: false,
      hasTrafficManager: false,
      hasAdvancedDashboard: false,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: false, // disponível com +taxa
      hasPrioritySupport: false,
      hasAccountManager: false,
    },
    limits: {
      maxUsers: 1,
      maxActiveLeads: 1000,
      maxMonthlyMessages: 0,
      maxWhatsappNumbers: 1,
    }
  },
  gold: {
    name: 'gold',
    displayName: 'Gold',
    priceUsd: 219,
    priceBrl: 1097,
    features: {
      hasAiAgents: true,
      hasAutomations: true,
      hasReports: true,
      hasApiAccess: false,
      hasCampaigns: false,
      hasTrafficManager: false,
      hasAdvancedDashboard: true,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: true,
      hasPrioritySupport: false,
      hasAccountManager: false,
    },
    limits: {
      maxUsers: 5,
      maxActiveLeads: 5000,
      maxMonthlyMessages: 10000,
      maxWhatsappNumbers: 5,
    }
  },
  diamond: {
    name: 'diamond',
    displayName: 'Diamond',
    priceUsd: 329,
    priceBrl: 1647,
    features: {
      hasAiAgents: true,
      hasAutomations: true,
      hasReports: true,
      hasApiAccess: true,
      hasCampaigns: true,
      hasTrafficManager: true,
      hasAdvancedDashboard: true,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: true,
      hasPrioritySupport: true,
      hasAccountManager: false,
    },
    limits: {
      maxUsers: 15,
      maxActiveLeads: 10000,
      maxMonthlyMessages: 50000,
      maxWhatsappNumbers: 15,
    }
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceUsd: 0, // Custom
    priceBrl: 0,
    features: {
      hasAiAgents: true,
      hasAutomations: true,
      hasReports: true,
      hasApiAccess: true,
      hasCampaigns: true,
      hasTrafficManager: true,
      hasAdvancedDashboard: true,
      hasCustomPipeline: true,
      hasWhatsappIntegration: true,
      hasOfficialWhatsapp: true,
      hasPrioritySupport: true,
      hasAccountManager: true,
    },
    limits: {
      maxUsers: -1,
      maxActiveLeads: -1,
      maxMonthlyMessages: -1,
      maxWhatsappNumbers: -1,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function usePlan() {
  const { activePlan, activePlanStatus } = useAuth()
  
  const planName = activePlan || 'basic'
  const planConfig = PLAN_CONFIGS[planName] || PLAN_CONFIGS.basic

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
    
    // Helpers de comparação
    isBasic: planName === 'basic',
    isGold: planName === 'gold',
    isDiamond: planName === 'diamond',
    isEnterprise: planName === 'enterprise',
    isPaid: planName !== 'basic',
    isPremium: planName === 'diamond' || planName === 'enterprise',
    
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
      if (planName === 'basic') return 'gold'
      if (planName === 'gold') return 'diamond'
      if (planName === 'diamond') return 'enterprise'
      return null
    },
    
    // Config do próximo plano
    getUpgradePlanConfig: (): PlanConfig | null => {
      const next = planName === 'basic' ? 'gold' 
                 : planName === 'gold' ? 'diamond'
                 : planName === 'diamond' ? 'enterprise'
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
 * Hook para verificar se está no plano basic
 */
export function useIsBasicPlan(): boolean {
  const { isBasic } = usePlan()
  return isBasic
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

export function getPlanConfig(planName: PlanName): PlanConfig {
  return PLAN_CONFIGS[planName] || PLAN_CONFIGS.basic
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIGS).filter(p => p.name !== 'enterprise')
}