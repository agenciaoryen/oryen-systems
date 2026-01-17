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
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
        <div className="space-y-4 animate-in zoom-in duration-500">
          <CheckCircle2 className="text-emerald-500 w-16 h-16 mx-auto" />
          <h1 className="text-2xl font-bold text-white">{t.successTitle}</h1>
          <p className="text-gray-400">{t.successMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative">
      
      {/* SELETOR DE IDIOMA (Canto Superior Direito) */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-black border border-white/10 hover:border-white/20 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <Globe size={16} />
            <span className="uppercase">{lang}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-[#111] border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
              {languages.map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    setLang(item.code as any)
                    setShowLangMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center justify-between group"
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

      <div className="w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Bot className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <p className="text-gray-500 text-sm">{t.subtitle}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleFinalize} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.labelName}</label>
            <input 
              required
              type="text" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
              placeholder={t.placeholderName}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.labelPass}</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : t.btnActivate}
          </button>
        </form>
      </div>
    </div>
  )
}