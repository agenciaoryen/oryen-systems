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
import { stageColorHex } from '@/lib/stage-colors'

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
    funnel: 'Fluxo do Funil',
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
    funnel: 'Pipeline Flow',
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
    funnel: 'Flujo del Embudo',
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
  // maxLeads = maior contagem entre todos os stages, não só o primeiro.
  // Se leads avançaram direto pra um stage posterior, evita que a barra estoure o container.
  const maxLeads = sortedFunnel.length > 0
    ? Math.max(...sortedFunnel.map((s) => s.leadCount), 1)
    : 1

  const funnelColor = sortedFunnel.length > 0
    ? stageColorHex(sortedFunnel[0].color)
    : 'var(--color-primary)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Linha 1: Velocity + Bottlenecks lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
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
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip
                  cursor={false}
                  contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
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
                <div key={b.stageId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{b.stageLabel}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>
                      {b.stuckCount} {l.stuck}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{b.medianDays} {l.days}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linha 2: Funnel Flow — full width com visual de funil */}
      <div style={{ ...cardStyle, padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={titleStyle}>{l.funnel}</div>
        {!hasFunnel ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '12px 0', position: 'relative' }}>
            {/* SVG funil semi-transparente ao fundo */}
            <svg
              viewBox="0 0 400 260"
              preserveAspectRatio="xMidYMid meet"
              style={{
                position: 'absolute',
                width: '70%',
                maxWidth: '480px',
                height: '100%',
                top: '5px',
                opacity: 0.07,
                pointerEvents: 'none',
              }}
            >
              <path
                d="M60,5 L340,5 L270,255 L130,255 Z"
                fill={funnelColor}
                strokeLinejoin="round"
              />
              {sortedFunnel.map((stage, idx) => {
                const y = 5 + (idx / Math.max(sortedFunnel.length - 1, 1)) * 250
                const topW = 280
                const botW = 140
                const w = topW - (idx / Math.max(sortedFunnel.length - 1, 1)) * (topW - botW)
                const x = (400 - w) / 2
                return (
                  <line key={idx} x1={x} y1={y} x2={x + w} y2={y} stroke={funnelColor} strokeWidth="0.8" strokeDasharray="2,3" />
                )
              })}
            </svg>

            {/* Barras do funil */}
            {sortedFunnel.map((stage, idx) => {
              const rawPct = maxLeads > 0 ? (stage.leadCount / maxLeads) * 100 : 12
              const widthPct = Math.min(Math.max(rawPct, 12), 100)
              const color = stageColorHex(stage.color)
              const showConversion = stage.conversionFromPrev > 0 && stage.conversionFromPrev <= 100
              const isLast = idx === sortedFunnel.length - 1
              const nextColor = !isLast ? stageColorHex(sortedFunnel[idx + 1]?.color) : color

              return (
                <div key={stage.id} style={{ width: `${widthPct}%`, minWidth: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '100%',
                    background: `linear-gradient(135deg, ${color}20, ${color}08)`,
                    border: `1px solid ${color}35`,
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    backdropFilter: 'blur(2px)',
                  }}>
                    {/* Accent vertical na esquerda */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                      background: `linear-gradient(180deg, ${color}, ${color}77)`,
                      borderRadius: '4px 0 0 4px',
                    }} />

                    {/* Nome do stage */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1, minWidth: 0 }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stage.label}
                      </span>
                    </div>

                    {/* Contagem + conversão */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1, flexShrink: 0 }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{stage.leadCount}</span>
                      {showConversion && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: '6px' }}>
                          {stage.conversionFromPrev.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conector entre stages */}
                  {!isLast && (
                    <div style={{ width: '2px', height: '10px', background: `linear-gradient(180deg, ${color}88, ${nextColor}88)` }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
