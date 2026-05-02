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

      {/* Linha 2: Funnel Flow — funil com barras centradas */}
      <div style={{ ...cardStyle, padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={titleStyle}>{l.funnel}</div>
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
// Funil — SVG com barras centradas + silhueta de funil ao fundo
// ──────────────────────────────────────────────────────────────────────────────

function FunilSVG({ stages, maxLeads }: { stages: FunnelStage[]; maxLeads: number }) {
  const n = stages.length
  const svgW = 640
  const barH = 56
  const gap = 12
  const padY = 8
  const totalH = n * barH + (n - 1) * gap + padY * 2

  const maxBarW = 520
  const minBarW = 200

  const barW = stages.map((s) => {
    const r = maxLeads > 0 ? s.leadCount / maxLeads : 0.2
    return Math.max(minBarW, maxBarW * Math.max(r, 0.15))
  })

  // Silhueta do funil
  const firstBar = barW[0]
  const lastBar = barW[n - 1]
  const firstX = (svgW - firstBar) / 2
  const lastX = (svgW - lastBar) / 2
  const lastY = padY + (n - 1) * (barH + gap) + barH
  const funnelPath = [
    `M${firstX},${padY + 6}`,
    `L${firstX + firstBar},${padY + 6}`,
    `L${lastX + lastBar},${lastY}`,
    `L${lastX},${lastY}`,
    'Z',
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} style={{ width: '100%', maxWidth: '680px', display: 'block', margin: '0 auto' }}>
      <defs>
        <filter id="fShadow" x="-4%" y="-4%" width="108%" height="108%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.05" />
        </filter>
        <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="0.6" fill="var(--color-border)" opacity="0.15" />
        </pattern>
        <linearGradient id="funnelFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.03" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Fundo pontilhado */}
      <rect x="0" y="0" width={svgW} height={totalH} fill="url(#dotGrid)" rx="6" />

      {/* Silhueta sutil do funil */}
      <path d={funnelPath} fill="url(#funnelFill)" />

      {stages.map((stage, i) => {
        const color = stageColorHex(stage.color)
        const showConv = stage.conversionFromPrev > 0 && stage.conversionFromPrev <= 100

        const w = barW[i]
        const x = (svgW - w) / 2
        const y = padY + i * (barH + gap)

        // Conversão da etapa seguinte
        const nextConv = i < n - 1 ? stages[i + 1].conversionFromPrev : 0
        const showNextConv = i < n - 1 && nextConv > 0 && nextConv <= 100

        // Fontes escalam conforme largura da barra
        const fsLabel = w >= 400 ? 13 : w >= 280 ? 12 : 11
        const fsCount = w >= 400 ? 16 : w >= 280 ? 14 : 13
        const fsBadge = 10
        const badgeW = 44
        const sidePad = 18

        // Badge fica entre label e contagem, encostado na direita
        // countX = x + w - sidePad (textAnchor end)
        // badgeX = countX - approxCountWidth - gap - badgeW
        // Estimativa largura da contagem: String(count).length * fsCount * 0.6
        const countChars = String(stage.leadCount).length
        const approxCountW = countChars * fsCount * 0.6
        const badgeX = showConv
          ? x + w - sidePad - approxCountW - 6 - badgeW
          : 0
        const badgeCenterX = badgeX + badgeW / 2

        const baselineY = y + barH / 2 + fsCount * 0.35

        return (
          <g key={stage.id}>
            {/* Barra principal */}
            <rect
              x={x} y={y} width={w} height={barH} rx="8" ry="8"
              fill={`${color}0D`}
              stroke={color}
              strokeWidth="1"
              strokeOpacity="0.22"
              filter="url(#fShadow)"
            />

            {/* Accent pill esquerda */}
            <rect
              x={x} y={y + 10} width="3.5" height={barH - 20} rx="1.75" ry="1.75"
              fill={color} opacity="0.8"
            />

            {/* Label — sempre esquerda */}
            <text
              x={x + sidePad}
              y={baselineY}
              textAnchor="start"
              fill="currentColor"
              fontSize={fsLabel}
              fontWeight={600}
              style={{ userSelect: 'none' }}
            >
              {stage.label}
            </text>

            {/* Badge de conversão */}
            {showConv && (
              <g>
                <rect
                  x={badgeX}
                  y={baselineY - fsBadge - 3}
                  width={badgeW} height={fsBadge + 7}
                  rx="5" ry="5"
                  fill={color} opacity="0.12"
                />
                <text
                  x={badgeCenterX}
                  y={baselineY}
                  textAnchor="middle"
                  fill={color}
                  fontSize={fsBadge}
                  fontWeight={700}
                >
                  {stage.conversionFromPrev.toFixed(1)}%
                </text>
              </g>
            )}

            {/* Contagem — sempre direita */}
            <text
              x={x + w - sidePad}
              y={baselineY}
              textAnchor="end"
              fill="currentColor"
              fontSize={fsCount}
              fontWeight={800}
              style={{ userSelect: 'none' }}
            >
              {stage.leadCount}
            </text>

            {/* Conector entre etapas */}
            {i < n - 1 && (
              <g>
                <line
                  x1={svgW / 2} y1={y + barH}
                  x2={svgW / 2} y2={padY + (i + 1) * (barH + gap)}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />
                {showNextConv && (
                  <text
                    x={svgW / 2}
                    y={y + barH + gap / 2 + 3}
                    textAnchor="middle"
                    fill="var(--color-text-muted)"
                    fontSize="10"
                    fontWeight={600}
                  >
                    {nextConv.toFixed(1)}%
                  </text>
                )}
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
