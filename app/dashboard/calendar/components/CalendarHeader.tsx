// app/dashboard/calendar/components/CalendarHeader.tsx
'use client'

import { Plus, Globe } from 'lucide-react'
import Link from 'next/link'
import UserFilterChips from './UserFilterChips'
import ViewToggle from './ViewToggle'
import type { OrgUser, ViewMode } from '../types'

interface Props {
  title: string
  orgTz: string
  t: Record<string, string>
  orgUsers: OrgUser[]
  filterAssignedTo: string[]
  viewMode: ViewMode
  onNewEvent: () => void
  onToggleUser: (userId: string) => void
  onClearUserFilter: () => void
  onViewModeChange: (mode: ViewMode) => void
}

export default function CalendarHeader({
  title, orgTz, t, orgUsers, filterAssignedTo, viewMode,
  onNewEvent, onToggleUser, onClearUserFilter, onViewModeChange
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <h1 className="text-lg sm:text-2xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
          <span className="text-[10px] font-mono px-2 py-1 rounded-md shrink-0 hidden sm:inline-block" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' }}>
            {orgTz}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ViewToggle viewMode={viewMode} t={t} onChange={onViewModeChange} />
          <Link
            href="/dashboard/settings/booking"
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl transition-colors text-xs font-medium shrink-0"
            style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-tertiary)' }}
            title="Link Público"
          >
            <Globe size={14} />
            <span className="hidden sm:inline">Link Público</span>
          </Link>
          <button
            onClick={onNewEvent}
            className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl font-medium transition-colors text-sm shrink-0"
            style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
            title={t.newEvent}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline font-semibold">{t.newEvent}</span>
          </button>
        </div>
      </div>
      <UserFilterChips
        orgUsers={orgUsers}
        filterAssignedTo={filterAssignedTo}
        t={t}
        onToggle={onToggleUser}
        onClear={onClearUserFilter}
      />
    </div>
  )
}
