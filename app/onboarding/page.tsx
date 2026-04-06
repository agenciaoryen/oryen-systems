// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    step3Title: 'Tudo Pronto!',
    step3Subtitle: 'Sua empresa foi criada com sucesso.',
    step3Desc: 'Agora você pode acessar o dashboard, adicionar sua equipe e começar a usar os agentes de IA.',
    goToDashboard: 'Acessar Dashboard',
    next: 'Continuar',
    back: 'Voltar',
    creating: 'Criando sua empresa...',
    errorGeneric: 'Erro ao criar empresa. Tente novamente.',
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
    step3Title: 'All Set!',
    step3Subtitle: 'Your company was created successfully.',
    step3Desc: 'Now you can access the dashboard, add your team and start using AI agents.',
    goToDashboard: 'Go to Dashboard',
    next: 'Continue',
    back: 'Back',
    creating: 'Creating your company...',
    errorGeneric: 'Error creating company. Please try again.',
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
    step3Title: '¡Todo Listo!',
    step3Subtitle: 'Tu empresa fue creada con éxito.',
    step3Desc: 'Ahora puedes acceder al dashboard, agregar tu equipo y comenzar a usar los agentes de IA.',
    goToDashboard: 'Ir al Dashboard',
    next: 'Continuar',
    back: 'Volver',
    creating: 'Creando tu empresa...',
    errorGeneric: 'Error al crear empresa. Inténtalo de nuevo.',
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

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading, org } = useAuth()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [createdCompanyName, setCreatedCompanyName] = useState('')

  // Form data
  const [companyName, setCompanyName] = useState('')
  const [niche, setNiche] = useState('real_estate')
  const [lang, setLang] = useState<Lang>('pt')
  const [currency, setCurrency] = useState('BRL')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')

  const t = T[lang]

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

  // Redirect if already has org
  useEffect(() => {
    if (!authLoading && user && org) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, org, router])

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

  // Already has org — shouldn't see this
  if (org) return null

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

      setCreatedCompanyName(companyName.trim())
      setDone(true)
      setStep(3)
    } catch {
      setError(t.errorGeneric)
    } finally {
      setSaving(false)
    }
  }

  const handleGoToDashboard = () => {
    // Force full reload to refresh AuthContext with new org data
    window.location.href = '/dashboard'
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  // ─── ESTILOS ───
  const inputClass = "w-full p-3 rounded-xl bg-black border border-gray-800 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5"
  const btnPrimary = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50"

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Progress bar */}
        {!done && (
          <div className="flex items-center gap-2 mb-8 px-1">
            {[1, 2].map(s => (
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

          {/* ═══ STEP 3: Sucesso ═══ */}
          {step === 3 && done && (
            <div className="space-y-5 animate-in fade-in zoom-in duration-500 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-600/10 flex items-center justify-center mb-2 border border-emerald-500/20">
                <Sparkles className="text-emerald-400" size={32} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">{t.step3Title}</h1>
                <p className="text-sm text-gray-400 mt-2">{t.step3Subtitle}</p>
              </div>

              <div className="bg-black/50 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Empresa</p>
                <p className="font-semibold text-white">{createdCompanyName}</p>
              </div>

              <p className="text-sm text-gray-400 leading-relaxed">
                {t.step3Desc}
              </p>

              <button
                onClick={handleGoToDashboard}
                className={`${btnPrimary} w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20`}
              >
                {t.goToDashboard} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Greeting below card */}
        {!done && (
          <p className="text-center text-xs text-gray-600 mt-4">
            {firstName ? `${lang === 'en' ? 'Welcome' : lang === 'es' ? 'Bienvenido' : 'Bem-vindo'}, ${firstName}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
