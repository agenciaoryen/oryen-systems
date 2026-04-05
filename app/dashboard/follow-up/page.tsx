'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  RefreshCw,
  Loader2,
  UserCheck,
  UserX,
  Clock,
  Send,
  Pause,
  Play,
  Ban,
  MessageCircle,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Timer,
  Settings2,
  Save,
  ChevronRight
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface FollowUpItem {
  id: string
  org_id: string
  lead_id: string
  attempt_number: number
  max_attempts: number
  next_attempt_at: string | null
  last_attempt_at: string | null
  last_lead_message_at: string | null
  cadence_hours: number[]
  status: 'pending' | 'active' | 'responded' | 'exhausted' | 'cancelled'
  last_conversation_summary: string | null
  lead_stage: string | null
  instance_name: string
  created_at: string
  updated_at: string
  // joined
  lead?: { id: string; name: string | null; phone: string; stage: string | null }
}

interface Stats {
  total: number
  pending: number
  active: number
  responded: number
  exhausted: number
  cancelled: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Follow-up Automático',
    subtitle: 'Leads em reengajamento automático pelo agente de follow-up.',
    refresh: 'Atualizar',
    emptyTitle: 'Nenhum follow-up ativo',
    emptyDesc: 'Quando o agente SDR encerrar uma conversa, os leads entrarão automaticamente na fila de follow-up.',
    statsTotal: 'Total na fila',
    statsPending: 'Aguardando',
    statsActive: 'Em andamento',
    statsResponded: 'Responderam',
    statsExhausted: 'Esgotados',
    statsCancelled: 'Cancelados',
    filterAll: 'Todos',
    filterPending: 'Aguardando',
    filterActive: 'Ativos',
    filterResponded: 'Responderam',
    filterExhausted: 'Esgotados',
    attempt: 'Tentativa',
    of: 'de',
    nextAttempt: 'Próxima tentativa',
    lastAttempt: 'Última tentativa',
    lastMessage: 'Última msg do lead',
    summary: 'Resumo',
    stage: 'Estágio',
    cancel: 'Cancelar follow-up',
    viewLead: 'Ver lead',
    status: {
      pending: 'Aguardando',
      active: 'Ativo',
      responded: 'Respondeu',
      exhausted: 'Esgotado',
      cancelled: 'Cancelado'
    },
    settingsTitle: 'Configurações do Follow-up',
    settingsMaxAttempts: 'Máximo de tentativas',
    settingsCadence: 'Cadência (horas entre tentativas)',
    settingsSave: 'Salvar configurações',
    settingsSaved: 'Salvo!',
    successRate: 'Taxa de reengajamento',
    lockedDesc: 'Reengaje leads automaticamente com follow-ups inteligentes.',
  },
  en: {
    title: 'Automatic Follow-up',
    subtitle: 'Leads being automatically re-engaged by the follow-up agent.',
    refresh: 'Refresh',
    emptyTitle: 'No active follow-ups',
    emptyDesc: 'When the SDR agent ends a conversation, leads will automatically enter the follow-up queue.',
    statsTotal: 'Total in queue',
    statsPending: 'Pending',
    statsActive: 'In progress',
    statsResponded: 'Responded',
    statsExhausted: 'Exhausted',
    statsCancelled: 'Cancelled',
    filterAll: 'All',
    filterPending: 'Pending',
    filterActive: 'Active',
    filterResponded: 'Responded',
    filterExhausted: 'Exhausted',
    attempt: 'Attempt',
    of: 'of',
    nextAttempt: 'Next attempt',
    lastAttempt: 'Last attempt',
    lastMessage: 'Last lead message',
    summary: 'Summary',
    stage: 'Stage',
    cancel: 'Cancel follow-up',
    viewLead: 'View lead',
    status: {
      pending: 'Pending',
      active: 'Active',
      responded: 'Responded',
      exhausted: 'Exhausted',
      cancelled: 'Cancelled'
    },
    settingsTitle: 'Follow-up Settings',
    settingsMaxAttempts: 'Max attempts',
    settingsCadence: 'Cadence (hours between attempts)',
    settingsSave: 'Save settings',
    settingsSaved: 'Saved!',
    successRate: 'Re-engagement rate',
    lockedDesc: 'Automatically re-engage leads with smart follow-ups.',
  },
  es: {
    title: 'Follow-up Automático',
    subtitle: 'Leads en reenganche automático por el agente de follow-up.',
    refresh: 'Actualizar',
    emptyTitle: 'Sin follow-ups activos',
    emptyDesc: 'Cuando el agente SDR termine una conversación, los leads entrarán automáticamente en la cola de follow-up.',
    statsTotal: 'Total en cola',
    statsPending: 'Esperando',
    statsActive: 'En progreso',
    statsResponded: 'Respondieron',
    statsExhausted: 'Agotados',
    statsCancelled: 'Cancelados',
    filterAll: 'Todos',
    filterPending: 'Esperando',
    filterActive: 'Activos',
    filterResponded: 'Respondieron',
    filterExhausted: 'Agotados',
    attempt: 'Intento',
    of: 'de',
    nextAttempt: 'Próximo intento',
    lastAttempt: 'Último intento',
    lastMessage: 'Último msg del lead',
    summary: 'Resumen',
    stage: 'Etapa',
    cancel: 'Cancelar follow-up',
    viewLead: 'Ver lead',
    status: {
      pending: 'Esperando',
      active: 'Activo',
      responded: 'Respondió',
      exhausted: 'Agotado',
      cancelled: 'Cancelado'
    },
    settingsTitle: 'Configuración del Follow-up',
    settingsMaxAttempts: 'Máximo de intentos',
    settingsCadence: 'Cadencia (horas entre intentos)',
    settingsSave: 'Guardar configuración',
    settingsSaved: '¡Guardado!',
    successRate: 'Tasa de reenganche',
    lockedDesc: 'Reengancha leads automáticamente con follow-ups inteligentes.',
  }
}

type Language = keyof typeof TRANSLATIONS
type FilterStatus = 'all' | 'pending' | 'active' | 'responded' | 'exhausted'

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function FollowUpPage() {
  const { user } = useAuth()
  const orgId = useActiveOrgId()

  const lang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[lang]

  const [queue, setQueue] = useState<FollowUpItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, active: 0, responded: 0, exhausted: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ─── Fetch data ───
  const fetchData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)

    try {
      // Buscar todos os items da fila
      const { data, error } = await supabase
        .from('follow_up_queue')
        .select('*, lead:leads(id, name, phone, stage)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const items = (data || []) as FollowUpItem[]
      setQueue(items)

      // Calcular stats
      const s: Stats = { total: items.length, pending: 0, active: 0, responded: 0, exhausted: 0, cancelled: 0 }
      for (const item of items) {
        if (item.status in s) s[item.status as keyof Omit<Stats, 'total'>]++
      }
      setStats(s)
    } catch (err) {
      console.error('[FollowUp] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Realtime ───
  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel('follow_up_queue_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'follow_up_queue',
        filter: `org_id=eq.${orgId}`
      }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, fetchData])

  // ─── Cancel follow-up ───
  const handleCancel = async (id: string) => {
    await supabase
      .from('follow_up_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId!)

    fetchData()
  }

  // ─── Filtered queue ───
  const filteredQueue = filter === 'all' ? queue : queue.filter(i => i.status === filter)

  // ─── Success rate ───
  const totalFinished = stats.responded + stats.exhausted
  const successRate = totalFinished > 0 ? Math.round((stats.responded / totalFinished) * 100) : 0

  if (!orgId) return null

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t.refresh}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Users} label={t.statsTotal} value={stats.total} color="text-white" bg="bg-white/5" />
          <StatCard icon={Clock} label={t.statsPending} value={stats.pending} color="text-yellow-400" bg="bg-yellow-500/10" />
          <StatCard icon={Send} label={t.statsActive} value={stats.active} color="text-blue-400" bg="bg-blue-500/10" />
          <StatCard icon={UserCheck} label={t.statsResponded} value={stats.responded} color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard icon={UserX} label={t.statsExhausted} value={stats.exhausted} color="text-rose-400" bg="bg-rose-500/10" />
          <StatCard icon={Ban} label={t.statsCancelled} value={stats.cancelled} color="text-gray-400" bg="bg-white/5" />
        </div>

        {/* Success Rate Bar */}
        {totalFinished > 0 && (
          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <span className="text-sm font-medium text-gray-300">{t.successRate}</span>
              </div>
              <span className="text-lg font-bold text-white">{successRate}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${successRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.responded} {t.statsResponded.toLowerCase()} / {totalFinished} {t.statsTotal.toLowerCase().replace('total na fila', 'finalizados')}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {([
            { key: 'all', label: t.filterAll, count: stats.total },
            { key: 'pending', label: t.filterPending, count: stats.pending },
            { key: 'active', label: t.filterActive, count: stats.active },
            { key: 'responded', label: t.filterResponded, count: stats.responded },
            { key: 'exhausted', label: t.filterExhausted, count: stats.exhausted },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
                filter === f.key
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-200 border border-white/5 hover:bg-white/5'
              }`}
            >
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === f.key ? 'bg-blue-500/30 text-blue-300' : 'bg-white/5 text-gray-500'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Queue List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-300">{t.emptyTitle}</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{t.emptyDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredQueue.map(item => (
              <FollowUpCard
                key={item.id}
                item={item}
                t={t}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onCancel={() => handleCancel(item.id)}
              />
            ))}
          </div>
        )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: number; color: string; bg: string
}) {
  return (
    <div className={`${bg} border border-white/5 rounded-xl p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className={color} />
        <span className="text-xs text-gray-500 truncate">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP CARD
// ═══════════════════════════════════════════════════════════════════════════════

function FollowUpCard({ item, t, expanded, onToggle, onCancel }: {
  item: FollowUpItem
  t: typeof TRANSLATIONS['pt']
  expanded: boolean
  onToggle: () => void
  onCancel: () => void
}) {
  const lead = item.lead as any
  const leadName = lead?.name || lead?.phone || '—'
  const leadPhone = lead?.phone || ''

  const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
    active: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Send },
    responded: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    exhausted: { color: 'text-rose-400', bg: 'bg-rose-500/10', icon: XCircle },
    cancelled: { color: 'text-gray-400', bg: 'bg-white/5', icon: Ban },
  }

  const sc = statusConfig[item.status] || statusConfig.pending
  const StatusIcon = sc.icon

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    const date = new Date(d)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffH = Math.round(diffMs / (1000 * 60 * 60))

    if (diffMs > 0 && diffH < 48) {
      if (diffH < 1) return `${Math.max(1, Math.round(diffMs / (1000 * 60)))}min`
      return `${diffH}h`
    }

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const progressPercent = item.max_attempts > 0
    ? Math.round((item.attempt_number / item.max_attempts) * 100)
    : 0

  return (
    <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Status icon */}
        <div className={`w-9 h-9 rounded-lg ${sc.bg} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon size={16} className={sc.color} />
        </div>

        {/* Lead info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{leadName}</span>
            {leadPhone && (
              <span className="text-xs text-gray-600">{leadPhone}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
              {t.status[item.status]}
            </span>
            <span className="text-xs text-gray-500">
              {t.attempt} {item.attempt_number}/{item.max_attempts}
            </span>
            {item.next_attempt_at && ['pending', 'active'].includes(item.status) && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Timer size={10} />
                {formatDate(item.next_attempt_at)}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-20 flex-shrink-0 hidden sm:block">
          <div className="w-full bg-white/5 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                item.status === 'responded' ? 'bg-emerald-500' :
                item.status === 'exhausted' ? 'bg-rose-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ChevronRight size={16} className={`text-gray-600 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-3 bg-white/[0.01]">
          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-600 block">{t.nextAttempt}</span>
              <span className="text-gray-300">{formatDate(item.next_attempt_at)}</span>
            </div>
            <div>
              <span className="text-gray-600 block">{t.lastAttempt}</span>
              <span className="text-gray-300">{formatDate(item.last_attempt_at)}</span>
            </div>
            <div>
              <span className="text-gray-600 block">{t.lastMessage}</span>
              <span className="text-gray-300">{formatDate(item.last_lead_message_at)}</span>
            </div>
            <div>
              <span className="text-gray-600 block">{t.stage}</span>
              <span className="text-gray-300">{item.lead_stage || '—'}</span>
            </div>
          </div>

          {/* Summary */}
          {item.last_conversation_summary && (
            <div className="text-xs">
              <span className="text-gray-600 block mb-1">{t.summary}</span>
              <p className="text-gray-400 leading-relaxed">{item.last_conversation_summary}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {lead?.id && (
              <Link
                href={`/dashboard/crm/${lead.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-lg hover:bg-blue-500/10 transition-colors"
              >
                <Users size={12} />
                {t.viewLead}
              </Link>
            )}
            {['pending', 'active'].includes(item.status) && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel() }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                <Ban size={12} />
                {t.cancel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
