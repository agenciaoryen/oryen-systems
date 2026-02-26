'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Lightbulb,
  Loader2,
  Trash2,
  RefreshCw,
  Filter,
  CheckCheck
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface Alert {
  id: string
  user_id: string
  type: 'urgent' | 'suggestion' | 'info'
  title: string
  description: string
  action_link: string | null
  action_label: string | null
  is_read: boolean
  created_at: string
}

type AlertType = 'all' | 'urgent' | 'suggestion' | 'info'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Central de Alertas',
    subtitle: 'Prioridades e sugestões inteligentes para o seu dia.',
    refresh: 'Atualizar',
    emptyTitle: 'Tudo Limpo!',
    emptyDesc: 'Você não tem alertas pendentes por enquanto.',
    confirmDelete: 'Excluir este alerta?',
    markRead: 'Marcar como lido',
    markAllRead: 'Marcar todos como lidos',
    delete: 'Excluir alerta',
    filterAll: 'Todos',
    unreadCount: 'não lidos',
    types: {
      urgent: 'Urgente',
      suggestion: 'Sugestão IA',
      info: 'Informativo'
    }
  },
  en: {
    title: 'Alerts Center',
    subtitle: 'Priorities and smart suggestions for your day.',
    refresh: 'Refresh',
    emptyTitle: 'All Clear!',
    emptyDesc: 'You have no pending alerts for now.',
    confirmDelete: 'Delete this alert?',
    markRead: 'Mark as read',
    markAllRead: 'Mark all as read',
    delete: 'Delete alert',
    filterAll: 'All',
    unreadCount: 'unread',
    types: {
      urgent: 'Urgent',
      suggestion: 'AI Suggestion',
      info: 'Info'
    }
  },
  es: {
    title: 'Centro de Alertas',
    subtitle: 'Prioridades y sugerencias inteligentes para su día.',
    refresh: 'Actualizar',
    emptyTitle: '¡Todo Limpio!',
    emptyDesc: 'No tiene alertas pendientes por ahora.',
    confirmDelete: '¿Eliminar esta alerta?',
    markRead: 'Marcar como leído',
    markAllRead: 'Marcar todos como leídos',
    delete: 'Eliminar alerta',
    filterAll: 'Todos',
    unreadCount: 'no leídos',
    types: {
      urgent: 'Urgente',
      suggestion: 'Sugerencia IA',
      info: 'Informativo'
    }
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const parseDateSafe = (dateValue: unknown): Date => {
  try {
    if (!dateValue) return new Date()
    const d = new Date(String(dateValue))
    return isNaN(d.getTime()) ? new Date() : d
  } catch {
    return new Date()
  }
}

const formatRelativeTime = (dateString: string, lang: string): string => {
  const date = parseDateSafe(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return lang === 'en' ? 'Just now' : lang === 'es' ? 'Ahora mismo' : 'Agora'
  }
  if (diffMins < 60) {
    return lang === 'en' ? `${diffMins}m ago` : lang === 'es' ? `hace ${diffMins}m` : `há ${diffMins}m`
  }
  if (diffHours < 24) {
    return lang === 'en' ? `${diffHours}h ago` : lang === 'es' ? `hace ${diffHours}h` : `há ${diffHours}h`
  }
  if (diffDays < 7) {
    return lang === 'en' ? `${diffDays}d ago` : lang === 'es' ? `hace ${diffDays}d` : `há ${diffDays}d`
  }

  return date.toLocaleDateString(lang, { day: '2-digit', month: 'short' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

const getTypeConfig = (type: string, t: typeof TRANSLATIONS['pt']) => {
  const configs = {
    urgent: {
      icon: Flame,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      badge: t.types.urgent
    },
    suggestion: {
      icon: Lightbulb,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      badge: t.types.suggestion
    },
    info: {
      icon: Bell,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      badge: t.types.info
    }
  }
  return configs[type as keyof typeof configs] || configs.info
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AlertsPage() {
  const { user } = useAuth()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<AlertType>('all')

  // Configurações de idioma
  const userLang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]

  // ─── BUSCAR ALERTAS ───
  const fetchAlerts = useCallback(async (showRefresh = false) => {
    if (!user) return

    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAlerts(data as Alert[])
    }

    setLoading(false)
    setRefreshing(false)
  }, [user])

  // ─── EFEITOS ───
  useEffect(() => {
    if (!user) return

    fetchAlerts()

    // Realtime para novos alertas
    const channel = supabase
      .channel('realtime_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new as Alert, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchAlerts])

  // ─── MARCAR COMO LIDO ───
  async function markAsRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
  }

  // ─── MARCAR TODOS COMO LIDOS ───
  async function markAllAsRead() {
    if (!user) return

    const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id)
    if (unreadIds.length === 0) return

    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))

    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  // ─── EXCLUIR ALERTA ───
  async function deleteAlert(id: string) {
    if (!confirm(t.confirmDelete)) return
    setAlerts(prev => prev.filter(a => a.id !== id))
    await supabase.from('alerts').delete().eq('id', id)
  }

  // ─── FILTRAR ALERTAS ───
  const filteredAlerts = alerts.filter(alert => {
    if (filterType === 'all') return true
    return alert.type === filterType
  })

  const unreadCount = alerts.filter(a => !a.is_read).length

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            {t.title}
            {unreadCount > 0 && (
              <span className="text-sm font-normal text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">
                {unreadCount} {t.unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">{t.markAllRead}</span>
            </button>
          )}
          <button
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
            className="text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t.refresh}</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={14} className="text-gray-500 shrink-0" />
        {(['all', 'urgent', 'suggestion', 'info'] as AlertType[]).map((type) => {
          const isActive = filterType === type
          const count = type === 'all' ? alerts.length : alerts.filter(a => a.type === type).length

          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {type === 'all' ? t.filterAll : t.types[type]}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* LISTA DE ALERTAS */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 border border-white/5 rounded-2xl bg-[#0A0A0A] shadow-2xl">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500/50 mb-4" />
            <h3 className="text-lg font-bold text-white">{t.emptyTitle}</h3>
            <p className="text-gray-500 text-sm">{t.emptyDesc}</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = getTypeConfig(alert.type, t)
            const Icon = config.icon

            return (
              <div
                key={alert.id}
                className={`relative group flex flex-col sm:flex-row gap-4 p-4 md:p-5 rounded-xl border transition-all duration-200 ${
                  alert.is_read
                    ? 'bg-[#0A0A0A] border-white/5 opacity-60 hover:opacity-100'
                    : `bg-[#111] ${config.border} shadow-lg`
                }`}
              >
                {/* Indicador de não lido */}
                {!alert.is_read && (
                  <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                )}

                {/* Ícone */}
                <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${config.bg} ${config.color}`}>
                  <Icon size={20} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${config.bg} ${config.color} ${config.border}`}>
                      {config.badge}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {formatRelativeTime(alert.created_at, userLang)}
                    </span>
                  </div>

                  <h3 className={`text-base md:text-lg font-bold leading-tight ${alert.is_read ? 'text-gray-400' : 'text-white'}`}>
                    {alert.title}
                  </h3>

                  <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
                    {alert.description}
                  </p>

                  {/* Botão de Ação */}
                  {alert.action_link && alert.action_label && (
                    <div className="pt-2">
                      <Link
                        href={alert.action_link}
                        onClick={() => markAsRead(alert.id)}
                        className={`inline-flex items-center gap-2 text-xs font-bold transition-all px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 ${config.color} hover:text-white`}
                      >
                        {alert.action_label}
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex sm:flex-col gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end sm:justify-start">
                  {!alert.is_read && (
                    <button
                      onClick={() => markAsRead(alert.id)}
                      className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      title={t.markRead}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title={t.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}