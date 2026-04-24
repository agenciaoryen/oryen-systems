// Tela "Meu Dia" — fila de tasks do BDR.
// Mostra 4 colunas contextuais: Agora, Hoje, Respondidos, Amanhã.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import {
  Rocket,
  Clock,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  RefreshCw,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { Settings2, ExternalLink } from 'lucide-react'
import {
  CHANNEL_LABELS,
  CALL_OUTCOME_LABELS,
  type ProspectionCallOutcome,
  type MessageTemplate,
} from '@/lib/prospection/types'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Meu Dia · Prospecção',
    subtitle: 'Sua fila de ações ordenada por prioridade',
    refresh: 'Atualizar',
    loading: 'Carregando suas tasks...',
    emptyAll: 'Tudo em dia. Respire fundo.',
    overdue: 'Agora',
    overdueDesc: 'Vencidas · resolver primeiro',
    todayNow: 'Próxima hora',
    todayNowDesc: 'Devem ser feitas agora',
    todayLater: 'Hoje',
    todayLaterDesc: 'Resto do dia',
    tomorrow: 'Amanhã',
    tomorrowDesc: 'Preview',
    responded: 'Responderam',
    respondedDesc: 'Leads aguardando qualificação',
    doneToday: 'Feitas hoje',
    capacity: 'Capacidade',
    noTasks: 'Nada por aqui',
    copy: 'Copiar',
    copied: 'Copiado',
    markDone: 'Marcar feita',
    callOutcome: 'Resultado da ligação',
    openLead: 'Ver lead',
    addNote: 'Nota (opcional)',
    selectVariation: 'Selecione a variação',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    instruction: 'Instrução',
    stepOf: 'Etapa',
    goToQualify: 'Qualificar agora',
  },
  es: {
    title: 'Mi Día · Prospección',
    subtitle: 'Su cola de acciones ordenada por prioridad',
    refresh: 'Actualizar',
    loading: 'Cargando sus tareas...',
    emptyAll: 'Todo al día. Respire profundo.',
    overdue: 'Ahora',
    overdueDesc: 'Vencidas · resolver primero',
    todayNow: 'Próxima hora',
    todayNowDesc: 'Deben hacerse ahora',
    todayLater: 'Hoy',
    todayLaterDesc: 'Resto del día',
    tomorrow: 'Mañana',
    tomorrowDesc: 'Vista previa',
    responded: 'Respondieron',
    respondedDesc: 'Leads esperando calificación',
    doneToday: 'Hechas hoy',
    capacity: 'Capacidad',
    noTasks: 'Nada por aquí',
    copy: 'Copiar',
    copied: 'Copiado',
    markDone: 'Marcar hecha',
    callOutcome: 'Resultado de la llamada',
    openLead: 'Ver lead',
    addNote: 'Nota (opcional)',
    selectVariation: 'Seleccione la variación',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    instruction: 'Instrucción',
    stepOf: 'Etapa',
    goToQualify: 'Calificar ahora',
  },
  en: {
    title: 'My Day · Prospecting',
    subtitle: 'Your action queue sorted by priority',
    refresh: 'Refresh',
    loading: 'Loading your tasks...',
    emptyAll: 'All caught up. Take a breath.',
    overdue: 'Now',
    overdueDesc: 'Overdue · resolve first',
    todayNow: 'Next hour',
    todayNowDesc: 'Need to happen now',
    todayLater: 'Today',
    todayLaterDesc: 'Rest of day',
    tomorrow: 'Tomorrow',
    tomorrowDesc: 'Preview',
    responded: 'Replied',
    respondedDesc: 'Leads waiting for qualification',
    doneToday: 'Done today',
    capacity: 'Capacity',
    noTasks: 'Nothing here',
    copy: 'Copy',
    copied: 'Copied',
    markDone: 'Mark done',
    callOutcome: 'Call outcome',
    openLead: 'Open lead',
    addNote: 'Note (optional)',
    selectVariation: 'Select variation',
    confirm: 'Confirm',
    cancel: 'Cancel',
    instruction: 'Instruction',
    stepOf: 'Step',
    goToQualify: 'Qualify now',
  },
}

type Lang = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MyDayResponse {
  buckets: {
    overdue: any[]
    now: any[]
    today: any[]
    tomorrow: any[]
  }
  responded: any[]
  counts: {
    overdue: number
    now: number
    today: number
    tomorrow: number
    responded: number
    done_today: number
  }
  daily_capacity: number
  stages: { value: string; label: string; color?: string }[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MyDayPage() {
  const { user } = useAuth()
  const lang = ((user?.language as Lang) || 'pt') as Lang
  const t = TRANSLATIONS[lang]

  const [data, setData] = useState<MyDayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [completingTask, setCompletingTask] = useState<any | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/prospection/my-day')
      if (!res.ok) throw new Error('Erro ao buscar tasks')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleComplete(
    taskId: string,
    payload: { outcome?: string; notes?: string; variant_used?: string; move_to_stage?: string | null }
  ) {
    const res = await fetch(`/api/prospection/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setCompletingTask(null)
      fetchData(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const hasNothing =
    data &&
    data.counts.overdue === 0 &&
    data.counts.now === 0 &&
    data.counts.today === 0 &&
    data.counts.tomorrow === 0 &&
    data.counts.responded === 0

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.title}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <StatPill
            label={t.doneToday}
            value={`${data?.counts.done_today ?? 0}`}
            tone="success"
          />
          <StatPill
            label={t.capacity}
            value={`${data?.counts.done_today ?? 0}/${data?.daily_capacity ?? 50}`}
            tone={
              (data?.counts.done_today ?? 0) >= (data?.daily_capacity ?? 50)
                ? 'warning'
                : 'neutral'
            }
          />
          <Link
            href="/dashboard/prospection/sequences"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-accent transition text-sm"
          >
            <Settings2 className="w-4 h-4" />
            Sequences
          </Link>
          <button
            onClick={() => fetchData(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-accent transition text-sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t.refresh}
          </button>
        </div>
      </div>

      {hasNothing ? (
        <EmptyState message={t.emptyAll} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Coluna 1: Overdue + Now + Today */}
          <div className="space-y-6">
            <Bucket
              title={t.overdue}
              description={t.overdueDesc}
              icon={<AlertTriangle className="w-4 h-4" />}
              tone="danger"
              tasks={data!.buckets.overdue}
              onComplete={setCompletingTask}
              t={t}
            />
            <Bucket
              title={t.todayNow}
              description={t.todayNowDesc}
              icon={<Clock className="w-4 h-4" />}
              tone="primary"
              tasks={data!.buckets.now}
              onComplete={setCompletingTask}
              t={t}
            />
            <Bucket
              title={t.todayLater}
              description={t.todayLaterDesc}
              icon={<Clock className="w-4 h-4" />}
              tone="neutral"
              tasks={data!.buckets.today}
              onComplete={setCompletingTask}
              t={t}
            />
          </div>

          {/* Coluna 2: Respondidos + Amanhã */}
          <div className="space-y-6">
            <RespondedBucket
              title={t.responded}
              description={t.respondedDesc}
              items={data!.responded}
              t={t}
            />
            <Bucket
              title={t.tomorrow}
              description={t.tomorrowDesc}
              icon={<Clock className="w-4 h-4" />}
              tone="muted"
              tasks={data!.buckets.tomorrow}
              onComplete={setCompletingTask}
              compact
              t={t}
            />
          </div>
        </div>
      )}

      {/* Modal de conclusão */}
      {completingTask && (
        <CompleteModal
          task={completingTask}
          stages={data?.stages ?? []}
          onClose={() => setCompletingTask(null)}
          onConfirm={(payload) => handleComplete(completingTask.id, payload)}
          t={t}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'warning'
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'bg-card border-border text-foreground',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
  }
  return (
    <div className={`px-3 py-2 rounded-lg border text-xs ${toneClasses[tone]}`}>
      <div className="opacity-70 uppercase tracking-wider text-[10px] font-semibold">
        {label}
      </div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  )
}

function Bucket({
  title,
  description,
  icon,
  tone,
  tasks,
  onComplete,
  compact,
  t,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone: 'danger' | 'primary' | 'neutral' | 'muted'
  tasks: any[]
  onComplete: (task: any) => void
  compact?: boolean
  t: (typeof TRANSLATIONS)['pt']
}) {
  const borders: Record<string, string> = {
    danger: 'border-l-red-500',
    primary: 'border-l-primary',
    neutral: 'border-l-indigo-400',
    muted: 'border-l-muted-foreground/30',
  }
  const titleColors: Record<string, string> = {
    danger: 'text-red-600 dark:text-red-400',
    primary: 'text-primary',
    neutral: 'text-foreground',
    muted: 'text-muted-foreground',
  }

  return (
    <div className={`rounded-xl border border-border border-l-4 ${borders[tone]} bg-card p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`flex items-center gap-2 font-bold text-base ${titleColors[tone]}`}>
            {icon}
            <span>{title}</span>
            <span className="bg-background text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full border border-border">
              {tasks.length}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-xs text-muted-foreground/60 italic py-4 text-center">
          {t.noTasks}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => onComplete(task)}
              compact={compact}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RespondedBucket({
  title,
  description,
  items,
  t,
}: {
  title: string
  description: string
  items: any[]
  t: (typeof TRANSLATIONS)['pt']
}) {
  return (
    <div className="rounded-xl border border-border border-l-4 border-l-emerald-500 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-base text-emerald-600 dark:text-emerald-400">
            <Inbox className="w-4 h-4" />
            <span>{title}</span>
            <span className="bg-background text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full border border-border">
              {items.length}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground/60 italic py-4 text-center">
          {t.noTasks}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const lead = Array.isArray(item.lead) ? item.lead[0] : item.lead
            return (
              <Link
                key={item.id}
                href={`/dashboard/crm/${item.lead_id}`}
                className="block p-3 rounded-lg border border-border hover:border-emerald-500/60 bg-background transition group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{lead?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {lead?.phone ?? lead?.email ?? ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition">
                    {t.goToQualify}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TaskCard({
  task,
  onComplete,
  compact,
  t,
}: {
  task: any
  onComplete: () => void
  compact?: boolean
  t: (typeof TRANSLATIONS)['pt']
}) {
  const step = Array.isArray(task.step) ? task.step[0] : task.step
  const enrollment = Array.isArray(task.enrollment) ? task.enrollment[0] : task.enrollment
  const sequence = enrollment?.sequence
    ? Array.isArray(enrollment.sequence)
      ? enrollment.sequence[0]
      : enrollment.sequence
    : null
  const lead = Array.isArray(task.lead) ? task.lead[0] : task.lead

  const channel = step?.channel ?? 'whatsapp'
  const channelIcon =
    channel === 'email' ? <Mail className="w-3.5 h-3.5" /> :
    channel === 'call' ? <Phone className="w-3.5 h-3.5" /> :
    <MessageSquare className="w-3.5 h-3.5" />

  const due = new Date(task.due_at)
  const dueLabel = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-3 rounded-lg border border-border bg-background hover:border-primary/50 transition group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {channelIcon}
              {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t.stepOf} {step?.position ?? '-'} · {step?.title ?? ''}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {dueLabel}
            </span>
          </div>
          <div className="font-semibold text-sm truncate">{lead?.name ?? '—'}</div>
          <div className="text-xs text-muted-foreground truncate">
            {lead?.phone ?? lead?.email ?? ''} {lead?.city ? `· ${lead.city}` : ''}
          </div>
          {!compact && step?.instruction && (
            <div className="mt-2 text-xs bg-muted/40 border border-border rounded px-2 py-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground">{t.instruction}:</span> {step.instruction}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex items-center gap-2 mt-2">
          <Link
            href={`/dashboard/crm/${task.lead_id}`}
            className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md bg-muted/40 hover:bg-muted border border-border transition"
          >
            {t.openLead}
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            onClick={onComplete}
            className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.markDone}
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL DE CONCLUSÃO
// ═══════════════════════════════════════════════════════════════════════════════

function CompleteModal({
  task,
  stages,
  onClose,
  onConfirm,
  t,
}: {
  task: any
  stages: { value: string; label: string; color?: string }[]
  onClose: () => void
  onConfirm: (payload: { outcome?: string; notes?: string; variant_used?: string; move_to_stage?: string | null }) => void
  t: (typeof TRANSLATIONS)['pt']
}) {
  const step = Array.isArray(task.step) ? task.step[0] : task.step
  const lead = Array.isArray(task.lead) ? task.lead[0] : task.lead
  const isCall = step?.channel === 'call'
  const isWhatsApp = step?.channel === 'whatsapp'
  const templates: MessageTemplate[] = step?.message_templates ?? []

  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    templates[0]?.variant ?? null
  )
  const [outcome, setOutcome] = useState<ProspectionCallOutcome | null>(null)
  const [notes, setNotes] = useState('')
  const [newStage, setNewStage] = useState<string>(lead?.stage ?? '')
  const [copied, setCopied] = useState(false)

  const currentTemplate = templates.find((t) => t.variant === selectedVariant)

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  function handleConfirm() {
    if (isCall && !outcome) return
    const stageChanged = newStage && newStage !== lead?.stage
    onConfirm({
      outcome: outcome ?? undefined,
      notes: notes || undefined,
      variant_used: selectedVariant ?? undefined,
      move_to_stage: stageChanged ? newStage : undefined,
    })
  }

  function openWhatsAppExternal() {
    if (!lead?.phone) return
    const num = String(lead.phone).replace(/\D/g, '')
    window.open(`https://wa.me/${num}`, '_blank')
  }

  function openInternalChat() {
    if (!lead?.id) return
    window.open(`/dashboard/messages?lead_id=${lead.id}`, '_blank')
  }

  const outcomeKeys = Object.keys(CALL_OUTCOME_LABELS) as ProspectionCallOutcome[]

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
              {CHANNEL_LABELS[step?.channel as keyof typeof CHANNEL_LABELS]} · {t.stepOf} {step?.position}
            </div>
            <h3 className="text-lg font-bold">{lead?.name}</h3>
            <div className="text-xs text-muted-foreground">
              {lead?.phone ?? lead?.email}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {step?.instruction && (
            <div className="text-xs bg-muted/40 border border-border rounded-lg px-3 py-2 text-muted-foreground">
              <span className="font-semibold text-foreground">{t.instruction}:</span> {step.instruction}
            </div>
          )}

          {/* Ações rápidas: abrir mensagem ou WhatsApp (só pra steps de WhatsApp) */}
          {isWhatsApp && (
            <div className="flex gap-2">
              <button
                onClick={openInternalChat}
                disabled={!lead?.id}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <MessageSquare className="w-4 h-4" />
                Abrir Mensagens
              </button>
              <button
                onClick={openWhatsAppExternal}
                disabled={!lead?.phone}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ExternalLink className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          )}

          {/* Variações */}
          {templates.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t.selectVariation}
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.variant}
                    onClick={() => setSelectedVariant(tpl.variant)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition ${
                      selectedVariant === tpl.variant
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    {tpl.variant}
                    {tpl.label && <span className="ml-1 opacity-70">· {tpl.label}</span>}
                  </button>
                ))}
              </div>

              {currentTemplate && (
                <div className="relative bg-background border border-border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                  {currentTemplate.subject && (
                    <div className="text-xs text-muted-foreground mb-2">
                      <span className="font-semibold">Subject:</span> {currentTemplate.subject}
                    </div>
                  )}
                  {currentTemplate.body}
                  <button
                    onClick={() =>
                      copyToClipboard(
                        currentTemplate.subject
                          ? `${currentTemplate.subject}\n\n${currentTemplate.body}`
                          : currentTemplate.body
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-card border border-border hover:border-primary transition"
                    title={t.copy}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Call outcome */}
          {isCall && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t.callOutcome}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {outcomeKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setOutcome(key)}
                    className={`px-3 py-2 text-xs rounded-md border transition text-left ${
                      outcome === key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    {CALL_OUTCOME_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mudar estágio do lead (opcional) */}
          {stages.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Mudar estágio do lead
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition"
                >
                  <option value="">— Manter estágio atual —</option>
                  {stages.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {newStage && newStage !== lead?.stage && (
                  <button
                    onClick={() => setNewStage(lead?.stage ?? '')}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition text-muted-foreground"
                    title="Cancelar mudança"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {lead?.stage && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Estágio atual: <span className="font-semibold">{lead.stage}</span>
                  {newStage && newStage !== lead.stage && (
                    <span> · mudará para <span className="font-semibold text-primary">{newStage}</span></span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              {t.addNote}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition"
              rows={2}
              placeholder="..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCall && !outcome}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <div className="text-lg font-semibold mb-1">{message}</div>
    </div>
  )
}
