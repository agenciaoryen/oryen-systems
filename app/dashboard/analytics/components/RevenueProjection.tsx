'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { RevenueProjection } from '@/lib/analytics/types'

interface Props {
  projection: RevenueProjection | null
  lang: 'pt' | 'en' | 'es'
  currency: string
}

const t = {
  pt: {
    pipelineValue: 'Valor no Pipeline',
    monthlyProjection: 'Projeção do Mês',
    closed: 'Fechado',
    pipeline: 'Pipeline',
    goal: 'Meta',
    totalValue: 'Valor total',
    weighted: 'Valor ponderado',
    probability: 'Probabilidade',
    noData: 'Sem dados disponíveis',
  },
  en: {
    pipelineValue: 'Pipeline Value',
    monthlyProjection: 'Monthly Projection',
    closed: 'Closed',
    pipeline: 'Pipeline',
    goal: 'Goal',
    totalValue: 'Total value',
    weighted: 'Weighted value',
    probability: 'Probability',
    noData: 'No data available',
  },
  es: {
    pipelineValue: 'Valor en Pipeline',
    monthlyProjection: 'Proyección del Mes',
    closed: 'Cerrado',
    pipeline: 'Pipeline',
    goal: 'Meta',
    totalValue: 'Valor total',
    weighted: 'Valor ponderado',
    probability: 'Probabilidad',
    noData: 'Sin datos disponibles',
  },
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '20px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: '16px',
}

const emptyStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
  padding: '32px 0',
}

function formatCurrency(value: number, lang: string, currency: string) {
  return value.toLocaleString(
    lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US',
    { style: 'currency', currency }
  )
}

function formatCompact(value: number, currency: string) {
  const sym = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  if (value >= 1e6) return `${sym}${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${sym}${(value / 1e3).toFixed(0)}k`
  return `${sym}${value.toFixed(0)}`
}

export default function RevenueProjectionChart({ projection, lang, currency }: Props) {
  const l = t[lang]

  const isEmpty = !projection || (projection.byStage.length === 0 && projection.projected === 0)

  if (isEmpty) {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>{l.monthlyProjection}</div>
        <div style={emptyStyle}>{l.noData}</div>
      </div>
    )
  }

  const stageData = projection!.byStage.map((s) => ({
    label: s.stageLabel,
    totalValue: s.totalValue,
    weightedValue: s.weightedValue,
    probability: s.probability,
    color: s.stageColor,
  }))

  const goalAmount = projection!.goalAmount
  const goalProgress = projection!.goalProgress

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
      }}
    >
      {/* A) Pipeline Value by Stage */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.pipelineValue}</div>
        {stageData.length === 0 ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickFormatter={(v) => formatCompact(v, currency)}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                labelStyle={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}
                formatter={(value: number, name: string) => {
                  if (name === 'totalValue') return [formatCurrency(value, lang, currency), l.totalValue]
                  return [formatCurrency(value, lang, currency), l.weighted]
                }}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
                {stageData.map((entry, i) => (
                  <Cell key={i} fill={entry.color || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* B) Monthly Projection KPI */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.monthlyProjection}</div>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {/* Big number */}
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              lineHeight: 1.2,
            }}
          >
            {formatCurrency(projection!.projected, lang, currency)}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              marginTop: '8px',
            }}
          >
            {l.closed}: {formatCurrency(projection!.closedThisMonth, lang, currency)} | {l.pipeline}:{' '}
            {formatCurrency(projection!.pipelineWeighted, lang, currency)}
          </div>

          {/* Goal progress bar */}
          {goalAmount != null && goalProgress != null && (
            <div style={{ marginTop: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  {l.goal}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {formatCurrency(goalAmount, lang, currency)}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(goalProgress, 100)}%`,
                    height: '100%',
                    background:
                      goalProgress >= 100
                        ? '#10b981'
                        : goalProgress >= 70
                          ? '#f59e0b'
                          : '#ef4444',
                    borderRadius: '5px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: 'right' }}>
                {goalProgress.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
