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
    sections: {
      commercial: 'Comercial',
      properties: 'Imóveis',
      tools: 'Ferramentas',
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
    sections: {
      commercial: 'Commercial',
      properties: 'Properties',
      tools: 'Tools',
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
    sections: {
      commercial: 'Comercial',
      properties: 'Inmuebles',
      tools: 'Herramientas',
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
  requiredNiche?: string[]
}

interface SidebarGroup {
  key: string
  title?: string // undefined = sem título (grupo principal)
  collapsible?: boolean
  items: SidebarItem[]
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

  // ─── COLLAPSED STATE (fechado por default) ───
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    commercial: true,
    properties: true,
    tools: true,
  })

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ─── GRUPOS DO MENU ───
  const allGroups: SidebarGroup[] = [
    {
      key: 'main',
      items: [
        { href: '/dashboard', label: t.menu.overview, icon: LayoutDashboard },
        { href: '/dashboard/alerts', label: t.menu.alerts, icon: Bell, badge: hasUnreadAlerts },
      ],
    },
    {
      key: 'commercial',
      title: t.sections.commercial,
      collapsible: true,
      items: [
        { href: '/dashboard/crm', label: t.menu.crm, icon: Users },
        { href: '/dashboard/messages', label: t.menu.conversations, icon: MessageSquare },
        { href: '/dashboard/calendar', label: t.menu.calendar, icon: CalendarDays },
        { href: '/dashboard/follow-up', label: t.menu.followUp, icon: RefreshCw },
      ],
    },
    {
      key: 'properties',
      title: t.sections.properties,
      collapsible: true,
      items: [
        { href: '/dashboard/portfolio', label: t.menu.portfolio, icon: Home, requiredNiche: NICHES_WITH_DOCUMENTS },
        { href: '/dashboard/site', label: t.menu.mySite, icon: Globe, requiredNiche: NICHES_WITH_DOCUMENTS },
      ],
    },
    {
      key: 'tools',
      title: t.sections.tools,
      collapsible: true,
      items: [
        { href: '/dashboard/agents', label: t.menu.agents, icon: Bot },
        { href: '/dashboard/whatsapp', label: t.menu.whatsapp, icon: Smartphone, requiredNiche: NICHES_WITH_DOCUMENTS },
        { href: '/dashboard/documents', label: t.menu.documents, icon: FileText, requiredNiche: NICHES_WITH_DOCUMENTS },
        { href: '/dashboard/relatorios', label: t.menu.reports, icon: BarChart3 },
      ],
    },
    {
      key: 'config',
      items: [
        { href: '/dashboard/settings', label: t.menu.settings, icon: Settings },
      ],
    },
  ]

  // Filtrar links baseado no nicho da org e remover grupos vazios
  const groups = useMemo(() => {
    return allGroups
      .map(group => ({
        ...group,
        items: group.items.filter(link => {
          if (!link.requiredNiche) return true
          return activeNiche && link.requiredNiche.includes(activeNiche)
        }),
      }))
      .filter(group => group.items.length > 0)
  }, [allGroups, activeNiche])


  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          BARRA SUPERIOR MOBILE
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 border-b flex items-center justify-between px-4 z-40" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border)' }}>
        <span
          className="text-xl font-extrabold tracking-widest"
          style={{
            fontFamily: 'var(--font-orbitron), sans-serif',
            background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >ORYEN</span>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 transition-colors rounded-lg"
          style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 backdrop-blur-sm z-40 transition-opacity"
          style={{ background: 'var(--color-bg-overlay)' }}
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
          <span
            className="text-xl font-extrabold tracking-widest"
            style={{
              fontFamily: 'var(--font-orbitron), sans-serif',
              background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >ORYEN</span>

          {/* Botão de fechar no mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
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
                className="w-full rounded-xl p-3 flex items-center justify-between transition-all group"
                style={{ background: 'var(--color-indigo-subtle)', border: '1px solid rgba(110, 95, 255, 0.2)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'rgba(110, 95, 255, 0.2)' }}>
                    <Building2 size={14} style={{ color: 'var(--color-indigo)' }} />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-indigo)' }}>
                      {t.viewingAs}
                    </p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {activeOrgName || t.selectOrg}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform shrink-0",
                    isOrgDropdownOpen && "rotate-180"
                  )}
                  style={{ color: 'var(--color-indigo)' }}
                />
              </button>

              {/* Dropdown Menu */}
              {isOrgDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-50" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                  <div className="max-h-[240px] overflow-y-auto">
                    {availableOrgs.map((orgItem) => (
                      <button
                        key={orgItem.id}
                        onClick={() => handleOrgChange(orgItem.id)}
                        className="w-full px-4 py-3 text-left text-sm transition-all flex items-center justify-between group"
                        style={{
                          background: selectedOrgId === orgItem.id ? 'var(--color-indigo-subtle)' : 'transparent',
                          color: selectedOrgId === orgItem.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                        }}
                        onMouseEnter={e => { if (selectedOrgId !== orgItem.id) { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' } }}
                        onMouseLeave={e => { if (selectedOrgId !== orgItem.id) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' } }}
                      >
                        <span className="truncate">{orgItem.name}</span>
                        {selectedOrgId === orgItem.id && (
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-indigo)' }} />
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
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {groups.map((group) => {
            const isCollapsed = collapsedSections[group.key] ?? false

            return (
              <div key={group.key}>
                {/* Título do grupo */}
                {group.title && (
                  <button
                    onClick={() => group.collapsible && toggleSection(group.key)}
                    className={cn(
                      'w-full flex items-center justify-between px-2 pt-4 pb-1.5',
                      group.collapsible && 'cursor-pointer group/section'
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      {group.title}
                    </p>
                    {group.collapsible && (
                      <ChevronDown
                        size={12}
                        className={cn(
                          'transition-transform duration-200',
                          isCollapsed && '-rotate-90'
                        )}
                        style={{ color: 'var(--color-text-muted)' }}
                      />
                    )}
                  </button>
                )}

                {/* Items */}
                <div
                  className={cn(
                    'flex flex-col gap-0.5 overflow-hidden transition-all duration-200',
                    group.collapsible && isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                  )}
                >
                  {group.items.map((link) => {
                    const isActive = pathname === link.href
                    const Icon = link.icon

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileOpen(false)}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group"
                        style={isActive
                          ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(79, 111, 255, 0.2)' }
                          : { color: 'var(--color-text-tertiary)', border: '1px solid transparent' }
                        }
                        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' } }}
                        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' } }}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Icon size={17} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                          <span className="truncate">
                            {link.label}
                            {link.isComingSoon && (
                              <span className="text-[10px] opacity-60 ml-1">{t.comingSoon}</span>
                            )}
                          </span>
                        </div>

                        {/* Badge de notificação */}
                        {link.badge && !isActive && (
                          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--color-error)', boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }} />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* INDICADOR STAFF */}
        {isStaff && (
          <div className="px-4 pb-2">
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'var(--color-indigo-subtle)', border: '1px solid rgba(110, 95, 255, 0.2)' }}>
              <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'rgba(110, 95, 255, 0.2)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-indigo)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest truncate" style={{ color: 'var(--color-indigo)' }}>
                  {t.globalAccess}
                </p>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-indigo)' }}>
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
            style={{ color: 'var(--color-text-muted)', border: '1px solid transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-error-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-error)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239, 68, 68, 0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
          >
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>
      </aside>
    </>
  )
}