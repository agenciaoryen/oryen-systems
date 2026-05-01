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
import { usePlan, planHasAgent, getMinPlanForAgent, PLAN_CONFIGS, type PlanConfig } from '@/lib/usePlan'
import { toast } from 'sonner'
import {
  Bot, Target, MessageSquare, Zap, Headphones,
  PlayCircle, PauseCircle, Settings, Activity,
  CheckCircle2, Clock, DollarSign, Users,
  Loader2, Sparkles, ArrowRight, Search,
  Plus, BarChart3, Layers, TrendingUp, X,
  ShieldCheck, CreditCard, Rocket, Lock
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
  hunter_b2b: Search,        // alinhado com o novo nome "Captação"
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

// Whitelist por nicho. Quando a org tem nicho aqui listado, só vê os slugs
// declarados (resto fica oculto). Nichos NÃO listados (incluindo ai_agency)
// veem tudo, com a única exceção dos slugs com sufixo _imobiliario que ficam
// só pra real_estate.
const NICHE_SOLUTIONS: Record<string, string[]> = {
  real_estate: ['sdr_imobiliario', 'followup_imobiliario', 'bdr_email', 'hunter_b2b'],
}

// Slugs que ficam ocultos pra real_estate (que tem variantes _imobiliario)
const HIDDEN_FOR_REAL_ESTATE = ['sdr', 'followup']

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES UI
// ═══════════════════════════════════════════════════════════════════════════════

const UI = {
  pt: {
    title: 'Agentes de IA',
    subtitle: 'Automatize a qualificação e o follow-up de contatos com inteligência artificial',
    myAgents: 'Meus Agentes',
    solutions: 'Soluções',
    active: 'Ativo',
    paused: 'Pausado',
    campaigns: 'campanhas',
    leadsMonth: 'contatos/mês',
    messagesMonth: 'mensagens/mês',
    used: 'usados',
    remaining: 'restantes',
    manage: 'Gerenciar',
    viewCampaigns: 'Ver Campanhas',
    configure: 'Configurar',
    activate: 'Ativar Agente',
    activating: 'Ativando...',
    includedInPlan: 'Incluso no seu plano',
    features: 'Recursos',
    noAgents: 'Você ainda não tem agentes',
    noAgentsHint: 'Explore as soluções disponíveis no seu plano e ative seu primeiro agente de IA',
    explore: 'Ver Soluções',
    confirmActivateTitle: 'Ativar Agente',
    confirmActivateDesc: 'Este agente será ativado na sua organização sem custo adicional.',
    confirmButton: 'Ativar',
    cancel: 'Cancelar',
    hired: 'Agente ativado com sucesso!',
    error: 'Erro ao ativar',
    loading: 'Carregando...',
    featured: 'Destaque',
    all: 'Todos',
    prospecting: 'Qualificação',
    conversation: 'Conversação',
    support: 'Suporte',
    searchPlaceholder: 'Buscar agentes...',
    lockedTitle: 'Disponível no plano',
    lockedUpgrade: 'Fazer Upgrade',
    availableIn: 'A partir do plano',
    planLimit: 'Limite do plano',
    unlimited: 'Ilimitado',
    ofPlan: 'do plano'
  },
  en: {
    title: 'AI Agents',
    subtitle: 'Automate contact qualification and follow-up with artificial intelligence',
    myAgents: 'My Agents',
    solutions: 'Solutions',
    active: 'Active',
    paused: 'Paused',
    campaigns: 'campaigns',
    leadsMonth: 'contacts/mo',
    messagesMonth: 'messages/mo',
    used: 'used',
    remaining: 'remaining',
    manage: 'Manage',
    viewCampaigns: 'View Campaigns',
    configure: 'Configure',
    activate: 'Activate Agent',
    activating: 'Activating...',
    includedInPlan: 'Included in your plan',
    features: 'Features',
    noAgents: 'You don\'t have any agents yet',
    noAgentsHint: 'Explore the solutions available in your plan and activate your first AI agent',
    explore: 'View Solutions',
    confirmActivateTitle: 'Activate Agent',
    confirmActivateDesc: 'This agent will be activated in your organization at no additional cost.',
    confirmButton: 'Activate',
    cancel: 'Cancel',
    hired: 'Agent activated successfully!',
    error: 'Error activating',
    loading: 'Loading...',
    featured: 'Featured',
    all: 'All',
    prospecting: 'Qualification',
    conversation: 'Conversation',
    support: 'Support',
    searchPlaceholder: 'Search solutions...',
    lockedTitle: 'Available on plan',
    lockedUpgrade: 'Upgrade',
    availableIn: 'Starting from plan',
    planLimit: 'Plan limit',
    unlimited: 'Unlimited',
    ofPlan: 'of plan'
  },
  es: {
    title: 'Agentes de IA',
    subtitle: 'Automatiza la calificación y el seguimiento de contactos con inteligencia artificial',
    myAgents: 'Mis Agentes',
    solutions: 'Soluciones',
    active: 'Activo',
    paused: 'Pausado',
    campaigns: 'campañas',
    leadsMonth: 'contactos/mes',
    messagesMonth: 'mensajes/mes',
    used: 'usados',
    remaining: 'restantes',
    manage: 'Gestionar',
    viewCampaigns: 'Ver Campañas',
    configure: 'Configurar',
    activate: 'Activar Agente',
    activating: 'Activando...',
    includedInPlan: 'Incluido en tu plan',
    features: 'Recursos',
    noAgents: 'Aún no tienes agentes',
    noAgentsHint: 'Explora las soluciones disponibles en tu plan y activa tu primer agente de IA',
    explore: 'Ver Soluciones',
    confirmActivateTitle: 'Activar Agente',
    confirmActivateDesc: 'Este agente será activado en tu organización sin costo adicional.',
    confirmButton: 'Activar',
    cancel: 'Cancelar',
    hired: '¡Agente activado con éxito!',
    error: 'Error al activar',
    loading: 'Cargando...',
    featured: 'Destacado',
    all: 'Todos',
    prospecting: 'Calificación',
    conversation: 'Conversación',
    support: 'Soporte',
    searchPlaceholder: 'Buscar soluciones...',
    lockedTitle: 'Disponible en plan',
    lockedUpgrade: 'Mejorar Plan',
    availableIn: 'A partir del plan',
    planLimit: 'Límite del plan',
    unlimited: 'Ilimitado',
    ofPlan: 'del plan'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

// Tipo para dados de uso real vindos da API
interface RealUsageData {
  messages: { current: number; limit: number }
  leads: { current: number; limit: number }
}

// Helper: resolver uso real e label do agente
function getAgentPlanUsage(
  agent: Agent,
  planConfig: PlanConfig,
  realUsage: RealUsageData,
  ui: typeof UI.es
): { used: number; limit: number; remaining: number; percentage: number; label: string } {
  const slug = agent.solution_slug

  // SDR/hunter → mensagens IA (contagem real da tabela sdr_messages)
  if (slug.includes('sdr') || slug.includes('hunter')) {
    const { current: used, limit } = realUsage.messages
    const remaining = limit === -1 ? -1 : Math.max(limit - used, 0)
    const percentage = limit === -1 ? 0 : limit > 0 ? (used / limit) * 100 : 0
    return { used, limit, remaining, percentage, label: ui.messagesMonth }
  }

  // Follow-up/support → mensagens IA (mesmo pool compartilhado)
  if (slug.includes('followup') || slug === 'support') {
    const { current: used, limit } = realUsage.messages
    const remaining = limit === -1 ? -1 : Math.max(limit - used, 0)
    const percentage = limit === -1 ? 0 : limit > 0 ? (used / limit) * 100 : 0
    return { used, limit, remaining, percentage, label: ui.messagesMonth }
  }

  // Fallback
  const fallback = calculateUsage(agent)
  return { ...fallback, label: ui.leadsMonth }
}

// Card de Agente Contratado
function AgentCard({
  agent,
  lang,
  ui,
  planConfig,
  realUsage,
  onManage
}: {
  agent: Agent
  lang: Language
  ui: typeof UI.es
  planConfig: PlanConfig
  realUsage: RealUsageData
  onManage: () => void
}) {
  const solution = agent.solution
  const Icon = SOLUTION_ICONS[agent.solution_slug] || Bot
  const usage = getAgentPlanUsage(agent, planConfig, realUsage, ui)
  const isActive = agent.status === 'active'
  const isUnlimited = usage.limit === -1

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

      {/* Plan Limit Badge */}
      <div
        className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
      >
        <ShieldCheck size={11} style={{ color: 'var(--color-primary)' }} />
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
          {ui.planLimit}: <strong style={{ color: 'var(--color-text-secondary)' }}>
            {isUnlimited ? ui.unlimited : usage.limit.toLocaleString()}
          </strong> {!isUnlimited && usage.label}
        </span>
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span style={{ color: 'var(--color-text-tertiary)' }}>{usage.label}</span>
          <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {usage.used.toLocaleString()} / {isUnlimited ? '∞' : usage.limit.toLocaleString()}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
          <div
            className={`h-full rounded-full transition-all`}
            style={{
              width: isUnlimited ? '5%' : `${Math.min(usage.percentage, 100)}%`,
              background: !isUnlimited && usage.percentage > 90 ? 'var(--color-error)' :
                !isUnlimited && usage.percentage > 70 ? 'var(--color-accent)' :
                'var(--gradient-brand)'
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span style={{ color: 'var(--color-text-muted)' }}>{usage.used.toLocaleString()} {ui.used}</span>
          <span style={{ color: 'var(--color-success)' }}>
            {isUnlimited ? ui.unlimited : `${usage.remaining.toLocaleString()} ${ui.remaining}`}
          </span>
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

// Card de Solução (disponível ou bloqueada por plano)
function SolutionCard({
  solution,
  lang,
  ui,
  isHired,
  isHiring,
  isAvailable,
  minPlanName,
  onActivate,
  onUpgrade
}: {
  solution: AgentSolution
  lang: Language
  ui: typeof UI.es
  isHired: boolean
  isHiring: boolean
  isAvailable: boolean
  minPlanName: string
  onActivate: () => void
  onUpgrade: () => void
}) {
  const Icon = SOLUTION_ICONS[solution.slug] || Bot
  const CategoryIcon = CATEGORY_ICONS[solution.category] || Zap
  const features = tFeatures(solution.features, lang)
  const isLocked = !isAvailable && !isHired

  return (
    <div
      className={`relative rounded-2xl p-5 transition-all duration-300 ${isLocked ? 'opacity-60' : ''}`}
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid ${isLocked ? 'var(--color-border-subtle)' : 'var(--color-border-subtle)'}`,
        boxShadow: solution.is_featured && !isLocked ? '0 0 0 1px var(--color-primary-subtle)' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isLocked) e.currentTarget.style.borderColor = 'var(--color-primary-subtle)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
      }}
    >
      {/* Featured Badge */}
      {solution.is_featured && !isHired && !isLocked && (
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
            {ui.active}
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
          style={{
            background: isLocked ? 'var(--color-bg-hover)' : 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            color: isLocked ? 'var(--color-text-muted)' : 'var(--color-text-tertiary)',
          }}
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
            <CheckCircle2 size={10} className="shrink-0" style={{ color: isLocked ? 'var(--color-text-muted)' : 'var(--color-primary)' }} />
            <span className="truncate">{feature}</span>
          </div>
        ))}
      </div>

      {/* Plan badge — incluso ou requer upgrade */}
      <div
        className="flex items-center gap-2 mb-4 py-2 px-3 rounded-lg"
        style={{
          background: isLocked ? 'var(--color-accent-subtle)' : 'var(--color-success-subtle)',
          border: `1px solid ${isLocked ? 'rgba(217, 165, 84, 0.2)' : 'rgba(84, 217, 140, 0.2)'}`,
        }}
      >
        {isLocked ? (
          <>
            <Lock size={12} style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
              {ui.availableIn} {minPlanName}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 size={12} style={{ color: 'var(--color-success)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
              {ui.includedInPlan}
            </span>
          </>
        )}
      </div>

      {/* CTA */}
      {isLocked ? (
        <button
          onClick={onUpgrade}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
        >
          <CreditCard size={14} />
          {ui.lockedUpgrade}
        </button>
      ) : (
        <button
          onClick={onActivate}
          disabled={isHired || isHiring}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--gradient-brand)', color: '#fff' }}
        >
          {isHiring ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {ui.activating}
            </>
          ) : (
            <>
              {ui.activate}
              <ArrowRight size={14} />
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AgentsPage() {
  const router = useRouter()
  const { user, activeOrg, activeOrgId, loading: authLoading } = useAuth()
  const { plan, planConfig } = usePlan()

  // Dados
  const { solutions, loading: loadingSolutions } = useAgentSolutions()
  const { agents, loading: loadingAgents, refresh } = useOrgAgents(activeOrgId || undefined)

  // Uso real da API (contagens reais do banco)
  const [realUsage, setRealUsage] = useState<RealUsageData>({
    messages: { current: 0, limit: 0 },
    leads: { current: 0, limit: 0 },
  })

  useEffect(() => {
    if (!activeOrgId) return
    const resources = ['messages', 'leads'] as const
    Promise.all(
      resources.map(r =>
        fetch(`/api/plan-limit?org_id=${activeOrgId}&resource=${r}`)
          .then(res => res.json())
          .then(data => ({ resource: r, current: data.current || 0, limit: data.limit ?? 0 }))
          .catch(() => ({ resource: r, current: 0, limit: 0 }))
      )
    ).then(results => {
      const map: any = {}
      results.forEach(r => { map[r.resource] = { current: r.current, limit: r.limit } })
      setRealUsage(map as RealUsageData)
    })
  }, [activeOrgId])

  // UI State
  const [activeTab, setActiveTab] = useState<'agents' | 'solutions'>('solutions')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hiring, setHiring] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<AgentSolution | null>(null)

  // Language
  const lang = ((user as any)?.language as Language) || 'pt'
  const ui = UI[lang]

  // Nicho da org ativa
  const activeNiche = activeOrg?.niche || null

  // Filtrar soluções por nicho + categoria + busca
  const filteredSolutions = solutions.filter(s => {
    // real_estate: whitelist explícita — só os slugs de NICHE_SOLUTIONS
    if (activeNiche && NICHE_SOLUTIONS[activeNiche]) {
      if (!NICHE_SOLUTIONS[activeNiche].includes(s.slug)) return false
    } else {
      // Outros nichos (ai_agency, etc) ou sem nicho: vê tudo,
      // exceto os slugs com sufixo _imobiliario (esses são exclusivos do real_estate).
      if (s.slug.includes('_imobiliario')) return false
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

  // Mesma lógica pra agentes já contratados
  const filteredAgents = agents.filter(a => {
    if (activeNiche && NICHE_SOLUTIONS[activeNiche]) {
      if (!NICHE_SOLUTIONS[activeNiche].includes(a.solution_slug)) return false
    } else {
      if (a.solution_slug.includes('_imobiliario')) return false
    }
    return true
  })

  // Setar tab inicial baseado nos agentes filtrados
  const [tabInitialized, setTabInitialized] = useState(false)
  useEffect(() => {
    if (!loadingAgents && !tabInitialized) {
      if (filteredAgents.length > 0) setActiveTab('agents')
      else setActiveTab('solutions')
      setTabInitialized(true)
    }
  }, [loadingAgents, filteredAgents.length, tabInitialized])

  // Handlers
  const handleHire = async (solution: AgentSolution) => {
    if (!activeOrgId) {
      toast.error('Organización no encontrada')
      return
    }

    setHiring(solution.slug)
    setConfirmModal(null)

    try {
      const { agent, error } = await hireAgent(activeOrgId, solution.slug)

      if (error) {
        toast.error(`${ui.error}: ${error}`)
        return
      }

      toast.success(ui.hired)
      await refresh()

      // Redirecionar para a página do agente (bdr_email tem painel próprio)
      if (agent) {
        if (solution.slug === 'bdr_email') {
          router.push('/dashboard/agents/email-bdr')
        } else {
          router.push(`/dashboard/agents/${agent.id}`)
        }
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
            onClick={() => setActiveTab('solutions')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            `}
            style={activeTab === 'solutions'
              ? { background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }
              : { color: 'var(--color-text-tertiary)' }
            }
          >
            <Sparkles size={14} />
            {ui.solutions}
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
                onClick={() => setActiveTab('solutions')}
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
                  planConfig={planConfig}
                  realUsage={realUsage}
                  onManage={() => {
                    // Redirecionar para a página correta baseado no tipo de agente
                    if (agent.solution_slug.includes('followup')) {
                      router.push('/dashboard/follow-up')
                    } else if (agent.solution_slug === 'bdr_email') {
                      router.push('/dashboard/agents/email-bdr')
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

      {/* Solutions Tab */}
      {activeTab === 'solutions' && (
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
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
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

          {/* Solutions Grid — disponíveis primeiro, bloqueados depois */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...filteredSolutions]
              .sort((a, b) => {
                const aAvail = planHasAgent(plan, a.slug) ? 0 : 1
                const bAvail = planHasAgent(plan, b.slug) ? 0 : 1
                return aAvail - bAvail
              })
              .map(solution => {
                const isHired = agents.some(a => a.solution_slug === solution.slug)
                const isAvailable = planHasAgent(plan, solution.slug)
                const minPlan = getMinPlanForAgent(solution.slug)
                const minPlanDisplay = PLAN_CONFIGS[minPlan]?.displayName || minPlan

                return (
                  <SolutionCard
                    key={solution.slug}
                    solution={solution}
                    lang={lang}
                    ui={ui}
                    isHired={isHired}
                    isHiring={hiring === solution.slug}
                    isAvailable={isAvailable}
                    minPlanName={minPlanDisplay}
                    onActivate={() => setConfirmModal(solution)}
                    onUpgrade={() => router.push('/dashboard/settings/billing')}
                  />
                )
              })}
          </div>

          {filteredSolutions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={32} style={{ color: 'var(--color-text-muted)' }} className="mb-4" />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {lang === 'en' ? 'No solutions found' : lang === 'es' ? 'No se encontraron soluciones' : 'Nenhuma solução encontrada'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal de Confirmação — Ativar Agente (sem preço) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div
            className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
          >
            {/* Header */}
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
                    {ui.confirmActivateTitle}
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t(confirmModal.name, lang)}
                  </p>
                </div>
              </div>
            </div>

            {/* Badge incluso no plano */}
            <div className="relative -mt-5 mx-5">
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-success-subtle)' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{ui.includedInPlan}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui.confirmActivateDesc}</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="p-5 space-y-3">
              {tFeatures(confirmModal.features, lang).slice(0, 4).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>{feature}</span>
                </div>
              ))}
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
                    {ui.activating}
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