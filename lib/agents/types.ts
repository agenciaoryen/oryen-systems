// lib/agents/types.ts

export type AgentTier = 'instant' | 'template' | 'custom'
export type AgentCategory = 'conversation' | 'prospecting' | 'support' | 'automation'
export type AgentStatus = 'active' | 'paused' | 'maintenance' | 'pending_setup'

export interface AgentSolution {
  slug: string
  name: string
  description: string
  icon: string
  category: AgentCategory
  tier: AgentTier
  price_monthly: number
  price_setup: number
  price_display: string
  currency: string
  features: string[]
  limits: {
    leads_per_month?: number
    messages_per_day?: number
    searches_per_day?: number
    sequences_active?: number
    campaigns_active?: number
    [key: string]: number | undefined
  }
  required_integrations: string[]
  config_schema: {
    fields: ConfigField[]
  }
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'time_range'
  placeholder?: string
  required?: boolean
  options?: string[]
  min?: number
  max?: number
}

export interface Agent {
  id: string
  org_id: string
  name: string | null
  kind: string
  status: AgentStatus
  cfg: Record<string, any>
  n8n_workflow_id: string | null
  n8n_webhook_url: string | null
  activated_at: string | null
  paused_at: string | null
  paused_reason: string | null
  billing_started_at: string | null
  next_billing_at: string | null
  metrics: AgentMetricsCache
  custom_limits: Record<string, number> | null
  created_at: string
  updated_at: string
  // Joined
  solution?: AgentSolution
}

export interface AgentMetricsCache {
  total_runs?: number
  total_cost?: number
  success_rate?: number
  last_run_at?: string
  last_run_status?: string
  leads_contacted?: number
  leads_qualified?: number
}

export interface AgentRun {
  id: string
  org_id: string
  agent_id: string
  status: 'success' | 'error' | 'failed' | 'running' | 'pending'
  duration_ms: number | null
  cost_usd: number | null
  error_msg: string | null
  started_at: string
  finished_at: string | null
  trigger_type: 'webhook' | 'schedule' | 'manual' | 'event' | null
  lead_id: string | null
  input_data: Record<string, any> | null
  output_data: Record<string, any> | null
  tokens_input: number | null
  tokens_output: number | null
  model_used: string | null
}

export interface AgentMetrics {
  id: string
  agent_id: string
  org_id: string
  date: string
  total_runs: number
  successful_runs: number
  failed_runs: number
  total_cost_usd: number
  total_tokens: number
  avg_duration_ms: number
  leads_contacted: number
  leads_qualified: number
  leads_converted: number
  messages_sent: number
  messages_received: number
}

export interface AgentEvent {
  id: string
  agent_id: string
  org_id: string
  event_type: 'activated' | 'paused' | 'resumed' | 'config_changed' | 'error_alert' | 'limit_reached' | 'billing_started'
  title: string
  description: string | null
  metadata: Record<string, any>
  user_id: string | null
  created_at: string
}

// Traduções
export interface AgentTranslations {
  name: string
  description: string
  features: string[]
}