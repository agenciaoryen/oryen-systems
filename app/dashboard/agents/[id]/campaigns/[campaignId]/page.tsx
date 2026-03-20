// app/dashboard/agents/[id]/campaigns/[campaignId]/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useCampaign, toggleCampaignStatus, updateCampaign, t } from '@/lib/agents'
import type { AgentRun, Language, CampaignStatus } from '@/lib/agents/types'
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
    back: 'Voltar',
    overview: 'Visão Geral',
    runs: 'Execuções',
    config: 'Configuração',
    status: 'Status',
    active: 'Ativa',
    paused: 'Pausada',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    draft: 'Rascunho',
    pause: 'Pausar',
    resume: 'Retomar',
    target: 'Meta',
    captured: 'Capturados',
    progress: 'Progresso',
    nextRun: 'Próxima execução',
    lastRun: 'Última execução',
    never: 'Nunca',
    schedule: 'Agendamento',
    daily: 'Diário',
    weekly: 'Semanal',
    manual: 'Manual',
    at: 'às',
    noRuns: 'Nenhuma execução ainda',
    noRunsHint: 'As execuções aparecerão aqui quando a campanha for processada',
    runStatus: 'Status',
    runDuration: 'Duração',
    runResults: 'Resultados',
    leadsFound: 'Leads encontrados',
    leadsSaved: 'Leads salvos',
    leadsDuplicated: 'Duplicados',
    success: 'Sucesso',
    error: 'Erro',
    partial: 'Parcial',
    running: 'Executando',
    pending: 'Pendente',
    loading: 'Carregando...',
    notFound: 'Campanha não encontrada',
    statusChanged: 'Status alterado',
    unlimited: 'Sem limite',
    leads: 'leads',
    createdAt: 'Criada em',
    configuration: 'Configuração da Busca'
  },
  en: {
    back: 'Back',
    overview: 'Overview',
    runs: 'Runs',
    config: 'Configuration',
    status: 'Status',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
    draft: 'Draft',
    pause: 'Pause',
    resume: 'Resume',
    target: 'Target',
    captured: 'Captured',
    progress: 'Progress',
    nextRun: 'Next run',
    lastRun: 'Last run',
    never: 'Never',
    schedule: 'Schedule',
    daily: 'Daily',
    weekly: 'Weekly',
    manual: 'Manual',
    at: 'at',
    noRuns: 'No runs yet',
    noRunsHint: 'Runs will appear here when the campaign is processed',
    runStatus: 'Status',
    runDuration: 'Duration',
    runResults: 'Results',
    leadsFound: 'Leads found',
    leadsSaved: 'Leads saved',
    leadsDuplicated: 'Duplicates',
    success: 'Success',
    error: 'Error',
    partial: 'Partial',
    running: 'Running',
    pending: 'Pending',
    loading: 'Loading...',
    notFound: 'Campaign not found',
    statusChanged: 'Status changed',
    unlimited: 'Unlimited',
    leads: 'leads',
    createdAt: 'Created at',
    configuration: 'Search Configuration'
  },
  es: {
    back: 'Volver',
    overview: 'Resumen',
    runs: 'Ejecuciones',
    config: 'Configuración',
    status: 'Estado',
    active: 'Activa',
    paused: 'Pausada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    draft: 'Borrador',
    pause: 'Pausar',
    resume: 'Reanudar',
    target: 'Meta',
    captured: 'Capturados',
    progress: 'Progreso',
    nextRun: 'Próxima ejecución',
    lastRun: 'Última ejecución',
    never: 'Nunca',
    schedule: 'Programación',
    daily: 'Diario',
    weekly: 'Semanal',
    manual: 'Manual',
    at: 'a las',
    noRuns: 'Sin ejecuciones aún',
    noRunsHint: 'Las ejecuciones aparecerán aquí cuando la campaña sea procesada',
    runStatus: 'Estado',
    runDuration: 'Duración',
    runResults: 'Resultados',
    leadsFound: 'Leads encontrados',
    leadsSaved: 'Leads guardados',
    leadsDuplicated: 'Duplicados',
    success: 'Éxito',
    error: 'Error',
    partial: 'Parcial',
    running: 'Ejecutando',
    pending: 'Pendiente',
    loading: 'Cargando...',
    notFound: 'Campaña no encontrada',
    statusChanged: 'Estado cambiado',
    unlimited: 'Sin límite',
    leads: 'leads',
    createdAt: 'Creada el',
    configuration: 'Configuración de Búsqueda'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

// Card de estatística
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subvalue,
  color = 'blue'
}: { 
  icon: any
  label: string
  value: string | number
  subvalue?: string
  color?: 'blue' | 'emerald' | 'amber' | 'purple'
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-600/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/20 text-amber-400',
    purple: 'from-purple-500/20 to-purple-600/20 text-purple-400'
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] uppercase text-gray-500 font-bold">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
          {subvalue && <p className="text-[10px] text-gray-500">{subvalue}</p>}
        </div>
      </div>
    </div>
  )
}

// Row de execução
function RunRow({ 
  run, 
  ui, 
  dateLocale 
}: { 
  run: AgentRun
  ui: typeof UI.es
  dateLocale: any
}) {
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
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
      >
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
          {run.duration_ms && (
            <span className="text-xs text-gray-500">
              {(run.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
          {run.results?.leads_saved !== undefined && (
            <span className="text-xs text-emerald-400 font-medium">
              +{run.results.leads_saved} leads
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-white/5 bg-black/30">
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">{ui.leadsFound}</p>
              <p className="text-lg font-bold text-white">{run.results?.leads_found || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">{ui.leadsSaved}</p>
              <p className="text-lg font-bold text-emerald-400">{run.results?.leads_saved || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">{ui.leadsDuplicated}</p>
              <p className="text-lg font-bold text-amber-400">{run.results?.leads_duplicated || 0}</p>
            </div>
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
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const agentId = params.id as string
  const campaignId = params.campaignId as string

  const { campaign, runs, loading, error, refresh } = useCampaign(campaignId)
  const [activeTab, setActiveTab] = useState<'overview' | 'runs' | 'config'>('overview')

  const lang = ((user as any)?.language as Language) || 'es'
  const ui = UI[lang]
  const dateLocale = { pt: ptBR, en: enUS, es }[lang]

  // Handlers
  const handleToggleStatus = async () => {
    if (!campaign) return
    
    const { newStatus, error } = await toggleCampaignStatus(campaign.id, campaign.status)
    if (error) {
      toast.error(error)
      return
    }
    toast.success(ui.statusChanged)
    refresh()
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">{ui.loading}</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!campaign) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <Target size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">{ui.notFound}</p>
          <button
            onClick={() => router.push(`/dashboard/agents/${agentId}`)}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            {ui.back}
          </button>
        </div>
      </div>
    )
  }

  const isActive = campaign.status === 'active'
  const isPaused = campaign.status === 'paused'
  const captured = campaign.metrics?.leads_captured || 0
  const target = campaign.target_leads
  const progress = target ? Math.min((captured / target) * 100, 100) : 0

  const statusLabels: Record<CampaignStatus, string> = {
    active: ui.active,
    paused: ui.paused,
    completed: ui.completed,
    cancelled: ui.cancelled,
    draft: ui.draft
  }

  const scheduleLabels: Record<string, string> = {
    daily: ui.daily,
    weekly: ui.weekly,
    manual: ui.manual
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push(`/dashboard/agents/${agentId}`)}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors mt-1"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Target size={20} className="text-purple-400" />
              </div>
              {campaign.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`
                inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full
                ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  isPaused ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-gray-500/10 text-gray-400 border border-gray-500/20'}
              `}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {statusLabels[campaign.status]}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={10} />
                {scheduleLabels[campaign.schedule_frequency]} {ui.at} {campaign.schedule_time}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {(isActive || isPaused) && (
          <button
            onClick={handleToggleStatus}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors
              ${isActive 
                ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
              }
            `}
          >
            {isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
            {isActive ? ui.pause : ui.resume}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] rounded-xl p-1 border border-white/10 w-fit">
        {(['overview', 'runs', 'config'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {tab === 'overview' && <BarChart3 size={14} />}
            {tab === 'runs' && <Activity size={14} />}
            {tab === 'config' && <Settings size={14} />}
            {ui[tab]}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label={ui.captured}
              value={captured}
              subvalue={target ? `${ui.target}: ${target}` : ui.unlimited}
              color="emerald"
            />
            <StatCard
              icon={TrendingUp}
              label={ui.progress}
              value={target ? `${progress.toFixed(0)}%` : '∞'}
              color="blue"
            />
            <StatCard
              icon={Zap}
              label={ui.runs}
              value={campaign.metrics?.total_runs || 0}
              color="purple"
            />
            <StatCard
              icon={Calendar}
              label={ui.nextRun}
              value={campaign.next_run_at 
                ? format(new Date(campaign.next_run_at), 'dd/MM HH:mm')
                : ui.never
              }
              color="amber"
            />
          </div>

          {/* Progress Bar */}
          {target && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">{ui.progress}</h3>
                <span className="text-sm text-gray-400">
                  {captured} / {target} {ui.leads}
                </span>
              </div>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Recent Runs Preview */}
          {runs.length > 0 && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={14} />
                  {ui.runs} recientes
                </h3>
                <button
                  onClick={() => setActiveTab('runs')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Ver todas →
                </button>
              </div>
              <div className="space-y-2">
                {runs.slice(0, 3).map(run => (
                  <RunRow key={run.id} run={run} ui={ui} dateLocale={dateLocale} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Runs Tab */}
      {activeTab === 'runs' && (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Activity size={14} />
            {ui.runs} ({runs.length})
          </h3>

          {runs.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">{ui.noRuns}</p>
              <p className="text-xs text-gray-500 mt-1">{ui.noRunsHint}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map(run => (
                <RunRow key={run.id} run={run} ui={ui} dateLocale={dateLocale} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Settings size={14} />
            {ui.configuration}
          </h3>

          <div className="space-y-4">
            {Object.entries(campaign.config || {}).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between py-3 border-b border-white/5 last:border-0">
                <span className="text-sm text-gray-400 capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-sm text-white text-right max-w-[60%]">
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {value.map((v, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                          {v}
                        </span>
                      ))}
                    </div>
                  ) : typeof value === 'boolean' ? (
                    value ? '✓ Sí' : '✗ No'
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            ))}

            {/* Info adicional */}
            <div className="pt-4 mt-4 border-t border-white/10">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{ui.schedule}:</span>
                  <span className="text-white ml-2">
                    {scheduleLabels[campaign.schedule_frequency]} {ui.at} {campaign.schedule_time}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">{ui.target}:</span>
                  <span className="text-white ml-2">
                    {campaign.target_leads || ui.unlimited}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">{ui.createdAt}:</span>
                  <span className="text-white ml-2">
                    {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}