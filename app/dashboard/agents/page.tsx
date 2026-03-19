// app/dashboard/agents/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { 
  useAgent,
  createCampaign,
  toggleCampaignStatus,
  deleteCampaign,
  calculateUsage,
  t,
  tFeatures
} from '@/lib/agents'
import type { AgentCampaign, Language, ConfigField } from '@/lib/agents/types'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Bot, Target, Plus, Loader2, PlayCircle, PauseCircle,
  Settings, Trash2, Clock, Calendar, TrendingUp, Users, X,
  CheckCircle2, AlertTriangle, ChevronRight, BarChart3, Zap,
  Search, Filter, MoreVertical, Edit2, Copy, ExternalLink
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const UI = {
  pt: {
    back: 'Voltar',
    campaigns: 'Campanhas',
    newCampaign: 'Nova Campanha',
    noCampaigns: 'Nenhuma campanha criada',
    noCampaignsHint: 'Crie sua primeira campanha para começar a captar leads',
    createFirst: 'Criar Campanha',
    usage: 'Uso do Período',
    leadsMonth: 'leads/mês',
    used: 'usados',
    remaining: 'restantes',
    active: 'Ativa',
    paused: 'Pausada',
    draft: 'Rascunho',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    target: 'Meta',
    captured: 'Capturados',
    nextRun: 'Próxima execução',
    lastRun: 'Última execução',
    never: 'Nunca',
    daily: 'Diário',
    weekly: 'Semanal',
    manual: 'Manual',
    pause: 'Pausar',
    resume: 'Retomar',
    delete: 'Excluir',
    edit: 'Editar',
    confirmDelete: 'Tem certeza que deseja excluir esta campanha?',
    deleted: 'Campanha excluída',
    statusChanged: 'Status alterado',
    error: 'Erro',
    loading: 'Carregando...',
    notFound: 'Agente não encontrado',
    // Create modal
    createTitle: 'Nova Campanha',
    createSubtitle: 'Configure os parâmetros de busca',
    campaignName: 'Nome da campanha',
    campaignNamePlaceholder: 'Ex: Restaurantes em Santiago',
    targetLeads: 'Meta de leads',
    targetLeadsHint: 'Deixe vazio para usar todo o limite disponível',
    schedule: 'Agendamento',
    scheduleTime: 'Horário',
    create: 'Criar Campanha',
    creating: 'Criando...',
    created: 'Campanha criada!',
    cancel: 'Cancelar',
    required: 'Campo obrigatório'
  },
  en: {
    back: 'Back',
    campaigns: 'Campaigns',
    newCampaign: 'New Campaign',
    noCampaigns: 'No campaigns created',
    noCampaignsHint: 'Create your first campaign to start capturing leads',
    createFirst: 'Create Campaign',
    usage: 'Period Usage',
    leadsMonth: 'leads/mo',
    used: 'used',
    remaining: 'remaining',
    active: 'Active',
    paused: 'Paused',
    draft: 'Draft',
    completed: 'Completed',
    cancelled: 'Cancelled',
    target: 'Target',
    captured: 'Captured',
    nextRun: 'Next run',
    lastRun: 'Last run',
    never: 'Never',
    daily: 'Daily',
    weekly: 'Weekly',
    manual: 'Manual',
    pause: 'Pause',
    resume: 'Resume',
    delete: 'Delete',
    edit: 'Edit',
    confirmDelete: 'Are you sure you want to delete this campaign?',
    deleted: 'Campaign deleted',
    statusChanged: 'Status changed',
    error: 'Error',
    loading: 'Loading...',
    notFound: 'Agent not found',
    createTitle: 'New Campaign',
    createSubtitle: 'Configure search parameters',
    campaignName: 'Campaign name',
    campaignNamePlaceholder: 'Ex: Restaurants in Santiago',
    targetLeads: 'Lead target',
    targetLeadsHint: 'Leave empty to use all available limit',
    schedule: 'Schedule',
    scheduleTime: 'Time',
    create: 'Create Campaign',
    creating: 'Creating...',
    created: 'Campaign created!',
    cancel: 'Cancel',
    required: 'Required field'
  },
  es: {
    back: 'Volver',
    campaigns: 'Campañas',
    newCampaign: 'Nueva Campaña',
    noCampaigns: 'Sin campañas creadas',
    noCampaignsHint: 'Crea tu primera campaña para comenzar a captar leads',
    createFirst: 'Crear Campaña',
    usage: 'Uso del Período',
    leadsMonth: 'leads/mes',
    used: 'usados',
    remaining: 'restantes',
    active: 'Activa',
    paused: 'Pausada',
    draft: 'Borrador',
    completed: 'Completada',
    cancelled: 'Cancelada',
    target: 'Meta',
    captured: 'Capturados',
    nextRun: 'Próxima ejecución',
    lastRun: 'Última ejecución',
    never: 'Nunca',
    daily: 'Diario',
    weekly: 'Semanal',
    manual: 'Manual',
    pause: 'Pausar',
    resume: 'Reanudar',
    delete: 'Eliminar',
    edit: 'Editar',
    confirmDelete: '¿Estás seguro de que deseas eliminar esta campaña?',
    deleted: 'Campaña eliminada',
    statusChanged: 'Estado cambiado',
    error: 'Error',
    loading: 'Cargando...',
    notFound: 'Agente no encontrado',
    createTitle: 'Nueva Campaña',
    createSubtitle: 'Configura los parámetros de búsqueda',
    campaignName: 'Nombre de la campaña',
    campaignNamePlaceholder: 'Ej: Restaurantes en Santiago',
    targetLeads: 'Meta de leads',
    targetLeadsHint: 'Deja vacío para usar todo el límite disponible',
    schedule: 'Programación',
    scheduleTime: 'Horario',
    create: 'Crear Campaña',
    creating: 'Creando...',
    created: '¡Campaña creada!',
    cancel: 'Cancelar',
    required: 'Campo requerido'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

// Card de Campanha
function CampaignCard({
  campaign,
  lang,
  ui,
  dateLocale,
  onToggle,
  onDelete,
  onClick
}: {
  campaign: AgentCampaign
  lang: Language
  ui: typeof UI.es
  dateLocale: any
  onToggle: () => void
  onDelete: () => void
  onClick: () => void
}) {
  const isActive = campaign.status === 'active'
  const isPaused = campaign.status === 'paused'
  const isCompleted = campaign.status === 'completed'
  
  const captured = campaign.metrics?.leads_captured || 0
  const target = campaign.target_leads
  const progress = target ? (captured / target) * 100 : 0

  const statusConfig = {
    active: { label: ui.active, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    paused: { label: ui.paused, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    draft: { label: ui.draft, color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    completed: { label: ui.completed, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    cancelled: { label: ui.cancelled, color: 'bg-red-500/10 text-red-400 border-red-500/20' }
  }

  const scheduleLabels: Record<string, string> = {
    daily: ui.daily,
    weekly: ui.weekly,
    manual: ui.manual
  }

  const status = statusConfig[campaign.status] || statusConfig.draft

  return (
    <div 
      className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
            {campaign.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${status.color}`}>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {status.label}
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock size={9} />
              {scheduleLabels[campaign.schedule_frequency] || campaign.schedule_frequency}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {(isActive || isPaused) && (
            <button
              onClick={onToggle}
              className={`p-1.5 rounded-lg transition-colors ${
                isActive 
                  ? 'hover:bg-amber-500/10 text-amber-400' 
                  : 'hover:bg-emerald-500/10 text-emerald-400'
              }`}
              title={isActive ? ui.pause : ui.resume}
            >
              {isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
            title={ui.delete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress */}
      {target && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-gray-500">{ui.target}: {target} leads</span>
            <span className="text-gray-300 font-mono">{captured} {ui.captured}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                isCompleted ? 'bg-blue-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Config Tags */}
      {campaign.config && Object.keys(campaign.config).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {Object.entries(campaign.config).slice(0, 3).map(([key, value]) => {
            const displayValue = Array.isArray(value) ? value.join(', ') : String(value)
            return (
              <span 
                key={key}
                className="text-[9px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full truncate max-w-[150px]"
                title={`${key}: ${displayValue}`}
              >
                {displayValue}
              </span>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-white/5">
        <span className="flex items-center gap-1">
          <Calendar size={9} />
          {ui.nextRun}: {campaign.next_run_at 
            ? formatDistanceToNow(new Date(campaign.next_run_at), { addSuffix: true, locale: dateLocale })
            : ui.never
          }
        </span>
        <ChevronRight size={12} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  )
}

// Modal de Criar Campanha
function CreateCampaignModal({
  isOpen,
  agentId,
  orgId,
  userId,
  configSchema,
  lang,
  ui,
  onClose,
  onCreated
}: {
  isOpen: boolean
  agentId: string
  orgId: string
  userId: string
  configSchema: { fields: ConfigField[] }
  lang: Language
  ui: typeof UI.es
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [targetLeads, setTargetLeads] = useState<number | ''>('')
  const [scheduleFrequency, setScheduleFrequency] = useState('daily')
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [config, setConfig] = useState<Record<string, any>>({})
  const [creating, setCreating] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  if (!isOpen) return null

  const fields = configSchema?.fields || []

  const handleCreate = async () => {
    // Validar
    const newErrors: Record<string, boolean> = {}
    if (!name.trim()) newErrors.name = true
    fields.forEach(field => {
      if (field.required && !config[field.key]) {
        newErrors[field.key] = true
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setCreating(true)

    const { campaign, error } = await createCampaign(agentId, orgId, userId, {
      name: name.trim(),
      config,
      target_leads: targetLeads || undefined,
      schedule_frequency: scheduleFrequency,
      schedule_time: scheduleTime
    })

    setCreating(false)

    if (error) {
      toast.error(`${ui.error}: ${error}`)
      return
    }

    toast.success(ui.created)
    onCreated()
    onClose()
  }

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value })
    if (errors[key]) {
      setErrors({ ...errors, [key]: false })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus size={18} className="text-blue-400" />
              {ui.createTitle}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{ui.createSubtitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-2">
              {ui.campaignName}
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors({ ...errors, name: false })
              }}
              placeholder={ui.campaignNamePlaceholder}
              className={`w-full bg-black border rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors ${
                errors.name ? 'border-red-500' : 'border-white/10'
              }`}
            />
          </div>

          {/* Campos dinâmicos do config_schema */}
          {fields.map(field => (
            <div key={field.key}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-2">
                {t(field.label, lang)}
                {field.required && <span className="text-red-400">*</span>}
              </label>
              
              {field.type === 'text' && (
                <input
                  type="text"
                  value={config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
                  className={`w-full bg-black border rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors ${
                    errors[field.key] ? 'border-red-500' : 'border-white/10'
                  }`}
                />
              )}

              {field.type === 'tags' && (
                <div>
                  <input
                    type="text"
                    placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
                    className={`w-full bg-black border rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors ${
                      errors[field.key] ? 'border-red-500' : 'border-white/10'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        const value = input.value.trim()
                        if (value) {
                          const current = config[field.key] || []
                          updateConfig(field.key, [...current, value])
                          input.value = ''
                        }
                      }
                    }}
                  />
                  {config[field.key]?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {config[field.key].map((tag: string, i: number) => (
                        <span 
                          key={i}
                          className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = config[field.key].filter((_: any, idx: number) => idx !== i)
                              updateConfig(field.key, newTags)
                            }}
                            className="hover:text-red-400"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {field.type === 'select' && (
                <select
                  value={config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  className={`w-full bg-black border rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors ${
                    errors[field.key] ? 'border-red-500' : 'border-white/10'
                  }`}
                >
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.label, lang)}
                    </option>
                  ))}
                </select>
              )}

              {field.type === 'boolean' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config[field.key] ?? field.default ?? false}
                    onChange={(e) => updateConfig(field.key, e.target.checked)}
                    className="w-5 h-5 rounded bg-black border-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-400">Sim</span>
                </label>
              )}
            </div>
          ))}

          {/* Meta de leads */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-2">
              {ui.targetLeads}
            </label>
            <input
              type="number"
              value={targetLeads}
              onChange={(e) => setTargetLeads(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ex: 100"
              min={1}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
            />
            <p className="text-[10px] text-gray-500 mt-1">{ui.targetLeadsHint}</p>
          </div>

          {/* Agendamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">
                {ui.schedule}
              </label>
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
              >
                <option value="daily">{ui.daily}</option>
                <option value="weekly">{ui.weekly}</option>
                <option value="manual">{ui.manual}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">
                {ui.scheduleTime}
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-black/30">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            {ui.cancel}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {ui.creating}
              </>
            ) : (
              <>
                <Plus size={14} />
                {ui.create}
              </>
            )}
          </button>
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

  const { agent, campaigns, loading, error, refresh } = useAgent(agentId)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const lang = ((user as any)?.language as Language) || 'es'
  const ui = UI[lang]
  const dateLocale = { pt: ptBR, en: enUS, es }[lang]

  // Handlers
  const handleToggleCampaign = async (campaign: AgentCampaign) => {
    const { newStatus, error } = await toggleCampaignStatus(campaign.id, campaign.status)
    if (error) {
      toast.error(`${ui.error}: ${error}`)
      return
    }
    toast.success(ui.statusChanged)
    refresh()
  }

  const handleDeleteCampaign = async (campaign: AgentCampaign) => {
    if (!confirm(ui.confirmDelete)) return
    
    const { success, error } = await deleteCampaign(campaign.id)
    if (error) {
      toast.error(`${ui.error}: ${error}`)
      return
    }
    toast.success(ui.deleted)
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
  if (!agent) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <Bot size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">{ui.notFound}</p>
          <button
            onClick={() => router.push('/dashboard/agents')}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            {ui.back}
          </button>
        </div>
      </div>
    )
  }

  const solution = agent.solution
  const usage = calculateUsage(agent)

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
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Target size={20} className="text-blue-400" />
              </div>
              {solution ? t(solution.name, lang) : agent.solution_slug}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {solution ? t(solution.description, lang) : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          {ui.newCampaign}
        </button>
      </div>

      {/* Usage Card */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
          <BarChart3 size={14} />
          {ui.usage}
        </h3>
        
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">{ui.leadsMonth}</span>
              <span className="text-white font-mono font-bold">
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  usage.percentage > 90 ? 'bg-red-500' :
                  usage.percentage > 70 ? 'bg-amber-500' :
                  'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}
                style={{ width: `${Math.min(usage.percentage, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{usage.used}</div>
              <div className="text-[10px] text-gray-500 uppercase">{ui.used}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{usage.remaining}</div>
              <div className="text-[10px] text-gray-500 uppercase">{ui.remaining}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
          <Zap size={14} />
          {ui.campaigns} ({campaigns.length})
        </h3>

        {campaigns.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-white/10 border-dashed rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Target size={24} className="text-gray-600" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">{ui.noCampaigns}</h4>
            <p className="text-sm text-gray-500 mb-6">{ui.noCampaignsHint}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Plus size={14} />
              {ui.createFirst}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                lang={lang}
                ui={ui}
                dateLocale={dateLocale}
                onToggle={() => handleToggleCampaign(campaign)}
                onDelete={() => handleDeleteCampaign(campaign)}
                onClick={() => router.push(`/dashboard/agents/${agentId}/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        agentId={agentId}
        orgId={org?.id || ''}
        userId={user?.id || ''}
        configSchema={solution?.campaign_config_schema || { fields: [] }}
        lang={lang}
        ui={ui}
        onClose={() => setShowCreateModal(false)}
        onCreated={refresh}
      />
    </div>
  )
}