// app/dashboard/calendar/components/UserFilterChips.tsx
'use client'

import { getUserColor } from '../constants'
import type { OrgUser } from '../types'

interface Props {
  orgUsers: OrgUser[]
  filterAssignedTo: string[]
  t: Record<string, string>
  onToggle: (userId: string) => void
  onClear: () => void
}

export default function UserFilterChips({ orgUsers, filterAssignedTo, t, onToggle, onClear }: Props) {
  if (orgUsers.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      <span className="text-[10px] font-bold uppercase tracking-wider mr-1 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {t.team}:
      </span>
      <button
        onClick={onClear}
        className="px-2.5 py-1 text-[11px] font-medium rounded-full transition-all shrink-0"
        style={{
          background: filterAssignedTo.length === 0 ? 'var(--color-primary)' : 'var(--color-bg-hover)',
          color: filterAssignedTo.length === 0 ? '#fff' : 'var(--color-text-tertiary)',
        }}
      >
        {t.all}
      </button>
      {orgUsers.map(user => {
        const color = getUserColor(user.id)
        const isActive = filterAssignedTo.includes(user.id)
        return (
          <button
            key={user.id}
            onClick={() => onToggle(user.id)}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-full transition-all shrink-0"
            style={{
              background: isActive ? color.bg : 'var(--color-bg-hover)',
              color: isActive ? color.text : 'var(--color-text-tertiary)',
              border: isActive ? `1px solid ${color.text}` : '1px solid transparent',
            }}
          >
            <span className="w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: color.text, color: '#fff' }}>
              {user.full_name.charAt(0).toUpperCase()}
            </span>
            {user.full_name.split(' ')[0]}
          </button>
        )
      })}
    </div>
  )
}
