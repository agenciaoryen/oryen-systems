// @ts-nocheck
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useEffect, useState, useMemo } from 'react'
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
  Building2,
  ChevronDown,
  BarChart3,
  FileText,
  Smartphone,
  CalendarDays,
  RefreshCw,
  Sun,
  Moon,
  Home,
  Globe,
  type LucideIcon
} from 'lucide-react'
import { useTheme } from '@/lib/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    sectionTitle: 'Plataforma',
    menu: {
      overview: 'Visão Geral',
      alerts: 'Alertas',
      crm: 'CRM & Contatos',
      conversations: 'Conversas',
      agents: 'Agentes IA',
      reports: 'Relatórios',
      documents: 'Documentos',
      whatsapp: 'WhatsApp',
      calendar: 'Agenda',
      followUp: 'Follow-up',
      portfolio: 'Portfólio',
      mySite: 'Meu Site',
      settings: 'Configurações'
    },
    comingSoon: '(Em Breve)',
    logout: 'Sair da Conta',
    toastAction: 'Ver',
    staffMode: 'Modo Staff',
    globalAccess: 'Acesso Global',
    selectOrg: 'Selecione um cliente',
    viewingAs: 'Visualizando como',
    themeLight: 'Tema Claro',
    themeDark: 'Tema Escuro',
  },
  en: {
    sectionTitle: 'Platform',
    menu: {
      overview: 'Overview',
      alerts: 'Alerts',
      crm: 'CRM & Contacts',
      conversations: 'Conversations',
      agents: 'AI Agents',
      reports: 'Reports',
      documents: 'Documents',
      whatsapp: 'WhatsApp',
      calendar: 'Calendar',
      followUp: 'Follow-up',
      portfolio: 'Portfolio',
      mySite: 'My Site',
      settings: 'Settings'
    },
    comingSoon: '(Coming Soon)',
    logout: 'Logout',
    toastAction: 'View',
    staffMode: 'Staff Mode',
    globalAccess: 'Global Access',
    selectOrg: 'Select a client',
    viewingAs: 'Viewing as',
    themeLight: 'Light Theme',
    themeDark: 'Dark Theme',
  },
  es: {
    sectionTitle: 'Plataforma',
    menu: {
      overview: 'Visión General',
      alerts: 'Alertas',
      crm: 'CRM & Contactos',
      conversations: 'Conversaciones',
      agents: 'Agentes IA',
      reports: 'Reportes',
      documents: 'Documentos',
      whatsapp: 'WhatsApp',
      calendar: 'Agenda',
      followUp: 'Follow-up',
      portfolio: 'Portafolio',
      mySite: 'Mi Sitio',
      settings: 'Configuración'
    },
    comingSoon: '(Próximamente)',
    logout: 'Cerrar Sesión',
    toastAction: 'Ver',
    staffMode: 'Modo Staff',
    globalAccess: 'Acceso Global',
    selectOrg: 'Seleccione un cliente',
    viewingAs: 'Viendo como',
    themeLight: 'Tema Claro',
    themeDark: 'Tema Oscuro',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// NICHOS COM ACESSO A DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════════════════

const NICHES_WITH_DOCUMENTS = ['real_estate']

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: boolean 
  isComingSoon?: boolean
  requiredNiche?: string[] // Nichos que têm acesso a este item
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  
  // Auth Context com suporte a Staff
  const { 
    user, 
    org,
    isStaff, 
    availableOrgs, 
    selectedOrgId, 
    setSelectedOrgId,
    activeOrgName 
  } = useAuth()

  // Configurações de Localização
  const userLang = ((user as any)?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]

  // Estados
  const { theme, toggleTheme } = useTheme()

  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false)

  // Nicho da org ativa (para staff, pega da org selecionada)
  const activeNiche = useMemo(() => {
    if (isStaff && selectedOrgId) {
      const selectedOrg = availableOrgs.find(o => o.id === selectedOrgId)
      return selectedOrg?.niche || null
    }
    return org?.niche || null
  }, [isStaff, selectedOrgId, availableOrgs, org])

  // Função de Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Handler para trocar de organização
  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId)
    setIsOrgDropdownOpen(false)
    const orgName = availableOrgs.find(o => o.id === orgId)?.name
    if (orgName) {
      toast.success(`Visualizando: ${orgName}`)
    }
  }

  // ─── BADGE DE ALERTAS + REALTIME + SOM ───
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
            // Som de notificação
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.5 
            audio.play().catch((err) => {
              console.log("Reprodução de áudio bloqueada: ", err)
            })

            // Toast notification
            const newAlert = payload.new as { title?: string; description?: string }
            
            toast.info(newAlert.title || 'Novo alerta', {
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

  // ─── FECHAR DROPDOWN AO CLICAR FORA ───
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-org-dropdown]')) {
        setIsOrgDropdownOpen(false)
      }
    }
    
    if (isOrgDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOrgDropdownOpen])

  // ─── LINKS DO MENU ───
  const allLinks: SidebarItem[] = [
    { href: '/dashboard', label: t.menu.overview, icon: LayoutDashboard },
    { href: '/dashboard/alerts', label: t.menu.alerts, icon: Bell, badge: hasUnreadAlerts },
    { href: '/dashboard/crm', label: t.menu.crm, icon: Users },
    { href: '/dashboard/portfolio', label: t.menu.portfolio, icon: Home, requiredNiche: NICHES_WITH_DOCUMENTS },
    { href: '/dashboard/site', label: t.menu.mySite, icon: Globe, requiredNiche: NICHES_WITH_DOCUMENTS },
    { href: '/dashboard/messages', label: t.menu.conversations, icon: MessageSquare },
    { href: '/dashboard/documents', label: t.menu.documents, icon: FileText, requiredNiche: NICHES_WITH_DOCUMENTS },
    { href: '/dashboard/whatsapp', label: t.menu.whatsapp, icon: Smartphone, requiredNiche: NICHES_WITH_DOCUMENTS },
    { href: '/dashboard/calendar', label: t.menu.calendar, icon: CalendarDays },
    { href: '/dashboard/follow-up', label: t.menu.followUp, icon: RefreshCw },
    { href: '/dashboard/relatorios', label: t.menu.reports, icon: BarChart3 },
    { href: '/dashboard/agents', label: t.menu.agents, icon: Bot },
    { href: '/dashboard/settings', label: t.menu.settings, icon: Settings },
  ]

  // Filtrar links baseado no nicho da org
  const links = useMemo(() => {
    return allLinks.filter(link => {
      // Se não tem requiredNiche, mostra para todos
      if (!link.requiredNiche) return true
      // Se tem requiredNiche, verifica se o nicho da org está na lista
      return activeNiche && link.requiredNiche.includes(activeNiche)
    })
  }, [allLinks, activeNiche])

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          BARRA SUPERIOR MOBILE
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 border-b flex items-center justify-between px-4 z-40" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          SIDEBAR PRINCIPAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 flex-col border-r z-50 transition-transform duration-300 ease-in-out md:translate-x-0 flex",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}
      >
        
        {/* LOGO */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="flex items-center">
            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Bot className="text-white" size={20} />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Oryen
            </span>
          </div>
          
          {/* Botão de fechar no mobile */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SELETOR DE ORGANIZAÇÃO (STAFF ONLY)
            ═══════════════════════════════════════════════════════════════════════ */}
        {isStaff && availableOrgs.length > 0 && (
          <div className="px-4 pt-4 pb-2" data-org-dropdown>
            <div className="relative">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-indigo-500/20 rounded-lg shrink-0">
                    <Building2 size={14} className="text-indigo-400" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-indigo-300 text-[9px] font-black uppercase tracking-widest">
                      {t.viewingAs}
                    </p>
                    <p className="text-white text-xs font-semibold truncate">
                      {activeOrgName || t.selectOrg}
                    </p>
                  </div>
                </div>
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "text-indigo-400 transition-transform shrink-0",
                    isOrgDropdownOpen && "rotate-180"
                  )} 
                />
              </button>

              {/* Dropdown Menu */}
              {isOrgDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-50" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                  <div className="max-h-[240px] overflow-y-auto">
                    {availableOrgs.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgChange(org.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left text-sm transition-all flex items-center justify-between group",
                          selectedOrgId === org.id 
                            ? "bg-indigo-500/20 text-white" 
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <span className="truncate">{org.name}</span>
                        {selectedOrgId === org.id && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MENU DE NAVEGAÇÃO */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
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
                      onClick={() => setIsMobileOpen(false)}
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
                          {link.label}
                          {link.isComingSoon && (
                            <span className="text-[10px] opacity-60 ml-1">{t.comingSoon}</span>
                          )}
                        </span>
                      </div>
                      
                      {/* Badge de notificação */}
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
        {isStaff && (
          <div className="px-4 pb-2">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg shrink-0">
                <ShieldCheck size={16} className="text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-indigo-300 text-[9px] font-black uppercase tracking-widest truncate">
                  {t.globalAccess}
                </p>
                <p className="text-indigo-400 text-xs font-medium truncate">
                  {t.staffMode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RODAPÉ - THEME TOGGLE + LOGOUT */}
        <div className="border-t p-4 shrink-0" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
          {/* Toggle de tema */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all mb-1 border border-transparent"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? t.themeLight : t.themeDark}
          </button>

          {/* Logout */}
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