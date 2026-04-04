// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Search
} from 'lucide-react'

/* =============================================
   TRANSLATIONS
   ============================================= */
const TRANSLATIONS = {
  pt: {
    title: 'Agenda',
    today: 'Hoje',
    noEvents: 'Nenhum evento agendado',
    noEventsDesc: 'Seus compromissos com leads aparecerão aqui',
    upcoming: 'Próximos Eventos',
    allDay: 'Dia todo',
    newEvent: 'Novo Evento',
    editEvent: 'Editar Evento',
    eventDetails: 'Detalhes do Evento',
    // Form
    eventTitle: 'Título',
    eventType: 'Tipo',
    date: 'Data',
    startTime: 'Início',
    endTime: 'Término',
    address: 'Endereço',
    description: 'Descrição',
    notes: 'Observações',
    lead: 'Lead vinculado',
    searchLead: 'Buscar lead...',
    noLead: 'Nenhum lead vinculado',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    // Types
    typeVisit: 'Visita',
    typeMeeting: 'Reunião',
    typeFollowUp: 'Follow-up',
    typeOther: 'Outro',
    // Status
    statusScheduled: 'Agendado',
    statusCompleted: 'Concluído',
    statusCancelled: 'Cancelado',
    statusNoShow: 'Não compareceu',
    // Actions
    markCompleted: 'Marcar como Concluído',
    markNoShow: 'Não Compareceu',
    markCancelled: 'Cancelar Evento',
    viewLead: 'Ver Lead',
    createdByAgent: 'Agendado pelo Agente IA',
    // Days
    sun: 'Dom', mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb',
    // Months
    months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  },
  en: {
    title: 'Calendar',
    today: 'Today',
    noEvents: 'No scheduled events',
    noEventsDesc: 'Your appointments with leads will appear here',
    upcoming: 'Upcoming Events',
    allDay: 'All day',
    newEvent: 'New Event',
    editEvent: 'Edit Event',
    eventDetails: 'Event Details',
    eventTitle: 'Title',
    eventType: 'Type',
    date: 'Date',
    startTime: 'Start',
    endTime: 'End',
    address: 'Address',
    description: 'Description',
    notes: 'Notes',
    lead: 'Linked lead',
    searchLead: 'Search lead...',
    noLead: 'No linked lead',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    typeVisit: 'Visit',
    typeMeeting: 'Meeting',
    typeFollowUp: 'Follow-up',
    typeOther: 'Other',
    statusScheduled: 'Scheduled',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    statusNoShow: 'No Show',
    markCompleted: 'Mark as Completed',
    markNoShow: 'No Show',
    markCancelled: 'Cancel Event',
    viewLead: 'View Lead',
    createdByAgent: 'Scheduled by AI Agent',
    sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  es: {
    title: 'Agenda',
    today: 'Hoy',
    noEvents: 'Sin eventos agendados',
    noEventsDesc: 'Tus citas con leads aparecerán aquí',
    upcoming: 'Próximos Eventos',
    allDay: 'Todo el día',
    newEvent: 'Nuevo Evento',
    editEvent: 'Editar Evento',
    eventDetails: 'Detalles del Evento',
    eventTitle: 'Título',
    eventType: 'Tipo',
    date: 'Fecha',
    startTime: 'Inicio',
    endTime: 'Fin',
    address: 'Dirección',
    description: 'Descripción',
    notes: 'Observaciones',
    lead: 'Lead vinculado',
    searchLead: 'Buscar lead...',
    noLead: 'Sin lead vinculado',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    typeVisit: 'Visita',
    typeMeeting: 'Reunión',
    typeFollowUp: 'Seguimiento',
    typeOther: 'Otro',
    statusScheduled: 'Agendado',
    statusCompleted: 'Completado',
    statusCancelled: 'Cancelado',
    statusNoShow: 'No asistió',
    markCompleted: 'Marcar como Completado',
    markNoShow: 'No Asistió',
    markCancelled: 'Cancelar Evento',
    viewLead: 'Ver Lead',
    createdByAgent: 'Agendado por el Agente IA',
    sun: 'Dom', mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb',
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  }
}

type Language = keyof typeof TRANSLATIONS

/* =============================================
   TYPES
   ============================================= */
interface CalendarEvent {
  id: string
  org_id: string
  lead_id: string | null
  title: string
  description: string | null
  event_type: 'visit' | 'meeting' | 'follow_up' | 'other'
  event_date: string
  start_time: string
  end_time: string | null
  address: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  created_by: string
  notes: string | null
  created_at: string
  updated_at: string
  leads?: { id: string; name: string; phone: string } | null
}

interface LeadOption {
  id: string
  name: string
  phone: string | null
}

/* =============================================
   CONSTANTS
   ============================================= */
const EVENT_TYPE_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  visit: { dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  meeting: { dot: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  follow_up: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  other: { dot: 'bg-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
  no_show: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
}

/* =============================================
   HELPERS
   ============================================= */
function formatTime(time: string): string {
  return time?.slice(0, 5) || ''
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay() // 0=dom
  const totalDays = lastDay.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length < 42) cells.push(null)
  return cells
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/* =============================================
   COMPONENT
   ============================================= */
export default function CalendarPage() {
  const { user } = useAuth()
  const orgId = useActiveOrgId()
  const userLang = ((user as any)?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]

  // State
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // ─── Fetch events for visible month ───
  const fetchEvents = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const from = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
    const to = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const res = await fetch(`/api/calendar?org_id=${orgId}&from=${from}&to=${to}`)
    const data = await res.json()
    setEvents(data.events || [])
    setLoading(false)
  }, [orgId, currentMonth, currentYear])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // ─── Realtime ───
  useEffect(() => {
    if (!orgId) return
    const ch = supabase
      .channel('calendar-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const ev = payload.new as CalendarEvent
          if (ev.org_id === orgId) {
            setEvents(prev => prev.some(e => e.id === ev.id) ? prev : [...prev, ev])
          }
        } else if (payload.eventType === 'UPDATE') {
          const ev = payload.new as CalendarEvent
          setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, ...ev } : e))
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as any
          setEvents(prev => prev.filter(e => e.id !== old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId])

  // ─── Navigation ───
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }
  const goToday = () => {
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
    setSelectedDate(toDateStr(now.getFullYear(), now.getMonth(), now.getDate()))
  }

  // ─── Derived ───
  const cells = getMonthDays(currentYear, currentMonth)
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate())
  const dayNames = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat]

  // Events by date map
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const d = ev.event_date
    if (!eventsByDate.has(d)) eventsByDate.set(d, [])
    eventsByDate.get(d)!.push(ev)
  }

  // Filtered events for list
  const listEvents = selectedDate
    ? (eventsByDate.get(selectedDate) || [])
    : events
        .filter(e => e.event_date >= todayStr && e.status === 'scheduled')
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

  // ─── Type / Status labels ───
  const typeLabel = (type: string) => {
    const map: Record<string, string> = { visit: t.typeVisit, meeting: t.typeMeeting, follow_up: t.typeFollowUp, other: t.typeOther }
    return map[type] || type
  }
  const statusLabel = (status: string) => {
    const map: Record<string, string> = { scheduled: t.statusScheduled, completed: t.statusCompleted, cancelled: t.statusCancelled, no_show: t.statusNoShow }
    return map[status] || status
  }

  // ─── Loading ───
  if (loading && events.length === 0) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        </div>
        <button
          onClick={() => { setShowCreateModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm"
        >
          <Plus size={16} />
          {t.newEvent}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ═══ Month Grid ═══ */}
        <div className="xl:col-span-2 bg-[#111] border border-white/5 rounded-2xl p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <ChevronLeft size={20} className="text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">
                {t.months[currentMonth]} {currentYear}
              </h2>
              <button onClick={goToday} className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-md hover:bg-blue-500/20 transition-colors font-medium">
                {t.today}
              </button>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="h-12" />
              const dateStr = toDateStr(currentYear, currentMonth, day)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayEvents = eventsByDate.get(dateStr) || []
              const hasEvents = dayEvents.length > 0

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all relative ${
                    isSelected
                      ? 'bg-blue-500/20 border border-blue-500/40'
                      : isToday
                        ? 'bg-white/5 border border-white/10'
                        : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-400' : isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {day}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5">
                      {dayEvents.slice(0, 3).map((ev, j) => (
                        <div key={j} className={`w-1.5 h-1.5 rounded-full ${EVENT_TYPE_COLORS[ev.event_type]?.dot || 'bg-gray-500'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══ Event List ═══ */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 max-h-[600px] overflow-y-auto">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            {selectedDate ? `${selectedDate.split('-')[2]}/${selectedDate.split('-')[1]}` : t.upcoming}
          </h3>

          {listEvents.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">{t.noEvents}</p>
              <p className="text-xs text-gray-600 mt-1">{t.noEventsDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listEvents.map(ev => {
                const colors = EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.other
                const sColors = STATUS_COLORS[ev.status] || STATUS_COLORS.scheduled
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`w-full text-left p-3 rounded-xl border ${colors.border} ${colors.bg} hover:brightness-125 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-gray-500" />
                          <span className="text-xs text-gray-400">
                            {formatTime(ev.start_time)}{ev.end_time ? ` - ${formatTime(ev.end_time)}` : ''}
                          </span>
                          {!selectedDate && (
                            <span className="text-xs text-gray-600">
                              {ev.event_date.split('-')[2]}/{ev.event_date.split('-')[1]}
                            </span>
                          )}
                        </div>
                        {ev.leads?.name && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <User size={12} className="text-gray-500" />
                            <span className="text-xs text-gray-400 truncate">{ev.leads.name}</span>
                          </div>
                        )}
                        {ev.address && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin size={12} className="text-gray-500" />
                            <span className="text-xs text-gray-400 truncate">{ev.address}</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${sColors.bg} ${sColors.text}`}>
                        {statusLabel(ev.status)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Create Event Modal ═══ */}
      {showCreateModal && (
        <CreateEventModal
          orgId={orgId!}
          t={t}
          onClose={() => setShowCreateModal(false)}
          onCreated={(ev) => {
            setEvents(prev => [...prev, ev])
            setShowCreateModal(false)
          }}
          defaultDate={selectedDate || todayStr}
        />
      )}

      {/* ═══ Event Detail Modal ═══ */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          t={t}
          typeLabel={typeLabel}
          statusLabel={statusLabel}
          onClose={() => setSelectedEvent(null)}
          onUpdateStatus={updateEventStatus}
          onDelete={deleteEvent}
        />
      )}
    </div>
  )
}

/* =============================================
   CREATE EVENT MODAL
   ============================================= */
function CreateEventModal({
  orgId, t, onClose, onCreated, defaultDate
}: {
  orgId: string
  t: any
  onClose: () => void
  onCreated: (ev: CalendarEvent) => void
  defaultDate: string
}) {
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('visit')
  const [eventDate, setEventDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [leadId, setLeadId] = useState<string | null>(null)
  const [leadSearch, setLeadSearch] = useState('')
  const [leadResults, setLeadResults] = useState<LeadOption[]>([])
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null)
  const [saving, setSaving] = useState(false)

  // Lead search
  useEffect(() => {
    if (!leadSearch.trim() || leadSearch.length < 2) { setLeadResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, phone')
        .eq('org_id', orgId)
        .or(`name.ilike.%${leadSearch}%,phone.ilike.%${leadSearch}%`)
        .limit(5)
      setLeadResults(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [leadSearch, orgId])

  const handleSave = async () => {
    if (!title.trim() || !eventDate || !startTime) return
    setSaving(true)
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          title: title.trim(),
          event_type: eventType,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime || null,
          address: address.trim() || null,
          description: description.trim() || null,
          notes: notes.trim() || null,
          lead_id: leadId,
          created_by: 'user'
        })
      })
      const data = await res.json()
      if (data.event) onCreated(data.event)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{t.newEvent}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.eventTitle}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none" placeholder="Ex: Visita apartamento 2 quartos" />
          </div>

          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.eventType}</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none">
                <option value="visit">{t.typeVisit}</option>
                <option value="meeting">{t.typeMeeting}</option>
                <option value="follow_up">{t.typeFollowUp}</option>
                <option value="other">{t.typeOther}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.date}</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none" />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.startTime}</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.endTime}</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.address}</label>
            <input value={address} onChange={e => setAddress(e.target.value)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none" placeholder="Rua, número, bairro..." />
          </div>

          {/* Lead search */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.lead}</label>
            {selectedLead ? (
              <div className="flex items-center gap-2 mt-1 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                <User size={14} className="text-blue-400" />
                <span className="text-sm text-white flex-1">{selectedLead.name}</span>
                <button onClick={() => { setSelectedLead(null); setLeadId(null); setLeadSearch('') }} className="text-gray-500 hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none" placeholder={t.searchLead} />
                {leadResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden z-10">
                    {leadResults.map(l => (
                      <button key={l.id} onClick={() => { setSelectedLead(l); setLeadId(l.id); setLeadSearch(''); setLeadResults([]) }} className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm text-gray-300 flex items-center gap-2">
                        <User size={12} className="text-gray-500" />
                        <span>{l.name}</span>
                        {l.phone && <span className="text-gray-600 text-xs">{l.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.notes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none resize-none" placeholder="Observações..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-white/5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t.cancel}</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

/* =============================================
   EVENT DETAIL MODAL
   ============================================= */
function EventDetailModal({
  event, t, typeLabel, statusLabel, onClose, onUpdateStatus, onDelete
}: {
  event: CalendarEvent
  t: any
  typeLabel: (type: string) => string
  statusLabel: (status: string) => string
  onClose: () => void
  onUpdateStatus: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const colors = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other
  const sColors = STATUS_COLORS[event.status] || STATUS_COLORS.scheduled

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{t.eventDetails}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title + badges */}
          <div>
            <h3 className="text-lg font-bold text-white">{event.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                {typeLabel(event.event_type)}
              </span>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${sColors.bg} ${sColors.text}`}>
                {statusLabel(event.status)}
              </span>
              {event.created_by === 'sdr_agent' && (
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  {t.createdByAgent}
                </span>
              )}
            </div>
          </div>

          {/* Date/Time */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Clock size={16} className="text-gray-500" />
            <span>{event.event_date.split('-').reverse().join('/')}</span>
            <span>{formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</span>
          </div>

          {/* Address */}
          {event.address && (
            <div className="flex items-start gap-3 text-sm text-gray-300">
              <MapPin size={16} className="text-gray-500 mt-0.5" />
              <span>{event.address}</span>
            </div>
          )}

          {/* Lead */}
          {event.leads?.name && (
            <div className="flex items-center gap-3 text-sm">
              <User size={16} className="text-gray-500" />
              <span className="text-gray-300">{event.leads.name}</span>
              <a href={`/dashboard/crm/${event.lead_id}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs">
                <ExternalLink size={12} />
                {t.viewLead}
              </a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="text-sm text-gray-400 bg-white/5 rounded-lg p-3">{event.description}</div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="text-sm text-gray-400 bg-white/5 rounded-lg p-3">{event.notes}</div>
          )}
        </div>

        {/* Actions */}
        {event.status === 'scheduled' && (
          <div className="p-5 border-t border-white/5 space-y-2">
            <button onClick={() => onUpdateStatus(event.id, 'completed')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-colors">
              <CheckCircle2 size={16} />
              {t.markCompleted}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onUpdateStatus(event.id, 'no_show')} className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-medium hover:bg-rose-500/20 transition-colors">
                <AlertCircle size={14} />
                {t.markNoShow}
              </button>
              <button onClick={() => onUpdateStatus(event.id, 'cancelled')} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500/10 border border-gray-500/30 text-gray-400 rounded-xl text-xs font-medium hover:bg-gray-500/20 transition-colors">
                <XCircle size={14} />
                {t.markCancelled}
              </button>
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="px-5 pb-5">
          <button onClick={() => { if (confirm('Tem certeza?')) deleteEvent(event.id) }} className="w-full text-center text-xs text-gray-600 hover:text-rose-400 transition-colors py-2">
            {t.delete}
          </button>
        </div>
      </div>
    </div>
  )
}
