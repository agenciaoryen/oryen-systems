'use client'

import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus, Clock } from 'lucide-react'
import type { FinancialKPIs } from '@/lib/financial/types'
import { formatPrice } from '@/lib/format'

const TRANSLATIONS = {
  pt: {
    revenue: 'Receita Total',
    expenses: 'Despesas',
    netProfit: 'Lucro Líquido',
    profitMargin: 'Margem de Lucro',
    pendingComm: 'Comissões Pendentes',
    noData: 'Sem dados',
    vsPrev: 'vs período anterior',
  },
  en: {
    revenue: 'Total Revenue',
    expenses: 'Expenses',
    netProfit: 'Net Profit',
    profitMargin: 'Profit Margin',
    pendingComm: 'Pending Commissions',
    noData: 'No data',
    vsPrev: 'vs previous period',
  },
  es: {
    revenue: 'Ingresos Totales',
    expenses: 'Gastos',
    netProfit: 'Beneficio Neto',
    profitMargin: 'Margen de Beneficio',
    pendingComm: 'Comisiones Pendientes',
    noData: 'Sin datos',
    vsPrev: 'vs período anterior',
  },
}

type Lang = keyof typeof TRANSLATIONS

interface Props {
  kpis: FinancialKPIs | null
  loading: boolean
  currency: string
  lang: Lang
  isBasic: boolean
}

export default function FinancialKPICards({ kpis, loading, currency, lang, isBasic }: Props) {
  const t = TRANSLATIONS[lang]
  const locale = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US'

  const fmt = (v: number) => formatPrice(v, currency, locale)

  const cards = isBasic
    ? [
        {
          label: t.revenue,
          value: kpis ? fmt(kpis.totalRevenue) : '-',
          trend: kpis?.revenueTrend ?? 0,
          icon: DollarSign,
          color: '#10b981',
        },
      ]
    : [
        {
          label: t.revenue,
          value: kpis ? fmt(kpis.totalRevenue) : '-',
          trend: kpis?.revenueTrend ?? 0,
          icon: DollarSign,
          color: '#10b981',
        },
        {
          label: t.expenses,
          value: kpis ? fmt(kpis.totalExpenses) : '-',
          trend: kpis?.expenseTrend ?? 0,
          icon: TrendingDown,
          color: '#ef4444',
          invertTrend: true,
        },
        {
          label: t.netProfit,
          value: kpis ? fmt(kpis.netProfit) : '-',
          trend: kpis?.profitTrend ?? 0,
          icon: TrendingUp,
          color: kpis && kpis.netProfit >= 0 ? '#10b981' : '#ef4444',
        },
        {
          label: t.profitMargin,
          value: kpis ? `${kpis.profitMarginPct.toFixed(1)}%` : '-',
          trend: 0,
          icon: TrendingUp,
          color: '#6366f1',
          hideTrend: true,
        },
        {
          label: t.pendingComm,
          value: kpis ? fmt(kpis.pendingCommissions) : '-',
          trend: 0,
          icon: Clock,
          color: '#f59e0b',
          hideTrend: true,
        },
      ]

  return (
    <div className={`grid gap-4 ${isBasic ? 'grid-cols-1 max-w-sm' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
      {cards.map((card) => {
        const Icon = card.icon
        const isPositive = card.invertTrend ? card.trend < 0 : card.trend > 0
        const isNeutral = card.trend === 0

        return (
          <div
            key={card.label}
            className="rounded-xl p-4 transition-all"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {card.label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${card.color}14` }}
              >
                <Icon size={16} style={{ color: card.color }} />
              </div>
            </div>

            {loading ? (
              <div className="h-7 w-24 rounded animate-pulse" style={{ background: 'var(--color-bg-elevated)' }} />
            ) : (
              <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {card.value}
              </p>
            )}

            {!card.hideTrend && !loading && (
              <div className="flex items-center gap-1 mt-2">
                {isNeutral ? (
                  <Minus size={12} style={{ color: 'var(--color-text-muted)' }} />
                ) : isPositive ? (
                  <ArrowUpRight size={12} style={{ color: '#10b981' }} />
                ) : (
                  <ArrowDownRight size={12} style={{ color: '#ef4444' }} />
                )}
                <span
                  className="text-xs font-medium"
                  style={{ color: isNeutral ? 'var(--color-text-muted)' : isPositive ? '#10b981' : '#ef4444' }}
                >
                  {isNeutral ? '-' : `${Math.abs(card.trend).toFixed(1)}%`}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t.vsPrev}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
