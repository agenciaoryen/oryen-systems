// app/dashboard/agents/[id]/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useAgent, getAgentTranslation, toggleAgentStatus, updateAgentConfig } from '@/lib/agents'
import type { AgentRun, AgentEvent, ConfigField } from '@/lib/agents/types'
import { format, formatDistanceToNow, subDays } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Bot, Activity, Clock, DollarSign, TrendingUp,
  CheckCircle2, XCircle, AlertTriangle, Loader2, PlayCircle,
  PauseCircle, Settings, RefreshCw, ChevronDown, ChevronRight,
  Zap, MessageSquare, Target, Users, Filter, Calendar,
  BarChart3, List, Info, X, Save, ExternalLink, Copy
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    back: 'Voltar',
    overview: 'Visão Geral',
    runs: 'Execuções',
    metrics: 'Métricas',
    events: 'Eventos',
    config: 'Configuração',
    status: 'Status',
    active: 'Ativo',
    paused: 'Pausado',
    maintenance: 'Manutenção',
    pendingSetup: 'Aguardando Setup',
    pause: 'Pausar',
    activate: 'Ativar',
    refresh: 'Atualizar',
    loading: 'Carregando...',
    notFound: 'Agente não encontrado',
    totalRuns: 'Total de Execuções',
    successRate: 'Taxa de Sucesso',
    totalCost: 'Custo Total',
    avgDuration: 'Duração Média',
    last24h: 'Últimas 24h',
    last7d: 'Últimos 7 dias',
    last30d: 'Últimos 30 dias',
    allTime: 'Todo período',
    noRuns: 'Nenhuma execução ainda',
    noRunsHint: 'As execuções aparecerão aqui quando o agente processar leads',
    noEvents: 'Nenhum evento registrado',
    runDetails: 'Detalhes da Execução',
    input: 'Entrada',
    output: 'Saída',
    error: 'Erro',
    duration: 'Duração',
    cost: 'Custo',
    tokens: 'Tokens',
    model: 'Modelo',
    trigger: 'Gatilho',
    webhook: 'Webhook',
    schedule: 'Agendado',
    manual: 'Manual',
    event: 'Evento',
    success: 'Sucesso',
    failed: 'Falhou',
    running: 'Executando',
    pending: 'Pendente',
    activated: 'Ativado',
    resumed: 'Reativado',
    config_changed: 'Configuração alterada',
    error_alert: 'Alerta de erro',
    limit_reached: 'Limite atingido',
    billing_started: 'Cobrança iniciada',
    copyId: 'Copiar ID',
    copied: 'Copiado!',
    save: 'Salvar',
    saving: 'Salvando...',
    cancel: 'Cancelar',
    configSaved: 'Configuração salva!',
    statusChanged: 'Status alterado!',
    errorOccurred: 'Ocorreu um erro',
    tier: 'Tipo',
    instant: 'Instantâneo',
    template: 'Template',
    custom: 'Personalizado',
    createdAt: 'Criado em',
    billingStarted: 'Cobrança desde',
    webhookUrl: 'Webhook URL',
    n8nWorkflow: 'Workflow N8N'
  },
  en: {
    back: 'Back',
    overview: 'Overview',
    runs: 'Runs',
    metrics: 'Metrics',
    events: 'Events',
    config: 'Configuration',
    status: 'Status',
    active: 'Active',
    paused: 'Paused',
    maintenance: 'Maintenance',
    pendingSetup: 'Pending Setup',
    pause: 'Pause',
    activate: 'Activate',
    refresh: 'Refresh',
    loading: 'Loading...',
    notFound: 'Agent not found',
    totalRuns: 'Total Runs',
    successRate: 'Success Rate',
    totalCost: 'Total Cost',
    avgDuration: 'Avg Duration',
    last24h: 'Last 24h',
    last7d: 'Last 7 days',
    last30d: 'Last 30 days',
    allTime: 'All time',
    noRuns: 'No runs yet',
    noRunsHint: 'Runs will appear here when the agent processes leads',
    noEvents: 'No events recorded',
    runDetails: 'Run Details',
    input: 'Input',
    output: 'Output',
    error: 'Error',
    duration: 'Duration',
    cost: 'Cost',
    tokens: 'Tokens',
    model: 'Model',
    trigger: 'Trigger',
    webhook: 'Webhook',
    schedule: 'Scheduled',
    manual: 'Manual',
    event: 'Event',
    success: 'Success',
    failed: 'Failed',
    running: 'Running',
    pending: 'Pending',
    activated: 'Activated',
    resumed: 'Resumed',
    config_changed: 'Config changed',
    error_alert: 'Error alert',
    limit_reached: 'Limit reached',
    billing_started: 'Billing started',
    copyId: 'Copy ID',
    copied: 'Copied!',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    configSaved: 'Configuration saved!',
    statusChanged: 'Status changed!',
    errorOccurred: 'An error occurred',
    tier: 'Type',
    instant: 'Instant',
    template: 'Template',
    custom: 'Custom',
    createdAt: 'Created at',
    billingStarted: 'Billing since',
    webhookUrl: 'Webhook URL',
    n8nWorkflow: 'N8N Workflow'
  },
  es: {
    back: 'Volver',
    overview: 'Visión General',
    runs: 'Ejecuciones',
    metrics: 'Métricas',
    events: 'Eventos',
    config: 'Configuración',
    status: 'Estado',
    active: 'Activo',
    paused: 'Pausado',
    maintenance: 'Mantenimiento',
    pendingSetup: 'Esperando Setup',
    pause: 'Pausar',
    activate: 'Activar',
    refresh: 'Actualizar',
    loading: 'Cargando...',
    notFound: 'Agente no encontrado',
    totalRuns: 'Total de Ejecuciones',
    successRate: 'Tasa de Éxito',
    totalCost: 'Costo Total',
    avgDuration: 'Duración Promedio',
    last24h: 'Últimas 24h',
    last7d: 'Últimos 7 días',
    last30d: 'Últimos 30 días',
    allTime: 'Todo el período',
    noRuns: 'Sin ejecuciones aún',
    noRunsHint: 'Las ejecuciones aparecerán aquí cuando el agente procese leads',
    noEvents: 'Sin eventos registrados',
    runDetails: 'Detalles de Ejecución',
    input: 'Entrada',
    output: 'Salida',
    error: 'Error',
    duration: 'Duración',
    cost: 'Costo',
    tokens: 'Tokens',
    model: 'Modelo',
    trigger: 'Disparador',
    webhook: 'Webhook',
    schedule: 'Programado',
    manual: 'Manual',
    event: 'Evento',
    success: 'Éxito',
    failed: 'Falló',
    running: 'Ejecutando',
    pending: 'Pendiente',
    activated: 'Activado',
    resumed: 'Reactivado',
    config_changed: 'Configuración cambiada',
    error_alert: 'Alerta de error',
    limit_reached: 'Límite alcanzado',
    billing_started: 'Facturación iniciada',
    copyId: 'Copiar ID',
    copied: '¡Copiado!',
    save: 'Guardar',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    configSaved: '¡Configuración guardada!',
    statusChanged: '¡Estado cambiado!',
    errorOccurred: 'Ocurrió un error',
    tier: 'Tipo',
    instant: 'Instantáneo',
    template: 'Template',
    custom: 'Personalizado',
    createdAt: 'Creado en',
    billingStarted: 'Facturación desde',
    webhookUrl: 'Webhook URL',
    n8nWorkflow: 'Workflow N8N'
  }
}

type Language = keyof typeof TRANSLATIONS
type Tab = 'overview' | 'runs' | 'events' | 'config'

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  suffix,
  trend,
  color = 'blue'
}: { 
  icon: any
  label: string
  value: string | number
  suffix?: string
  trend?: number
  color?: 'blue' | 'green' | 'amber' | 'red'
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/20',
    green: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/20',
    red: 'from-red-500/20 to-red-600/10 text-red-400 border-red-500/20'
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="opacity-70" />
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {suffix && <span className="text-sm opacity-50">{suffix}</span>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp size={10} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}% vs período anterior
        </div>
      )}
    </div>
  )
}

function RunRow({ 
  run, 
  lang, 
  t, 
  dateLocale,
  isExpanded,
  onToggle 
}: { 
  run: AgentRun
  lang: Language
  t: typeof TRANSLATIONS.pt
  dateLocale: any
  isExpanded: boolean
  onToggle: () => void
}) {
  const statusConfig = {
    success: { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10', label: t.success },
    error: { icon: XCircle, color: 'text-red-400 bg-red-500/10', label: t.error },
    failed: { icon: XCircle, color: 'text-red-400 bg-red-500/10', label: t.failed },
    running: { icon: Loader2, color: 'text-blue-400 bg-blue-500/10', label: t.running },
    pending: { icon: Clock, color: 'text-amber-400 bg-amber-500/10', label: t.pending }
  }

  const triggerLabels: Record<string, string> = {
    webhook: t.webhook,
    schedule: t.schedule,
    manual: t.manual,
    event: t.event
  }

  const config = statusConfig[run.status] || statusConfig.pending
  const StatusIcon = config.icon

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
          <StatusIcon size={14} className={run.status === 'running' ? 'animate-spin' : ''} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{config.label}</span>
            {run.trigger_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                {triggerLabels[run.trigger_type] || run.trigger_type}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: dateLocale })}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400">
          {run.duration_ms && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {(run.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
          {run.cost_usd && (
            <span className="flex items-center gap-1 text-emerald-400">
              <DollarSign size={10} />
              {Number(run.cost_usd).toFixed(4)}
            </span>
          )}
        </div>

        <ChevronRight size={14} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {run.duration_ms && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.duration}</div>
                <div className="text-sm text-white font-mono">{(run.duration_ms / 1000).toFixed(2)}s</div>
              </div>
            )}
            {run.cost_usd && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.cost}</div>
                <div className="text-sm text-emerald-400 font-mono">${Number(run.cost_usd).toFixed(4)}</div>
              </div>
            )}
            {(run.tokens_input || run.tokens_output) && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.tokens}</div>
                <div className="text-sm text-white font-mono">
                  {run.tokens_input || 0} → {run.tokens_output || 0}
                </div>
              </div>
            )}
            {run.model_used && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.model}</div>
                <div className="text-sm text-white truncate">{run.model_used}</div>
              </div>
            )}
          </div>

          {run.error_msg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="text-[10px] text-red-400 uppercase font-bold mb-1">{t.error}</div>
              <div className="text-sm text-red-300 font-mono break-all">{run.error_msg}</div>
            </div>
          )}

          {run.input_data && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.input}</div>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(run.input_data, null, 2)}
              </pre>
            </div>
          )}

          {run.output_data && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.output}</div>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(run.output_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventRow({ event, t, dateLocale }: { event: AgentEvent; t: typeof TRANSLATIONS.pt; dateLocale: any }) {
  const eventConfig: Record<string, { icon: any; color: string }> = {
    activated: { icon: PlayCircle, color: 'text-emerald-400 bg-emerald-500/10' },
    paused: { icon: PauseCircle, color: 'text-amber-400 bg-amber-500/10' },
    resumed: { icon: PlayCircle, color: 'text-emerald-400 bg-emerald-500/10' },
    config_changed: { icon: Settings, color: 'text-blue-400 bg-blue-500/10' },
    error_alert: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
    limit_reached: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' },
    billing_started: { icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' }
  }

  const config = eventConfig[event.event_type] || { icon: Info, color: 'text-gray-400 bg-gray-500/10' }
  const Icon = config.icon

  return (
    <div className="flex items-start gap-4 p-4 border-b border-white/5 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{event.title}</div>
        {event.description && (
          <div className="text-xs text-gray-500 mt-0.5">{event.description}</div>
        )}
        <div className="text-[10px] text-gray-600 mt-1">
          {format(new Date(event.created_at), 'PPp', { locale: dateLocale })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, org } = useAuth()
  const agentId = params.id as string

  const { agent, runs, metrics, events, loading, error, refresh } = useAgent(agentId)

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [configEditing, setConfigEditing] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  const lang = ((user as any)?.language as Language) || 'pt'
  const t = TRANSLATIONS[lang]
  const dateLocale = { pt: ptBR, en: enUS, es }[lang]

  // Filtrar runs por período
  const filteredRuns = useMemo(() => {
    if (!runs) return []
    
    const now = new Date()
    let cutoff: Date

    switch (timeFilter) {
      case '24h':
        cutoff = subDays(now, 1)
        break
      case '7d':
        cutoff = subDays(now, 7)
        break
      case '30d':
        cutoff = subDays(now, 30)
        break
      default:
        return runs
    }

    return runs.filter(r => new Date(r.started_at) >= cutoff)
  }, [runs, timeFilter])

  // Calcular estatísticas
  const stats = useMemo(() => {
    const data = filteredRuns
    if (!data.length) {
      return { totalRuns: 0, successRate: 0, totalCost: 0, avgDuration: 0 }
    }

    const successful = data.filter(r => r.status === 'success').length
    const totalCost = data.reduce((acc, r) => acc + (Number(r.cost_usd) || 0), 0)
    const avgDuration = data.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / data.length

    return {
      totalRuns: data.length,
      successRate: (successful / data.length) * 100,
      totalCost,
      avgDuration
    }
  }, [filteredRuns])

  // Handlers
  const handleToggleStatus = async () => {
    if (!agent || !org?.id) return

    const { newStatus, error } = await toggleAgentStatus(agent.id, org.id, agent.status)

    if (error) {
      toast.error(error)
      return
    }

    toast.success(t.statusChanged)
    refresh()
  }

  const handleSaveConfig = async () => {
    if (!agent || !org?.id) return

    setSaving(true)
    const { success, error } = await updateAgentConfig(agent.id, org.id, configValues)
    setSaving(false)

    if (error) {
      toast.error(t.errorOccurred)
      return
    }

    toast.success(t.configSaved)
    setConfigEditing(false)
    refresh()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t.copied)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">{t.loading}</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!agent) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <Bot size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">{t.notFound}</p>
          <button
            onClick={() => router.push('/dashboard/agents')}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            {t.back}
          </button>
        </div>
      </div>
    )
  }

  const content = getAgentTranslation(agent.kind, lang)
  const solution = agent.solution
  const isActive = agent.status === 'active'
  const isPaused = agent.status === 'paused'
  const isMaintenance = agent.status === 'maintenance'

  const statusColors = {
    active: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    paused: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    maintenance: 'bg-red-500/10 border-red-500/30 text-red-400',
    pending_setup: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  }

  const statusLabels = {
    active: t.active,
    paused: t.paused,
    maintenance: t.maintenance,
    pending_setup: t.pendingSetup
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/dashboard/agents')}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors mt-1"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{content.name}</h1>
              <span className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
                ${statusColors[agent.status]}
              `}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {statusLabels[agent.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500">{content.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
          >
            <RefreshCw size={14} />
            {t.refresh}
          </button>
          
          <button
            onClick={handleToggleStatus}
            disabled={isMaintenance}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${isActive 
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                : isPaused
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-gray-800 border border-gray-700 text-gray-600 cursor-not-allowed'
              }
            `}
          >
            {isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
            {isActive ? t.pause : t.activate}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] rounded-xl p-1 border border-white/10 overflow-x-auto">
        {(['overview', 'runs', 'events', 'config'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {tab === 'overview' && <BarChart3 size={14} />}
            {tab === 'runs' && <Activity size={14} />}
            {tab === 'events' && <List size={14} />}
            {tab === 'config' && <Settings size={14} />}
            {t[tab]}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Time Filter */}
          <div className="flex justify-end">
            <div className="flex bg-[#0a0a0a] rounded-lg p-0.5 border border-white/10">
              {(['24h', '7d', '30d', 'all'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setTimeFilter(period)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${timeFilter === period 
                      ? 'bg-white text-black' 
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {t[`last${period.toUpperCase()}` as keyof typeof t] || t.allTime}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Activity}
              label={t.totalRuns}
              value={stats.totalRuns}
              color="blue"
            />
            <StatCard
              icon={CheckCircle2}
              label={t.successRate}
              value={stats.successRate.toFixed(1)}
              suffix="%"
              color="green"
            />
            <StatCard
              icon={DollarSign}
              label={t.totalCost}
              value={`$${stats.totalCost.toFixed(2)}`}
              color="amber"
            />
            <StatCard
              icon={Clock}
              label={t.avgDuration}
              value={(stats.avgDuration / 1000).toFixed(1)}
              suffix="s"
              color="blue"
            />
          </div>

          {/* Agent Info */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Informações do Agente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ID</span>
                  <button
                    onClick={() => copyToClipboard(agent.id)}
                    className="flex items-center gap-1 text-gray-300 hover:text-white font-mono text-xs"
                  >
                    {agent.id.slice(0, 8)}...
                    <Copy size={10} />
                  </button>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t.tier}</span>
                  <span className="text-gray-300">
                    {solution?.tier === 'instant' ? t.instant : solution?.tier === 'template' ? t.template : t.custom}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t.createdAt}</span>
                  <span className="text-gray-300">
                    {format(new Date(agent.created_at), 'PP', { locale: dateLocale })}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {agent.billing_started_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t.billingStarted}</span>
                    <span className="text-gray-300">
                      {format(new Date(agent.billing_started_at), 'PP', { locale: dateLocale })}
                    </span>
                  </div>
                )}

                {agent.n8n_workflow_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t.n8nWorkflow}</span>
                    <span className="text-gray-300 font-mono text-xs">{agent.n8n_workflow_id}</span>
                  </div>
                )}

                {agent.n8n_webhook_url && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t.webhookUrl}</span>
                    <button
                      onClick={() => copyToClipboard(agent.n8n_webhook_url!)}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                    >
                      Copiar
                      <Copy size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Runs Tab */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          {/* Time Filter */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">
              {filteredRuns.length} {t.runs}
            </span>
            <div className="flex bg-[#0a0a0a] rounded-lg p-0.5 border border-white/10">
              {(['24h', '7d', '30d', 'all'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setTimeFilter(period)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${timeFilter === period 
                      ? 'bg-white text-black' 
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {t[`last${period.toUpperCase()}` as keyof typeof t] || t.allTime}
                </button>
              ))}
            </div>
          </div>

          {/* Runs List */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
            {filteredRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity size={32} className="text-gray-600 mb-4" />
                <h3 className="text-sm font-bold text-white mb-1">{t.noRuns}</h3>
                <p className="text-xs text-gray-500">{t.noRunsHint}</p>
              </div>
            ) : (
              filteredRuns.map(run => (
                <RunRow
                  key={run.id}
                  run={run}
                  lang={lang}
                  t={t}
                  dateLocale={dateLocale}
                  isExpanded={expandedRun === run.id}
                  onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <List size={32} className="text-gray-600 mb-4" />
              <p className="text-sm text-gray-500">{t.noEvents}</p>
            </div>
          ) : (
            events.map(event => (
              <EventRow key={event.id} event={event} t={t} dateLocale={dateLocale} />
            ))
          )}
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white">{t.config}</h3>
            {!configEditing ? (
              <button
                onClick={() => {
                  setConfigValues(agent.cfg || {})
                  setConfigEditing(true)
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                <Settings size={12} />
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfigEditing(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? t.saving : t.save}
                </button>
              </div>
            )}
          </div>

          {solution?.config_schema?.fields && solution.config_schema.fields.length > 0 ? (
            <div className="space-y-4">
              {solution.config_schema.fields.map((field: ConfigField) => (
                <div key={field.key}>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-2">
                    {field.label}
                    {field.required && <span className="text-red-400">*</span>}
                  </label>
                  
                  {configEditing ? (
                    field.type === 'textarea' ? (
                      <textarea
                        value={configValues[field.key] || ''}
                        onChange={(e) => setConfigValues({ ...configValues, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none resize-none h-24 transition-colors"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={configValues[field.key] || ''}
                        onChange={(e) => setConfigValues({ ...configValues, [field.key]: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                      >
                        <option value="">Selecionar...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={configValues[field.key] || ''}
                        onChange={(e) => setConfigValues({ 
                          ...configValues, 
                          [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value 
                        })}
                        placeholder={field.placeholder}
                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                      />
                    )
                  ) : (
                    <div className="bg-gray-900/50 rounded-xl p-3 text-sm text-gray-300">
                      {agent.cfg?.[field.key] || <span className="text-gray-600">Não configurado</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-900/50 rounded-xl border border-white/5 text-center">
              <Info size={24} className="mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500">Este agente não possui configurações personalizáveis.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}