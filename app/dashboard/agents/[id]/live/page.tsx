// /dashboard/agents/[id]/live
// ═══════════════════════════════════════════════════════════════════════════════
// "Manus's Computer" do Oryen — janela ao vivo do colaborador IA.
//
// Mostra em tempo real (refresh 5s) o que esse agente fez nas últimas horas:
//   - Stream de ações do kernel (agent_actions): capability, target, status, duração
//   - Últimos emails enviados com status (sent/delivered/opened/clicked/bounced)
//   - Recursos atribuídos (WhatsApp instances)
//   - Summary das últimas 24h
//
// Diferencial pro mercado AmLat: cliente desconfia de IA. Mostrar o agente
// trabalhando de forma transparente é o que transforma "IA misteriosa" em
// "colaborador auditável".
// ═══════════════════════════════════════════════════════════════════════════════

'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import {
  Activity, Bot, ArrowLeft, Loader2, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, ShieldOff, Mail, MessageSquare, Phone, Search, Eye,
  MousePointerClick, Clock, Zap, Cpu, Smartphone,
} from 'lucide-react'

interface Action {
  id: string
  capability: string
  kind: 'worker' | 'agent'
  status: 'running' | 'success' | 'failed' | 'skipped' | 'denied'
  denied_reason: string | null
  target_type: string | null
  target_id: string | null
  target_label: string | null
  triggered_by_type: string
  triggered_by_label: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  input: any
  result: any
  error_message: string | null
  approval_status: string
}

interface EmailSend {
  id: string
  subject: string
  status: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  replied_at: string | null
  bounced_at: string | null
  error_message: string | null
  lead_id: string | null
}

interface Instance {
  id: string
  instance_name: string
  status: string
  agent_id: string | null
  api_type: string
  phone_number: string | null
}

interface ActivityResponse {
  agent: { id: string; solution_slug: string; is_active: boolean; is_paused: boolean }
  actions: Action[]
  emails: EmailSend[]
  summary: {
    total: number
    success: number
    failed: number
    denied: number
    skipped: number
    worker_count: number
    agent_count: number
  }
}

const REFRESH_MS = 5000

export default function AgentLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [instances, setInstances] = useState<{ assigned: Instance[]; available: Instance[]; other: Instance[] }>({
    assigned: [],
    available: [],
    other: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [tab, setTab] = useState<'live' | 'emails' | 'resources'>('live')
  const [busyInstance, setBusyInstance] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      const [actRes, instRes] = await Promise.all([
        fetch(`/api/agents/${id}/activity?limit=80`),
        fetch(`/api/agents/${id}/instances`),
      ])
      if (!actRes.ok) {
        const j = await actRes.json()
        throw new Error(j.error || 'Erro ao carregar atividade')
      }
      const actJson = await actRes.json()
      setData(actJson)

      if (instRes.ok) {
        const instJson = await instRes.json()
        setInstances({
          assigned: instJson.assigned || [],
          available: instJson.available || [],
          other: instJson.other || [],
        })
      }
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  // Auto-refresh a cada 5s na aba 'live' / 'emails'
  useEffect(() => {
    if (!autoRefresh || tab === 'resources') return
    const interval = setInterval(fetchActivity, REFRESH_MS)
    return () => clearInterval(interval)
  }, [autoRefresh, tab, fetchActivity])

  async function toggleInstance(instanceId: string, action: 'assign' | 'unassign', force = false) {
    setBusyInstance(instanceId)
    try {
      const res = await fetch(`/api/agents/${id}/instances`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, instance_id: instanceId, force }),
      })
      const j = await res.json()
      if (!res.ok && j.current_agent_id) {
        if (confirm('Esta instância já está com outro colaborador. Transferir mesmo assim?')) {
          return toggleInstance(instanceId, action, true)
        }
        return
      }
      if (!res.ok) throw new Error(j.error || 'Erro')
      await fetchActivity()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusyInstance(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <Link
        href={`/dashboard/agents/${id}`}
        className="inline-flex items-center gap-1 text-xs mb-3"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <ArrowLeft className="w-3 h-3" /> Voltar pro perfil do colaborador
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover, #6366f1))',
            }}
          >
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Atividade ao vivo
              </h1>
              <StatusBadge isActive={data.agent.is_active} isPaused={data.agent.is_paused} />
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Colaborador <strong>{data.agent.solution_slug}</strong> · atualizando a cada {REFRESH_MS / 1000}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition"
            style={{
              background: autoRefresh ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
              border: '1px solid ' + (autoRefresh ? 'var(--color-primary)' : 'var(--color-border)'),
              color: autoRefresh ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Ao vivo' : 'Pausado'}
          </button>
          <button
            onClick={() => fetchActivity()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Atualizar agora
          </button>
        </div>
      </div>

      {/* Summary 24h */}
      <div className="grid gap-2 mb-5 grid-cols-2 md:grid-cols-6">
        <Stat label="Total 24h" value={data.summary.total} />
        <Stat label="Sucesso" value={data.summary.success} tone="success" />
        <Stat label="Falhas" value={data.summary.failed} tone={data.summary.failed > 0 ? 'danger' : 'neutral'} />
        <Stat label="Bloqueadas" value={data.summary.denied} tone={data.summary.denied > 0 ? 'warning' : 'neutral'} icon={<ShieldOff className="w-3 h-3" />} />
        <Stat label="Workers" value={data.summary.worker_count} icon={<Cpu className="w-3 h-3" />} />
        <Stat label="IA (LLM)" value={data.summary.agent_count} icon={<Zap className="w-3 h-3" />} />
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444' }}
        >
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <TabBtn active={tab === 'live'} onClick={() => setTab('live')} icon={<Activity className="w-3.5 h-3.5" />} label={`Ações (${data.actions.length})`} />
        <TabBtn active={tab === 'emails'} onClick={() => setTab('emails')} icon={<Mail className="w-3.5 h-3.5" />} label={`Emails (${data.emails.length})`} />
        <TabBtn active={tab === 'resources'} onClick={() => setTab('resources')} icon={<Smartphone className="w-3.5 h-3.5" />} label={`Recursos (${instances.assigned.length})`} />
      </div>

      {tab === 'live' && <LiveActions actions={data.actions} />}
      {tab === 'emails' && <EmailsTab emails={data.emails} />}
      {tab === 'resources' && (
        <ResourcesTab
          instances={instances}
          busyInstance={busyInstance}
          onToggle={toggleInstance}
        />
      )}
    </div>
  )
}

// ─── Stream de ações ─────────────────────────────────────────────────────────
function LiveActions({ actions }: { actions: Action[] }) {
  if (actions.length === 0) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{ background: 'var(--color-bg-surface)', border: '1px dashed var(--color-border)', color: 'var(--color-text-tertiary)' }}
      >
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhuma ação registrada ainda.</p>
        <p className="text-[11px] mt-1">As ações aparecem aqui em tempo real conforme o colaborador trabalha.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {actions.map((a) => <ActionRow key={a.id} action={a} />)}
    </div>
  )
}

function ActionRow({ action }: { action: Action }) {
  const Icon = getCapabilityIcon(action.capability)
  const tone = getStatusTone(action.status)
  const time = new Date(action.started_at).toLocaleString()
  const inputPreview = previewInput(action.capability, action.input)

  return (
    <div
      className="rounded-lg p-3 flex items-start gap-3 flex-wrap"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid ' + (tone.borderColor || 'var(--color-border)'),
      }}
    >
      <div className="flex-shrink-0 mt-0.5" style={{ color: tone.color }}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <code className="text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {action.capability}
          </code>
          <Badge label={action.kind === 'worker' ? 'worker' : 'IA'} tone={action.kind === 'worker' ? 'muted' : 'primary'} />
          <Badge label={action.status} tone={tone.badge} />
          {action.target_label && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
              → {action.target_label}
            </span>
          )}
        </div>

        {inputPreview && (
          <div className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
            {inputPreview}
          </div>
        )}

        {action.status === 'denied' && (
          <div className="text-[11px] mt-1" style={{ color: '#f59e0b' }}>
            <ShieldOff className="w-3 h-3 inline mr-1" />
            Bloqueado: <strong>{action.denied_reason}</strong>
            {action.error_message && ` · ${action.error_message}`}
          </div>
        )}

        {action.status === 'failed' && action.error_message && (
          <div className="text-[11px] mt-1 break-words" style={{ color: '#ef4444' }}>
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {action.error_message}
          </div>
        )}

        <div className="text-[10px] mt-1 flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
          <span>{time}</span>
          {action.duration_ms != null && (
            <>
              <span>·</span>
              <span>{action.duration_ms}ms</span>
            </>
          )}
          {action.triggered_by_label && (
            <>
              <span>·</span>
              <span>por {action.triggered_by_label}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab de emails ───────────────────────────────────────────────────────────
function EmailsTab({ emails }: { emails: EmailSend[] }) {
  if (emails.length === 0) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{ background: 'var(--color-bg-surface)', border: '1px dashed var(--color-border)', color: 'var(--color-text-tertiary)' }}
      >
        <Mail className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhum email enviado ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {emails.map((e) => <EmailRow key={e.id} email={e} />)}
    </div>
  )
}

function EmailRow({ email }: { email: EmailSend }) {
  const Icon = email.bounced_at ? XCircle : email.replied_at ? MessageSquare : email.clicked_at ? MousePointerClick : email.opened_at ? Eye : email.delivered_at ? CheckCircle2 : Mail
  const tone = email.bounced_at || email.status === 'failed' ? 'danger'
    : email.replied_at ? 'success'
    : email.clicked_at ? 'success'
    : email.opened_at ? 'primary'
    : 'muted'

  return (
    <div className="rounded-lg p-3 flex items-start gap-3" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex-shrink-0 mt-0.5" style={{ color: getStatusToneFromString(tone).color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {email.subject}
          </span>
          <Badge label={email.status} tone={getStatusToneFromString(tone).badge} />
        </div>
        <div className="flex items-center gap-2 text-[10px] mt-1 flex-wrap" style={{ color: 'var(--color-text-tertiary)' }}>
          {email.sent_at && <span>Enviado {fmtTime(email.sent_at)}</span>}
          {email.delivered_at && <span>· Entregue {fmtTime(email.delivered_at)}</span>}
          {email.opened_at && <span>· Aberto {fmtTime(email.opened_at)}</span>}
          {email.clicked_at && <span>· Clicado {fmtTime(email.clicked_at)}</span>}
          {email.replied_at && <span style={{ color: '#10b981' }}>· Respondeu {fmtTime(email.replied_at)}</span>}
          {email.bounced_at && <span style={{ color: '#ef4444' }}>· Bounced {fmtTime(email.bounced_at)}</span>}
        </div>
        {email.error_message && (
          <div className="text-[11px] mt-1" style={{ color: '#ef4444' }}>
            {email.error_message}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab de recursos ─────────────────────────────────────────────────────────
function ResourcesTab({
  instances,
  busyInstance,
  onToggle,
}: {
  instances: { assigned: Instance[]; available: Instance[]; other: Instance[] }
  busyInstance: string | null
  onToggle: (id: string, action: 'assign' | 'unassign') => void
}) {
  return (
    <div className="space-y-5">
      <Section title="WhatsApp atribuído a este colaborador" icon={<Smartphone className="w-4 h-4" />}>
        {instances.assigned.length === 0 ? (
          <Empty>Nenhum WhatsApp atribuído. Atribua abaixo.</Empty>
        ) : (
          instances.assigned.map((inst) => (
            <InstanceRow key={inst.id} instance={inst} action="unassign" busy={busyInstance === inst.id} onToggle={onToggle} />
          ))
        )}
      </Section>

      <Section title="WhatsApp disponível (sem colaborador)" icon={<Smartphone className="w-4 h-4" />}>
        {instances.available.length === 0 ? (
          <Empty>Nenhum WhatsApp livre. Conecte em /dashboard/whatsapp.</Empty>
        ) : (
          instances.available.map((inst) => (
            <InstanceRow key={inst.id} instance={inst} action="assign" busy={busyInstance === inst.id} onToggle={onToggle} />
          ))
        )}
      </Section>

      {instances.other.length > 0 && (
        <Section title="WhatsApp atribuído a outros colaboradores" icon={<Smartphone className="w-4 h-4" />}>
          {instances.other.map((inst) => (
            <InstanceRow key={inst.id} instance={inst} action="assign" busy={busyInstance === inst.id} onToggle={onToggle} otherAgent />
          ))}
        </Section>
      )}
    </div>
  )
}

function InstanceRow({
  instance,
  action,
  busy,
  onToggle,
  otherAgent,
}: {
  instance: Instance
  action: 'assign' | 'unassign'
  busy: boolean
  onToggle: (id: string, action: 'assign' | 'unassign') => void
  otherAgent?: boolean
}) {
  const isConnected = instance.status === 'connected'
  return (
    <div className="rounded-lg p-3 flex items-center gap-3 flex-wrap" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <Smartphone className="w-4 h-4 flex-shrink-0" style={{ color: isConnected ? '#10b981' : 'var(--color-text-tertiary)' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {instance.instance_name}
          {instance.phone_number && (
            <span className="text-[11px] ml-2" style={{ color: 'var(--color-text-tertiary)' }}>
              {instance.phone_number}
            </span>
          )}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
          {instance.api_type} · {instance.status}
        </div>
      </div>
      <button
        onClick={() => onToggle(instance.id, action)}
        disabled={busy}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
        style={{
          background: action === 'unassign' ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-primary)',
          color: action === 'unassign' ? '#ef4444' : 'var(--color-text-on-primary, #fff)',
          border: '1px solid ' + (action === 'unassign' ? 'rgba(239, 68, 68, 0.35)' : 'transparent'),
        }}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : (otherAgent ? 'Transferir' : action === 'assign' ? 'Atribuir' : 'Remover')}
      </button>
    </div>
  )
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────
function StatusBadge({ isActive, isPaused }: { isActive: boolean; isPaused: boolean }) {
  if (isPaused) return <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>Pausado</span>
  if (!isActive) return <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)' }}>Inativo</span>
  return <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Ativo</span>
}

function Stat({ label, value, tone = 'neutral', icon }: { label: string; value: number; tone?: 'neutral'|'success'|'danger'|'warning'|'primary'; icon?: React.ReactNode }) {
  const fg = tone === 'success' ? '#10b981' : tone === 'danger' ? '#ef4444' : tone === 'warning' ? '#f59e0b' : tone === 'primary' ? 'var(--color-primary)' : 'var(--color-text-primary)'
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
      <div className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {icon}{label}
      </div>
      <div className="text-2xl font-bold mt-0.5" style={{ color: fg }}>{value}</div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition relative"
      style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
      {icon}{label}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--color-primary)' }} />}
    </button>
  )
}

function Badge({ label, tone }: { label: string; tone: 'primary'|'muted'|'success'|'danger'|'warning' }) {
  const t = getStatusToneFromString(tone)
  return <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: t.bg, color: t.color, border: `1px solid ${t.borderColor || 'transparent'}` }}>{label}</span>
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: 'var(--color-text-secondary)' }}>{icon}</span>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] italic px-3 py-2" style={{ color: 'var(--color-text-tertiary)' }}>{children}</div>
}

function getCapabilityIcon(capability: string) {
  if (capability.includes('email')) return Mail
  if (capability.includes('whatsapp')) return Phone
  if (capability.includes('reply') || capability.includes('classify')) return MessageSquare
  if (capability.includes('capture') || capability.includes('scrape')) return Search
  if (capability.includes('move') || capability.includes('update') || capability.includes('create')) return Cpu
  return Activity
}

function getStatusTone(status: string): { color: string; bg: string; borderColor?: string; badge: 'primary'|'muted'|'success'|'danger'|'warning' } {
  switch (status) {
    case 'success': return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)', badge: 'success' }
    case 'failed': return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', badge: 'danger' }
    case 'denied': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)', badge: 'warning' }
    case 'skipped': return { color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-elevated)', badge: 'muted' }
    case 'running': return { color: 'var(--color-primary)', bg: 'var(--color-primary-subtle)', badge: 'primary' }
    default: return { color: 'var(--color-text-secondary)', bg: 'var(--color-bg-elevated)', badge: 'muted' }
  }
}

function getStatusToneFromString(tone: string) {
  switch (tone) {
    case 'success': return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)', badge: 'success' as const }
    case 'danger': return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', badge: 'danger' as const }
    case 'warning': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)', badge: 'warning' as const }
    case 'primary': return { color: 'var(--color-primary)', bg: 'var(--color-primary-subtle)', borderColor: 'transparent', badge: 'primary' as const }
    default: return { color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-elevated)', borderColor: 'transparent', badge: 'muted' as const }
  }
}

function previewInput(capability: string, input: any): string | null {
  if (!input || typeof input !== 'object') return null
  if (capability === 'send_email' && input.subject) return `"${input.subject}"`
  if (capability === 'send_whatsapp' && input.body) return `"${String(input.body).substring(0, 80)}"`
  if (capability === 'capture_leads_serper' && input.query) return `query: ${input.query}`
  return null
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString()
}
