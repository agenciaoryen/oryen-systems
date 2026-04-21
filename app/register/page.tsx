'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, MailCheck, Eye, EyeOff } from 'lucide-react'

const TRANSLATIONS = {
  pt: {
    title: 'Criar Nova Conta',
    subtitle: 'Comece a usar a Oryen em 2 minutos',
    confirmEmailTitle: 'Verifique seu e-mail',
    confirmEmailDesc: 'Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta.',
    languageLabel: 'Idioma da conta',
    languageHelper: 'Será o idioma dos seus e-mails, da sua conta e da sua organização.',
    nameLabel: 'Nome Completo',
    namePlaceholder: 'Ex: João Silva',
    emailLabel: 'Email',
    passwordLabel: 'Senha',
    confirmPasswordLabel: 'Confirmar Senha',
    submitBtn: 'Criar conta',
    loadingBtn: 'Criando conta...',
    hasAccount: 'Já tem uma conta?',
    loginLink: 'Entrar',
    errorGeneric: 'Erro ao criar conta',
    errorPasswordMismatch: 'As senhas não coincidem',
    errorPasswordShort: 'A senha deve ter pelo menos 6 caracteres',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
  },
  en: {
    title: 'Create New Account',
    subtitle: 'Start using Oryen in 2 minutes',
    confirmEmailTitle: 'Check your email',
    confirmEmailDesc: 'We sent a confirmation link to your email. Click it to activate your account.',
    languageLabel: 'Account language',
    languageHelper: 'This will be the language of your emails, your account and your organization.',
    nameLabel: 'Full Name',
    namePlaceholder: 'Ex: John Doe',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    submitBtn: 'Create account',
    loadingBtn: 'Creating account...',
    hasAccount: 'Already have an account?',
    loginLink: 'Sign in',
    errorGeneric: 'Error creating account',
    errorPasswordMismatch: 'Passwords do not match',
    errorPasswordShort: 'Password must be at least 6 characters',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  es: {
    title: 'Crear Nueva Cuenta',
    subtitle: 'Empieza a usar Oryen en 2 minutos',
    confirmEmailTitle: 'Revisa tu correo',
    confirmEmailDesc: 'Enviamos un enlace de confirmación a tu correo. Haz clic para activar tu cuenta.',
    languageLabel: 'Idioma de la cuenta',
    languageHelper: 'Este será el idioma de tus correos, tu cuenta y tu organización.',
    nameLabel: 'Nombre Completo',
    namePlaceholder: 'Ej: Juan Pérez',
    emailLabel: 'Correo Electrónico',
    passwordLabel: 'Contraseña',
    confirmPasswordLabel: 'Confirmar Contraseña',
    submitBtn: 'Crear cuenta',
    loadingBtn: 'Creando cuenta...',
    hasAccount: '¿Ya tienes cuenta?',
    loginLink: 'Entrar',
    errorGeneric: 'Error al crear cuenta',
    errorPasswordMismatch: 'Las contraseñas no coinciden',
    errorPasswordShort: 'La contraseña debe tener al menos 6 caracteres',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },
}

type Lang = keyof typeof TRANSLATIONS

export default function RegisterPage() {
  const router = useRouter()

  const [lang, setLang] = useState<Lang>('pt')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const t = TRANSLATIONS[lang]

  const languages: { code: Lang; label: string }[] = [
    { code: 'pt', label: 'Português' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (formData.password.length < 6) {
      setErrorMsg(t.errorPasswordShort)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg(t.errorPasswordMismatch)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          language: lang,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t.errorGeneric)
      }

      setIsSubmitted(true)
    } catch (error: any) {
      setErrorMsg(error.message || t.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--color-bg-base)' }}>

      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.08]"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-indigo), transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, var(--color-primary), transparent 70%)' }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      {/* Card */}
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

          {isSubmitted ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-primary-subtle)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                <MailCheck size={28} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {t.confirmEmailTitle}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t.confirmEmailDesc}
              </p>
              <Link href="/login" className="text-sm font-semibold transition-colors duration-150 pt-2"
                style={{ color: 'var(--color-primary)' }}>
                {t.loginLink}
              </Link>
            </div>
          ) : (
            <>
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

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                    {t.languageLabel}
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 rounded-xl"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                    {languages.map(item => {
                      const active = lang === item.code
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => setLang(item.code)}
                          className="py-2 rounded-lg text-sm font-medium transition-all duration-150"
                          style={{
                            background: active ? 'var(--color-primary-subtle)' : 'transparent',
                            color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                            border: active ? '1px solid rgba(90, 122, 230, 0.3)' : '1px solid transparent',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-primary)' }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] mt-1.5 leading-snug" style={{ color: 'var(--color-text-disabled)' }}>
                    {t.languageHelper}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.namePlaceholder}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                    {t.emailLabel}
                  </label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                    {t.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all duration-150"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? t.hidePassword : t.showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors duration-150"
                      style={{ color: 'var(--color-text-tertiary)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
                    {t.confirmPasswordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all duration-150"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      aria-label={showConfirmPassword ? t.hidePassword : t.showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors duration-150"
                      style={{ color: 'var(--color-text-tertiary)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
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
                {t.hasAccount}{' '}
                <Link href="/login" className="font-semibold transition-colors duration-150"
                  style={{ color: 'var(--color-primary)' }}>
                  {t.loginLink}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
