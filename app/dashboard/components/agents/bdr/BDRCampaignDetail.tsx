// components/agents/bdr/BDRCampaignDetail.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toggleCampaignStatus, t } from '@/lib/agents'
import type { AgentCampaign, AgentRun, Language, CampaignStatus } from '@/lib/agents/types'
import { format } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, PlayCircle, PauseCircle,
  Clock, Calendar, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Settings,
  Zap, BarChart3, Activity, RefreshCw, MessageSquare,
  Send, Inbox, Ban
} from 'lucide-react'


// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const UI = {
  pt: {
    back: 'Voltar', overview: 'Visão Geral', runs: 'Execuções', config: 'Configuração',
    active: 'Ativa', paused: 'Pausada', completed: 'Concluída', cancelled: 'Cancelada', draft: 'Rascunho',
    pause: 'Pausar', resume: 'Retomar', runNow: 'Executar Agora', running: 'Executando...',
    at: 'às', daily: 'Diário', weekly: 'Semanal', manual: 'Manual',
    statusChanged: 'Status alterado', runStarted: 'Execução iniciada!', runError: 'Erro ao executar',
    // BDR específico
    naFila: 'Na Fila', enviadas: 'Enviadas', erros: 'Erros', respostas: 'Respostas',
    naFilaDesc: 'Aguardando envio', enviadasDesc: 'Entregues com sucesso',
    errosDesc: 'Falha no envio', respostasDesc: 'Leads que responderam',
    proximoEnvio: 'Próximo envio',
    nenhum: 'Nenhum',
    noRuns: 'Nenhuma execução ainda',
    noRunsHint: 'As execuções aparecerão aqui quando a campanha for processada',
    success: 'Sucesso', error: 'Erro', partial: 'Parcial', pending: 'Pendente',
    schedule: 'Agendamento', target: 'Meta', unlimited: 'Sem limite', createdAt: 'Criada em',
    configuration: 'Configuração do Disparo',
    limiteDiario: 'Limite diário',
    mensagem: 'Mensagem',
    filtros: 'Filtros',
    pararAoResponder: 'Parar ao responder',
    moverPipeline: 'Mover no pipeline',
    sim: 'Sim', nao: 'Não'
  },
  en: {
    back: 'Back', overview: 'Overview', runs: 'Runs', config: 'Configuration',
    active: 'Active', paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled', draft: 'Draft',
    pause: 'Pause', resume: 'Resume', runNow: 'Run Now', running: 'Running...',
    at: 'at', daily: 'Daily', weekly: 'Weekly', manual: 'Manual',
    statusChanged: 'Status changed', runStarted: 'Run started!', runError: 'Error running',
    naFila: 'In Queue', enviadas: 'Sent', erros: 'Errors', respostas: 'Replies',
    naFilaDesc: 'Awaiting dispatch', enviadasDesc: 'Delivered successfully',
    errosDesc: 'Send failed', respostasDesc: 'Leads who replied',
    proximoEnvio: 'Next send',
    nenhum: 'None',
    noRuns: 'No runs yet',
    noRunsHint: 'Runs will appear here when the campaign is processed',
    success: 'Success', error: 'Error', partial: 'Partial', pending: 'Pending',
    schedule: 'Schedule', target: 'Target', unlimited: 'Unlimited', createdAt: 'Created at',
    configuration: 'Dispatch Configuration',
    limiteDiario: 'Daily limit',
    mensagem: 'Message',
    filtros: 'Filters',
    pararAoResponder: 'Stop on reply',
    moverPipeline: 'Auto-move pipeline',
    sim: 'Yes', nao: 'No'
  },
  es: {
    back: 'Volver', overview: 'Resumen', runs: 'Ejecuciones', config: 'Configuración',
    active: 'Activa', paused: 'Pausada', completed: 'Completada', cancelled: 'Cancelada', draft: 'Borrador',
    pause: 'Pausar', resume: 'Reanudar', runNow: 'Ejecutar Ahora', running: 'Ejecutando...',
    at: 'a las', daily: 'Diario', weekly: 'Semanal', manual: 'Manual',
    statusChanged: 'Estado cambiado', runStarted: '¡Ejecución iniciada!', runError: 'Error al ejecutar',
    naFila: 'En Cola', enviadas: 'Enviados', erros: 'Errores', respostas: 'Respuestas',
    naFilaDesc: 'Esperando envío', enviadasDesc: 'Entregados con éxito',
    errosDesc: 'Error en envío', respostasDesc: 'Leads que respondieron',
    proximoEnvio: 'Próximo envío',
    nenhum: 'Ninguno',
    noRuns: 'Sin ejecuciones aún',
    noRunsHint: 'Las ejecuciones aparecerán aquí cuando la campaña sea procesada',
    success: 'Éxito', error: 'Error', partial: 'Parcial', pending: 'Pendiente',
    schedule: 'Programación', target: 'Meta', unlimited: 'Sin límite', createdAt: 'Creada el',
    configuration: 'Configuración del Disparo',
    limiteDiario: 'Límite diario',
    mensagem: 'Mensaje',
    filtros: 'Filtros',
    pararAoResponder: 'Parar al responder',
    moverPipeline: 'Mover en pipeline',
    sim: 'Sí', nao: 'No'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface BDRStats {
  pending: number
  sending: number
  sent: number
  failed: number
  replied: number
  cancelled: number
  next_scheduled: string | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: buscar métricas da fila
// ═══════════════════════════════════════════════════════════════════════════════

function useBDRStats(campaignId: string) {
  const [stats, setStats] = useState<BDRStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)

    // Buscar contagem por status
    const { data, error } = await supabase
      .from('bdr_message_queue')
      .select('status, scheduled_for')
      .eq('campaign_id', campaignId)

    if (error || !data) {
      setLoading(false)
      return
    }

    type QueueRow = { status: string; scheduled_for: string }
    const rows = data as QueueRow[]

    const pending = rows.filter((m: QueueRow) => m.status === 'pending' || m.status === 'sending').length
    const sent = rows.filter((m: QueueRow) => m.status === 'sent').length
    const failed = rows.filter((m: QueueRow) => m.status === 'failed').length
    const replied = rows.filter((m: QueueRow) => m.status === 'replied').length
    const cancelled = rows.filter((m: QueueRow) => m.status === 'cancelled').length

    // Próximo agendado
    const nextPending = rows
      .filter((m: QueueRow) => m.status === 'pending')
      .sort((a: QueueRow, b: QueueRow) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
    
    setStats({
      pending,
      sending: rows.filter((m: QueueRow) => m.status === 'sending').length,
      sent,
      failed,
      replied,
      cancelled,
      next_scheduled: nextPending.length > 0 ? nextPending[0].scheduled_for : null
    })
    setLoading(false)
  }, [campaignId])

  useEffect(() => { fetchStats() }, [fetchStats])

  return { stats, loading, refetch: fetchStats }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

function BDRStatCard({
  icon: Icon, label, value, sublabel, iconBg, iconColor
}: {
  icon: any; label: string; value: number | string; sublabel: string
  iconBg: string; iconColor: string
}) {
  return (
    <div className="border rounded-xl p-5 transition-all" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-xs font-bold uppercase mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{sublabel}</p>
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
          {run.results?.messages_queued !== undefined && (
            <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>+{run.results.messages_queued} na fila</span>
          )}
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-base)' }}>
          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
            {run.results && Object.entries(run.results).map(([key, val]) => (
              <div key={key}>
                <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{String(val)}</p>
              </div>
            ))}
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

export default function BDRCampaignDetail({ campaign, runs, agentId, lang, user, refresh }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'runs' | 'config'>('overview')
  const [isRunning, setIsRunning] = useState(false)

  const ui = UI[lang]
  const dateLocale = { pt: ptBR, en: enUS, es }[lang]
  const { stats, loading: statsLoading, refetch: refetchStats } = useBDRStats(campaign.id)

  const isActive = campaign.status === 'active'
  const isPaused = campaign.status === 'paused'

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
      if (!response.ok) throw new Error(data.error || 'Failed')
      toast.success(ui.runStarted)
      setTimeout(() => { refresh(); refetchStats() }, 2000)
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-success-subtle)' }}>
                <MessageSquare size={20} style={{ color: 'var(--color-success)' }} />
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
              {stats && stats.next_scheduled && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                  <Send size={10} />
                  {ui.proximoEnvio}: {format(new Date(stats.next_scheduled), 'HH:mm', { locale: dateLocale })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <button onClick={handleRunNow} disabled={isRunning} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50" style={{ background: 'var(--color-success)', color: 'var(--color-text-primary)' }}>
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

      {/* ═══ OVERVIEW ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Stat Cards - Métricas de disparo */}
          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="border rounded-xl p-5 h-32 animate-pulse" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <BDRStatCard
                icon={Inbox}
                label={ui.naFila}
                value={stats?.pending || 0}
                sublabel={ui.naFilaDesc}
                iconColor="var(--color-primary)"
                iconBg="var(--color-primary-subtle)"
              />
              <BDRStatCard
                icon={Send}
                label={ui.enviadas}
                value={stats?.sent || 0}
                sublabel={ui.enviadasDesc}
                iconColor="var(--color-success)"
                iconBg="var(--color-success-subtle)"
              />
              <BDRStatCard
                icon={Ban}
                label={ui.erros}
                value={stats?.failed || 0}
                sublabel={ui.errosDesc}
                iconColor="var(--color-error)"
                iconBg="var(--color-error-subtle)"
              />
              <BDRStatCard
                icon={MessageSquare}
                label={ui.respostas}
                value={stats?.replied || 0}
                sublabel={ui.respostasDesc}
                iconColor="var(--color-indigo)"
                iconBg="var(--color-indigo-subtle)"
              />
            </div>
          )}

          {/* Barra de progresso visual */}
          {stats && (stats.pending + stats.sent + stats.failed) > 0 && (
            <div className="border rounded-xl p-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Progresso dos disparos</h3>
                <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  {stats.sent + stats.failed} / {stats.pending + stats.sent + stats.failed + stats.cancelled}
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--color-bg-hover)' }}>
                {/* Enviadas (verde) */}
                {stats.sent > 0 && (
                  <div
                    className="h-full transition-all duration-500"
                    style={{ background: 'var(--color-success)', width: `${(stats.sent / (stats.pending + stats.sent + stats.failed + stats.cancelled)) * 100}%` }}
                    title={`${stats.sent} enviadas`}
                  />
                )}
                {/* Erros (vermelho) */}
                {stats.failed > 0 && (
                  <div
                    className="h-full transition-all duration-500"
                    style={{ background: 'var(--color-error)', width: `${(stats.failed / (stats.pending + stats.sent + stats.failed + stats.cancelled)) * 100}%` }}
                    title={`${stats.failed} erros`}
                  />
                )}
                {/* Pendentes (azul) */}
                {stats.pending > 0 && (
                  <div
                    className="h-full transition-all duration-500"
                    style={{ background: 'var(--color-primary-subtle)', width: `${(stats.pending / (stats.pending + stats.sent + stats.failed + stats.cancelled)) * 100}%` }}
                    title={`${stats.pending} na fila`}
                  />
                )}
              </div>
              <div className="flex gap-4 mt-2 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} /> Enviadas</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-error)' }} /> Erros</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary-subtle)' }} /> Na fila</span>
              </div>
            </div>
          )}

          {/* Execuções recentes */}
          {runs.length > 0 && (
            <div className="border rounded-xl p-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Activity size={14} />
                  Execuções recentes
                </h3>
                <button onClick={() => setActiveTab('runs')} className="text-xs" style={{ color: 'var(--color-primary)' }}>
                  Ver todas &rarr;
                </button>
              </div>
              <div className="space-y-2">
                {runs.slice(0, 3).map(run => <RunRow key={run.id} run={run} ui={ui} dateLocale={dateLocale} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ RUNS ═══ */}
      {activeTab === 'runs' && (
        <div className="border rounded-xl p-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--color-text-primary)' }}>
            <Activity size={14} />{ui.runs} ({runs.length})
          </h3>
          {runs.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{ui.noRuns}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{ui.noRunsHint}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map(run => <RunRow key={run.id} run={run} ui={ui} dateLocale={dateLocale} />)}
            </div>
          )}
        </div>
      )}

      {/* ═══ CONFIG ═══ */}
      {activeTab === 'config' && (
        <div className="border rounded-xl p-5 space-y-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Settings size={14} />{ui.configuration}
          </h3>

          {/* Template de mensagem */}
          {campaign.config?.message_template && (
            <div>
              <p className="text-[10px] uppercase font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>{ui.mensagem}</p>
              <div className="border rounded-xl p-4" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
                <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {campaign.config.message_template}
                </p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-4">
            {campaign.config?.lead_filter_tags?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Tags</p>
                <div className="flex flex-wrap gap-1">
                  {campaign.config.lead_filter_tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 border rounded text-xs" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {campaign.config?.lead_filter_stages?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Stages</p>
                <div className="flex flex-wrap gap-1">
                  {campaign.config.lead_filter_stages.map((stage: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 border rounded text-xs" style={{ background: 'var(--color-indigo-subtle)', color: 'var(--color-indigo)', borderColor: 'var(--color-indigo)' }}>{stage}</span>
                  ))}
                </div>
              </div>
            )}
            {campaign.config?.lead_filter_source && (
              <div>
                <p className="text-[10px] uppercase font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Origem</p>
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{campaign.config.lead_filter_source}</span>
              </div>
            )}
          </div>

          {/* Configurações gerais */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui.limiteDiario}</span>
                <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{campaign.config?.daily_limit || 30}</p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui.schedule}</span>
                <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{scheduleLabels[campaign.schedule_frequency]} {ui.at} {campaign.schedule_time}</p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui.pararAoResponder}</span>
                <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{campaign.config?.stop_on_reply ? ui.sim : ui.nao}</p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui.moverPipeline}</span>
                <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{campaign.config?.auto_move_pipeline ? ui.sim : ui.nao}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            {ui.createdAt}: {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
          </div>
        </div>
      )}
    </div>
  )
}