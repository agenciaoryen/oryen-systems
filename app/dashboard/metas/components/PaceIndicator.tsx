'use client'

import { PACE_LABELS, PACE_COLORS } from '@/lib/goals/constants'
import type { PaceStatus } from '@/lib/goals/types'

interface Props {
  pace: PaceStatus
  lang?: 'pt' | 'en' | 'es'
  size?: 'sm' | 'md'
}

export default function PaceIndicator({ pace, lang = 'pt', size = 'sm' }: Props) {
  const label = PACE_LABELS[lang]?.[pace] || pace
  const color = PACE_COLORS[pace] || '#6b7280'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
      style={{
        background: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  )
}
