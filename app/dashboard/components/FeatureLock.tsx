// components/FeatureLock.tsx
'use client'

import { ReactNode } from 'react'
import { usePlan, PlanFeatures } from '@/lib/usePlan'
import { Lock, Sparkles, ArrowRight, Crown, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    lockedTitle: 'Recurso Premium',
    lockedDesc: 'Faça upgrade para desbloquear',
    upgradeButton: 'Fazer Upgrade',
    learnMore: 'Saiba mais',
    availableIn: 'Disponível no plano',
    currentPlan: 'Seu plano atual',
    unlockWith: 'Desbloqueie com',
    // Features names
    aiAgents: 'Agentes de IA',
    automations: 'Automações',
    reports: 'Relatórios',
    apiAccess: 'Acesso à API',
    campaigns: 'Campanhas',
    trafficManager: 'Gestor de Tráfego',
    advancedDashboard: 'Dashboard Avançado',
  },
  en: {
    lockedTitle: 'Premium Feature',
    lockedDesc: 'Upgrade to unlock',
    upgradeButton: 'Upgrade Now',
    learnMore: 'Learn more',
    availableIn: 'Available in',
    currentPlan: 'Your current plan',
    unlockWith: 'Unlock with',
    aiAgents: 'AI Agents',
    automations: 'Automations',
    reports: 'Reports',
    apiAccess: 'API Access',
    campaigns: 'Campaigns',
    trafficManager: 'Traffic Manager',
    advancedDashboard: 'Advanced Dashboard',
  },
  es: {
    lockedTitle: 'Función Premium',
    lockedDesc: 'Mejora tu plan para desbloquear',
    upgradeButton: 'Mejorar Plan',
    learnMore: 'Saber más',
    availableIn: 'Disponible en el plan',
    currentPlan: 'Tu plan actual',
    unlockWith: 'Desbloquea con',
    aiAgents: 'Agentes de IA',
    automations: 'Automatizaciones',
    reports: 'Reportes',
    apiAccess: 'Acceso a API',
    campaigns: 'Campañas',
    trafficManager: 'Gestor de Tráfico',
    advancedDashboard: 'Dashboard Avanzado',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface FeatureLockProps {
  /** Feature a verificar */
  feature: keyof PlanFeatures
  /** Conteúdo a exibir quando liberado */
  children: ReactNode
  /** Idioma (default: pt) */
  lang?: Language
  /** Estilo do lock: 'overlay' | 'replace' | 'inline' */
  variant?: 'overlay' | 'replace' | 'inline' | 'badge'
  /** Título customizado */
  title?: string
  /** Descrição customizada */
  description?: string
  /** Mostrar botão de upgrade */
  showUpgradeButton?: boolean
  /** Classe CSS adicional */
  className?: string
}

interface UpgradeBannerProps {
  feature?: keyof PlanFeatures
  lang?: Language
  variant?: 'full' | 'compact' | 'minimal'
  className?: string
}

interface PlanBadgeProps {
  className?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: FeatureLock
// ═══════════════════════════════════════════════════════════════════════════════

export function FeatureLock({
  feature,
  children,
  lang = 'pt',
  variant = 'overlay',
  title,
  description,
  showUpgradeButton = true,
  className = ''
}: FeatureLockProps) {
  const router = useRouter()
  const { hasFeature, getUpgradePlanConfig, displayName } = usePlan()
  const t = TRANSLATIONS[lang]

  const isUnlocked = hasFeature(feature)
  const upgradePlan = getUpgradePlanConfig()

  // Se está desbloqueado, renderiza normalmente
  if (isUnlocked) {
    return <>{children}</>
  }

  const featureNames: Record<keyof PlanFeatures, string> = {
    hasAiAgents: t.aiAgents,
    hasAutomations: t.automations,
    hasReports: t.reports,
    hasApiAccess: t.apiAccess,
    hasCampaigns: t.campaigns,
    hasTrafficManager: t.trafficManager,
    hasAdvancedDashboard: t.advancedDashboard,
    hasCustomPipeline: 'Custom Pipeline',
    hasWhatsappIntegration: 'WhatsApp',
  }

  const featureName = featureNames[feature] || feature

  const handleUpgrade = () => {
    router.push('/dashboard/settings/billing')
  }

  // ─── VARIANT: OVERLAY ───
  if (variant === 'overlay') {
    return (
      <div className={`relative ${className}`}>
        {/* Conteúdo borrado */}
        <div className="blur-sm opacity-50 pointer-events-none select-none">
          {children}
        </div>
        
        {/* Overlay com lock */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
          <div className="text-center p-6 max-w-sm">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              {title || t.lockedTitle}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {description || `${t.unlockWith} ${upgradePlan?.displayName || 'Gold'}`}
            </p>
            {showUpgradeButton && (
              <button
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 mx-auto shadow-lg shadow-amber-500/25"
              >
                <Sparkles size={16} />
                {t.upgradeButton}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── VARIANT: REPLACE ───
  if (variant === 'replace') {
    return (
      <div className={`bg-[#111] border border-white/5 rounded-2xl p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <h3 className="text-white font-bold text-xl mb-2">
          {title || featureName}
        </h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          {description || `${t.availableIn} ${upgradePlan?.displayName || 'Gold'}`}
        </p>
        {showUpgradeButton && (
          <button
            onClick={handleUpgrade}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold px-8 py-3 rounded-xl text-sm transition-all inline-flex items-center gap-2 shadow-lg shadow-amber-500/25"
          >
            <Crown size={18} />
            {t.upgradeButton}
          </button>
        )}
        <p className="text-gray-600 text-xs mt-4">
          {t.currentPlan}: <span className="text-gray-400 font-medium">{displayName}</span>
        </p>
      </div>
    )
  }

  // ─── VARIANT: INLINE ───
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg ${className}`}>
        <Lock size={14} className="text-amber-400" />
        <span className="text-amber-400 text-xs font-medium">{upgradePlan?.displayName || 'Gold'}</span>
      </div>
    )
  }

  // ─── VARIANT: BADGE ───
  if (variant === 'badge') {
    return (
      <div className={`relative ${className}`}>
        {children}
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1 shadow-lg">
          <Lock size={12} className="text-black" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: UpgradeBanner
// ═══════════════════════════════════════════════════════════════════════════════

export function UpgradeBanner({
  feature,
  lang = 'pt',
  variant = 'compact',
  className = ''
}: UpgradeBannerProps) {
  const router = useRouter()
  const { isBasic, getUpgradePlanConfig, plan } = usePlan()
  const t = TRANSLATIONS[lang]

  // Não mostra se não é basic
  if (!isBasic) return null

  const upgradePlan = getUpgradePlanConfig()

  const handleUpgrade = () => {
    router.push('/dashboard/settings/billing')
  }

  // ─── VARIANT: FULL ───
  if (variant === 'full') {
    return (
      <div className={`bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-2xl p-6 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Desbloqueie todo o potencial</h3>
              <p className="text-gray-400 text-sm mt-0.5">
                Agentes de IA, automações, relatórios e muito mais
              </p>
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold px-6 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
          >
            <Crown size={18} />
            Upgrade para {upgradePlan?.displayName}
          </button>
        </div>
      </div>
    )
  }

  // ─── VARIANT: COMPACT ───
  if (variant === 'compact') {
    return (
      <div className={`bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3">
          <Lock size={16} className="text-amber-400 shrink-0" />
          <span className="text-amber-200 text-sm">
            {t.unlockWith} <strong>{upgradePlan?.displayName}</strong>
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          className="text-amber-400 hover:text-amber-300 text-sm font-bold flex items-center gap-1 shrink-0"
        >
          {t.upgradeButton}
          <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  // ─── VARIANT: MINIMAL ───
  return (
    <button
      onClick={handleUpgrade}
      className={`text-amber-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1 ${className}`}
    >
      <Lock size={12} />
      Upgrade
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: PlanBadge
// ═══════════════════════════════════════════════════════════════════════════════

export function PlanBadge({ className = '' }: PlanBadgeProps) {
  const { plan, displayName } = usePlan()

  const badgeStyles: Record<string, string> = {
    basic: 'bg-gray-800 text-gray-400 border-gray-700',
    gold: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    diamond: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    enterprise: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }

  const icons: Record<string, ReactNode> = {
    basic: null,
    gold: <Crown size={12} />,
    diamond: <Sparkles size={12} />,
    enterprise: <Zap size={12} />,
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyles[plan] || badgeStyles.basic} ${className}`}>
      {icons[plan]}
      {displayName}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: LimitWarning
// ═══════════════════════════════════════════════════════════════════════════════

interface LimitWarningProps {
  current: number
  limit: number
  label: string
  lang?: Language
  className?: string
}

export function LimitWarning({ current, limit, label, lang = 'pt', className = '' }: LimitWarningProps) {
  const router = useRouter()
  const { isBasic } = usePlan()
  
  if (limit === -1) return null // Ilimitado
  
  const percentage = (current / limit) * 100
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  if (!isNearLimit) return null

  return (
    <div className={`bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-amber-200 text-sm font-medium">{label}</span>
        <span className={`text-sm font-bold ${isAtLimit ? 'text-red-400' : 'text-amber-400'}`}>
          {current}/{limit}
        </span>
      </div>
      <div className="w-full bg-amber-900/30 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isBasic && isAtLimit && (
        <button
          onClick={() => router.push('/dashboard/settings/billing')}
          className="text-amber-400 hover:text-amber-300 text-xs font-medium mt-2 flex items-center gap-1"
        >
          Fazer upgrade para aumentar limite
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default FeatureLock