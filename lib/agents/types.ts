// lib/agents/types.ts

// ═══════════════════════════════════════════════════════════════════════════════
// SOLUTION (Catálogo - o que vendemos)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgentSolution {
  slug: string
  name: Record<string, string>          // {pt, en, es}
  description: Record<string, string>   // {pt, en, es}
  features: Array<Record<string, string>> // [{pt, en, es}, ...]
  category: 'prospecting' | 'conversation' | 'support' | 'automation'
  icon: string
  price_monthly: number
  price_setup: number
  currency: string
  stripe_price_id: string | null
  stripe_setup_price_id: string | null
  default_limits: {
    leads_per_month?: number
    campaigns_max?: number
    [key: string]: number | undefined
  }
  campaign_config_schema: {
    fields: ConfigField[]
  }
  schedule_options: {
    frequencies: string[]
    default_frequency: string
    default_time: string
    min_interval_hours: number
  }
  required_integrations: string[]
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ConfigField {
  key: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'tags'
  required: boolean
  label: Record<string, string>
  placeholder?: Record<string, string>
  options?: Array<{ value: string; label: Record<string, string> }>
  default?: any
  min?: number
  max?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT (Contratação - nível ORG)
// ═══════════════════════════════════════════════════════════════════════════════

export type AgentStatus = 'active' | 'paused' | 'cancelled' | 'suspended'

export interface Agent {
  id: string
  org_id: string
  solution_slug: string
  status: AgentStatus
  limits: {
    leads_per_month?: number
    campaigns_max?: number
    [key: string]: number | undefined
  }
  current_usage: {
    leads_captured?: number
    period_start?: string
    [key: string]: any
  }
  stripe_subscription_id: string | null
  billing_started_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  activated_at: string | null
  paused_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  // Joined
  solution?: AgentSolution
  campaigns?: AgentCampaign[]
  campaigns_count?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN (Personalização - nível USER)
// ═══════════════════════════════════════════════════════════════════════════════

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'

export interface AgentCampaign {
  id: string
  agent_id: string
  org_id: string
  user_id: string
  name: string
  description: string | null
  config: Record<string, any>
  target_leads: number | null
  status: CampaignStatus
  schedule_frequency: 'hourly' | 'daily' | 'weekly' | 'manual'
  schedule_time: string
  schedule_days: number[]
  schedule_timezone: string
  next_run_at: string | null
  last_run_at: string | null
  metrics: {
    leads_captured?: number
    leads_qualified?: number
    total_runs?: number
    last_run_status?: string
    [key: string]: any
  }
  created_at: string
  updated_at: string
  completed_at: string | null
  // Joined
  agent?: Agent
  user?: { id: string; name: string; email: string }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN (Execuções)
// ═══════════════════════════════════════════════════════════════════════════════

export type RunStatus = 'pending' | 'running' | 'success' | 'partial' | 'error' | 'cancelled'
export type RunTrigger = 'schedule' | 'manual' | 'webhook'

export interface AgentRun {
  id: string
  campaign_id: string
  agent_id: string
  org_id: string
  status: RunStatus
  trigger_type: RunTrigger
  triggered_by: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  results: {
    leads_found?: number
    leads_saved?: number
    leads_duplicated?: number
    [key: string]: any
  }
  cost_usd: number
  tokens_used: number
  error_code: string | null
  error_message: string | null
  input_data: Record<string, any> | null
  output_data: Record<string, any> | null
  created_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export type Language = 'pt' | 'en' | 'es'

export interface UsageInfo {
  limit: number
  used: number
  remaining: number
  percentage: number
}