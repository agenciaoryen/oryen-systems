// app/dashboard/calendar/components/DayCell.tsx
'use client'

import { EVENT_TYPE_COLORS, getUserColor } from '../constants'
import type { CalendarEvent, OrgUser } from '../types'

interface Props {
  dateStr: string
  day: number
  isToday: boolean
  isSelected: boolean
  events: CalendarEvent[]
  orgUsers: OrgUser[]
  onSelect: (dateStr: string) => void
  onEventDrop?: (eventId: string, newDate: string) => void
}

export default function DayCell({ dateStr, day, isToday, isSelected, events, orgUsers, onSelect, onEventDrop }: Props) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('ring-2', 'ring-[var(--color-primary)]')
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-[var(--color-primary)]')
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-2', 'ring-[var(--color-primary)]')
    const eventId = e.dataTransfer.getData('text/event-id')
    if (eventId && onEventDrop) {
      onEventDrop(eventId, dateStr)
    }
  }

  return (
    <button
      onClick={() => onSelect(dateStr === isSelected ? null : dateStr)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-all relative min-h-[48px]"
      style={
        isSelected
          ? { background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)', color: 'var(--color-text-primary)' }
          : isToday
          ? { background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)', fontWeight: 700 }
          : { color: 'var(--color-text-secondary)', border: '1px solid transparent' }
      }
    >
      <span style={isToday ? { color: 'var(--color-primary)', fontWeight: 700 } : {}}>{day}</span>
      {events.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center px-1">
          {events.slice(0, 4).map((ev, idx) => {
            const dotStyle = ev.assigned_to
              ? { backgroundColor: getUserColor(ev.assigned_to).text }
              : EVENT_TYPE_COLORS[ev.event_type]?.dotStyle || EVENT_TYPE_COLORS.other.dotStyle
            return <div key={idx} className="w-1.5 h-1.5 rounded-full" style={dotStyle} />
          })}
        </div>
      )}
    </button>
  )
}
