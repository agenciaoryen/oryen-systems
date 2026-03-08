// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useAuth, useActivePlan } from '@/lib/AuthContext'
import { usePlan, PLAN_CONFIGS, type PlanName } from '@/lib/usePlan'
import { supabase } from '@/lib/supabase'
import {
  Crown,
  Sparkles,
  Zap,
  Check,
  X,
  CreditCard,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Shield,
  Users,
  Bot,
  BarChart3,
  Send,
  Megaphone,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Planos e Faturamento',
    subtitle: 'Gerencie sua assinatura e método de pagamento',
    currentPlan: 'Plano Atual',
    changePlan: 'Alterar Plano',
    comparePlans: 'Comparar Planos',
    billing: 'Faturamento',
    perMonth: '/mês',
    perYear: '/ano',
    save: 'Economize',
    mostPopular: 'Mais Popular',
    enterprise: 'Sob Consulta',
    contactSales: 'Falar com Vendas',
    currentPlanBadge: 'Atual',
    upgrade: 'Fazer Upgrade',
    downgrade: 'Fazer Downgrade',
    manage: 'Gerenciar',
    cancel: 'Cancelar Assinatura',
    reactivate: 'Reativar',
    
    // Status
    active: 'Ativo',
    trial: 'Período de Teste',
    pastDue: 'Pagamento Pendente',
    canceled: 'Cancelado',
    
    // Features
    features: 'Recursos inclusos',
    users: 'usuários',
    leads: 'leads ativos',
    unlimitedUsers: 'Usuários ilimitados',
    unlimitedLeads: 'Leads ilimitados',
    
    // Feature names
    f_crm: 'CRM Completo',
    f_pipeline: 'Pipeline Personalizável',
    f_whatsapp: 'Integração WhatsApp',
    f_ai: 'Agentes de IA',
    f_automations: 'Automações',
    f_reports: 'Relatórios Automatizados',
    f_api: 'Acesso à API',
    f_campaigns: 'Campanhas',
    f_traffic: 'Gestor de Tráfego Pago',
    f_dashboard: 'Dashboard Avançado',
    f_support: 'Suporte Prioritário',
    f_dedicated: 'Gerente de Conta',
    
    // Billing info
    nextBilling: 'Próxima cobrança',
    startedAt: 'Assinante desde',
    paymentMethod: 'Método de Pagamento',
    updatePayment: 'Atualizar',
    noPaymentMethod: 'Nenhum método configurado',
    addPaymentMethod: 'Adicionar método de pagamento',
    
    // Alerts
    trialEnds: 'Seu período de teste termina em',
    days: 'dias',
    pastDueAlert: 'Seu pagamento está pendente. Atualize seu método de pagamento para evitar interrupção.',
    canceledAlert: 'Sua assinatura foi cancelada. Reative para continuar usando todos os recursos.',
    
    // Modals
    confirmUpgrade: 'Confirmar Upgrade',
    confirmDowngrade: 'Confirmar Downgrade',
    upgradeDesc: 'Você terá acesso imediato a todos os recursos do plano',
    downgradeDesc: 'Ao final do período atual, você perderá acesso aos recursos premium.',
    confirm: 'Confirmar',
    cancelAction: 'Cancelar',
    processing: 'Processando...',
    
    // Success
    planUpdated: 'Plano atualizado com sucesso!',
    
    // FAQ
    faqTitle: 'Perguntas Frequentes',
    faq1q: 'Posso trocar de plano a qualquer momento?',
    faq1a: 'Sim! Upgrades são aplicados imediatamente. Downgrades entram em vigor no próximo ciclo de faturamento.',
    faq2q: 'Como funciona o período de teste?',
    faq2a: 'Novos usuários têm 14 dias para testar o plano Gold gratuitamente. Não é necessário cartão de crédito.',
    faq3q: 'Posso cancelar quando quiser?',
    faq3a: 'Sim, sem multas ou taxas. Você mantém acesso até o final do período pago.',
  },
  en: {
    title: 'Plans & Billing',
    subtitle: 'Manage your subscription and payment method',
    currentPlan: 'Current Plan',
    changePlan: 'Change Plan',
    comparePlans: 'Compare Plans',
    billing: 'Billing',
    perMonth: '/month',
    perYear: '/year',
    save: 'Save',
    mostPopular: 'Most Popular',
    enterprise: 'Contact Us',
    contactSales: 'Contact Sales',
    currentPlanBadge: 'Current',
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
    manage: 'Manage',
    cancel: 'Cancel Subscription',
    reactivate: 'Reactivate',
    
    active: 'Active',
    trial: 'Trial Period',
    pastDue: 'Past Due',
    canceled: 'Canceled',
    
    features: 'Features included',
    users: 'users',
    leads: 'active leads',
    unlimitedUsers: 'Unlimited users',
    unlimitedLeads: 'Unlimited leads',
    
    f_crm: 'Full CRM',
    f_pipeline: 'Custom Pipeline',
    f_whatsapp: 'WhatsApp Integration',
    f_ai: 'AI Agents',
    f_automations: 'Automations',
    f_reports: 'Automated Reports',
    f_api: 'API Access',
    f_campaigns: 'Campaigns',
    f_traffic: 'Paid Traffic Manager',
    f_dashboard: 'Advanced Dashboard',
    f_support: 'Priority Support',
    f_dedicated: 'Dedicated Account Manager',
    
    nextBilling: 'Next billing',
    startedAt: 'Subscriber since',
    paymentMethod: 'Payment Method',
    updatePayment: 'Update',
    noPaymentMethod: 'No payment method',
    addPaymentMethod: 'Add payment method',
    
    trialEnds: 'Your trial ends in',
    days: 'days',
    pastDueAlert: 'Your payment is past due. Update your payment method to avoid interruption.',
    canceledAlert: 'Your subscription was canceled. Reactivate to continue using all features.',
    
    confirmUpgrade: 'Confirm Upgrade',
    confirmDowngrade: 'Confirm Downgrade',
    upgradeDesc: 'You will get immediate access to all features of the',
    downgradeDesc: 'At the end of the current period, you will lose access to premium features.',
    confirm: 'Confirm',
    cancelAction: 'Cancel',
    processing: 'Processing...',
    
    planUpdated: 'Plan updated successfully!',
    
    faqTitle: 'Frequently Asked Questions',
    faq1q: 'Can I change plans anytime?',
    faq1a: 'Yes! Upgrades are applied immediately. Downgrades take effect on the next billing cycle.',
    faq2q: 'How does the trial work?',
    faq2a: 'New users get 14 days to try the Gold plan for free. No credit card required.',
    faq3q: 'Can I cancel anytime?',
    faq3a: 'Yes, no penalties or fees. You keep access until the end of the paid period.',
  },
  es: {
    title: 'Planes y Facturación',
    subtitle: 'Gestiona tu suscripción y método de pago',
    currentPlan: 'Plan Actual',
    changePlan: 'Cambiar Plan',
    comparePlans: 'Comparar Planes',
    billing: 'Facturación',
    perMonth: '/mes',
    perYear: '/año',
    save: 'Ahorra',
    mostPopular: 'Más Popular',
    enterprise: 'Consultar',
    contactSales: 'Contactar Ventas',
    currentPlanBadge: 'Actual',
    upgrade: 'Mejorar',
    downgrade: 'Reducir',
    manage: 'Gestionar',
    cancel: 'Cancelar Suscripción',
    reactivate: 'Reactivar',
    
    active: 'Activo',
    trial: 'Período de Prueba',
    pastDue: 'Pago Pendiente',
    canceled: 'Cancelado',
    
    features: 'Recursos incluidos',
    users: 'usuarios',
    leads: 'leads activos',
    unlimitedUsers: 'Usuarios ilimitados',
    unlimitedLeads: 'Leads ilimitados',
    
    f_crm: 'CRM Completo',
    f_pipeline: 'Pipeline Personalizable',
    f_whatsapp: 'Integración WhatsApp',
    f_ai: 'Agentes de IA',
    f_automations: 'Automatizaciones',
    f_reports: 'Reportes Automatizados',
    f_api: 'Acceso a API',
    f_campaigns: 'Campañas',
    f_traffic: 'Gestor de Tráfico Pago',
    f_dashboard: 'Dashboard Avanzado',
    f_support: 'Soporte Prioritario',
    f_dedicated: 'Gerente de Cuenta',
    
    nextBilling: 'Próximo cobro',
    startedAt: 'Suscriptor desde',
    paymentMethod: 'Método de Pago',
    updatePayment: 'Actualizar',
    noPaymentMethod: 'Sin método configurado',
    addPaymentMethod: 'Agregar método de pago',
    
    trialEnds: 'Tu prueba termina en',
    days: 'días',
    pastDueAlert: 'Tu pago está pendiente. Actualiza tu método de pago para evitar interrupciones.',
    canceledAlert: 'Tu suscripción fue cancelada. Reactiva para continuar usando todas las funciones.',
    
    confirmUpgrade: 'Confirmar Mejora',
    confirmDowngrade: 'Confirmar Reducción',
    upgradeDesc: 'Tendrás acceso inmediato a todas las funciones del plan',
    downgradeDesc: 'Al final del período actual, perderás acceso a las funciones premium.',
    confirm: 'Confirmar',
    cancelAction: 'Cancelar',
    processing: 'Procesando...',
    
    planUpdated: '¡Plan actualizado con éxito!',
    
    faqTitle: 'Preguntas Frecuentes',
    faq1q: '¿Puedo cambiar de plan en cualquier momento?',
    faq1a: '¡Sí! Las mejoras se aplican inmediatamente. Las reducciones entran en vigor en el próximo ciclo.',
    faq2q: '¿Cómo funciona el período de prueba?',
    faq2a: 'Los nuevos usuarios tienen 14 días para probar el plan Gold gratis. No se requiere tarjeta.',
    faq3q: '¿Puedo cancelar cuando quiera?',
    faq3a: 'Sí, sin penalidades. Mantienes acceso hasta el final del período pagado.',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DOS PLANOS (visual)
// ═══════════════════════════════════════════════════════════════════════════════

const PLAN_FEATURES: Record<PlanName, string[]> = {
  basic: ['f_crm', 'f_pipeline', 'f_whatsapp'],
  gold: ['f_crm', 'f_pipeline', 'f_whatsapp', 'f_ai', 'f_automations', 'f_reports', 'f_api', 'f_campaigns', 'f_dashboard'],
  diamond: ['f_crm', 'f_pipeline', 'f_whatsapp', 'f_ai', 'f_automations', 'f_reports', 'f_api', 'f_campaigns', 'f_dashboard', 'f_traffic', 'f_support'],
  enterprise: ['f_crm', 'f_pipeline', 'f_whatsapp', 'f_ai', 'f_automations', 'f_reports', 'f_api', 'f_campaigns', 'f_dashboard', 'f_traffic', 'f_support', 'f_dedicated'],
}

const PLAN_ICONS: Record<PlanName, React.ReactNode> = {
  basic: <Shield className="w-6 h-6" />,
  gold: <Crown className="w-6 h-6" />,
  diamond: <Sparkles className="w-6 h-6" />,
  enterprise: <Zap className="w-6 h-6" />,
}

const PLAN_COLORS: Record<PlanName, { bg: string; border: string; text: string; gradient: string }> = {
  basic: { 
    bg: 'bg-gray-500/10', 
    border: 'border-gray-500/30', 
    text: 'text-gray-400',
    gradient: 'from-gray-600 to-gray-500'
  },
  gold: { 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30', 
    text: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500'
  },
  diamond: { 
    bg: 'bg-purple-500/10', 
    border: 'border-purple-500/30', 
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-500'
  },
  enterprise: { 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30', 
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500'
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status, t }: { status: string; t: any }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    trial: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    past_due: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    canceled: 'bg-red-500/10 text-red-400 border-red-500/30',
  }
  
  const labels: Record<string, string> = {
    active: t.active,
    trial: t.trial,
    past_due: t.pastDue,
    canceled: t.canceled,
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.active}`}>
      {status === 'active' && <CheckCircle2 size={12} />}
      {status === 'trial' && <Clock size={12} />}
      {status === 'past_due' && <AlertTriangle size={12} />}
      {status === 'canceled' && <X size={12} />}
      {labels[status] || status}
    </span>
  )
}

function PlanCard({ 
  planName, 
  isCurrentPlan, 
  onSelect, 
  t, 
  currency 
}: { 
  planName: PlanName
  isCurrentPlan: boolean
  onSelect: (plan: PlanName) => void
  t: any
  currency: string
}) {
  const config = PLAN_CONFIGS[planName]
  const colors = PLAN_COLORS[planName]
  const features = PLAN_FEATURES[planName]
  const icon = PLAN_ICONS[planName]
  
  const price = currency === 'BRL' ? config.priceBrl : config.priceUsd
  const currencySymbol = currency === 'BRL' ? 'R$' : '$'
  
  const isPopular = planName === 'gold'
  const isEnterprise = planName === 'enterprise'

  return (
    <div className={`relative bg-[#111] border rounded-2xl p-6 flex flex-col transition-all hover:border-white/20 ${
      isCurrentPlan ? `${colors.border} ring-2 ring-offset-2 ring-offset-black ${colors.border.replace('border-', 'ring-')}` : 'border-white/10'
    } ${isPopular ? 'md:-mt-4 md:mb-4' : ''}`}>
      
      {/* Popular badge */}
      {isPopular && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${colors.gradient} text-black text-xs font-bold px-4 py-1 rounded-full`}>
          {t.mostPopular}
        </div>
      )}
      
      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
          {t.currentPlanBadge}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{config.displayName}</h3>
          <p className="text-xs text-gray-500">
            {config.limits.maxUsers === -1 ? t.unlimitedUsers : `${config.limits.maxUsers} ${t.users}`}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        {isEnterprise ? (
          <div className="text-2xl font-bold text-white">{t.enterprise}</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{currencySymbol}{price}</span>
            <span className="text-gray-500 text-sm">{t.perMonth}</span>
          </div>
        )}
        <p className="text-xs text-gray-600 mt-1">
          {config.limits.maxActiveLeads === -1 ? t.unlimitedLeads : `${config.limits.maxActiveLeads.toLocaleString()} ${t.leads}`}
        </p>
      </div>

      {/* Features */}
      <div className="flex-1 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">{t.features}</p>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={14} className={colors.text} />
              {t[feature] || feature}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      {isEnterprise ? (
        <a
          href="mailto:contato@oryen.com.br?subject=Enterprise Plan"
          className="w-full py-3 px-4 rounded-xl text-sm font-bold text-center transition-all bg-white/5 hover:bg-white/10 text-white border border-white/10"
        >
          {t.contactSales}
        </a>
      ) : isCurrentPlan ? (
        <button
          disabled
          className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-white/5 text-gray-500 cursor-not-allowed"
        >
          {t.currentPlanBadge}
        </button>
      ) : (
        <button
          onClick={() => onSelect(planName)}
          className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isPopular 
              ? `bg-gradient-to-r ${colors.gradient} text-black hover:opacity-90 shadow-lg shadow-amber-500/25` 
              : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
          }`}
        >
          {t.upgrade}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function BillingPage() {
  const { user, org, activeOrgId, activePlan, activePlanStatus } = useAuth()
  const { plan, planConfig } = usePlan()
  
  const userLang = (user?.language as Language) || 'pt'
  const userCurrency = user?.currency || 'BRL'
  const t = TRANSLATIONS[userLang]
  
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const colors = PLAN_COLORS[plan]

  // Calcular dias restantes do trial
  const trialDaysLeft = org?.plan_started_at 
    ? Math.max(0, 14 - Math.floor((Date.now() - new Date(org.plan_started_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleSelectPlan = (newPlan: PlanName) => {
    setSelectedPlan(newPlan)
    setShowConfirmModal(true)
  }

  const handleConfirmChange = async () => {
    if (!selectedPlan || !activeOrgId) return
    
    setLoading(true)
    
    try {
      // TODO: Integrar com Stripe aqui
      // Por enquanto, apenas atualiza o banco diretamente (para teste)
      const { error } = await supabase
        .from('orgs')
        .update({ 
          plan: selectedPlan,
          plan_status: 'active',
          plan_started_at: new Date().toISOString()
        })
        .eq('id', activeOrgId)

      if (error) throw error

      setSuccessMessage(t.planUpdated)
      setShowConfirmModal(false)
      
      // Reload para atualizar o contexto
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (err) {
      console.error('Erro ao atualizar plano:', err)
      alert('Erro ao atualizar plano. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const isUpgrade = selectedPlan && PLAN_CONFIGS[selectedPlan].priceUsd > planConfig.priceUsd

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#0A0A0A] p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="text-blue-500" />
            {t.title}
          </h1>
          <p className="text-gray-500 mt-2">{t.subtitle}</p>
        </div>

        {/* Alerts */}
        {activePlanStatus === 'trial' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
            <Clock className="text-blue-400 shrink-0" />
            <p className="text-blue-200 text-sm">
              {t.trialEnds} <strong>{trialDaysLeft} {t.days}</strong>
            </p>
          </div>
        )}
        
        {activePlanStatus === 'past_due' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="text-amber-400 shrink-0" />
            <p className="text-amber-200 text-sm">{t.pastDueAlert}</p>
          </div>
        )}
        
        {activePlanStatus === 'canceled' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <X className="text-red-400 shrink-0" />
            <p className="text-red-200 text-sm">{t.canceledAlert}</p>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0" />
            <p className="text-emerald-200 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Current Plan Summary */}
        <div className={`bg-[#111] border ${colors.border} rounded-2xl p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colors.bg} ${colors.text}`}>
                {PLAN_ICONS[plan]}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{planConfig.displayName}</h2>
                  <StatusBadge status={activePlanStatus} t={t} />
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  {planConfig.limits.maxUsers === -1 ? t.unlimitedUsers : `${planConfig.limits.maxUsers} ${t.users}`}
                  {' • '}
                  {planConfig.limits.maxActiveLeads === -1 ? t.unlimitedLeads : `${planConfig.limits.maxActiveLeads.toLocaleString()} ${t.leads}`}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-black text-white">
                {userCurrency === 'BRL' ? 'R$' : '$'}
                {userCurrency === 'BRL' ? planConfig.priceBrl : planConfig.priceUsd}
                <span className="text-sm font-normal text-gray-500">{t.perMonth}</span>
              </div>
              {org?.plan_started_at && (
                <p className="text-xs text-gray-600 mt-1">
                  {t.startedAt}: {new Date(org.plan_started_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div>
          <h2 className="text-lg font-bold text-white mb-6">{t.comparePlans}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {(['basic', 'gold', 'diamond', 'enterprise'] as PlanName[]).map((planName) => (
              <PlanCard
                key={planName}
                planName={planName}
                isCurrentPlan={plan === planName}
                onSelect={handleSelectPlan}
                t={t}
                currency={userCurrency}
              />
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">{t.faqTitle}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-white font-medium mb-2">{t.faq1q}</h3>
              <p className="text-gray-500 text-sm">{t.faq1a}</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">{t.faq2q}</h3>
              <p className="text-gray-500 text-sm">{t.faq2a}</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">{t.faq3q}</h3>
              <p className="text-gray-500 text-sm">{t.faq3a}</p>
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        {showConfirmModal && selectedPlan && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowConfirmModal(false)}
          >
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${PLAN_COLORS[selectedPlan].bg} ${PLAN_COLORS[selectedPlan].text}`}>
                  {PLAN_ICONS[selectedPlan]}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {isUpgrade ? t.confirmUpgrade : t.confirmDowngrade}
                </h3>
              </div>
              
              <p className="text-gray-400 text-sm mb-6">
                {isUpgrade ? t.upgradeDesc : t.downgradeDesc} <strong>{PLAN_CONFIGS[selectedPlan].displayName}</strong>
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                >
                  {t.cancelAction}
                </button>
                <button
                  onClick={handleConfirmChange}
                  disabled={loading}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-gradient-to-r ${PLAN_COLORS[selectedPlan].gradient} text-black disabled:opacity-50`}
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? t.processing : t.confirm}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}