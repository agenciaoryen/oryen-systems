// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import {
  Building2,
  Globe,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  DollarSign,
  Clock,
  Crown,
  Zap,
  Users,
  MessageSquare,
  BarChart3,
  Bot,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  pt: {
    step1Title: 'Crie sua Empresa',
    step1Subtitle: 'Comece configurando sua organização na Oryen.',
    companyName: 'Nome da empresa',
    companyNamePlaceholder: 'Ex: João Corretor Imóveis',
    niche: 'Segmento',
    nicheOptions: {
      real_estate: 'Imobiliária / Corretor',
      insurance: 'Seguros',
      solar: 'Energia Solar',
      consulting: 'Consultoria',
      other: 'Outro',
    },
    step2Title: 'Suas Preferências',
    step2Subtitle: 'Configure idioma, moeda e fuso horário.',
    language: 'Idioma',
    currency: 'Moeda',
    timezone: 'Fuso horário',
    step3Title: 'Escolha seu Plano',
    step3Subtitle: 'Selecione o plano ideal para o seu negócio.',
    perMonth: '/mês',
    popular: 'Mais popular',
    selectPlan: 'Selecionar',
    redirecting: 'Redirecionando para pagamento...',
    step4Title: 'Tudo Pronto!',
    step4Subtitle: 'Sua empresa foi criada e seu plano está ativo.',
    step4Desc: 'Agora você pode acessar o dashboard, adicionar sua equipe e começar a usar os agentes de IA.',
    goToDashboard: 'Acessar Dashboard',
    next: 'Continuar',
    back: 'Voltar',
    creating: 'Criando sua empresa...',
    errorGeneric: 'Erro ao criar empresa. Tente novamente.',
    planFeatures: {
      users: 'usuário||usuários',
      leads: 'leads ativos',
      whatsapp: 'WhatsApp',
      aiAgents: 'Agentes de IA',
      automations: 'Automações',
      reports: 'Relatórios',
      campaigns: 'Campanhas',
      prioritySupport: 'Suporte prioritário',
    },
  },
  en: {
    step1Title: 'Create your Company',
    step1Subtitle: 'Start by setting up your organization on Oryen.',
    companyName: 'Company name',
    companyNamePlaceholder: 'Ex: John Doe Realty',
    niche: 'Industry',
    nicheOptions: {
      real_estate: 'Real Estate',
      insurance: 'Insurance',
      solar: 'Solar Energy',
      consulting: 'Consulting',
      other: 'Other',
    },
    step2Title: 'Your Preferences',
    step2Subtitle: 'Set your language, currency and timezone.',
    language: 'Language',
    currency: 'Currency',
    timezone: 'Timezone',
    step3Title: 'Choose your Plan',
    step3Subtitle: 'Select the best plan for your business.',
    perMonth: '/mo',
    popular: 'Most popular',
    selectPlan: 'Select',
    redirecting: 'Redirecting to payment...',
    step4Title: 'All Set!',
    step4Subtitle: 'Your company was created and your plan is active.',
    step4Desc: 'Now you can access the dashboard, add your team and start using AI agents.',
    goToDashboard: 'Go to Dashboard',
    next: 'Continue',
    back: 'Back',
    creating: 'Creating your company...',
    errorGeneric: 'Error creating company. Please try again.',
    planFeatures: {
      users: 'user||users',
      leads: 'active leads',
      whatsapp: 'WhatsApp',
      aiAgents: 'AI Agents',
      automations: 'Automations',
      reports: 'Reports',
      campaigns: 'Campaigns',
      prioritySupport: 'Priority support',
    },
  },
  es: {
    step1Title: 'Crea tu Empresa',
    step1Subtitle: 'Comienza configurando tu organización en Oryen.',
    companyName: 'Nombre de la empresa',
    companyNamePlaceholder: 'Ej: Juan Pérez Inmobiliaria',
    niche: 'Segmento',
    nicheOptions: {
      real_estate: 'Inmobiliaria / Corredor',
      insurance: 'Seguros',
      solar: 'Energía Solar',
      consulting: 'Consultoría',
      other: 'Otro',
    },
    step2Title: 'Tus Preferencias',
    step2Subtitle: 'Configura idioma, moneda y zona horaria.',
    language: 'Idioma',
    currency: 'Moneda',
    timezone: 'Zona horaria',
    step3Title: 'Elige tu Plan',
    step3Subtitle: 'Selecciona el plan ideal para tu negocio.',
    perMonth: '/mes',
    popular: 'Más popular',
    selectPlan: 'Seleccionar',
    redirecting: 'Redirigiendo al pago...',
    step4Title: '¡Todo Listo!',
    step4Subtitle: 'Tu empresa fue creada y tu plan está activo.',
    step4Desc: 'Ahora puedes acceder al dashboard, agregar tu equipo y comenzar a usar los agentes de IA.',
    goToDashboard: 'Ir al Dashboard',
    next: 'Continuar',
    back: 'Volver',
    creating: 'Creando tu empresa...',
    errorGeneric: 'Error al crear empresa. Inténtalo de nuevo.',
    planFeatures: {
      users: 'usuario||usuarios',
      leads: 'leads activos',
      whatsapp: 'WhatsApp',
      aiAgents: 'Agentes de IA',
      automations: 'Automatizaciones',
      reports: 'Reportes',
      campaigns: 'Campañas',
      prioritySupport: 'Soporte prioritario',
    },
  },
}

type Lang = keyof typeof T

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const CURRENCIES = [
  { value: 'BRL', label: 'R$ — Real Brasileiro (BRL)' },
  { value: 'USD', label: '$ — US Dollar (USD)' },
  { value: 'EUR', label: '€ — Euro (EUR)' },
  { value: 'CLP', label: '$ — Peso Chileno (CLP)' },
  { value: 'ARS', label: '$ — Peso Argentino (ARS)' },
  { value: 'MXN', label: '$ — Peso Mexicano (MXN)' },
  { value: 'COP', label: '$ — Peso Colombiano (COP)' },
  { value: 'PEN', label: 'S/ — Sol Peruano (PEN)' },
  { value: 'UYU', label: '$ — Peso Uruguaio (UYU)' },
  { value: 'PYG', label: '₲ — Guarani (PYG)' },
]

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
]

// Planos disponíveis para seleção no onboarding
const PLANS = [
  {
    name: 'basic',
    icon: Zap,
    color: 'blue',
    priceUsd: 19,
    priceBrl: 97,
    popular: false,
    limits: { users: 1, leads: '1.000', messages: 0, whatsapp: 1 },
    features: ['whatsapp', 'leads'],
    noFeatures: ['aiAgents', 'automations', 'reports'],
  },
  {
    name: 'gold',
    icon: Crown,
    color: 'amber',
    priceUsd: 219,
    priceBrl: 1097,
    popular: true,
    limits: { users: 5, leads: '5.000', messages: '10.000', whatsapp: 5 },
    features: ['whatsapp', 'leads', 'aiAgents', 'automations', 'reports'],
    noFeatures: ['campaigns'],
  },
  {
    name: 'diamond',
    icon: Sparkles,
    color: 'violet',
    priceUsd: 329,
    priceBrl: 1647,
    popular: false,
    limits: { users: 15, leads: '10.000', messages: '50.000', whatsapp: 15 },
    features: ['whatsapp', 'leads', 'aiAgents', 'automations', 'reports', 'campaigns', 'prioritySupport'],
    noFeatures: [],
  },
]

const PLAN_DISPLAY: Record<string, Record<Lang, string>> = {
  basic: { pt: 'Basic', en: 'Basic', es: 'Basic' },
  gold: { pt: 'Gold', en: 'Gold', es: 'Gold' },
  diamond: { pt: 'Diamond', en: 'Diamond', es: 'Diamond' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export default function OnboardingPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <OnboardingPage />
    </Suspense>
  )
}

function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, org, activeOrgId, activePlanStatus } = useAuth()

  const isSuccess = searchParams.get('success') === 'true'
  const isCanceled = searchParams.get('canceled') === 'true'

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [redirectingToStripe, setRedirectingToStripe] = useState(false)
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null)
  const [planActivated, setPlanActivated] = useState(false)

  // Form data
  const [companyName, setCompanyName] = useState('')
  const [niche, setNiche] = useState('real_estate')
  const [lang, setLang] = useState<Lang>('pt')
  const [currency, setCurrency] = useState('BRL')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')

  const t = T[lang]

  // Determine the effective org ID (from API response or auth context)
  const orgId = createdOrgId || activeOrgId

  // Auto-detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (TIMEZONES.some(t => t.value === tz)) {
        setTimezone(tz)
      }
    } catch {}
  }, [])

  // Auto-detect language from user metadata
  useEffect(() => {
    if (user?.user_metadata?.language) {
      const userLang = user.user_metadata.language as Lang
      if (T[userLang]) {
        setLang(userLang)
      }
    }
  }, [user])

  // Handle return from Stripe — poll until webhook activates the plan
  useEffect(() => {
    if (!isSuccess || !user?.id) return
    setStep(4)

    let attempts = 0
    const maxAttempts = 20 // ~20 seconds max
    const interval = setInterval(async () => {
      attempts++
      try {
        const { data } = await (await import('@/lib/supabase')).supabase
          .from('users')
          .select('org_id')
          .eq('id', user.id)
          .single()

        if (data?.org_id) {
          const { data: orgData } = await (await import('@/lib/supabase')).supabase
            .from('orgs')
            .select('plan_status')
            .eq('id', data.org_id)
            .single()

          if (orgData?.plan_status === 'active') {
            setPlanActivated(true)
            clearInterval(interval)
          }
        }
      } catch {}

      if (attempts >= maxAttempts) {
        // After 20s, let them through anyway (webhook might be slow)
        setPlanActivated(true)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isSuccess, user?.id])

  // Handle user that already has org but plan_status is trial (needs to pay)
  useEffect(() => {
    if (!authLoading && user && org && !isSuccess) {
      if (activePlanStatus === 'trial') {
        // Org exists but no payment yet — show plan selection
        setStep(3)
      } else {
        // Org exists and plan is active — go to dashboard
        router.replace('/dashboard')
      }
    }
  }, [authLoading, user, org, activePlanStatus, isSuccess, router])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Already has org with active plan and not showing success — shouldn't see this
  if (org && activePlanStatus !== 'trial' && !isSuccess) return null

  const handleSubmit = async () => {
    if (!companyName.trim()) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          company_name: companyName.trim(),
          niche,
          language: lang,
          currency,
          timezone,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t.errorGeneric)
        return
      }

      setCreatedOrgId(data.org_id)
      setStep(3) // Go to plan selection
    } catch {
      setError(t.errorGeneric)
    } finally {
      setSaving(false)
    }
  }

  const handleSelectPlan = async (planName: string) => {
    if (!orgId) return
    setRedirectingToStripe(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          planName,
          userId: user.id,
          userEmail: user.email,
          successUrl: '/onboarding?success=true',
          cancelUrl: '/onboarding?canceled=true',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t.errorGeneric)
        setRedirectingToStripe(false)
        return
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch {
      setError(t.errorGeneric)
      setRedirectingToStripe(false)
    }
  }

  const handleGoToDashboard = () => {
    // Force full reload to refresh AuthContext with new org + plan data
    window.location.href = '/dashboard'
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  // Show price based on selected currency
  const showBrl = currency === 'BRL'

  // Pluralize helper
  const pluralize = (key: string, count: number) => {
    const parts = key.split('||')
    return count === 1 ? parts[0] : (parts[1] || parts[0])
  }

  // ─── ESTILOS ───
  const inputClass = "w-full p-3 rounded-xl bg-black border border-gray-800 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5"
  const btnPrimary = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50"

  // Color maps for plan cards
  const colorMap: Record<string, { border: string; bg: string; text: string; glow: string; btn: string; btnHover: string }> = {
    blue: { border: 'border-blue-500/30', bg: 'bg-blue-600/10', text: 'text-blue-400', glow: 'shadow-blue-600/20', btn: 'bg-blue-600', btnHover: 'hover:bg-blue-500' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-600/10', text: 'text-amber-400', glow: 'shadow-amber-600/20', btn: 'bg-amber-600', btnHover: 'hover:bg-amber-500' },
    violet: { border: 'border-violet-500/30', bg: 'bg-violet-600/10', text: 'text-violet-400', glow: 'shadow-violet-600/20', btn: 'bg-violet-600', btnHover: 'hover:bg-violet-500' },
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className={`relative z-10 w-full px-4 ${step === 3 && !isSuccess ? 'max-w-2xl' : 'max-w-md'} transition-all duration-300`}>

          {/* Progress bar */}
          {step <= 3 && !isSuccess && (
            <div className="flex items-center gap-2 mb-8 px-1">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-800">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: step >= s ? '100%' : '0%',
                      background: 'linear-gradient(90deg, #3B82F6, #6366F1)',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            {/* ═══ STEP 1: Empresa ═══ */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 flex items-center justify-center mb-3 border border-blue-500/20">
                    <Building2 className="text-blue-500" size={24} />
                  </div>
                  <h1 className="text-xl font-bold">{t.step1Title}</h1>
                  <p className="text-sm text-gray-400 mt-1">{t.step1Subtitle}</p>
                </div>

                <div>
                  <label className={labelClass}>{t.companyName} *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t.companyNamePlaceholder}
                    className={inputClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelClass}>{t.niche}</label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className={inputClass}
                  >
                    {Object.entries(t.nicheOptions).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!companyName.trim()}
                  className={`${btnPrimary} w-full bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20`}
                >
                  {t.next} <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ═══ STEP 2: Preferências ═══ */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-600/10 flex items-center justify-center mb-3 border border-violet-500/20">
                    <Globe className="text-violet-500" size={24} />
                  </div>
                  <h1 className="text-xl font-bold">{t.step2Title}</h1>
                  <p className="text-sm text-gray-400 mt-1">{t.step2Subtitle}</p>
                </div>

                <div>
                  <label className={labelClass}>{t.language}</label>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                    className={inputClass}
                  >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>{t.currency}</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inputClass}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>{t.timezone}</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={inputClass}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-xl text-sm text-center">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className={`${btnPrimary} flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300`}
                  >
                    <ArrowLeft size={16} /> {t.back}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className={`${btnPrimary} flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20`}
                  >
                    {saving ? (
                      <><Loader2 size={16} className="animate-spin" /> {t.creating}</>
                    ) : (
                      <>{t.next} <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 3: Planos ═══ */}
            {step === 3 && !isSuccess && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-600/10 flex items-center justify-center mb-3 border border-amber-500/20">
                    <Crown className="text-amber-400" size={24} />
                  </div>
                  <h1 className="text-xl font-bold">{t.step3Title}</h1>
                  <p className="text-sm text-gray-400 mt-1">{t.step3Subtitle}</p>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-xl text-sm text-center">
                    {error}
                  </div>
                )}

                {redirectingToStripe && (
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    {t.redirecting}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {PLANS.map((plan) => {
                    const colors = colorMap[plan.color]
                    const Icon = plan.icon
                    const price = showBrl ? plan.priceBrl : plan.priceUsd
                    const symbol = showBrl ? 'R$' : '$'

                    return (
                      <button
                        key={plan.name}
                        onClick={() => handleSelectPlan(plan.name)}
                        disabled={redirectingToStripe}
                        className={`relative text-left p-4 rounded-xl border ${colors.border} ${colors.bg} hover:border-opacity-60 transition-all group disabled:opacity-50`}
                      >
                        {plan.popular && (
                          <span className={`absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.btn} text-white`}>
                            {t.popular}
                          </span>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center border ${colors.border}`}>
                              <Icon className={colors.text} size={18} />
                            </div>
                            <div>
                              <h3 className="font-bold text-white">{PLAN_DISPLAY[plan.name][lang]}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-lg font-bold ${colors.text}`}>
                                  {symbol}{price}
                                </span>
                                <span className="text-xs text-gray-500">{t.perMonth}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users size={12} />
                            <span>{plan.limits.users} {pluralize(t.planFeatures.users, plan.limits.users)}</span>
                            <span className="mx-1 text-gray-700">|</span>
                            <span>{plan.limits.leads} {t.planFeatures.leads}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {plan.features.map(f => (
                            <span key={f} className="flex items-center gap-1 text-[11px] text-gray-400 bg-black/30 px-2 py-0.5 rounded-full">
                              <Check size={10} className="text-emerald-500" />
                              {t.planFeatures[f as keyof typeof t.planFeatures]}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ STEP 4: Sucesso ═══ */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in zoom-in duration-500 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-600/10 flex items-center justify-center mb-2 border border-emerald-500/20">
                  {planActivated ? (
                    <Sparkles className="text-emerald-400" size={32} />
                  ) : (
                    <Loader2 className="text-emerald-400 animate-spin" size={32} />
                  )}
                </div>

                <div>
                  <h1 className="text-2xl font-bold">{t.step4Title}</h1>
                  <p className="text-sm text-gray-400 mt-2">
                    {planActivated ? t.step4Subtitle : (lang === 'en' ? 'Activating your plan...' : lang === 'es' ? 'Activando tu plan...' : 'Ativando seu plano...')}
                  </p>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed">
                  {t.step4Desc}
                </p>

                <button
                  onClick={handleGoToDashboard}
                  disabled={!planActivated}
                  className={`${btnPrimary} w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20`}
                >
                  {planActivated ? (
                    <>{t.goToDashboard} <ArrowRight size={16} /></>
                  ) : (
                    <><Loader2 size={16} className="animate-spin" /> {lang === 'en' ? 'Activating...' : lang === 'es' ? 'Activando...' : 'Ativando...'}</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Greeting below card */}
          {step <= 2 && (
            <p className="text-center text-xs text-gray-600 mt-4">
              {firstName ? `${lang === 'en' ? 'Welcome' : lang === 'es' ? 'Bienvenido' : 'Bem-vindo'}, ${firstName}` : ''}
            </p>
          )}
      </div>
    </div>
  )
}
