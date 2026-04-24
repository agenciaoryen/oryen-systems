// lib/planConfig.ts
// Configuração dos planos — compartilhado entre server e client
// NÃO colocar 'use client' aqui — este arquivo é universal

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type PlanName = 'starter' | 'pro' | 'business' | 'enterprise'
export type LegacyPlanName = 'basic' | 'gold' | 'diamond'
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
  maxUsers: number
  maxActiveLeads: number
  maxMonthlyMessages: number
  maxWhatsappNumbers: number
  maxProperties: number
  maxDocumentsPerMonth: number
  maxSites: number
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
// PLANOS v2 (Abril 2026)
// ═══════════════════════════════════════════════════════════════════════════════

export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
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
      maxDocumentsPerMonth: 30,
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
      maxDocumentsPerMonth: 100,
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
      maxDocumentsPerMonth: 300,
      maxSites: 1,
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
      maxSites: 1,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLANOS LEGADOS
// ═══════════════════════════════════════════════════════════════════════════════

// Configs dedicados para planos legados (não mapeiam 1:1 para os novos)
const LEGACY_PLAN_CONFIGS: Record<LegacyPlanName, PlanConfig> = {
  basic: {
    name: 'starter', // resolve para starter na tipagem, mas com features próprias
    displayName: 'Basic (Legado)',
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
      maxActiveLeads: 300,
      maxMonthlyMessages: 300,
      maxWhatsappNumbers: 1,
      maxProperties: 20,
      maxDocumentsPerMonth: 5,
      maxSites: 1,
    }
  },
  gold: {
    name: 'pro',
    displayName: 'Gold (Legado)',
    priceUsd: 49,
    priceBrl: 247,
    features: { ...PLAN_CONFIGS.pro.features },
    limits: { ...PLAN_CONFIGS.pro.limits },
  },
  diamond: {
    name: 'business',
    displayName: 'Diamond (Legado)',
    priceUsd: 99,
    priceBrl: 497,
    features: { ...PLAN_CONFIGS.business.features },
    limits: { ...PLAN_CONFIGS.business.limits },
  },
}

/**
 * Resolve qualquer nome de plano (novo ou legado) para um PlanConfig válido.
 */
export function resolvePlanConfig(planName: string): PlanConfig {
  if (planName in PLAN_CONFIGS) {
    return PLAN_CONFIGS[planName as PlanName]
  }
  if (planName in LEGACY_PLAN_CONFIGS) {
    return LEGACY_PLAN_CONFIGS[planName as LegacyPlanName]
  }
  return PLAN_CONFIGS.starter
}

export function getPlanConfig(planName: string): PlanConfig {
  return resolvePlanConfig(planName)
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIGS)
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENTES DISPONÍVEIS POR PLANO
// ═══════════════════════════════════════════════════════════════════════════════
// Define quais agent_solutions (por slug) cada plano inclui.
// Slugs com sufixo _imobiliario são variantes de nicho — mapeados automaticamente.
// '*' = todos os agentes disponíveis.

export const PLAN_AGENT_ACCESS: Record<PlanName, string[] | '*'> = {
  starter: ['sdr', 'sdr_imobiliario', 'followup', 'followup_imobiliario', 'bdr_email'],
  pro: ['sdr', 'sdr_imobiliario', 'followup', 'followup_imobiliario', 'support', 'bdr_email'],
  business: '*',
  enterprise: '*',
}

/**
 * Verifica se um plano tem acesso a um determinado agente.
 */
export function planHasAgent(planName: string, agentSlug: string): boolean {
  const config = resolvePlanConfig(planName)
  // Plano sem AI não tem acesso a nenhum agente
  if (!config.features.hasAiAgents) return false
  const access = PLAN_AGENT_ACCESS[config.name]
  if (access === '*') return true
  return access.includes(agentSlug)
}

/**
 * Retorna o plano mínimo necessário para acessar um agente.
 */
export function getMinPlanForAgent(agentSlug: string): PlanName {
  const planOrder: PlanName[] = ['starter', 'pro', 'business', 'enterprise']
  for (const plan of planOrder) {
    const access = PLAN_AGENT_ACCESS[plan]
    if (access === '*' || access.includes(agentSlug)) {
      return plan
    }
  }
  return 'enterprise'
}
