'use client'

import { useState } from 'react'
import {
  DollarSign, Handshake, UserPlus, Clock, RefreshCw,
  CalendarDays, TrendingUp, Megaphone, Target, ChevronDown
} from 'lucide-react'
import { GOAL_COLORS, INVERTED_TEMPLATES } from '@/lib/goals/constants'
import type { GoalProgress } from '@/lib/goals/types'
import { formatPrice } from '@/lib/format'
import PaceIndicator from './PaceIndicator'
import StreakBadge from './StreakBadge'

// ═══════════════════════════════════════════════════════════════════════════════
// ICON MAP
// ═══════════════════════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ElementType> = {
  DollarSign, Handshake, UserPlus, Clock, RefreshCw,
  CalendarDays, TrendingUp, Megaphone, Target,
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    of: 'de',
    projected: 'Projetado',
    daysLeft: 'dias restantes',
    trend: 'Tendencia',
    noData: 'Sem dados',
    brokers: 'Corretores',
  },
  en: {
    of: 'of',
    projected: 'Projected',
    daysLeft: 'days left',
    trend: 'Trend',
    noData: 'No data',
    brokers: 'Brokers',
  },
  es: {
    of: 'de',
    projected: 'Proyectado',
    daysLeft: 'dias restantes',
    trend: 'Tendencia',
    noData: 'Sin datos',
    brokers: 'Corredores',
  },
}

type Lang = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS RING (CSS-only circular)
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressRing({ percentage, color, size = 80 }: { percentage: number; color: string; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(percentage, 100)
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={4}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPARKLINE (mini trend)
// ═══════════════════════════════════════════════════════════════════════════════

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0 || data.every(v => v === 0)) return null

  const max = Math.max(...data, 1)
  const h = 24
  const w = 60
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w
    const y = h - (v / max) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT VALUE
// ═══════════════════════════════════════════════════════════════════════════════

function formatGoalValue(value: number, unit: string, currency?: string): string {
  if (unit === 'currency') return formatPrice(value, currency || 'BRL', 'pt-BR')
  if (unit === 'percentage') return `${Math.round(value * 10) / 10}%`
  if (unit === 'minutes') return `${Math.round(value)}min`
  return Math.round(value).toLocaleString('pt-BR')
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  progress: GoalProgress
  lang?: Lang
  currency?: string
  onExpand?: () => void
}

export default function GoalCard({ progress, lang = 'pt', currency = 'BRL', onExpand }: Props) {
  const t = TRANSLATIONS[lang]
  const { goal, template, currentValue, targetValue, percentage, pace, projectedValue, daysRemaining, streak, trend } = progress

  const templateId = goal.template_id
  const color = GOAL_COLORS[templateId] || '#6b7280'
  const isInverted = INVERTED_TEMPLATES.includes(templateId)
  const unit = template?.unit || 'number'

  // Icon
  const iconName = template?.icon || 'Target'
  const IconComponent = ICON_MAP[iconName] || Target

  // Name (use custom_name or template name)
  const langKey = `name_${lang}` as 'name_pt' | 'name_en' | 'name_es'
  const goalName = goal.custom_name || template?.[langKey] || template?.name_pt || templateId

  return (
    <div
      className="rounded-2xl p-5 transition-all hover:shadow-lg group"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header: icon + name + pace */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <IconComponent size={18} style={{ color }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {goalName}
            </h3>
            {goal.broker_id && (
              <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                Corretor individual
              </p>
            )}
          </div>
        </div>
        <PaceIndicator pace={pace} lang={lang} />
      </div>

      {/* Progress ring + values */}
      <div className="flex items-center gap-5 mb-4">
        <ProgressRing percentage={percentage} color={color} />
        <div className="flex-1 min-w-0">
          {/* Current / Target */}
          <div className="mb-1">
            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {formatGoalValue(currentValue, unit, currency)}
            </span>
            <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
              {t.of} {formatGoalValue(targetValue, unit, currency)}
            </span>
          </div>

          {/* Projected */}
          {!isInverted && (
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {t.projected}: {formatGoalValue(projectedValue, unit, currency)}
            </p>
          )}

          {/* Days remaining */}
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {daysRemaining} {t.daysLeft}
          </p>
        </div>
      </div>

      {/* Footer: streak + sparkline */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <StreakBadge streak={streak} lang={lang} />
        <div className="flex items-center gap-2">
          {trend && trend.length > 0 && (
            <Sparkline data={[...trend, currentValue]} color={color} />
          )}
        </div>
      </div>
    </div>
  )
}
