'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Bot, Loader2, CheckCircle2, Globe, Check } from 'lucide-react'

// --- DICIONÁRIO DE TRADUÇÃO ---
const TRANSLATIONS = {
  pt: {
    title: 'Bem-vindo à Oryen',
    subtitle: 'Defina sua senha para acessar o painel.',
    labelName: 'Seu Nome Completo',
    placeholderName: 'Ex: João Silva',
    labelPass: 'Crie uma Senha Segura',
    btnActivate: 'Ativar Minha Conta',
    successTitle: 'Conta Ativada!',
    successMsg: 'Bem-vindo à equipe. Redirecionando...',
    errorGeneric: 'Ocorreu um erro ao ativar sua conta.',
    errorSession: 'Sessão inválida. Tente clicar no link do e-mail novamente.'
  },
  en: {
    title: 'Welcome to Oryen',
    subtitle: 'Set your password to access the dashboard.',
    labelName: 'Your Full Name',
    placeholderName: 'Ex: John Doe',
    labelPass: 'Create a Secure Password',
    btnActivate: 'Activate My Account',
    successTitle: 'Account Activated!',
    successMsg: 'Welcome to the team. Redirecting...',
    errorGeneric: 'An error occurred while activating your account.',
    errorSession: 'Invalid session. Please try clicking the email link again.'
  },
  es: {
    title: 'Bienvenido a Oryen',
    subtitle: 'Establezca su contraseña para acceder al panel.',
    labelName: 'Su Nombre Completo',
    placeholderName: 'Ej: Juan Pérez',
    labelPass: 'Cree una Contraseña Segura',
    btnActivate: 'Activar Mi Cuenta',
    successTitle: '¡Cuenta Activada!',
    successMsg: 'Bienvenido al equipo. Redirigiendo...',
    errorGeneric: 'Ocurrió un error al activar su cuenta.',
    errorSession: 'Sesión inválida. Intente hacer clic en el enlace del correo nuevamente.'
  }
}

export default function AcceptInvitePage() {
  const router = useRouter()

  // Estado do Idioma
  const [lang, setLang] = useState<'pt' | 'en' | 'es'>('pt')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const t = TRANSLATIONS[lang]

  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Opções de idioma
  const languages = [
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' }
  ]

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Verifica se o usuário está logado (magic link)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(t.errorSession)
      }

      // 2. Define a senha definitiva
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
        data: { full_name: fullName } // Atualiza meta-dados também
      })

      if (authError) throw authError

      // 3. Atualiza tabela pública 'users' E SALVA O IDIOMA ESCOLHIDO
      const { error: dbError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          status: 'active',
          language: lang, // <--- SALVANDO PREFERÊNCIA AQUI
          currency: lang === 'pt' ? 'BRL' : 'USD',
          timezone: lang === 'pt' ? 'America/Sao_Paulo' : 'UTC'
        })
        .eq('id', user.id)

      if (dbError) throw dbError

      setDone(true)

      // Redireciona
      setTimeout(() => router.push('/dashboard'), 2000)

    } catch (err: any) {
      console.error(err)
      setError(err.message || t.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center" style={{ background: 'var(--color-bg-base)' }}>
        <div className="space-y-4 animate-in zoom-in duration-500">
          <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: 'var(--color-success)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.successTitle}</h1>
          <p style={{ color: 'var(--color-text-tertiary)' }}>{t.successMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--color-bg-base)' }}>

      {/* SELETOR DE IDIOMA (Canto Superior Direito) */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <Globe size={16} />
            <span className="uppercase">{lang}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
              {languages.map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    setLang(item.code as any)
                    setShowLangMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 text-sm flex items-center justify-between group transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.flag}</span> {item.label}
                  </span>
                  {lang === item.code && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex flex-col items-center mb-8">
          <span
            className="text-2xl font-extrabold tracking-widest mb-4"
            style={{
              fontFamily: 'var(--font-orbitron), sans-serif',
              background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >ORYEN</span>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{t.title}</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs text-center" style={{ background: 'var(--color-error-subtle)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleFinalize} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{t.labelName}</label>
            <input
              required
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full rounded-xl p-3 outline-none transition-all"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
              placeholder={t.placeholderName}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>{t.labelPass}</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl p-3 outline-none transition-all"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 16px rgba(90, 122, 230, 0.25)' }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : t.btnActivate}
          </button>
        </form>
      </div>
    </div>
  )
}
