'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Globe, Check } from 'lucide-react'

// --- DICIONÁRIO DE TRADUÇÃO (LOCAL) ---
const TRANSLATIONS = {
  pt: {
    title: 'Acessar Conta',
    emailLabel: 'Email',
    passwordLabel: 'Senha',
    submitBtn: 'Entrar',
    loadingBtn: 'Entrando...',
    noAccount: 'Não tem uma conta?',
    registerLink: 'Cadastre-se',
    errorGeneric: 'Erro ao realizar login'
  },
  en: {
    title: 'Sign In',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submitBtn: 'Sign In',
    loadingBtn: 'Signing in...',
    noAccount: 'No account?',
    registerLink: 'Sign Up',
    errorGeneric: 'Error signing in'
  },
  es: {
    title: 'Iniciar Sesión',
    emailLabel: 'Correo Electrónico',
    passwordLabel: 'Contraseña',
    submitBtn: 'Entrar',
    loadingBtn: 'Entrando...',
    noAccount: '¿No tiene cuenta?',
    registerLink: 'Regístrate',
    errorGeneric: 'Error al iniciar sesión'
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Estado do Idioma (Visual apenas para o Login)
  const [lang, setLang] = useState<'pt' | 'en' | 'es'>('pt')
  const [showLangMenu, setShowLangMenu] = useState(false)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Pega os textos baseados no estado atual
  const t = TRANSLATIONS[lang]

  // Opções de idioma para o menu
  const languages = [
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' }
  ]

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (user) {
      router.replace('/dashboard')
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingLocal(true)
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redireciona e força refresh para carregar dados do usuário (incluindo idioma salvo)
      router.push('/dashboard') 
      router.refresh()
      
    } catch (error: any) {
      setErrorMsg(error.message || t.errorGeneric)
      setLoadingLocal(false)
    }
  }

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

      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-[350px] p-6 bg-gray-900 rounded-lg border border-gray-800 shadow-2xl">
        <div className="text-center mb-2">
           <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        </div>

        {errorMsg && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm text-center">
            {errorMsg}
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500 uppercase">{t.emailLabel}</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-blue-500 outline-none transition-colors"
            required
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500 uppercase">{t.passwordLabel}</label>
          <input
            type="password"
            placeholder="******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-lg bg-black border border-gray-800 text-white focus:border-blue-500 outline-none transition-colors"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loadingLocal}
          className="mt-4 bg-white text-black hover:bg-gray-200 p-3 rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg"
        >
          {loadingLocal ? t.loadingBtn : t.submitBtn}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t.noAccount}{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors">
            {t.registerLink}
          </Link>
        </p>
      </form>
    </div>
  )
}