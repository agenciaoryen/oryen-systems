'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { usePlan } from '@/lib/usePlan'
import { FeatureLock } from '@/app/dashboard/components/FeatureLock'
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
    lockedDesc: 'Receba alertas inteligentes e sugestões da IA para priorizar seu dia.',
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
    lockedDesc: 'Get smart alerts and AI suggestions to prioritize your day.',
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
    lockedDesc: 'Recibe alertas inteligentes y sugerencias de IA para priorizar tu día.',
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

const TYPE_STYLES = {
  urgent: {
    color: 'var(--color-error)',
    bg: 'var(--color-error-subtle)',
    border: 'var(--color-error)',
  },
  suggestion: {
    color: 'var(--color-indigo)',
    bg: 'var(--color-indigo-subtle)',
    border: 'var(--color-indigo)',
  },
  info: {
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-subtle)',
    border: 'var(--color-primary)',
  },
}

const getTypeConfig = (type: string, t: typeof TRANSLATIONS['pt']) => {
  const configs = {
    urgent: {
      icon: Flame,
      style: TYPE_STYLES.urgent,
      badge: t.types.urgent
    },
    suggestion: {
      icon: Lightbulb,
      style: TYPE_STYLES.suggestion,
      badge: t.types.suggestion
    },
    info: {
      icon: Bell,
      style: TYPE_STYLES.info,
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
  const { canUseAutomations } = usePlan()

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
    if (!user || !canUseAutomations) return

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
  }, [user, fetchAlerts, canUseAutomations])

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

  // ─── VERIFICAR PERMISSÃO ───
  if (!canUseAutomations) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <Bell style={{ color: 'var(--color-primary)' }} />
            {t.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.subtitle}</p>
        </div>

        {/* FeatureLock */}
        <FeatureLock
          feature="hasAutomations"
          variant="replace"
          lang={userLang}
          title={t.title}
          description={t.lockedDesc}
        >
          <div />
        </FeatureLock>
      </div>
    )
  }

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            {t.title}
            {unreadCount > 0 && (
              <span className="text-sm font-normal px-2.5 py-1 rounded-full" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }}>
                {unreadCount} {t.unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
              style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }}
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">{t.markAllRead}</span>
            </button>
          )}
          <button
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
            className="text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t.refresh}</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={14} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        {(['all', 'urgent', 'suggestion', 'info'] as AlertType[]).map((type) => {
          const isActive = filterType === type
          const count = type === 'all' ? alerts.length : alerts.filter(a => a.type === type).length

          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
              style={
                isActive
                  ? { background: 'var(--color-primary)', color: 'var(--color-text-primary)' }
                  : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {type === 'all' ? t.filterAll : t.types[type]}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* LISTA DE ALERTAS */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 rounded-2xl shadow-2xl" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
            <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: 'var(--color-success)', opacity: 0.5 }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.emptyTitle}</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.emptyDesc}</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = getTypeConfig(alert.type, t)
            const Icon = config.icon

            return (
              <div
                key={alert.id}
                className="relative group flex flex-col sm:flex-row gap-4 p-4 md:p-5 rounded-xl transition-all duration-200"
                style={{
                  background: alert.is_read ? 'var(--color-bg-surface)' : 'var(--color-bg-elevated)',
                  border: `1px solid ${alert.is_read ? 'var(--color-border-subtle)' : config.style.border}`,
                  opacity: alert.is_read ? 0.6 : 1,
                  boxShadow: alert.is_read ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              >
                {/* Indicador de não lido */}
                {!alert.is_read && (
                  <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }} />
                  </div>
                )}

                {/* Ícone */}
                <div
                  className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
                  style={{ background: config.style.bg, color: config.style.color }}
                >
                  <Icon size={20} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: config.style.bg, color: config.style.color, border: `1px solid ${config.style.border}` }}
                    >
                      {config.badge}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {formatRelativeTime(alert.created_at, userLang)}
                    </span>
                  </div>

                  <h3 className="text-base md:text-lg font-bold leading-tight" style={{ color: alert.is_read ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
                    {alert.title}
                  </h3>

                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    {alert.description}
                  </p>

                  {/* Botão de Ação */}
                  {alert.action_link && alert.action_label && (
                    <div className="pt-2">
                      <Link
                        href={alert.action_link}
                        onClick={() => markAsRead(alert.id)}
                        className="inline-flex items-center gap-2 text-xs font-bold transition-all px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--color-bg-hover)', color: config.style.color }}
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
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      title={t.markRead}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
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
