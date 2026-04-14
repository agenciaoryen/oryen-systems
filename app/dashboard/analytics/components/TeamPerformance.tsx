'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { BrokerStats, FollowUpStats } from '@/lib/analytics/types'

interface Props {
  brokers: BrokerStats[]
  followUp: FollowUpStats | null
  lang: 'pt' | 'en' | 'es'
  currency: string
}

const t = {
  pt: {
    ranking: 'Ranking de Corretores',
    responseTime: 'Tempo de Resposta',
    followUp: 'Eficiência do Follow-up',
    wonLeads: 'Leads ganhos',
    avgTime: 'Tempo médio',
    responded: 'Respondidos',
    exhausted: 'Esgotados',
    pending: 'Pendentes',
    cancelled: 'Cancelados',
    responseRate: 'Taxa de resposta',
    noData: 'Sem dados disponíveis',
    noBrokers: 'Nenhum corretor encontrado',
  },
  en: {
    ranking: 'Broker Ranking',
    responseTime: 'Response Time',
    followUp: 'Follow-up Efficiency',
    wonLeads: 'Won leads',
    avgTime: 'Avg time',
    responded: 'Responded',
    exhausted: 'Exhausted',
    pending: 'Pending',
    cancelled: 'Cancelled',
    responseRate: 'Response rate',
    noData: 'No data available',
    noBrokers: 'No brokers found',
  },
  es: {
    ranking: 'Ranking de Corredores',
    responseTime: 'Tiempo de Respuesta',
    followUp: 'Eficiencia del Follow-up',
    wonLeads: 'Leads ganados',
    avgTime: 'Tiempo promedio',
    responded: 'Respondidos',
    exhausted: 'Agotados',
    pending: 'Pendientes',
    cancelled: 'Cancelados',
    responseRate: 'Tasa de respuesta',
    noData: 'Sin datos disponibles',
    noBrokers: 'Sin corredores encontrados',
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

function formatTime(min: number): string {
  if (min > 60) {
    const h = Math.floor(min / 60)
    const m = Math.round(min % 60)
    return `${h}h ${m}m`
  }
  return `${Math.round(min)}m`
}

export default function TeamPerformance({ brokers, followUp, lang }: Props) {
  const l = t[lang]
  const hasBrokers = brokers && brokers.length > 0

  const rankingData = hasBrokers
    ? [...brokers].sort((a, b) => b.wonLeads - a.wonLeads).map((b) => ({
        name: b.name,
        wonLeads: b.wonLeads,
      }))
    : []

  const responseData = hasBrokers
    ? [...brokers].sort((a, b) => b.avgResponseTimeMin - a.avgResponseTimeMin).map((b) => ({
        name: b.name,
        avgResponseTimeMin: b.avgResponseTimeMin,
        isHigh: b.avgResponseTimeMin > 120,
      }))
    : []

  const pieData = followUp
    ? [
        { name: l.responded, value: followUp.responded, color: '#10b981' },
        { name: l.exhausted, value: followUp.exhausted, color: '#ef4444' },
        { name: l.pending, value: followUp.pending, color: '#f59e0b' },
        { name: l.cancelled, value: followUp.cancelled, color: '#6b7280' },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
      }}
    >
      {/* A) Broker Ranking */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.ranking}</div>
        {!hasBrokers ? (
          <div style={emptyStyle}>{l.noBrokers}</div>
        ) : (
          <ResponsiveContainer width="100%" height={rankingData.length * 44 + 40}>
            <BarChart data={rankingData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
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
                formatter={(value: number) => [value, l.wonLeads]}
              />
              <Bar dataKey="wonLeads" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* B) Response Time */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.responseTime}</div>
        {!hasBrokers ? (
          <div style={emptyStyle}>{l.noBrokers}</div>
        ) : (
          <ResponsiveContainer width="100%" height={responseData.length * 44 + 40}>
            <BarChart data={responseData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickFormatter={(v) => formatTime(v)}
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
                formatter={(value: number) => [formatTime(value), l.avgTime]}
              />
              <Bar dataKey="avgResponseTimeMin" radius={[4, 4, 0, 0]}>
                {responseData.map((entry, i) => (
                  <Cell key={i} fill={entry.isHigh ? '#ef4444' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* C) Follow-up Efficiency */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.followUp}</div>
        {!followUp || pieData.length === 0 ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
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
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {followUp.responseRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {l.responseRate}
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              {pieData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {d.name} ({d.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
