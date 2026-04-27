// /dashboard/prospection/upcoming
// Lista quais enrollments vão executar hoje/amanhã (preview da fila do motor).
// Admin pode ver: lead, sequence, step, canal/modo, quando dispara, e
// se há configuração faltando (que faria a etapa falhar silenciosa).

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Mail, MessageSquare, Phone, Bot, User, Loader2, AlertTriangle,
  Clock, ArrowLeft, Inbox, RefreshCw, CheckCircle2,
} from 'lucide-react'
import { useLeadNameFormatter } from '@/lib/format/useLeadNameFormatter'
import { CHANNEL_LABELS } from '@/lib/prospection/types'

type UpcomingItem = {
  enrollment_id: string
  lead: any
  sequence: { id: string; name: string; is_active: boolean }
  step: any
  next_action_at: string
  bucket: 'overdue' | 'today' | 'tomorrow'
}

type Summary = {
  total: number
  automated_email: number
  manual: number
  overdue: number
  today: number
  tomorrow: number
}

export default function UpcomingProspectionPage() {
  const { formatName } = useLeadNameFormatter()
  const [items, setItems] = useState<UpcomingItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'automated_email' | 'manual'>('all')

  async function fetchData(silent = false) {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prospection/upcoming')
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao carregar fila')
      }
      const json = await res.json()
      setItems(json.items || [])
      setSummary(json.summary || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = items.filter((i) => {
    if (filter === 'all') return true
    if (filter === 'automated_email') {
      return i.step.execution_mode === 'automated' && i.step.channel === 'email'
    }
    return i.step.execution_mode === 'manual'
  })

  const grouped: Record<UpcomingItem['bucket'], UpcomingItem[]> = {
    overdue: filtered.filter((i) => i.bucket === 'overdue'),
    today: filtered.filter((i) => i.bucket === 'today'),
    tomorrow: filtered.filter((i) => i.bucket === 'tomorrow'),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <Link
        href="/dashboard/prospection/my-day"
        className="inline-flex items-center gap-1 text-xs mb-3"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <ArrowLeft className="w-3 h-3" /> Voltar pro Meu Dia
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
            }}
          >
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Emails de hoje
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Preview do que o motor de prospecção vai disparar nas próximas 24h.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {summary && (
        <div className="grid gap-2 mt-4 mb-5 grid-cols-2 md:grid-cols-5">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Email auto" value={summary.automated_email} icon={<Bot className="w-3.5 h-3.5" />} />
          <SummaryCard label="Manual" value={summary.manual} icon={<User className="w-3.5 h-3.5" />} />
          <SummaryCard label="Vencidas" value={summary.overdue} tone={summary.overdue > 0 ? 'danger' : 'neutral'} />
          <SummaryCard label="Hoje" value={summary.today} tone={summary.today > 0 ? 'primary' : 'neutral'} />
        </div>
      )}

      {error && (
        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
          }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`Todas (${items.length})`} />
        <FilterChip
          active={filter === 'automated_email'}
          onClick={() => setFilter('automated_email')}
          label={`Email auto (${summary?.automated_email ?? 0})`}
          icon={<Bot className="w-3 h-3" />}
        />
        <FilterChip
          active={filter === 'manual'}
          onClick={() => setFilter('manual')}
          label={`Manual (${summary?.manual ?? 0})`}
          icon={<User className="w-3 h-3" />}
        />
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px dashed var(--color-border)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nada na fila para o filtro selecionado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.overdue.length > 0 && (
            <Section title="Vencidas" icon={<AlertTriangle className="w-4 h-4" />} tone="danger" count={grouped.overdue.length}>
              {grouped.overdue.map((i) => <ItemRow key={i.enrollment_id} item={i} formatName={formatName} />)}
            </Section>
          )}
          {grouped.today.length > 0 && (
            <Section title="Hoje" icon={<Clock className="w-4 h-4" />} tone="primary" count={grouped.today.length}>
              {grouped.today.map((i) => <ItemRow key={i.enrollment_id} item={i} formatName={formatName} />)}
            </Section>
          )}
          {grouped.tomorrow.length > 0 && (
            <Section title="Amanhã" icon={<Clock className="w-4 h-4" />} tone="muted" count={grouped.tomorrow.length}>
              {grouped.tomorrow.map((i) => <ItemRow key={i.enrollment_id} item={i} formatName={formatName} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: number
  tone?: 'neutral' | 'primary' | 'danger'
  icon?: React.ReactNode
}) {
  const fg =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'danger' ? '#ef4444' :
    'var(--color-text-primary)'
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-0.5" style={{ color: fg }}>
        {value}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition"
      style={{
        background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
        border: '1px solid ' + (active ? 'var(--color-primary)' : 'var(--color-border)'),
        color: active ? 'var(--color-text-on-primary, #fff)' : 'var(--color-text-secondary)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function Section({
  title,
  icon,
  tone,
  count,
  children,
}: {
  title: string
  icon: React.ReactNode
  tone: 'primary' | 'muted' | 'danger'
  count: number
  children: React.ReactNode
}) {
  const fg =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'danger' ? '#ef4444' :
    'var(--color-text-secondary)'
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span style={{ color: fg }}>{icon}</span>
        <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)' }}
        >
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ItemRow({
  item,
  formatName,
}: {
  item: UpcomingItem
  formatName: (lead: any) => string
}) {
  const { lead, step, sequence, next_action_at, bucket } = item
  const ChIcon = step.channel === 'email' ? Mail : step.channel === 'call' ? Phone : MessageSquare
  const ExecIcon = step.execution_mode === 'automated' ? Bot : User
  const isAutoEmail = step.execution_mode === 'automated' && step.channel === 'email'
  const templates = Array.isArray(step.message_templates) ? step.message_templates : []
  const firstTpl = templates[0]
  const tplBodyOk = !!(firstTpl && firstTpl.body && String(firstTpl.body).trim())

  // Diagnóstico — etapa pode falhar quando o cron rodar?
  const issues: string[] = []
  if (isAutoEmail) {
    if (step.agent_slug !== 'bdr_email') issues.push(`agente "${step.agent_slug || '—'}" inválido`)
    if (!templates.length) issues.push('sem variação')
    else if (!tplBodyOk) issues.push('1ª variação sem corpo')
    if (!lead?.email) issues.push('lead sem email')
  }

  const dueAt = new Date(next_action_at)
  const dueStr = dueAt.toLocaleString()

  return (
    <div
      className="rounded-xl p-3 flex items-start gap-3 flex-wrap"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid ' + (issues.length > 0 ? 'rgba(245, 158, 11, 0.35)' : 'var(--color-border)'),
      }}
    >
      <div className="flex-1 min-w-[240px]">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {formatName(lead)}
          </span>
          {lead?.email && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
              · {lead.email}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
          <Link
            href={`/dashboard/prospection/sequences/${sequence.id}`}
            className="hover:underline font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {sequence.name}
          </Link>
          <span>·</span>
          <span>Etapa {step.position}{step.title ? ` · ${step.title}` : ''}</span>
        </div>

        {issues.length > 0 && (
          <div
            className="mt-2 rounded-md px-2 py-1 text-[11px] inline-flex items-start gap-1.5"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <span>
              <span className="font-semibold" style={{ color: '#f59e0b' }}>Vai falhar:</span>{' '}
              {issues.join(' · ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge icon={<ChIcon className="w-3 h-3" />} tone="primary">
          {CHANNEL_LABELS[step.channel as keyof typeof CHANNEL_LABELS]}
        </Badge>
        <Badge
          icon={<ExecIcon className="w-3 h-3" />}
          tone={step.execution_mode === 'automated' ? 'success' : 'muted'}
        >
          {step.execution_mode === 'automated' ? `Auto · ${step.agent_slug}` : 'Manual'}
        </Badge>
        <Badge
          icon={<Clock className="w-3 h-3" />}
          tone={bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'primary' : 'muted'}
        >
          {dueStr}
        </Badge>
      </div>
    </div>
  )
}

function Badge({
  icon,
  children,
  tone,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  tone: 'primary' | 'muted' | 'success' | 'danger'
}) {
  const bg =
    tone === 'primary' ? 'var(--color-primary-subtle)' :
    tone === 'success' ? 'rgba(16, 185, 129, 0.12)' :
    tone === 'danger' ? 'rgba(239, 68, 68, 0.12)' :
    'var(--color-bg-elevated)'
  const fg =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'success' ? 'var(--color-success, #10b981)' :
    tone === 'danger' ? '#ef4444' :
    'var(--color-text-tertiary)'
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: bg, color: fg, border: '1px solid var(--color-border)' }}
    >
      {icon}
      {children}
    </span>
  )
}
