'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'

const T = {
  pt: {
    send: 'Enviar',
    cancel: 'Cancelar',
    sending: 'Enviando...',
    sent: 'Mensagem enviada!',
    error: 'Falha ao enviar. Tente novamente.',
    retry: 'Tentar novamente',
    placeholder: 'Digite sua mensagem...',
    addPhone: 'Adicionar telefone',
    charCount: 'caracteres',
  },
  en: {
    send: 'Send',
    cancel: 'Cancel',
    sending: 'Sending...',
    sent: 'Message sent!',
    error: 'Failed to send. Please try again.',
    retry: 'Retry',
    placeholder: 'Type your message...',
    addPhone: 'Add phone number',
    charCount: 'characters',
  },
  es: {
    send: 'Enviar',
    cancel: 'Cancelar',
    sending: 'Enviando...',
    sent: '¡Mensaje enviado!',
    error: 'Error al enviar. Inténtalo de nuevo.',
    retry: 'Reintentar',
    placeholder: 'Escribe tu mensaje...',
    addPhone: 'Agregar teléfono',
    charCount: 'caracteres',
  },
}

interface Props {
  leadId: string
  leadName: string
  phone: string | null
  orgId: string
  suggestedMessage: string
  lang?: 'pt' | 'en' | 'es'
  isExpanded: boolean
  onSent: () => void
  onCancel: () => void
}

type PanelState = 'editing' | 'sending' | 'sent' | 'error'

export default function QuickMessagePanel({
  leadId, leadName, phone, orgId, suggestedMessage,
  lang = 'pt', isExpanded, onSent, onCancel,
}: Props) {
  const [message, setMessage] = useState(suggestedMessage)
  const [state, setState] = useState<PanelState>('editing')
  const [errorMsg, setErrorMsg] = useState('')

  const t = T[lang]

  if (!isExpanded) return null

  // No phone
  if (!phone) {
    return (
      <div className="mt-2 p-3 rounded-lg text-xs" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}>
        <p style={{ color: 'var(--color-text-tertiary)' }}>
          {t.addPhone} —
          <a href={`/dashboard/crm/${leadId}`} className="ml-1 font-medium underline" style={{ color: 'var(--color-primary)' }}>
            Abrir CRM
          </a>
        </p>
      </div>
    )
  }

  const handleSend = async () => {
    if (!message.trim() || state === 'sending') return
    setState('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, lead_id: leadId, phone, message: message.trim() }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to send')
      }

      setState('sent')
      setTimeout(() => onSent(), 800)
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.message || t.error)
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {state === 'sent' ? (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle2 size={14} style={{ color: '#10b981' }} />
          <span className="text-xs font-medium" style={{ color: '#10b981' }}>{t.sent}</span>
        </div>
      ) : state === 'error' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={14} style={{ color: '#ef4444' }} />
            <span className="text-xs" style={{ color: '#ef4444' }}>{errorMsg}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setState('editing'); setErrorMsg('') }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              {t.cancel}
            </button>
            <button onClick={handleSend}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--color-primary)' }}>
              {t.retry}
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.placeholder}
            rows={2}
            disabled={state === 'sending'}
            className="w-full p-2.5 rounded-lg text-xs resize-none transition-colors focus:outline-none disabled:opacity-50"
            style={{
              background: 'var(--color-bg-hover)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {message.length} {t.charCount}
            </span>
            <div className="flex gap-2">
              <button onClick={onCancel}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                <X size={12} /> {t.cancel}
              </button>
              <button onClick={handleSend} disabled={state === 'sending' || !message.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #4F6FFF, #6E5FFF)' }}>
                {state === 'sending' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                {state === 'sending' ? t.sending : t.send}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
