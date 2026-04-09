// lib/goals/types.ts

export interface GoalTemplate {
  id: string
  name_pt: string
  name_en: string
  name_es: string
  description_pt: string | null
  description_en: string | null
  description_es: string | null
  icon: string
  unit: 'currency' | 'number' | 'percentage' | 'minutes'
  data_source: string
  default_target: number | null
  requires_plan: string
  sort_order: number
}

export interface OrgGoal {
  id: string
  org_id: string
  template_id: string
  period_start: string
  period_end: string
  target_value: number
  current_value: number
  custom_name: string | null
  custom_description: string | null
  broker_id: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  goal_templates?: GoalTemplate
}

export interface GoalSnapshot {
  id: string
  goal_id: string
  org_id: string
  snapshot_date: string
  value: number
  created_at: string
}

export interface GoalStreak {
  id: string
  org_id: string
  template_id: string
  broker_id: string | null
  current_streak: number
  best_streak: number
  last_achieved_month: string | null
  updated_at: string
}

export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'critical'

export interface GoalProgress {
  goal: OrgGoal
  template: GoalTemplate
  currentValue: number
  targetValue: number
  percentage: number
  pace: PaceStatus
  projectedValue: number
  daysRemaining: number
  daysElapsed: number
  streak: GoalStreak | null
  trend: number[]  // last 3 months values
  brokerBreakdown?: { broker_id: string; broker_name: string; value: number }[]
}

export interface CoachResult {
  summary: string
  recommendations: string[]
  pace_analysis: string
  priority_goal: string
  generated_at: string
}
