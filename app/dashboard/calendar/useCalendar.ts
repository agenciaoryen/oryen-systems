// app/dashboard/calendar/useCalendar.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { formatLeadName } from '@/lib/format/leadName'
import { TRANSLATIONS, monthsArray } from './translations'
import { getDaysInMonth, getFirstDayOfMonth } from './constants'
import type { Language, CalendarEvent, OrgUser, ViewMode } from './types'

export function useCalendar() {
  const { user, activeOrg } = useAuth()
  const orgId = useActiveOrgId()
  const searchParams = useSearchParams()
  const userLang = ((user as any)?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // ─── View state ───
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // ─── Data ───
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Filters ───
  const [filterAssignedTo, setFilterAssignedTo] = useState<string[]>([])

  // ─── Modals ───
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [preselectedLeadId, setPreselectedLeadId] = useState<string | null>(null)

  const orgTz = activeOrg?.timezone || 'America/Sao_Paulo'
  const monthNames = monthsArray(t)

  // ─── Lead pre-selection from URL ───
  useEffect(() => {
    const leadId = searchParams.get('lead_id')
    if (leadId) {
      setPreselectedLeadId(leadId)
      setShowCreateModal(true)
    }
  }, [searchParams])

  // ─── Fetch org users ───
  useEffect(() => {
    if (!orgId) return
    fetch('/api/org-users')
      .then(r => r.json())
      .then(data => {
        if (data.users) setOrgUsers(data.users)
      })
      .catch(() => {})
  }, [orgId])

  // ─── Fetch events ───
  const fetchEvents = useCallback(async () => {
    if (!orgId) return
    const from = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    const lastDay = getDaysInMonth(currentYear, currentMonth)
    const to = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    let url = `/api/calendar?org_id=${orgId}&from=${from}&to=${to}`
    if (filterAssignedTo.length === 1) {
      url += `&assigned_to=${filterAssignedTo[0]}`
    }

    const res = await fetch(url)
    const data = await res.json()
    if (data.events) setEvents(data.events)
    setLoading(false)
  }, [orgId, currentMonth, currentYear, filterAssignedTo])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // ─── Google Calendar sync (once per session) ───
  useEffect(() => {
    if (!orgId) return
    const key = 'gcal_synced_session'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch('/api/integrations/google-calendar/sync', { method: 'POST' })
      .then(r => r.ok ? fetchEvents() : null)
      .catch(() => {})
  }, [orgId, fetchEvents])

  // ─── Realtime ───
  useEffect(() => {
    if (!orgId) return
    const ch = supabase
      .channel('calendar_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
        filter: `org_id=eq.${orgId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => prev.some(e => e.id === (payload.new as any).id) ? prev : [...prev, payload.new as CalendarEvent])
        } else if (payload.eventType === 'UPDATE') {
          setEvents(prev => prev.map(e => e.id === (payload.new as any).id ? { ...e, ...payload.new } : e))
        } else if (payload.eventType === 'DELETE') {
          setEvents(prev => prev.filter(e => e.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId])

  // ─── Calendar grid computations ───
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }
  const goToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(todayStr)
  }

  // Week navigation for week view
  const [weekOffset, setWeekOffset] = useState(0)
  const goNextWeek = () => setWeekOffset(o => o + 1)
  const goPrevWeek = () => setWeekOffset(o => o - 1)

  const eventsForDate = (dateStr: string) => events.filter(e => e.event_date === dateStr)

  const filteredEvents = selectedDate
    ? eventsForDate(selectedDate)
    : events
        .filter(e => e.event_date >= todayStr)
        .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time))
        .slice(0, 20)

  // ─── Event actions ───
  const updateEventStatus = async (eventId: string, status: string) => {
    await fetch(`/api/calendar/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: status as any } : e))
    setSelectedEvent(null)
  }

  const deleteEvent = async (eventId: string) => {
    await fetch(`/api/calendar/${eventId}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== eventId))
    setSelectedEvent(null)
  }

  const dragEvent = async (eventId: string, newDate: string, newTime?: string) => {
    const body: any = { event_date: newDate }
    if (newTime) body.start_time = newTime
    await fetch(`/api/calendar/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...body } : e))
  }

  // ─── Type / Status labels ───
  const typeLabel = (type: string) => {
    const map: Record<string, string> = { visit: t.typeVisit, meeting: t.typeMeeting, follow_up: t.typeFollowUp, other: t.typeOther }
    return map[type] || type
  }
  const statusLabel = (status: string) => {
    const map: Record<string, string> = { scheduled: t.statusScheduled, completed: t.statusCompleted, cancelled: t.statusCancelled, no_show: t.statusNoShow }
    return map[status] || status
  }

  // ─── Filter assigned_to ───
  const toggleUserFilter = (userId: string) => {
    setFilterAssignedTo(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [userId]
    )
  }
  const clearUserFilter = () => setFilterAssignedTo([])

  return {
    // State
    user, activeOrg, orgId, userLang, orgTz,
    t, today, todayStr, monthNames,
    events, orgUsers, loading,
    currentMonth, currentYear, selectedDate,
    viewMode, weekOffset,
    showCreateModal, selectedEvent, preselectedLeadId,
    filterAssignedTo,
    daysInMonth, firstDay,

    // Setters
    setViewMode, setCurrentMonth, setCurrentYear,
    setSelectedDate, setShowCreateModal, setSelectedEvent,
    setPreselectedLeadId,
    setWeekOffset,

    // Navigation
    prevMonth, nextMonth, goToday, goNextWeek, goPrevWeek,

    // Data
    eventsForDate, filteredEvents,

    // Actions
    updateEventStatus, deleteEvent, dragEvent,

    // Labels
    typeLabel, statusLabel,

    // Filters
    toggleUserFilter, clearUserFilter,
  }
}
