'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { formatPrice } from '@/lib/format'
import type { BrokerRevenue, SourceRevenue } from '@/lib/financial/types'

const TRANSLATIONS = {
  pt: {
    brokerTitle: 'Receita por Corretor',
    sourceTitle: 'Receita por Fonte',
    emptyBrokers: 'Nenhum corretor com receita no período.',
    emptySources: 'Nenhuma fonte de receita no período.',
    revenue: 'Receita',
    deals: 'Negócios',
    avgDeal: 'Ticket Médio',
    commission: 'Comissão',
    locale: 'pt-BR',
  },
  en: {
    brokerTitle: 'Revenue by Broker',
    sourceTitle: 'Revenue by Source',
    emptyBrokers: 'No broker revenue for this period.',
    emptySources: 'No source revenue for this period.',
    revenue: 'Revenue',
    deals: 'Deals',
    avgDeal: 'Avg Deal',
    commission: 'Commission',
    locale: 'en-US',
  },
  es: {
    brokerTitle: 'Ingresos por Corredor',
    sourceTitle: 'Ingresos por Fuente',
    emptyBrokers: 'Ningún corredor con ingresos en el período.',
    emptySources: 'Ninguna fuente de ingresos en el período.',
    revenue: 'Ingresos',
    deals: 'Negocios',
    avgDeal: 'Ticket Promedio',
    commission: 'Comisión',
    locale: 'es-ES',
  },
} as const

type Lang = keyof typeof TRANSLATIONS

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6']

interface Props {
  brokers: BrokerRevenue[]
  sources: SourceRevenue[]
  currency: string
  lang: Lang
}

interface BrokerTooltipPayloadItem {
  payload: { broker_name: string; revenue: number; deals_count: number; commission_total: number }
}

function BrokerTooltip({
  active,
  payload,
  currency,
  locale,
  labels,
}: {
  active?: boolean
  payload?: BrokerTooltipPayloadItem[]
  currency: string
  locale: string
  labels: { revenue: string; deals: string; commission: string }
}) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload

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
        {d.broker_name}
      </p>
      <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0', fontSize: 14 }}>
        {labels.revenue}: {formatPrice(d.revenue, currency, locale)}
      </p>
      <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0', fontSize: 14 }}>
        {labels.deals}: {d.deals_count}
      </p>
      <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0', fontSize: 14 }}>
        {labels.commission}: {formatPrice(d.commission_total, currency, locale)}
      </p>
    </div>
  )
}

interface SourceTooltipPayloadItem {
  payload: { source: string; revenue: number; deals_count: number; avg_deal_value: number }
}

function SourceTooltip({
  active,
  payload,
  currency,
  locale,
  labels,
}: {
  active?: boolean
  payload?: SourceTooltipPayloadItem[]
  currency: string
  locale: string
  labels: { revenue: string; deals: string; avgDeal: string }
}) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload

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
        {d.source}
      </p>
      <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0', fontSize: 14 }}>
        {labels.revenue}: {formatPrice(d.revenue, currency, locale)}
      </p>
      <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0', fontSize: 14 }}>
        {labels.deals}: {d.deals_count}
      </p>
      <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0', fontSize: 14 }}>
        {labels.avgDeal}: {formatPrice(d.avg_deal_value, currency, locale)}
      </p>
    </div>
  )
}

function formatCompactCurrency(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 20,
  flex: 1,
  minWidth: 0,
}

export default function RevenueBreakdown({ brokers, sources, currency, lang }: Props) {
  const t = TRANSLATIONS[lang]
  const topBrokers = brokers.slice(0, 10)
  const barHeight = Math.max(250, topBrokers.length * 40)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
      }}
    >
      {/* Broker Revenue */}
      <div style={cardStyle}>
        <h3 style={{ color: 'var(--color-text-primary)', margin: '0 0 16px', fontSize: 18 }}>
          {t.brokerTitle}
        </h3>

        {topBrokers.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>
            {t.emptyBrokers}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart data={topBrokers} layout="vertical">
              <YAxis
                type="category"
                dataKey="broker_name"
                width={120}
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              />
              <XAxis
                type="number"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                tickFormatter={(value: number) => formatCompactCurrency(value, currency, t.locale)}
              />
              <Tooltip
                content={
                  <BrokerTooltip
                    currency={currency}
                    locale={t.locale}
                    labels={{ revenue: t.revenue, deals: t.deals, commission: t.commission }}
                  />
                }
              />
              <Bar dataKey="revenue" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Source Revenue */}
      <div style={cardStyle}>
        <h3 style={{ color: 'var(--color-text-primary)', margin: '0 0 16px', fontSize: 18 }}>
          {t.sourceTitle}
        </h3>

        {sources.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>
            {t.emptySources}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={sources}
                dataKey="revenue"
                nameKey="source"
                cx="50%"
                cy="45%"
                outerRadius={100}
              >
                {sources.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <SourceTooltip
                    currency={currency}
                    locale={t.locale}
                    labels={{ revenue: t.revenue, deals: t.deals, avgDeal: t.avgDeal }}
                  />
                }
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
