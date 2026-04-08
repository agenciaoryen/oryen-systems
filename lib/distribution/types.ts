// lib/distribution/types.ts
// Tipos para o sistema de distribuição inteligente de leads (Lead Roulette v2.2)

export type DistributionStrategy = 'round_robin' | 'balanced_load' | 'score_weighted' | 'expertise_match'

export interface DistributionConfig {
  strategy: DistributionStrategy
  enabled: boolean
  auto_reassign_enabled: boolean
  auto_reassign_timeout_minutes: number
  stale_threshold_days: number
  max_leads_per_broker: number | null
  eligible_roles: string[]
  working_hours: {
    start: string // "08:00"
    end: string   // "20:00"
    timezone: string
  }
}

export const DEFAULT_DISTRIBUTION_CONFIG: DistributionConfig = {
  strategy: 'round_robin',
  enabled: true,
  auto_reassign_enabled: false,
  auto_reassign_timeout_minutes: 30,
  stale_threshold_days: 5,
  max_leads_per_broker: null,
  eligible_roles: ['owner', 'admin', 'vendedor'],
  working_hours: {
    start: '08:00',
    end: '20:00',
    timezone: 'America/Sao_Paulo',
  },
}

export interface BrokerProfile {
  userId: string
  name: string
  role: string
  isAvailable: boolean
  maxActiveLeads: number | null
  activeLeadCount: number
  regions: string[]
  cities: string[]
  propertyTypes: string[]
  transactionTypes: string[]
  priceRangeMin: number | null
  priceRangeMax: number | null
  conversionRate: number
  avgResponseTimeMin: number | null
}

export interface LeadContext {
  leadId: string
  orgId: string
  source: string
  city?: string | null
  region?: string | null
  propertyType?: string | null
  transactionType?: string | null
  priceRange?: number | null
  score?: number
  scoreLabel?: string
}

export interface AssignmentResult {
  assignedTo: string | null
  strategy: DistributionStrategy
  matchScore?: number
  reason?: string
}

export interface StaleLead {
  leadId: string
  leadName: string
  phone: string
  stage: string
  assignedTo: string | null
  assignedToName: string | null
  daysSinceUpdate: number
  score: number
  scoreLabel: string
}

export interface WorkloadStats {
  userId: string
  userName: string
  role: string
  isAvailable: boolean
  activeLeads: number
  leadsThisWeek: number
  leadsThisMonth: number
  conversionRate: number
  avgResponseTimeMin: number | null
  leadsByStage: Record<string, number>
}
