'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { usePlan } from '@/lib/usePlan'
import { supabase } from '@/lib/supabase'
import { subMonths, startOfMonth, endOfMonth, startOfYear, subDays } from 'date-fns'
import { DollarSign, RefreshCw, Download, TrendingUp } from 'lucide-react'

import FinancialKPICards from './components/FinancialKPICards'
import PLDashboard from './components/PLDashboard'
import RevenueBreakdown from './components/RevenueBreakdown'
import CommissionsPanel from './components/CommissionsPanel'
import CommissionRulesEditor from './components/CommissionRulesEditor'
import ExpensesPanel from './components/ExpensesPanel'
import RecurringExpensesManager from './components/RecurringExpensesManager'
import GoalProgress from './components/GoalProgress'
import ForecastPanel from './components/ForecastPanel'
import ReportExporter from './components/ReportExporter'
import { FeatureLock } from '@/app/dashboard/components/FeatureLock'

import {
  getFinancialKPIs,
  getMonthlyPL,
  getRevenueByBroker,
  getRevenueBySource,
  getExpensesByCategory,
  getCommissionsSummary,
} from '@/lib/financial/aggregations'

import type {
  FinancialKPIs as FinancialKPIsType,
  MonthlyPLData,
  BrokerRevenue,
  SourceRevenue,
  CategoryExpense,
  CommissionSummary,
} from '@/lib/financial/types'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Financeiro',
    subtitle: 'Gestao financeira completa da sua operacao',
    refresh: 'Atualizar',
    loading: 'Carregando dados financeiros...',
    tabs: {
      overview: 'Visao Geral',
      commissions: 'Comissoes',
      expenses: 'Despesas',
      reports: 'Relatorios',
    },
    periods: {
      month: 'Este Mes',
      quarter: 'Trimestre',
      semester: 'Semestre',
      year: 'Este Ano',
    },
  },
  en: {
    title: 'Financial',
    subtitle: 'Complete financial management for your operation',
    refresh: 'Refresh',
    loading: 'Loading financial data...',
    tabs: {
      overview: 'Overview',
      commissions: 'Commissions',
      expenses: 'Expenses',
      reports: 'Reports',
    },
    periods: {
      month: 'This Month',
      quarter: 'Quarter',
      semester: 'Semester',
      year: 'This Year',
    },
  },
  es: {
    title: 'Financiero',
    subtitle: 'Gestion financiera completa de su operacion',
    refresh: 'Actualizar',
    loading: 'Cargando datos financieros...',
    tabs: {
      overview: 'Vision General',
      commissions: 'Comisiones',
      expenses: 'Gastos',
      reports: 'Reportes',
    },
    periods: {
      month: 'Este Mes',
      quarter: 'Trimestre',
      semester: 'Semestre',
      year: 'Este Ano',
    },
  },
}

type Lang = keyof typeof TRANSLATIONS
type TabKey = 'overview' | 'commissions' | 'expenses' | 'reports'
type PeriodKey = 'month' | 'quarter' | 'semester' | 'year'

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FinanceiroPage() {
  const { user, isStaff, activeOrg } = useAuth()
  const { hasFeature, isBasic } = usePlan()
  const activeOrgId = useActiveOrgId()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = TRANSLATIONS[lang]
  const currency = (user as any)?.currency || 'BRL'

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [loading, setLoading] = useState(true)

  // Data states
  const [kpis, setKpis] = useState<FinancialKPIsType | null>(null)
  const [monthlyPL, setMonthlyPL] = useState<MonthlyPLData[]>([])
  const [brokerRevenue, setBrokerRevenue] = useState<BrokerRevenue[]>([])
  const [sourceRevenue, setSourceRevenue] = useState<SourceRevenue[]>([])
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryExpense[]>([])
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null)

  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    let start: Date
    const end = now

    switch (period) {
      case 'month':
        start = startOfMonth(now)
        break
      case 'quarter':
        start = subMonths(startOfMonth(now), 2)
        break
      case 'semester':
        start = subMonths(startOfMonth(now), 5)
        break
      case 'year':
        start = startOfYear(now)
        break
      default:
        start = startOfMonth(now)
    }

    return { startDate: start, endDate: end }
  }, [period])

  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)

    try {
      // Para o PL mensal, buscar 12 meses atras independente do periodo selecionado
      const plStart = subMonths(startOfMonth(new Date()), 11)
      const plEnd = new Date()

      const [kpisData, plData, brokerData, sourceData, expenseData, commData] = await Promise.all([
        getFinancialKPIs(supabase, activeOrgId, startDate, endDate),
        getMonthlyPL(supabase, activeOrgId, plStart, plEnd),
        getRevenueByBroker(supabase, activeOrgId, startDate, endDate),
        getRevenueBySource(supabase, activeOrgId, startDate, endDate),
        getExpensesByCategory(supabase, activeOrgId, startDate, endDate),
        getCommissionsSummary(supabase, activeOrgId),
      ])

      setKpis(kpisData)
      setMonthlyPL(plData)
      setBrokerRevenue(brokerData)
      setSourceRevenue(sourceData)
      setExpensesByCategory(expenseData)
      setCommissionSummary(commData)
    } catch (err) {
      console.error('Financial data load error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const hasFinancial = hasFeature('hasFinancialModule')
  const hasAdvanced = hasFeature('hasAdvancedFinancial')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t.tabs.overview },
    { key: 'commissions', label: t.tabs.commissions },
    { key: 'expenses', label: t.tabs.expenses },
    { key: 'reports', label: t.tabs.reports },
  ]

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: 'month', label: t.periods.month },
    { key: 'quarter', label: t.periods.quarter },
    { key: 'semester', label: t.periods.semester },
    { key: 'year', label: t.periods.year },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <DollarSign size={28} style={{ color: 'var(--color-primary)' }} />
            {t.title}
          </h1>
          <p className="mt-1" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="rounded-lg p-1 flex overflow-x-auto"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            {periodOptions.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap"
                style={{
                  background: period === p.key ? 'var(--color-primary-subtle)' : 'transparent',
                  color: period === p.key ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={loadData} disabled={loading}
            className="p-2.5 rounded-lg transition-all disabled:opacity-50"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            title={t.refresh}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards (sempre visivel — basic ve so receita) */}
      <FinancialKPICards
        kpis={kpis}
        loading={loading}
        currency={currency}
        lang={lang}
        isBasic={isBasic}
      />

      {/* Gate: Full module for Gold+ */}
      <FeatureLock feature="hasFinancialModule" lang={lang} variant="replace"
        title={lang === 'pt' ? 'Modulo Financeiro' : lang === 'es' ? 'Modulo Financiero' : 'Financial Module'}>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap"
              style={{
                background: activeTab === tab.key ? 'var(--color-bg-surface)' : 'transparent',
                color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            <p>{t.loading}</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <PLDashboard data={monthlyPL} currency={currency} lang={lang} />
                <RevenueBreakdown
                  brokers={brokerRevenue}
                  sources={sourceRevenue}
                  currency={currency}
                  lang={lang}
                />
                <GoalProgress orgId={activeOrgId || ''} currency={currency} lang={lang} />
                <FeatureLock feature="hasAdvancedFinancial" lang={lang} variant="replace"
                  title={lang === 'pt' ? 'Projecao Financeira' : lang === 'es' ? 'Proyeccion Financiera' : 'Financial Forecast'}>
                  <ForecastPanel orgId={activeOrgId || ''} currency={currency} lang={lang} />
                </FeatureLock>
              </div>
            )}

            {/* Tab: Commissions */}
            {activeTab === 'commissions' && (
              <div className="space-y-6">
                <CommissionsPanel
                  orgId={activeOrgId || ''}
                  currency={currency}
                  lang={lang}
                  onUpdate={loadData}
                />
                <CommissionRulesEditor
                  orgId={activeOrgId || ''}
                  currency={currency}
                  lang={lang}
                />
              </div>
            )}

            {/* Tab: Expenses */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <ExpensesPanel
                  orgId={activeOrgId || ''}
                  currency={currency}
                  lang={lang}
                  startDate={startDate}
                  endDate={endDate}
                  onUpdate={loadData}
                />
                <RecurringExpensesManager
                  orgId={activeOrgId || ''}
                  currency={currency}
                  lang={lang}
                />
              </div>
            )}

            {/* Tab: Reports */}
            {activeTab === 'reports' && (
              <ReportExporter
                orgId={activeOrgId || ''}
                orgName={activeOrg?.name || 'Org'}
                monthlyPL={monthlyPL}
                brokerRevenue={brokerRevenue}
                expensesByCategory={expensesByCategory}
                currency={currency}
                lang={lang}
              />
            )}
          </>
        )}
      </FeatureLock>
    </div>
  )
}
