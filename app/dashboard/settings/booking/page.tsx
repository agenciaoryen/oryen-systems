// app/dashboard/settings/booking/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Loader2, Copy, Check, ExternalLink, Trash2, Power, PowerOff, Globe } from 'lucide-react'
import { useActiveOrgId } from '@/lib/AuthContext'

interface BookingSlot {
  id: string
  org_id: string
  user_id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  buffer_minutes: number
  availability_config: {
    days: number[]
    start_hour: number
    end_hour: number
    timezone: string
  }
  is_active: boolean
  users?: { full_name: string }
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function BookingSettingsPage() {
  const orgId = useActiveOrgId()
  const [bookings, setBookings] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(30)
  const [buffer, setBuffer] = useState(0)
  const [startHour, setStartHour] = useState(9)
  const [endHour, setEndHour] = useState(18)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchBookings = async () => {
    if (!orgId) return
    const res = await fetch(`/api/booking?org_id=${orgId}`)
    const data = await res.json()
    if (data.bookings) setBookings(data.bookings)
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [orgId])

  const resetForm = () => {
    setSlug('')
    setTitle('')
    setDescription('')
    setDuration(30)
    setBuffer(0)
    setStartHour(9)
    setEndHour(18)
    setSelectedDays([1, 2, 3, 4, 5])
    setEditingId(null)
  }

  const openEdit = (b: BookingSlot) => {
    setSlug(b.slug)
    setTitle(b.title)
    setDescription(b.description || '')
    setDuration(b.duration_minutes)
    setBuffer(b.buffer_minutes)
    setStartHour(b.availability_config.start_hour)
    setEndHour(b.availability_config.end_hour)
    setSelectedDays(b.availability_config.days)
    setEditingId(b.id)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!slug.trim() || !title.trim()) return
    setSaving(true)
    const payload: any = {
      org_id: orgId,
      slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: duration,
      buffer_minutes: buffer,
      availability_config: { days: selectedDays, start_hour: startHour, end_hour: endHour, timezone: 'America/Sao_Paulo' },
    }

    const res = editingId
      ? await fetch('/api/booking', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

    const data = await res.json()
    if (data.booking) {
      if (editingId) {
        setBookings(prev => prev.map(b => b.id === editingId ? data.booking : b))
      } else {
        setBookings(prev => [data.booking, ...prev])
      }
    }
    setSaving(false)
    setShowModal(false)
    resetForm()
  }

  const toggleActive = async (b: BookingSlot) => {
    const res = await fetch('/api/booking', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, is_active: !b.is_active })
    })
    const data = await res.json()
    if (data.booking) {
      setBookings(prev => prev.map(x => x.id === b.id ? data.booking : x))
    }
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/booking', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/booking/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(slug)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Agendamento Público</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Links públicos onde clientes agendam horários com você</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus size={16} />
          Novo Link
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <Globe size={40} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nenhum link de agendamento criado</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Crie um link para compartilhar com seus clientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="rounded-2xl p-5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{b.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.is_active ? '' : ''}`}
                      style={{
                        background: b.is_active ? 'var(--color-success-subtle)' : 'var(--color-bg-hover)',
                        color: b.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}>
                      {b.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{b.duration_minutes} min</span>
                    <span>{b.availability_config.start_hour}h - {b.availability_config.end_hour}h</span>
                    <span>{b.availability_config.days.map(d => DAY_LABELS[d]).join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs px-2 py-1 rounded" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }}>
                      {baseUrl}/booking/{b.slug}
                    </code>
                    <button onClick={() => copyLink(b.slug)} className="p-1 rounded transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      {copiedId === b.slug ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                    </button>
                    <a href={`/booking/${b.slug}`} target="_blank" className="p-1 rounded transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(b)} className="p-2 rounded-lg transition-colors" style={{ color: b.is_active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {b.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                  </button>
                  <button onClick={() => openEdit(b)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setShowModal(false)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{editingId ? 'Editar Link' : 'Novo Link de Agendamento'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
            </div>

            <div className="px-5 py-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Link</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/booking/</span>
                  <input value={slug} onChange={e => setSlug(e.target.value)} className="flex-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="meu-link" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Título *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="Ex: Visita de avaliação" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none resize-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="Descreva o que o cliente vai agendar..." />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Duração (min)</label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none appearance-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Intervalo (min)</label>
                  <select value={buffer} onChange={e => setBuffer(Number(e.target.value))} className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none appearance-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {[0, 15, 30, 60].map(m => <option key={m} value={m}>{m > 0 ? `${m} min` : 'Nenhum'}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Início</label>
                  <select value={startHour} onChange={e => setStartHour(Number(e.target.value))} className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none appearance-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {Array.from({ length: 12 }, (_, i) => i + 7).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Fim</label>
                  <select value={endHour} onChange={e => setEndHour(Number(e.target.value))} className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none appearance-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                    {Array.from({ length: 12 }, (_, i) => i + 8).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-tertiary)' }}>Dias Disponíveis</label>
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: selectedDays.includes(i) ? 'var(--color-primary)' : 'var(--color-bg-hover)',
                        color: selectedDays.includes(i) ? '#fff' : 'var(--color-text-tertiary)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving || !slug.trim() || !title.trim()} className="px-5 py-2 disabled:opacity-50 rounded-xl font-medium text-sm transition-colors flex items-center gap-2" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingId ? 'Salvar' : 'Criar Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
