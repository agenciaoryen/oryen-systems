'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut,
  Hexagon // Ícone para a logo
} from 'lucide-react'

// --- DICIONÁRIO DE TRADUÇÃO ---
const TRANSLATIONS = {
  pt: {
    menu: 'Menu Principal',
    overview: 'Visão Geral',
    crm: 'CRM / Leads',
    messages: 'Conversas',
    settings: 'Configurações',
    logout: 'Sair do Sistema'
  },
  en: {
    menu: 'Main Menu',
    overview: 'Overview',
    crm: 'CRM / Leads',
    messages: 'Messages',
    settings: 'Settings',
    logout: 'Log Out'
  },
  es: {
    menu: 'Menú Principal',
    overview: 'Visión General',
    crm: 'CRM / Leads',
    messages: 'Conversaciones',
    settings: 'Configuración',
    logout: 'Cerrar Sesión'
  }
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  // Detecta o idioma do usuário (padrão pt)
  const userLang = ((user as any)?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Função para destacar o link ativo com visual premium
  const isActive = (path: string) => {
    // Lógica para manter o menu ativo mesmo em sub-rotas (ex: /dashboard/crm/123)
    const isCurrentPath = path === '/dashboard' 
      ? pathname === path 
      : pathname.startsWith(path);

    return isCurrentPath 
      ? "bg-blue-500/10 text-blue-400 border-r-2 border-blue-500" 
      : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border-r-2 border-transparent"
  }

  // Lista de itens de navegação para facilitar a manutenção
  const navItems = [
    { name: t.overview, href: '/dashboard', icon: LayoutDashboard },
    { name: t.crm, href: '/dashboard/crm', icon: Users },
    { name: t.messages, href: '/dashboard/messages', icon: MessageSquare },
    { name: t.settings, href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col z-50">
      
      {/* Logo / Título */}
      <div className="h-20 flex items-center px-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer">
          <Hexagon className="w-8 h-8 text-blue-500 group-hover:text-blue-400 transition-colors" fill="currentColor" fillOpacity={0.2} />
          <span className="text-2xl font-black text-white tracking-tight">
            Oryen<span className="text-blue-500">.</span>
          </span>
        </Link>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        <p className="px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          {t.menu}
        </p>
        
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-6 py-3.5 transition-all group ${isActive(item.href)}`}
            >
              <Icon size={20} className={isActive(item.href).includes('text-blue-400') ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
              <span className="font-semibold text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Rodapé da Sidebar (Usuário e Logout) */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-semibold text-sm group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>{t.logout}</span>
        </button>
      </div>
    </aside>
  )
}