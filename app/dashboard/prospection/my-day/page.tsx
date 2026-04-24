// Tela "Meu Dia" — fila de tasks do BDR.
// Mostra 4 colunas contextuais: Agora, Hoje, Respondidos, Amanhã.

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Settings2, ExternalLink, Tag, ChevronDown, Instagram, Globe, Users } from 'lucide-react'
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
    openMessages: 'Mensagens',
    callAction: 'Ligar',
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
    openMessages: 'Mensajes',
    callAction: 'Llamar',
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
    openMessages: 'Messages',
    callAction: 'Call',
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
  done_today: any[]
  automated_today: any[]
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
  view_mode: 'self' | 'all' | 'user'
  view_user_id: string
  is_admin: boolean
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  role: string | null
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
  const [view, setView] = useState<string>('self') // 'self' | 'all' | <user_id>
  const [team, setTeam] = useState<TeamMember[]>([])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const qs = view === 'self' ? '' : `?view=${view}`
      const res = await fetch(`/api/prospection/my-day${qs}`)
      if (!res.ok) throw new Error('Erro ao buscar tasks')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [view])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Carrega o time só se admin
  useEffect(() => {
    if (!data?.is_admin) return
    fetch('/api/prospection/team')
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((json) => setTeam(json.users || []))
      .catch(() => {})
  }, [data?.is_admin])

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
    <div className="p-6 md:p-8">
      {/* Header */}
      <div
        className="rounded-2xl mb-6 overflow-hidden"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between gap-4 p-5 flex-wrap">
          {/* Título + ícone */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover, #6366f1) 100%)',
                boxShadow: '0 8px 20px -8px var(--color-primary)',
              }}
            >
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
                {t.title}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t.subtitle}</p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-wrap">
            {data?.is_admin && team.length > 0 && (
              <div className="relative">
                <select
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                  className="appearance-none pl-9 pr-8 py-2 rounded-lg text-sm font-semibold focus:outline-none transition cursor-pointer"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  title="Visualizar dia de"
                >
                  <option value="self">Meu dia</option>
                  <option value="all">Todo o time</option>
                  <optgroup label="Por usuário">
                    {team.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}{u.id === data.user_id ? ' (eu)' : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <Users
                  className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
                <ChevronDown
                  className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
              </div>
            )}

            <Link
              href="/dashboard/prospection/sequences"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.color = 'var(--color-text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
            >
              <Settings2 className="w-4 h-4" />
              Sequences
            </Link>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-on-primary)',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t.refresh}
            </button>
          </div>
        </div>

        {/* Métricas embutidas na mesma barra (row inferior) */}
        <div
          className="flex items-center gap-6 px-5 py-3 flex-wrap"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-base)',
          }}
        >
          <MetricInline
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label={t.doneToday}
            value={String(data?.counts.done_today ?? 0)}
            tone="success"
          />
          {view !== 'all' && (
            <MetricInline
              icon={<Clock className="w-3.5 h-3.5" />}
              label={t.capacity}
              value={`${data?.counts.done_today ?? 0}/${data?.daily_capacity ?? 50}`}
              tone={
                (data?.counts.done_today ?? 0) >= (data?.daily_capacity ?? 50)
                  ? 'warning'
                  : 'neutral'
              }
            />
          )}
          <MetricInline
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="Vencidas"
            value={String(data?.counts.overdue ?? 0)}
            tone={(data?.counts.overdue ?? 0) > 0 ? 'danger' : 'neutral'}
          />
          <MetricInline
            icon={<Inbox className="w-3.5 h-3.5" />}
            label={t.responded}
            value={String(data?.counts.responded ?? 0)}
            tone={(data?.counts.responded ?? 0) > 0 ? 'success' : 'neutral'}
          />
        </div>
      </div>

      {hasNothing ? (
        <EmptyState message={t.emptyAll} />
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            alignItems: 'start',
          }}
        >
          <Column
            title="A fazer hoje"
            icon={<Clock className="w-4 h-4" />}
            tone="primary"
            count={data!.counts.overdue + data!.counts.now + data!.counts.today}
          >
            <GroupedByStep
              tasks={[...data!.buckets.overdue, ...data!.buckets.now, ...data!.buckets.today]}
              onComplete={setCompletingTask}
              stages={data!.stages ?? []}
              onRefresh={() => fetchData(true)}
              showAssignee={data!.view_mode !== 'self'}
              t={t}
            />
          </Column>

          <Column
            title={t.responded}
            icon={<Inbox className="w-4 h-4" />}
            tone="success"
            count={data!.counts.responded}
          >
            {data!.responded.length === 0 ? (
              <EmptyColumn message="Nenhum lead respondeu." />
            ) : (
              <RespondedList items={data!.responded} t={t} />
            )}
          </Column>

          <Column
            title="Feitas hoje"
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="neutral"
            count={data!.counts.done_today}
          >
            <DoneTodayView
              tasks={data!.done_today}
              automated={data!.automated_today}
              showAssignee={data!.view_mode !== 'self'}
            />
          </Column>

          <Column
            title="Amanhã"
            icon={<Clock className="w-4 h-4" />}
            tone="muted"
            count={data!.buckets.tomorrow.length}
          >
            <TomorrowSummary tasks={data!.buckets.tomorrow} showAssignee={data!.view_mode !== 'self'} />
          </Column>
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

function MetricInline({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const toneColor =
    tone === 'success' ? 'var(--color-success, #10b981)' :
    tone === 'warning' ? 'var(--color-warning, #f59e0b)' :
    tone === 'danger' ? 'var(--color-danger, #ef4444)' :
    'var(--color-text-tertiary)'

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--color-bg-elevated)',
          color: toneColor,
        }}
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider leading-tight"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {label}
        </span>
        <span className="font-bold text-sm leading-tight" style={{ color: toneColor }}>
          {value}
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN — coluna fixa tipo kanban, com header sticky e scroll interno
// ═══════════════════════════════════════════════════════════════════════════════

function Column({
  title,
  icon,
  tone,
  count,
  children,
}: {
  title: string
  icon: React.ReactNode
  tone: 'primary' | 'success' | 'neutral' | 'muted' | 'danger'
  count: number
  children: React.ReactNode
}) {
  const toneColor =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'success' ? 'var(--color-success, #10b981)' :
    tone === 'danger' ? 'var(--color-danger, #ef4444)' :
    tone === 'muted' ? 'var(--color-text-tertiary)' :
    'var(--color-text-primary)'

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        maxHeight: 'calc(100vh - 180px)',
        minHeight: '300px',
      }}
    >
      {/* Header sticky */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-bg-elevated)', color: toneColor }}
        >
          {icon}
        </div>
        <h3 className="font-bold text-sm flex-1 min-w-0" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: count > 0 ? toneColor : 'var(--color-bg-elevated)',
            color: count > 0 ? 'var(--color-text-on-primary)' : 'var(--color-text-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {count}
        </span>
      </div>

      {/* Conteúdo com scroll interno */}
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  )
}

function EmptyColumn({ message }: { message: string }) {
  return (
    <div
      className="text-center py-8 text-xs italic"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      {message}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPED BY STEP — agrupa tasks por etapa da cadência (A FAZER)
// ═══════════════════════════════════════════════════════════════════════════════

function GroupedByStep({
  tasks,
  onComplete,
  stages,
  onRefresh,
  showAssignee,
  t,
}: {
  tasks: any[]
  onComplete: (task: any) => void
  stages: { value: string; label: string; color?: string }[]
  onRefresh: () => void
  showAssignee?: boolean
  t: (typeof TRANSLATIONS)['pt']
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-6 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Nenhuma task pendente hoje.
      </div>
    )
  }

  // Agrupa por step_id
  const groups = new Map<string, { step: any; tasks: any[] }>()
  for (const task of tasks) {
    const step = Array.isArray(task.step) ? task.step[0] : task.step
    const key = step?.id || 'unknown'
    if (!groups.has(key)) groups.set(key, { step, tasks: [] })
    groups.get(key)!.tasks.push(task)
  }
  const sorted = Array.from(groups.values()).sort(
    (a, b) => (a.step?.position ?? 99) - (b.step?.position ?? 99)
  )

  return (
    <div className="space-y-3">
      {sorted.map(({ step, tasks: stepTasks }) => (
        <StepGroup
          key={step?.id || Math.random()}
          step={step}
          tasks={stepTasks}
          onComplete={onComplete}
          stages={stages}
          onRefresh={onRefresh}
          showAssignee={showAssignee}
          t={t}
        />
      ))}
    </div>
  )
}

function StepGroup({
  step,
  tasks,
  onComplete,
  stages,
  onRefresh,
  showAssignee,
  t,
}: {
  step: any
  tasks: any[]
  onComplete: (task: any) => void
  stages: { value: string; label: string; color?: string }[]
  onRefresh: () => void
  showAssignee?: boolean
  t: (typeof TRANSLATIONS)['pt']
}) {
  const [open, setOpen] = useState(true)
  const channel = step?.channel ?? 'whatsapp'
  const Icon = channel === 'email' ? Mail : channel === 'call' ? Phone : MessageSquare

  return (
    <div
      className="rounded-lg"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Etapa {step?.position} · {step?.title || CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]}
        </span>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded ml-auto"
          style={{
            background: 'var(--color-primary-subtle)',
            color: 'var(--color-primary)',
          }}
        >
          {tasks.length}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{
            color: 'var(--color-text-tertiary)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => onComplete(task)}
              stages={stages}
              onRefresh={onRefresh}
              showAssignee={showAssignee}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONDED LIST — leads que responderam (link direto pro lead)
// ═══════════════════════════════════════════════════════════════════════════════

function RespondedList({
  items,
  t,
}: {
  items: any[]
  t: (typeof TRANSLATIONS)['pt']
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const lead = Array.isArray(item.lead) ? item.lead[0] : item.lead
        return (
          <Link
            key={item.id}
            href={`/dashboard/crm/${item.lead_id}`}
            className="flex items-center justify-between gap-3 p-3 rounded-lg transition group"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-success, #10b981)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {lead?.name ?? '—'}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                {lead?.phone ?? lead?.email ?? ''}
              </div>
            </div>
            <div
              className="flex items-center gap-1 text-xs font-semibold group-hover:translate-x-0.5 transition"
              style={{ color: 'var(--color-success, #10b981)' }}
            >
              {t.goToQualify}
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DONE TODAY — histórico do dia agrupado por etapa
// ═══════════════════════════════════════════════════════════════════════════════

function DoneTodayView({
  tasks,
  automated,
  showAssignee,
}: {
  tasks: any[]
  automated: any[]
  showAssignee?: boolean
}) {
  const allItems = [
    ...tasks.map((t: any) => ({ kind: 'manual', item: t })),
    ...automated.map((e: any) => ({ kind: 'auto', item: e })),
  ]

  if (allItems.length === 0) {
    return (
      <div className="text-center py-6 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Nada foi feito hoje ainda.
      </div>
    )
  }

  // Agrupa por step_id
  const groups = new Map<string, { step: any; items: any[]; kind: 'manual' | 'auto' }>()
  for (const { kind, item } of allItems) {
    const step = Array.isArray(item.step) ? item.step[0] : item.step
    const key = step?.id || 'unknown'
    if (!groups.has(key)) groups.set(key, { step, items: [], kind })
    groups.get(key)!.items.push({ kind, ...item })
  }
  const sorted = Array.from(groups.values()).sort(
    (a, b) => (a.step?.position ?? 99) - (b.step?.position ?? 99)
  )

  return (
    <div className="space-y-2">
      {sorted.map(({ step, items, kind }) => (
        <DoneStepGroup key={step?.id || Math.random()} step={step} items={items} kind={kind} showAssignee={showAssignee} />
      ))}
    </div>
  )
}

function DoneStepGroup({
  step,
  items,
  kind,
  showAssignee,
}: {
  step: any
  items: any[]
  kind: 'manual' | 'auto'
  showAssignee?: boolean
}) {
  const [open, setOpen] = useState(false)
  const channel = step?.channel ?? 'whatsapp'
  const Icon = channel === 'email' ? Mail : channel === 'call' ? Phone : MessageSquare

  // Summary line por tipo
  let summary = ''
  if (kind === 'auto') {
    summary = `${items.length} ${channel === 'email' ? 'emails' : 'ações'} automáticas`
  } else if (channel === 'call') {
    const atendeu = items.filter((i: any) => (i.outcome ?? '').startsWith('answered')).length
    const naoAtendeu = items.length - atendeu
    summary = `${items.length} ligações · atendeu: ${atendeu} · não atendeu: ${naoAtendeu}`
  } else {
    summary = `${items.length} concluídas`
    if (showAssignee) {
      const byUser = new Map<string, number>()
      for (const i of items) {
        const a = Array.isArray(i.assignee) ? i.assignee[0] : i.assignee
        const name = a?.full_name || 'Sem responsável'
        byUser.set(name, (byUser.get(name) || 0) + 1)
      }
      const parts = Array.from(byUser.entries()).map(([n, c]) => `${n}: ${c}`)
      if (parts.length > 0) summary += ` · ${parts.join(' · ')}`
    }
  }

  return (
    <div
      className="rounded-lg"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-success, #10b981)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Etapa {step?.position} · {step?.title || CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]}
            </span>
            {kind === 'auto' && (
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                }}
              >
                Automático
              </span>
            )}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {summary}
          </div>
        </div>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{
            color: 'var(--color-text-tertiary)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-1.5">
          {items.map((i: any) => (
            <DoneItem key={i.id} item={i} kind={i.kind} showAssignee={showAssignee} />
          ))}
        </div>
      )}
    </div>
  )
}

function DoneItem({ item, kind, showAssignee }: { item: any; kind: 'manual' | 'auto'; showAssignee?: boolean }) {
  const lead = Array.isArray(item.lead) ? item.lead[0] : item.lead
  const assignee = Array.isArray(item.assignee) ? item.assignee[0] : item.assignee
  const when = item.completed_at || item.executed_at
  const whenLabel = when ? new Date(when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <Link
      href={`/dashboard/crm/${lead?.id}`}
      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-xs transition"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-primary)' }}>
        <span className="font-semibold">{lead?.name ?? '—'}</span>
        <span className="mx-1.5" style={{ color: 'var(--color-text-tertiary)' }}>·</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>{lead?.phone ?? lead?.email ?? ''}</span>
      </div>
      {item.outcome && kind === 'manual' && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {CALL_OUTCOME_LABELS[item.outcome as ProspectionCallOutcome] || item.outcome}
        </span>
      )}
      {showAssignee && assignee && kind === 'manual' && (
        <span
          className="text-[10px] font-semibold flex-shrink-0"
          style={{ color: 'var(--color-primary)' }}
        >
          {assignee.full_name || assignee.email}
        </span>
      )}
      <span className="text-[10px] flex-shrink-0 font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
        {whenLabel}
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOMORROW SUMMARY — preview agrupado do que vem amanhã
// ═══════════════════════════════════════════════════════════════════════════════

function TomorrowSummary({ tasks, showAssignee }: { tasks: any[]; showAssignee?: boolean }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-6 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Nada programado para amanhã.
      </div>
    )
  }

  const groups = new Map<string, { step: any; count: number }>()
  for (const t of tasks) {
    const step = Array.isArray(t.step) ? t.step[0] : t.step
    const key = step?.id || 'unknown'
    if (!groups.has(key)) groups.set(key, { step, count: 0 })
    groups.get(key)!.count++
  }
  const sorted = Array.from(groups.values()).sort(
    (a, b) => (a.step?.position ?? 99) - (b.step?.position ?? 99)
  )

  return (
    <div className="space-y-2">
      <div
        className="rounded-lg px-3 py-2 text-xs"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        📅 {tasks.length} lead{tasks.length > 1 ? 's' : ''} programado{tasks.length > 1 ? 's' : ''} para amanhã
      </div>
      {sorted.map(({ step, count }) => {
        const channel = step?.channel ?? 'whatsapp'
        const Icon = channel === 'email' ? Mail : channel === 'call' ? Phone : MessageSquare
        return (
          <div
            key={step?.id || Math.random()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
              Etapa {step?.position} · {step?.title || CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]}
            </span>
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded ml-auto"
              style={{
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY BUCKET (mantido só pra não quebrar imports que o TS ainda usa, mas não é renderizado)
// ═══════════════════════════════════════════════════════════════════════════════

function _LegacyBucket({
  title,
  description,
  icon,
  tone,
  tasks,
  onComplete,
  stages,
  onRefresh,
  compact,
  showAssignee,
  t,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone: 'danger' | 'primary' | 'neutral' | 'muted'
  tasks: any[]
  onComplete: (task: any) => void
  stages: { value: string; label: string; color?: string }[]
  onRefresh: () => void
  compact?: boolean
  showAssignee?: boolean
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
              stages={stages}
              onRefresh={onRefresh}
              compact={compact}
              showAssignee={showAssignee}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function _LegacyRespondedBucket({
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
  stages,
  onRefresh,
  compact,
  showAssignee,
  t,
}: {
  task: any
  onComplete: () => void
  stages: { value: string; label: string; color?: string }[]
  onRefresh: () => void
  compact?: boolean
  showAssignee?: boolean
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
  const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee
  const assigneeName = assignee?.full_name || assignee?.email || 'Sem responsável'

  const channel = step?.channel ?? 'whatsapp'
  const channelIcon =
    channel === 'email' ? <Mail className="w-3.5 h-3.5" /> :
    channel === 'call' ? <Phone className="w-3.5 h-3.5" /> :
    <MessageSquare className="w-3.5 h-3.5" />

  const due = new Date(task.due_at)
  const dueLabel = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const instagramUrl = normalizeInstagramUrl(lead?.instagram)
  const siteUrl = normalizeSiteUrl(lead?.url_site)

  return (
    <div
      className="rounded-xl p-4 transition"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-strong, var(--color-primary))')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      {/* Header badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: 'var(--color-primary-subtle)',
            color: 'var(--color-primary)',
          }}
        >
          {channelIcon}
          {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {t.stepOf} {step?.position ?? '-'} · {step?.title ?? ''}
        </span>
        {showAssignee && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: assignee ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
              color: assignee ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
              border: '1px solid var(--color-border)',
            }}
            title="Responsável pela task"
          >
            {assigneeName}
          </span>
        )}
        <span
          className="text-[10px] ml-auto font-mono"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {dueLabel}
        </span>
      </div>

      {/* Lead info + social icons */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-sm truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {lead?.name && String(lead.name).trim() ? lead.name : '—'}
          </div>
          <div
            className="text-xs truncate"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {lead?.phone ?? lead?.email ?? ''}{lead?.city ? ` · ${lead.city}` : ''}
          </div>
        </div>

        {/* Social icons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <SocialIcon
            Icon={Instagram}
            url={instagramUrl}
            title={instagramUrl ? `Instagram: ${lead.instagram}` : 'Sem Instagram'}
            activeColor="#E4405F"
          />
          <SocialIcon
            Icon={Globe}
            url={siteUrl}
            title={siteUrl ? `Site: ${lead.url_site}` : 'Sem site'}
            activeColor="var(--color-primary)"
          />
        </div>
      </div>

      {/* Stage pill */}
      {lead?.id && !compact && stages.length > 0 && (
        <div className="mb-3">
          <StagePill
            leadId={lead.id}
            currentStage={lead.stage}
            stages={stages}
            onChanged={onRefresh}
          />
        </div>
      )}

      {/* Instruction */}
      {!compact && step?.instruction && (
        <div
          className="text-xs rounded-lg px-3 py-2 mb-3"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span
            className="font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t.instruction}:
          </span>{' '}
          {step.instruction}
        </div>
      )}

      {/* Action rows */}
      {!compact && (
        <div className="space-y-2">
          {channel === 'whatsapp' && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation()
                  if (!lead?.id) return
                  window.open(`/dashboard/messages?lead_id=${lead.id}`, '_blank')
                }}
                disabled={!lead?.id}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-text-on-primary)',
                }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {t.openMessages}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation()
                  if (!lead?.phone) return
                  const num = String(lead.phone).replace(/\D/g, '')
                  window.open(`https://wa.me/${num}`, '_blank')
                }}
                disabled={!lead?.phone}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: '#25D366',
                  color: '#fff',
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          )}
          {channel === 'call' && lead?.phone && (
            <a
              href={`tel:${String(lead.phone).replace(/\D/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold transition"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-on-primary)',
              }}
            >
              <Phone className="w-3.5 h-3.5" />
              {t.callAction} · {lead.phone}
            </a>
          )}

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/crm/${task.lead_id}`}
              className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg transition"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t.openLead}
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={onComplete}
              className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg font-semibold transition"
              style={{
                background: 'var(--color-text-primary)',
                color: 'var(--color-bg-base)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.markDone}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Ícone social (clicável quando tem URL, apagado quando não) ───
function SocialIcon({
  Icon,
  url,
  title,
  activeColor,
}: {
  Icon: any
  url: string | null
  title: string
  activeColor: string
}) {
  const enabled = !!url
  const common: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg-elevated)',
    color: enabled ? activeColor : 'var(--color-text-tertiary)',
    opacity: enabled ? 1 : 0.4,
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'all 0.15s ease',
  }

  if (!enabled) {
    return (
      <span style={common} title={title}>
        <Icon className="w-3.5 h-3.5" />
      </span>
    )
  }

  return (
    <a
      href={url!}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={title}
      style={common}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = activeColor
        e.currentTarget.style.background = 'var(--color-bg-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.background = 'var(--color-bg-elevated)'
      }}
    >
      <Icon className="w-3.5 h-3.5" />
    </a>
  )
}

function normalizeInstagramUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v) return null
  if (v.startsWith('http')) return v
  const handle = v.replace(/^@/, '').replace(/\s+/g, '')
  if (!handle) return null
  return `https://instagram.com/${handle}`
}

function normalizeSiteUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v) return null
  if (v.startsWith('http')) return v
  return `https://${v}`
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

  const labelSecondary: React.CSSProperties = {
    color: 'var(--color-text-tertiary)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'var(--color-bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <div className="mb-1" style={labelSecondary}>
              {CHANNEL_LABELS[step?.channel as keyof typeof CHANNEL_LABELS]} · {t.stepOf} {step?.position}
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {lead?.name && String(lead.name).trim() ? lead.name : '—'}
            </h3>
            <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {lead?.phone ?? lead?.email}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {step?.instruction && (
            <div
              className="text-xs rounded-lg px-3 py-2"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t.instruction}:
              </span>{' '}
              {step.instruction}
            </div>
          )}

          {isWhatsApp && (
            <div className="flex gap-2">
              <button
                onClick={openInternalChat}
                disabled={!lead?.id}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-text-on-primary)',
                }}
              >
                <MessageSquare className="w-4 h-4" />
                {t.openMessages}
              </button>
              <button
                onClick={openWhatsAppExternal}
                disabled={!lead?.phone}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#25D366', color: '#fff' }}
              >
                <ExternalLink className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          )}

          {/* Variações */}
          {templates.length > 0 && (
            <div>
              <div style={labelSecondary} className="mb-2">
                {t.selectVariation}
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {templates.map((tpl) => {
                  const active = selectedVariant === tpl.variant
                  return (
                    <button
                      key={tpl.variant}
                      onClick={() => setSelectedVariant(tpl.variant)}
                      className="px-3 py-1.5 text-xs rounded-md transition"
                      style={{
                        background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {tpl.variant}
                      {tpl.label && <span className="ml-1 opacity-80">· {tpl.label}</span>}
                    </button>
                  )
                })}
              </div>

              {currentTemplate && (
                <div
                  className="relative rounded-lg p-4 font-mono text-sm whitespace-pre-wrap"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {currentTemplate.subject && (
                    <div className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
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
                    className="absolute top-2 right-2 p-1.5 rounded-md transition"
                    style={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                    title={t.copy}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-success, #10b981)' }} />
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
              <div style={labelSecondary} className="mb-2">
                {t.callOutcome}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {outcomeKeys.map((key) => {
                  const active = outcome === key
                  return (
                    <button
                      key={key}
                      onClick={() => setOutcome(key)}
                      className="px-3 py-2 text-xs rounded-md transition text-left"
                      style={{
                        background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {CALL_OUTCOME_LABELS[key]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mudar estágio */}
          {stages.length > 0 && (
            <div>
              <label style={labelSecondary} className="block mb-2">
                Mudar estágio do lead
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none transition"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
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
                    className="p-2 rounded-lg transition"
                    style={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-tertiary)',
                    }}
                    title="Cancelar mudança"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {lead?.stage && (() => {
                const currentLabel = stages.find((s) => s.value === lead.stage)?.label ?? lead.stage
                const newLabel = stages.find((s) => s.value === newStage)?.label ?? newStage
                return (
                  <div className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    Estágio atual:{' '}
                    <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      {currentLabel}
                    </span>
                    {newStage && newStage !== lead.stage && (
                      <>
                        {' '}· mudará para{' '}
                        <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                          {newLabel}
                        </span>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Notas */}
          <div>
            <label style={labelSecondary} className="block mb-2">
              {t.addNote}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              rows={2}
              placeholder="..."
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 flex items-center justify-end gap-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition font-medium"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCall && !outcome}
            className="px-4 py-2 text-sm rounded-lg font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-text-on-primary)',
            }}
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE PILL — dropdown inline pra mudar o stage do lead sem sair do card
// ═══════════════════════════════════════════════════════════════════════════════

function StagePill({
  leadId,
  currentStage,
  stages,
  onChanged,
}: {
  leadId: string
  currentStage: string | null
  stages: { value: string; label: string; color?: string }[]
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localStage, setLocalStage] = useState(currentStage)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalStage(currentStage)
  }, [currentStage])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function changeStage(newStage: string) {
    if (newStage === localStage) { setOpen(false); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/prospection/leads/${leadId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (res.ok) {
        setLocalStage(newStage)
        setOpen(false)
        onChanged()
      }
    } finally {
      setSaving(false)
    }
  }

  if (stages.length === 0) return null

  const currentLabel = stages.find((s) => s.value === localStage)?.label ?? localStage ?? '—'

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        disabled={saving}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition disabled:opacity-50"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        <Tag className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} />
        <span className="font-semibold">{currentLabel}</span>
        <ChevronDown className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[200px] max-h-64 overflow-y-auto rounded-lg py-1"
          style={{
            zIndex: 1000,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          {stages.length === 0 ? (
            <div
              className="px-3 py-2 text-xs italic"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Nenhum estágio configurado
            </div>
          ) : (
            stages.map((s) => {
              const active = s.value === localStage
              return (
                <button
                  key={s.value}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    changeStage(s.value)
                  }}
                  className="w-full text-left px-3 py-2 text-xs transition flex items-center gap-2"
                  style={{
                    background: active ? 'var(--color-primary-subtle)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    fontWeight: active ? 600 : 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'var(--color-bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {s.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: s.color }}
                    />
                  )}
                  <span className="truncate flex-1">{s.label}</span>
                  {active && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      )}
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
