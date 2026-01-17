'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Função auxiliar para destacar o link ativo
  const isActive = (path: string) => pathname === path ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo / Título */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <span className="text-xl font-bold text-white tracking-tight">
          Oryen<span className="text-blue-500">.</span>
        </span>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 p-4 space-y-2">
        <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Menu Principal
        </p>
        
        <Link 
          href="/dashboard" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard')}`}
        >
          <span>📊</span> {/* Pode trocar por ícone do Lucide/Heroicons depois */}
          <span className="font-medium">Visão Geral</span>
        </Link>

        <Link 
          href="/dashboard/crm" 
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard/crm')}`}
        >
          <span>👥</span>
          <span className="font-medium">CRM / Leads</span>
        </Link>
      </nav>

      {/* Rodapé da Sidebar */}
      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <span>🚪</span>
          <span className="font-medium">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  )
}