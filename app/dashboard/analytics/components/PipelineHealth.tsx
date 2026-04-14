'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { FunnelStage, PipelineVelocity } from '@/lib/analytics/types'

interface Props {
  funnel: FunnelStage[]
  velocity: PipelineVelocity[]
  lang: 'pt' | 'en' | 'es'
  currency: string
}

const t = {
  pt: {
    velocity: 'Velocidade por Etapa',
    bottlenecks: 'Gargalos',
    funnel: 'Funil de Conversão',
    days: 'dias',
    stuck: 'parados',
    leads: 'leads',
    noData: 'Sem dados disponíveis',
    noBottlenecks: 'Nenhum gargalo detectado',
    medianDays: 'Dias medianos',
  },
  en: {
    velocity: 'Stage Velocity',
    bottlenecks: 'Bottlenecks',
    funnel: 'Conversion Funnel',
    days: 'days',
    stuck: 'stuck',
    leads: 'leads',
    noData: 'No data available',
    noBottlenecks: 'No bottlenecks detected',
    medianDays: 'Median days',
  },
  es: {
    velocity: 'Velocidad por Etapa',
    bottlenecks: 'Cuellos de Botella',
    funnel: 'Embudo de Conversión',
    days: 'días',
    stuck: 'atascados',
    leads: 'leads',
    noData: 'Sin datos disponibles',
    noBottlenecks: 'Sin cuellos de botella detectados',
    medianDays: 'Días medianos',
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

export default function PipelineHealth({ funnel, velocity, lang, currency }: Props) {
  const l = t[lang]

  const hasVelocity = velocity && velocity.length > 0
  const hasFunnel = funnel && funnel.length > 0

  const velocityData = hasVelocity
    ? [...velocity].sort((a, b) => a.position - b.position).map((v) => ({
        label: v.stageLabel,
        medianDays: v.medianDays,
        isHigh: v.medianDays > 7,
      }))
    : []

  const bottlenecks = hasVelocity
    ? [...velocity].filter((v) => v.stuckCount > 0).sort((a, b) => b.stuckCount - a.stuckCount)
    : []

  const sortedFunnel = hasFunnel
    ? [...funnel].sort((a, b) => a.position - b.position)
    : []
  const maxLeads = sortedFunnel.length > 0 ? sortedFunnel[0].leadCount : 1

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
      }}
    >
      {/* A) Velocity by Stage */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.velocity}</div>
        {!hasVelocity ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <ResponsiveContainer width="100%" height={velocityData.length * 44 + 40}>
            <BarChart data={velocityData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
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
                formatter={(value: number) => [`${value} ${l.days}`, l.medianDays]}
              />
              <Bar dataKey="medianDays" radius={[0, 4, 4, 0]}>
                {velocityData.map((entry, i) => (
                  <Cell key={i} fill={entry.isHigh ? '#ef4444' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* B) Bottleneck Detector */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.bottlenecks}</div>
        {bottlenecks.length === 0 ? (
          <div style={emptyStyle}>{l.noBottlenecks}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bottlenecks.map((b) => (
              <div
                key={b.stageId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {b.stageLabel}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {b.stuckCount} {l.stuck}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {b.medianDays} {l.days}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* C) Conversion Funnel */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.funnel}</div>
        {!hasFunnel ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            {sortedFunnel.map((stage) => {
              const widthPct = maxLeads > 0 ? Math.max((stage.leadCount / maxLeads) * 100, 12) : 12
              return (
                <div
                  key={stage.id}
                  style={{
                    width: `${widthPct}%`,
                    minWidth: '80px',
                    background: stage.color || '#6366f1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'width 0.3s ease',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stage.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                      {stage.leadCount}
                    </span>
                    {stage.conversionFromPrev > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'rgba(255,255,255,0.8)',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '1px 6px',
                          borderRadius: '8px',
                        }}
                      >
                        {stage.conversionFromPrev.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
