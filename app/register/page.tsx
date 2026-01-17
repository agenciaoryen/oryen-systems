'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Globe, Check, MailCheck } from 'lucide-react'

// --- DICIONÁRIO DE TRADUÇÃO (LOCAL) ---
const TRANSLATIONS = {
  pt: {
    title: 'Criar Nova Conta',
    confirmEmailTitle: 'Verifique seu e-mail',
    confirmEmailDesc: 'Enviamos um link de confirmação para o seu e-mail. Por favor, clique nele para ativar sua conta.',
    nameLabel: 'Nome Completo',
    namePlaceholder: 'Ex: João Silva',
    emailLabel: 'Email',
    passwordLabel: 'Senha',
    submitBtn: 'Cadastrar',
    loadingBtn: 'Criando conta...',
    hasAccount: 'Já tem uma conta?',
    loginLink: 'Entrar',
    errorGeneric: 'Erro ao criar conta'
  },
  en: {
    title: 'Create New Account',
    confirmEmailTitle: 'Check your email',
    confirmEmailDesc: 'We sent a confirmation link to your email. Please click it to activate your account.',
    nameLabel: 'Full Name',
    namePlaceholder: 'Ex: John Doe',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submitBtn: 'Sign Up',
    loadingBtn: 'Creating account...',
    hasAccount: 'Already have an account?',
    loginLink: 'Login',
    errorGeneric: 'Error creating account'
  },
  es: {
    title: 'Crear Nueva Cuenta',
    confirmEmailTitle: 'Revisa tu correo',
    confirmEmailDesc: 'Enviamos un enlace de confirmación a tu correo. Por favor, haz clic para activar tu cuenta.',
    nameLabel: 'Nombre Completo',
    namePlaceholder: 'Ej: Juan Pérez',
    emailLabel: 'Correo Electrónico',
    passwordLabel: 'Contraseña',
    submitBtn: 'Registrarse',
    loadingBtn: 'Creando cuenta...',
    hasAccount: '¿Ya tienes una cuenta?',
    loginLink: 'Entrar',
    errorGeneric: 'Error al crear cuenta'
  }
}

export default function RegisterPage() {
  const router = useRouter()
  
  // Estado do Idioma (Padrão PT)
  const [lang, setLang] = useState<'pt' | 'en' | 'es'>('pt')
  const [showLangMenu, setShowLangMenu] = useState(false)
  
  // Novo estado para controlar a tela de sucesso
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Pega os textos baseados no estado atual
  const t = TRANSLATIONS[lang]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Cria o usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // CORREÇÃO CRÍTICA PARA VERCEL:
          // Isso garante que o link no e-mail aponte para a URL correta (seja localhost ou Vercel)
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined,
          
          data: {
            full_name: formData.name,
            language: lang, 
            currency: lang === 'pt' ? 'BRL' : 'USD', 
            timezone: lang === 'pt' ? 'America/Sao_Paulo' : 'UTC' 
          },
        },
      })

      if (error) throw error

      // 2. Verifica o resultado
      // Se user existe mas session é null, o Supabase está aguardando confirmação de e-mail.
      if (data.user && !data.session) {
        setIsSubmitted(true) // Mostra a tela de "Verifique seu e-mail"
      } else if (data.user) {
        // Se a confirmação de e-mail estiver desligada no Supabase, entra direto
        router.push('/dashboard')
      }
      
    } catch (error: any) {
      setErrorMsg(error.message || t.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  // Opções de idioma para o menu
  const languages = [
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' }
  ]

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black text-white relative">
      
      {/* BOTÃO DE IDIOMA (Canto Superior Direito) */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <Globe size={16} />
            <span className="uppercase">{lang}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
              {languages.map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    setLang(item.code as any)
                    setShowLangMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <span>{item.flag}</span> {item.label}
                  </span>
                  {lang === item.code && <Check size={14} className="text-blue-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-[350px] p-6 bg-gray-900 rounded-lg border border-gray-800 shadow-2xl">
        
        {isSubmitted ? (
          // --- TELA DE SUCESSO / VERIFICAR EMAIL ---
          <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500 mb-2">
              <MailCheck size={32} />
            </div>
            <h1 className="text-xl font-bold text-white">{t.confirmEmailTitle}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">{t.confirmEmailDesc}</p>
            <Link href="/login" className="text-blue-400 font-bold hover:underline pt-2">
              {t.loginLink}
            </Link>
          </div>
        ) : (
          // --- FORMULÁRIO DE CADASTRO ---
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="text-center mb-2">
               <h1 className="text-2xl font-bold text-blue-500">{t.title}</h1>
            </div>
            
            {errorMsg && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t.nameLabel}</label>
              <input
                type="text"
                placeholder={t.namePlaceholder}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t.emailLabel}</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t.passwordLabel}</label>
              <input
                type="password"
                placeholder="******"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-blue-500 outline-none transition-colors"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {loading ? t.loadingBtn : t.submitBtn}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              {t.hasAccount}{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors">
                {t.loginLink}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}