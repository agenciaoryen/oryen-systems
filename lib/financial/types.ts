// lib/financial/types.ts

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSION RULES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CommissionTier {
  up_to: number | null  // null = sem limite (ultimo tier)
  rate: number          // percentual (ex: 5.0 = 5%)
}

export interface CommissionRule {
  id: string
  org_id: string
  broker_id: string | null
  name: string
  tiers: CommissionTier[]
  agency_split_pct: number
  broker_split_pct: number
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type TransactionType = 'revenue' | 'expense' | 'commission'
export type TransactionStatus = 'pending' | 'confirmed' | 'cancelled'

export type ExpenseCategory =
  | 'deal_closed'
  | 'marketing'
  | 'office'
  | 'travel'
  | 'tools'
  | 'personnel'
  | 'taxes'
  | 'other'

export interface FinancialTransaction {
  id: string
  org_id: string
  type: TransactionType
  category: ExpenseCategory | string
  amount: number
  currency: string
  description: string | null
  lead_id: string | null
  broker_id: string | null
  commission_rule_id: string | null
  recurring_id: string | null
  status: TransactionStatus
  transaction_date: string
  reference_month: string
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  attachments: { url: string; name: string; type: string }[]
  created_at: string
  updated_at: string
  // Joined fields
  lead_name?: string
  broker_name?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled'

export interface Commission {
  id: string
  org_id: string
  transaction_id: string | null
  lead_id: string
  broker_id: string
  commission_rule_id: string | null
  deal_value: number
  commission_rate: number
  total_commission: number
  agency_amount: number
  broker_amount: number
  status: CommissionStatus
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  currency: string
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  lead_name?: string
  broker_name?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECURRING EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RecurringExpense {
  id: string
  org_id: string
  category: string
  description: string
  amount: number
  currency: string
  day_of_month: number
  is_active: boolean
  last_generated_month: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSE APPROVALS
// ═══════════════════════════════════════════════════════════════════════════════

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ExpenseApproval {
  id: string
  transaction_id: string
  org_id: string
  requested_by: string
  status: ApprovalStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION TYPES (para dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FinancialKPIs {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMarginPct: number
  pendingCommissions: number
  paidCommissions: number
  // Comparacao com periodo anterior
  revenueTrend: number   // % change
  expenseTrend: number
  profitTrend: number
}

export interface MonthlyPLData {
  month: string       // 'YYYY-MM'
  revenue: number
  expenses: number
  netProfit: number
}

export interface BrokerRevenue {
  broker_id: string
  broker_name: string
  revenue: number
  deals_count: number
  commission_total: number
}

export interface SourceRevenue {
  source: string
  revenue: number
  deals_count: number
  avg_deal_value: number
}

export interface CategoryExpense {
  category: string
  amount: number
  count: number
  percentage: number
}

export interface CommissionSummary {
  pending: number
  approved: number
  paid: number
  cancelled: number
  total: number
  pendingCount: number
  approvedCount: number
  paidCount: number
}

export interface TimeSeriesPoint {
  date: string
  revenue: number
  expenses: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS RANGE (reusa do analytics)
// ═══════════════════════════════════════════════════════════════════════════════

export type FinancialPeriod = 'month' | 'quarter' | 'year' | 'custom'
