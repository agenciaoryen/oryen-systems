// lib/goals/constants.ts

export const TEMPLATE_IDS = {
  REVENUE: 'revenue',
  DEALS_CLOSED: 'deals_closed',
  LEADS_CAPTURED: 'leads_captured',
  RESPONSE_TIME: 'response_time',
  FOLLOW_UP_RATE: 'follow_up_rate',
  MEETINGS: 'meetings',
  CONVERSION_RATE: 'conversion_rate',
  ADS_BUDGET: 'ads_budget',
  CUSTOM: 'custom',
} as const

export const GOAL_COLORS: Record<string, string> = {
  revenue: '#10b981',
  deals_closed: '#6366f1',
  leads_captured: '#0ea5e9',
  response_time: '#f59e0b',
  follow_up_rate: '#8b5cf6',
  meetings: '#ec4899',
  conversion_rate: '#14b8a6',
  ads_budget: '#f97316',
  custom: '#6b7280',
}

export const GOAL_ICONS: Record<string, string> = {
  revenue: 'DollarSign',
  deals_closed: 'Handshake',
  leads_captured: 'UserPlus',
  response_time: 'Clock',
  follow_up_rate: 'RefreshCw',
  meetings: 'CalendarDays',
  conversion_rate: 'TrendingUp',
  ads_budget: 'Megaphone',
  custom: 'Target',
}

// Templates where lower value = better (inverted progress)
export const INVERTED_TEMPLATES = ['response_time']

// Templates that are manual (no auto-tracking)
export const MANUAL_TEMPLATES = ['ads_budget', 'custom']

export const UNIT_LABELS: Record<string, Record<string, string>> = {
  pt: {
    currency: '',
    number: '',
    percentage: '%',
    minutes: 'min',
  },
  en: {
    currency: '',
    number: '',
    percentage: '%',
    minutes: 'min',
  },
  es: {
    currency: '',
    number: '',
    percentage: '%',
    minutes: 'min',
  },
}

export const PACE_LABELS: Record<string, Record<string, string>> = {
  pt: {
    ahead: 'Adiantado',
    on_track: 'No ritmo',
    behind: 'Atrasado',
    critical: 'Critico',
  },
  en: {
    ahead: 'Ahead',
    on_track: 'On track',
    behind: 'Behind',
    critical: 'Critical',
  },
  es: {
    ahead: 'Adelantado',
    on_track: 'En ritmo',
    behind: 'Atrasado',
    critical: 'Critico',
  },
}

export const PACE_COLORS: Record<string, string> = {
  ahead: '#10b981',
  on_track: '#f59e0b',
  behind: '#ef4444',
  critical: '#dc2626',
}
