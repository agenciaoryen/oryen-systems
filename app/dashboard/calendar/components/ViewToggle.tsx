// app/dashboard/calendar/components/ViewToggle.tsx
'use client'

import type { ViewMode } from '../types'

interface Props {
  viewMode: ViewMode
  t: Record<string, string>
  onChange: (mode: ViewMode) => void
}

const MODES: ViewMode[] = ['month', 'week', 'agenda']

export default function ViewToggle({ viewMode, t, onChange }: Props) {
  const labels: Record<ViewMode, string> = {
    month: t.month || 'Mês',
    week: t.week || 'Semana',
    agenda: t.agenda || 'Agenda',
  }

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
      {MODES.map(mode => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
          style={{
            background: viewMode === mode ? 'var(--color-bg-elevated)' : 'transparent',
            color: viewMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
          }}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  )
}
