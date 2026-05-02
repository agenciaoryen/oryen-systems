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

      {/* Linha 2: Funnel Flow — funil SVG premium */}
      <div style={{ ...cardStyle, padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ ...titleStyle, marginBottom: '8px' }}>{l.funnel}</div>
        {!hasFunnel ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <FunilSVG stages={sortedFunnel} maxLeads={maxLeads} />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Funil SVG — trapezóides empilhados com conversões
// ──────────────────────────────────────────────────────────────────────────────

function FunilSVG({ stages, maxLeads }: { stages: FunnelStage[]; maxLeads: number }) {
  const n = stages.length
  const SVG_W = 640
  const STAGE_H = 52
  const GAP = 28 // espaço entre trapezóides (para a label de conversão)
  const PAD_Y = 16
  const SVG_H = n * STAGE_H + (n - 1) * GAP + PAD_Y * 2

  const maxW = 520
  const minW = 130

  const widths = stages.map((s) => {
    const ratio = maxLeads > 0 ? s.leadCount / maxLeads : 0.2
    return Math.max(minW, maxW * Math.max(ratio, 0.15))
  })

  const traps = stages.map((stage, i) => {
    const topW = widths[i]
    const botW = i < n - 1 ? widths[i + 1] : topW * 0.55
    const topY = PAD_Y + i * (STAGE_H + GAP)
    const botY = topY + STAGE_H
    const topL = (SVG_W - topW) / 2
    const topR = topL + topW
    const botL = (SVG_W - botW) / 2
    const botR = botL + botW
    return { stage, topL, topR, botL, botR, topY, botY, cx: SVG_W / 2, w: topW }
  })

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', maxWidth: '680px', display: 'block', margin: '0 auto' }}>
      <defs>
        <filter id="fShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000" floodOpacity="0.06" />
        </filter>
        <filter id="fGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="24" cy="24" r="0.8" fill="var(--color-border)" opacity="0.2" />
        </pattern>
        {traps.map((t, i) => {
          const color = stageColorHex(t.stage.color)
          return (
            <linearGradient key={`g${i}`} id={`fg${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.06" />
            </linearGradient>
          )
        })}
      </defs>

      {/* Grid sutil de fundo */}
      <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#dotGrid)" rx="8" />

      {/* Trapezóides + textos */}
      {traps.map((t, i) => {
        const color = stageColorHex(t.stage.color)
        const s = t.stage
        const showConv = s.conversionFromPrev > 0 && s.conversionFromPrev <= 100
        const narrow = t.w < 220

        return (
          <g key={s.id}>
            {/* Trapezóide principal */}
            <polygon
              points={`${t.topL},${t.topY} ${t.topR},${t.topY} ${t.botR},${t.botY} ${t.botL},${t.botY}`}
              fill={`url(#fg${i})`}
              stroke={color}
              strokeWidth="1.2"
              strokeOpacity="0.28"
              filter="url(#fShadow)"
            />

            {/* Barra de accent lateral esquerda */}
            <line
              x1={t.topL} y1={t.topY + 6}
              x2={t.botL} y2={t.botY - 6}
              stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.7"
            />

            {/* Conteúdo */}
            {narrow ? (
              <>
                <text x={t.cx} y={t.topY + STAGE_H / 2 - 4} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600" opacity="0.9" style={{ userSelect: 'none' }}>
                  {s.label}
                </text>
                <text x={t.cx} y={t.topY + STAGE_H / 2 + 16} textAnchor="middle" fill="currentColor" fontSize="15" fontWeight="800" style={{ userSelect: 'none' }}>
                  {s.leadCount}
                </text>
                {showConv && (
                  <text x={t.cx} y={t.topY + STAGE_H / 2 + 28} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
                    {s.conversionFromPrev.toFixed(1)}%
                  </text>
                )}
              </>
            ) : (
              <>
                <text x={t.topL + 20} y={t.topY + STAGE_H / 2 + 4} textAnchor="start" fill="currentColor" fontSize="13" fontWeight="600" style={{ userSelect: 'none' }}>
                  {s.label}
                </text>
                <text x={t.topR - 20} y={t.topY + STAGE_H / 2 + 4} textAnchor="end" fill="currentColor" fontSize="16" fontWeight="800" style={{ userSelect: 'none' }}>
                  {s.leadCount}
                </text>
                {showConv && (
                  <g>
                    <rect x={t.topR - 88} y={t.topY + STAGE_H / 2 - 10} width="46" height="20" rx="5" fill={color} opacity="0.12" />
                    <text x={t.topR - 65} y={t.topY + STAGE_H / 2 + 4} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
                      {s.conversionFromPrev.toFixed(1)}%
                    </text>
                  </g>
                )}
              </>
            )}

            {/* Seta de conversão entre estágios */}
            {i < n - 1 && (() => {
              const next = traps[i + 1]
              const arrowY = t.botY + (next.topY - t.botY) / 2
              const convPct = next.stage.conversionFromPrev
              const hasConv = convPct > 0 && convPct <= 100
              return (
                <g>
                  <line x1={t.cx} y1={t.botY + 4} x2={t.cx} y2={next.topY - 5} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3,3" />
                  <polygon points={`${t.cx - 5},${next.topY - 7} ${t.cx + 5},${next.topY - 7} ${t.cx},${next.topY - 2}`} fill="var(--color-text-muted)" opacity="0.4" />
                  {hasConv && (
                    <text x={t.cx} y={arrowY - 3} textAnchor="middle" fill="var(--color-text-muted)" fontSize="10" fontWeight="600">
                      {convPct.toFixed(1)}%
                    </text>
                  )}
                </g>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}
