'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { formatLeadName } from '@/lib/format/leadName'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  RefreshCw,
  Loader2,
  UserCheck,
  UserX,
  Clock,
  Send,
  Ban,
  MessageCircle,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Timer,
  ChevronRight,
  Plus,
  X,
  Search,
  Zap,
  AlertTriangle,
  Rocket,
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

interface PreviewLead {
  id: string
  name: string | null
  phone: string
  stage: string | null
  source: string | null
  lastContact: string
}

interface QuotaInfo {
  used: number
  limit: number
  remaining: number
  plan: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Follow-up Automático',
    subtitle: 'Reengajamento automático de leads que pararam de responder.',
    refresh: 'Atualizar',
    emptyTitle: 'Nenhum follow-up ativo',
    emptyDesc: 'Leads que pararem de responder ao agente SDR entrarão automaticamente na fila. Você também pode criar campanhas manuais.',
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
    nextAttempt: 'Próxima tentativa',
    lastAttempt: 'Última tentativa',
    lastMessage: 'Última msg do lead',
    summary: 'Resumo',
    stage: 'Estágio',
    cancel: 'Cancelar',
    viewLead: 'Ver lead',
    status: {
      pending: 'Aguardando',
      active: 'Ativo',
      responded: 'Respondeu',
      exhausted: 'Esgotado',
      cancelled: 'Cancelado'
    },
    successRate: 'Taxa de reengajamento',
    // Campaign
    newCampaign: 'Nova campanha',
    campaignTitle: 'Campanha de Follow-up',
    campaignDesc: 'Selecione os filtros para encontrar leads e disparar follow-ups personalizados.',
    filterByStage: 'Filtrar por estágio',
    filterBySource: 'Filtrar por fonte',
    lastContactFrom: 'Último contato de',
    lastContactTo: 'até',
    daysAgo: 'dias atrás',
    onlyWithConversation: 'Apenas leads que tiveram conversa com SDR',
    preview: 'Buscar leads',
    previewResults: 'leads encontrados',
    noLeadsFound: 'Nenhum lead encontrado com esses filtros.',
    attempts: 'Tentativas por lead',
    cadenceLabel: 'Cadência entre tentativas',
    cadence1h: '1h',
    cadence4h: '4h',
    cadence24h: '1 dia',
    cadence72h: '3 dias',
    cadence120h: '5 dias',
    cadence168h: '7 dias',
    instance: 'Instância WhatsApp',
    dispatch: 'Disparar follow-up',
    dispatching: 'Disparando...',
    dispatched: 'follow-ups criados',
    skipped: 'já na fila',
    quotaTitle: 'Cota de mensagens IA',
    quotaUsed: 'usadas',
    quotaRemaining: 'restantes',
    quotaUnlimited: 'Ilimitado',
    quotaEstimate: 'Esta campanha usará até',
    quotaMessages: 'mensagens',
    quotaExceeded: 'Cota insuficiente para esta campanha',
    close: 'Fechar',
    selectAll: 'Todos',
    leadName: 'Nome',
    leadPhone: 'Telefone',
    leadStage: 'Estágio',
    leadSource: 'Fonte',
    leadLastContact: 'Último contato',
  },
  en: {
    title: 'Automatic Follow-up',
    subtitle: 'Automatic re-engagement of leads that stopped responding.',
    refresh: 'Refresh',
    emptyTitle: 'No active follow-ups',
    emptyDesc: 'Leads that stop responding to the SDR agent will automatically enter the queue. You can also create manual campaigns.',
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
    nextAttempt: 'Next attempt',
    lastAttempt: 'Last attempt',
    lastMessage: 'Last lead message',
    summary: 'Summary',
    stage: 'Stage',
    cancel: 'Cancel',
    viewLead: 'View lead',
    status: {
      pending: 'Pending',
      active: 'Active',
      responded: 'Responded',
      exhausted: 'Exhausted',
      cancelled: 'Cancelled'
    },
    successRate: 'Re-engagement rate',
    newCampaign: 'New campaign',
    campaignTitle: 'Follow-up Campaign',
    campaignDesc: 'Select filters to find leads and send personalized follow-ups.',
    filterByStage: 'Filter by stage',
    filterBySource: 'Filter by source',
    lastContactFrom: 'Last contact from',
    lastContactTo: 'to',
    daysAgo: 'days ago',
    onlyWithConversation: 'Only leads that had SDR conversation',
    preview: 'Find leads',
    previewResults: 'leads found',
    noLeadsFound: 'No leads found with these filters.',
    attempts: 'Attempts per lead',
    cadenceLabel: 'Cadence between attempts',
    cadence1h: '1h',
    cadence4h: '4h',
    cadence24h: '1 day',
    cadence72h: '3 days',
    cadence120h: '5 days',
    cadence168h: '7 days',
    instance: 'WhatsApp instance',
    dispatch: 'Send follow-up',
    dispatching: 'Sending...',
    dispatched: 'follow-ups created',
    skipped: 'already in queue',
    quotaTitle: 'AI message quota',
    quotaUsed: 'used',
    quotaRemaining: 'remaining',
    quotaUnlimited: 'Unlimited',
    quotaEstimate: 'This campaign will use up to',
    quotaMessages: 'messages',
    quotaExceeded: 'Insufficient quota for this campaign',
    close: 'Close',
    selectAll: 'All',
    leadName: 'Name',
    leadPhone: 'Phone',
    leadStage: 'Stage',
    leadSource: 'Source',
    leadLastContact: 'Last contact',
  },
  es: {
    title: 'Follow-up Automático',
    subtitle: 'Reenganche automático de leads que dejaron de responder.',
    refresh: 'Actualizar',
    emptyTitle: 'Sin follow-ups activos',
    emptyDesc: 'Los leads que dejen de responder al agente SDR entrarán en la cola automáticamente. También puedes crear campañas manuales.',
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
    nextAttempt: 'Próximo intento',
    lastAttempt: 'Último intento',
    lastMessage: 'Último msg del lead',
    summary: 'Resumen',
    stage: 'Etapa',
    cancel: 'Cancelar',
    viewLead: 'Ver lead',
    status: {
      pending: 'Esperando',
      active: 'Activo',
      responded: 'Respondió',
      exhausted: 'Agotado',
      cancelled: 'Cancelado'
    },
    successRate: 'Tasa de reenganche',
    newCampaign: 'Nueva campaña',
    campaignTitle: 'Campaña de Follow-up',
    campaignDesc: 'Selecciona filtros para encontrar leads y enviar follow-ups personalizados.',
    filterByStage: 'Filtrar por etapa',
    filterBySource: 'Filtrar por fuente',
    lastContactFrom: 'Último contacto de',
    lastContactTo: 'hasta',
    daysAgo: 'días atrás',
    onlyWithConversation: 'Solo leads que tuvieron conversación con SDR',
    preview: 'Buscar leads',
    previewResults: 'leads encontrados',
    noLeadsFound: 'Ningún lead encontrado con estos filtros.',
    attempts: 'Intentos por lead',
    cadenceLabel: 'Cadencia entre intentos',
    cadence1h: '1h',
    cadence4h: '4h',
    cadence24h: '1 día',
    cadence72h: '3 días',
    cadence120h: '5 días',
    cadence168h: '7 días',
    instance: 'Instancia WhatsApp',
    dispatch: 'Enviar follow-up',
    dispatching: 'Enviando...',
    dispatched: 'follow-ups creados',
    skipped: 'ya en cola',
    quotaTitle: 'Cuota de mensajes IA',
    quotaUsed: 'usados',
    quotaRemaining: 'restantes',
    quotaUnlimited: 'Ilimitado',
    quotaEstimate: 'Esta campaña usará hasta',
    quotaMessages: 'mensajes',
    quotaExceeded: 'Cuota insuficiente para esta campaña',
    close: 'Cerrar',
    selectAll: 'Todos',
    leadName: 'Nombre',
    leadPhone: 'Teléfono',
    leadStage: 'Etapa',
    leadSource: 'Fuente',
    leadLastContact: 'Último contacto',
  }
}

type Language = keyof typeof TRANSLATIONS
type FilterStatus = 'all' | 'pending' | 'active' | 'responded' | 'exhausted'

// Source labels
const SOURCE_LABELS: Record<string, Record<string, string>> = {
  pt: { site: 'Site', csv_import: 'Importação CSV', whatsapp_inbound: 'WhatsApp', manual: 'Manual', facebook: 'Facebook', instagram: 'Instagram', google: 'Google', referral: 'Indicação', api: 'API', landing_page: 'Landing Page', email: 'E-mail', phone: 'Telefone', other: 'Outro' },
  en: { site: 'Website', csv_import: 'CSV Import', whatsapp_inbound: 'WhatsApp', manual: 'Manual', facebook: 'Facebook', instagram: 'Instagram', google: 'Google', referral: 'Referral', api: 'API', landing_page: 'Landing Page', email: 'Email', phone: 'Phone', other: 'Other' },
  es: { site: 'Sitio Web', csv_import: 'Importación CSV', whatsapp_inbound: 'WhatsApp', manual: 'Manual', facebook: 'Facebook', instagram: 'Instagram', google: 'Google', referral: 'Referencia', api: 'API', landing_page: 'Landing Page', email: 'Correo', phone: 'Teléfono', other: 'Otro' },
}

function friendlySource(source: string | null, lang: string): string {
  if (!source) return '—'
  return SOURCE_LABELS[lang]?.[source] || source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function FollowUpPage() {
  const { user, activeOrg } = useAuth()
  const orgId = useActiveOrgId()
  const lang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[lang]

  const [queue, setQueue] = useState<FollowUpItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, active: 0, responded: 0, exhausted: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCampaign, setShowCampaign] = useState(false)

  // ─── Fetch data ───
  const fetchData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('follow_up_queue')
        .select('*, lead:leads(id, name, nome_empresa, phone, stage)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      const items = (data || []) as FollowUpItem[]
      setQueue(items)

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_up_queue', filter: `org_id=eq.${orgId}` }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orgId, fetchData])

  const handleCancel = async (id: string) => {
    await supabase.from('follow_up_queue').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('org_id', orgId!)
    fetchData()
  }

  const filteredQueue = filter === 'all' ? queue : queue.filter(i => i.status === filter)
  const totalFinished = stats.responded + stats.exhausted
  const successRate = totalFinished > 0 ? Math.round((stats.responded / totalFinished) * 100) : 0

  if (!orgId) return null

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <Zap size={26} style={{ color: 'var(--color-primary)' }} />
            {t.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCampaign(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} />
            {t.newCampaign}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-subtle)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t.refresh}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label={t.statsTotal} value={stats.total} colorVar="var(--color-text-primary)" bgVar="var(--color-bg-hover)" />
        <StatCard icon={Clock} label={t.statsPending} value={stats.pending} colorVar="var(--color-accent)" bgVar="var(--color-accent-subtle)" />
        <StatCard icon={Send} label={t.statsActive} value={stats.active} colorVar="var(--color-primary)" bgVar="var(--color-primary-subtle)" />
        <StatCard icon={UserCheck} label={t.statsResponded} value={stats.responded} colorVar="var(--color-success)" bgVar="var(--color-success-subtle)" />
        <StatCard icon={UserX} label={t.statsExhausted} value={stats.exhausted} colorVar="var(--color-error)" bgVar="var(--color-error-subtle)" />
        <StatCard icon={Ban} label={t.statsCancelled} value={stats.cancelled} colorVar="var(--color-text-tertiary)" bgVar="var(--color-bg-hover)" />
      </div>

      {/* Success Rate Bar */}
      {totalFinished > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.successRate}</span>
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{successRate}%</span>
          </div>
          <div className="w-full rounded-full h-2.5" style={{ background: 'var(--color-bg-hover)' }}>
            <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${successRate}%`, background: 'var(--color-success)' }} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {stats.responded} {t.statsResponded.toLowerCase()} / {totalFinished} finalizados
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { key: 'all' as const, label: t.filterAll, count: stats.total },
          { key: 'pending' as const, label: t.filterPending, count: stats.pending },
          { key: 'active' as const, label: t.filterActive, count: stats.active },
          { key: 'responded' as const, label: t.filterResponded, count: stats.responded },
          { key: 'exhausted' as const, label: t.filterExhausted, count: stats.exhausted },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap"
            style={filter === f.key
              ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-subtle)' }
              : { color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-subtle)' }
            }
          >
            {f.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={filter === f.key
                ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }
              }
            >{f.count}</span>
          </button>
        ))}
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.emptyTitle}</h3>
          <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: 'var(--color-text-muted)' }}>{t.emptyDesc}</p>
          <button
            onClick={() => setShowCampaign(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} />
            {t.newCampaign}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredQueue.map(item => (
            <FollowUpCard key={item.id} item={item} t={t} expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onCancel={() => handleCancel(item.id)}
              orgNiche={(activeOrg as any)?.niche}
              lang={((user as any)?.language as 'pt' | 'en' | 'es') || 'pt'}
            />
          ))}
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaign && (
        <CampaignModal
          orgId={orgId}
          lang={lang}
          t={t}
          onClose={() => setShowCampaign(false)}
          onDispatched={() => { setShowCampaign(false); fetchData() }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function CampaignModal({ orgId, lang, t, onClose, onDispatched }: {
  orgId: string
  lang: string
  t: typeof TRANSLATIONS['pt']
  onClose: () => void
  onDispatched: () => void
}) {
  // Pipeline stages
  const [stages, setStages] = useState<{ name: string; label: string }[]>([])
  const [instances, setInstances] = useState<{ instance_name: string; display_name: string | null; agent_id: string | null; campaign_id: string | null }[]>([])

  // Filters
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [daysMin, setDaysMin] = useState<number>(7)
  const [daysMax, setDaysMax] = useState<number>(90)
  const [hasConversation, setHasConversation] = useState(false)

  // Config
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [selectedInstance, setSelectedInstance] = useState('')

  // Preview
  const [previewing, setPreviewing] = useState(false)
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[] | null>(null)
  const [leadCount, setLeadCount] = useState(0)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)

  // Dispatch
  const [dispatching, setDispatching] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<{ dispatched: number; skipped: number } | null>(null)

  const SOURCES = ['site', 'csv_import', 'whatsapp_inbound', 'manual', 'facebook', 'instagram', 'google', 'referral', 'landing_page']

  // Load stages + instances
  useEffect(() => {
    const load = async () => {
      const [stagesRes, instancesRes] = await Promise.all([
        supabase.from('pipeline_stages').select('name, label').eq('org_id', orgId).eq('is_active', true).order('position'),
        supabase.from('whatsapp_instances').select('instance_name, display_name, agent_id, campaign_id').eq('org_id', orgId).eq('status', 'connected'),
      ])
      setStages(stagesRes.data || [])
      const inst = instancesRes.data || []
      setInstances(inst)
      if (inst.length === 1) setSelectedInstance(inst[0].instance_name)
    }
    load()
  }, [orgId])

  // Preview
  const handlePreview = async () => {
    setPreviewing(true)
    setPreviewLeads(null)
    setDispatchResult(null)
    try {
      const res = await fetch('/api/follow-up/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          org_id: orgId,
          filters: {
            stages: selectedStages.length > 0 ? selectedStages : undefined,
            sources: selectedSources.length > 0 ? selectedSources : undefined,
            lastContactDaysMin: daysMin,
            lastContactDaysMax: daysMax,
            hasConversation,
          }
        })
      })
      const data = await res.json()
      setLeadCount(data.leadCount || 0)
      setPreviewLeads(data.leads || [])
      setQuota(data.quota || null)
    } catch (err) {
      console.error('[Campaign] Preview error:', err)
    } finally {
      setPreviewing(false)
    }
  }

  // Dispatch
  const handleDispatch = async () => {
    if (!selectedInstance) return
    setDispatching(true)
    try {
      const inst = instances.find(i => i.instance_name === selectedInstance)
      const res = await fetch('/api/follow-up/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          org_id: orgId,
          filters: {
            stages: selectedStages.length > 0 ? selectedStages : undefined,
            sources: selectedSources.length > 0 ? selectedSources : undefined,
            lastContactDaysMin: daysMin,
            lastContactDaysMax: daysMax,
            hasConversation,
          },
          config: {
            maxAttempts,
            cadenceHours: [4, 24, 72, 120, 168].slice(0, maxAttempts),
            instanceName: selectedInstance,
            agentId: inst?.agent_id || undefined,
            campaignId: inst?.campaign_id || undefined,
          }
        })
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error === 'quota_exceeded' ? t.quotaExceeded : data.error)
      } else {
        setDispatchResult({ dispatched: data.dispatched, skipped: data.skipped })
        setTimeout(() => onDispatched(), 2000)
      }
    } catch (err) {
      console.error('[Campaign] Dispatch error:', err)
    } finally {
      setDispatching(false)
    }
  }

  const estimatedMessages = leadCount * maxAttempts
  const quotaOk = quota ? (quota.limit === -1 || quota.remaining >= estimatedMessages) : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Rocket size={20} style={{ color: 'var(--color-primary)' }} />
              {t.campaignTitle}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.campaignDesc}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Filters */}
          <div className="space-y-4">

            {/* Stage filter */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>{t.filterByStage}</label>
              <div className="flex flex-wrap gap-2">
                {stages.map(s => (
                  <button key={s.name} onClick={() => {
                    setSelectedStages(prev => prev.includes(s.name) ? prev.filter(x => x !== s.name) : [...prev, s.name])
                  }}
                    className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                    style={selectedStages.includes(s.name)
                      ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-subtle)' }
                      : { color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-subtle)' }
                    }
                  >{s.label}</button>
                ))}
                {stages.length === 0 && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>}
              </div>
            </div>

            {/* Source filter */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>{t.filterBySource}</label>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map(s => (
                  <button key={s} onClick={() => {
                    setSelectedSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
                  }}
                    className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                    style={selectedSources.includes(s)
                      ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-subtle)' }
                      : { color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-subtle)' }
                    }
                  >{friendlySource(s, lang)}</button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>{t.lastContactFrom}</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={365} value={daysMin}
                    onChange={e => setDaysMin(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1.5 text-sm rounded-lg text-center"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.lastContactTo}</span>
                  <input type="number" min={1} max={365} value={daysMax}
                    onChange={e => setDaysMax(parseInt(e.target.value) || 90)}
                    className="w-16 px-2 py-1.5 text-sm rounded-lg text-center"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.daysAgo}</span>
                </div>
              </div>
            </div>

            {/* Has conversation */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasConversation} onChange={e => setHasConversation(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t.onlyWithConversation}</span>
            </label>
          </div>

          {/* Preview button */}
          <button onClick={handlePreview} disabled={previewing}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
          >
            {previewing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {t.preview}
          </button>

          {/* Preview results */}
          {previewLeads !== null && (
            <div className="space-y-4">
              {/* Lead count + quota */}
              <div className="flex items-center justify-between rounded-xl p-4" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <div>
                  <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{leadCount}</span>
                  <span className="text-sm ml-2" style={{ color: 'var(--color-text-muted)' }}>{t.previewResults}</span>
                </div>
                {quota && (
                  <div className="text-right">
                    <div className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.quotaTitle}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {quota.limit === -1
                        ? t.quotaUnlimited
                        : `${quota.used} ${t.quotaUsed} / ${quota.limit} (${quota.remaining} ${t.quotaRemaining})`
                      }
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {t.quotaEstimate} <strong style={{ color: 'var(--color-primary)' }}>{estimatedMessages}</strong> {t.quotaMessages}
                    </div>
                  </div>
                )}
              </div>

              {/* Quota warning */}
              {quota && !quotaOk && (
                <div className="flex items-center gap-2 rounded-lg p-3 text-xs"
                  style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error-subtle)' }}>
                  <AlertTriangle size={14} />
                  {t.quotaExceeded}
                </div>
              )}

              {leadCount === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>{t.noLeadsFound}</p>
              ) : (
                <>
                  {/* Sample leads table */}
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: 'var(--color-bg-elevated)' }}>
                            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{t.leadName}</th>
                            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{t.leadPhone}</th>
                            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{t.leadStage}</th>
                            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{t.leadSource}</th>
                            <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{t.leadLastContact}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewLeads.map(l => (
                            <tr key={l.id} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                              <td className="px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>{l.name || '—'}</td>
                              <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{l.phone}</td>
                              <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{l.stage || '—'}</td>
                              <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{friendlySource(l.source, lang)}</td>
                              <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{new Date(l.lastContact).toLocaleDateString('pt-BR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {leadCount > 20 && (
                      <div className="px-3 py-2 text-xs text-center" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)' }}>
                        +{leadCount - 20} leads
                      </div>
                    )}
                  </div>

                  {/* Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Attempts */}
                    <div>
                      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>{t.attempts}</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setMaxAttempts(n)}
                            className="w-10 h-10 rounded-lg text-sm font-medium transition-colors"
                            style={maxAttempts === n
                              ? { background: 'var(--color-primary)', color: '#fff' }
                              : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }
                            }
                          >{n}</button>
                        ))}
                      </div>
                    </div>

                    {/* Instance */}
                    <div>
                      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>{t.instance}</label>
                      <select value={selectedInstance} onChange={e => setSelectedInstance(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-lg"
                        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        <option value="">—</option>
                        {instances.map(i => (
                          <option key={i.instance_name} value={i.instance_name}>
                            {i.display_name || i.instance_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dispatch button */}
                  {dispatchResult ? (
                    <div className="flex items-center gap-2 justify-center rounded-xl p-4"
                      style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                        {dispatchResult.dispatched} {t.dispatched}
                        {dispatchResult.skipped > 0 && ` (${dispatchResult.skipped} ${t.skipped})`}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleDispatch}
                      disabled={dispatching || !selectedInstance || leadCount === 0 || !quotaOk}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                      style={{ background: 'var(--color-primary)', color: '#fff' }}
                    >
                      {dispatching ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                      {dispatching ? t.dispatching : `${t.dispatch} (${leadCount} leads × ${maxAttempts} = ${estimatedMessages} ${t.quotaMessages})`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, colorVar, bgVar }: {
  icon: any; label: string; value: number; colorVar: string; bgVar: string
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: bgVar, border: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: colorVar }} />
        <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <span className="text-2xl font-bold" style={{ color: colorVar }}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP CARD
// ═══════════════════════════════════════════════════════════════════════════════

function FollowUpCard({ item, t, expanded, onToggle, onCancel, orgNiche, lang }: {
  item: FollowUpItem
  t: typeof TRANSLATIONS['pt']
  expanded: boolean
  onToggle: () => void
  onCancel: () => void
  orgNiche?: string | null
  lang?: 'pt' | 'en' | 'es'
}) {
  const lead = item.lead as any
  const leadName = formatLeadName(lead, orgNiche, { lang })
  const leadPhone = lead?.phone || ''

  const statusConfig: Record<string, { colorVar: string; bgVar: string; icon: any }> = {
    pending: { colorVar: 'var(--color-accent)', bgVar: 'var(--color-accent-subtle)', icon: Clock },
    active: { colorVar: 'var(--color-primary)', bgVar: 'var(--color-primary-subtle)', icon: Send },
    responded: { colorVar: 'var(--color-success)', bgVar: 'var(--color-success-subtle)', icon: CheckCircle2 },
    exhausted: { colorVar: 'var(--color-error)', bgVar: 'var(--color-error-subtle)', icon: XCircle },
    cancelled: { colorVar: 'var(--color-text-tertiary)', bgVar: 'var(--color-bg-hover)', icon: Ban },
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

  const progressPercent = item.max_attempts > 0 ? Math.round((item.attempt_number / item.max_attempts) * 100) : 0

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 text-left transition-colors">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: sc.bgVar }}>
          <StatusIcon size={16} style={{ color: sc.colorVar }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{leadName}</span>
            {leadPhone && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{leadPhone}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sc.bgVar, color: sc.colorVar }}>{t.status[item.status]}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.attempt} {item.attempt_number}/{item.max_attempts}</span>
            {item.next_attempt_at && ['pending', 'active'].includes(item.status) && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                <Timer size={10} />{formatDate(item.next_attempt_at)}
              </span>
            )}
          </div>
        </div>
        <div className="w-20 flex-shrink-0 hidden sm:block">
          <div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-bg-hover)' }}>
            <div className="h-1.5 rounded-full transition-all" style={{
              width: `${progressPercent}%`,
              background: item.status === 'responded' ? 'var(--color-success)' : item.status === 'exhausted' ? 'var(--color-error)' : 'var(--color-primary)'
            }} />
          </div>
        </div>
        <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-3" style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="block" style={{ color: 'var(--color-text-muted)' }}>{t.nextAttempt}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{formatDate(item.next_attempt_at)}</span>
            </div>
            <div>
              <span className="block" style={{ color: 'var(--color-text-muted)' }}>{t.lastAttempt}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{formatDate(item.last_attempt_at)}</span>
            </div>
            <div>
              <span className="block" style={{ color: 'var(--color-text-muted)' }}>{t.lastMessage}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{formatDate(item.last_lead_message_at)}</span>
            </div>
            <div>
              <span className="block" style={{ color: 'var(--color-text-muted)' }}>{t.stage}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{item.lead_stage || '—'}</span>
            </div>
          </div>
          {item.last_conversation_summary && (
            <div className="text-xs">
              <span className="block mb-1" style={{ color: 'var(--color-text-muted)' }}>{t.summary}</span>
              <p className="leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>{item.last_conversation_summary}</p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            {lead?.id && (
              <Link href={`/dashboard/crm/${lead.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--color-primary)', border: '1px solid var(--color-primary-subtle)' }}>
                <Users size={12} />{t.viewLead}
              </Link>
            )}
            {['pending', 'active'].includes(item.status) && (
              <button onClick={(e) => { e.stopPropagation(); onCancel() }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--color-error)', border: '1px solid var(--color-error-subtle)' }}>
                <Ban size={12} />{t.cancel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
