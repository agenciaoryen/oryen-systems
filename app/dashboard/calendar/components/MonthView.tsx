// app/dashboard/calendar/components/MonthView.tsx
'use client'

import DayCell from './DayCell'
import type { CalendarEvent, OrgUser } from '../types'

interface Props {
  currentYear: number
  currentMonth: number
  daysInMonth: number
  firstDay: number
  dayNames: string[]
  todayStr: string
  selectedDate: string | null
  events: CalendarEvent[]
  orgUsers: OrgUser[]
  monthNames: string[]
  t: Record<string, string>
  onSelectDate: (dateStr: string | null) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onEventDrop?: (eventId: string, newDate: string) => void
  onEventClick?: (event: CalendarEvent) => void
}

export default function MonthView({
  currentYear, currentMonth, daysInMonth, firstDay, dayNames,
  todayStr, selectedDate, events, orgUsers, monthNames, t,
  onSelectDate, onPrevMonth, onNextMonth, onToday, onEventDrop
}: Props) {
  const eventsForDate = (dateStr: string) => events.filter(e => e.event_date === dateStr)

  return (
    <div className="lg:col-span-2 rounded-2xl p-2 sm:p-4 flex flex-col min-h-0 lg:max-h-[calc(100vh-300px)]" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={onToday} className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }}>
            {t.today}
          </button>
          <button onClick={onPrevMonth} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={onNextMonth} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider py-1" style={{ color: 'var(--color-text-muted)' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = eventsForDate(dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <DayCell
              key={dateStr}
              dateStr={dateStr}
              day={day}
              isToday={isToday}
              isSelected={isSelected}
              events={dayEvents}
              orgUsers={orgUsers}
              onSelect={(ds) => onSelectDate(ds === selectedDate ? null : ds)}
              onEventDrop={onEventDrop}
            />
          )
        })}
      </div>
    </div>
  )
}
