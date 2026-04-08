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
    hasAiAnalytics: 'AI Analytics',
    hasCustomPipeline: 'Custom Pipeline',
    hasWhatsappIntegration: 'WhatsApp',
    hasOfficialWhatsapp: 'WhatsApp Oficial',
    hasPrioritySupport: 'Suporte Prioritário',
    hasAccountManager: 'Gerente de Conta',
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
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-xl" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="text-center p-6 max-w-sm">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-accent-subtle)', border: '1px solid rgba(221, 160, 50, 0.3)' }}>
              <Lock className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {title || t.lockedTitle}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
              {description || `${t.unlockWith} ${upgradePlan?.displayName || 'Gold'}`}
            </p>
            {showUpgradeButton && (
              <button
                onClick={handleUpgrade}
                className="font-bold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 mx-auto"
                style={{ background: 'linear-gradient(135deg, #F0A030, #E08020)', color: '#000', boxShadow: '0 4px 16px rgba(221, 160, 50, 0.25)' }}
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
      <div className={`rounded-2xl p-8 text-center ${className}`} style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-accent-subtle)', border: '1px solid rgba(221, 160, 50, 0.2)' }}>
          <Lock className="w-7 h-7" style={{ color: 'var(--color-accent)' }} />
        </div>
        <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {title || featureName}
        </h3>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-muted)' }}>
          {description || `${t.availableIn} ${upgradePlan?.displayName || 'Gold'}`}
        </p>
        {showUpgradeButton && (
          <button
            onClick={handleUpgrade}
            className="font-bold px-8 py-3 rounded-xl text-sm transition-all inline-flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #F0A030, #E08020)', color: '#000', boxShadow: '0 4px 16px rgba(221, 160, 50, 0.25)' }}
          >
            <Crown size={18} />
            {t.upgradeButton}
          </button>
        )}
        <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
          {t.currentPlan}: <span className="font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{displayName}</span>
        </p>
      </div>
    )
  }

  // ─── VARIANT: INLINE ───
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${className}`} style={{ background: 'var(--color-accent-subtle)', border: '1px solid rgba(221, 160, 50, 0.2)' }}>
        <Lock size={14} style={{ color: 'var(--color-accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>{upgradePlan?.displayName || 'Gold'}</span>
      </div>
    )
  }

  // ─── VARIANT: BADGE ───
  if (variant === 'badge') {
    return (
      <div className={`relative ${className}`}>
        {children}
        <div className="absolute -top-2 -right-2 rounded-full p-1 shadow-lg" style={{ background: 'linear-gradient(135deg, #F0A030, #E08020)' }}>
          <Lock size={12} style={{ color: '#000' }} />
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
      <div className={`rounded-2xl p-6 ${className}`} style={{ background: 'var(--color-accent-subtle)', border: '1px solid rgba(221, 160, 50, 0.2)' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #F0A030, #E08020)' }}>
              <Zap className="w-6 h-6" style={{ color: '#000' }} />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Desbloqueie todo o potencial</h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Agentes de IA, automações, relatórios e muito mais
              </p>
            </div>
          </div>
          <button
            onClick={handleUpgrade}
            className="w-full sm:w-auto font-bold px-6 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #F0A030, #E08020)', color: '#000', boxShadow: '0 4px 16px rgba(221, 160, 50, 0.25)' }}
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
      <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${className}`} style={{ background: 'var(--color-accent-subtle)', border: '1px solid rgba(221, 160, 50, 0.2)' }}>
        <div className="flex items-center gap-3">
          <Lock size={16} className="shrink-0" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t.unlockWith} <strong>{upgradePlan?.displayName}</strong>
          </span>
        </div>
        <button
          onClick={handleUpgrade}
          className="text-sm font-bold flex items-center gap-1 shrink-0"
          style={{ color: 'var(--color-accent)' }}
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
      className={`text-xs font-medium flex items-center gap-1 ${className}`}
      style={{ color: 'var(--color-accent)' }}
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

  const badgeStyles: Record<string, React.CSSProperties> = {
    basic: { background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', borderColor: 'var(--color-border)' },
    gold: { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', borderColor: 'rgba(221, 160, 50, 0.3)' },
    diamond: { background: 'var(--color-indigo-subtle)', color: 'var(--color-indigo)', borderColor: 'rgba(110, 95, 255, 0.3)' },
    enterprise: { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', borderColor: 'rgba(90, 122, 230, 0.3)' },
  }

  const icons: Record<string, ReactNode> = {
    basic: null,
    gold: <Crown size={12} />,
    diamond: <Sparkles size={12} />,
    enterprise: <Zap size={12} />,
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${className}`} style={badgeStyles[plan] || badgeStyles.basic}>
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
    <div className={`rounded-xl px-4 py-3 ${className}`} style={{ background: 'var(--color-accent-subtle)', border: '1px solid rgba(221, 160, 50, 0.2)' }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="text-sm font-bold" style={{ color: isAtLimit ? 'var(--color-error)' : 'var(--color-accent)' }}>
          {current}/{limit}
        </span>
      </div>
      <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--color-border)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(percentage, 100)}%`, background: isAtLimit ? 'var(--color-error)' : 'var(--color-accent)' }}
        />
      </div>
      {isBasic && isAtLimit && (
        <button
          onClick={() => router.push('/dashboard/settings/billing')}
          className="text-xs font-medium mt-2 flex items-center gap-1"
          style={{ color: 'var(--color-accent)' }}
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