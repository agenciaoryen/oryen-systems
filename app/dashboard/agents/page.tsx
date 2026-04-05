// app/dashboard/agents/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { 
  useAgentSolutions, 
  useOrgAgents, 
  hireAgent,
  calculateUsage,
  t,
  tFeatures
} from '@/lib/agents'
import type { AgentSolution, Agent, Language } from '@/lib/agents/types'
import { toast } from 'sonner'
import { 
  Bot, Target, MessageSquare, Zap, Headphones,
  PlayCircle, PauseCircle, Settings, Activity,
  CheckCircle2, Clock, DollarSign, Users,
  Loader2, Sparkles, ArrowRight, Search,
  Plus, BarChart3, Layers, TrendingUp, X,
  ShieldCheck, CreditCard, Rocket
} from 'lucide-react'

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
  hunter_b2b: Target,
  sdr: MessageSquare,
  sdr_imobiliario: MessageSquare,
  followup: Clock,
  followup_imobiliario: Clock,
  support: Headphones
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTRO DE NICHO — quais soluções cada nicho pode ver
// Se o slug NÃO está listado, é visível para todos os nichos
// ═══════════════════════════════════════════════════════════════════════════════

const NICHE_SOLUTIONS: Record<string, string[]> = {
  real_estate: ['sdr_imobiliario', 'followup_imobiliario'],
}

// Slugs que são exclusivos de um nicho específico (B2B genérico)
const B2B_ONLY_SLUGS = ['hunter_b2b', 'sdr', 'bdr_prospector']

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES UI
// ═══════════════════════════════════════════════════════════════════════════════

const UI = {
  pt: {
    title: 'Agentes de IA',
    subtitle: 'Automatize a qualificação e o follow-up de contatos com inteligência artificial',
    myAgents: 'Meus Agentes',
    marketplace: 'Marketplace',
    active: 'Ativo',
    paused: 'Pausado',
    campaigns: 'campanhas',
    leadsMonth: 'contatos/mês',
    used: 'usados',
    remaining: 'restantes',
    manage: 'Gerenciar',
    viewCampaigns: 'Ver Campanhas',
    hire: 'Contratar',
    hiring: 'Contratando...',
    perMonth: '/mês',
    setup: 'Setup',
    features: 'Recursos',
    limits: 'Limites inclusos',
    noAgents: 'Você ainda não tem agentes',
    noAgentsHint: 'Explore o marketplace e contrate seu primeiro agente de IA imobiliário',
    explore: 'Explorar Marketplace',
    confirmHireTitle: 'Contratar Agente',
    confirmHireDesc: 'Você está prestes a contratar este agente de IA para sua organização.',
    whatYouGet: 'O que está incluso',
    billingInfo: 'A cobrança será processada imediatamente',
    confirmButton: 'Confirmar Contratação',
    cancel: 'Cancelar',
    hired: 'Agente contratado com sucesso!',
    error: 'Erro ao contratar',
    loading: 'Carregando...',
    featured: 'Destaque',
    all: 'Todos',
    prospecting: 'Qualificação',
    conversation: 'Conversação',
    support: 'Suporte',
    searchPlaceholder: 'Buscar agentes...'
  },
  en: {
    title: 'AI Agents',
    subtitle: 'Automate contact qualification and follow-up with artificial intelligence',
    myAgents: 'My Agents',
    marketplace: 'Marketplace',
    active: 'Active',
    paused: 'Paused',
    campaigns: 'campaigns',
    leadsMonth: 'contacts/mo',
    used: 'used',
    remaining: 'remaining',
    manage: 'Manage',
    viewCampaigns: 'View Campaigns',
    hire: 'Hire',
    hiring: 'Hiring...',
    perMonth: '/mo',
    setup: 'Setup',
    features: 'Features',
    limits: 'Included limits',
    noAgents: 'You don\'t have any agents yet',
    noAgentsHint: 'Explore the marketplace and hire your first real estate AI agent',
    explore: 'Explore Marketplace',
    confirmHireTitle: 'Hire Agent',
    confirmHireDesc: 'You are about to hire this AI agent for your organization.',
    whatYouGet: 'What\'s included',
    billingInfo: 'Billing will be processed immediately',
    confirmButton: 'Confirm Hiring',
    cancel: 'Cancel',
    hired: 'Agent hired successfully!',
    error: 'Error hiring',
    loading: 'Loading...',
    featured: 'Featured',
    all: 'All',
    prospecting: 'Qualification',
    conversation: 'Conversation',
    support: 'Support',
    searchPlaceholder: 'Search solutions...'
  },
  es: {
    title: 'Agentes de IA',
    subtitle: 'Automatiza la calificación y el seguimiento de contactos con inteligencia artificial',
    myAgents: 'Mis Agentes',
    marketplace: 'Marketplace',
    active: 'Activo',
    paused: 'Pausado',
    campaigns: 'campañas',
    leadsMonth: 'contactos/mes',
    used: 'usados',
    remaining: 'restantes',
    manage: 'Gestionar',
    viewCampaigns: 'Ver Campañas',
    hire: 'Contratar',
    hiring: 'Contratando...',
    perMonth: '/mes',
    setup: 'Setup',
    features: 'Recursos',
    limits: 'Límites incluidos',
    noAgents: 'Aún no tienes agentes',
    noAgentsHint: 'Explora el marketplace y contrata tu primer agente de IA',
    explore: 'Explorar Marketplace',
    confirmHireTitle: 'Contratar Agente',
    confirmHireDesc: 'Estás a punto de contratar este agente de IA para tu organización.',
    whatYouGet: 'Qué incluye',
    billingInfo: 'El cobro se procesará inmediatamente',
    confirmButton: 'Confirmar Contratación',
    cancel: 'Cancelar',
    hired: '¡Agente contratado con éxito!',
    error: 'Error al contratar',
    loading: 'Cargando...',
    featured: 'Destacado',
    all: 'Todos',
    prospecting: 'Calificación',
    conversation: 'Conversación',
    support: 'Soporte',
    searchPlaceholder: 'Buscar soluciones...'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

// Card de Agente Contratado
function AgentCard({ 
  agent,
  lang,
  ui,
  onManage
}: {
  agent: Agent
  lang: Language
  ui: typeof UI.es
  onManage: () => void
}) {
  const solution = agent.solution
  const Icon = SOLUTION_ICONS[agent.solution_slug] || Bot
  const usage = calculateUsage(agent)
  const isActive = agent.status === 'active'

  return (
    <div className={`
      bg-[#0a0a0a] border rounded-2xl p-5 transition-all duration-300
      hover:border-white/20 hover:shadow-xl hover:shadow-white/5
      ${isActive ? 'border-white/10' : 'border-amber-500/20'}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${isActive 
              ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400' 
              : 'bg-amber-500/10 text-amber-400'
            }
          `}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">
              {solution ? t(solution.name, lang) : agent.solution_slug}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`
                inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full
                ${isActive 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-amber-500/10 text-amber-400'
                }
              `}>
                {isActive ? <PlayCircle size={8} /> : <PauseCircle size={8} />}
                {isActive ? ui.active : ui.paused}
              </span>
              <span className="text-[10px] text-gray-500">
                {agent.campaigns_count || 0} {ui.campaigns}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">{ui.leadsMonth}</span>
          <span className="text-gray-300 font-mono">
            {usage.used} / {usage.limit}
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              usage.percentage > 90 ? 'bg-red-500' :
              usage.percentage > 70 ? 'bg-amber-500' :
              'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
            style={{ width: `${Math.min(usage.percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span className="text-gray-500">{usage.used} {ui.used}</span>
          <span className="text-emerald-400">{usage.remaining} {ui.remaining}</span>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={onManage}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors"
      >
        {agent.solution_slug.includes('followup') ? (
          <>
            <Activity size={14} />
            {ui.manage}
          </>
        ) : (
          <>
            <Layers size={14} />
            {ui.viewCampaigns}
          </>
        )}
      </button>
    </div>
  )
}

// Card do Marketplace
function MarketplaceCard({
  solution,
  lang,
  ui,
  isHired,
  isHiring,
  onHire
}: {
  solution: AgentSolution
  lang: Language
  ui: typeof UI.es
  isHired: boolean
  isHiring: boolean
  onHire: () => void
}) {
  const Icon = SOLUTION_ICONS[solution.slug] || Bot
  const CategoryIcon = CATEGORY_ICONS[solution.category] || Zap
  const features = tFeatures(solution.features, lang)
  const hasSetup = solution.price_setup > 0

  return (
    <div className={`
      relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 transition-all duration-300
      hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5
      ${isHired ? 'opacity-60' : ''}
      ${solution.is_featured ? 'ring-1 ring-blue-500/30' : ''}
    `}>
      {/* Featured Badge */}
      {solution.is_featured && !isHired && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[9px] font-bold uppercase rounded-full shadow-lg">
            <Sparkles size={8} />
            {ui.featured}
          </span>
        </div>
      )}

      {/* Hired Overlay */}
      {isHired && (
        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center z-10">
          <span className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-sm font-bold">
            <CheckCircle2 size={14} />
            Contratado
          </span>
        </div>
      )}

      {/* Category */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-3">
        <CategoryIcon size={10} />
        {ui[solution.category as keyof typeof ui] || solution.category}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-lg leading-tight">
            {t(solution.name, lang)}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {t(solution.description, lang)}
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-1.5 mb-4">
        {features.slice(0, 4).map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
            <CheckCircle2 size={10} className="text-blue-400 shrink-0" />
            <span className="truncate">{feature}</span>
          </div>
        ))}
      </div>

      {/* Limits */}
      {solution.default_limits && (
        <div className="flex items-center gap-3 mb-4 py-2 px-3 bg-gray-900/50 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp size={10} className="text-emerald-400" />
            <span className="text-gray-400">
              {solution.default_limits.leads_per_month} {ui.leadsMonth}
            </span>
          </div>
          {solution.default_limits.campaigns_max && (
            <div className="flex items-center gap-1.5 text-xs">
              <Layers size={10} className="text-blue-400" />
              <span className="text-gray-400">
                {solution.default_limits.campaigns_max} {ui.campaigns}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Price */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              ${solution.price_monthly}
            </span>
            <span className="text-xs text-gray-500">{ui.perMonth}</span>
          </div>
          {hasSetup && (
            <span className="text-[10px] text-gray-500">
              + ${solution.price_setup} {ui.setup}
            </span>
          )}
        </div>
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
            {ui.hiring}
          </>
        ) : (
          <>
            {ui.hire}
            <ArrowRight size={14} />
          </>
        )}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AgentsPage() {
  const router = useRouter()
  const { user, org, loading: authLoading } = useAuth()
  
  // Dados
  const { solutions, loading: loadingSolutions } = useAgentSolutions()
  const { agents, loading: loadingAgents, refresh } = useOrgAgents(org?.id)
  
  // UI State
  const [activeTab, setActiveTab] = useState<'agents' | 'marketplace'>('marketplace')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hiring, setHiring] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<AgentSolution | null>(null)

  // Language
  const lang = ((user as any)?.language as Language) || 'pt'
  const ui = UI[lang]

  // Nicho da org ativa
  const activeNiche = org?.niche || null

  // Filtrar soluções por nicho + categoria + busca
  const filteredSolutions = solutions.filter(s => {
    // Filtro de nicho: se a org é real_estate, mostrar apenas as soluções do nicho
    if (activeNiche && NICHE_SOLUTIONS[activeNiche]) {
      if (!NICHE_SOLUTIONS[activeNiche].includes(s.slug)) return false
    }
    // Se a org NÃO tem nicho definido OU é B2B, esconder os slugs imobiliários
    if (!activeNiche || !NICHE_SOLUTIONS[activeNiche]) {
      if (s.slug.includes('_imobiliario')) return false
    }
    // Se a org é de um nicho específico, esconder os B2B genéricos
    if (activeNiche && NICHE_SOLUTIONS[activeNiche]) {
      if (B2B_ONLY_SLUGS.includes(s.slug)) return false
    }

    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
    if (searchQuery) {
      const name = t(s.name, lang).toLowerCase()
      const desc = t(s.description, lang).toLowerCase()
      const query = searchQuery.toLowerCase()
      if (!name.includes(query) && !desc.includes(query)) return false
    }
    return true
  })

  // Filtrar agentes contratados pelo mesmo critério de nicho
  const filteredAgents = agents.filter(a => {
    if (activeNiche && NICHE_SOLUTIONS[activeNiche]) {
      if (B2B_ONLY_SLUGS.includes(a.solution_slug)) return false
    }
    if (!activeNiche || !NICHE_SOLUTIONS[activeNiche]) {
      if (a.solution_slug.includes('_imobiliario')) return false
    }
    return true
  })

  // Setar tab inicial baseado nos agentes filtrados
  const [tabInitialized, setTabInitialized] = useState(false)
  useEffect(() => {
    if (!loadingAgents && !tabInitialized) {
      if (filteredAgents.length > 0) setActiveTab('agents')
      setTabInitialized(true)
    }
  }, [loadingAgents, filteredAgents.length, tabInitialized])

  // Handlers
  const handleHire = async (solution: AgentSolution) => {
    if (!org?.id) {
      toast.error('Organización no encontrada')
      return
    }

    setHiring(solution.slug)
    setConfirmModal(null)
    
    try {
      const { agent, error } = await hireAgent(org.id, solution.slug)
      
      if (error) {
        toast.error(`${ui.error}: ${error}`)
        return
      }
      
      toast.success(ui.hired)
      await refresh()
      
      // Redirecionar para a página do agente
      if (agent) {
        router.push(`/dashboard/agents/${agent.id}`)
      }
    } catch (err: any) {
      toast.error(`${ui.error}: ${err.message}`)
    } finally {
      setHiring(null)
    }
  }

  // Loading
  const loading = authLoading || loadingSolutions || loadingAgents

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            {ui.title}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{ui.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0a0a0a] rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('agents')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === 'agents' 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <Activity size={14} />
            {ui.myAgents}
            {filteredAgents.length > 0 && (
              <span className={`
                px-1.5 py-0.5 rounded text-[10px] font-bold
                ${activeTab === 'agents' ? 'bg-black/10' : 'bg-white/10'}
              `}>
                {filteredAgents.length}
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
            {ui.marketplace}
          </button>
        </div>
      </div>

      {/* My Agents Tab */}
      {activeTab === 'agents' && (
        <>
          {filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center mb-4">
                <Bot size={32} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{ui.noAgents}</h3>
              <p className="text-sm text-gray-500 mb-6">{ui.noAgentsHint}</p>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {ui.explore}
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  lang={lang}
                  ui={ui}
                  onManage={() => {
                    // Redirecionar para a página correta baseado no tipo de agente
                    if (agent.solution_slug.includes('followup')) {
                      router.push('/dashboard/follow-up')
                    } else if (agent.solution_slug.includes('sdr')) {
                      router.push(`/dashboard/agents/${agent.id}`)
                    } else {
                      router.push(`/dashboard/agents/${agent.id}`)
                    }
                  }}
                />
              ))}
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
                placeholder={ui.searchPlaceholder}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="flex bg-[#0a0a0a] rounded-xl p-1 border border-white/10 overflow-x-auto">
              {['all', 'prospecting', 'conversation', 'support'].map(category => (
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
                  {ui[category as keyof typeof ui] || category}
                </button>
              ))}
            </div>
          </div>

          {/* Solutions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSolutions.map(solution => {
              const isHired = agents.some(a => a.solution_slug === solution.slug)
              return (
                <MarketplaceCard
                  key={solution.slug}
                  solution={solution}
                  lang={lang}
                  ui={ui}
                  isHired={isHired}
                  isHiring={hiring === solution.slug}
                  onHire={() => setConfirmModal(solution)}
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

      {/* Modal de Confirmação */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header com gradiente */}
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-6 pb-10">
              <button 
                onClick={() => setConfirmModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Rocket size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {ui.confirmHireTitle}
                  </h3>
                  <p className="text-sm text-white/70">
                    {t(confirmModal.name, lang)}
                  </p>
                </div>
              </div>
            </div>

            {/* Preço destacado */}
            <div className="relative -mt-5 mx-5">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-gray-500 font-bold">Precio mensual</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">${confirmModal.price_monthly}</span>
                    <span className="text-sm text-gray-500">{ui.perMonth}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CreditCard size={20} className="text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-400">
                {ui.confirmHireDesc}
              </p>

              {/* O que inclui */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <ShieldCheck size={12} />
                  {ui.whatYouGet}
                </h4>
                <div className="space-y-2">
                  {confirmModal.default_limits?.leads_per_month && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-gray-300">
                        {confirmModal.default_limits.leads_per_month} {ui.leadsMonth}
                      </span>
                    </div>
                  )}
                  {confirmModal.default_limits?.campaigns_max && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-gray-300">
                        Hasta {confirmModal.default_limits.campaigns_max} campañas activas
                      </span>
                    </div>
                  )}
                  {tFeatures(confirmModal.features, lang).slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso de cobrança */}
              <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <CreditCard size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-400/80">
                  {ui.billingInfo}
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-colors"
              >
                {ui.cancel}
              </button>
              <button
                onClick={() => handleHire(confirmModal)}
                disabled={hiring === confirmModal.slug}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {hiring === confirmModal.slug ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {ui.hiring}
                  </>
                ) : (
                  <>
                    <Rocket size={14} />
                    {ui.confirmButton}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}