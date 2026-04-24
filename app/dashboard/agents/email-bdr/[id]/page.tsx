// app/dashboard/agents/email-bdr/[id]/page.tsx
// Detalhe da campanha: upload CSV, preview do email IA, iniciar/pausar, stats.
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import {
  ArrowLeft, Upload, Play, Pause, Eye, Loader2, Mail,
  CheckCircle2, AlertCircle, Clock, XCircle, MousePointerClick,
  Database, Users
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useActiveOrgId } from '@/lib/AuthContext'

type Lang = 'pt' | 'en' | 'es'

const T = {
  pt: {
    back: 'Voltar',
    loading: 'Carregando...',
    tabOverview: 'Visão geral',
    tabContacts: 'Contatos',
    tabPreview: 'Preview do email',
    uploadCsv: 'Importar CSV',
    csvHint: 'O CSV deve ter pelo menos uma coluna "email". Colunas reconhecidas: email, first_name (ou nome), company (ou empresa), role (ou cargo), city (ou cidade), phone (ou telefone). Outras colunas viram custom_fields.',
    importing: 'Importando...',
    start: 'Iniciar campanha',
    pause: 'Pausar',
    statPending: 'Pendentes',
    statSent: 'Enviados',
    statOpened: 'Abertos',
    statClicked: 'Clicados',
    statReplied: 'Respondidos',
    statBounced: 'Voltaram',
    statFailed: 'Falharam',
    openRate: 'Taxa de abertura',
    replyRate: 'Taxa de resposta',
    previewTitle: 'Preview — email gerado pela IA',
    generating: 'Gerando...',
    regenerate: 'Regenerar preview',
    pitchPreview: 'Oferta',
    ctaPreview: 'CTA',
    subjectLabel: 'Assunto',
    bodyLabel: 'Corpo',
    contactList: 'Lista de contatos',
    contactsImported: 'contatos importados',
    noContacts: 'Nenhum contato importado ainda. Importe um CSV acima.',
    csvFormat: 'Formato do CSV',
    csvExample: 'Exemplo',
    startConfirm: 'Começar a disparar emails agora?',
    startConfirmDesc: 'A campanha vai enviar respeitando o rate limit configurado. Você pode pausar a qualquer momento.',
    confirm: 'Sim, iniciar',
    cancel: 'Cancelar',
    statusActive: 'Campanha ativa',
    statusPaused: 'Pausada',
    statusDraft: 'Em rascunho',
    statusCompleted: 'Concluída',
    tryAgain: 'Tentar de novo',
    errNoContacts: 'Importe pelo menos um contato antes de iniciar.',
    toastImported: 'contatos importados',
    toastStarted: 'Campanha iniciada! O primeiro disparo sai no próximo ciclo (até 5 min).',
    toastPaused: 'Campanha pausada.',
    importCrm: 'Importar do CRM',
    importCrmHint: 'Pega leads do seu CRM aplicando filtros. Muito mais útil que upload de CSV quando os leads já estão no sistema.',
    filterStages: 'Etapas',
    filterAllStages: 'Todas as etapas',
    filterScore: 'Score',
    filterUpdatedBefore: 'Sem atividade há (dias)',
    filterUpdatedHint: 'Só inclui leads cujo updated_at é mais antigo que X dias. Use 0 pra não filtrar.',
    filterExclude: 'Só os que ainda não receberam email de outra campanha',
    previewBtn: 'Ver quantos se aplicam',
    importBtn: 'Importar agora',
    previewing: 'Calculando...',
    previewResult: '{{n}} leads seriam importados',
    previewReasons: 'Dos {{total}} leads encontrados:',
    rc_already_other: 'já estão em outra campanha de email',
    rc_already_this: 'já estão nesta campanha',
    rc_invalid_email: 'email inválido ou ausente',
  },
  en: {
    back: 'Back',
    loading: 'Loading...',
    tabOverview: 'Overview',
    tabContacts: 'Contacts',
    tabPreview: 'Email preview',
    uploadCsv: 'Import CSV',
    csvHint: 'CSV must have at least an "email" column. Recognized: email, first_name, company, role, city, phone. Other columns go to custom_fields.',
    importing: 'Importing...',
    start: 'Start campaign',
    pause: 'Pause',
    statPending: 'Pending',
    statSent: 'Sent',
    statOpened: 'Opened',
    statClicked: 'Clicked',
    statReplied: 'Replied',
    statBounced: 'Bounced',
    statFailed: 'Failed',
    openRate: 'Open rate',
    replyRate: 'Reply rate',
    previewTitle: 'Preview — AI-generated email',
    generating: 'Generating...',
    regenerate: 'Regenerate preview',
    pitchPreview: 'Offer',
    ctaPreview: 'CTA',
    subjectLabel: 'Subject',
    bodyLabel: 'Body',
    contactList: 'Contact list',
    contactsImported: 'contacts imported',
    noContacts: 'No contacts yet. Import a CSV above.',
    csvFormat: 'CSV format',
    csvExample: 'Example',
    startConfirm: 'Start sending now?',
    startConfirmDesc: 'Campaign will send respecting your configured rate limit. You can pause anytime.',
    confirm: 'Yes, start',
    cancel: 'Cancel',
    statusActive: 'Active',
    statusPaused: 'Paused',
    statusDraft: 'Draft',
    statusCompleted: 'Completed',
    tryAgain: 'Try again',
    errNoContacts: 'Import at least one contact before starting.',
    toastImported: 'contacts imported',
    toastStarted: 'Campaign started! First batch goes in the next cycle (up to 5 min).',
    toastPaused: 'Campaign paused.',
    importCrm: 'Import from CRM',
    importCrmHint: 'Pulls leads from your CRM using filters. Much more useful than CSV upload when the leads are already in the system.',
    filterStages: 'Stages',
    filterAllStages: 'All stages',
    filterScore: 'Score',
    filterUpdatedBefore: 'No activity for (days)',
    filterUpdatedHint: 'Only leads whose updated_at is older than X days. 0 = no filter.',
    filterExclude: 'Only leads not yet in another email campaign',
    previewBtn: 'See how many match',
    importBtn: 'Import now',
    previewing: 'Calculating...',
    previewResult: '{{n}} leads would be imported',
    previewReasons: 'Out of {{total}} matching leads:',
    rc_already_other: 'already in another email campaign',
    rc_already_this: 'already in this campaign',
    rc_invalid_email: 'invalid or missing email',
  },
  es: {
    back: 'Volver',
    loading: 'Cargando...',
    tabOverview: 'Resumen',
    tabContacts: 'Contactos',
    tabPreview: 'Preview del email',
    uploadCsv: 'Importar CSV',
    csvHint: 'El CSV debe tener al menos una columna "email". Reconocidas: email, first_name, company, role, city, phone. Otras van a custom_fields.',
    importing: 'Importando...',
    start: 'Iniciar campaña',
    pause: 'Pausar',
    statPending: 'Pendientes',
    statSent: 'Enviados',
    statOpened: 'Abiertos',
    statClicked: 'Clicados',
    statReplied: 'Respondidos',
    statBounced: 'Rebotados',
    statFailed: 'Fallaron',
    openRate: 'Tasa de apertura',
    replyRate: 'Tasa de respuesta',
    previewTitle: 'Preview — email generado por IA',
    generating: 'Generando...',
    regenerate: 'Regenerar preview',
    pitchPreview: 'Oferta',
    ctaPreview: 'CTA',
    subjectLabel: 'Asunto',
    bodyLabel: 'Cuerpo',
    contactList: 'Lista de contactos',
    contactsImported: 'contactos importados',
    noContacts: 'Ningún contacto aún. Importa un CSV arriba.',
    csvFormat: 'Formato del CSV',
    csvExample: 'Ejemplo',
    startConfirm: '¿Comenzar a enviar ahora?',
    startConfirmDesc: 'La campaña respetará el rate limit configurado. Puedes pausar cuando quieras.',
    confirm: 'Sí, iniciar',
    cancel: 'Cancelar',
    statusActive: 'Activa',
    statusPaused: 'Pausada',
    statusDraft: 'Borrador',
    statusCompleted: 'Completada',
    tryAgain: 'Intentar de nuevo',
    errNoContacts: 'Importa al menos un contacto antes de iniciar.',
    toastImported: 'contactos importados',
    toastStarted: '¡Campaña iniciada! El primer envío sale en el próximo ciclo (hasta 5 min).',
    toastPaused: 'Campaña pausada.',
    importCrm: 'Importar del CRM',
    importCrmHint: 'Trae leads del CRM aplicando filtros. Mucho más útil que cargar CSV cuando los leads ya están en el sistema.',
    filterStages: 'Etapas',
    filterAllStages: 'Todas las etapas',
    filterScore: 'Score',
    filterUpdatedBefore: 'Sin actividad hace (días)',
    filterUpdatedHint: 'Solo leads con updated_at más antiguo que X días. 0 = sin filtro.',
    filterExclude: 'Solo los que aún no recibieron email de otra campaña',
    previewBtn: 'Ver cuántos aplican',
    importBtn: 'Importar ahora',
    previewing: 'Calculando...',
    previewResult: '{{n}} leads serían importados',
    previewReasons: 'De los {{total}} leads encontrados:',
    rc_already_other: 'ya están en otra campaña',
    rc_already_this: 'ya están en esta campaña',
    rc_invalid_email: 'email inválido o ausente',
  },
}

// Parser CSV super simples — suporta vírgula, aspas e cabeçalho
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) { cells.push(cur); cur = '' }
      else cur += ch
    }
    cells.push(cur)
    return cells.map(c => c.trim())
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())
  const rows = lines.slice(1).map(line => {
    const cells = parseLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
  return { headers, rows }
}

// Mapeia cabeçalhos do CSV pros campos reconhecidos
function mapContact(row: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k] || row[k.toLowerCase()]
      if (v) return v.trim()
    }
    return ''
  }
  const known = new Set(['email', 'first_name', 'nome', 'name', 'company', 'empresa', 'role', 'cargo', 'city', 'cidade', 'phone', 'telefone'])
  const custom: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    if (!known.has(k.toLowerCase()) && v) custom[k] = v
  }
  return {
    email: get('email'),
    first_name: get('first_name', 'nome', 'name') || null,
    company: get('company', 'empresa') || null,
    role: get('role', 'cargo') || null,
    city: get('city', 'cidade') || null,
    phone: get('phone', 'telefone') || null,
    custom_fields: custom,
  }
}

interface Campaign {
  id: string
  name: string
  status: string
  config: any
  created_at: string
}

interface Stats {
  contacts_total: number
  contacts_pending: number
  contacts_sent: number
  contacts_skipped: number
  sends: Record<string, number>
  open_rate_pct: number
  reply_rate_pct: number
}

export default function EmailCampaignDetailPage() {
  const { user } = useAuth()
  const orgId = useActiveOrgId()
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id)
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = T[lang]

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [startingBusy, setStartingBusy] = useState(false)
  const [showStartConfirm, setShowStartConfirm] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; body_text: string } | null>(null)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const res = await fetch(`/api/email/campaigns/${id}`)
    const data = await res.json()
    if (data.campaign) {
      setCampaign(data.campaign)
      setStats(data.stats)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleFile = async (file: File) => {
    setImporting(true)
    try {
      const text = await file.text()
      const { rows } = parseCsv(text)
      const contacts = rows.map(mapContact).filter(c => c.email)
      if (contacts.length === 0) {
        toast.error('Nenhum email válido encontrado no CSV')
        return
      }
      const res = await fetch(`/api/email/campaigns/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.imported} ${t.toastImported}`)
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const generatePreview = async () => {
    setGeneratingPreview(true)
    try {
      const res = await fetch(`/api/email/campaigns/${id}/preview`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data.preview)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGeneratingPreview(false)
    }
  }

  const handleStart = async () => {
    setStartingBusy(true)
    try {
      const res = await fetch(`/api/email/campaigns/${id}/start`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t.toastStarted)
      setShowStartConfirm(false)
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setStartingBusy(false)
    }
  }

  const handlePause = async () => {
    setStartingBusy(true)
    try {
      const res = await fetch(`/api/email/campaigns/${id}/pause`, { method: 'POST' })
      if (!res.ok) throw new Error('pause failed')
      toast.success(t.toastPaused)
      await load()
    } finally {
      setStartingBusy(false)
    }
  }

  if (loading || !campaign || !stats) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
  }

  const isActive = campaign.status === 'active'
  const isPausable = isActive
  const isStartable = ['draft', 'paused'].includes(campaign.status) && stats.contacts_pending > 0

  return (
    <div className="min-h-[calc(100vh-100px)]" style={{ background: 'var(--color-bg-surface)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <button onClick={() => router.push('/dashboard/agents/email-bdr')} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={14} /> {t.back}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{campaign.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {isActive ? t.statusActive :
               campaign.status === 'paused' ? t.statusPaused :
               campaign.status === 'completed' ? t.statusCompleted : t.statusDraft}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPausable && (
              <button onClick={handlePause} disabled={startingBusy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <Pause size={14} />{t.pause}
              </button>
            )}
            {isStartable && (
              <button onClick={() => setShowStartConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                <Play size={14} />{t.start}
              </button>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label={t.statPending} value={stats.contacts_pending} icon={<Clock size={14} />} />
          <KpiCard label={t.statSent} value={stats.contacts_sent} icon={<Mail size={14} />} color="#3b82f6" />
          <KpiCard label={t.openRate} value={`${stats.open_rate_pct}%`} icon={<Eye size={14} />} color="#8b5cf6" />
          <KpiCard label={t.replyRate} value={`${stats.reply_rate_pct}%`} icon={<CheckCircle2 size={14} />} color="#10b981" />
        </div>

        {/* Event stats */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label={t.statSent} value={stats.sends.sent + stats.sends.delivered + stats.sends.opened + stats.sends.clicked + stats.sends.replied} icon={<Mail size={12} />} />
            <MiniStat label={t.statOpened} value={stats.sends.opened + stats.sends.clicked + stats.sends.replied} icon={<Eye size={12} />} />
            <MiniStat label={t.statClicked} value={stats.sends.clicked + stats.sends.replied} icon={<MousePointerClick size={12} />} />
            <MiniStat label={t.statReplied} value={stats.sends.replied} icon={<CheckCircle2 size={12} />} color="#10b981" />
            <MiniStat label={t.statBounced} value={stats.sends.bounced} icon={<XCircle size={12} />} color="#ef4444" />
            <MiniStat label={t.statFailed} value={stats.sends.failed} icon={<AlertCircle size={12} />} color="#ef4444" />
          </div>
        </div>

        {/* Importar do CRM */}
        <ImportFromCrmSection
          campaignId={id}
          orgId={orgId}
          onImported={load}
          t={t}
        />

        {/* CSV Upload */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t.uploadCsv}</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>{t.csvHint}</p>
          <input type="file" accept=".csv,text/csv" ref={fileRef} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importing ? t.importing : t.uploadCsv}
          </button>
          {stats.contacts_total > 0 && (
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              ✓ {stats.contacts_total} {t.contactsImported}
            </p>
          )}
        </div>

        {/* Preview IA */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.previewTitle}</h3>
            <button onClick={generatePreview} disabled={generatingPreview} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
              {generatingPreview ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              {generatingPreview ? t.generating : (preview ? t.regenerate : t.tabPreview)}
            </button>
          </div>
          {preview ? (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{t.subjectLabel}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{preview.subject}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{t.bodyLabel}</p>
                <p className="text-sm whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{preview.body_text}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {campaign.config?.pitch_hook && <span>Oferta: <strong>{campaign.config.pitch_hook}</strong></span>}
            </p>
          )}
        </div>
      </div>

      {/* Confirm start */}
      {showStartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setShowStartConfirm(false)}>
          <div className="rounded-2xl w-full max-w-sm p-5 space-y-4" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t.startConfirm}</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.startConfirmDesc}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowStartConfirm(false)} disabled={startingBusy} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                {t.cancel}
              </button>
              <button onClick={handleStart} disabled={startingBusy} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {startingBusy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seção: Importar leads do CRM com filtros
// ═══════════════════════════════════════════════════════════════════════════════

interface Stage { name: string; label: string }

function ImportFromCrmSection({
  campaignId, orgId, onImported, t,
}: { campaignId: string; orgId: string | null; onImported: () => void; t: any }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [updatedBeforeDays, setUpdatedBeforeDays] = useState<number>(0)
  const [excludeAlreadyEmailed, setExcludeAlreadyEmailed] = useState<boolean>(true)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewResult, setPreviewResult] = useState<any | null>(null)

  // Carrega stages da org
  useEffect(() => {
    if (!orgId) return
    supabase
      .from('pipeline_stages')
      .select('name, label')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => {
        setStages((data || []).map((s: any) => ({ name: s.name, label: s.label || s.name })))
      })
  }, [orgId])

  const toggleStage = (name: string) => {
    setSelectedStages(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
    setPreviewResult(null)
  }

  const buildFilters = (preview: boolean) => ({
    stages: selectedStages.length > 0 ? selectedStages : undefined,
    updated_before_days: updatedBeforeDays > 0 ? updatedBeforeDays : undefined,
    exclude_already_emailed: excludeAlreadyEmailed,
    preview,
  })

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await fetch(`/api/email/campaigns/${campaignId}/import-crm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFilters(true)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreviewResult(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await fetch(`/api/email/campaigns/${campaignId}/import-crm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFilters(false)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.imported} ${t.toastImported}`)
      setPreviewResult(null)
      onImported()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg shrink-0" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
          <Database size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.importCrm}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t.importCrmHint}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stages multi-select */}
        {stages.length > 0 && (
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>{t.filterStages}</label>
            <div className="flex flex-wrap gap-1.5">
              {stages.map(s => {
                const active = selectedStages.includes(s.name)
                return (
                  <button
                    key={s.name}
                    onClick={() => toggleStage(s.name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={active
                      ? { background: 'var(--color-primary)', color: '#fff' }
                      : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }
                    }
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
            {selectedStages.length === 0 && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{t.filterAllStages}</p>
            )}
          </div>
        )}

        {/* Dias sem atividade */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {t.filterUpdatedBefore}: <strong>{updatedBeforeDays > 0 ? updatedBeforeDays : '—'}</strong>
          </label>
          <input
            type="range"
            min={0}
            max={60}
            value={updatedBeforeDays}
            onChange={e => { setUpdatedBeforeDays(Number(e.target.value)); setPreviewResult(null) }}
            className="w-full"
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.filterUpdatedHint}</p>
        </div>

        {/* Excluir já contatados */}
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
          <input
            type="checkbox"
            checked={excludeAlreadyEmailed}
            onChange={e => { setExcludeAlreadyEmailed(e.target.checked); setPreviewResult(null) }}
          />
          {t.filterExclude}
        </label>

        {/* Ações */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handlePreview}
            disabled={previewing || importing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            {previewing ? t.previewing : t.previewBtn}
          </button>
          {previewResult && previewResult.would_import > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
              {t.importBtn}
            </button>
          )}
        </div>

        {/* Resultado preview */}
        {previewResult && (
          <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <p className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {t.previewResult.replace('{{n}}', String(previewResult.would_import))}
            </p>
            {previewResult.matched > 0 && previewResult.would_skip > 0 && (
              <div className="text-xs space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <p>{t.previewReasons.replace('{{total}}', String(previewResult.matched))}</p>
                {previewResult.reason_counts?.already_in_other_campaign > 0 && (
                  <p>• <strong>{previewResult.reason_counts.already_in_other_campaign}</strong> {t.rc_already_other}</p>
                )}
                {previewResult.reason_counts?.already_in_this_campaign > 0 && (
                  <p>• <strong>{previewResult.reason_counts.already_in_this_campaign}</strong> {t.rc_already_this}</p>
                )}
                {previewResult.reason_counts?.invalid_email > 0 && (
                  <p>• <strong>{previewResult.reason_counts.invalid_email}</strong> {t.rc_invalid_email}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: color || 'var(--color-text-muted)' }}>
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
    </div>
  )
}

function MiniStat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ color: color || 'var(--color-text-muted)' }}>{icon}</div>
      <div>
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}
