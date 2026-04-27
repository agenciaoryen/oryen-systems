// /dashboard/prospection/team
// Admin only — gerencia daily_task_capacity de cada user da org.
// capacity=0 => user não recebe tarefas de prospecção (opt-out).

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, Loader2, ArrowLeft, Save, Check, AlertTriangle,
  ToggleLeft, ToggleRight, ArrowRightLeft, X,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

type TeamUser = {
  id: string
  full_name: string | null
  email: string
  role: string
  status?: string | null
  daily_task_capacity: number
  open_tasks: number
  today_tasks: number
}

export default function ProspectionTeamPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'staff'

  const [team, setTeam] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [transferFrom, setTransferFrom] = useState<TeamUser | null>(null)

  async function fetchTeam() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prospection/team')
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao carregar time')
      }
      const json = await res.json()
      setTeam(json.users || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  async function saveCapacity(userId: string, capacity: number) {
    setSavingId(userId)
    setError(null)
    try {
      const res = await fetch('/api/prospection/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, capacity }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao salvar')
      }
      setTeam((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, daily_task_capacity: capacity } : u))
      )
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      setSavedId(userId)
      setTimeout(() => setSavedId(null), 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
        <p className="text-sm text-muted-foreground">Apenas admin pode gerenciar capacidade do time.</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/dashboard/prospection/my-day"
        className="inline-flex items-center gap-1 text-xs mb-3"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <ArrowLeft className="w-3 h-3" /> Voltar pro Meu Dia
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
          }}
        >
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Capacidade do Time
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Defina quantas tarefas diárias cada colaborador recebe. Use 0 (opt-out) para excluir alguém da fila.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="mt-4 mb-4 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {team.map((u) => {
            const draft = drafts[u.id]
            const value = draft ?? u.daily_task_capacity
            const dirty = draft !== undefined && draft !== u.daily_task_capacity
            const isOptOut = value === 0
            const isSaving = savingId === u.id
            const isSaved = savedId === u.id

            return (
              <div
                key={u.id}
                className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: u.status === 'inactive' ? 0.55 : 1,
                }}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {u.full_name || u.email}
                    {u.status === 'inactive' && (
                      <span
                        className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)' }}
                      >
                        inativo
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--color-text-tertiary)' }}>
                    <span>{u.email}</span>
                    <span>·</span>
                    <span className="capitalize">{u.role}</span>
                    <span>·</span>
                    <span>{u.open_tasks} abertas</span>
                    <span>·</span>
                    <span>{u.today_tasks} hoje</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {u.open_tasks > 0 && (
                    <button
                      onClick={() => setTransferFrom(u)}
                      title="Transferir tasks abertas para outro user"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
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
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Transferir
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const next = isOptOut ? 50 : 0
                      setDrafts((p) => ({ ...p, [u.id]: next }))
                    }}
                    title={isOptOut ? 'Reativar (50)' : 'Opt-out (0)'}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                    style={{
                      background: isOptOut ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-bg-elevated)',
                      border: `1px solid ${isOptOut ? 'rgba(245, 158, 11, 0.35)' : 'var(--color-border)'}`,
                      color: isOptOut ? '#f59e0b' : 'var(--color-text-secondary)',
                    }}
                  >
                    {isOptOut ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                    {isOptOut ? 'Opt-out' : 'Recebe tasks'}
                  </button>

                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={value}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(500, Number(e.target.value) || 0))
                      setDrafts((p) => ({ ...p, [u.id]: n }))
                    }}
                    className="w-20 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none"
                    style={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    /dia
                  </span>

                  <button
                    onClick={() => saveCapacity(u.id, value)}
                    disabled={!dirty || isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: isSaved ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-primary)',
                      color: isSaved ? '#10b981' : 'var(--color-text-on-primary, #fff)',
                      border: '1px solid transparent',
                    }}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaved ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSaved ? 'Salvo' : 'Salvar'}
                  </button>
                </div>
              </div>
            )
          })}

          {team.length === 0 && (
            <div
              className="rounded-xl p-8 text-center text-sm"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              Nenhum colaborador encontrado.
            </div>
          )}
        </div>
      )}

      {transferFrom && (
        <TransferTasksModal
          fromUser={transferFrom}
          team={team.filter((u) => u.id !== transferFrom.id)}
          onClose={() => setTransferFrom(null)}
          onTransferred={() => {
            setTransferFrom(null)
            fetchTeam()
          }}
        />
      )}
    </div>
  )
}

type StepGroup = {
  step_id: string
  step_position: number
  step_title: string | null
  step_channel: string
  sequence_id: string
  sequence_name: string
  count: number
}

function TransferTasksModal({
  fromUser,
  team,
  onClose,
  onTransferred,
}: {
  fromUser: TeamUser
  team: TeamUser[]
  onClose: () => void
  onTransferred: () => void
}) {
  const eligibleTeam = team.filter((u) => u.daily_task_capacity > 0 && u.status !== 'inactive')
  const [toUserId, setToUserId] = useState<string>(eligibleTeam[0]?.id || '')
  const [count, setCount] = useState<number>(Math.min(10, fromUser.open_tasks))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [stepGroups, setStepGroups] = useState<StepGroup[]>([])
  const [loadingSteps, setLoadingSteps] = useState(true)
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set())

  // Carrega quais steps esse user tem tasks abertas. Inicialmente todos selecionados.
  useEffect(() => {
    let cancelled = false
    setLoadingSteps(true)
    fetch(`/api/prospection/tasks/reassign?user_id=${fromUser.id}`)
      .then((r) => (r.ok ? r.json() : { steps: [] }))
      .then((j) => {
        if (cancelled) return
        const steps: StepGroup[] = j.steps || []
        setStepGroups(steps)
        setSelectedStepIds(new Set(steps.map((s) => s.step_id)))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSteps(false)
      })
    return () => { cancelled = true }
  }, [fromUser.id])

  // Total disponível dado o filtro de steps selecionado
  const allSelected = selectedStepIds.size === stepGroups.length && stepGroups.length > 0
  const availableForSelection = allSelected
    ? fromUser.open_tasks
    : stepGroups
        .filter((s) => selectedStepIds.has(s.step_id))
        .reduce((acc, s) => acc + s.count, 0)

  // Ajusta count se o filtro reduzir o disponível
  useEffect(() => {
    if (count > availableForSelection && availableForSelection > 0) {
      setCount(availableForSelection)
    }
    if (availableForSelection === 0) {
      setCount(0)
    }
  }, [availableForSelection]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleStep(stepId: string) {
    setSelectedStepIds((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  function toggleAll() {
    if (selectedStepIds.size === stepGroups.length) {
      setSelectedStepIds(new Set())
    } else {
      setSelectedStepIds(new Set(stepGroups.map((s) => s.step_id)))
    }
  }

  const toUser = team.find((u) => u.id === toUserId)
  const canSubmit =
    !!toUserId && count > 0 && count <= availableForSelection && selectedStepIds.size > 0 && !busy

  const overCapacity =
    toUser && toUser.today_tasks + count > toUser.daily_task_capacity
      ? toUser.today_tasks + count - toUser.daily_task_capacity
      : 0

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/prospection/tasks/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: fromUser.id,
          to_user_id: toUserId,
          count,
          step_ids: allSelected ? null : Array.from(selectedStepIds),
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao transferir')
      }
      const j = await res.json()
      setDone(j.transferred ?? 0)
      setTimeout(() => onTransferred(), 700)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
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
          className="p-5 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
              }}
            >
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Transferir tasks
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Pega as tasks mais urgentes do origem (due_at mais próximo) e reatribui ao destino.
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
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              De
            </label>
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <div className="font-semibold">{fromUser.full_name || fromUser.email}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {fromUser.open_tasks} aberta(s) · {fromUser.today_tasks} hoje
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Para
            </label>
            {eligibleTeam.length === 0 ? (
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#f59e0b',
                }}
              >
                Nenhum outro colaborador elegível. Active alguém (capacidade &gt; 0) primeiro.
              </div>
            ) : (
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {eligibleTeam.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} · {u.today_tasks}/{u.daily_task_capacity} hoje · {u.open_tasks} abertas
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                Etapas elegíveis
              </label>
              {stepGroups.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-[10px] font-semibold underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {selectedStepIds.size === stepGroups.length ? 'Desmarcar todas' : 'Marcar todas'}
                </button>
              )}
            </div>

            {loadingSteps ? (
              <div className="rounded-lg px-3 py-3 text-xs flex items-center gap-2"
                   style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Carregando etapas...
              </div>
            ) : stepGroups.length === 0 ? (
              <div className="rounded-lg px-3 py-3 text-xs"
                   style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                Nenhuma etapa com tasks abertas.
              </div>
            ) : (
              <div
                className="rounded-lg max-h-48 overflow-y-auto"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
              >
                {stepGroups.map((s) => {
                  const checked = selectedStepIds.has(s.step_id)
                  return (
                    <label
                      key={s.step_id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer transition border-b last:border-b-0"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStep(s.step_id)}
                        className="cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          Etapa {s.step_position}{s.step_title ? ` · ${s.step_title}` : ''}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                          {s.sequence_name} · canal {s.step_channel}
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)' }}
                      >
                        {s.count}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Quantidade (máx {availableForSelection})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={availableForSelection > 0 ? 1 : 0}
                max={Math.max(1, availableForSelection)}
                value={count}
                disabled={availableForSelection === 0}
                onChange={(e) => setCount(Math.max(1, Math.min(availableForSelection, Number(e.target.value))))}
                className="flex-1"
              />
              <input
                type="number"
                min={availableForSelection > 0 ? 1 : 0}
                max={availableForSelection}
                value={count}
                disabled={availableForSelection === 0}
                onChange={(e) => setCount(Math.max(1, Math.min(availableForSelection, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none disabled:opacity-50"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          {overCapacity > 0 && (
            <div
              className="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <span>
                Vai estourar em <strong>{overCapacity}</strong> a capacidade diária do destino. A
                transferência continua, mas o motor não vai criar mais tarefas pra ele hoje.
              </span>
            </div>
          )}

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {done !== null && (
            <div
              className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
              }}
            >
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{done} task(s) transferida(s)!</span>
            </div>
          )}
        </div>

        <div
          className="p-4 flex items-center justify-end gap-2"
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
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm rounded-lg font-semibold transition inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-text-on-primary, #fff)',
            }}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
            Transferir {count} task(s)
          </button>
        </div>
      </div>
    </div>
  )
}
