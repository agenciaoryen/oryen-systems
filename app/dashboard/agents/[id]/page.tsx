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
  updateAgentConfig,
  toggleAgentStatus,
  SINGLE_CONFIG_SLUGS,
  t,
  tFeatures
} from '@/lib/agents'
import type { Agent, AgentCampaign, Language, ConfigField } from '@/lib/agents/types'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Bot, Target, Plus, Loader2, PlayCircle, PauseCircle,
  Settings, Trash2, Clock, Calendar, TrendingUp, Users, X,
  CheckCircle2, AlertTriangle, ChevronRight, BarChart3, Zap,
  Search, Filter, MoreVertical, Edit2, Copy, ExternalLink
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

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
    required: 'Campo obrigatório',
    managementTitle: 'Gerenciamento do Agente',
    managementDesc: 'A tela de gerenciamento deste agente está em desenvolvimento. Em breve você poderá configurar e acompanhar o desempenho aqui.',
    comingSoon: 'Em breve',
    // Single-config (SDR)
    training: 'Treinamento',
    trainingDesc: 'Configure como seu agente deve atuar. Preencha as informações abaixo e salve.',
    saveTraining: 'Salvar Treinamento',
    saving: 'Salvando...',
    saved: 'Treinamento salvo!',
    notConfigured: 'Agente ainda não treinado',
    notConfiguredHint: 'Preencha as informações abaixo para que seu agente comece a trabalhar',
    agentActive: 'Ativo',
    agentPaused: 'Pausado',
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
    required: 'Required field',
    managementTitle: 'Agent Management',
    managementDesc: 'The management screen for this agent is under development. Soon you will be able to configure and track performance here.',
    comingSoon: 'Coming soon',
    training: 'Training',
    trainingDesc: 'Configure how your agent should operate. Fill in the information below and save.',
    saveTraining: 'Save Training',
    saving: 'Saving...',
    saved: 'Training saved!',
    notConfigured: 'Agent not yet trained',
    notConfiguredHint: 'Fill in the information below so your agent can start working',
    agentActive: 'Active',
    agentPaused: 'Paused',
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
    required: 'Campo requerido',
    managementTitle: 'Gestión del Agente',
    managementDesc: 'La pantalla de gestión de este agente está en desarrollo. Pronto podrás configurar y monitorear el rendimiento aquí.',
    comingSoon: 'Próximamente',
    training: 'Entrenamiento',
    trainingDesc: 'Configura cómo debe actuar tu agente. Completa la información abajo y guarda.',
    saveTraining: 'Guardar Entrenamiento',
    saving: 'Guardando...',
    saved: '¡Entrenamiento guardado!',
    notConfigured: 'Agente aún no entrenado',
    notConfiguredHint: 'Completa la información abajo para que tu agente comience a trabajar',
    agentActive: 'Activo',
    agentPaused: 'Pausado',
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
    active: { label: ui.active, bg: 'var(--color-success-subtle)', color: 'var(--color-success)', borderColor: 'var(--color-success-subtle)' },
    paused: { label: ui.paused, bg: 'var(--color-accent-subtle)', color: 'var(--color-accent)', borderColor: 'var(--color-accent-subtle)' },
    draft: { label: ui.draft, bg: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)', borderColor: 'var(--color-border-subtle)' },
    completed: { label: ui.completed, bg: 'var(--color-primary-subtle)', color: 'var(--color-primary)', borderColor: 'var(--color-primary-subtle)' },
    cancelled: { label: ui.cancelled, bg: 'var(--color-error-subtle)', color: 'var(--color-error)', borderColor: 'var(--color-error-subtle)' }
  }

  const scheduleLabels: Record<string, string> = {
    daily: ui.daily,
    weekly: ui.weekly,
    manual: ui.manual
  }

  const status = statusConfig[campaign.status] || statusConfig.draft

  return (
    <div
      className="rounded-xl p-4 transition-all cursor-pointer group"
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate transition-colors" style={{ color: 'var(--color-text-primary)' }}>
            {campaign.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: status.bg, color: status.color, border: `1px solid ${status.borderColor}` }}
            >
              {isActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />}
              {status.label}
            </span>
            <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
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
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-success)' }}
              title={isActive ? ui.pause : ui.resume}
            >
              {isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-error)' }}
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
            <span style={{ color: 'var(--color-text-muted)' }}>{ui.target}: {target} leads</span>
            <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{captured} {ui.captured}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: isCompleted ? 'var(--color-primary)' : 'var(--gradient-brand)'
              }}
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
                className="text-[9px] px-2 py-0.5 rounded-full truncate max-w-[150px]"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
                title={`${key}: ${displayValue}`}
              >
                {displayValue}
              </span>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] pt-2" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-subtle)' }}>
        <span className="flex items-center gap-1">
          <Calendar size={9} />
          {ui.nextRun}: {campaign.next_run_at
            ? formatDistanceToNow(new Date(campaign.next_run_at), { addSuffix: true, locale: dateLocale })
            : ui.never
          }
        </span>
        <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </div>
  )
}

// Painel de Treinamento (Single-Config — SDR)
function TrainingPanel({
  agent,
  configSchema,
  lang,
  ui,
  onSaved
}: {
  agent: Agent
  configSchema: { fields: ConfigField[] }
  lang: Language
  ui: typeof UI.es
  onSaved: () => void
}) {
  const [config, setConfig] = useState<Record<string, any>>(agent.config || {})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const fields = configSchema?.fields || []

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: false }))
  }

  const handleSave = async () => {
    const newErrors: Record<string, boolean> = {}
    fields.forEach(field => {
      if (field.required) {
        const value = config[field.name]
        if (field.type === 'tags') {
          if (!value || !Array.isArray(value) || value.length === 0) newErrors[field.name] = true
        } else {
          if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) newErrors[field.name] = true
        }
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    const { success, error } = await updateAgentConfig(agent.id, config)
    setSaving(false)

    if (error) {
      toast.error(`${ui.error}: ${error}`)
      return
    }

    toast.success(ui.saved)
    onSaved()
  }

  const renderField = (field: ConfigField) => {
    const fieldError = errors[field.name]
    const borderStyle = fieldError ? 'var(--color-error)' : 'var(--color-border-subtle)'
    const baseInputStyle = { backgroundColor: 'var(--color-bg-base)', border: `1px solid ${borderStyle}`, color: 'var(--color-text-primary)' }

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={config[field.name] || ''}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
            className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
            style={baseInputStyle}
          />
        )
      case 'textarea':
        return (
          <div>
            <textarea
              value={config[field.name] || ''}
              onChange={(e) => updateConfig(field.name, e.target.value)}
              placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
              rows={5}
              className="w-full rounded-xl p-3 text-sm resize-none font-mono text-xs leading-relaxed outline-none transition-colors"
              style={baseInputStyle}
            />
            {field.description && (
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {t(field.description, lang)}
              </p>
            )}
          </div>
        )
      case 'number':
        return (
          <div>
            <input
              type="number"
              value={config[field.name] ?? field.default ?? ''}
              onChange={(e) => updateConfig(field.name, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
              min={field.min}
              max={field.max}
              className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
              style={baseInputStyle}
            />
            {field.description && (
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {t(field.description, lang)}
              </p>
            )}
          </div>
        )
      case 'tags':
        return (
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
                className="w-full rounded-xl p-3 pr-16 text-sm outline-none transition-colors"
                style={baseInputStyle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const input = e.target as HTMLInputElement
                    const value = input.value.trim()
                    if (value) {
                      const current = config[field.name] || []
                      updateConfig(field.name, [...current, value])
                      input.value = ''
                    }
                  }
                }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded"
                style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)' }}
              >
                Enter ↵
              </span>
            </div>
            {config[field.name]?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {config[field.name].map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-subtle)' }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => {
                        const newTags = config[field.name].filter((_: any, idx: number) => idx !== i)
                        updateConfig(field.name, newTags)
                      }}
                      style={{ color: 'inherit' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      case 'select':
        return (
          <CustomSelect
            value={config[field.name] || field.default || ''}
            onChange={(v) => updateConfig(field.name, v)}
            options={[
              { value: '', label: 'Selecione...' },
              ...(field.options?.map(opt => ({
                value: opt.value,
                label: typeof opt.label === 'string' ? opt.label : t(opt.label, lang),
              })) || []),
            ]}
          />
        )
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config[field.name] ?? field.default ?? false}
              onChange={(e) => updateConfig(field.name, e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {config[field.name] ?? field.default ? 'Sim' : 'Não'}
            </span>
          </label>
        )
      default:
        return (
          <input
            type="text"
            value={config[field.name] || ''}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
            className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
            style={baseInputStyle}
          />
        )
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
    >
      <h3 className="text-sm font-bold uppercase mb-1 flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
        <Settings size={14} />
        {ui.training}
      </h3>
      <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
        {ui.trainingDesc}
      </p>

      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.name}>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
              {t(field.label, lang)}
              {field.required && <span style={{ color: 'var(--color-error)' }}>*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {ui.saving}
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              {ui.saveTraining}
            </>
          )}
        </button>
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
      if (field.required) {
        const value = config[field.name]
        if (field.type === 'tags') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            newErrors[field.name] = true
          }
        } else {
          if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
            newErrors[field.name] = true
          }
        }
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

  // Helper: renderizar campo baseado no type
  const renderField = (field: ConfigField) => {
    const fieldError = errors[field.name]
    const borderStyle = fieldError ? 'var(--color-error)' : 'var(--color-border-subtle)'
    const baseInputStyle = { backgroundColor: 'var(--color-bg-base)', border: `1px solid ${borderStyle}`, color: 'var(--color-text-primary)' }

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={config[field.name] || ''}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
            className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
            style={baseInputStyle}
          />
        )

      case 'textarea':
        return (
          <div>
            <textarea
              value={config[field.name] || ''}
              onChange={(e) => updateConfig(field.name, e.target.value)}
              placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
              rows={5}
              className="w-full rounded-xl p-3 text-sm resize-none font-mono text-xs leading-relaxed outline-none transition-colors"
              style={baseInputStyle}
            />
            {field.description && (
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {t(field.description, lang)}
              </p>
            )}
          </div>
        )

      case 'number':
        return (
          <div>
            <input
              type="number"
              value={config[field.name] ?? field.default ?? ''}
              onChange={(e) => updateConfig(field.name, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
              min={field.min}
              max={field.max}
              className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
              style={baseInputStyle}
            />
            {field.description && (
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {t(field.description, lang)}
              </p>
            )}
          </div>
        )

      case 'tags':
        return (
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
                className="w-full rounded-xl p-3 pr-16 text-sm outline-none transition-colors"
                style={baseInputStyle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const input = e.target as HTMLInputElement
                    const value = input.value.trim()
                    if (value) {
                      const current = config[field.name] || []
                      updateConfig(field.name, [...current, value])
                      input.value = ''
                    }
                  }
                }}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded"
                style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)' }}
              >
                Enter ↵
              </span>
            </div>
            {config[field.name]?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {config[field.name].map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-subtle)' }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => {
                        const newTags = config[field.name].filter((_: any, idx: number) => idx !== i)
                        updateConfig(field.name, newTags)
                      }}
                      className="transition-colors"
                      style={{ color: 'inherit' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )

      case 'select':
        return (
          <CustomSelect
            value={config[field.name] || field.default || ''}
            onChange={(v) => updateConfig(field.name, v)}
            options={[
              { value: '', label: 'Selecione...' },
              ...(field.options?.map(opt => ({
                value: opt.value,
                label: typeof opt.label === 'string' ? opt.label : t(opt.label, lang),
              })) || []),
            ]}
          />
        )

      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config[field.name] ?? field.default ?? false}
              onChange={(e) => updateConfig(field.name, e.target.checked)}
              className="w-5 h-5 rounded"
              style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {config[field.name] ?? field.default ? 'Sí' : 'No'}
            </span>
          </label>
        )

      default:
        return (
          <input
            type="text"
            value={config[field.name] || ''}
            onChange={(e) => updateConfig(field.name, e.target.value)}
            placeholder={field.placeholder ? t(field.placeholder, lang) : ''}
            className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
            style={baseInputStyle}
          />
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
      <div
        className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Plus size={18} style={{ color: 'var(--color-primary)' }} />
              {ui.createTitle}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{ui.createSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
              {ui.campaignName}
              <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors({ ...errors, name: false })
              }}
              placeholder={ui.campaignNamePlaceholder}
              className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
              style={{
                background: 'var(--color-bg-base)',
                border: `1px solid ${errors.name ? 'var(--color-error)' : 'var(--color-border-subtle)'}`,
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Campos dinâmicos do config_schema */}
          {fields.map(field => (
            <div key={field.name}>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                {t(field.label, lang)}
                {field.required && <span style={{ color: 'var(--color-error)' }}>*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}

          {/* Meta de leads */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
              {ui.targetLeads}
            </label>
            <input
              type="number"
              value={targetLeads}
              onChange={(e) => setTargetLeads(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ex: 100"
              min={1}
              className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
              style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{ui.targetLeadsHint}</p>
          </div>

          {/* Agendamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase mb-2 block" style={{ color: 'var(--color-text-tertiary)' }}>
                {ui.schedule}
              </label>
              <CustomSelect
                value={scheduleFrequency}
                onChange={(v) => setScheduleFrequency(v)}
                options={[
                  { value: 'daily', label: ui.daily },
                  { value: 'weekly', label: ui.weekly },
                  { value: 'manual', label: ui.manual },
                ]}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase mb-2 block" style={{ color: 'var(--color-text-tertiary)' }}>
                {ui.scheduleTime}
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full rounded-xl p-3 text-sm outline-none transition-colors"
                style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-5"
          style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {ui.cancel}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
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
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{ui.loading}</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!agent) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <Bot size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
          <p style={{ color: 'var(--color-text-tertiary)' }}>{ui.notFound}</p>
          <button
            onClick={() => router.push('/dashboard/agents')}
            className="mt-4 text-sm"
            style={{ color: 'var(--color-primary)' }}
          >
            {ui.back}
          </button>
        </div>
      </div>
    )
  }

  const solution = agent.solution
  const usage = calculateUsage(agent)
  const isFollowUp = agent.solution_slug?.includes('followup')
  const isSingleConfig = SINGLE_CONFIG_SLUGS.includes(agent.solution_slug)

  // Follow-up agents redirect to their dedicated management page
  if (isFollowUp) {
    router.replace('/dashboard/follow-up')
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  const handleToggleAgent = async () => {
    const { success, error: err } = await toggleAgentStatus(agent.id, agent.status)
    if (err) {
      toast.error(`${ui.error}: ${err}`)
      return
    }
    toast.success(ui.statusChanged)
    refresh()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/dashboard/agents')}
            className="p-2 rounded-lg transition-colors mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary-subtle)' }}>
                <Target size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              {solution ? t(solution.name, lang) : agent.solution_slug}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {solution ? t(solution.description, lang) : ''}
            </p>
          </div>
        </div>

        {isSingleConfig ? (
          /* Toggle ativo/pausado para agentes single-config */
          <button
            onClick={handleToggleAgent}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            style={{
              background: agent.status === 'active' ? 'var(--color-success-subtle)' : 'var(--color-accent-subtle)',
              color: agent.status === 'active' ? 'var(--color-success)' : 'var(--color-accent)',
              border: `1px solid ${agent.status === 'active' ? 'var(--color-success-subtle)' : 'var(--color-accent-subtle)'}`,
            }}
          >
            {agent.status === 'active' ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
            {agent.status === 'active' ? ui.agentActive : ui.agentPaused}
          </button>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} />
            {ui.newCampaign}
          </button>
        )}
      </div>

      {/* Usage Card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
      >
        <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
          <BarChart3 size={14} />
          {ui.usage}
        </h3>

        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-2">
              <span style={{ color: 'var(--color-text-tertiary)' }}>{ui.leadsMonth}</span>
              <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(usage.percentage, 100)}%`,
                  background: usage.percentage > 90 ? 'var(--color-error)' :
                    usage.percentage > 70 ? 'var(--color-accent)' :
                    'var(--gradient-brand)'
                }}
              />
            </div>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{usage.used}</div>
              <div className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>{ui.used}</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{usage.remaining}</div>
              <div className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>{ui.remaining}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ SINGLE-CONFIG: Painel de Treinamento ══════ */}
      {isSingleConfig ? (
        <TrainingPanel
          agent={agent}
          configSchema={solution?.campaign_config_schema || { fields: [] }}
          lang={lang}
          ui={ui}
          onSaved={refresh}
        />
      ) : (
        <>
          {/* ══════ MULTI-CONFIG: Campanhas ══════ */}
          <div>
            <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
              <Zap size={14} />
              {ui.campaigns} ({campaigns.length})
            </h3>

            {campaigns.length === 0 ? (
              <div
                className="border-dashed rounded-2xl p-12 text-center"
                style={{ background: 'var(--color-bg-surface)', border: '1px dashed var(--color-border-subtle)' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <Target size={24} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <h4 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{ui.noCampaigns}</h4>
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>{ui.noCampaignsHint}</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
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
        </>
      )}
    </div>
  )
}