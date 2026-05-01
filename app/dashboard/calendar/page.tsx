// @ts-nocheck
'use client'

import { CalendarDays, Clock, User as UserIcon, Loader2 } from 'lucide-react'
import { useCalendar } from './useCalendar'
import { EVENT_TYPE_COLORS, STATUS_COLORS, formatTime, getUserColor } from './constants'
import CalendarHeader from './components/CalendarHeader'
import MonthView from './components/MonthView'
import WeekView from './components/WeekView'
import AgendaView from './components/AgendaView'
import CreateEventModal from './components/CreateEventModal'
import EventDetailModal from './components/EventDetailModal'
import type { ViewMode } from './types'

export default function CalendarPage() {
  const cal = useCalendar()
  const {
    user, activeOrg, orgId, userLang, orgTz,
    t, today, todayStr, monthNames,
    events, orgUsers, loading,
    currentMonth, currentYear, selectedDate,
    viewMode, weekDays,
    showCreateModal, selectedEvent, preselectedLeadId,
    filterAssignedTo,
    daysInMonth, firstDay,

    setSelectedDate, setShowCreateModal, setSelectedEvent,
    setPreselectedLeadId, setViewMode,

    prevMonth, nextMonth, goToday, goNextWeek, goPrevWeek,
    eventsForDate, filteredEvents,
    updateEventStatus, deleteEvent, dragEvent,
    typeLabel, statusLabel,
    toggleUserFilter, clearUserFilter,
  } = cal

  const dayNames = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat]

  // Loading state
  if (loading && events.length === 0) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-180px)]">
      <CalendarHeader
        title={t.title}
        orgTz={orgTz}
        t={t}
        orgUsers={orgUsers}
        filterAssignedTo={filterAssignedTo}
        viewMode={viewMode}
        onNewEvent={() => setShowCreateModal(true)}
        onToggleUser={toggleUserFilter}
        onClearUserFilter={clearUserFilter}
        onViewModeChange={(mode: ViewMode) => setViewMode(mode)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Conditional main view */}
        {viewMode === 'month' && (
          <MonthView
            currentYear={currentYear}
            currentMonth={currentMonth}
            daysInMonth={daysInMonth}
            firstDay={firstDay}
            dayNames={dayNames}
            todayStr={todayStr}
            selectedDate={selectedDate}
            events={events}
            orgUsers={orgUsers}
            monthNames={monthNames}
            t={t}
            onSelectDate={(ds) => setSelectedDate(ds)}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onToday={goToday}
            onEventDrop={dragEvent}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            weekDays={weekDays}
            events={events}
            orgUsers={orgUsers}
            todayStr={todayStr}
            selectedDate={selectedDate}
            dayNames={dayNames}
            monthNames={monthNames}
            t={t}
            statusLabel={statusLabel}
            onSelectDate={(ds) => setSelectedDate(ds)}
            onEventClick={(ev) => setSelectedEvent(ev)}
            onEventDrop={dragEvent}
          />
        )}

        {viewMode === 'agenda' && (
          <AgendaView
            events={events}
            orgUsers={orgUsers}
            todayStr={todayStr}
            t={t}
            typeLabel={typeLabel}
            statusLabel={statusLabel}
            onEventClick={(ev) => setSelectedEvent(ev)}
          />
        )}

        {/* Event List Sidebar (only in month/week views) */}
        {viewMode !== 'agenda' && (
          <div className="rounded-2xl p-5 overflow-y-auto" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
              {selectedDate
                ? selectedDate.split('-').reverse().join('/')
                : t.upcoming
              }
            </h3>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noEvents}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.noEventsDesc}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(ev => {
                  const sColors = STATUS_COLORS[ev.status] || STATUS_COLORS.scheduled
                  const assignedUser = ev.assigned_to ? orgUsers.find(u => u.id === ev.assigned_to) : null
                  const userColor = assignedUser ? getUserColor(assignedUser.id) : null
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full text-left p-3 rounded-xl transition-all"
                      style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{ev.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <Clock size={12} />
                            <span>{formatTime(ev.start_time)}{ev.end_time ? ` - ${formatTime(ev.end_time)}` : ''}</span>
                          </div>
                          {assignedUser && userColor && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <span className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold"
                                style={{ background: userColor.text, color: '#fff' }}>
                                {assignedUser.full_name.charAt(0).toUpperCase()}
                              </span>
                              <span className="truncate">{assignedUser.full_name.split(' ')[0]}</span>
                            </div>
                          )}
                          {ev.leads?.name && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <UserIcon size={12} />
                              <span className="truncate">{ev.leads.name}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: sColors.bg, color: sColors.text }}>
                          {statusLabel(ev.status)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal
          orgId={orgId!}
          t={t}
          orgUsers={orgUsers}
          currentUserId={user?.id}
          onClose={() => { setShowCreateModal(false); setPreselectedLeadId(null) }}
          onCreated={(ev) => {
            events.push(ev)
            setShowCreateModal(false)
            setPreselectedLeadId(null)
          }}
          defaultDate={selectedDate || todayStr}
          initialLeadId={preselectedLeadId}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          t={t}
          typeLabel={typeLabel}
          statusLabel={statusLabel}
          assignedUserName={(() => {
            if (!selectedEvent.assigned_to) return null
            const u = orgUsers.find(u => u.id === selectedEvent.assigned_to)
            return u?.full_name || null
          })()}
          assignedUserColor={(() => {
            if (!selectedEvent.assigned_to) return null
            return getUserColor(selectedEvent.assigned_to)
          })()}
          onClose={() => setSelectedEvent(null)}
          onUpdateStatus={updateEventStatus}
          onDelete={deleteEvent}
        />
      )}
    </div>
  )
}
