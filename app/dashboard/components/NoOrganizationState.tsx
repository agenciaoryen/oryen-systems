'use client'

import { Building2, MessageSquare, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

export default function NoOrganizationState() {
  const { user } = useAuth()

  // Link do seu WhatsApp de suporte
  const supportLink = "https://wa.me/5551998388409?text=Olá, criei minha conta na Oryen e preciso configurar minha organização."

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center px-4 animate-in fade-in zoom-in duration-500">
      
      {/* Ícone de destaque */}
      <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
        <Building2 className="w-10 h-10 text-blue-500" />
      </div>

      <h1 className="text-3xl font-bold text-white mb-3">
        Bem-vindo, {user?.user_metadata?.full_name?.split(' ')[0] || 'Visitante'}!
      </h1>
      
      <p className="text-gray-400 max-w-md text-lg mb-8 leading-relaxed">
        Sua conta foi criada com sucesso, mas você ainda não está vinculado a nenhuma <span className="text-blue-400 font-bold">Organização</span>.
      </p>

      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-lg w-full mb-8">
        <h3 className="text-sm font-bold text-gray-300 uppercase mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          Próximos Passos
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Para começar a usar os Agentes de IA e gerenciar seus leads, é necessário ativar seu ambiente corporativo.
        </p>
        
        <a 
          href={supportLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 group"
        >
          <MessageSquare size={20} />
          Falar com Suporte Oryen
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      <p className="text-xs text-gray-600">
        Já tem uma organização? Peça ao administrador para te enviar um convite por e-mail.
      </p>
    </div>
  )
}