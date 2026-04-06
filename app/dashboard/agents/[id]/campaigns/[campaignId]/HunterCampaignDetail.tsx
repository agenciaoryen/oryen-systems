// app/dashboard/agents/[id]/campaigns/[campaignId]/HunterCampaignDetail.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleCampaignStatus, t } from '@/lib/agents'
import type { AgentCampaign, AgentRun, Language, CampaignStatus } from '@/lib/agents/types'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Target, Loader2, PlayCircle, PauseCircle,
  Clock, Calendar, TrendingUp, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Settings,
  Zap, BarChart3, Activity, RefreshCw, Users
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const UI = {
  pt: {
    back: 'Voltar', overview: 'Visão Geral', runs: 'Execuções', config: 'Configuração',
    status: 'Status', active: 'Ativa', paused: 'Pausada', completed: 'Concluída',
    cancelled: 'Cancelada', draft: 'Rascunho', pause: 'Pausar', resume: 'Retomar',
    runNow: 'Executar Agora', running: 'Executando...', target: 'Meta',
    captured: 'Capturados', progress: 'Progresso', nextRun: 'Próxima execução',
    lastRun: 'Última execução', never: 'Nunca', schedule: 'Agendamento',
    daily: 'Diário', weekly: 'Semanal', manual: 'Manual', at: 'às',
    noRuns: 'Nenhuma execução ainda', noRunsHint: 'As execuções aparecerão aqui quando a campanha for processada',
    leadsFound: 'Leads encontrados', leadsSaved: 'Leads salvos', leadsDuplicated: 'Duplicados',
    success: 'Sucesso', error: 'Erro', partial: 'Parcial', running_status: 'Executando',
    pending: 'Pendente', statusChanged: 'Status alterado', runStarted: 'Execução iniciada!',
    runError: 'Erro ao executar', unlimited: 'Sem limite', leads: 'leads',
    createdAt: 'Criada em', configuration: 'Configuração da Busca'
  },
  en: {
    back: 'Back', overview: 'Overview', runs: 'Runs', config: 'Configuration',
    status: 'Status', active: 'Active', paused: 'Paused', completed: 'Completed',
    cancelled: 'Cancelled', draft: 'Draft', pause: 'Pause', resume: 'Resume',
    runNow: 'Run Now', running: 'Running...', target: 'Target',
    captured: 'Captured', progress: 'Progress', nextRun: 'Next run',
    lastRun: 'Last run', never: 'Never', schedule: 'Schedule',
    daily: 'Daily', weekly: 'Weekly', manual: 'Manual', at: 'at',
    noRuns: 'No runs yet', noRunsHint: 'Runs will appear here when the campaign is processed',
    leadsFound: 'Leads found', leadsSaved: 'Leads saved', leadsDuplicated: 'Duplicates',
    success: 'Success', error: 'Error', partial: 'Partial', running_status: 'Running',
    pending: 'Pending', statusChanged: 'Status changed', runStarted: 'Run started!',
    runError: 'Error running', unlimited: 'Unlimited', leads: 'leads',
    createdAt: 'Created at', configuration: 'Search Configuration'
  },
  es: {
    back: 'Volver', overview: 'Resumen', runs: 'Ejecuciones', config: 'Configuración',
    status: 'Estado', active: 'Activa', paused: 'Pausada', completed: 'Completada',
    cancelled: 'Cancelada', draft: 'Borrador', pause: 'Pausar', resume: 'Reanudar',
    runNow: 'Ejecutar Ahora', running: 'Ejecutando...', target: 'Meta',
    captured: 'Capturados', progress: 'Progreso', nextRun: 'Próxima ejecución',
    lastRun: 'Última ejecución', never: 'Nunca', schedule: 'Programación',
    daily: 'Diario', weekly: 'Semanal', manual: 'Manual', at: 'a las',
    noRuns: 'Sin ejecuciones aún', noRunsHint: 'Las ejecuciones aparecerán aquí cuando la campaña sea procesada',
    leadsFound: 'Leads encontrados', leadsSaved: 'Leads guardados', leadsDuplicated: 'Duplicados',
    success: 'Éxito', error: 'Error', partial: 'Parcial', running_status: 'Ejecutando',
    pending: 'Pendiente', statusChanged: 'Estado cambiado', runStarted: '¡Ejecución iniciada!',
    runError: 'Error al ejecutar', unlimited: 'Sin límite', leads: 'leads',
    createdAt: 'Creada el', configuration: 'Configuración de Búsqueda'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({
  icon: Icon, label, value, subvalue, color = 'blue'
}: {
  icon: any; label: string; value: string | number; subvalue?: string
  color?: 'blue' | 'emerald' | 'amber' | 'purple'
}) {
  const colorStyles: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'var(--color-primary-subtle)', text: 'var(--color-primary)' },
    emerald: { bg: 'var(--color-success-subtle)', text: 'var(--color-success)' },
    amber: { bg: 'var(--color-accent-subtle)', text: 'var(--color-accent)' },
    purple: { bg: 'var(--color-indigo-subtle)', text: 'var(--color-indigo)' }
  }
  const cs = colorStyles[color] || colorStyles.blue
  return (
    <div className="border rounded-xl p-4" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: cs.bg, color: cs.text }}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
          {subvalue && <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{subvalue}</p>}
        </div>
      </div>
    </div>
  )
}

function RunRow({ run, ui, dateLocale }: { run: AgentRun; ui: typeof UI.es; dateLocale: any }) {
  const [expanded, setExpanded] = useState(false)
  const statusConfig: Record<string, { label: string; style: React.CSSProperties; icon: any }> = {
    success: { label: ui.success, style: { color: 'var(--color-success)', background: 'var(--color-success-subtle)' }, icon: CheckCircle2 },
    error: { label: ui.error, style: { color: 'var(--color-error)', background: 'var(--color-error-subtle)' }, icon: XCircle },
    partial: { label: ui.partial, style: { color: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }, icon: AlertTriangle },
    running: { label: ui.running, style: { color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }, icon: RefreshCw },
    pending: { label: ui.pending, style: { color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }, icon: Clock }
  }
  const status = statusConfig[run.status] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border-subtle)' }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-3 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg" style={status.style}>
            <StatusIcon size={12} className={run.status === 'running' ? 'animate-spin' : ''} />
            {status.label}
          </span>
          <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {format(new Date(run.started_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {run.duration_ms && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{(run.duration_ms / 1000).toFixed(1)}s</span>}
          {run.results?.leads_saved !== undefined && (
            <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>+{run.results.leads_saved} leads</span>
          )}
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div>
              <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{ui.leadsFound}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{run.results?.leads_found || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{ui.leadsSaved}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>{run.results?.leads_saved || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{ui.leadsDuplicated}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{run.results?.leads_duplicated || 0}</p>
            </div>
          </div>
          {run.error_message && (
            <div className="mt-3 p-2 border rounded-lg" style={{ background: 'var(--color-error-subtle)', borderColor: 'var(--color-error)' }}>
              <p className="text-xs" style={{ color: 'var(--color-error)' }}>{run.error_message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  campaign: AgentCampaign
  runs: AgentRun[]
  agentId: string
  lang: Language
  user: any
  refresh: () => void
}

export default function HunterCampaignDetail({ campaign, runs, agentId, lang, user, refresh }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'runs' | 'config'>('overview')
  const [isRunning, setIsRunning] = useState(false)

  const ui = UI[lang]
  const dateLocale = { pt: ptBR, en: enUS, es }[lang]

  const isActive = campaign.status === 'active'
  const isPaused = campaign.status === 'paused'
  const captured = campaign.metrics?.leads_captured || 0
  const target = campaign.target_leads
  const progress = target ? Math.min((captured / target) * 100, 100) : 0

  const statusLabels: Record<CampaignStatus, string> = {
    active: ui.active, paused: ui.paused, completed: ui.completed,
    cancelled: ui.cancelled, draft: ui.draft
  }
  const scheduleLabels: Record<string, string> = {
    daily: ui.daily, weekly: ui.weekly, manual: ui.manual
  }

  const handleToggleStatus = async () => {
    const { newStatus, error } = await toggleCampaignStatus(campaign.id, campaign.status)
    if (error) { toast.error(error); return }
    toast.success(ui.statusChanged)
    refresh()
  }

  const handleRunNow = async () => {
    if (isRunning) return
    setIsRunning(true)
    try {
      const response = await fetch('/api/agents/run-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, triggered_by: user?.id })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to run campaign')
      toast.success(ui.runStarted)
      setTimeout(() => refresh(), 1000)
    } catch (err: any) {
      toast.error(`${ui.runError}: ${err.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => router.push(`/dashboard/agents/${agentId}`)} className="p-2 rounded-lg transition-colors mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-indigo-subtle)' }}>
                <Target size={20} style={{ color: 'var(--color-indigo)' }} />
              </div>
              {campaign.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full border" style={
                isActive ? { background: 'var(--color-success-subtle)', color: 'var(--color-success)', borderColor: 'var(--color-success)' } :
                isPaused ? { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', borderColor: 'var(--color-accent)' } :
                { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)', borderColor: 'var(--color-border)' }
              }>
                {isActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />}
                {statusLabels[campaign.status]}
              </span>
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                <Clock size={10} />
                {scheduleLabels[campaign.schedule_frequency]} {ui.at} {campaign.schedule_time}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <button onClick={handleRunNow} disabled={isRunning} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50" style={{ background: 'var(--color-primary)', color: 'var(--color-text-primary)' }}>
              {isRunning ? <><Loader2 size={16} className="animate-spin" />{ui.running}</> : <><Zap size={16} />{ui.runNow}</>}
            </button>
          )}
          {(isActive || isPaused) && (
            <button onClick={handleToggleStatus} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border" style={
              isActive ? { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', borderColor: 'var(--color-accent)' } : { background: 'var(--color-success-subtle)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }
            }>
              {isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
              {isActive ? ui.pause : ui.resume}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 border w-fit" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}>
        {(['overview', 'runs', 'config'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={
            activeTab === tab ? { background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' } : { color: 'var(--color-text-tertiary)' }
          }>
            {tab === 'overview' && <BarChart3 size={14} />}
            {tab === 'runs' && <Activity size={14} />}
            {tab === 'config' && <Settings size={14} />}
            {ui[tab]}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label={ui.captured} value={captured} subvalue={target ? `${ui.target}: ${target}` : ui.unlimited} color="emerald" />
            <StatCard icon={TrendingUp} label={ui.progress} value={target ? `${progress.toFixed(0)}%` : '∞'} color="blue" />
            <StatCard icon={Zap} label={ui.runs} value={campaign.metrics?.total_runs || 0} color="purple" />
            <StatCard icon={Calendar} label={ui.nextRun} value={campaign.next_run_at ? format(new Date(campaign.next_run_at), 'dd/MM HH:mm') : ui.never} color="amber" />
          </div>
          {target && (
            <div className="border rounded-xl p-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{ui.progress}</h3>
                <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{captured} / {target} {ui.leads}</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ background: 'var(--gradient-brand)', width: `${progress}%` }} />
              </div>
            </div>
          )}
          {runs.length > 0 && (
            <div className="border rounded-xl p-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><Activity size={14} />Execuções recentes</h3>
                <button onClick={() => setActiveTab('runs')} className="text-xs" style={{ color: 'var(--color-primary)' }}>Ver todas &rarr;</button>
              </div>
              <div className="space-y-2">
                {runs.slice(0, 3).map(run => <RunRow key={run.id} run={run} ui={ui} dateLocale={dateLocale} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Runs */}
      {activeTab === 'runs' && (
        <div className="border rounded-xl p-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--color-text-primary)' }}><Activity size={14} />{ui.runs} ({runs.length})</h3>
          {runs.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{ui.noRuns}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{ui.noRunsHint}</p>
            </div>
          ) : (
            <div className="space-y-2">{runs.map(run => <RunRow key={run.id} run={run} ui={ui} dateLocale={dateLocale} />)}</div>
          )}
        </div>
      )}

      {/* Config */}
      {activeTab === 'config' && (
        <div className="border rounded-xl p-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--color-text-primary)' }}><Settings size={14} />{ui.configuration}</h3>
          <div className="space-y-4">
            {Object.entries(campaign.config || {}).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <span className="text-sm capitalize" style={{ color: 'var(--color-text-tertiary)' }}>{key.replace(/_/g, ' ')}</span>
                <span className="text-sm text-right max-w-[60%]" style={{ color: 'var(--color-text-primary)' }}>
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {value.map((v, i) => <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>{v}</span>)}
                    </div>
                  ) : typeof value === 'boolean' ? (value ? '✓ Sí' : '✗ No') : String(value)}
                </span>
              </div>
            ))}
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{ui.schedule}:</span>
                  <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>{scheduleLabels[campaign.schedule_frequency]} {ui.at} {campaign.schedule_time}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{ui.target}:</span>
                  <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>{campaign.target_leads || ui.unlimited}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{ui.createdAt}:</span>
                  <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>{format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}