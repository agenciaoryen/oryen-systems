// app/dashboard/calendar/components/EventDetailModal.tsx
'use client'

import { useState } from 'react'
import { Clock, MapPin, User, X, Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react'
import { formatLeadName } from '@/lib/format/leadName'
import { EVENT_TYPE_COLORS, STATUS_COLORS, formatTime } from '../constants'
import type { CalendarEvent } from '../types'

interface Props {
  event: CalendarEvent
  t: Record<string, string>
  typeLabel: (type: string) => string
  statusLabel: (status: string) => string
  assignedUserName?: string | null
  assignedUserColor?: { bg: string; text: string; border: string } | null
  onClose: () => void
  onUpdateStatus: (id: string, status: string) => void
  onDelete: (id: string, deleteAll?: boolean) => void
}

export default function EventDetailModal({
  event, t, typeLabel, statusLabel,
  assignedUserName, assignedUserColor,
  onClose, onUpdateStatus, onDelete
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const colors = EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other
  const sColors = STATUS_COLORS[event.status] || STATUS_COLORS.scheduled

  const handleDelete = async () => {
    setDeleting(true)
    // Se for mestre (rrule set), manda delete_all=true para remover todos
    // Se for normal ou virtual, só deleta
    await onDelete(event.id, !!event.rrule)
    setDeleting(false)
  }

  const handleDeleteThisOccurrence = async () => {
    setDeleting(true)
    // Adiciona a data atual ao excluded_dates do mestre
    await fetch(`/api/calendar/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _deleteThis: true,
        _masterId: event.id,
        _occurrenceDate: event.event_date,
      })
    })
    setDeleting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.eventDetails}</h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title + badges */}
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{event.title}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded" style={{ background: colors.bg, color: colors.text }}>
                {typeLabel(event.event_type)}
              </span>
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded" style={{ background: sColors.bg, color: sColors.text }}>
                {statusLabel(event.status)}
              </span>
              {event.created_by === 'sdr_agent' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ color: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}>
                  {t.createdByAgent}
                </span>
              )}
              {event.external_source === 'google_calendar' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1" style={{ color: '#4285F4', background: 'rgba(66, 133, 244, 0.12)' }}>
                  <svg width="10" height="10" viewBox="0 0 48 48" fill="none"><rect x="6" y="9" width="36" height="33" rx="3" fill="currentColor" opacity="0.2"/><rect x="6" y="9" width="36" height="7" fill="currentColor"/></svg>
                  {t.fromGoogle}
                </span>
              )}
            </div>
          </div>

          {/* Date/Time */}
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
            <span>{event.event_date.split('-').reverse().join('/')}</span>
            <span>{formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</span>
          </div>

          {/* Assigned to */}
          {assignedUserName && (
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: assignedUserColor?.bg || 'var(--color-bg-hover)', color: assignedUserColor?.text || 'var(--color-text-muted)' }}>
                {assignedUserName.charAt(0).toUpperCase()}
              </div>
              <span>{assignedUserName}</span>
            </div>
          )}

          {/* Address */}
          {event.address && (
            <div className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin size={16} className="mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
              <span>{event.address}</span>
            </div>
          )}

          {/* Lead */}
          {event.leads && (event.leads.name) && (
            <div className="flex items-center gap-3 text-sm">
              <User size={16} style={{ color: 'var(--color-text-muted)' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>{event.leads.name}</span>
              <a href={`/dashboard/crm/${event.lead_id}`} className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-primary)' }}>
                <ExternalLink size={12} />
                {t.viewLead}
              </a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="text-sm rounded-lg p-3" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }}>{event.description}</div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="text-sm rounded-lg p-3" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }}>{event.notes}</div>
          )}
        </div>

        {/* Google read-only warning */}
        {event.external_read_only && (
          <div className="mx-5 mb-3 p-3 rounded-xl text-xs flex items-start gap-2" style={{ background: 'rgba(66, 133, 244, 0.08)', border: '1px solid rgba(66, 133, 244, 0.25)', color: 'var(--color-text-secondary)' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: '#4285F4' }} />
            <p>{t.googleReadOnly}</p>
          </div>
        )}

        {/* Actions */}
        {event.status === 'scheduled' && !event.external_read_only && (
          <div className="p-5 space-y-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            {/* Recurring badge */}
            {(event.rrule || event.is_virtual) && (
              <div className="flex items-center gap-2 mb-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                <span>{t.recurringEvent}</span>
              </div>
            )}
            <button onClick={() => onUpdateStatus(event.id, 'completed')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
              <CheckCircle2 size={16} />
              {t.markCompleted}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onUpdateStatus(event.id, 'no_show')} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}>
                <AlertCircle size={14} />
                {t.markNoShow}
              </button>
              <button onClick={() => onUpdateStatus(event.id, 'cancelled')} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                <XCircle size={14} />
                {t.markCancelled}
              </button>
            </div>
          </div>
        )}

        {/* Delete */}
        {!event.external_read_only && (
        <div className="px-5 pb-5">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 text-xs transition-colors py-2" style={{ color: 'var(--color-text-muted)' }}>
              <Trash2 size={14} />
              {t.delete}
            </button>
          ) : (event.rrule || event.recurrence_master_id) ? (
            // Recurring event: choose "this" or "all"
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: 'var(--color-error-subtle)' }}>
                  <AlertCircle size={18} style={{ color: 'var(--color-error)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-error)' }}>{t.deleteConfirmTitle}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.deleteConfirmDesc}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleDelete} disabled={deleting} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium disabled:opacity-50 rounded-lg transition-colors" style={{ background: 'var(--color-error)', color: '#fff' }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {event.recurrence_master_id ? t.deleteThis : t.deleteAll}
                </button>
                {!event.recurrence_master_id && (
                  <button onClick={handleDeleteThisOccurrence} disabled={deleting} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium disabled:opacity-50 rounded-lg transition-colors" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                    {t.deleteThis}
                  </button>
                )}
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: 'var(--color-error-subtle)' }}>
                  <AlertCircle size={18} style={{ color: 'var(--color-error)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-error)' }}>{t.deleteConfirmTitle}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.deleteConfirmDesc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}>
                  {t.cancel}
                </button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium disabled:opacity-50 rounded-lg transition-colors" style={{ background: 'var(--color-error)', color: '#fff' }}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {t.deleteConfirm}
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
