// @ts-nocheck
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
  Trash2 
} from 'lucide-react'

// --- TRADUÇÃO DA INTERFACE (ELEMENTOS ESTÁTICOS) ---
const TRANSLATIONS = {
  pt: {
    title: 'Central de Alertas',
    subtitle: 'Prioridades e sugestões inteligentes para o seu dia.',
    refresh: 'Atualizar Lista',
    emptyTitle: 'Tudo Limpo!',
    emptyDesc: 'Você não tem alertas pendentes por enquanto.',
    confirmDelete: 'Excluir este alerta?',
    markRead: 'Marcar como lido',
    delete: 'Excluir alerta',
    types: { 
      urgent: 'Urgente', 
      suggestion: 'Sugestão IA', 
      info: 'Informativo' 
    }
  },
  en: {
    title: 'Alerts Center',
    subtitle: 'Priorities and smart suggestions for your day.',
    refresh: 'Refresh List',
    emptyTitle: 'All Clear!',
    emptyDesc: 'You have no pending alerts for now.',
    confirmDelete: 'Delete this alert?',
    markRead: 'Mark as read',
    delete: 'Delete alert',
    types: { 
      urgent: 'Urgent', 
      suggestion: 'AI Suggestion', 
      info: 'Info' 
    }
  },
  es: {
    title: 'Centro de Alertas',
    subtitle: 'Prioridades y sugerencias inteligentes para su día.',
    refresh: 'Actualizar Lista',
    emptyTitle: '¡Todo Limpio!',
    emptyDesc: 'No tiene alertas pendientes por ahora.',
    confirmDelete: '¿Eliminar esta alerta?',
    markRead: 'Marcar como leído',
    delete: 'Eliminar alerta',
    types: { 
      urgent: 'Urgente', 
      suggestion: 'Sugerencia IA', 
      info: 'Informativo' 
    }
  }
}

interface Alert {
  id: string
  type: 'urgent' | 'suggestion' | 'info'
  title: string
  description: string
  action_link: string | null
  action_label: string
  is_read: boolean
  created_at: string
}

// Função de segurança para evitar falhas de "Invalid Date"
const parseDateSafe = (dateValue: any) => {
  try {
    if (!dateValue) return new Date()
    const d = new Date(dateValue)
    return isNaN(d.getTime()) ? new Date() : d
  } catch (e) {
    return new Date()
  }
}

export default function AlertsPage() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  // Configurações de Localização (bypassing strict typing with 'any')
  const userLang = ((user as any)?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]

  const fetchAlerts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAlerts(data as Alert[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return

    fetchAlerts()

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

  async function markAsRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
  }

  async function deleteAlert(id: string) {
    if (!confirm(t.confirmDelete)) return
    setAlerts(prev => prev.filter(a => a.id !== id))
    await supabase.from('alerts').delete().eq('id', id)
  }

  const typeConfig = {
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

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t.title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {t.subtitle}
          </p>
        </div>
        <button 
          onClick={fetchAlerts} 
          className="text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 w-fit"
        >
          <Clock size={14} /> {t.refresh}
        </button>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-2xl bg-[#0A0A0A] shadow-2xl">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500/50 mb-4" />
            <h3 className="text-lg font-bold text-white">{t.emptyTitle}</h3>
            <p className="text-gray-500 text-sm">{t.emptyDesc}</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = typeConfig[alert.type] || typeConfig.info
            const Icon = config.icon

            return (
              <div 
                key={alert.id} 
                className={`relative group flex flex-col md:flex-row gap-6 p-6 rounded-2xl border transition-all duration-300 ${
                  alert.is_read 
                    ? 'bg-[#0A0A0A] border-white/5 opacity-60 hover:opacity-100' 
                    : `bg-[#111] ${config.border} shadow-lg shadow-black/40`
                }`}
              >
                {/* Ícone Lateral */}
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${config.bg} ${config.color}`}>
                  <Icon size={24} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${config.bg} ${config.color} ${config.border}`}>
                      {config.badge}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {parseDateSafe(alert.created_at).toLocaleDateString(userLang, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <h3 className={`text-lg font-bold ${alert.is_read ? 'text-gray-400' : 'text-white'}`}>
                    {alert.title}
                  </h3>
                  
                  <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
                    {alert.description}
                  </p>

                  {/* Botão de Ação */}
                  {alert.action_link && (
                    <div className="pt-3">
                      <Link 
                        href={alert.action_link}
                        onClick={() => markAsRead(alert.id)}
                        className={`inline-flex items-center gap-2 text-xs font-bold transition-all px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 ${config.color} hover:text-white`}
                      >
                        {alert.action_label} <ExternalLink size={14} />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Ações de Gestão */}
                <div className="flex md:flex-col gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity justify-end md:justify-start mt-4 md:mt-0">
                   {!alert.is_read && (
                     <button 
                       onClick={() => markAsRead(alert.id)}
                       className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                       title={t.markRead}
                     >
                       <CheckCircle2 size={18} />
                     </button>
                   )}
                   <button 
                     onClick={() => deleteAlert(alert.id)}
                     className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                     title={t.delete}
                   >
                     <Trash2 size={18} />
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