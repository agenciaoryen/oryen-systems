// app/dashboard/agents/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { usePlan } from '@/lib/usePlan'
import { FeatureLock } from '@/app/dashboard/components/FeatureLock'
import { 
  useAgentSolutions, 
  useMyAgents, 
  hireAgent, 
  updateAgentConfig, 
  toggleAgentStatus,
  getAgentTranslation
} from '@/lib/agents'
import type { Agent, AgentSolution, ConfigField } from '@/lib/agents/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'
import { toast } from 'sonner'
import { 
  Bot, Target, MessageSquare, Zap, Users, Rocket, Headphones,
  PlayCircle, PauseCircle, Settings, Activity, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, DollarSign, TrendingUp,
  X, Save, Loader2, Sparkles, ArrowRight, Shield, BarChart3,
  Lock, Star, Filter, Search, LayoutGrid, List, ExternalLink,
  HelpCircle, Info
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const UI_TRANSLATIONS = {
  pt: {
    pageTitle: 'Soluções de IA',
    pageSubtitle: 'Automatize vendas e atendimento com agentes inteligentes',
    myAgents: 'Meus Agentes',
    marketplace: 'Marketplace',
    all: 'Todos',
    conversation: 'Conversação',
    prospecting: 'Prospecção',
    support: 'Suporte',
    automation: 'Automação',
    instant: 'Ativação Instantânea',
    template: 'Setup Rápido',
    custom: 'Personalizado',
    active: 'Ativo',
    paused: 'Pausado',
    maintenance: 'Manutenção',
    pendingSetup: 'Aguardando Setup',
    lastRun: 'Última execução',
    neverRan: 'Nunca executou',
    totalCost: 'Custo total',
    successRate: 'Taxa de sucesso',
    runs: 'execuções',
    configure: 'Configurar',
    viewDetails: 'Ver detalhes',
    pause: 'Pausar',
    activate: 'Ativar',
    hire: 'Contratar',
    hireNow: 'Contratar agora',
    setupRequired: 'Requer setup',
    perMonth: '/mês',
    setupFee: 'Taxa de setup',
    features: 'Funcionalidades',
    limits: 'Limites',
    integrations: 'Integrações',
    leadsPerMonth: 'leads/mês',
    messagesPerDay: 'msgs/dia',
    searchesPerDay: 'buscas/dia',
    configTitle: 'Configurar Agente',
    configSubtitle: 'Personalize o comportamento da IA',
    save: 'Salvar',
    saving: 'Salvando...',
    cancel: 'Cancelar',
    confirmHire: 'Confirmar contratação',
    confirmHireMsg: 'Deseja ativar este agente? A cobrança será iniciada imediatamente.',
    hired: 'Agente contratado com sucesso!',
    configSaved: 'Configuração salva!',
    statusChanged: 'Status alterado!',
    error: 'Ocorreu um erro',
    lockedTitle: 'Soluções de IA',
    lockedDesc: 'Automatize tarefas com agentes de IA que trabalham 24/7 para você.',
    noAgents: 'Você ainda não tem agentes ativos',
    noAgentsHint: 'Explore o marketplace e contrate sua primeira solução de IA',
    exploreMarketplace: 'Explorar Marketplace',
    loading: 'Carregando...',
    filterByCategory: 'Filtrar por categoria',
    searchPlaceholder: 'Buscar soluções...',
    featured: 'Destaque',
    popular: 'Popular',
    new: 'Novo',
    whatsapp: 'WhatsApp',
    email: 'Email',
    linkedin: 'LinkedIn',
    openai: 'OpenAI',
    google_maps: 'Google Maps'
  },
  en: {
    pageTitle: 'AI Solutions',
    pageSubtitle: 'Automate sales and support with intelligent agents',
    myAgents: 'My Agents',
    marketplace: 'Marketplace',
    all: 'All',
    conversation: 'Conversation',
    prospecting: 'Prospecting',
    support: 'Support',
    automation: 'Automation',
    instant: 'Instant Activation',
    template: 'Quick Setup',
    custom: 'Custom',
    active: 'Active',
    paused: 'Paused',
    maintenance: 'Maintenance',
    pendingSetup: 'Pending Setup',
    lastRun: 'Last run',
    neverRan: 'Never ran',
    totalCost: 'Total cost',
    successRate: 'Success rate',
    runs: 'runs',
    configure: 'Configure',
    viewDetails: 'View details',
    pause: 'Pause',
    activate: 'Activate',
    hire: 'Hire',
    hireNow: 'Hire now',
    setupRequired: 'Setup required',
    perMonth: '/mo',
    setupFee: 'Setup fee',
    features: 'Features',
    limits: 'Limits',
    integrations: 'Integrations',
    leadsPerMonth: 'leads/mo',
    messagesPerDay: 'msgs/day',
    searchesPerDay: 'searches/day',
    configTitle: 'Configure Agent',
    configSubtitle: 'Customize the AI behavior',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    confirmHire: 'Confirm hiring',
    confirmHireMsg: 'Do you want to activate this agent? Billing will start immediately.',
    hired: 'Agent hired successfully!',
    configSaved: 'Configuration saved!',
    statusChanged: 'Status changed!',
    error: 'An error occurred',
    lockedTitle: 'AI Solutions',
    lockedDesc: 'Automate tasks with AI agents that work 24/7 for you.',
    noAgents: 'You don\'t have any active agents yet',
    noAgentsHint: 'Explore the marketplace and hire your first AI solution',
    exploreMarketplace: 'Explore Marketplace',
    loading: 'Loading...',
    filterByCategory: 'Filter by category',
    searchPlaceholder: 'Search solutions...',
    featured: 'Featured',
    popular: 'Popular',
    new: 'New',
    whatsapp: 'WhatsApp',
    email: 'Email',
    linkedin: 'LinkedIn',
    openai: 'OpenAI',
    google_maps: 'Google Maps'
  },
  es: {
    pageTitle: 'Soluciones de IA',
    pageSubtitle: 'Automatiza ventas y atención con agentes inteligentes',
    myAgents: 'Mis Agentes',
    marketplace: 'Marketplace',
    all: 'Todos',
    conversation: 'Conversación',
    prospecting: 'Prospección',
    support: 'Soporte',
    automation: 'Automatización',
    instant: 'Activación Instantánea',
    template: 'Setup Rápido',
    custom: 'Personalizado',
    active: 'Activo',
    paused: 'Pausado',
    maintenance: 'Mantenimiento',
    pendingSetup: 'Esperando Setup',
    lastRun: 'Última ejecución',
    neverRan: 'Nunca ejecutó',
    totalCost: 'Costo total',
    successRate: 'Tasa de éxito',
    runs: 'ejecuciones',
    configure: 'Configurar',
    viewDetails: 'Ver detalles',
    pause: 'Pausar',
    activate: 'Activar',
    hire: 'Contratar',
    hireNow: 'Contratar ahora',
    setupRequired: 'Requiere setup',
    perMonth: '/mes',
    setupFee: 'Tarifa de setup',
    features: 'Funcionalidades',
    limits: 'Límites',
    integrations: 'Integraciones',
    leadsPerMonth: 'leads/mes',
    messagesPerDay: 'msgs/día',
    searchesPerDay: 'búsquedas/día',
    configTitle: 'Configurar Agente',
    configSubtitle: 'Personaliza el comportamiento de la IA',
    save: 'Guardar',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    confirmHire: 'Confirmar contratación',
    confirmHireMsg: '¿Deseas activar este agente? La facturación comenzará inmediatamente.',
    hired: '¡Agente contratado con éxito!',
    configSaved: '¡Configuración guardada!',
    statusChanged: '¡Estado cambiado!',
    error: 'Ocurrió un error',
    lockedTitle: 'Soluciones de IA',
    lockedDesc: 'Automatiza tareas con agentes de IA que trabajan 24/7 para ti.',
    noAgents: 'Aún no tienes agentes activos',
    noAgentsHint: 'Explora el marketplace y contrata tu primera solución de IA',
    exploreMarketplace: 'Explorar Marketplace',
    loading: 'Cargando...',
    filterByCategory: 'Filtrar por categoría',
    searchPlaceholder: 'Buscar soluciones...',
    featured: 'Destacado',
    popular: 'Popular',
    new: 'Nuevo',
    whatsapp: 'WhatsApp',
    email: 'Email',
    linkedin: 'LinkedIn',
    openai: 'OpenAI',
    google_maps: 'Google Maps'
  }
}

type Language = keyof typeof UI_TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// ÍCONES
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS: Record<string, any> = {
  conversation: MessageSquare,
  prospecting: Target,
  support: Headphones,
  automation: Zap
}

const SOLUTION_ICONS: Record<string, any> = {
  sdr: MessageSquare,
  captacao: Target,
  followup: Clock,
  bdr: Rocket,
  atendimento: Headphones,
  onboarding: Users
}

const INTEGRATION_ICONS: Record<string, any> = {
  whatsapp: MessageSquare,
  email: MessageSquare,
  linkedin: Users,
  openai: Sparkles,
  google_maps: Target
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

// Card do Agente Ativo
function ActiveAgentCard({ 
  agent, 
  solution,
  lang,
  t,
  onConfigure,
  onToggleStatus,
  onViewDetails
}: {
  agent: Agent
  solution?: AgentSolution
  lang: Language
  t: typeof UI_TRANSLATIONS.pt
  onConfigure: () => void
  onToggleStatus: () => void
  onViewDetails: () => void
}) {
  const content = getAgentTranslation(agent.kind, lang)
  const Icon = SOLUTION_ICONS[agent.kind] || Bot
  const dateLocale = { pt: ptBR, en: enUS, es }[lang]
  
  const metrics = agent.metrics || {}
  const isActive = agent.status === 'active'
  const isPaused = agent.status === 'paused'
  const isMaintenance = agent.status === 'maintenance'
  const isPending = agent.status === 'pending_setup'
  
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
    <div className={`
      relative bg-[#0a0a0a] border rounded-2xl p-5 transition-all duration-300
      hover:border-white/20 hover:shadow-xl hover:shadow-white/5
      ${isMaintenance ? 'border-red-500/30' : isPaused ? 'border-amber-500/20' : 'border-white/10'}
    `}>
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <span className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
          ${statusColors[agent.status]}
        `}>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {isPaused && <PauseCircle size={10} />}
          {isMaintenance && <AlertTriangle size={10} />}
          {isPending && <Clock size={10} />}
          {statusLabels[agent.status]}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center shrink-0
          ${isActive ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}
        `}>
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0 pr-20">
          <h3 className="font-bold text-white text-lg truncate">{content.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {solution?.tier === 'instant' ? t.instant : solution?.tier === 'template' ? t.template : t.custom}
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase font-bold mb-1">
            <Activity size={10} />
            {t.lastRun}
          </div>
          <div className="flex items-center gap-2">
            {metrics.last_run_status === 'error' ? (
              <AlertTriangle size={12} className="text-red-400" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
            )}
            <span className="text-sm text-gray-300">
              {metrics.last_run_at 
                ? formatDistanceToNow(new Date(metrics.last_run_at), { addSuffix: true, locale: dateLocale })
                : t.neverRan
              }
            </span>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase font-bold mb-1">
            <DollarSign size={10} />
            {t.totalCost}
          </div>
          <span className="text-sm font-mono text-emerald-400">
            ${(metrics.total_cost || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Config Tags */}
      {agent.cfg && Object.keys(agent.cfg).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {Object.entries(agent.cfg).slice(0, 3).map(([key, value]) => (
            <span 
              key={key}
              className="text-[9px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full truncate max-w-[120px]"
            >
              {String(value)}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-white/5">
        <button
          onClick={onConfigure}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors"
        >
          <Settings size={14} />
          {t.configure}
        </button>
        
        <button
          onClick={onToggleStatus}
          disabled={isMaintenance || isPending}
          className={`
            w-11 flex items-center justify-center rounded-xl border transition-all
            ${isActive 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
              : isPaused
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
            }
          `}
          title={isActive ? t.pause : t.activate}
        >
          {isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
        </button>

        <button
          onClick={onViewDetails}
          className="w-11 flex items-center justify-center rounded-xl border bg-gray-900 border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
          title={t.viewDetails}
        >
          <BarChart3 size={16} />
        </button>
      </div>
    </div>
  )
}

// Card do Marketplace
function MarketplaceCard({
  solution,
  lang,
  t,
  isHired,
  isHiring,
  onHire
}: {
  solution: AgentSolution
  lang: Language
  t: typeof UI_TRANSLATIONS.pt
  isHired: boolean
  isHiring: boolean
  onHire: () => void
}) {
  const content = getAgentTranslation(solution.slug, lang)
  const Icon = SOLUTION_ICONS[solution.slug] || Bot
  const CategoryIcon = CATEGORY_ICONS[solution.category] || Zap
  
  const isInstant = solution.tier === 'instant'
  const hasSetupFee = (solution.price_setup || 0) > 0

  return (
    <div className={`
      relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 transition-all duration-300
      hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5
      ${isHired ? 'opacity-50 pointer-events-none' : ''}
      ${solution.is_featured ? 'ring-1 ring-blue-500/30' : ''}
    `}>
      {/* Featured Badge */}
      {solution.is_featured && !isHired && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[9px] font-bold uppercase rounded-full shadow-lg">
            <Star size={8} />
            {t.featured}
          </span>
        </div>
      )}

      {/* Hired Badge */}
      {isHired && (
        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center z-10">
          <span className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-sm font-bold">
            <CheckCircle2 size={14} />
            Contratado
          </span>
        </div>
      )}

      {/* Tier Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={`
          inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide
          ${isInstant 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }
        `}>
          {isInstant ? <Zap size={9} /> : <Clock size={9} />}
          {isInstant ? t.instant : t.setupRequired}
        </span>
        
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <CategoryIcon size={10} />
          {t[solution.category as keyof typeof t] || solution.category}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-lg">{content.name}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{content.description}</p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-1.5 mb-4">
        {content.features.slice(0, 3).map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            {feature}
          </div>
        ))}
      </div>

      {/* Integrations */}
      {solution.required_integrations && solution.required_integrations.length > 0 && (
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
          <span className="text-[9px] text-gray-600 uppercase font-bold">{t.integrations}:</span>
          <div className="flex gap-1">
            {solution.required_integrations.map(integration => {
              const IntIcon = INTEGRATION_ICONS[integration] || Zap
              return (
                <span 
                  key={integration}
                  className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-500"
                  title={t[integration as keyof typeof t] || integration}
                >
                  <IntIcon size={10} />
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">${solution.price_monthly || 0}</span>
            <span className="text-xs text-gray-500">{t.perMonth}</span>
          </div>
          {hasSetupFee && (
            <span className="text-[10px] text-gray-500">
              + ${solution.price_setup} {t.setupFee}
            </span>
          )}
        </div>
        
        {solution.limits && (
          <div className="text-right">
            {solution.limits.leads_per_month && (
              <div className="text-[10px] text-gray-500">
                {solution.limits.leads_per_month} {t.leadsPerMonth}
              </div>
            )}
            {solution.limits.messages_per_day && (
              <div className="text-[10px] text-gray-500">
                {solution.limits.messages_per_day} {t.messagesPerDay}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onHire}
        disabled={isHired || isHiring}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isHiring ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Contratando...
          </>
        ) : (
          <>
            {isInstant ? t.hireNow : t.hire}
            <ArrowRight size={14} />
          </>
        )}
      </button>
    </div>
  )
}

// Modal de Configuração
function ConfigModal({
  isOpen,
  agent,
  solution,
  lang,
  t,
  onClose,
  onSave
}: {
  isOpen: boolean
  agent: Agent | null
  solution?: AgentSolution
  lang: Language
  t: typeof UI_TRANSLATIONS.pt
  onClose: () => void
  onSave: (config: Record<string, any>) => Promise<void>
}) {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const content = agent ? getAgentTranslation(agent.kind, lang) : null

  useEffect(() => {
    if (agent) {
      setConfig(agent.cfg || {})
    }
  }, [agent])

  if (!isOpen || !agent) return null

  const configSchema = solution?.config_schema?.fields || []

  const handleSave = async () => {
    setSaving(true)
    await onSave(config)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-blue-400" />
              {t.configTitle}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{content?.name}</p>
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
          {configSchema.length === 0 ? (
            <div className="p-6 bg-gray-900/50 rounded-xl border border-white/5 text-center">
              <Info size={24} className="mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500">Este agente não possui configurações personalizáveis.</p>
            </div>
          ) : (
            configSchema.map((field: ConfigField) => (
              <div key={field.key}>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase mb-2">
                  {field.label}
                  {field.required && <span className="text-red-400">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    value={config[field.key] || ''}
                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none resize-none h-24 transition-colors"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={config[field.key] || ''}
                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                  >
                    <option value="">Selecionar...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={config[field.key] || ''}
                    onChange={(e) => setConfig({ ...config, [field.key]: Number(e.target.value) })}
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                ) : field.type === 'boolean' ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config[field.key] || false}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.checked })}
                      className="w-5 h-5 rounded bg-black border-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-400">Sim</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={config[field.key] || ''}
                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-black/30">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AgentsMarketplacePage() {
  const router = useRouter()
  const { user, org, loading: authLoading } = useAuth()
  const { canUseAiAgents } = usePlan()
  
  // Dados - só busca quando org estiver carregada
  const { solutions, loading: loadingSolutions, error: solutionsError } = useAgentSolutions()
  const { agents, loading: loadingAgents, refresh: refreshAgents, error: agentsError } = useMyAgents(org?.id)
  
  // Debug logs
  if (process.env.NODE_ENV === 'development') {
    console.log('AgentsPage Debug:', { 
      authLoading, 
      orgId: org?.id, 
      canUseAiAgents,
      loadingSolutions,
      loadingAgents,
      solutionsError,
      agentsError,
      solutionsCount: solutions.length,
      agentsCount: agents.length
    })
  }
  
  // UI State
  const [activeTab, setActiveTab] = useState<'my-agents' | 'marketplace'>('marketplace')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [configAgent, setConfigAgent] = useState<Agent | null>(null)
  const [hiring, setHiring] = useState<string | null>(null) // slug do agent sendo contratado

  // Localização
  const lang = ((user as any)?.language as Language) || 'pt'
  const t = UI_TRANSLATIONS[lang]

  // Filtrar soluções do marketplace
  const filteredSolutions = solutions.filter(s => {
    // Filtro de categoria
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
    
    // Filtro de busca
    if (searchQuery) {
      const content = getAgentTranslation(s.slug, lang)
      const query = searchQuery.toLowerCase()
      if (!content.name.toLowerCase().includes(query) && 
          !content.description.toLowerCase().includes(query)) {
        return false
      }
    }
    
    return true
  })

  // Handlers
  const handleHire = async (solution: AgentSolution) => {
    if (!org?.id) {
      toast.error('Organização não encontrada')
      return
    }
    
    const content = getAgentTranslation(solution.slug, lang)
    const confirmed = window.confirm(`${t.confirmHireMsg}\n\n${content.name} - $${solution.price_monthly || 0}${t.perMonth}`)
    
    if (!confirmed) return
    
    setHiring(solution.slug)
    
    try {
      const { agent, error } = await hireAgent(org.id, solution.slug)
      
      if (error) {
        console.error('Hire error:', error)
        toast.error(`${t.error}: ${error}`)
        return
      }
      
      toast.success(t.hired)
      await refreshAgents()
      setActiveTab('my-agents')
    } catch (err: any) {
      console.error('Hire exception:', err)
      toast.error(`${t.error}: ${err.message}`)
    } finally {
      setHiring(null)
    }
  }

  const handleSaveConfig = async (config: Record<string, any>) => {
    if (!configAgent || !org?.id) return
    
    const { success, error } = await updateAgentConfig(configAgent.id, org.id, config)
    
    if (error) {
      toast.error(t.error)
      return
    }
    
    toast.success(t.configSaved)
    refreshAgents()
    setConfigAgent(null)
  }

  const handleToggleStatus = async (agent: Agent) => {
    if (!org?.id) return
    
    const { newStatus, error } = await toggleAgentStatus(agent.id, org.id, agent.status)
    
    if (error) {
      toast.error(error)
      return
    }
    
    toast.success(t.statusChanged)
    refreshAgents()
  }

  // ─── VERIFICAR PERMISSÃO ───
  // Temporariamente desabilitado para teste - remover depois
  // if (!canUseAiAgents) {
  //   return (...)
  // }

  const loading = authLoading || loadingSolutions || loadingAgents

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            {t.pageTitle}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t.pageSubtitle}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0a0a0a] rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('my-agents')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === 'my-agents' 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <Activity size={14} />
            {t.myAgents}
            {agents.length > 0 && (
              <span className={`
                px-1.5 py-0.5 rounded text-[10px] font-bold
                ${activeTab === 'my-agents' ? 'bg-black/10' : 'bg-white/10'}
              `}>
                {agents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === 'marketplace' 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <Sparkles size={14} />
            {t.marketplace}
          </button>
        </div>
      </div>

      {/* My Agents Tab */}
      {activeTab === 'my-agents' && (
        <>
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center mb-4">
                <Bot size={32} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{t.noAgents}</h3>
              <p className="text-sm text-gray-500 mb-6">{t.noAgentsHint}</p>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {t.exploreMarketplace}
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map(agent => {
                const solution = solutions.find(s => s.slug === agent.kind)
                return (
                  <ActiveAgentCard
                    key={agent.id}
                    agent={agent}
                    solution={solution}
                    lang={lang}
                    t={t}
                    onConfigure={() => setConfigAgent(agent)}
                    onToggleStatus={() => handleToggleStatus(agent)}
                    onViewDetails={() => router.push(`/dashboard/agents/${agent.id}`)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="flex bg-[#0a0a0a] rounded-xl p-1 border border-white/10 overflow-x-auto">
              {['all', 'conversation', 'prospecting', 'support'].map(category => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                    ${categoryFilter === category 
                      ? 'bg-white text-black' 
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {t[category as keyof typeof t] || category}
                </button>
              ))}
            </div>
          </div>

          {/* Solutions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSolutions.map(solution => {
              const isHired = agents.some(a => a.kind === solution.slug)
              return (
                <MarketplaceCard
                  key={solution.slug}
                  solution={solution}
                  lang={lang}
                  t={t}
                  isHired={isHired}
                  isHiring={hiring === solution.slug}
                  onHire={() => handleHire(solution)}
                />
              )
            })}
          </div>

          {filteredSolutions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={32} className="text-gray-600 mb-4" />
              <p className="text-sm text-gray-500">Nenhuma solução encontrada</p>
            </div>
          )}
        </>
      )}

      {/* Config Modal */}
      <ConfigModal
        isOpen={!!configAgent}
        agent={configAgent}
        solution={configAgent ? solutions.find(s => s.slug === configAgent.kind) : undefined}
        lang={lang}
        t={t}
        onClose={() => setConfigAgent(null)}
        onSave={handleSaveConfig}
      />
    </div>
  )
}