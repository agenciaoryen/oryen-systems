// app/dashboard/calendar/components/AgendaView.tsx
'use client'

import { useState, useMemo } from 'react'
import { CalendarDays, Clock, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react'
import { EVENT_TYPE_COLORS, STATUS_COLORS, formatTime, getUserColor } from '../constants'
import type { CalendarEvent, OrgUser } from '../types'

interface Props {
  events: CalendarEvent[]
  orgUsers: OrgUser[]
  todayStr: string
  t: Record<string, string>
  typeLabel: (s: string) => string
  statusLabel: (s: string) => string
  onEventClick: (event: CalendarEvent) => void
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7h to 21h

export default function AgendaView({
  events, orgUsers, todayStr, t, typeLabel, statusLabel, onEventClick
}: Props) {
  const [viewDate, setViewDate] = useState(todayStr)

  const isToday = viewDate === todayStr

  const dayEvents = useMemo(() => {
    return [...events]
      .filter(ev => ev.event_date === viewDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [events, viewDate])

  const navigate = (direction: -1 | 1) => {
    const d = new Date(viewDate + 'T12:00:00')
    d.setDate(d.getDate() + direction)
    setViewDate(d.toISOString().split('T')[0])
  }

  const dateObj = new Date(viewDate + 'T12:00:00')
  const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
  const formatted = viewDate.split('-').reverse().join('/')

  // Index events by start hour for quick lookup
  const eventsByHour: Record<number, CalendarEvent[]> = {}
  for (const ev of dayEvents) {
    const startH = parseInt(ev.start_time?.split(':')[0] || '0')
    if (!eventsByHour[startH]) eventsByHour[startH] = []
    eventsByHour[startH].push(ev)
  }

  return (
    <div className="lg:col-span-2 rounded-2xl p-3 sm:p-5 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      {/* Day navigation header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[140px]">
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {formatted}
            </h3>
            <p className="text-[11px] capitalize" style={{ color: 'var(--color-text-muted)' }}>
              {dayName}
            </p>
          </div>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
              {t.today}
            </span>
          )}
          {!isToday && (
            <button onClick={() => setViewDate(todayStr)} className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }}>
              {t.today}
            </button>
          )}
        </div>
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto">
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="w-8 sm:w-12 h-8 sm:h-12 mb-3" style={{ color: 'var(--color-border)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noEvents}</p>
          </div>
        ) : (
          <div>
            {HOURS.map(hour => {
              const hourEvents = eventsByHour[hour] || []
              const timeStr = `${String(hour).padStart(2, '0')}:00`

              return (
                <div key={hour} className="flex gap-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {/* Time label */}
                  <div className="text-[11px] font-mono w-12 text-right shrink-0 pt-2" style={{ color: 'var(--color-text-muted)' }}>
                    {timeStr}
                  </div>

                  {/* Events column */}
                  <div className="flex-1 min-h-[48px] py-1">
                    {hourEvents.length === 0 ? (
                      <div className="h-8" />
                    ) : (
                      <div className="space-y-1">
                        {hourEvents.map(ev => {
                          const colors = EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.other
                          const sColors = STATUS_COLORS[ev.status] || STATUS_COLORS.scheduled
                          const assignedUser = ev.assigned_to ? orgUsers.find(u => u.id === ev.assigned_to) : null
                          const userColor = assignedUser ? getUserColor(assignedUser.id) : null

                          return (
                            <button
                              key={ev.id}
                              onClick={() => onEventClick(ev)}
                              className="w-full text-left p-2.5 rounded-xl transition-all hover:opacity-80"
                              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}
                            >
                              <div className="flex items-start gap-2">
                                {/* Color indicator */}
                                <div className="w-1 rounded-full shrink-0 self-stretch mt-0.5" style={{ background: colors.text }} />

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                      {ev.title}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: colors.bg, color: colors.text }}>
                                      {typeLabel(ev.event_type)}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: sColors.bg, color: sColors.text }}>
                                      {statusLabel(ev.status)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                    <span className="flex items-center gap-1 shrink-0">
                                      <Clock size={10} />
                                      {formatTime(ev.start_time)}{ev.end_time ? ` - ${formatTime(ev.end_time)}` : ''}
                                    </span>
                                    {assignedUser && userColor && (
                                      <span className="flex items-center gap-1 truncate">
                                        <span className="w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0"
                                          style={{ background: userColor.text, color: '#fff' }}>
                                          {assignedUser.full_name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="truncate">{assignedUser.full_name.split(' ')[0]}</span>
                                      </span>
                                    )}
                                    {ev.leads?.name && (
                                      <span className="flex items-center gap-1 truncate">
                                        <UserIcon size={10} className="shrink-0" />
                                        <span className="truncate">{ev.leads.name}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
