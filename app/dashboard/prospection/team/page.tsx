// /dashboard/prospection/team
// Admin only — gerencia daily_task_capacity de cada user da org.
// capacity=0 => user não recebe tarefas de prospecção (opt-out).

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, Loader2, ArrowLeft, Save, Check, AlertTriangle,
  ToggleLeft, ToggleRight,
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

                <div className="flex items-center gap-2">
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
    </div>
  )
}
