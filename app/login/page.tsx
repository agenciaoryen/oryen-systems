'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Globe, Check, ArrowRight, Loader2 } from 'lucide-react'

const TRANSLATIONS = {
  pt: {
    title: 'Bem-vindo de volta',
    subtitle: 'Acesse sua conta para continuar',
    emailLabel: 'Email',
    passwordLabel: 'Senha',
    submitBtn: 'Entrar',
    loadingBtn: 'Entrando...',
    noAccount: 'Não tem uma conta?',
    registerLink: 'Criar conta',
    errorGeneric: 'Erro ao realizar login',
    forgotPassword: 'Esqueceu a senha?',
  },
  en: {
    title: 'Welcome back',
    subtitle: 'Sign in to your account to continue',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submitBtn: 'Sign In',
    loadingBtn: 'Signing in...',
    noAccount: 'No account?',
    registerLink: 'Create account',
    errorGeneric: 'Error signing in',
    forgotPassword: 'Forgot password?',
  },
  es: {
    title: 'Bienvenido de nuevo',
    subtitle: 'Accede a tu cuenta para continuar',
    emailLabel: 'Correo Electrónico',
    passwordLabel: 'Contraseña',
    submitBtn: 'Entrar',
    loadingBtn: 'Entrando...',
    noAccount: '¿No tienes cuenta?',
    registerLink: 'Crear cuenta',
    errorGeneric: 'Error al iniciar sesión',
    forgotPassword: '¿Olvidaste tu contraseña?',
  },
}

type Lang = keyof typeof TRANSLATIONS

export default function LoginPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [lang, setLang] = useState<Lang>('pt')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const t = TRANSLATIONS[lang]

  const languages = [
    { code: 'pt' as Lang, label: 'Português' },
    { code: 'en' as Lang, label: 'English' },
    { code: 'es' as Lang, label: 'Español' },
  ]

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // Full page navigation para garantir que o middleware detecte o cookie de sessão
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect') || '/dashboard'
      window.location.href = redirect
    } catch (error: any) {
      setErrorMsg(error.message || t.errorGeneric)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--color-bg-base)' }}>

      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.08]"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-primary), transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, var(--color-indigo), transparent 70%)' }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      {/* Language switcher */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}
          >
            <Globe size={13} />
            <span className="uppercase">{lang}</span>
          </button>
          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl overflow-hidden"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }}>
              {languages.map(item => (
                <button
                  key={item.code}
                  onClick={() => { setLang(item.code); setShowLangMenu(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-150"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                >
                  {item.label}
                  {lang === item.code && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[400px] mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <span
            className="text-2xl font-extrabold tracking-widest"
            style={{
              fontFamily: 'var(--font-orbitron), sans-serif',
              background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >ORYEN</span>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }}>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {t.title}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.subtitle}</p>
          </div>

          {errorMsg && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
              style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error-subtle-fg)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                {t.emailLabel}
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                {t.passwordLabel}
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <div className="flex justify-end mt-1.5">
                <Link href="/reset-password" className="text-xs font-medium transition-colors duration-150"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
                  {t.forgotPassword}
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
              style={{
                background: 'var(--gradient-brand)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(90, 122, 230, 0.25)',
                marginTop: '24px',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(90, 122, 230, 0.35)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(90, 122, 230, 0.25)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> {t.loadingBtn}</>
              ) : (
                <>{t.submitBtn} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-tertiary)' }}>
            {t.noAccount}{' '}
            <Link href="/register" className="font-semibold transition-colors duration-150"
              style={{ color: 'var(--color-primary)' }}>
              {t.registerLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
