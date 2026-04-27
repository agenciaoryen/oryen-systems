// Lista de sequences com visual premium Oryen + criação de nova + duplicação.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Rocket, Plus, Loader2, ChevronRight, MessageSquare, Mail, Phone, Users, Copy,
  X, Sparkles, CheckCircle2, Activity, ArrowRight, Archive, ArchiveRestore, Trash2, AlertTriangle,
} from 'lucide-react'
import { CHANNEL_LABELS } from '@/lib/prospection/types'

interface SequenceRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  exit_on_reply: boolean
  steps: { id: string; position: number; day_offset: number; channel: string; title: string | null; execution_mode: string }[]
  rules: { id: string; name: string; trigger_event: string; is_active: boolean; priority: number }[]
  active_count: number
}

export default function SequencesPage() {
  const router = useRouter()
  const [sequences, setSequences] = useState<SequenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState<SequenceRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SequenceRow | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/prospection/sequences')
      const data = await res.json()
      setSequences(data.sequences || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function toggleArchive(seq: SequenceRow) {
    setBusyId(seq.id)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/prospection/sequences/${seq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !seq.is_active }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao alterar')
      }
      await fetchData()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteSequence(seq: SequenceRow, force = false) {
    setBusyId(seq.id)
    setErrorMsg(null)
    try {
      const url = `/api/prospection/sequences/${seq.id}${force ? '?force=true' : ''}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao excluir')
      }
      setConfirmDelete(null)
      await fetchData()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function archiveAndClose(seq: SequenceRow) {
    setBusyId(seq.id)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/prospection/sequences/${seq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao arquivar')
      }
      setConfirmDelete(null)
      await fetchData()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div
        className="rounded-2xl mb-6 overflow-hidden relative"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Decorative gradient blob */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
          }}
        />
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 relative">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
                boxShadow: '0 12px 30px -10px var(--color-primary)',
              }}
            >
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1
                  className="text-2xl md:text-3xl font-bold tracking-tight"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Sequences
                </h1>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{
                    background: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                  }}
                >
                  Prospecção
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                Templates de cadência multi-canal. Crie do zero, duplique um existente ou edite o padrão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/prospection/my-day"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              ← Meu Dia
            </Link>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-on-primary)',
                boxShadow: '0 4px 12px -4px var(--color-primary)',
              }}
            >
              <Plus className="w-4 h-4" />
              Nova sequence
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      {sequences.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <Rocket className="w-7 h-7" />
          </div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Nenhuma sequence ainda
          </h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text-tertiary)' }}>
            Crie sua primeira cadência de prospecção pra começar a inscrever leads.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-text-on-primary)',
            }}
          >
            <Plus className="w-4 h-4" />
            Criar sequence
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {errorMsg && (
            <div
              className="rounded-lg px-3 py-2 text-sm flex items-center gap-2"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                className="ml-auto text-xs underline"
              >
                fechar
              </button>
            </div>
          )}
          {sequences.map((s) => (
            <SequenceCard
              key={s.id}
              sequence={s}
              busy={busyId === s.id}
              onDuplicate={() => setDuplicateSource(s)}
              onToggleArchive={() => toggleArchive(s)}
              onDelete={() => setConfirmDelete(s)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSequenceModal
          duplicateOf={null}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            router.push(`/dashboard/prospection/sequences/${id}`)
          }}
        />
      )}

      {duplicateSource && (
        <CreateSequenceModal
          duplicateOf={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onCreated={(id) => {
            setDuplicateSource(null)
            router.push(`/dashboard/prospection/sequences/${id}`)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          sequence={confirmDelete}
          busy={busyId === confirmDelete.id}
          onClose={() => setConfirmDelete(null)}
          onArchive={() => archiveAndClose(confirmDelete)}
          onConfirmDelete={(force) => deleteSequence(confirmDelete, force)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════

function SequenceCard({
  sequence,
  busy,
  onDuplicate,
  onToggleArchive,
  onDelete,
}: {
  sequence: SequenceRow
  busy: boolean
  onDuplicate: () => void
  onToggleArchive: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden group transition"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="p-5 relative">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3
                className="font-bold text-base truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {sequence.name}
              </h3>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: sequence.is_active
                    ? 'var(--color-primary-subtle)'
                    : 'var(--color-bg-elevated)',
                  color: sequence.is_active
                    ? 'var(--color-primary)'
                    : 'var(--color-text-tertiary)',
                }}
              >
                {sequence.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            {sequence.description && (
              <p
                className="text-xs line-clamp-2"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {sequence.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onDuplicate}
              disabled={busy}
              title="Duplicar esta sequence"
              className="p-2 rounded-lg transition disabled:opacity-50"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (busy) return
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.color = 'var(--color-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleArchive}
              disabled={busy}
              title={sequence.is_active ? 'Arquivar (pausa nova inscrição via regras)' : 'Reativar'}
              className="p-2 rounded-lg transition disabled:opacity-50"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (busy) return
                e.currentTarget.style.borderColor = '#f59e0b'
                e.currentTarget.style.color = '#f59e0b'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
            >
              {sequence.is_active ? (
                <Archive className="w-3.5 h-3.5" />
              ) : (
                <ArchiveRestore className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              title="Excluir sequence"
              className="p-2 rounded-lg transition disabled:opacity-50"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (busy) return
                e.currentTarget.style.borderColor = '#ef4444'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
            <Link
              href={`/dashboard/prospection/sequences/${sequence.id}`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-text-on-primary)',
              }}
            >
              Editar
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Timeline de steps */}
        <StepTimeline steps={sequence.steps} />

        {/* Stats footer */}
        <div
          className="flex items-center gap-4 pt-3 mt-4 flex-wrap"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <Metric icon={<Sparkles className="w-3 h-3" />} label="Etapas" value={sequence.steps.length} />
          <Metric icon={<CheckCircle2 className="w-3 h-3" />} label="Regras" value={sequence.rules.filter(r => r.is_active).length} />
          <Metric icon={<Users className="w-3 h-3" />} label="Ativos" value={sequence.active_count} highlight />
        </div>
      </div>
    </div>
  )
}

function StepTimeline({ steps }: { steps: SequenceRow['steps'] }) {
  if (steps.length === 0) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs italic"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px dashed var(--color-border)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Nenhuma etapa configurada. Clica em "Editar" pra adicionar.
      </div>
    )
  }

  const sorted = [...steps].sort((a, b) => a.position - b.position)

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {sorted.map((step, i) => {
        const Icon =
          step.channel === 'email' ? Mail :
          step.channel === 'call' ? Phone :
          MessageSquare
        return (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
              }}
              title={step.title || step.channel}
            >
              <Icon
                className="w-3 h-3"
                style={{ color: 'var(--color-primary)' }}
              />
              <span
                className="text-[10px] font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                D{step.day_offset}
              </span>
              {step.title && (
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  · {step.title}
                </span>
              )}
            </div>
            {i < sorted.length - 1 && (
              <ChevronRight
                className="w-3 h-3 flex-shrink-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex items-center justify-center w-5 h-5 rounded"
        style={{
          background: 'var(--color-bg-elevated)',
          color: highlight ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
        }}
      >
        {icon}
      </span>
      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
        {label}:
      </span>
      <span
        className="text-xs font-bold"
        style={{
          color: highlight && value > 0 ? 'var(--color-primary)' : 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════

function ConfirmDeleteModal({
  sequence,
  busy,
  onClose,
  onArchive,
  onConfirmDelete,
}: {
  sequence: SequenceRow
  busy: boolean
  onClose: () => void
  onArchive: () => void
  onConfirmDelete: (force: boolean) => void
}) {
  const [typed, setTyped] = useState('')
  const hasActive = sequence.active_count > 0
  const canConfirm = typed.trim() === sequence.name && !busy

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'var(--color-bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-lg w-full shadow-2xl"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-5 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
              }}
            >
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Excluir sequence?
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Os leads <strong>não</strong> são afetados — só a inscrição deles nesta cadência.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {hasActive && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs flex items-start gap-2"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <div>
                <div className="font-semibold mb-1" style={{ color: '#f59e0b' }}>
                  {sequence.active_count} lead(s) ativo(s) nesta sequence
                </div>
                <div>
                  Você pode apenas <strong>arquivar</strong> (impede novas inscrições, mas mantém
                  histórico) ou <strong>excluir mesmo assim</strong> (remove inscrições, tasks e
                  histórico desta cadência — leads ficam intactos).
                </div>
              </div>
            </div>
          )}

          <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            O que vai ser apagado: steps, regras de inscrição, enrollments, tasks pendentes e log de
            execuções. <strong>Não</strong> mexe em <code>leads.stage</code>, dados do lead nem
            histórico de mensagens.
          </div>

          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Para confirmar exclusão, digite o nome exato:
          </div>
          <div
            className="rounded-lg px-3 py-2 text-sm font-mono"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {sequence.name}
          </div>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Digite aqui o nome da sequence"
            autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div
          className="p-4 flex items-center justify-between gap-2 flex-wrap"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg font-medium transition disabled:opacity-50"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Cancelar
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {hasActive && sequence.is_active && (
              <button
                onClick={onArchive}
                disabled={busy}
                className="px-3 py-2 text-sm rounded-lg font-semibold transition inline-flex items-center gap-1.5 disabled:opacity-50"
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#f59e0b',
                }}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                Apenas arquivar
              </button>
            )}
            <button
              onClick={() => onConfirmDelete(hasActive)}
              disabled={!canConfirm}
              className="px-4 py-2 text-sm rounded-lg font-semibold transition inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#ef4444',
                color: '#fff',
              }}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {hasActive ? 'Excluir mesmo assim' : 'Excluir definitivamente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateSequenceModal({
  duplicateOf,
  onClose,
  onCreated,
}: {
  duplicateOf: SequenceRow | null
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState(
    duplicateOf ? `${duplicateOf.name} (cópia)` : ''
  )
  const [description, setDescription] = useState(
    duplicateOf?.description ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) {
      setError('Dê um nome para a sequence')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/prospection/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          duplicate_of: duplicateOf?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar')
        return
      }
      onCreated(data.sequence.id)
    } catch (e: any) {
      setError(e.message || 'Erro ao criar')
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
        className="rounded-2xl max-w-md w-full shadow-2xl"
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
              {duplicateOf ? 'Duplicar sequence' : 'Nova sequence'}
            </h3>
            {duplicateOf && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Vai clonar todos os steps de "{duplicateOf.name}" pra a nova.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Nome *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prospecção Cold 5 Dias"
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo desta cadência..."
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg font-medium transition"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm rounded-lg font-semibold transition inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-text-on-primary)',
            }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {duplicateOf ? 'Duplicar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
