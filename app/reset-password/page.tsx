'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Globe, Check, ArrowLeft, Loader2, MailCheck } from 'lucide-react'

const TRANSLATIONS = {
  pt: {
    title: 'Redefinir Senha',
    subtitle: 'Informe seu e-mail para receber o link de redefinição',
    emailLabel: 'E-mail',
    submitBtn: 'Enviar link',
    loadingBtn: 'Enviando...',
    backToLogin: 'Voltar ao login',
    successTitle: 'E-mail enviado',
    successDesc: 'Se uma conta com esse e-mail existir, você receberá um link para redefinir sua senha.',
    errorGeneric: 'Erro ao enviar e-mail de redefinição',
  },
  en: {
    title: 'Reset Password',
    subtitle: 'Enter your email to receive the reset link',
    emailLabel: 'Email',
    submitBtn: 'Send link',
    loadingBtn: 'Sending...',
    backToLogin: 'Back to login',
    successTitle: 'Email sent',
    successDesc: 'If an account with that email exists, you will receive a link to reset your password.',
    errorGeneric: 'Error sending reset email',
  },
  es: {
    title: 'Restablecer Contraseña',
    subtitle: 'Ingresa tu correo para recibir el enlace de restablecimiento',
    emailLabel: 'Correo Electrónico',
    submitBtn: 'Enviar enlace',
    loadingBtn: 'Enviando...',
    backToLogin: 'Volver al login',
    successTitle: 'Correo enviado',
    successDesc: 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.',
    errorGeneric: 'Error al enviar correo de restablecimiento',
  },
}

type Lang = keyof typeof TRANSLATIONS

export default function ResetPasswordPage() {
  const [lang, setLang] = useState<Lang>('pt')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const t = TRANSLATIONS[lang]

  const languages = [
    { code: 'pt' as Lang, label: 'Português' },
    { code: 'en' as Lang, label: 'English' },
    { code: 'es' as Lang, label: 'Español' },
  ]

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language: lang }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t.errorGeneric)
      }
      // Sucesso genérico sempre — anti-enumeração
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
                {t.successTitle}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t.successDesc}
              </p>
              <Link href="/login" className="text-sm font-semibold transition-colors duration-150 pt-2 flex items-center gap-1.5"
                style={{ color: 'var(--color-primary)' }}>
                <ArrowLeft size={14} />
                {t.backToLogin}
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

              <form onSubmit={handleReset} className="space-y-4">
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
                    <>{t.submitBtn}</>
                  )}
                </button>
              </form>

              <p className="text-center text-sm mt-6">
                <Link href="/login" className="font-semibold transition-colors duration-150 flex items-center justify-center gap-1.5"
                  style={{ color: 'var(--color-text-tertiary)' }}>
                  <ArrowLeft size={14} />
                  {t.backToLogin}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
