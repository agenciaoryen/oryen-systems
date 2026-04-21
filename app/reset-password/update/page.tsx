'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Globe, Check, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const TRANSLATIONS = {
  pt: {
    title: 'Nova Senha',
    subtitle: 'Defina sua nova senha abaixo',
    passwordLabel: 'Nova Senha',
    confirmLabel: 'Confirmar Senha',
    submitBtn: 'Atualizar senha',
    loadingBtn: 'Atualizando...',
    backToLogin: 'Voltar ao login',
    successTitle: 'Senha atualizada',
    successDesc: 'Sua senha foi alterada com sucesso. Você será redirecionado ao login.',
    errorGeneric: 'Erro ao atualizar senha',
    errorMismatch: 'As senhas não coincidem',
    errorMinLength: 'A senha deve ter no mínimo 6 caracteres',
    verifying: 'Validando link...',
    invalidTitle: 'Link inválido ou expirado',
    invalidDesc: 'Este link de redefinição de senha não é válido ou já foi usado. Solicite um novo em "Esqueceu a senha?".',
  },
  en: {
    title: 'New Password',
    subtitle: 'Set your new password below',
    passwordLabel: 'New Password',
    confirmLabel: 'Confirm Password',
    submitBtn: 'Update password',
    loadingBtn: 'Updating...',
    backToLogin: 'Back to login',
    successTitle: 'Password updated',
    successDesc: 'Your password has been changed successfully. You will be redirected to login.',
    errorGeneric: 'Error updating password',
    errorMismatch: 'Passwords do not match',
    errorMinLength: 'Password must be at least 6 characters',
    verifying: 'Validating link...',
    invalidTitle: 'Invalid or expired link',
    invalidDesc: 'This password reset link is invalid or has already been used. Request a new one via "Forgot password?".',
  },
  es: {
    title: 'Nueva Contraseña',
    subtitle: 'Define tu nueva contraseña abajo',
    passwordLabel: 'Nueva Contraseña',
    confirmLabel: 'Confirmar Contraseña',
    submitBtn: 'Actualizar contraseña',
    loadingBtn: 'Actualizando...',
    backToLogin: 'Volver al login',
    successTitle: 'Contraseña actualizada',
    successDesc: 'Tu contraseña fue cambiada exitosamente. Serás redirigido al login.',
    errorGeneric: 'Error al actualizar contraseña',
    errorMismatch: 'Las contraseñas no coinciden',
    errorMinLength: 'La contraseña debe tener al menos 6 caracteres',
    verifying: 'Validando enlace...',
    invalidTitle: 'Enlace inválido o expirado',
    invalidDesc: 'Este enlace de restablecimiento de contraseña no es válido o ya se usó. Solicita uno nuevo en "¿Olvidaste la contraseña?".',
  },
}

type Lang = keyof typeof TRANSLATIONS

export default function UpdatePasswordPage() {
  const router = useRouter()

  const [lang, setLang] = useState<Lang>('pt')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  // Estados de validação da sessão de recovery
  // 'pending' = aguardando Supabase processar o hash/code da URL
  // 'ready'   = sessão de recovery ativa, usuário pode redefinir senha
  // 'invalid' = sem sessão válida após timeout → link expirado/inválido
  const [sessionState, setSessionState] = useState<'pending' | 'ready' | 'invalid'>('pending')

  const t = TRANSLATIONS[lang]

  // Detecta se chegou pelo fluxo de recovery (hash tokens ou PASSWORD_RECOVERY event)
  useEffect(() => {
    let settled = false

    // Listener para PASSWORD_RECOVERY (disparado quando supabase-js parseia o hash do link)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        settled = true
        setSessionState('ready')
      }
    })

    // Verificação inicial — se já tem sessão (ex: hash já foi parseado) aceita
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        settled = true
        setSessionState('ready')
      }
    })

    // Timeout de 3s — se não pegou sessão, considera link inválido/expirado
    const timeout = setTimeout(() => {
      if (!settled) setSessionState('invalid')
    }, 3000)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const languages = [
    { code: 'pt' as Lang, label: 'Português' },
    { code: 'en' as Lang, label: 'English' },
    { code: 'es' as Lang, label: 'Español' },
  ]

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (password.length < 6) {
      setErrorMsg(t.errorMinLength)
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg(t.errorMismatch)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setIsSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
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

          {sessionState === 'pending' ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.verifying}</p>
            </div>
          ) : sessionState === 'invalid' ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-error-subtle)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <AlertCircle size={28} style={{ color: 'var(--color-error-subtle-fg)' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {t.invalidTitle}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t.invalidDesc}
              </p>
              <Link href="/login" className="text-sm font-semibold transition-colors duration-150 pt-2"
                style={{ color: 'var(--color-primary)' }}>
                {t.backToLogin}
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-primary-subtle)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                <CheckCircle size={28} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {t.successTitle}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t.successDesc}
              </p>
              <Link href="/login" className="text-sm font-semibold transition-colors duration-150 pt-2"
                style={{ color: 'var(--color-primary)' }}>
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

              <form onSubmit={handleUpdate} className="space-y-4">
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
                    minLength={6}
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
                    {t.confirmLabel}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
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
                    <>{t.submitBtn} <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              <p className="text-center text-sm mt-6">
                <Link href="/login" className="font-semibold transition-colors duration-150"
                  style={{ color: 'var(--color-text-tertiary)' }}>
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
