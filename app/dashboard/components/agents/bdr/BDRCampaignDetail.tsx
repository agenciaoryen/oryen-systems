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
  icon: Icon, label, value, sublabel, color, iconBg
}: { 
  icon: any; label: string; value: number | string; sublabel: string
  color: string; iconBg: string
}) {
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs font-bold uppercase text-gray-500 mt-1">{label}</p>
      <p className="text-[10px] text-gray-600 mt-0.5">{sublabel}</p>
    </div>
  )
}

function RunRow({ run, ui, dateLocale }: { run: AgentRun; ui: typeof UI.es; dateLocale: any }) {
  const [expanded, setExpanded] = useState(false)
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    success: { label: ui.success, color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle2 },
    error: { label: ui.error, color: 'text-red-400 bg-red-500/10', icon: XCircle },
    partial: { label: ui.partial, color: 'text-amber-400 bg-amber-500/10', icon: AlertTriangle },
    running: { label: ui.running, color: 'text-blue-400 bg-blue-500/10', icon: RefreshCw },
    pending: { label: ui.pending, color: 'text-gray-400 bg-gray-500/10', icon: Clock }
  }
  const status = statusConfig[run.status] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${status.color}`}>
            <StatusIcon size={12} className={run.status === 'running' ? 'animate-spin' : ''} />
            {status.label}
          </span>
          <span className="text-sm text-gray-400">
            {format(new Date(run.started_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {run.results?.messages_queued !== undefined && (
            <span className="text-xs text-blue-400 font-medium">+{run.results.messages_queued} na fila</span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t border-white/5 bg-black/30">
          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
            {run.results && Object.entries(run.results).map(([key, val]) => (
              <div key={key}>
                <p className="text-[10px] uppercase text-gray-500 mb-1">{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-white">{String(val)}</p>
              </div>
            ))}
          </div>
          {run.error_message && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{run.error_message}</p>
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
          <button onClick={() => router.push(`/dashboard/agents/${agentId}`)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors mt-1">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <MessageSquare size={20} className="text-emerald-400" />
              </div>
              {campaign.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                isPaused ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
              }`}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {statusLabels[campaign.status]}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={10} />
                {scheduleLabels[campaign.schedule_frequency]} {ui.at} {campaign.schedule_time}
              </span>
              {stats && stats.next_scheduled && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <Send size={10} />
                  {ui.proximoEnvio}: {format(new Date(stats.next_scheduled), 'HH:mm', { locale: dateLocale })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <button onClick={handleRunNow} disabled={isRunning} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
              {isRunning ? <><Loader2 size={16} className="animate-spin" />{ui.running}</> : <><Zap size={16} />{ui.runNow}</>}
            </button>
          )}
          {(isActive || isPaused) && (
            <button onClick={handleToggleStatus} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              isActive ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
            }`}>
              {isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
              {isActive ? ui.pause : ui.resume}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] rounded-xl p-1 border border-white/10 w-fit">
        {(['overview', 'runs', 'config'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === tab ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
          }`}>
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
                <div key={i} className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 h-32 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <BDRStatCard
                icon={Inbox}
                label={ui.naFila}
                value={stats?.pending || 0}
                sublabel={ui.naFilaDesc}
                color="text-blue-400"
                iconBg="bg-blue-500/10"
              />
              <BDRStatCard
                icon={Send}
                label={ui.enviadas}
                value={stats?.sent || 0}
                sublabel={ui.enviadasDesc}
                color="text-emerald-400"
                iconBg="bg-emerald-500/10"
              />
              <BDRStatCard
                icon={Ban}
                label={ui.erros}
                value={stats?.failed || 0}
                sublabel={ui.errosDesc}
                color="text-red-400"
                iconBg="bg-red-500/10"
              />
              <BDRStatCard
                icon={MessageSquare}
                label={ui.respostas}
                value={stats?.replied || 0}
                sublabel={ui.respostasDesc}
                color="text-purple-400"
                iconBg="bg-purple-500/10"
              />
            </div>
          )}

          {/* Barra de progresso visual */}
          {stats && (stats.pending + stats.sent + stats.failed) > 0 && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Progresso dos disparos</h3>
                <span className="text-sm text-gray-400">
                  {stats.sent + stats.failed} / {stats.pending + stats.sent + stats.failed + stats.cancelled}
                </span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
                {/* Enviadas (verde) */}
                {stats.sent > 0 && (
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(stats.sent / (stats.pending + stats.sent + stats.failed + stats.cancelled)) * 100}%` }}
                    title={`${stats.sent} enviadas`}
                  />
                )}
                {/* Erros (vermelho) */}
                {stats.failed > 0 && (
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(stats.failed / (stats.pending + stats.sent + stats.failed + stats.cancelled)) * 100}%` }}
                    title={`${stats.failed} erros`}
                  />
                )}
                {/* Pendentes (azul) */}
                {stats.pending > 0 && (
                  <div
                    className="h-full bg-blue-500/40 transition-all duration-500"
                    style={{ width: `${(stats.pending / (stats.pending + stats.sent + stats.failed + stats.cancelled)) * 100}%` }}
                    title={`${stats.pending} na fila`}
                  />
                )}
              </div>
              <div className="flex gap-4 mt-2 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Enviadas</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Erros</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/40" /> Na fila</span>
              </div>
            </div>
          )}

          {/* Execuções recentes */}
          {runs.length > 0 && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={14} />
                  Execuções recentes
                </h3>
                <button onClick={() => setActiveTab('runs')} className="text-xs text-blue-400 hover:text-blue-300">
                  Ver todas →
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
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Activity size={14} />{ui.runs} ({runs.length})
          </h3>
          {runs.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">{ui.noRuns}</p>
              <p className="text-xs text-gray-500 mt-1">{ui.noRunsHint}</p>
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
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings size={14} />{ui.configuration}
          </h3>

          {/* Template de mensagem */}
          {campaign.config?.message_template && (
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold mb-2">{ui.mensagem}</p>
              <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {campaign.config.message_template}
                </p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-4">
            {campaign.config?.lead_filter_tags?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {campaign.config.lead_filter_tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {campaign.config?.lead_filter_stages?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-2">Stages</p>
                <div className="flex flex-wrap gap-1">
                  {campaign.config.lead_filter_stages.map((stage: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-xs">{stage}</span>
                  ))}
                </div>
              </div>
            )}
            {campaign.config?.lead_filter_source && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-2">Origem</p>
                <span className="text-sm text-white">{campaign.config.lead_filter_source}</span>
              </div>
            )}
          </div>

          {/* Configurações gerais */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs">{ui.limiteDiario}</span>
                <p className="text-white font-bold">{campaign.config?.daily_limit || 30}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">{ui.schedule}</span>
                <p className="text-white font-bold">{scheduleLabels[campaign.schedule_frequency]} {ui.at} {campaign.schedule_time}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">{ui.pararAoResponder}</span>
                <p className="text-white font-bold">{campaign.config?.stop_on_reply ? ui.sim : ui.nao}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">{ui.moverPipeline}</span>
                <p className="text-white font-bold">{campaign.config?.auto_move_pipeline ? ui.sim : ui.nao}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-xs text-gray-500">
            {ui.createdAt}: {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
          </div>
        </div>
      )}
    </div>
  )
}