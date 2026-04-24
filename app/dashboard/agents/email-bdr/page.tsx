// app/dashboard/agents/email-bdr/page.tsx
// Lista campanhas do BDR Email + botão pra criar nova.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { Mail, Plus, Loader2, Play, Pause, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'

type Lang = 'pt' | 'en' | 'es'

const T = {
  pt: {
    title: 'BDR por Email',
    subtitle: 'Campanhas de email frio com conteúdo gerado por IA. Sem risco de ban. Envio via Resend.',
    newCampaign: 'Nova campanha',
    noCampaigns: 'Nenhuma campanha ainda',
    noCampaignsDesc: 'Crie sua primeira campanha, importe contatos e dispare.',
    status_draft: 'Rascunho',
    status_active: 'Ativa',
    status_paused: 'Pausada',
    status_completed: 'Concluída',
    status_cancelled: 'Cancelada',
    created: 'Criada em',
    // Modal
    newCampaignTitle: 'Nova campanha de email',
    nameLabel: 'Nome interno',
    namePlaceholder: 'Ex: Corretores São Paulo — Abril',
    pitchLabel: 'Gancho da oferta',
    pitchHelp: 'Uma frase curta descrevendo o que você resolve. A IA usa isso de base.',
    pitchPlaceholder: 'Ex: Agente de IA que qualifica leads imobiliários 24/7 no WhatsApp',
    senderLabel: 'Nome do remetente',
    senderPlaceholder: 'Ex: Letie da Oryen',
    ctaLabel: 'CTA desejado',
    ctaPlaceholder: 'Ex: Responder com "sim" pra ver demo de 2 min',
    toneLabel: 'Tom de voz',
    tone_direto: 'Direto e objetivo',
    tone_amigavel: 'Amigável',
    tone_provocativo: 'Provocativo',
    rateLabel: 'Emails por hora',
    rateHelp: 'Recomendado 20-40/h pra boa deliverability.',
    create: 'Criar',
    cancel: 'Cancelar',
    creating: 'Criando...',
    errRequired: 'Preencha todos os campos obrigatórios.',
    errCreate: 'Erro ao criar',
  },
  en: {
    title: 'Email BDR',
    subtitle: 'Cold email campaigns with AI-generated content. Zero ban risk. Sent via Resend.',
    newCampaign: 'New campaign',
    noCampaigns: 'No campaigns yet',
    noCampaignsDesc: 'Create your first campaign, import contacts and fire.',
    status_draft: 'Draft',
    status_active: 'Active',
    status_paused: 'Paused',
    status_completed: 'Completed',
    status_cancelled: 'Cancelled',
    created: 'Created',
    newCampaignTitle: 'New email campaign',
    nameLabel: 'Internal name',
    namePlaceholder: 'Ex: SP Realtors — April',
    pitchLabel: 'Offer hook',
    pitchHelp: 'Short sentence describing what you solve. AI uses it as base.',
    pitchPlaceholder: 'Ex: AI agent that qualifies real estate leads 24/7 on WhatsApp',
    senderLabel: 'Sender name',
    senderPlaceholder: 'Ex: Jane from Acme',
    ctaLabel: 'Desired CTA',
    ctaPlaceholder: 'Ex: Reply with "yes" to see a 2-min demo',
    toneLabel: 'Tone',
    tone_direto: 'Direct and objective',
    tone_amigavel: 'Friendly',
    tone_provocativo: 'Provocative',
    rateLabel: 'Emails per hour',
    rateHelp: 'Recommend 20-40/h for good deliverability.',
    create: 'Create',
    cancel: 'Cancel',
    creating: 'Creating...',
    errRequired: 'Fill all required fields.',
    errCreate: 'Error creating',
  },
  es: {
    title: 'BDR por Email',
    subtitle: 'Campañas de email frío con contenido generado por IA. Sin riesgo de ban. Envío vía Resend.',
    newCampaign: 'Nueva campaña',
    noCampaigns: 'Ninguna campaña aún',
    noCampaignsDesc: 'Crea tu primera campaña, importa contactos y dispara.',
    status_draft: 'Borrador',
    status_active: 'Activa',
    status_paused: 'Pausada',
    status_completed: 'Completada',
    status_cancelled: 'Cancelada',
    created: 'Creada el',
    newCampaignTitle: 'Nueva campaña de email',
    nameLabel: 'Nombre interno',
    namePlaceholder: 'Ej: Corredores SP — Abril',
    pitchLabel: 'Gancho de la oferta',
    pitchHelp: 'Frase corta describiendo lo que resuelves. La IA usa eso de base.',
    pitchPlaceholder: 'Ej: Agente de IA que califica leads inmobiliarios 24/7 en WhatsApp',
    senderLabel: 'Nombre del remitente',
    senderPlaceholder: 'Ej: Juan de Acme',
    ctaLabel: 'CTA deseado',
    ctaPlaceholder: 'Ej: Responder "sí" para ver demo de 2 min',
    toneLabel: 'Tono',
    tone_direto: 'Directo y objetivo',
    tone_amigavel: 'Amigable',
    tone_provocativo: 'Provocativo',
    rateLabel: 'Emails por hora',
    rateHelp: 'Recomendado 20-40/h para buena deliverability.',
    create: 'Crear',
    cancel: 'Cancelar',
    creating: 'Creando...',
    errRequired: 'Completa todos los campos obligatorios.',
    errCreate: 'Error al crear',
  },
}

interface Campaign {
  id: string
  name: string
  status: string
  created_at: string
  config: any
}

export default function EmailBDRPage() {
  const { user } = useAuth()
  const router = useRouter()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = T[lang]

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    pitch_hook: '',
    sender_name: '',
    call_to_action: '',
    tone: 'direto',
    emails_per_hour: 30,
  })

  useEffect(() => {
    fetch('/api/email/campaigns').then(r => r.json()).then(d => {
      setCampaigns(d.campaigns || [])
      setLoading(false)
    })
  }, [])

  const handleCreate = async () => {
    if (!form.name || !form.pitch_hook || !form.sender_name || !form.call_to_action) {
      toast.error(t.errRequired)
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, config: form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t.errCreate)
      router.push(`/dashboard/agents/email-bdr/${data.campaign.id}`)
    } catch (err: any) {
      toast.error(`${t.errCreate}: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: t.status_draft, color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
      active: { label: t.status_active, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      paused: { label: t.status_paused, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
      completed: { label: t.status_completed, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
      cancelled: { label: t.status_cancelled, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    }
    const s = map[status] || map.draft
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: s.color, background: s.bg }}>
        {s.label}
      </span>
    )
  }

  return (
    <div className="min-h-[calc(100vh-100px)]" style={{ background: 'var(--color-bg-surface)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
              <Mail size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} />
            {t.newCampaign}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--color-bg-elevated)', border: '1px dashed var(--color-border)' }}>
            <Mail size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t.noCampaigns}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.noCampaignsDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/dashboard/agents/email-bdr/${c.id}`)}
                className="w-full text-left p-4 rounded-xl transition-colors hover:opacity-90"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{c.name}</p>
                      {statusBadge(c.status)}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t.created}: {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {c.status === 'active' ? <Play size={18} style={{ color: 'var(--color-success)' }} /> :
                   c.status === 'paused' ? <Pause size={18} style={{ color: 'var(--color-accent)' }} /> :
                   c.status === 'completed' ? <CheckCircle2 size={18} style={{ color: '#3b82f6' }} /> :
                   <Clock size={18} style={{ color: 'var(--color-text-muted)' }} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setShowCreate(false)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.newCampaignTitle}</h2>

              <Field label={t.nameLabel}>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t.namePlaceholder} className="inp" />
              </Field>
              <Field label={t.pitchLabel} help={t.pitchHelp}>
                <textarea rows={2} value={form.pitch_hook} onChange={e => setForm({ ...form, pitch_hook: e.target.value })} placeholder={t.pitchPlaceholder} className="inp" />
              </Field>
              <Field label={t.senderLabel}>
                <input type="text" value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })} placeholder={t.senderPlaceholder} className="inp" />
              </Field>
              <Field label={t.ctaLabel}>
                <input type="text" value={form.call_to_action} onChange={e => setForm({ ...form, call_to_action: e.target.value })} placeholder={t.ctaPlaceholder} className="inp" />
              </Field>
              <Field label={t.toneLabel}>
                <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })} className="inp">
                  <option value="direto">{t.tone_direto}</option>
                  <option value="amigavel">{t.tone_amigavel}</option>
                  <option value="provocativo">{t.tone_provocativo}</option>
                </select>
              </Field>
              <Field label={t.rateLabel} help={t.rateHelp}>
                <input type="number" min={5} max={100} value={form.emails_per_hour} onChange={e => setForm({ ...form, emails_per_hour: Number(e.target.value) })} className="inp" />
              </Field>

              <div className="flex items-center gap-2 pt-3">
                <button onClick={() => setShowCreate(false)} disabled={creating} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                  {t.cancel}
                </button>
                <button onClick={handleCreate} disabled={creating} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                  {creating ? <><Loader2 size={14} className="animate-spin" />{t.creating}</> : t.create}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inp {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
      `}</style>
    </div>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
      {help && <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{help}</p>}
    </div>
  )
}
