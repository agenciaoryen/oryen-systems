'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useEffect, useState } from 'react'
import { toast } from 'sonner' 
import { 
  LayoutDashboard, 
  Users, 
  Bot, 
  LogOut, 
  MessageSquare,
  Settings,
  Bell,
  Menu,
  X,
  ShieldCheck,
  type LucideIcon 
} from 'lucide-react'

// --- 1. DICIONÁRIO DE TRADUÇÃO ---
const TRANSLATIONS = {
  pt: {
    sectionTitle: 'Plataforma',
    menu: {
      overview: 'Visão Geral',
      alerts: 'Alertas',
      crm: 'CRM & Leads',
      conversations: 'Conversas',
      agents: 'Agentes IA',
      settings: 'Configurações'
    },
    comingSoon: '(Em Breve)',
    logout: 'Sair da Conta',
    toastAction: 'Ver'
  },
  en: {
    sectionTitle: 'Platform',
    menu: {
      overview: 'Overview',
      alerts: 'Alerts',
      crm: 'CRM & Leads',
      conversations: 'Conversations',
      agents: 'AI Agents',
      settings: 'Settings'
    },
    comingSoon: '(Coming Soon)',
    logout: 'Logout',
    toastAction: 'View'
  },
  es: {
    sectionTitle: 'Plataforma',
    menu: {
      overview: 'Visión General',
      alerts: 'Alertas',
      crm: 'CRM & Leads',
      conversations: 'Conversaciones',
      agents: 'Agentes IA',
      settings: 'Configuración'
    },
    comingSoon: '(Próximamente)',
    logout: 'Cerrar Sesión',
    toastAction: 'Ver'
  }
}

// Função auxiliar para classes
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: boolean 
  isComingSoon?: boolean
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  // Configurações de Localização
  const userLang = (user?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]

  // Estados
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Verifica o nível de acesso do usuário (Staff)
  useEffect(() => {
    if (!user?.id) return
    const fetchRole = async () => {
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (data) setUserRole(data.role)
    }
    fetchRole()
  }, [user])

  // Função Real de Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // --- LÓGICA DO BADGE DINÂMICO, TOASTS E SOM ---
  useEffect(() => {
    if (!user) return

    const checkUnread = async () => {
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      setHasUnreadAlerts(!!count && count > 0)
    }

    checkUnread()

    const channel = supabase
      .channel('sidebar_badge_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.5 
            audio.play().catch((err) => {
              console.log("Reprodução de áudio bloqueada: ", err)
            })

            const newAlert = payload.new as any 
            
            toast.info(newAlert.title, {
              description: newAlert.description,
              action: {
                label: t.toastAction,
                onClick: () => {
                  setIsMobileOpen(false)
                  router.push('/dashboard/alerts')
                }
              },
              duration: 5000, 
            })
          }
          checkUnread() 
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, router, t.toastAction])

  // Definição dos links
  const links: SidebarItem[] = [
    { href: '/dashboard', label: t.menu.overview, icon: LayoutDashboard },
    { href: '/dashboard/alerts', label: t.menu.alerts, icon: Bell, badge: hasUnreadAlerts },
    { href: '/dashboard/crm', label: t.menu.crm, icon: Users },
    { href: '/dashboard/messages', label: t.menu.conversations, icon: MessageSquare, isComingSoon: true },
    { href: '/dashboard/agents', label: t.menu.agents, icon: Bot, isComingSoon: true },
    { href: '/dashboard/settings', label: t.menu.settings, icon: Settings },
  ]

  return (
    <>
      {/* ─── BARRA SUPERIOR MOBILE ─── */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Bot className="text-white" size={20} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Oryen</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(true)} 
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg bg-white/5"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}

      {/* ─── SIDEBAR (DESKTOP + GAVETA MOBILE) ─── */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 flex-col bg-[#0A0A0A] border-r border-white/10 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 flex",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* LOGO */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center">
            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Bot className="text-white" size={20} />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Oryen
            </span>
          </div>
          
          {/* Botão de fechar apenas no mobile */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
          
          <div>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {t.sectionTitle}
            </p>
            <ul className="flex flex-col gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href
                const Icon = link.icon

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileOpen(false)} // Fecha a gaveta no mobile
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                        isActive
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon size={18} className={isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-white'} />
                        <span className="truncate">
                          {link.label} {link.isComingSoon && <span className="text-[10px] opacity-60 ml-1">{t.comingSoon}</span>}
                        </span>
                      </div>
                      
                      {link.badge && !isActive && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse shrink-0" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* INDICADOR STAFF */}
        {userRole === 'staff' && (
          <div className="px-4 pb-2">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg shrink-0">
                <ShieldCheck size={16} className="text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-indigo-300 text-[9px] font-black uppercase tracking-widest truncate">Acesso Global</p>
                <p className="text-indigo-400 text-xs font-medium truncate">Modo Staff</p>
              </div>
            </div>
          </div>
        )}

        {/* RODAPÉ */}
        <div className="border-t border-white/5 p-4 bg-black/20 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-rose-500/10 hover:text-rose-400 hover:border hover:border-rose-500/20 border border-transparent"
          >
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>
      </aside>
    </>
  )
}