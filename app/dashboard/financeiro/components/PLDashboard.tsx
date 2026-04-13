'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { formatPrice } from '@/lib/format'
import type { MonthlyPLData } from '@/lib/financial/types'

const TRANSLATIONS = {
  pt: {
    title: 'P&L Mensal',
    revenue: 'Receita',
    expenses: 'Despesas',
    netProfit: 'Lucro Líquido',
    empty: 'Nenhum dado disponível para o período.',
    locale: 'pt-BR',
  },
  en: {
    title: 'Monthly P&L',
    revenue: 'Revenue',
    expenses: 'Expenses',
    netProfit: 'Net Profit',
    empty: 'No data available for this period.',
    locale: 'en-US',
  },
  es: {
    title: 'P&L Mensual',
    revenue: 'Ingresos',
    expenses: 'Gastos',
    netProfit: 'Beneficio Neto',
    empty: 'No hay datos disponibles para el período.',
    locale: 'es-ES',
  },
} as const

type Lang = keyof typeof TRANSLATIONS

interface Props {
  data: MonthlyPLData[]
  currency: string
  lang: Lang
}

function formatCompactCurrency(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatMonthLabel(month: string, locale: string): string {
  const date = new Date(month + '-15')
  return date.toLocaleDateString(locale, { month: 'short' })
}

interface TooltipPayloadItem {
  color: string
  name: string
  value: number
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  currency: string
  locale: string
}) {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '12px 16px',
      }}
    >
      <p style={{ color: 'var(--color-text-primary)', margin: '0 0 8px', fontWeight: 600 }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, margin: '4px 0', fontSize: 14 }}>
          {entry.name}: {formatPrice(entry.value, currency, locale)}
        </p>
      ))}
    </div>
  )
}

export default function PLDashboard({ data, currency, lang }: Props) {
  const t = TRANSLATIONS[lang]

  const chartData = data.map((item) => ({
    ...item,
    label: formatMonthLabel(item.month, t.locale),
  }))

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <h3 style={{ color: 'var(--color-text-primary)', margin: '0 0 16px', fontSize: 18 }}>
        {t.title}
      </h3>

      {data.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>
          {t.empty}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              tickFormatter={(value: number) => formatCompactCurrency(value, currency, t.locale)}
            />
            <Tooltip
              content={<CustomTooltip currency={currency} locale={t.locale} />}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 13 }}
              formatter={(value: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>}
            />
            <Bar
              dataKey="revenue"
              name={t.revenue}
              fill="#10b981"
              barSize={20}
            />
            <Bar
              dataKey="expenses"
              name={t.expenses}
              fill="#ef4444"
              barSize={20}
            />
            <Line
              type="monotone"
              dataKey="netProfit"
              name={t.netProfit}
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
