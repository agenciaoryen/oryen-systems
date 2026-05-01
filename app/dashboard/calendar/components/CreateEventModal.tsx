// app/dashboard/calendar/components/CreateEventModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Search, User, Loader2 } from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'
import type { CalendarEvent, LeadOption, OrgUser } from '../types'

function rruleFromFrequency(freq: string): string {
  switch (freq) {
    case 'daily': return 'FREQ=DAILY'
    case 'weekly': return 'FREQ=WEEKLY'
    case 'fortnightly': return 'FREQ=WEEKLY;INTERVAL=2'
    case 'monthly': return 'FREQ=MONTHLY'
    default: return ''
  }
}

interface Props {
  orgId: string
  t: Record<string, string>
  orgUsers: OrgUser[]
  currentUserId?: string | null
  onClose: () => void
  onCreated: (ev: CalendarEvent) => void
  defaultDate: string
  initialLeadId?: string | null
}

export default function CreateEventModal({
  orgId, t, orgUsers, currentUserId,
  onClose, onCreated, defaultDate, initialLeadId
}: Props) {
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('visit')
  const [eventDate, setEventDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [repeatFreq, setRepeatFreq] = useState<string>('')
  const [leadId, setLeadId] = useState<string | null>(null)
  const [leadSearch, setLeadSearch] = useState('')
  const [leadResults, setLeadResults] = useState<LeadOption[]>([])
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null)
  const [saving, setSaving] = useState(false)

  // Default assigned_to to current user
  useEffect(() => {
    if (currentUserId && orgUsers.some(u => u.id === currentUserId)) {
      setAssignedTo(currentUserId)
    }
  }, [currentUserId, orgUsers])

  // Pre-selected lead
  useEffect(() => {
    if (!initialLeadId) return
    supabase
      .from('leads')
      .select('id, name, phone')
      .eq('id', initialLeadId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedLead(data)
          setLeadId(data.id)
        }
      })
  }, [initialLeadId])

  // Lead search
  useEffect(() => {
    if (!leadSearch.trim() || leadSearch.length < 2) { setLeadResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, phone')
        .eq('org_id', orgId)
        .or(`name.ilike.%${leadSearch}%,phone.ilike.%${leadSearch}%,email.ilike.%${leadSearch}%`)
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
          assigned_to: assignedTo,
          rrule: repeatFreq ? rruleFromFrequency(repeatFreq as any) : null,
          created_by: 'user'
        })
      })
      const data = await res.json()
      if (data.event) onCreated(data.event)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none [color-scheme:dark]"
  const inputStyle: React.CSSProperties = { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'var(--color-bg-overlay)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col mx-auto" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{t.newEvent}</h2>
          <button onClick={onClose} className="shrink-0 ml-2" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
        </div>

        <div className="px-4 sm:px-5 py-3 space-y-3 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.eventTitle}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} style={inputStyle} placeholder="Ex: Visita apartamento 2 quartos" />
          </div>

          {/* Type + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.eventType}</label>
              <CustomSelect
                value={eventType}
                onChange={(v) => setEventType(v)}
                options={[
                  { value: 'visit', label: t.typeVisit },
                  { value: 'meeting', label: t.typeMeeting },
                  { value: 'follow_up', label: t.typeFollowUp },
                  { value: 'other', label: t.typeOther },
                ]}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.date}</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* Start + End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.startTime}</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.endTime}</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.address}</label>
            <input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} style={inputStyle} placeholder="Rua, numero, bairro..." />
          </div>

          {/* Assigned To */}
          {orgUsers.length > 0 && (
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.assignedTo}</label>
              <select
                value={assignedTo || ''}
                onChange={e => setAssignedTo(e.target.value || null)}
                className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none appearance-none"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <option value="">{t.selectMember}</option>
                {orgUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Repeat */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.repeat}</label>
            <select
              value={repeatFreq}
              onChange={e => setRepeatFreq(e.target.value)}
              className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none appearance-none"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <option value="">{t.repeatNone}</option>
              <option value="daily">{t.repeatDaily}</option>
              <option value="weekly">{t.repeatWeekly}</option>
              <option value="fortnightly">{t.repeatFortnightly}</option>
              <option value="monthly">{t.repeatMonthly}</option>
            </select>
          </div>

          {/* Lead search */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.lead}</label>
            {selectedLead ? (
              <div className="flex items-center gap-2 mt-1 rounded-lg px-3 py-2" style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)' }}>
                <User size={14} style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>{selectedLead.name}</span>
                <button onClick={() => { setSelectedLead(null); setLeadId(null); setLeadSearch('') }} style={{ color: 'var(--color-text-muted)' }}><X size={14} /></button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder={t.searchLead} />
                {leadResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                    {leadResults.map(l => (
                      <button key={l.id} onClick={() => { setSelectedLead(l); setLeadId(l.id); setLeadSearch(''); setLeadResults([]) }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                        <User size={12} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{l.name}</span>
                        {l.phone && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{l.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.notes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={1} className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none resize-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="Observacoes..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 sm:px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>{t.cancel}</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="px-5 py-2 disabled:opacity-50 rounded-xl font-medium text-sm transition-colors flex items-center gap-2" style={{ background: 'var(--color-primary)', color: '#fff' }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
