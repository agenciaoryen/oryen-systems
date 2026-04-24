// Detalhe de uma sequence: steps, rules, enrollments, bulk enroll, rodar motor.

'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, MessageSquare, Mail, Phone, Bot, User, Users, Clock,
  Play, UserPlus, Search, Check, X, Zap, CheckCircle2, AlertTriangle,
  Filter, RotateCcw, Plus, Edit3, Trash2, ArrowUp, ArrowDown, Save,
  FileText, Copy as CopyIcon, Settings, ArrowRight,
} from 'lucide-react'
import { CHANNEL_LABELS } from '@/lib/prospection/types'

export default function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'steps' | 'rules' | 'enrollments' | 'config'>('steps')
  const [showEnroll, setShowEnroll] = useState(false)
  const [engineRunning, setEngineRunning] = useState(false)
  const [engineResult, setEngineResult] = useState<any>(null)

  async function fetchData() {
    setLoading(true)
    const res = await fetch(`/api/prospection/sequences/${id}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function runEngine() {
    setEngineRunning(true)
    setEngineResult(null)
    try {
      const res = await fetch('/api/prospection/engine/run', { method: 'POST' })
      const json = await res.json()
      setEngineResult(json)
      await fetchData()
    } catch (e: any) {
      setEngineResult({ error: e.message })
    } finally {
      setEngineRunning(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const { sequence, steps, rules, enrollments } = data
  const activeCount = enrollments.filter((e: any) => e.status === 'active').length
  const pausedCount = enrollments.filter((e: any) => e.status === 'paused').length

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/prospection/sequences"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Todas sequences
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{sequence.name}</h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  sequence.is_active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {sequence.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            {sequence.description && <p className="text-sm text-muted-foreground max-w-2xl">{sequence.description}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runEngine}
              disabled={engineRunning}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {engineRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Rodar motor agora
            </button>
            <button
              onClick={() => setShowEnroll(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-on-primary)',
                boxShadow: '0 4px 12px -4px var(--color-primary)',
              }}
            >
              <UserPlus className="w-4 h-4" />
              Inscrever leads
            </button>
          </div>
        </div>

        {/* Engine progress / result */}
        {(engineRunning || engineResult) && (
          <EnginePanel running={engineRunning} result={engineResult} />
        )}

        {/* Stats · premium com ícones e cores semânticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="Etapas"
            value={steps.length}
            tone="primary"
            hint={steps.length > 0 ? `${Math.max(...steps.map((s: any) => s.day_offset))} dias` : 'sem etapas'}
          />
          <StatCard
            icon={<Filter className="w-4 h-4" />}
            label="Regras ativas"
            value={rules.filter((r: any) => r.is_active).length}
            tone="indigo"
            hint={`${rules.length} total`}
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Leads ativos"
            value={activeCount}
            tone="success"
            hint="em execução"
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Pausados"
            value={pausedCount}
            tone={pausedCount > 0 ? 'warning' : 'muted'}
            hint="aguardam qualificação"
          />
        </div>
      </div>

      {/* Tabs · pill style premium */}
      <div
        className="inline-flex items-center gap-1 p-1 rounded-xl mb-6"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <TabButton
          active={tab === 'steps'}
          onClick={() => setTab('steps')}
          icon={<Zap className="w-3.5 h-3.5" />}
          label="Etapas"
          count={steps.length}
        />
        <TabButton
          active={tab === 'rules'}
          onClick={() => setTab('rules')}
          icon={<Filter className="w-3.5 h-3.5" />}
          label="Regras"
          count={rules.filter((r: any) => r.is_active).length}
        />
        <TabButton
          active={tab === 'enrollments'}
          onClick={() => setTab('enrollments')}
          icon={<Users className="w-3.5 h-3.5" />}
          label="Inscritos"
          count={enrollments.length}
        />
        <TabButton
          active={tab === 'config'}
          onClick={() => setTab('config')}
          icon={<Settings className="w-3.5 h-3.5" />}
          label="Configuração"
        />
      </div>

      {tab === 'steps' && (
        <StepsEditor
          sequenceId={id}
          steps={steps}
          onRefresh={fetchData}
        />
      )}
      {tab === 'rules' && <RulesView rules={rules} />}
      {tab === 'enrollments' && <EnrollmentsView enrollments={enrollments} />}
      {tab === 'config' && <ConfigView sequence={sequence} onSaved={fetchData} />}

      {showEnroll && (
        <BulkEnrollModal
          sequenceId={id}
          steps={steps}
          onClose={() => setShowEnroll(false)}
          onDone={fetchData}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
      style={{
        background: active ? 'var(--color-bg-elevated)' : 'transparent',
        color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
        boxShadow: active ? 'inset 0 0 0 1px var(--color-primary)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--color-bg-hover)'
          e.currentTarget.style.color = 'var(--color-text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-tertiary)'
        }
      }}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
          style={{
            background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
            color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-tertiary)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE PANEL — progress bar durante run + resumo do resultado
// ═══════════════════════════════════════════════════════════════════════════════

function EnginePanel({
  running,
  result,
}: {
  running: boolean
  result: any
}) {
  // Etapas simuladas do motor pra UX — o backend não stream progress,
  // então animamos um progress de 0 → 92% em ~7s (tempo típico).
  // Quando o result chega, jump pra 100%.
  const steps = [
    { label: 'Verificando tasks vencidas', until: 20 },
    { label: 'Avançando enrollments', until: 55 },
    { label: 'Disparando steps automáticos', until: 80 },
    { label: 'Processando leads parados', until: 92 },
  ]

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (running && !result) {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 92) return p
          // Aceleração gradativa: começa rápido, desacelera
          const delta = p < 30 ? 2 : p < 60 ? 1.2 : p < 85 ? 0.6 : 0.3
          return Math.min(p + delta, 92)
        })
      }, 120)
      return () => clearInterval(interval)
    } else if (result) {
      setProgress(100)
    }
  }, [running, result])

  const currentStepIdx = steps.findIndex((s) => progress <= s.until)
  const activeStepIdx = currentStepIdx === -1 ? steps.length - 1 : currentStepIdx

  const hasError = result?.error
  const finished = !running && result

  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid ${hasError ? 'var(--color-danger, #ef4444)' : 'var(--color-border)'}`,
      }}
    >
      {/* Header + progress bar */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-primary)' }} />
            ) : hasError ? (
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--color-danger, #ef4444)' }} />
            ) : (
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success, #10b981)' }} />
            )}
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              {running
                ? steps[activeStepIdx]?.label || 'Processando...'
                : hasError
                  ? 'Erro ao executar'
                  : 'Motor executado com sucesso'}
            </span>
          </div>
          <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--color-bg-elevated)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: hasError
                ? 'var(--color-danger, #ef4444)'
                : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
              transitionDuration: running ? '100ms' : '300ms',
            }}
          />
        </div>

        {/* Steps checklist */}
        {running && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {steps.map((s, i) => {
              const done = progress >= s.until
              const isActive = i === activeStepIdx && !done
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-1.5 text-[11px] transition"
                  style={{
                    color: done
                      ? 'var(--color-success, #10b981)'
                      : isActive
                        ? 'var(--color-primary)'
                        : 'var(--color-text-tertiary)',
                    opacity: done || isActive ? 1 : 0.6,
                  }}
                >
                  {done ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        border: '1.5px solid var(--color-border)',
                      }}
                    />
                  )}
                  {s.label}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Resultado final */}
      {finished && (
        <div
          className="px-4 py-3 text-xs flex items-center gap-4 flex-wrap"
          style={{
            background: hasError ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-bg-elevated)',
            borderTop: '1px solid var(--color-border)',
            color: hasError ? 'var(--color-danger, #ef4444)' : 'var(--color-text-secondary)',
          }}
        >
          {hasError ? (
            <span>{result.error}</span>
          ) : (
            <>
              <ResultChip label="Avançados" value={result.advanced} />
              <ResultChip label="Tasks criadas" value={result.tasks_created} />
              <ResultChip label="Automáticos" value={result.automated_executed} />
              <ResultChip label="Vencidas marcadas" value={result.overdue_marked} />
              <ResultChip label="Stale inscritos" value={result.stale_enrolled} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ResultChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: 'var(--color-text-tertiary)' }}>{label}:</span>
      <span
        className="font-bold"
        style={{ color: value > 0 ? 'var(--color-primary)' : 'var(--color-text-primary)' }}
      >
        {value ?? 0}
      </span>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone = 'muted',
  hint,
}: {
  icon?: React.ReactNode
  label: string
  value: number
  tone?: 'primary' | 'warning' | 'success' | 'indigo' | 'muted'
  hint?: string
}) {
  const color =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'warning' ? 'var(--color-warning, #f59e0b)' :
    tone === 'success' ? 'var(--color-success, #10b981)' :
    tone === 'indigo' ? 'var(--color-primary-hover, #6366f1)' :
    'var(--color-text-primary)'

  const subtleBg =
    tone === 'primary' ? 'var(--color-primary-subtle)' :
    tone === 'warning' ? 'rgba(245, 158, 11, 0.12)' :
    tone === 'success' ? 'rgba(16, 185, 129, 0.12)' :
    tone === 'indigo' ? 'rgba(99, 102, 241, 0.12)' :
    'var(--color-bg-elevated)'

  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Decorative corner glow */}
      <div
        className="absolute -top-8 -right-8 w-20 h-20 rounded-full pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        }}
      />

      <div className="flex items-start justify-between gap-3 relative">
        <div className="min-w-0">
          <div
            className="text-[10px] uppercase tracking-wider font-bold mb-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {label}
          </div>
          <div className="text-2xl font-bold leading-none mb-1" style={{ color }}>
            {value}
          </div>
          {hint && (
            <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {hint}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: subtleBg, color }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

function StepsView({ steps }: { steps: any[] }) {
  return (
    <div className="space-y-3">
      {steps.map((s) => {
        const Icon = s.channel === 'email' ? Mail : s.channel === 'call' ? Phone : MessageSquare
        const ExecIcon = s.execution_mode === 'automated' ? Bot : User
        return (
          <div key={s.id} className="border border-border rounded-xl bg-card p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{String(s.position).padStart(2, '0')}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-semibold">{s.title || `Etapa ${s.position}`}</h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    <Icon className="w-3 h-3" />
                    {CHANNEL_LABELS[s.channel as keyof typeof CHANNEL_LABELS]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">
                    <Clock className="w-3 h-3" /> Dia {s.day_offset}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    s.execution_mode === 'automated'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted/50 text-muted-foreground border-border'
                  }`}>
                    <ExecIcon className="w-3 h-3" />
                    {s.execution_mode === 'automated' ? `Auto · ${s.agent_slug}` : 'Manual'}
                  </span>
                </div>
                {s.instruction && (
                  <p className="text-xs text-muted-foreground mb-2">{s.instruction}</p>
                )}
                {Array.isArray(s.message_templates) && s.message_templates.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    {s.message_templates.length} variação(ões): {s.message_templates.map((t: any) => t.variant).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEPS EDITOR — adicionar, editar, reordenar, remover steps
// ═══════════════════════════════════════════════════════════════════════════════

function StepsEditor({
  sequenceId,
  steps,
  onRefresh,
}: {
  sequenceId: string
  steps: any[]
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState<any | null>(null) // step sendo editado
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function moveStep(stepId: string, direction: 'up' | 'down') {
    setBusy(stepId)
    try {
      await fetch(`/api/prospection/sequences/${sequenceId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', direction }),
      })
      await onRefresh()
    } finally {
      setBusy(null)
    }
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Deletar esta etapa? Isso não afeta enrollments ativos no step.')) return
    setBusy(stepId)
    try {
      await fetch(`/api/prospection/sequences/${sequenceId}/steps/${stepId}`, {
        method: 'DELETE',
      })
      await onRefresh()
    } finally {
      setBusy(null)
    }
  }

  const sorted = [...steps].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center text-sm"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px dashed var(--color-border)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Nenhuma etapa ainda. Clica no botão abaixo pra começar.
        </div>
      ) : (
        sorted.map((s, i) => (
          <StepRow
            key={s.id}
            step={s}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
            busy={busy === s.id}
            onMove={(dir) => moveStep(s.id, dir)}
            onEdit={() => setEditing(s)}
            onDelete={() => deleteStep(s.id)}
          />
        ))
      )}

      <button
        onClick={() => setCreating(true)}
        className="w-full rounded-xl py-4 flex items-center justify-center gap-2 text-sm font-semibold transition"
        style={{
          background: 'var(--color-bg-surface)',
          border: '2px dashed var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)'
          e.currentTarget.style.color = 'var(--color-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
      >
        <Plus className="w-4 h-4" />
        Adicionar etapa
      </button>

      {editing && (
        <StepEditorModal
          sequenceId={sequenceId}
          step={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onRefresh()
          }}
        />
      )}

      {creating && (
        <StepEditorModal
          sequenceId={sequenceId}
          step={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

function StepRow({
  step,
  isFirst,
  isLast,
  busy,
  onMove,
  onEdit,
  onDelete,
}: {
  step: any
  isFirst: boolean
  isLast: boolean
  busy: boolean
  onMove: (dir: 'up' | 'down') => void
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = step.channel === 'email' ? Mail : step.channel === 'call' ? Phone : MessageSquare
  const ExecIcon = step.execution_mode === 'automated' ? Bot : User
  const templatesCount = Array.isArray(step.message_templates) ? step.message_templates.length : 0

  return (
    <div
      className="rounded-xl overflow-hidden transition"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-stretch">
        {/* Side: position + move */}
        <div
          className="flex flex-col items-center justify-between py-3 px-2 gap-1"
          style={{
            background: 'var(--color-bg-elevated)',
            borderRight: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={() => onMove('up')}
            disabled={isFirst || busy}
            className="p-1 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => !isFirst && !busy && (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
            title="Mover pra cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
              color: 'var(--color-text-on-primary)',
            }}
          >
            {String(step.position).padStart(2, '0')}
          </div>
          <button
            onClick={() => onMove('down')}
            disabled={isLast || busy}
            className="p-1 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--color-text-tertiary)' }}
            title="Mover pra baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {step.title || `Etapa ${step.position}`}
                </h4>
                <Badge icon={<Icon className="w-3 h-3" />} tone="primary">
                  {CHANNEL_LABELS[step.channel as keyof typeof CHANNEL_LABELS]}
                </Badge>
                <Badge icon={<Clock className="w-3 h-3" />} tone="muted">
                  Dia {step.day_offset}
                </Badge>
                <Badge
                  icon={<ExecIcon className="w-3 h-3" />}
                  tone={step.execution_mode === 'automated' ? 'success' : 'muted'}
                >
                  {step.execution_mode === 'automated' ? `Auto · ${step.agent_slug}` : 'Manual'}
                </Badge>
                {templatesCount > 0 && (
                  <Badge icon={<FileText className="w-3 h-3" />} tone="muted">
                    {templatesCount} variação(ões)
                  </Badge>
                )}
              </div>
              {step.instruction && (
                <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  {step.instruction}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onEdit}
                disabled={busy}
                title="Editar"
                className="p-2 rounded-lg transition"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.color = 'var(--color-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                disabled={busy}
                title="Deletar"
                className="p-2 rounded-lg transition"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-danger, #ef4444)'
                  e.currentTarget.style.color = 'var(--color-danger, #ef4444)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
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
  tone: 'primary' | 'muted' | 'success'
}) {
  const bg =
    tone === 'primary' ? 'var(--color-primary-subtle)' :
    tone === 'success' ? 'rgba(16, 185, 129, 0.12)' :
    'var(--color-bg-elevated)'
  const fg =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'success' ? 'var(--color-success, #10b981)' :
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

// ═══════════════════════════════════════════════════════════════════════════════
// STEP EDITOR MODAL — formulário completo pra criar/editar step
// ═══════════════════════════════════════════════════════════════════════════════

interface Variant {
  variant: string
  label?: string
  body: string
  subject?: string
}

function StepEditorModal({
  sequenceId,
  step,
  onClose,
  onSaved,
}: {
  sequenceId: string
  step: any | null  // null = criar
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(step?.title ?? '')
  const [instruction, setInstruction] = useState(step?.instruction ?? '')
  const [dayOffset, setDayOffset] = useState<number>(step?.day_offset ?? 1)
  const [channel, setChannel] = useState<string>(step?.channel ?? 'whatsapp')
  const [executionMode, setExecutionMode] = useState<string>(step?.execution_mode ?? 'manual')
  const [agentSlug, setAgentSlug] = useState<string>(step?.agent_slug ?? 'bdr_email')
  const [assigneeMode, setAssigneeMode] = useState<string>(step?.assignee_mode ?? 'team_round_robin')
  const [assigneeRole, setAssigneeRole] = useState<string>(step?.assignee_role ?? '')
  const [variants, setVariants] = useState<Variant[]>(
    Array.isArray(step?.message_templates) ? step.message_templates : []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCall = channel === 'call'
  const isEmail = channel === 'email'

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        variant: String.fromCharCode(65 + prev.length),
        label: '',
        body: '',
        subject: isEmail ? '' : undefined,
      },
    ])
  }

  function updateVariant(idx: number, patch: Partial<Variant>) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)))
  }

  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload: any = {
        title: title || null,
        instruction: instruction || null,
        day_offset: dayOffset,
        channel,
        execution_mode: executionMode,
        agent_slug: executionMode === 'automated' ? agentSlug : null,
        assignee_mode: assigneeMode,
        assignee_role: assigneeMode === 'role_based' ? assigneeRole : null,
        message_templates: variants.filter((v) => v.variant && v.body),
      }

      const url = step
        ? `/api/prospection/sequences/${sequenceId}/steps/${step.id}`
        : `/api/prospection/sequences/${sequenceId}/steps`
      const method = step ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        return
      }
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'var(--color-bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {step ? 'Editar etapa' : 'Nova etapa'}
            </h3>
            {step && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Posição {step.position} · {step.channel}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Título + instrução */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
            <FormField label="Título" required>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Abordagem Dia 1"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Dia (offset)" hint="Dia relativo ao início">
              <input
                type="number"
                min={1}
                value={dayOffset}
                onChange={(e) => setDayOffset(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label="Instrução" hint="Nota pra quem executar a etapa">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={inputStyle}
            />
          </FormField>

          {/* Canal + execução */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Canal" required>
              <div className="grid grid-cols-3 gap-1.5">
                {(['whatsapp', 'email', 'call'] as const).map((c) => (
                  <ChannelChip
                    key={c}
                    active={channel === c}
                    onClick={() => setChannel(c)}
                    channel={c}
                  />
                ))}
              </div>
            </FormField>
            <FormField label="Execução" required>
              <div className="grid grid-cols-2 gap-1.5">
                <ModeChip active={executionMode === 'manual'} onClick={() => setExecutionMode('manual')} icon={<User className="w-3.5 h-3.5" />} label="Manual" />
                <ModeChip active={executionMode === 'automated'} onClick={() => setExecutionMode('automated')} icon={<Bot className="w-3.5 h-3.5" />} label="Automática" />
              </div>
            </FormField>
          </div>

          {executionMode === 'automated' && (
            <FormField label="Agente IA" hint="slug do agent que dispara esta etapa">
              <input
                type="text"
                value={agentSlug}
                onChange={(e) => setAgentSlug(e.target.value)}
                placeholder="bdr_email"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </FormField>
          )}

          {executionMode === 'manual' && (
            <FormField label="Quem executa" hint="Como atribuir a task">
              <div className="grid grid-cols-3 gap-1.5">
                <ModeChip active={assigneeMode === 'team_round_robin'} onClick={() => setAssigneeMode('team_round_robin')} icon={<Users className="w-3.5 h-3.5" />} label="Time todo" />
                <ModeChip active={assigneeMode === 'role_based'} onClick={() => setAssigneeMode('role_based')} icon={<User className="w-3.5 h-3.5" />} label="Por role" />
                <ModeChip active={assigneeMode === 'specific_user'} onClick={() => setAssigneeMode('specific_user')} icon={<User className="w-3.5 h-3.5" />} label="User fixo" />
              </div>
              {assigneeMode === 'role_based' && (
                <input
                  type="text"
                  value={assigneeRole}
                  onChange={(e) => setAssigneeRole(e.target.value)}
                  placeholder="slug do role (ex: vendedor)"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none mt-2"
                  style={inputStyle}
                />
              )}
            </FormField>
          )}

          {/* Variações */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Variações de mensagem
                </div>
                <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  Diferentes textos para rotacionar ou escolher no ato
                </div>
              </div>
              <button
                onClick={addVariant}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition"
                style={{
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary)',
                }}
              >
                <Plus className="w-3 h-3" />
                Adicionar variação
              </button>
            </div>
            <div className="space-y-2">
              {variants.length === 0 && (
                <div
                  className="rounded-lg py-4 text-center text-xs italic"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px dashed var(--color-border)',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  Sem variações ainda. Adicione pelo menos uma pra steps manuais.
                </div>
              )}
              {variants.map((v, idx) => (
                <VariantRow
                  key={idx}
                  variant={v}
                  isEmail={isEmail}
                  onChange={(p) => updateVariant(idx, p)}
                  onRemove={() => removeVariant(idx)}
                />
              ))}
            </div>
          </div>

          {error && (
            <div
              className="text-xs rounded-lg px-3 py-2"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger, #ef4444)',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          className="p-4 flex items-center justify-end gap-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg font-medium" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm rounded-lg font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-text-on-primary)',
            }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {step ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
}

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {label}
        </span>
        {required && <span className="text-[10px]" style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>}
      </div>
      {children}
      {hint && (
        <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function ChannelChip({
  channel,
  active,
  onClick,
}: {
  channel: 'whatsapp' | 'email' | 'call'
  active: boolean
  onClick: () => void
}) {
  const Icon = channel === 'email' ? Mail : channel === 'call' ? Phone : MessageSquare
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition"
      style={{
        background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
        fontWeight: active ? 600 : 500,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {CHANNEL_LABELS[channel]}
    </button>
  )
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition"
      style={{
        background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
        fontWeight: active ? 600 : 500,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function VariantRow({
  variant,
  isEmail,
  onChange,
  onRemove,
}: {
  variant: Variant
  isEmail: boolean
  onChange: (patch: Partial<Variant>) => void
  onRemove: () => void
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={variant.variant}
          onChange={(e) => onChange({ variant: e.target.value })}
          placeholder="A"
          className="w-16 rounded px-2 py-1 text-xs font-bold text-center focus:outline-none"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-primary)',
          }}
        />
        <input
          type="text"
          value={variant.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="rótulo (opcional, ex: Instagram direta)"
          className="flex-1 rounded px-2 py-1 text-xs focus:outline-none"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          onClick={onRemove}
          className="p-1.5 rounded transition"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger, #ef4444)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
          title="Remover variação"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {isEmail && (
        <input
          type="text"
          value={variant.subject || ''}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Assunto do email"
          className="w-full rounded px-2 py-1.5 text-xs focus:outline-none mb-2"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      )}
      <textarea
        value={variant.body}
        onChange={(e) => onChange({ body: e.target.value })}
        rows={4}
        placeholder="Conteúdo da mensagem. Para steps de WhatsApp com 2 envios, separe por '---' em linha própria."
        className="w-full rounded px-2 py-1.5 text-xs focus:outline-none font-mono resize-y"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          minHeight: 80,
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════

function RulesView({ rules }: { rules: any[] }) {
  if (rules.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px dashed var(--color-border)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)' }}
        >
          <Filter className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Nenhuma regra configurada
        </p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-tertiary)' }}>
          Sem regras, leads só entram via inscrição manual (botão "Inscrever leads" no topo).
        </p>
      </div>
    )
  }

  const eventLabel: Record<string, string> = {
    lead_created: 'Lead criado',
    stage_changed: 'Estágio mudou',
    stale_in_stage: 'Parado há muito tempo',
    tag_added: 'Tag adicionada',
    manual: 'Manual',
  }

  return (
    <div className="space-y-3">
      {rules.map((r) => (
        <div
          key={r.id}
          className="rounded-xl p-4"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {r.name}
                </h4>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    background: r.is_active
                      ? 'var(--color-primary-subtle)'
                      : 'var(--color-bg-elevated)',
                    color: r.is_active
                      ? 'var(--color-primary)'
                      : 'var(--color-text-tertiary)',
                  }}
                >
                  {r.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              {r.description && (
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {r.description}
                </p>
              )}
            </div>
            <span
              className="text-[10px] font-mono font-bold px-2 py-1 rounded flex-shrink-0"
              style={{
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-tertiary)',
                border: '1px solid var(--color-border)',
              }}
              title="Prioridade (menor = executada primeiro)"
            >
              P{r.priority}
            </span>
          </div>

          <div
            className="rounded-lg p-3 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3"
            style={{ background: 'var(--color-bg-elevated)' }}
          >
            <div>
              <div
                className="text-[10px] uppercase tracking-wider font-bold mb-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Evento
              </div>
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                style={{
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Zap className="w-3 h-3" />
                {eventLabel[r.trigger_event] || r.trigger_event}
              </span>
            </div>
            <div>
              <div
                className="text-[10px] uppercase tracking-wider font-bold mb-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Condições
              </div>
              {r.conditions && Object.keys(r.conditions).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(r.conditions).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded"
                      style={{
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <span style={{ color: 'var(--color-text-tertiary)' }}>{k}:</span>
                      <span style={{ color: 'var(--color-text-primary)' }}>
                        {Array.isArray(v) ? v.join(', ') : String(v)}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs italic" style={{ color: 'var(--color-text-tertiary)' }}>
                  Sem condições (aceita qualquer lead)
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EnrollmentsView({ enrollments }: { enrollments: any[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'exited'>('all')
  const [search, setSearch] = useState('')

  const filtered = enrollments.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (search) {
      const lead = Array.isArray(e.lead) ? e.lead[0] : e.lead
      const haystack = `${lead?.name || ''} ${lead?.phone || ''} ${lead?.email || ''}`.toLowerCase()
      if (!haystack.includes(search.toLowerCase())) return false
    }
    return true
  })

  const counts = {
    all: enrollments.length,
    active: enrollments.filter((e) => e.status === 'active').length,
    paused: enrollments.filter((e) => e.status === 'paused').length,
    completed: enrollments.filter((e) => e.status === 'completed').length,
    exited: enrollments.filter((e) => e.status === 'exited').length,
  }

  if (enrollments.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px dashed var(--color-border)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)' }}
        >
          <Users className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Nenhum lead inscrito ainda
        </p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-tertiary)' }}>
          Clique em "Inscrever leads" no topo para começar a adicionar leads nesta sequence.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: filtros de status + busca */}
      <div
        className="rounded-xl p-3 flex items-center gap-2 flex-wrap"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <StatusPill label="Todos" count={counts.all} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <StatusPill label="Ativos" count={counts.active} tone="primary" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} />
        <StatusPill label="Pausados" count={counts.paused} tone="warning" active={statusFilter === 'paused'} onClick={() => setStatusFilter('paused')} />
        <StatusPill label="Concluídos" count={counts.completed} tone="success" active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} />
        {counts.exited > 0 && (
          <StatusPill label="Saíram" count={counts.exited} tone="danger" active={statusFilter === 'exited'} onClick={() => setStatusFilter('exited')} />
        )}
        <div className="flex-1 min-w-[180px]">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-tertiary)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome, telefone, email..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center text-sm italic"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px dashed var(--color-border)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Nenhum lead com esses filtros.
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((e) => {
            const lead = Array.isArray(e.lead) ? e.lead[0] : e.lead
            return <EnrollmentRow key={e.id} enrollment={e} lead={lead} />
          })}
        </div>
      )}
    </div>
  )
}

function StatusPill({
  label,
  count,
  tone,
  active,
  onClick,
}: {
  label: string
  count: number
  tone?: 'primary' | 'warning' | 'success' | 'danger'
  active: boolean
  onClick: () => void
}) {
  const color =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'warning' ? 'var(--color-warning, #f59e0b)' :
    tone === 'success' ? 'var(--color-success, #10b981)' :
    tone === 'danger' ? 'var(--color-danger, #ef4444)' :
    'var(--color-text-primary)'
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
      style={{
        background: active ? color : 'var(--color-bg-elevated)',
        color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
        border: `1px solid ${active ? color : 'var(--color-border)'}`,
      }}
    >
      {label}
      <span
        className="text-[10px] font-bold px-1.5 rounded"
        style={{
          background: active ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-surface)',
          color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-tertiary)',
        }}
      >
        {count}
      </span>
    </button>
  )
}

function EnrollmentRow({ enrollment, lead }: { enrollment: any; lead: any }) {
  const name = lead?.name && String(lead.name).trim() ? lead.name : '—'
  const initial = (name && name !== '—' ? name.charAt(0) : '?').toUpperCase()
  const sub = lead?.phone ?? lead?.email ?? ''

  const statusTone =
    enrollment.status === 'active' ? { bg: 'var(--color-primary-subtle)', color: 'var(--color-primary)', label: 'Ativo' } :
    enrollment.status === 'paused' ? { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--color-warning, #f59e0b)', label: 'Pausado' } :
    enrollment.status === 'completed' ? { bg: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success, #10b981)', label: 'Concluído' } :
    { bg: 'rgba(239, 68, 68, 0.12)', color: 'var(--color-danger, #ef4444)', label: 'Saiu' }

  return (
    <Link
      href={`/dashboard/crm/${enrollment.lead_id}`}
      className="rounded-xl p-3 flex items-center gap-3 transition group"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
          color: 'var(--color-text-on-primary)',
        }}
      >
        {initial}
      </div>

      {/* Name + sub */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
          {name}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
          {sub}
        </div>
      </div>

      {/* Step */}
      <div
        className="hidden sm:flex flex-col items-center px-3 flex-shrink-0"
        style={{ borderLeft: '1px solid var(--color-border)' }}
      >
        <span
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Etapa
        </span>
        <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {enrollment.current_step_position}
        </span>
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{ background: statusTone.bg, color: statusTone.color }}
        >
          {statusTone.label}
        </span>
      </div>

      {/* Date */}
      <div
        className="text-xs text-right hidden md:block flex-shrink-0 min-w-[110px]"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {formatRelative(enrollment.enrolled_at)}
      </div>

      {/* Arrow */}
      <ArrowRight
        className="w-4 h-4 flex-shrink-0 transition group-hover:translate-x-0.5"
        style={{ color: 'var(--color-text-tertiary)' }}
      />
    </Link>
  )
}

function formatRelative(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays < 7) return `há ${diffDays}d`
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK ENROLL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG VIEW — edita comportamento da sequence (pause_on_stages etc)
// ═══════════════════════════════════════════════════════════════════════════════

function ConfigView({ sequence, onSaved }: { sequence: any; onSaved: () => void }) {
  const [stages, setStages] = useState<{ value: string; label: string; color?: string }[]>([])
  const [pauseOnStages, setPauseOnStages] = useState<string[]>(sequence.pause_on_stages || [])
  const [exitOnReply, setExitOnReply] = useState<boolean>(sequence.exit_on_reply ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/prospection/leads-picker/filters')
      .then((r) => r.json())
      .then((json) => setStages(json.stages || []))
      .catch(() => {})
  }, [])

  const dirty =
    JSON.stringify([...pauseOnStages].sort()) !==
      JSON.stringify([...(sequence.pause_on_stages || [])].sort()) ||
    exitOnReply !== (sequence.exit_on_reply ?? true)

  function toggleStage(value: string) {
    setPauseOnStages((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/prospection/sequences/${sequence.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pause_on_stages: pauseOnStages,
          exit_on_reply: exitOnReply,
        }),
      })
      if (res.ok) {
        setSaved(true)
        onSaved()
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Card 1 · Pausa por mudança de estágio */}
      <ConfigCard
        icon={<AlertTriangle className="w-4 h-4" />}
        tone="warning"
        title="Pausar por mudança de estágio"
        subtitle="Quando o lead muda para um dos estágios selecionados, o enrollment pausa automaticamente e vai pra coluna Responderam no Meu Dia."
      >
        {stages.length === 0 ? (
          <div
            className="text-xs italic flex items-center gap-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Carregando estágios do pipeline...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => {
                const active = pauseOnStages.includes(s.value)
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleStage(s.value)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition"
                    style={{
                      background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                      border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      color: active ? 'var(--color-text-on-primary)' : 'var(--color-text-secondary)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {s.color && !active && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: s.color }}
                      />
                    )}
                    {s.label}
                  </button>
                )
              })}
            </div>

            {pauseOnStages.length > 0 ? (
              <div
                className="mt-3 rounded-lg p-3 text-xs"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="flex items-center gap-1.5 mb-1"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-bold">Cadência pausará ao atingir:</span>
                </div>
                <div
                  className="font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {pauseOnStages
                    .map((v) => stages.find((s) => s.value === v)?.label || v)
                    .join(' · ')}
                </div>
              </div>
            ) : (
              <div
                className="mt-3 text-xs italic"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Nenhum estágio selecionado. Selecione os estágios que indicam avanço do lead (ex: "Lead respondeu", "Qualificado", "Venda cerrada").
              </div>
            )}
          </>
        )}
      </ConfigCard>

      {/* Card 2 · Pausa automática por resposta WhatsApp */}
      <ConfigCard
        icon={<MessageSquare className="w-4 h-4" />}
        tone="primary"
        title="Pausa automática por resposta WhatsApp"
        subtitle="Exige webhook do WhatsApp conectado. Quando o lead responder, o enrollment pausa."
      >
        <ToggleRow
          checked={exitOnReply}
          onChange={setExitOnReply}
          label="Pausar quando o lead responder"
          hint={
            exitOnReply
              ? 'Ativo · toda mensagem inbound vai disparar a pausa automaticamente'
              : 'Desligado · apenas mudança de estágio pausa a cadência'
          }
        />
      </ConfigCard>

      {/* Save bar sticky */}
      <div
        className="sticky bottom-4 z-10 rounded-xl p-3 flex items-center justify-between gap-3"
        style={{
          background: dirty ? 'var(--color-bg-surface)' : 'transparent',
          border: dirty ? '1px solid var(--color-primary)' : '1px solid transparent',
          boxShadow: dirty ? '0 12px 24px -8px rgba(0,0,0,0.25)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {dirty ? (
            <>
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
              Alterações não salvas
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success, #10b981)' }} />
              <span style={{ color: 'var(--color-success, #10b981)' }}>Salvo</span>
            </>
          ) : (
            <span>Configuração atualizada</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-text-on-primary)',
          }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar configuração
        </button>
      </div>
    </div>
  )
}

function ConfigCard({
  icon,
  tone,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  tone: 'primary' | 'warning' | 'success'
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const color =
    tone === 'primary' ? 'var(--color-primary)' :
    tone === 'warning' ? 'var(--color-warning, #f59e0b)' :
    'var(--color-success, #10b981)'
  const subtleBg =
    tone === 'primary' ? 'var(--color-primary-subtle)' :
    tone === 'warning' ? 'rgba(245, 158, 11, 0.12)' :
    'rgba(16, 185, 129, 0.12)'

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="p-5 flex items-start gap-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: subtleBg, color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function ToggleRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 text-left transition"
    >
      <div
        className="flex-shrink-0 mt-0.5 relative w-10 h-5 rounded-full transition"
        style={{
          background: checked ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
          border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
        }}
      >
        <span
          className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all"
          style={{
            background: checked ? 'white' : 'var(--color-text-tertiary)',
            left: checked ? 'calc(100% - 16px)' : '2px',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </div>
        {hint && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {hint}
          </div>
        )}
      </div>
    </button>
  )
}

interface FilterOption { value: string; label: string; color?: string }
interface FilterMeta {
  stages: FilterOption[]
  sources: FilterOption[]
  nichos: FilterOption[]
  cities: FilterOption[]
}

function BulkEnrollModal({
  sequenceId,
  steps,
  onClose,
  onDone,
}: {
  sequenceId: string
  steps: any[]
  onClose: () => void
  onDone: () => void
}) {
  const [leads, setLeads] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [startingStep, setStartingStep] = useState<number>(1)

  // Filtros
  const [meta, setMeta] = useState<FilterMeta>({ stages: [], sources: [], nichos: [], cities: [] })
  const [fStages, setFStages] = useState<Set<string>>(new Set())
  const [fSources, setFSources] = useState<Set<string>>(new Set())
  const [fNichos, setFNichos] = useState<Set<string>>(new Set())
  const [fCity, setFCity] = useState('')
  const [fInteresse, setFInteresse] = useState('')
  const [onlyEligible, setOnlyEligible] = useState(true)

  const activeFilters =
    fStages.size + fSources.size + fNichos.size + (fCity ? 1 : 0) + (fInteresse ? 1 : 0)

  // Carrega meta (filtros disponíveis) uma vez
  useEffect(() => {
    fetch('/api/prospection/leads-picker/filters')
      .then((r) => r.json())
      .then((data) => setMeta(data))
      .catch(console.error)
  }, [])

  async function fetchLeads() {
    setLoading(true)
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    fStages.forEach((v) => qs.append('stage', v))
    fSources.forEach((v) => qs.append('source', v))
    fNichos.forEach((v) => qs.append('nicho', v))
    if (fCity) qs.set('city', fCity)
    if (fInteresse) qs.set('interesse', fInteresse)
    if (onlyEligible) qs.set('only_eligible', '1')
    qs.set('limit', '200')

    const res = await fetch(`/api/prospection/leads-picker?${qs.toString()}`)
    const json = await res.json()
    setLeads(json.leads || [])
    setHasMore(json.has_more || false)
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fStages, fSources, fNichos, fCity, fInteresse, onlyEligible])

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleSet(setState: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    setState((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function clearFilters() {
    setFStages(new Set())
    setFSources(new Set())
    setFNichos(new Set())
    setFCity('')
    setFInteresse('')
    setSearch('')
  }

  function toggleAllVisible() {
    const eligible = leads.filter((l) => !l.has_active_enrollment).map((l) => l.id)
    if (eligible.every((id) => selected.has(id))) {
      const next = new Set(selected)
      eligible.forEach((id) => next.delete(id))
      setSelected(next)
    } else {
      const next = new Set(selected)
      eligible.forEach((id) => next.add(id))
      setSelected(next)
    }
  }

  async function handleConfirm() {
    if (selected.size === 0) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/prospection/enrollments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence_id: sequenceId,
          lead_ids: Array.from(selected),
          starting_step_position: startingStep,
        }),
      })
      const json = await res.json()
      setResult(json)
      if (!json.error) {
        setTimeout(() => {
          onDone()
          onClose()
        }, 1400)
      }
    } catch (e: any) {
      setResult({ error: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const eligibleVisible = leads.filter((l) => !l.has_active_enrollment).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'var(--color-bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Inscrever leads na sequence
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Use os filtros para encontrar leads. Os que já estão em outra sequence ativa ficam bloqueados.
            </p>
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

        {/* Seletor de etapa inicial */}
        <div
          className="px-5 py-3 flex items-center gap-3 flex-wrap"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
          }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Começar a partir da
          </span>
          <select
            value={startingStep}
            onChange={(e) => setStartingStep(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded text-xs font-semibold focus:outline-none"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {steps.map((s: any) => (
              <option key={s.id} value={s.position}>
                Etapa {s.position} · {s.title || s.channel}
                {s.day_offset > 0 ? ` (dia ${s.day_offset})` : ''}
              </option>
            ))}
          </select>
          {startingStep > 1 && (
            <span
              className="text-[11px] flex items-center gap-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Zap className="w-3 h-3" />
              Começa imediatamente ao inscrever
            </span>
          )}
        </div>

        {/* Filtros */}
        <div
          className="p-4 space-y-3"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-subtle)',
          }}
        >
          {/* Busca + contador de filtros + limpar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            {(activeFilters > 0 || search) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <RotateCcw className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Grupos de filtros */}
          <FilterGroup
            label="Estágio"
            options={meta.stages}
            selected={fStages}
            onToggle={(v) => toggleSet(setFStages, v)}
          />
          <FilterGroup
            label="Origem"
            options={meta.sources}
            selected={fSources}
            onToggle={(v) => toggleSet(setFSources, v)}
          />
          {meta.nichos.length > 0 && (
            <FilterGroup
              label="Nicho do lead"
              options={meta.nichos}
              selected={fNichos}
              onToggle={(v) => toggleSet(setFNichos, v)}
            />
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {meta.cities.length > 0 && (
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Cidade
                </span>
                <select
                  value={fCity}
                  onChange={(e) => setFCity(e.target.value)}
                  className="px-2 py-1 rounded text-xs focus:outline-none"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="">Todas</option>
                  {meta.cities.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Interesse
              </span>
              <select
                value={fInteresse}
                onChange={(e) => setFInteresse(e.target.value)}
                className="px-2 py-1 rounded text-xs focus:outline-none"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Todos</option>
                <option value="compra">Compra</option>
                <option value="locacao">Locação</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs ml-auto">
              <input
                type="checkbox"
                checked={onlyEligible}
                onChange={(e) => setOnlyEligible(e.target.checked)}
                className="accent-[var(--color-primary)]"
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Esconder leads já em outra sequence
              </span>
            </label>
          </div>
        </div>

        {/* Toolbar */}
        <div
          className="px-4 py-2.5 flex items-center justify-between text-xs"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
          }}
        >
          <button
            onClick={toggleAllVisible}
            disabled={eligibleVisible === 0}
            className="font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: eligibleVisible ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}
          >
            {eligibleVisible > 0
              ? `Selecionar todos visíveis (${eligibleVisible})`
              : 'Nenhum elegível visível'}
          </button>
          <div className="flex items-center gap-3" style={{ color: 'var(--color-text-tertiary)' }}>
            <span>{leads.length} leads{hasMore ? '+' : ''}</span>
            {selected.size > 0 && (
              <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                {selected.size} selecionado(s)
              </span>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : leads.length === 0 ? (
            <div
              className="text-center py-12 text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Nenhum lead encontrado com esses filtros.
            </div>
          ) : (
            <div>
              {leads.map((l) => {
                const isActive = l.has_active_enrollment
                const isSelected = selected.has(l.id)
                return (
                  <button
                    key={l.id}
                    onClick={() => !isActive && toggle(l.id)}
                    disabled={isActive}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition disabled:cursor-not-allowed"
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: isActive
                        ? 'var(--color-bg-subtle)'
                        : isSelected
                          ? 'var(--color-primary-subtle)'
                          : 'transparent',
                      opacity: isActive ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isSelected) {
                        e.currentTarget.style.background = 'var(--color-bg-hover)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !isSelected) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition"
                      style={{
                        background: isSelected && !isActive ? 'var(--color-primary)' : 'transparent',
                        border: `2px solid ${
                          isSelected && !isActive ? 'var(--color-primary)' : 'var(--color-border)'
                        }`,
                      }}
                    >
                      {isSelected && !isActive && (
                        <Check className="w-3 h-3" style={{ color: 'var(--color-text-on-primary)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold text-sm truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {l.name && String(l.name).trim() ? l.name : '—'}
                      </div>
                      <div
                        className="text-xs truncate"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {l.phone ?? l.email ?? ''}
                        {l.source && <span className="ml-2">· {l.source}</span>}
                        {l.stage && <span className="ml-1">· {l.stage}</span>}
                        {l.nicho && <span className="ml-1">· {l.nicho}</span>}
                      </div>
                    </div>
                    {isActive && (
                      <span
                        className="text-[10px] font-bold uppercase flex-shrink-0"
                        style={{ color: 'var(--color-warning, #f59e0b)' }}
                      >
                        em sequence
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Resultado */}
        {result && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              background: result.error
                ? 'var(--color-danger-subtle, rgba(239, 68, 68, 0.1))'
                : 'var(--color-success-subtle, rgba(16, 185, 129, 0.1))',
              color: result.error
                ? 'var(--color-danger, #ef4444)'
                : 'var(--color-success, #10b981)',
            }}
          >
            {result.error ? (
              <>
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {result.error}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                {result.enrolled} inscrito(s) · {result.skipped} ignorado(s)
              </>
            )}
          </div>
        )}

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
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0 || submitting}
            className="px-4 py-2 text-sm rounded-lg font-semibold transition inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-text-on-primary)',
            }}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Inscrever {selected.size} lead(s)
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: FilterOption[]
  selected: Set<string>
  onToggle: (value: string) => void
}) {
  if (options.length === 0) return null

  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span
        className="text-[11px] font-bold uppercase tracking-wider pt-1.5 flex-shrink-0"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((o) => {
          const active = selected.has(o.value)
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition"
              style={{
                background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color: active
                  ? 'var(--color-text-on-primary)'
                  : 'var(--color-text-secondary)',
                fontWeight: active ? 600 : 500,
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
