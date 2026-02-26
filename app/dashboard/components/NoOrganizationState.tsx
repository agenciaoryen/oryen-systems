'use client'

import { Building2, MessageSquare, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

// --- DICIONÁRIO DE TRADUÇÃO ---
const TRANSLATIONS = {
  pt: {
    greeting: 'Bem-vindo, {name}!',
    visitor: 'Visitante',
    subtitlePart1: 'Sua conta foi criada com sucesso, mas você ainda não está vinculado a nenhuma ',
    orgHighlight: 'Organização',
    subtitlePart2: '.',
    nextSteps: 'Próximos Passos',
    instructions: 'Para começar a usar os Agentes de IA e gerenciar seus leads, é necessário ativar seu ambiente corporativo.',
    supportBtn: 'Falar com Suporte Oryen',
    supportMsg: 'Olá, criei minha conta na Oryen e preciso configurar minha organização.',
    footerText: 'Já tem uma organização? Peça ao administrador para te enviar um convite por e-mail.'
  },
  en: {
    greeting: 'Welcome, {name}!',
    visitor: 'Visitor',
    subtitlePart1: 'Your account was created successfully, but you are not linked to any ',
    orgHighlight: 'Organization',
    subtitlePart2: ' yet.',
    nextSteps: 'Next Steps',
    instructions: 'To start using AI Agents and managing your leads, you need to activate your corporate environment.',
    supportBtn: 'Talk to Oryen Support',
    supportMsg: 'Hello, I created my account at Oryen and I need to set up my organization.',
    footerText: 'Already have an organization? Ask your administrator to send you an email invitation.'
  },
  es: {
    greeting: '¡Bienvenido, {name}!',
    visitor: 'Visitante',
    subtitlePart1: 'Su cuenta fue creada con éxito, pero aún no está vinculado a ninguna ',
    orgHighlight: 'Organización',
    subtitlePart2: '.',
    nextSteps: 'Próximos Pasos',
    instructions: 'Para comenzar a usar los Agentes de IA y administrar sus leads, debe activar su entorno corporativo.',
    supportBtn: 'Hablar con Soporte Oryen',
    supportMsg: 'Hola, creé mi cuenta en Oryen y necesito configurar mi organización.',
    footerText: '¿Ya tienes una organización? Pídele a tu administrador que te envíe una invitación por correo electrónico.'
  }
}

export default function NoOrganizationState() {
  const { user } = useAuth()

  // Detecta o idioma do usuário (padrão pt)
  const userLang = ((user as any)?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]

  // CORREÇÃO: Usando (user as any) para burlar o erro de tipagem restrita do TypeScript
  const firstName = (user as any)?.user_metadata?.full_name?.split(' ')[0] || (user as any)?.full_name?.split(' ')[0] || t.visitor

  // Link do seu WhatsApp de suporte com mensagem traduzida
  const supportLink = `https://wa.me/5551998388409?text=${encodeURIComponent(t.supportMsg)}`

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center px-4 animate-in fade-in zoom-in duration-500">
      
      {/* Ícone de destaque */}
      <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
        <Building2 className="w-10 h-10 text-blue-500" />
      </div>

      <h1 className="text-3xl font-bold text-white mb-3">
        {t.greeting.replace('{name}', firstName)}
      </h1>
      
      <p className="text-gray-400 max-w-md text-lg mb-8 leading-relaxed">
        {t.subtitlePart1} <span className="text-blue-400 font-bold">{t.orgHighlight}</span>{t.subtitlePart2}
      </p>

      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-lg w-full mb-8">
        <h3 className="text-sm font-bold text-gray-300 uppercase mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          {t.nextSteps}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {t.instructions}
        </p>
        
        <a 
          href={supportLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 group"
        >
          <MessageSquare size={20} />
          {t.supportBtn}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      <p className="text-xs text-gray-600">
        {t.footerText}
      </p>
    </div>
  )
}