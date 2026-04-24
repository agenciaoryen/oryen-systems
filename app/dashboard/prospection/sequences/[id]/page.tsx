// Detalhe de uma sequence: steps, rules, enrollments, bulk enroll, rodar motor.

'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, MessageSquare, Mail, Phone, Bot, User, Users, Clock,
  Play, UserPlus, Search, Check, X, Zap, CheckCircle2, AlertTriangle,
  Filter, RotateCcw,
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
