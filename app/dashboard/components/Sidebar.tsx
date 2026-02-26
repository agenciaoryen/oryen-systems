'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useIsStaff } from '@/lib/AuthContext'
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut,
  Hexagon,
  Bell,
  ChevronDown,
  Building2,
  Check,
  Shield
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    menu: 'Menu Principal',
    overview: 'Visão Geral',
    crm: 'CRM / Leads',
    messages: 'Conversas',
    alerts: 'Alertas',
    settings: 'Configurações',
    logout: 'Sair do Sistema',
    staff: 'Staff',
    viewingAs: 'Visualizando como',
    selectOrg: 'Selecionar organização'
  },
  en: {
    menu: 'Main Menu',
    overview: 'Overview',
    crm: 'CRM / Leads',
    messages: 'Messages',
    alerts: 'Alerts',
    settings: 'Settings',
    logout: 'Log Out',
    staff: 'Staff',
    viewingAs: 'Viewing as',
    selectOrg: 'Select organization'
  },
  es: {
    menu: 'Menú Principal',
    overview: 'Visión General',
    crm: 'CRM / Leads',
    messages: 'Conversaciones',
    alerts: 'Alertas',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    staff: 'Staff',
    viewingAs: 'Viendo como',
    selectOrg: 'Seleccionar organización'
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, availableOrgs, selectedOrgId, setSelectedOrgId, activeOrgName } = useAuth()
  const isStaff = useIsStaff()

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false)

  // Detecta o idioma do usuário
  const userLang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Função para destacar o link ativo
  const isActive = (path: string) => {
    const isCurrentPath = path === '/dashboard' 
      ? pathname === path 
      : pathname.startsWith(path)

    return isCurrentPath 
      ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500' 
      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-r-2 border-transparent'
  }

  // Lista de itens de navegação
  const navItems = [
    { name: t.overview, href: '/dashboard', icon: LayoutDashboard },
    { name: t.crm, href: '/dashboard/crm', icon: Users },
    { name: t.messages, href: '/dashboard/messages', icon: MessageSquare },
    { name: t.alerts, href: '/dashboard/alerts', icon: Bell },
    { name: t.settings, href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col z-50">
      
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer">
          <Hexagon 
            className="w-8 h-8 text-blue-500 group-hover:text-blue-400 transition-colors" 
            fill="currentColor" 
            fillOpacity={0.2} 
          />
          <span className="text-2xl font-black text-white tracking-tight">
            Oryen<span className="text-blue-500">.</span>
          </span>
        </Link>
      </div>

      {/* Staff: Seletor de Organização */}
      {isStaff && availableOrgs.length > 0 && (
        <div className="px-4 py-3 border-b border-white/5">
          {/* Badge de Staff */}
          <div className="flex items-center gap-2 mb-2">
            <Shield size={12} className="text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              {t.staff}
            </span>
          </div>

          {/* Dropdown de Organização */}
          <div className="relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={16} className="text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t.viewingAs}</p>
                  <p className="text-sm font-medium text-white truncate">
                    {activeOrgName || t.selectOrg}
                  </p>
                </div>
              </div>
              <ChevronDown 
                size={16} 
                className={`text-indigo-400 transition-transform shrink-0 ${isOrgDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isOrgDropdownOpen && (
              <>
                {/* Overlay para fechar */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsOrgDropdownOpen(false)} 
                />
                
                {/* Menu */}
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto">
                  {availableOrgs.map((org) => {
                    const isSelected = org.id === selectedOrgId
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          setSelectedOrgId(org.id)
                          setIsOrgDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors ${
                          isSelected 
                            ? 'bg-indigo-500/10 text-indigo-300' 
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSelected 
                              ? 'bg-indigo-500/20 text-indigo-300' 
                              : 'bg-white/10 text-gray-400'
                          }`}>
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium truncate">{org.name}</span>
                        </div>
                        {isSelected && (
                          <Check size={16} className="text-indigo-400 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Menu de Navegação */}
      <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto">
        <p className="px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          {t.menu}
        </p>
        
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-6 py-3.5 transition-all group ${active}`}
            >
              <Icon 
                size={20} 
                className={active.includes('text-blue-400') ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} 
              />
              <span className="font-semibold text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        {/* Info do usuário */}
        {user?.email && (
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        
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