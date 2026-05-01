// app/dashboard/calendar/components/AgendaView.tsx
'use client'

import { CalendarDays, Clock, User as UserIcon } from 'lucide-react'
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

export default function AgendaView({
  events, orgUsers, todayStr, t, typeLabel, statusLabel, onEventClick
}: Props) {
  // Sort all events by date then time
  const sorted = [...events].sort(
    (a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time)
  )

  // Group by date
  const grouped: Record<string, CalendarEvent[]> = {}
  for (const ev of sorted) {
    if (!grouped[ev.event_date]) grouped[ev.event_date] = []
    grouped[ev.event_date].push(ev)
  }

  const dateKeys = Object.keys(grouped)

  if (dateKeys.length === 0) {
    return (
      <div className="lg:col-span-2 rounded-2xl p-12 flex flex-col items-center justify-center" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <CalendarDays className="w-12 h-12 mb-3" style={{ color: 'var(--color-border)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noEvents}</p>
      </div>
    )
  }

  return (
    <div className="lg:col-span-2 rounded-2xl p-5 overflow-y-auto" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="space-y-6">
        {dateKeys.map(dateStr => {
          const isToday = dateStr === todayStr
          const dateObj = new Date(dateStr + 'T12:00:00')
          const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
          const formatted = dateStr.split('-').reverse().join('/')

          return (
            <div key={dateStr}>
              <div className="flex items-center gap-2 mb-3 sticky top-0" style={{ background: 'var(--color-bg-surface)' }}>
                <h3 className={`text-sm font-bold ${isToday ? 'text-[var(--color-primary)]' : ''}`}
                  style={{ color: isToday ? undefined : 'var(--color-text-secondary)' }}>
                  {formatted}
                </h3>
                <span className="text-[10px] capitalize" style={{ color: 'var(--color-text-muted)' }}>
                  {dayName}
                </span>
                {isToday && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                    {t.today}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {grouped[dateStr].map(ev => {
                  const colors = EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.other
                  const sColors = STATUS_COLORS[ev.status] || STATUS_COLORS.scheduled
                  const assignedUser = ev.assigned_to ? orgUsers.find(u => u.id === ev.assigned_to) : null
                  const userColor = assignedUser ? getUserColor(assignedUser.id) : null

                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="w-full text-left p-3 rounded-xl transition-all flex items-start gap-3"
                      style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      {/* Time column */}
                      <div className="text-right min-w-[60px] shrink-0">
                        <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {formatTime(ev.start_time)}
                        </div>
                        {ev.end_time && (
                          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {formatTime(ev.end_time)}
                          </div>
                        )}
                      </div>

                      {/* Color bar */}
                      <div className="w-0.5 rounded-full shrink-0 self-stretch" style={{ background: colors.text }} />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {ev.title}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: colors.bg, color: colors.text }}>
                            {typeLabel(ev.event_type)}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: sColors.bg, color: sColors.text }}>
                            {statusLabel(ev.status)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          {assignedUser && userColor && (
                            <span className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] font-bold"
                                style={{ background: userColor.text, color: '#fff' }}>
                                {assignedUser.full_name.charAt(0).toUpperCase()}
                              </span>
                              {assignedUser.full_name.split(' ')[0]}
                            </span>
                          )}
                          {ev.leads?.name && (
                            <span className="flex items-center gap-1">
                              <UserIcon size={10} />
                              {ev.leads.name}
                            </span>
                          )}
                          {ev.address && (
                            <span className="truncate">{ev.address}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
