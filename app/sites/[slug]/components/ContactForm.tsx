// Site público — Formulário de contato
'use client'

import { useState, useRef } from 'react'
import { trackPropertyEvent } from '@/lib/properties/tracker'

interface ContactFormProps {
  siteSlug: string
  propertyId?: string
  propertyTitle?: string
}

export default function ContactForm({ siteSlug, propertyId, propertyTitle }: ContactFormProps) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: propertyTitle ? `Olá! Tenho interesse no imóvel: ${propertyTitle}` : '',
    website: '', // honeypot
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const trackedOpen = useRef(false)

  const handleFormFocus = () => {
    if (!trackedOpen.current && propertyId) {
      trackPropertyEvent(siteSlug, propertyId, 'contact_open')
      trackedOpen.current = true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone) return

    setStatus('sending')
    try {
      const res = await fetch('/api/site-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_slug: siteSlug,
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          message: form.message || undefined,
          property_id: propertyId || undefined,
          website: form.website, // honeypot
        }),
      })

      if (res.ok) {
        setStatus('success')
        if (propertyId) {
          trackPropertyEvent(siteSlug, propertyId, 'contact_submit')
        }
        setForm({ name: '', phone: '', email: '', message: '', website: '' })
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('[ContactForm] Error:', res.status, errData)
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-success-subtle)' }}>
          <svg width="28" height="28" fill="none" stroke="#10b981" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Mensagem enviada!</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Entraremos em contato em breve.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} onFocus={handleFormFocus} className="space-y-4">
      {/* Honeypot — invisível para humanos */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nome *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          required
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          placeholder="Seu nome"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Telefone *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
            placeholder="seu@email.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mensagem</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
          style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          placeholder="Como posso ajudar?"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 shadow-sm"
        style={{ background: 'var(--site-primary)', color: 'var(--color-text-on-primary)' }}
      >
        {status === 'sending' ? 'Enviando...' : 'Enviar Mensagem'}
      </button>

      {status === 'error' && (
        <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>Erro ao enviar. Tente novamente.</p>
      )}
    </form>
  )
}
