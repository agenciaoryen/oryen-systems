'use client'

import type { GoalStreak } from '@/lib/goals/types'

const TRANSLATIONS = {
  pt: { months: 'meses', month: 'mes', best: 'Recorde' },
  en: { months: 'months', month: 'month', best: 'Best' },
  es: { months: 'meses', month: 'mes', best: 'Record' },
}

interface Props {
  streak: GoalStreak | null
  lang?: 'pt' | 'en' | 'es'
}

export default function StreakBadge({ streak, lang = 'pt' }: Props) {
  const t = TRANSLATIONS[lang]

  if (!streak || streak.current_streak === 0) return null

  const count = streak.current_streak
  const label = count === 1 ? t.month : t.months

  // Fire intensity based on streak length
  const intensity = count >= 6 ? '#ef4444' : count >= 3 ? '#f97316' : '#f59e0b'

  return (
    <div className="inline-flex items-center gap-1.5" title={`${t.best}: ${streak.best_streak} ${t.months}`}>
      <span style={{ color: intensity, fontSize: 14 }}>
        {count >= 6 ? '\uD83D\uDD25' : '\uD83D\uDD25'}
      </span>
      <span
        className="text-xs font-bold"
        style={{ color: intensity }}
      >
        {count} {label}
      </span>
    </div>
  )
}
