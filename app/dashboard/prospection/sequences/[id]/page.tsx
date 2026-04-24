// Detalhe de uma sequence: steps, rules, enrollments, bulk enroll, rodar motor.

'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, MessageSquare, Mail, Phone, Bot, User, Users, Clock,
  Play, UserPlus, Search, Check, X, Zap, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { CHANNEL_LABELS } from '@/lib/prospection/types'

export default function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'steps' | 'rules' | 'enrollments'>('steps')
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-border bg-card hover:bg-accent disabled:opacity-50 transition"
            >
              {engineRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Rodar motor agora
            </button>
            <button
              onClick={() => setShowEnroll(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
            >
              <UserPlus className="w-4 h-4" />
              Inscrever leads
            </button>
          </div>
        </div>

        {engineResult && (
          <div className={`mt-4 p-3 rounded-lg border text-sm ${
            engineResult.error
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          }`}>
            {engineResult.error ? (
              <>Erro: {engineResult.error}</>
            ) : (
              <>
                <strong>Motor rodou</strong> — avançados: {engineResult.advanced} · tasks criadas: {engineResult.tasks_created} · automáticos executados: {engineResult.automated_executed} · overdue: {engineResult.overdue_marked} · stale: {engineResult.stale_enrolled}
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <StatCard label="Etapas" value={steps.length} />
          <StatCard label="Regras" value={rules.filter((r: any) => r.is_active).length} />
          <StatCard label="Ativos" value={activeCount} tone="primary" />
          <StatCard label="Pausados" value={pausedCount} tone="warning" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {(['steps', 'rules', 'enrollments'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === k
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {k === 'steps' && 'Etapas'}
            {k === 'rules' && 'Regras de inscrição'}
            {k === 'enrollments' && `Inscritos (${enrollments.length})`}
          </button>
        ))}
      </div>

      {tab === 'steps' && <StepsView steps={steps} />}
      {tab === 'rules' && <RulesView rules={rules} />}
      {tab === 'enrollments' && <EnrollmentsView enrollments={enrollments} />}

      {showEnroll && (
        <BulkEnrollModal sequenceId={id} onClose={() => setShowEnroll(false)} onDone={fetchData} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'primary' | 'warning' }) {
  const toneClasses =
    tone === 'primary' ? 'text-primary' :
    tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
  return (
    <div className="border border-border rounded-xl p-3 bg-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</div>
      <div className={`text-2xl font-bold ${toneClasses}`}>{value}</div>
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

function RulesView({ rules }: { rules: any[] }) {
  if (rules.length === 0) {
    return (
      <div className="border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
        Nenhuma regra configurada. Leads só entram inscritos manualmente (botão "Inscrever leads").
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {rules.map((r) => (
        <div key={r.id} className="border border-border rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{r.name}</h4>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
              r.is_active
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {r.is_active ? 'ativa' : 'inativa'}
            </span>
            <span className="text-[10px] text-muted-foreground">prioridade {r.priority}</span>
          </div>
          {r.description && <p className="text-xs text-muted-foreground mb-2">{r.description}</p>}
          <div className="text-xs space-y-1">
            <div>
              <span className="font-semibold">Evento:</span>{' '}
              <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[11px]">{r.trigger_event}</code>
            </div>
            <div>
              <span className="font-semibold">Condições:</span>{' '}
              <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[11px] text-foreground">
                {JSON.stringify(r.conditions) || '{}'}
              </code>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EnrollmentsView({ enrollments }: { enrollments: any[] }) {
  if (enrollments.length === 0) {
    return (
      <div className="border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
        Nenhum lead inscrito ainda. Clique em "Inscrever leads" acima para começar.
      </div>
    )
  }
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left p-3 font-semibold">Lead</th>
            <th className="text-left p-3 font-semibold">Etapa</th>
            <th className="text-left p-3 font-semibold">Status</th>
            <th className="text-left p-3 font-semibold">Inscrito em</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => {
            const lead = Array.isArray(e.lead) ? e.lead[0] : e.lead
            return (
              <tr key={e.id} className="border-t border-border hover:bg-muted/20">
                <td className="p-3">
                  <div className="font-semibold">{lead?.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{lead?.phone ?? lead?.email ?? ''}</div>
                </td>
                <td className="p-3 text-xs">Etapa {e.current_step_position}</td>
                <td className="p-3">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                    e.status === 'active' ? 'bg-primary/10 text-primary border-primary/30' :
                    e.status === 'paused' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' :
                    e.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    {e.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(e.enrolled_at).toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK ENROLL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function BulkEnrollModal({
  sequenceId,
  onClose,
  onDone,
}: {
  sequenceId: string
  onClose: () => void
  onDone: () => void
}) {
  const [leads, setLeads] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function fetchLeads() {
    setLoading(true)
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    const res = await fetch(`/api/prospection/leads-picker?${qs.toString()}`)
    const json = await res.json()
    setLeads(json.leads || [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(() => fetchLeads(), 300)
    return () => clearTimeout(t)
  }, [search])

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAll() {
    const eligible = leads.filter((l) => !l.has_active_enrollment).map((l) => l.id)
    if (eligible.every((id) => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(eligible))
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
        body: JSON.stringify({ sequence_id: sequenceId, lead_ids: Array.from(selected) }),
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

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Inscrever leads na sequence</h3>
            <p className="text-xs text-muted-foreground">
              Leads já em outra sequence ativa aparecem bloqueados.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nenhum lead encontrado.
            </div>
          ) : (
            <div>
              <div className="p-3 border-b border-border flex items-center justify-between bg-muted/20 text-xs">
                <button
                  onClick={toggleAll}
                  className="font-semibold hover:text-primary transition"
                >
                  Selecionar todos elegíveis ({leads.filter((l) => !l.has_active_enrollment).length})
                </button>
                <span className="text-muted-foreground">
                  {selected.size} selecionado(s)
                </span>
              </div>
              {leads.map((l) => {
                const isActive = l.has_active_enrollment
                const isSelected = selected.has(l.id)
                return (
                  <button
                    key={l.id}
                    onClick={() => !isActive && toggle(l.id)}
                    disabled={isActive}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border text-left transition ${
                      isActive ? 'opacity-50 cursor-not-allowed bg-muted/10' :
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
                      isSelected && !isActive
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}>
                      {isSelected && !isActive && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{l.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.phone ?? l.email ?? ''}
                        {l.source && <span className="ml-2 opacity-60">· {l.source}</span>}
                        {l.stage && <span className="ml-1 opacity-60">· {l.stage}</span>}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex-shrink-0">
                        já em sequence
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {result && (
          <div className={`px-4 py-2 text-xs ${
            result.error
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          }`}>
            {result.error ? (
              <><AlertTriangle className="w-3 h-3 inline mr-1" />{result.error}</>
            ) : (
              <><CheckCircle2 className="w-3 h-3 inline mr-1" />{result.enrolled} inscrito(s) · {result.skipped} ignorado(s)</>
            )}
          </div>
        )}

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0 || submitting}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Inscrever {selected.size} lead(s)
          </button>
        </div>
      </div>
    </div>
  )
}
