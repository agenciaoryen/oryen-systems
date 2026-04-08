// lib/financial/aggregations.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  FinancialKPIs,
  MonthlyPLData,
  BrokerRevenue,
  SourceRevenue,
  CategoryExpense,
  CommissionSummary,
  TimeSeriesPoint,
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function toRefMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function monthKey(dateStr: string): string {
  return dateStr.substring(0, 7) // 'YYYY-MM'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FINANCIAL KPIs
// ═══════════════════════════════════════════════════════════════════════════════

export async function getFinancialKPIs(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<FinancialKPIs> {
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  // Periodo anterior (mesmo tamanho)
  const durationMs = endDate.getTime() - startDate.getTime()
  const prevStart = new Date(startDate.getTime() - durationMs).toISOString().split('T')[0]
  const prevEnd = start

  // Queries paralelas
  const [currentRevenue, currentExpenses, prevRevenue, prevExpenses, commissions] = await Promise.all([
    supabase
      .from('financial_transactions')
      .select('amount')
      .eq('org_id', orgId)
      .eq('type', 'revenue')
      .eq('status', 'confirmed')
      .gte('transaction_date', start)
      .lte('transaction_date', end),
    supabase
      .from('financial_transactions')
      .select('amount')
      .eq('org_id', orgId)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('transaction_date', start)
      .lte('transaction_date', end),
    supabase
      .from('financial_transactions')
      .select('amount')
      .eq('org_id', orgId)
      .eq('type', 'revenue')
      .eq('status', 'confirmed')
      .gte('transaction_date', prevStart)
      .lt('transaction_date', prevEnd),
    supabase
      .from('financial_transactions')
      .select('amount')
      .eq('org_id', orgId)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('transaction_date', prevStart)
      .lt('transaction_date', prevEnd),
    supabase
      .from('commissions')
      .select('total_commission, status')
      .eq('org_id', orgId),
  ])

  const totalRevenue = (currentRevenue.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
  const totalExpenses = (currentExpenses.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const prevTotalRevenue = (prevRevenue.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
  const prevTotalExpenses = (prevExpenses.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
  const prevNetProfit = prevTotalRevenue - prevTotalExpenses

  const pctChange = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / prev) * 100

  const allCommissions = commissions.data || []
  const pendingCommissions = allCommissions
    .filter(c => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.total_commission), 0)
  const paidCommissions = allCommissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.total_commission), 0)

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMarginPct,
    pendingCommissions,
    paidCommissions,
    revenueTrend: pctChange(totalRevenue, prevTotalRevenue),
    expenseTrend: pctChange(totalExpenses, prevTotalExpenses),
    profitTrend: pctChange(netProfit, prevNetProfit),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MONTHLY P&L
// ═══════════════════════════════════════════════════════════════════════════════

export async function getMonthlyPL(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyPLData[]> {
  const start = toRefMonth(startDate)
  const end = toRefMonth(endDate)

  const { data } = await supabase
    .from('financial_transactions')
    .select('type, amount, reference_month')
    .eq('org_id', orgId)
    .eq('status', 'confirmed')
    .gte('reference_month', start)
    .lte('reference_month', end)

  if (!data || data.length === 0) return []

  const months: Record<string, { revenue: number; expenses: number }> = {}

  for (const tx of data) {
    const key = monthKey(tx.reference_month)
    if (!months[key]) months[key] = { revenue: 0, expenses: 0 }
    if (tx.type === 'revenue') {
      months[key].revenue += Number(tx.amount)
    } else if (tx.type === 'expense') {
      months[key].expenses += Number(tx.amount)
    }
  }

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({
      month,
      revenue: vals.revenue,
      expenses: vals.expenses,
      netProfit: vals.revenue - vals.expenses,
    }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. REVENUE BY BROKER
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRevenueByBroker(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<BrokerRevenue[]> {
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  const [txResult, commResult, usersResult] = await Promise.all([
    supabase
      .from('financial_transactions')
      .select('broker_id, amount')
      .eq('org_id', orgId)
      .eq('type', 'revenue')
      .eq('status', 'confirmed')
      .not('broker_id', 'is', null)
      .gte('transaction_date', start)
      .lte('transaction_date', end),
    supabase
      .from('commissions')
      .select('broker_id, total_commission')
      .eq('org_id', orgId)
      .in('status', ['pending', 'approved', 'paid']),
    supabase
      .from('users')
      .select('id, name')
      .eq('org_id', orgId),
  ])

  const userMap = new Map((usersResult.data || []).map(u => [u.id, u.name || 'Sem nome']))

  const brokers: Record<string, { revenue: number; deals: number; commission: number }> = {}

  for (const tx of txResult.data || []) {
    if (!tx.broker_id) continue
    if (!brokers[tx.broker_id]) brokers[tx.broker_id] = { revenue: 0, deals: 0, commission: 0 }
    brokers[tx.broker_id].revenue += Number(tx.amount)
    brokers[tx.broker_id].deals += 1
  }

  for (const c of commResult.data || []) {
    if (!brokers[c.broker_id]) brokers[c.broker_id] = { revenue: 0, deals: 0, commission: 0 }
    brokers[c.broker_id].commission += Number(c.total_commission)
  }

  return Object.entries(brokers)
    .map(([brokerId, vals]) => ({
      broker_id: brokerId,
      broker_name: userMap.get(brokerId) || 'Sem nome',
      revenue: vals.revenue,
      deals_count: vals.deals,
      commission_total: vals.commission,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. REVENUE BY SOURCE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRevenueBySource(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<SourceRevenue[]> {
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  const { data } = await supabase
    .from('financial_transactions')
    .select('lead_id, amount, leads!inner(source)')
    .eq('org_id', orgId)
    .eq('type', 'revenue')
    .eq('status', 'confirmed')
    .gte('transaction_date', start)
    .lte('transaction_date', end)

  if (!data || data.length === 0) return []

  const sources: Record<string, { revenue: number; deals: number }> = {}

  for (const tx of data) {
    const source = (tx as any).leads?.source || 'unknown'
    if (!sources[source]) sources[source] = { revenue: 0, deals: 0 }
    sources[source].revenue += Number(tx.amount)
    sources[source].deals += 1
  }

  return Object.entries(sources)
    .map(([source, vals]) => ({
      source,
      revenue: vals.revenue,
      deals_count: vals.deals,
      avg_deal_value: vals.deals > 0 ? vals.revenue / vals.deals : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EXPENSES BY CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

export async function getExpensesByCategory(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryExpense[]> {
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  const { data } = await supabase
    .from('financial_transactions')
    .select('category, amount')
    .eq('org_id', orgId)
    .eq('type', 'expense')
    .eq('status', 'confirmed')
    .gte('transaction_date', start)
    .lte('transaction_date', end)

  if (!data || data.length === 0) return []

  const cats: Record<string, { amount: number; count: number }> = {}
  let total = 0

  for (const tx of data) {
    if (!cats[tx.category]) cats[tx.category] = { amount: 0, count: 0 }
    cats[tx.category].amount += Number(tx.amount)
    cats[tx.category].count += 1
    total += Number(tx.amount)
  }

  return Object.entries(cats)
    .map(([category, vals]) => ({
      category,
      amount: vals.amount,
      count: vals.count,
      percentage: total > 0 ? (vals.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. COMMISSIONS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCommissionsSummary(
  supabase: SupabaseClient,
  orgId: string
): Promise<CommissionSummary> {
  const { data } = await supabase
    .from('commissions')
    .select('total_commission, status')
    .eq('org_id', orgId)

  const result: CommissionSummary = {
    pending: 0, approved: 0, paid: 0, cancelled: 0, total: 0,
    pendingCount: 0, approvedCount: 0, paidCount: 0,
  }

  for (const c of data || []) {
    const amount = Number(c.total_commission)
    result[c.status as keyof Pick<CommissionSummary, 'pending' | 'approved' | 'paid' | 'cancelled'>] += amount
    result.total += amount
    if (c.status === 'pending') result.pendingCount++
    else if (c.status === 'approved') result.approvedCount++
    else if (c.status === 'paid') result.paidCount++
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. REVENUE TIME SERIES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRevenueTimeSeries(
  supabase: SupabaseClient,
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesPoint[]> {
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]

  const { data } = await supabase
    .from('financial_transactions')
    .select('type, amount, transaction_date')
    .eq('org_id', orgId)
    .eq('status', 'confirmed')
    .in('type', ['revenue', 'expense'])
    .gte('transaction_date', start)
    .lte('transaction_date', end)
    .order('transaction_date', { ascending: true })

  if (!data || data.length === 0) return []

  const days: Record<string, { revenue: number; expenses: number }> = {}

  for (const tx of data) {
    const date = tx.transaction_date
    if (!days[date]) days[date] = { revenue: 0, expenses: 0 }
    if (tx.type === 'revenue') days[date].revenue += Number(tx.amount)
    else days[date].expenses += Number(tx.amount)
  }

  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      revenue: vals.revenue,
      expenses: vals.expenses,
    }))
}
