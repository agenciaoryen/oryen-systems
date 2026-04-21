'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth, useActivePlan } from '@/lib/AuthContext'
import { usePlan, PLAN_CONFIGS, type PlanName } from '@/lib/usePlan'
import { ADDON_CONFIGS, ALL_ADDON_TYPES, type AddonType } from '@/lib/addons'
import { supabase } from '@/lib/supabase'
import UsageBar from '@/app/dashboard/components/UsageBar'
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
  Clock,
  FileText,
  Download,
  Lock,
  Trash2,
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
    whatsappMessage: 'Olá! Tenho interesse no plano Enterprise do Oryen Systems.',
    currentPlanBadge: 'Atual',
    upgrade: 'Fazer Upgrade',
    downgrade: 'Fazer Downgrade',
    manage: 'Gerenciar',
    cancel: 'Cancelar Assinatura',
    reactivate: 'Reativar',
    manageSubscription: 'Gerenciar Assinatura',
    redirectingToStripe: 'Redirecionando para pagamento...',
    
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
    faq2a: 'Novos usuários ganham um período de teste gratuito para experimentar a plataforma. A duração exata é exibida no topo desta página.',
    faq3q: 'Posso cancelar quando quiser?',
    faq3a: 'Sim, sem multas ou taxas. Você mantém acesso até o final do período pago.',

    // Invoices
    invoicesTitle: 'Histórico de Faturas',
    invoiceDate: 'Data',
    invoiceAmount: 'Valor',
    invoiceStatus: 'Status',
    invoiceActions: 'Ações',
    invoicePaid: 'Pago',
    invoiceOpen: 'Aberto',
    invoiceDraft: 'Rascunho',
    invoiceVoid: 'Cancelada',
    invoiceUncollectible: 'Irrecuperável',
    viewInvoice: 'Ver',
    downloadPdf: 'PDF',
    noInvoices: 'Nenhuma fatura ainda',

    // Payment method
    paymentMethodTitle: 'Método de Pagamento',
    cardEnding: 'terminando em',
    expires: 'Expira',
    changeCard: 'Alterar Cartão',
    noCard: 'Nenhum cartão cadastrado',
    addCard: 'Adicionar Cartão',

    // Upcoming
    upcomingTitle: 'Próxima Cobrança',
    upcomingOn: 'Cobrança em',
    noUpcoming: 'Sem cobranças futuras',

    // Add-on management
    cancelAddon: 'Cancelar',
    confirmCancelAddon: 'Cancelar add-on?',
    cancelAddonDesc: 'O add-on será cancelado imediatamente e o limite será reduzido.',
    cancelAddonConfirm: 'Sim, cancelar',
    cancelAddonBack: 'Manter',

    // Navigation
    backToSettings: 'Voltar às Configurações',

    // Trust
    securePayment: 'Pagamento seguro via Stripe',
    encryptedData: 'Dados criptografados',
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
    whatsappMessage: 'Hi! I am interested in the Enterprise plan for Oryen Systems.',
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
    faq2a: 'New users get a free trial period to explore the platform. The exact duration is shown at the top of this page.',
    faq3q: 'Can I cancel anytime?',
    faq3a: 'Yes, no penalties or fees. You keep access until the end of the paid period.',

    invoicesTitle: 'Invoice History',
    invoiceDate: 'Date',
    invoiceAmount: 'Amount',
    invoiceStatus: 'Status',
    invoiceActions: 'Actions',
    invoicePaid: 'Paid',
    invoiceOpen: 'Open',
    invoiceDraft: 'Draft',
    invoiceVoid: 'Void',
    invoiceUncollectible: 'Uncollectible',
    viewInvoice: 'View',
    downloadPdf: 'PDF',
    noInvoices: 'No invoices yet',

    paymentMethodTitle: 'Payment Method',
    cardEnding: 'ending in',
    expires: 'Expires',
    changeCard: 'Change Card',
    noCard: 'No card on file',
    addCard: 'Add Card',

    upcomingTitle: 'Next Charge',
    upcomingOn: 'Charge on',
    noUpcoming: 'No upcoming charges',

    cancelAddon: 'Cancel',
    confirmCancelAddon: 'Cancel add-on?',
    cancelAddonDesc: 'The add-on will be canceled immediately and the limit will be reduced.',
    cancelAddonConfirm: 'Yes, cancel',
    cancelAddonBack: 'Keep',

    backToSettings: 'Back to Settings',

    securePayment: 'Secure payment via Stripe',
    encryptedData: 'Encrypted data',
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
    whatsappMessage: '¡Hola! Tengo interés en el plan Enterprise de Oryen Systems.',
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
    faq2a: 'Los nuevos usuarios tienen un período de prueba gratuito para explorar la plataforma. La duración exacta aparece en la parte superior de esta página.',
    faq3q: '¿Puedo cancelar cuando quiera?',
    faq3a: 'Sí, sin penalidades. Mantienes acceso hasta el final del período pagado.',

    invoicesTitle: 'Historial de Facturas',
    invoiceDate: 'Fecha',
    invoiceAmount: 'Monto',
    invoiceStatus: 'Estado',
    invoiceActions: 'Acciones',
    invoicePaid: 'Pagado',
    invoiceOpen: 'Abierto',
    invoiceDraft: 'Borrador',
    invoiceVoid: 'Anulada',
    invoiceUncollectible: 'Irrecuperable',
    viewInvoice: 'Ver',
    downloadPdf: 'PDF',
    noInvoices: 'Sin facturas aún',

    paymentMethodTitle: 'Método de Pago',
    cardEnding: 'terminando en',
    expires: 'Expira',
    changeCard: 'Cambiar Tarjeta',
    noCard: 'Sin tarjeta registrada',
    addCard: 'Agregar Tarjeta',

    upcomingTitle: 'Próximo Cobro',
    upcomingOn: 'Cobro el',
    noUpcoming: 'Sin cobros futuros',

    cancelAddon: 'Cancelar',
    confirmCancelAddon: '¿Cancelar add-on?',
    cancelAddonDesc: 'El add-on será cancelado inmediatamente y el límite será reducido.',
    cancelAddonConfirm: 'Sí, cancelar',
    cancelAddonBack: 'Mantener',

    backToSettings: 'Volver a Configuración',

    securePayment: 'Pago seguro vía Stripe',
    encryptedData: 'Datos encriptados',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DOS PLANOS (visual)
// ═══════════════════════════════════════════════════════════════════════════════

const PLAN_FEATURES: Record<PlanName, string[]> = {
  starter: ['f_crm', 'f_pipeline', 'f_whatsapp', 'f_ai'],
  pro: ['f_crm', 'f_pipeline', 'f_whatsapp', 'f_ai', 'f_automations', 'f_reports', 'f_dashboard'],
  business: ['f_crm', 'f_pipeline', 'f_whatsapp', 'f_ai', 'f_automations', 'f_reports', 'f_api', 'f_campaigns', 'f_dashboard', 'f_traffic', 'f_support'],
  enterprise: ['f_crm', 'f_pipeline', 'f_whatsapp', 'f_ai', 'f_automations', 'f_reports', 'f_api', 'f_campaigns', 'f_dashboard', 'f_traffic', 'f_support', 'f_dedicated'],
}

const PLAN_ICONS: Record<PlanName, React.ReactNode> = {
  starter: <Shield className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  business: <Sparkles className="w-6 h-6" />,
  enterprise: <Zap className="w-6 h-6" />,
}

const PLAN_COLORS: Record<PlanName, { bg: string; border: string; text: string; gradient: string }> = {
  starter: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    gradient: 'from-gray-600 to-gray-500'
  },
  pro: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500'
  },
  business: {
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
  const statusStyles: Record<string, React.CSSProperties> = {
    active: { background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid var(--color-success)' },
    trial: { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' },
    past_due: { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' },
    canceled: { background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error)' },
  }
  
  const labels: Record<string, string> = {
    active: t.active,
    trial: t.trial,
    past_due: t.pastDue,
    canceled: t.canceled,
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={statusStyles[status] || statusStyles.active}>
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
  
  const isPopular = planName === 'pro'
  const isEnterprise = planName === 'enterprise'

  return (
    <div className={`relative rounded-2xl p-6 flex flex-col transition-all ${isPopular ? 'md:-mt-4 md:mb-4' : ''}`} style={{ background: 'var(--color-bg-surface)', border: isCurrentPlan ? undefined : '1px solid var(--color-border-subtle)' }}>
      
      {/* Popular badge */}
      {isPopular && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${colors.gradient} text-black text-xs font-bold px-4 py-1 rounded-full`}>
          {t.mostPopular}
        </div>
      )}
      
      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--color-success)', color: 'var(--color-bg-base)' }}>
          {t.currentPlanBadge}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{config.displayName}</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {config.limits.maxUsers === -1 ? t.unlimitedUsers : `${config.limits.maxUsers} ${t.users}`}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        {isEnterprise ? (
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.enterprise}</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{price}</span>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.perMonth}</span>
          </div>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {config.limits.maxActiveLeads === -1 ? t.unlimitedLeads : `${config.limits.maxActiveLeads.toLocaleString()} ${t.leads}`}
        </p>
      </div>

      {/* Features */}
      <div className="flex-1 mb-6">
        <p className="text-xs uppercase tracking-wider mb-3 font-bold" style={{ color: 'var(--color-text-muted)' }}>{t.features}</p>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <Check size={14} className={colors.text} />
              {t[feature] || feature}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      {isEnterprise ? (
        <a
          href={`https://wa.me/5551998388409?text=${encodeURIComponent(t.whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 rounded-xl text-sm font-bold text-center transition-all block"
          style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}
        >
          {t.contactSales}
        </a>
      ) : isCurrentPlan ? (
        <button
          disabled
          className="w-full py-3 px-4 rounded-xl text-sm font-bold cursor-not-allowed"
          style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}
        >
          {t.currentPlanBadge}
        </button>
      ) : (
        <button
          onClick={() => onSelect(planName)}
          className="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          style={isPopular
            ? { background: `linear-gradient(to right, var(--color-accent), var(--color-accent))`, color: 'var(--color-bg-base)' }
            : { background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }
          }
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

function BillingPageContent() {
  const { user, org, activeOrgId, activePlan, activePlanStatus } = useAuth()
  const { plan, planConfig } = usePlan()
  const searchParams = useSearchParams()

  const userLang = (user?.language as Language) || 'pt'
  const userCurrency = user?.currency || 'BRL'
  const t = TRANSLATIONS[userLang]

  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [usage, setUsage] = useState<Record<string, { current: number; limit: number }>>({})
  const [orgAddons, setOrgAddons] = useState<any[]>([])
  const [addonLoading, setAddonLoading] = useState<string | null>(null)

  // Billing info do Stripe
  const [invoices, setInvoices] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [upcomingInvoice, setUpcomingInvoice] = useState<any>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [cancelingAddon, setCancelingAddon] = useState<string | null>(null)
  const [confirmCancelAddonId, setConfirmCancelAddonId] = useState<string | null>(null)

  const colors = (PLAN_COLORS as any)[plan] || PLAN_COLORS.starter

  // Carregar uso atual de cada recurso
  useEffect(() => {
    if (!activeOrgId) return
    const resources = ['users', 'leads', 'messages', 'properties', 'documents', 'sites']
    Promise.all(
      resources.map(r =>
        fetch(`/api/plan-limit?org_id=${activeOrgId}&resource=${r}`)
          .then(res => res.json())
          .then(data => ({ resource: r, current: data.current || 0, limit: data.limit ?? -1 }))
          .catch(() => ({ resource: r, current: 0, limit: -1 }))
      )
    ).then(results => {
      const map: Record<string, { current: number; limit: number }> = {}
      results.forEach(r => { map[r.resource] = { current: r.current, limit: r.limit } })
      setUsage(map)
    })

    // Carregar add-ons
    fetch(`/api/addons?org_id=${activeOrgId}`)
      .then(res => res.json())
      .then(data => setOrgAddons(data.addons || []))
      .catch(() => {})

    // Carregar billing info do Stripe
    setBillingLoading(true)
    fetch(`/api/stripe/billing-info?org_id=${activeOrgId}`)
      .then(res => res.json())
      .then(data => {
        setInvoices(data.invoices || [])
        setPaymentMethod(data.paymentMethod || null)
        setUpcomingInvoice(data.upcomingInvoice || null)
      })
      .catch(() => {})
      .finally(() => setBillingLoading(false))
  }, [activeOrgId])

  // Verificar se voltou do Stripe com sucesso ou cancelamento
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccessMessage(t.planUpdated)
      // Limpar URL
      window.history.replaceState({}, '', '/dashboard/settings/billing')
      // Recarregar para atualizar plano
      setTimeout(() => window.location.reload(), 2000)
    }
    if (searchParams.get('canceled') === 'true') {
      // Limpar URL
      window.history.replaceState({}, '', '/dashboard/settings/billing')
    }
  }, [searchParams, t.planUpdated])

  // Calcular dias restantes do trial a partir de trial_ends_at (populado pelo webhook do Stripe)
  // Fallback para 3 dias a partir de plan_started_at se trial_ends_at não estiver definido
  const trialDaysLeft = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : org?.plan_started_at
    ? Math.max(0, 3 - Math.floor((Date.now() - new Date(org.plan_started_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  // Verificar se já tem assinatura ativa (para mostrar botão de gerenciar)
  const hasActiveSubscription = plan !== 'starter' && activePlanStatus === 'active'

  const handleSelectPlan = (newPlan: PlanName) => {
    setSelectedPlan(newPlan)
    setShowConfirmModal(true)
  }

  const handleConfirmChange = async () => {
    if (!selectedPlan || !activeOrgId) return
    
    setLoading(true)
    
    try {
      // Chamar API do Stripe para criar sessão de checkout
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: activeOrgId,
          planName: selectedPlan,
          userId: user?.id,
          userEmail: user?.email
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar checkout')
      }

      // Redirecionar para o checkout do Stripe
      if (data.url) {
        window.location.href = data.url
      }
      
    } catch (err) {
      console.error('Erro ao iniciar checkout:', err)
      alert('Erro ao iniciar checkout. Tente novamente.')
      setLoading(false)
    }
  }

  // Função para abrir portal de gerenciamento
  const handleManageSubscription = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrgId })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'portal_not_configured') {
          alert(data.message)
        } else {
          throw new Error(data.error || 'Erro ao abrir portal')
        }
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Erro ao abrir portal:', err)
      alert(err?.message || 'Erro ao abrir portal de gerenciamento.')
    } finally {
      setLoading(false)
    }
  }

  const isUpgrade = selectedPlan && PLAN_CONFIGS[selectedPlan].priceUsd > planConfig.priceUsd

  // Cancelar add-on
  const handleCancelAddon = async (addonId: string) => {
    setCancelingAddon(addonId)
    try {
      const res = await fetch('/api/addons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId }),
      })
      if (res.ok) {
        setOrgAddons(prev => prev.filter(a => a.id !== addonId))
        setConfirmCancelAddonId(null)
      }
    } catch { }
    finally { setCancelingAddon(null) }
  }

  // Helpers
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(userLang === 'en' ? 'en-US' : userLang === 'es' ? 'es-ES' : 'pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(
      userLang === 'en' ? 'en-US' : userLang === 'es' ? 'es-ES' : 'pt-BR',
      { day: '2-digit', month: 'short', year: 'numeric' }
    )
  }

  const invoiceStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      paid: t.invoicePaid,
      open: t.invoiceOpen,
      draft: t.invoiceDraft,
      void: t.invoiceVoid,
      uncollectible: t.invoiceUncollectible,
    }
    return map[status] || status
  }

  const invoiceStatusColor = (status: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      paid: { background: 'var(--color-success-subtle)', color: 'var(--color-success)' },
      open: { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' },
      draft: { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' },
      void: { background: 'var(--color-error-subtle)', color: 'var(--color-error)' },
      uncollectible: { background: 'var(--color-error-subtle)', color: 'var(--color-error)' },
    }
    return map[status] || map.draft
  }

  const cardBrandIcon = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'Amex',
      elo: 'Elo',
      discover: 'Discover',
      diners: 'Diners',
    }
    return brands[brand] || brand.charAt(0).toUpperCase() + brand.slice(1)
  }

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 sm:p-6 animate-in fade-in duration-300" style={{ background: 'var(--color-bg-base)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <CreditCard style={{ color: 'var(--color-primary)' }} />
            {t.title}
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
        </div>

        {/* Alerts */}
        {activePlanStatus === 'trial' && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)' }}>
            <Clock className="shrink-0" style={{ color: 'var(--color-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t.trialEnds} <strong>{trialDaysLeft} {t.days}</strong>
            </p>
          </div>
        )}
        
        {activePlanStatus === 'past_due' && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent)' }}>
            <AlertTriangle className="shrink-0" style={{ color: 'var(--color-accent)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.pastDueAlert}</p>
          </div>
        )}
        
        {activePlanStatus === 'canceled' && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
            <X className="shrink-0" style={{ color: 'var(--color-error)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.canceledAlert}</p>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)' }}>
            <CheckCircle2 className="shrink-0" style={{ color: 'var(--color-success)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{successMessage}</p>
          </div>
        )}

        {/* Current Plan Summary */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colors.bg} ${colors.text}`}>
                {(PLAN_ICONS as any)[plan] || PLAN_ICONS.starter}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{planConfig.displayName}</h2>
                  <StatusBadge status={activePlanStatus} t={t} />
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {planConfig.limits.maxUsers === -1 ? t.unlimitedUsers : `${planConfig.limits.maxUsers} ${t.users}`}
                  {' • '}
                  {planConfig.limits.maxActiveLeads === -1 ? t.unlimitedLeads : `${planConfig.limits.maxActiveLeads.toLocaleString()} ${t.leads}`}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                {userCurrency === 'BRL' ? 'R$' : '$'}
                {userCurrency === 'BRL' ? planConfig.priceBrl : planConfig.priceUsd}
                <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>{t.perMonth}</span>
              </div>
              {org?.plan_started_at && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t.startedAt}: {new Date(org.plan_started_at).toLocaleDateString()}
                </p>
              )}
              {/* Botão gerenciar assinatura */}
              {hasActiveSubscription && (
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="mt-3 text-xs font-medium flex items-center gap-1 ml-auto"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                  {t.manageSubscription}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage Overview */}
        {Object.keys(usage).length > 0 && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
              {userLang === 'en' ? 'Current Usage' : userLang === 'es' ? 'Uso Actual' : 'Uso Atual'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {usage.users && <UsageBar label={userLang === 'en' ? 'Users' : userLang === 'es' ? 'Usuarios' : 'Usuários'} current={usage.users.current} limit={usage.users.limit} />}
              {usage.leads && <UsageBar label="Leads" current={usage.leads.current} limit={usage.leads.limit} />}
              {usage.messages && <UsageBar label={userLang === 'en' ? 'AI Messages' : userLang === 'es' ? 'Mensajes IA' : 'Mensagens IA'} current={usage.messages.current} limit={usage.messages.limit} monthly monthlyLabel={userLang === 'en' ? 'month' : userLang === 'es' ? 'mes' : 'mês'} />}
              {usage.properties && <UsageBar label={userLang === 'en' ? 'Properties' : userLang === 'es' ? 'Propiedades' : 'Imóveis'} current={usage.properties.current} limit={usage.properties.limit} />}
              {usage.documents && <UsageBar label={userLang === 'en' ? 'Documents' : userLang === 'es' ? 'Documentos' : 'Documentos'} current={usage.documents.current} limit={usage.documents.limit} monthly monthlyLabel={userLang === 'en' ? 'month' : userLang === 'es' ? 'mes' : 'mês'} />}
              {usage.sites && <UsageBar label="Sites" current={usage.sites.current} limit={usage.sites.limit} />}
            </div>

            {/* Add-ons ativos */}
            {orgAddons.length > 0 && (
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Add-ons {userLang === 'en' ? 'active' : userLang === 'es' ? 'activos' : 'ativos'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {orgAddons.map((addon: any) => (
                    <span key={addon.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                      <Check size={12} />
                      {addon.quantity}x {addon.config?.displayName || addon.addon_type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons ativos com gestão */}
            {orgAddons.length > 0 && (
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Add-ons {userLang === 'en' ? 'active' : userLang === 'es' ? 'activos' : 'ativos'}
                </p>
                <div className="flex flex-col gap-2">
                  {orgAddons.map((addon: any) => (
                    <div key={addon.id} className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--color-primary-subtle)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                      <div className="flex items-center gap-2">
                        <Check size={14} style={{ color: 'var(--color-primary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {addon.quantity}x {addon.config?.displayName || addon.addon_type}
                        </span>
                      </div>
                      {confirmCancelAddonId === addon.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.confirmCancelAddon}</span>
                          <button
                            onClick={() => handleCancelAddon(addon.id)}
                            disabled={!!cancelingAddon}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                            style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
                          >
                            {cancelingAddon === addon.id ? <Loader2 size={12} className="animate-spin" /> : t.cancelAddonConfirm}
                          </button>
                          <button
                            onClick={() => setConfirmCancelAddonId(null)}
                            className="text-xs px-2.5 py-1 rounded-lg"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {t.cancelAddonBack}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancelAddonId(addon.id)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-error)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-error-subtle)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; (e.currentTarget as HTMLElement).style.background = '' }}
                        >
                          {t.cancelAddon}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botões de add-on */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {userLang === 'en' ? 'Need more?' : userLang === 'es' ? '¿Necesitas más?' : 'Precisa de mais?'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_ADDON_TYPES.map(type => {
                  const cfg = ADDON_CONFIGS[type]
                  const price = userCurrency === 'BRL' ? `R$${cfg.priceBrl}` : `$${cfg.priceUsd}`
                  return (
                    <button
                      key={type}
                      disabled={!!addonLoading}
                      onClick={async () => {
                        setAddonLoading(type)
                        try {
                          const res = await fetch('/api/addons', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orgId: activeOrgId, addonType: type, quantity: 1, userId: user?.id, userEmail: user?.email })
                          })
                          const data = await res.json()
                          if (data.url) window.location.href = data.url
                          else if (data.error) alert(data.error)
                        } catch { }
                        finally { setAddonLoading(null) }
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs transition-all disabled:opacity-50"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
                    >
                      {addonLoading === type
                        ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                        : <span className="text-sm font-bold">+{cfg.unitAmount === 1 ? '1' : cfg.unitAmount.toLocaleString()}</span>
                      }
                      <span>{cfg.unitLabel}</span>
                      <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{price}/{userLang === 'en' ? 'mo' : userLang === 'es' ? 'mes' : 'mês'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Método de Pagamento + Próxima Cobrança */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Método de Pagamento */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
              {t.paymentMethodTitle}
            </h2>
            {billingLoading ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            ) : paymentMethod ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded-md flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                    {cardBrandIcon(paymentMethod.brand)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      •••• {paymentMethod.last4}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t.expires} {String(paymentMethod.expMonth).padStart(2, '0')}/{paymentMethod.expYear}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleManageSubscription}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }}
                >
                  {t.changeCard}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noCard}</p>
                <button
                  onClick={handleManageSubscription}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }}
                >
                  {t.addCard}
                </button>
              </div>
            )}
          </div>

          {/* Próxima Cobrança */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
              {t.upcomingTitle}
            </h2>
            {billingLoading ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            ) : upcomingInvoice ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {formatCurrency(upcomingInvoice.amount, upcomingInvoice.currency)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t.upcomingOn} {formatDate(upcomingInvoice.date)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noUpcoming}</p>
            )}
          </div>
        </div>

        {/* Histórico de Faturas */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <FileText size={18} style={{ color: 'var(--color-primary)' }} />
            {t.invoicesTitle}
          </h2>
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>{t.noInvoices}</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <th className="text-left pb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.invoiceDate}</th>
                      <th className="text-left pb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.invoiceAmount}</th>
                      <th className="text-left pb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.invoiceStatus}</th>
                      <th className="text-right pb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.invoiceActions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td className="py-3" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(inv.date)}</td>
                        <td className="py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(inv.amount, inv.currency)}</td>
                        <td className="py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold" style={invoiceStatusColor(inv.status)}>
                            {invoiceStatusLabel(inv.status)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.hostedUrl && (
                              <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                style={{ color: 'var(--color-primary)' }}
                              >
                                <ExternalLink size={12} /> {t.viewInvoice}
                              </a>
                            )}
                            {inv.pdfUrl && (
                              <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                <Download size={12} /> {t.downloadPdf}
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden flex flex-col gap-3">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="rounded-xl p-4" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(inv.amount, inv.currency)}
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold" style={invoiceStatusColor(inv.status)}>
                        {invoiceStatusLabel(inv.status)}
                      </span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>{formatDate(inv.date)}</p>
                    <div className="flex items-center gap-3">
                      {inv.hostedUrl && (
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                          <ExternalLink size={12} /> {t.viewInvoice}
                        </a>
                      )}
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                          <Download size={12} /> {t.downloadPdf}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Plans Grid */}
        <div>
          <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>{t.comparePlans}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {(['starter', 'pro', 'business', 'enterprise'] as PlanName[]).map((planName) => (
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

        {/* Selos de Confiança */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-2">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Lock size={14} style={{ color: 'var(--color-success)' }} />
            {t.securePayment}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <Shield size={14} style={{ color: 'var(--color-success)' }} />
            {t.encryptedData}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>{t.faqTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>{t.faq1q}</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.faq1a}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>{t.faq2q}</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.faq2a}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>{t.faq3q}</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.faq3a}</p>
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        {showConfirmModal && selectedPlan && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
            style={{ background: 'var(--color-bg-overlay)' }}
            onClick={(e) => e.target === e.currentTarget && setShowConfirmModal(false)}
          >
            <div className="rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${PLAN_COLORS[selectedPlan].bg} ${PLAN_COLORS[selectedPlan].text}`}>
                  {PLAN_ICONS[selectedPlan]}
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {isUpgrade ? t.confirmUpgrade : t.confirmDowngrade}
                </h3>
              </div>
              
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
                {isUpgrade ? t.upgradeDesc : t.downgradeDesc} <strong>{PLAN_CONFIGS[selectedPlan].displayName}</strong>
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-medium transition-colors rounded-xl"
                  style={{ color: 'var(--color-text-tertiary)' }}
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

// Wrapper com Suspense para useSearchParams
export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}