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
  Crown,
  Zap,
  Users,
  X,
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

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
    },
    step2Title: 'Moeda e Fuso Horário',
    step2Subtitle: 'Configure a moeda e o fuso da sua operação.',
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
    creating: 'Criando...',
    errorGeneric: 'Erro ao criar empresa. Tente novamente.',
    activating: 'Ativando seu plano...',
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
    },
    step2Title: 'Currency and Timezone',
    step2Subtitle: 'Set your business currency and timezone.',
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
    creating: 'Creating...',
    errorGeneric: 'Error creating company. Please try again.',
    activating: 'Activating your plan...',
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
    },
    step2Title: 'Moneda y Zona Horaria',
    step2Subtitle: 'Configura la moneda y la zona horaria de tu negocio.',
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
    creating: 'Creando...',
    errorGeneric: 'Error al crear empresa. Inténtalo de nuevo.',
    activating: 'Activando tu plan...',
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

const PLANS = [
  {
    name: 'starter',
    label: 'Starter',
    icon: Zap,
    priceUsd: 49,
    priceBrl: 249,
    popular: false,
    limits: { users: 1, leads: '500' },
    features: ['whatsapp', 'aiAgents'],
    noFeatures: ['automations', 'reports', 'campaigns'],
  },
  {
    name: 'pro',
    label: 'Pro',
    icon: Crown,
    priceUsd: 99,
    priceBrl: 497,
    popular: true,
    limits: { users: 3, leads: '2.000' },
    features: ['whatsapp', 'aiAgents', 'automations', 'reports'],
    noFeatures: ['campaigns'],
  },
  {
    name: 'business',
    label: 'Business',
    icon: Sparkles,
    priceUsd: 249,
    priceBrl: 1247,
    popular: false,
    limits: { users: 8, leads: '8.000' },
    features: ['whatsapp', 'aiAgents', 'automations', 'reports', 'campaigns', 'prioritySupport'],
    noFeatures: [],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export default function OnboardingPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
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
  // Trial sem subscription_id = ainda não fez checkout; com subscription_id = já pagou (trial do Stripe)
  const needsCheckout = activePlanStatus === 'trial' && !org?.billing_subscription_id

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [redirectingToStripe, setRedirectingToStripe] = useState(false)
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null)
  const [planActivated, setPlanActivated] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [niche, setNiche] = useState('real_estate')
  const [lang, setLang] = useState<Lang>('pt')
  const [currency, setCurrency] = useState('BRL')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')

  const t = T[lang]
  const orgId = createdOrgId || activeOrgId

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (TIMEZONES.some(t => t.value === tz)) setTimezone(tz)
    } catch {}
  }, [])

  useEffect(() => {
    if (user?.user_metadata?.language) {
      const userLang = user.user_metadata.language as Lang
      if (T[userLang]) setLang(userLang)
    }
  }, [user])

  useEffect(() => {
    if (!isSuccess || !user?.id) return
    setStep(4)

    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const { data } = await (await import('@/lib/supabase')).supabase
          .from('users').select('org_id').eq('id', user.id).single()
        if (data?.org_id) {
          const { data: orgData } = await (await import('@/lib/supabase')).supabase
            .from('orgs').select('plan_status, billing_subscription_id').eq('id', data.org_id).single()
          // Ativado = webhook processou (tem subscription_id) OU status já é active
          const isActivated = !!orgData?.billing_subscription_id || orgData?.plan_status === 'active'
          if (isActivated) { setPlanActivated(true); clearInterval(interval) }
        }
      } catch {}
      if (attempts >= 20) { setPlanActivated(true); clearInterval(interval) }
    }, 1000)
    return () => clearInterval(interval)
  }, [isSuccess, user?.id])

  useEffect(() => {
    if (!authLoading && user && org && !isSuccess) {
      if (needsCheckout) setStep(3)
      else router.replace('/dashboard')
    }
  }, [authLoading, user, org, needsCheckout, isSuccess, router])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  if (org && !needsCheckout && !isSuccess) return null

  const handleSubmit = async () => {
    if (!companyName.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, company_name: companyName.trim(), niche, language: lang, currency, timezone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || t.errorGeneric); return }
      setCreatedOrgId(data.org_id)
      setStep(3)
    } catch { setError(t.errorGeneric) }
    finally { setSaving(false) }
  }

  const handleSelectPlan = async (planName: string) => {
    if (!orgId) return
    setRedirectingToStripe(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, planName, userId: user.id, userEmail: user.email, successUrl: '/onboarding?success=true', cancelUrl: '/onboarding?canceled=true' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || t.errorGeneric); setRedirectingToStripe(false); return }
      window.location.href = data.url
    } catch { setError(t.errorGeneric); setRedirectingToStripe(false) }
  }

  const handleGoToDashboard = () => { window.location.href = '/dashboard' }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const showBrl = currency === 'BRL'
  const pluralize = (key: string, count: number) => { const p = key.split('||'); return count === 1 ? p[0] : (p[1] || p[0]) }

  const inputStyle = {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>

      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.08]"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-primary), transparent 70%)' }} />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      <div className={`relative z-10 w-full px-4 ${step === 3 && !isSuccess ? 'max-w-2xl' : 'max-w-md'} transition-all duration-300`}>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <span
            className="text-xl font-extrabold tracking-widest"
            style={{
              fontFamily: 'var(--font-orbitron), sans-serif',
              background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >ORYEN</span>
        </div>

        {/* Progress bar */}
        {step <= 3 && !isSuccess && (
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: step >= s ? '100%' : '0%', background: 'var(--gradient-brand)' }} />
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }}>

          {/* ═══ STEP 1: Empresa ═══ */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--color-primary-subtle)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                  <Building2 size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{t.step1Title}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.step1Subtitle}</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>{t.companyName} *</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder={t.companyNamePlaceholder} autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>{t.niche}</label>
                <CustomSelect
                  value={niche}
                  onChange={(v) => setNiche(v)}
                  options={Object.entries(t.nicheOptions).map(([key, label]) => ({ value: key, label: label as string }))}
                />
              </div>

              <button onClick={() => setStep(2)} disabled={!companyName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 16px rgba(90, 122, 230, 0.25)' }}>
                {t.next} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ═══ STEP 2: Preferências ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--color-indigo-subtle)', border: '1px solid rgba(110, 95, 255, 0.2)' }}>
                  <Globe size={24} style={{ color: 'var(--color-indigo)' }} />
                </div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{t.step2Title}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.step2Subtitle}</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>{t.currency}</label>
                <CustomSelect
                  value={currency}
                  onChange={(v) => setCurrency(v)}
                  options={CURRENCIES.map(c => ({ value: c.value, label: c.label }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>{t.timezone}</label>
                <CustomSelect
                  value={timezone}
                  onChange={(v) => setTimezone(v)}
                  options={TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-center"
                  style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error-subtle-fg)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                  <ArrowLeft size={16} /> {t.back}
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                  style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 16px rgba(90, 122, 230, 0.25)' }}>
                  {saving ? <><Loader2 size={16} className="animate-spin" /> {t.creating}</> : <>{t.next} <ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Planos ═══ */}
          {step === 3 && !isSuccess && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--color-accent-subtle)', border: '1px solid rgba(240, 160, 48, 0.2)' }}>
                  <Crown size={24} style={{ color: 'var(--color-accent)' }} />
                </div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{t.step3Title}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.step3Subtitle}</p>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-center"
                  style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error-subtle-fg)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  {error}
                </div>
              )}

              {redirectingToStripe && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  <Loader2 size={16} className="animate-spin" /> {t.redirecting}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {PLANS.map(plan => {
                  const Icon = plan.icon
                  const price = showBrl ? plan.priceBrl : plan.priceUsd
                  const symbol = showBrl ? 'R$' : '$'
                  const isPopular = plan.popular

                  return (
                    <button key={plan.name} onClick={() => handleSelectPlan(plan.name)} disabled={redirectingToStripe}
                      className="relative text-left p-4 rounded-xl transition-all duration-200 group disabled:opacity-50"
                      style={{
                        background: isPopular ? 'var(--color-bg-elevated)' : 'transparent',
                        border: isPopular ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        boxShadow: isPopular ? 'var(--shadow-primary)' : 'none',
                      }}
                      onMouseEnter={e => { if (!isPopular) e.currentTarget.style.borderColor = 'var(--color-border-strong)' }}
                      onMouseLeave={e => { if (!isPopular) e.currentTarget.style.borderColor = 'var(--color-border)' }}>

                      {isPopular && (
                        <span className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: 'var(--gradient-brand)', color: '#fff' }}>
                          {t.popular}
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: isPopular ? 'var(--color-primary-subtle)' : 'var(--color-bg-hover)',
                              border: `1px solid ${isPopular ? 'rgba(90, 122, 230, 0.2)' : 'var(--color-border)'}`,
                            }}>
                            <Icon size={18} style={{ color: isPopular ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">{plan.label}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-lg font-bold" style={{ color: isPopular ? 'var(--color-primary)' : 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                                {symbol}{price}
                              </span>
                              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t.perMonth}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                          <Users size={12} />
                          <span>{plan.limits.users} {pluralize(t.planFeatures.users, plan.limits.users)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {plan.features.map(f => (
                          <span key={f} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                            style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
                            <Check size={10} style={{ color: 'var(--color-success)' }} />
                            {t.planFeatures[f as keyof typeof t.planFeatures]}
                          </span>
                        ))}
                        {plan.noFeatures.map(f => (
                          <span key={f} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                            style={{ color: 'var(--color-text-disabled)' }}>
                            <X size={10} />
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
            <div className="space-y-5 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                style={{
                  background: planActivated ? 'var(--color-success-subtle)' : 'var(--color-primary-subtle)',
                  border: `1px solid ${planActivated ? 'rgba(34, 197, 94, 0.2)' : 'rgba(90, 122, 230, 0.2)'}`,
                }}>
                {planActivated
                  ? <Sparkles size={32} style={{ color: 'var(--color-success)' }} />
                  : <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />}
              </div>

              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{t.step4Title}</h1>
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  {planActivated ? t.step4Subtitle : t.activating}
                </p>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t.step4Desc}</p>

              <button onClick={handleGoToDashboard} disabled={!planActivated}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                style={{
                  background: planActivated ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'var(--color-bg-elevated)',
                  color: planActivated ? '#fff' : 'var(--color-text-tertiary)',
                  boxShadow: planActivated ? '0 4px 16px rgba(34, 197, 94, 0.25)' : 'none',
                  border: planActivated ? 'none' : '1px solid var(--color-border)',
                }}>
                {planActivated
                  ? <>{t.goToDashboard} <ArrowRight size={16} /></>
                  : <><Loader2 size={16} className="animate-spin" /> {t.activating}</>}
              </button>
            </div>
          )}
        </div>

        {/* Greeting */}
        {step <= 2 && firstName && (
          <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-disabled)' }}>
            {lang === 'en' ? 'Welcome' : lang === 'es' ? 'Bienvenido' : 'Bem-vindo'}, {firstName}
          </p>
        )}
      </div>
    </div>
  )
}
