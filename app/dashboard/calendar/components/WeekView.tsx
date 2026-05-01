// app/dashboard/calendar/components/WeekView.tsx
'use client'

import { Clock } from 'lucide-react'
import { EVENT_TYPE_COLORS, STATUS_COLORS, formatTime, getUserColor } from '../constants'
import type { CalendarEvent, OrgUser } from '../types'

interface Props {
  weekDays: { dateStr: string; day: number; date: Date }[]
  events: CalendarEvent[]
  orgUsers: OrgUser[]
  todayStr: string
  selectedDate: string | null
  dayNames: string[]
  monthNames: string[]
  t: Record<string, string>
  statusLabel: (s: string) => string
  onSelectDate: (dateStr: string | null) => void
  onEventClick: (event: CalendarEvent) => void
  onEventDrop?: (eventId: string, newDate: string) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h to 20h

export default function WeekView({
  weekDays, events, orgUsers, todayStr, selectedDate, dayNames, monthNames, t,
  statusLabel, onSelectDate, onEventClick, onEventDrop
}: Props) {
  const eventsForDate = (dateStr: string) => events.filter(e => e.event_date === dateStr)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    const eventId = e.dataTransfer.getData('text/event-id')
    if (eventId && onEventDrop) {
      onEventDrop(eventId, dateStr)
    }
  }

  // Week header
  const weekHeader = weekDays.map(wd => {
    const monthName = monthNames[wd.date.getMonth()]
    return `${wd.day} ${monthName?.substring(0, 3) || ''}`
  })

  return (
    <div className="lg:col-span-2 rounded-2xl p-4 flex flex-col" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px mb-px">
        <div className="text-[10px] font-bold uppercase tracking-wider py-1 text-center" style={{ color: 'var(--color-text-muted)' }} />
        {weekDays.map((wd, i) => {
          const isToday = wd.dateStr === todayStr
          const isSelected = wd.dateStr === selectedDate
          return (
            <button
              key={wd.dateStr}
              onClick={() => onSelectDate(wd.dateStr === selectedDate ? null : wd.dateStr)}
              className="text-center py-1 rounded-lg transition-colors"
              style={{
                background: isSelected ? 'var(--color-primary-subtle)' : isToday ? 'var(--color-bg-hover)' : 'transparent',
                color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isToday ? 700 : 400,
              }}
            >
              <div className="text-[10px] font-bold uppercase">{dayNames[i]}</div>
              <div className="text-sm">{wd.day}</div>
            </button>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px">
          {HOURS.map(hour => (
            <WeekRow
              key={hour}
              hour={hour}
              weekDays={weekDays}
              events={events}
              todayStr={todayStr}
              statusLabel={statusLabel}
              onEventClick={onEventClick}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function WeekRow({
  hour, weekDays, events, todayStr, statusLabel, onEventClick, onDragOver, onDrop
}: {
  hour: number
  weekDays: { dateStr: string; day: number; date: Date }[]
  events: CalendarEvent[]
  todayStr: string
  statusLabel: (s: string) => string
  onEventClick: (event: CalendarEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, dateStr: string) => void
}) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`

  return (
    <>
      {/* Time label */}
      <div className="text-[10px] font-mono py-2 text-center sticky left-0" style={{ color: 'var(--color-text-muted)' }}>
        {timeStr}
      </div>

      {/* 7 day columns */}
      {weekDays.map(wd => {
        const dayEvents = events.filter(e => {
          if (e.event_date !== wd.dateStr) return false
          const startH = parseInt(e.start_time?.split(':')[0] || '0')
          const endH = parseInt(e.end_time?.split(':')[0] || `${hour + 1}`)
          return startH <= hour && endH > hour
        })

        const isToday = wd.dateStr === todayStr

        return (
          <div
            key={wd.dateStr}
            className="relative min-h-[48px] rounded transition-colors"
            style={{
              background: isToday ? 'rgba(var(--color-primary), 0.02)' : 'transparent',
              borderTop: '1px solid var(--color-border-subtle)',
            }}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, wd.dateStr)}
          >
            {dayEvents.map(ev => {
              const colors = EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.other
              return (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="w-full text-left px-1 py-0.5 rounded text-[10px] leading-tight truncate hover:opacity-80 transition-opacity"
                  style={{ background: colors.bg, color: colors.text }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/event-id', ev.id)
                  }}
                >
                  {ev.title}
                </button>
              )
            })}
          </div>
        )
      })}
    </>
  )
}
