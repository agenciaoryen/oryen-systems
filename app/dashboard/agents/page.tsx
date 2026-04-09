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
  SINGLE_CONFIG_SLUGS,
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

// WhatsApp icon component (Lucide-compatible)
const WhatsAppIcon = ({ size = 24, ...props }: { size?: number; [key: string]: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

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
  sdr: WhatsAppIcon,
  sdr_imobiliario: WhatsAppIcon,
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
    configure: 'Configurar',
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
    configure: 'Configure',
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
    configure: 'Configurar',
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
    <div
      className={`rounded-2xl p-5 transition-all duration-300`}
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid ${isActive ? 'var(--color-border-subtle)' : 'var(--color-accent-subtle)'}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isActive ? 'var(--color-border-subtle)' : 'var(--color-accent-subtle)'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: isActive ? 'var(--color-primary-subtle)' : 'var(--color-accent-subtle)',
              color: isActive ? 'var(--color-primary)' : 'var(--color-accent)',
            }}
          >
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {solution ? t(solution.name, lang) : agent.solution_slug}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: isActive ? 'var(--color-success-subtle)' : 'var(--color-accent-subtle)',
                  color: isActive ? 'var(--color-success)' : 'var(--color-accent)',
                }}
              >
                {isActive ? <PlayCircle size={8} /> : <PauseCircle size={8} />}
                {isActive ? ui.active : ui.paused}
              </span>
              {!SINGLE_CONFIG_SLUGS.includes(agent.solution_slug) && (
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {agent.campaigns_count || 0} {ui.campaigns}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span style={{ color: 'var(--color-text-tertiary)' }}>{ui.leadsMonth}</span>
          <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {usage.used} / {usage.limit}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
          <div
            className={`h-full rounded-full transition-all`}
            style={{
              width: `${Math.min(usage.percentage, 100)}%`,
              background: usage.percentage > 90 ? 'var(--color-error)' :
                usage.percentage > 70 ? 'var(--color-accent)' :
                'var(--gradient-brand)'
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span style={{ color: 'var(--color-text-muted)' }}>{usage.used} {ui.used}</span>
          <span style={{ color: 'var(--color-success)' }}>{usage.remaining} {ui.remaining}</span>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={onManage}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors"
        style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }}
      >
        {agent.solution_slug.includes('followup') ? (
          <>
            <Activity size={14} />
            {ui.manage}
          </>
        ) : SINGLE_CONFIG_SLUGS.includes(agent.solution_slug) ? (
          <>
            <Settings size={14} />
            {ui.configure}
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
    <div
      className={`relative rounded-2xl p-5 transition-all duration-300 ${isHired ? 'opacity-60' : ''}`}
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid var(--color-border-subtle)`,
        boxShadow: solution.is_featured ? '0 0 0 1px var(--color-primary-subtle)' : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary-subtle)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
      }}
    >
      {/* Featured Badge */}
      {solution.is_featured && !isHired && (
        <div className="absolute -top-2 -right-2 z-10">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded-full shadow-lg"
            style={{ background: 'var(--gradient-brand)', color: '#fff' }}
          >
            <Sparkles size={8} />
            {ui.featured}
          </span>
        </div>
      )}

      {/* Hired Overlay */}
      {isHired && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center z-10" style={{ background: 'var(--color-bg-overlay)' }}>
          <span
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', color: 'var(--color-success)' }}
          >
            <CheckCircle2 size={14} />
            Contratado
          </span>
        </div>
      )}

      {/* Category */}
      <div className="flex items-center gap-1.5 text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
        <CategoryIcon size={10} />
        {ui[solution.category as keyof typeof ui] || solution.category}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-tertiary)' }}
        >
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text-primary)' }}>
            {t(solution.name, lang)}
          </h3>
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
            {t(solution.description, lang)}
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-1.5 mb-4">
        {features.slice(0, 4).map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            <CheckCircle2 size={10} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
            <span className="truncate">{feature}</span>
          </div>
        ))}
      </div>

      {/* Limits */}
      {solution.default_limits && (
        <div
          className="flex items-center gap-3 mb-4 py-2 px-3 rounded-lg"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp size={10} style={{ color: 'var(--color-success)' }} />
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              {solution.default_limits.leads_per_month} {ui.leadsMonth}
            </span>
          </div>
          {solution.default_limits.campaigns_max && (
            <div className="flex items-center gap-1.5 text-xs">
              <Layers size={10} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-tertiary)' }}>
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
            <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              ${solution.price_monthly}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui.perMonth}</span>
          </div>
          {hasSetup && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              + ${solution.price_setup} {ui.setup}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onHire}
        disabled={isHired || isHiring}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--gradient-brand)', color: '#fff' }}
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
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{ui.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <Bot size={20} style={{ color: 'var(--color-text-primary)' }} />
            </div>
            {ui.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{ui.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl p-1" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
          <button
            onClick={() => setActiveTab('agents')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            `}
            style={activeTab === 'agents'
              ? { background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }
              : { color: 'var(--color-text-tertiary)' }
            }
          >
            <Activity size={14} />
            {ui.myAgents}
            {filteredAgents.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: activeTab === 'agents' ? 'rgba(0,0,0,0.1)' : 'var(--color-bg-hover)' }}
              >
                {filteredAgents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            `}
            style={activeTab === 'marketplace'
              ? { background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }
              : { color: 'var(--color-text-tertiary)' }
            }
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
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
              >
                <Bot size={32} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{ui.noAgents}</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>{ui.noAgentsHint}</p>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
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
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ui.searchPlaceholder}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)', placeholderColor: 'var(--color-text-muted)' }}
              />
            </div>

            {/* Category Filter */}
            <div className="flex rounded-xl p-1 overflow-x-auto" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              {['all', 'prospecting', 'conversation', 'support'].map(category => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                  style={categoryFilter === category
                    ? { background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }
                    : { color: 'var(--color-text-tertiary)' }
                  }
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
              <Search size={32} style={{ color: 'var(--color-text-muted)' }} className="mb-4" />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nenhuma solução encontrada</p>
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmação */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div
            className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
          >
            {/* Header com gradiente */}
            <div className="relative p-6 pb-10" style={{ background: 'var(--gradient-brand)' }}>
              <button
                onClick={() => setConfirmModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-text-primary)' }}
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl backdrop-blur flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Rocket size={24} style={{ color: 'var(--color-text-primary)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {ui.confirmHireTitle}
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t(confirmModal.name, lang)}
                  </p>
                </div>
              </div>
            </div>

            {/* Preço destacado */}
            <div className="relative -mt-5 mx-5">
              <div
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
              >
                <div>
                  <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-text-muted)' }}>Precio mensual</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>${confirmModal.price_monthly}</span>
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{ui.perMonth}</span>
                  </div>
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-success-subtle)' }}
                >
                  <CreditCard size={20} style={{ color: 'var(--color-success)' }} />
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                {ui.confirmHireDesc}
              </p>

              {/* O que inclui */}
              <div>
                <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  <ShieldCheck size={12} />
                  {ui.whatYouGet}
                </h4>
                <div className="space-y-2">
                  {confirmModal.default_limits?.leads_per_month && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {confirmModal.default_limits.leads_per_month} {ui.leadsMonth}
                      </span>
                    </div>
                  )}
                  {confirmModal.default_limits?.campaigns_max && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        Hasta {confirmModal.default_limits.campaigns_max} campañas activas
                      </span>
                    </div>
                  )}
                  {tFeatures(confirmModal.features, lang).slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso de cobrança */}
              <div
                className="flex items-start gap-2 p-3 rounded-lg"
                style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-subtle)' }}
              >
                <CreditCard size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
                  {ui.billingInfo}
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 text-sm font-medium rounded-xl transition-colors"
                style={{ color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-subtle)' }}
              >
                {ui.cancel}
              </button>
              <button
                onClick={() => handleHire(confirmModal)}
                disabled={hiring === confirmModal.slug}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'var(--gradient-brand)', color: '#fff' }}
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