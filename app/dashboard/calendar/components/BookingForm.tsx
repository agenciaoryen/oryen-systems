// app/dashboard/calendar/components/BookingForm.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { CalendarDays, Clock, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'

interface BookingConfig {
  id: string
  org_id: string
  user_id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  buffer_minutes: number
  availability_config: {
    days: number[] // 0=Sun, 1=Mon, ...
    start_hour: number
    end_hour: number
    timezone: string
  }
  users: { full_name: string }
}

export default function BookingForm({ booking }: { booking: BookingConfig }) {
  const [step, setStep] = useState<'date' | 'time' | 'form' | 'confirm' | 'done'>('date')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busySlots, setBusySlots] = useState<string[]>([])

  const { availability_config: config, duration_minutes: duration, buffer_minutes: buffer } = booking
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calendar state for date picker
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())

  // Generate available time slots when date is selected
  const timeSlots = useMemo(() => {
    if (!selectedDate) return []
    const slots: string[] = []
    const startH = config.start_hour || 9
    const endH = config.end_hour || 18
    const step = duration + buffer

    for (let h = startH; h < endH; h++) {
      for (let m = 0; m < 60; m += step) {
        if (h === endH && m > 0) break
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        if (h + Math.floor((m + duration) / 60) < endH || (h + Math.floor((m + duration) / 60) === endH && (m + duration) % 60 === 0)) {
          slots.push(time)
        }
      }
    }
    // Filter out busy slots
    return slots.filter(s => !busySlots.includes(s))
  }, [selectedDate, config, duration, buffer, busySlots])

  // Fetch busy slots when date changes
  useEffect(() => {
    if (!selectedDate) return
    const fetchBusy = async () => {
      const res = await fetch(`/api/calendar?org_id=${booking.org_id}&from=${selectedDate}&to=${selectedDate}&assigned_to=${booking.user_id}`)
      const data = await res.json()
      const busy = (data.events || [])
        .filter((e: any) => e.status === 'scheduled')
        .map((e: any) => e.start_time)
      setBusySlots(busy)
    }
    fetchBusy()
  }, [selectedDate, booking.org_id, booking.user_id])

  const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate()
  const firstDay = (m: number, y: number) => new Date(y, m, 1).getDay()

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    const fd = firstDay(calMonth, calYear)
    const dim = daysInMonth(calMonth, calYear)
    for (let i = 0; i < fd; i++) days.push(null)
    for (let i = 1; i <= dim; i++) days.push(i)
    return days
  }, [calMonth, calYear])

  const isDayAvailable = (day: number) => {
    const d = new Date(calYear, calMonth, day)
    if (d <= today) return false
    return config.days.includes(d.getDay())
  }

  const handleDateSelect = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setSelectedTime(null)
    setStep('time')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep('form')
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !selectedDate || !selectedTime) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/booking/${booking.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao agendar')
        setSaving(false)
        return
      }
      setStep('done')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${parseInt(d)} de ${monthNames[parseInt(m) - 1]} de ${y}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        {/* Header */}
        <div className="p-6 text-center" style={{ background: 'var(--color-primary-subtle)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{booking.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {duration} min — {booking.users.full_name}
          </p>
        </div>

        {step === 'done' ? (
          <div className="p-6 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto" style={{ color: 'var(--color-success)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Agendamento confirmado!</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDate(selectedDate!)} às {selectedTime}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Você receberá um lembrete próximo à data.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {['date', 'time', 'form'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: step === s ? 'var(--color-primary)' : i < ['date', 'time', 'form'].indexOf(step) ? 'var(--color-success)' : 'var(--color-bg-hover)',
                      color: step === s || i < ['date', 'time', 'form'].indexOf(step) ? '#fff' : 'var(--color-text-muted)'
                    }}>
                    {i < ['date', 'time', 'form'].indexOf(step) ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />}
                </div>
              ))}
            </div>

            {/* Step 1: Date */}
            {step === 'date' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => { if (calMonth > today.getMonth() || calYear > today.getFullYear()) { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) } }} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{monthNames[calMonth]} {calYear}</h3>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {dayNames.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: 'var(--color-text-muted)' }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => (
                    <div key={i} className="aspect-square">
                      {day ? (
                        <button
                          onClick={() => isDayAvailable(day) && handleDateSelect(day)}
                          disabled={!isDayAvailable(day)}
                          className="w-full h-full rounded-lg text-sm flex items-center justify-center transition-colors"
                          style={{
                            background: selectedDate === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? 'var(--color-primary)' : isDayAvailable(day) ? 'var(--color-bg-hover)' : 'transparent',
                            color: selectedDate === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? '#fff' : isDayAvailable(day) ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                            opacity: isDayAvailable(day) ? 1 : 0.3,
                            cursor: isDayAvailable(day) ? 'pointer' : 'default',
                          }}
                        >
                          {day}
                        </button>
                      ) : (
                        <div />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Time */}
            {step === 'time' && selectedDate && (
              <div>
                <button onClick={() => setStep('date')} className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  <ChevronLeft size={14} />
                  Voltar
                </button>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{formatDate(selectedDate)}</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Selecione um horário disponível</p>
                <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className="py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: selectedTime === time ? 'var(--color-primary)' : 'var(--color-bg-hover)',
                        color: selectedTime === time ? '#fff' : 'var(--color-text-primary)',
                        border: selectedTime === time ? 'none' : '1px solid var(--color-border-subtle)',
                      }}
                    >
                      {time}
                    </button>
                  ))}
                  {timeSlots.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Nenhum horário disponível nesta data
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Form */}
            {step === 'form' && (
              <div>
                <button onClick={() => setStep('time')} className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  <ChevronLeft size={14} />
                  Voltar
                </button>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {formatDate(selectedDate!)} às {selectedTime}
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Preencha seus dados para confirmar</p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Nome *</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Telefone *</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Observações</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} placeholder="Algo que queira adicionar..." />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-xs mt-3" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={saving || !name.trim() || !phone.trim()}
                  className="w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Confirmar Agendamento
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
