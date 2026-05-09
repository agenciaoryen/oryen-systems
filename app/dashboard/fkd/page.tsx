'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatLeadName } from '@/lib/format/leadName'
import { formatPrice } from '@/lib/format'
import {
  Rocket, Heart, CheckCircle2, Loader2, ArrowRight,
  AlertTriangle, Calendar, Clock, FileText, DollarSign,
  MessageSquare, Users, Zap
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  pt: {
    title: 'Rotina Diária',
    subtitle: 'Sistema operacional do corretor — Finder · Keeper · Doer',
    finder: 'Prospecção',
    keeper: 'Relacionamento',
    doer: 'Execução',
    finderDesc: 'Prospecção e novos negócios',
    keeperDesc: 'Nutrição de relacionamento',
    doerDesc: 'Execução e fechamento',
    loading: 'Carregando...',
    // Finder
    tasksPending: 'tasks pendentes',
    tasksDoneToday: 'feitas hoje',
    sequencesActive: 'sequências ativas',
    openProspection: 'Abrir prospecção completa',
    noProspectionAccess: 'Prospecção disponível para agências de IA. Convide leads manualmente pelo CRM.',
    // Keeper
    followUps: 'Follow-ups pendentes',
    noResponse: 'Leads sem resposta',
    noResponseDesc: 'Última mensagem sem resposta há 3+ dias',
    hotStale: 'Leads quentes esfriando',
    hotStaleDesc: 'Lead quente sem atividade há 5+ dias',
    reengagement: 'Oportunidades de reengajamento',
    reengagementDesc: 'Leads perdidos nos últimos 30 dias',
    referralAsk: 'Pedir indicação',
    referralAskDesc: 'Clientes satisfeitos há 60+ dias',
    attempt: 'Tentativa',
    noActivity: 'sem atividade',
    // Doer
    todayVisits: 'Visitas de hoje',
    noVisits: 'Nenhuma visita agendada para hoje',
    dealsClosing: 'Fechamentos em andamento',
    noDeals: 'Nenhum fechamento em andamento',
    pendingDocs: 'Documentos pendentes',
    noPendingDocs: 'Nenhum documento pendente',
    doneToday: 'Concluídas hoje',
    // Empty states
    allCleanFinder: 'Nada pendente na prospecção.',
    allCleanKeeper: 'Todos os relacionamentos em dia.',
    allCleanDoer: 'Nada pendente para executar.',
    allClean: 'Dia limpo. Nada pendente nos 3 papéis.',
    error: 'Erro ao carregar dados.',
    stage: 'estágio',
    viewCrm: 'Ver lead',
    viewCalendar: 'Ver agenda',
    viewDocs: 'Ver documentos',
  },
  en: {
    title: 'Daily Routine',
    subtitle: 'Realtor operating system — Finder · Keeper · Doer',
    finder: 'Finder',
    keeper: 'Keeper',
    doer: 'Doer',
    finderDesc: 'Prospecting & new business',
    keeperDesc: 'Relationship nurturing',
    doerDesc: 'Execution & closing',
    loading: 'Loading...',
    tasksPending: 'pending tasks',
    tasksDoneToday: 'done today',
    sequencesActive: 'active sequences',
    openProspection: 'Open full prospection',
    noProspectionAccess: 'Prospection available for AI agencies. Invite leads manually via CRM.',
    followUps: 'Pending follow-ups',
    noResponse: 'Unanswered leads',
    noResponseDesc: 'Last message unanswered for 3+ days',
    hotStale: 'Hot leads going cold',
    hotStaleDesc: 'Hot lead inactive for 5+ days',
    reengagement: 'Re-engagement opportunities',
    reengagementDesc: 'Leads lost in the last 30 days',
    referralAsk: 'Ask for referral',
    referralAskDesc: 'Happy clients from 60+ days ago',
    attempt: 'Attempt',
    noActivity: 'no activity',
    todayVisits: "Today's visits",
    noVisits: 'No visits scheduled for today',
    dealsClosing: 'Deals closing',
    noDeals: 'No deals in closing stage',
    pendingDocs: 'Pending documents',
    noPendingDocs: 'No pending documents',
    doneToday: 'Done today',
    allCleanFinder: 'Nothing pending in prospecting.',
    allCleanKeeper: 'All relationships up to date.',
    allCleanDoer: 'Nothing to execute.',
    allClean: 'All clear. Nothing pending across all 3 roles.',
    error: 'Error loading data.',
    stage: 'stage',
    viewCrm: 'View lead',
    viewCalendar: 'View calendar',
    viewDocs: 'View documents',
  },
  es: {
    title: 'Rutina Diaria',
    subtitle: 'Sistema operativo del corredor — Finder · Keeper · Doer',
    finder: 'Prospección',
    keeper: 'Relaciones',
    doer: 'Ejecución',
    finderDesc: 'Prospección y nuevos negocios',
    keeperDesc: 'Nutrición de relaciones',
    doerDesc: 'Ejecución y cierre',
    loading: 'Cargando...',
    tasksPending: 'tareas pendientes',
    tasksDoneToday: 'hechas hoy',
    sequencesActive: 'secuencias activas',
    openProspection: 'Abrir prospección completa',
    noProspectionAccess: 'Prospección disponible para agencias de IA. Invita leads manualmente por CRM.',
    followUps: 'Follow-ups pendientes',
    noResponse: 'Leads sin respuesta',
    noResponseDesc: 'Último mensaje sin respuesta por 3+ días',
    hotStale: 'Leads calientes enfriándose',
    hotStaleDesc: 'Lead caliente sin actividad por 5+ días',
    reengagement: 'Oportunidades de reenganche',
    reengagementDesc: 'Leads perdidos en los últimos 30 días',
    referralAsk: 'Pedir recomendación',
    referralAskDesc: 'Clientes satisfechos de hace 60+ días',
    attempt: 'Intento',
    noActivity: 'sin actividad',
    todayVisits: 'Visitas de hoy',
    noVisits: 'Sin visitas programadas para hoy',
    dealsClosing: 'Cierres en proceso',
    noDeals: 'Sin cierres en proceso',
    pendingDocs: 'Documentos pendientes',
    noPendingDocs: 'Sin documentos pendientes',
    doneToday: 'Hechas hoy',
    allCleanFinder: 'Nada pendiente en prospección.',
    allCleanKeeper: 'Todas las relaciones al día.',
    allCleanDoer: 'Nada pendiente para ejecutar.',
    allClean: 'Día limpio. Nada pendiente en los 3 roles.',
    error: 'Error al cargar datos.',
    stage: 'etapa',
    viewCrm: 'Ver lead',
    viewCalendar: 'Ver agenda',
    viewDocs: 'Ver documentos',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════════════════

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-6 w-48 rounded" style={{ background: 'var(--color-border)' }} />
      <div className="h-4 w-96 rounded" style={{ background: 'var(--color-border)' }} />
      <div className="space-y-3 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl" style={{ background: 'var(--color-border)' }} />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface TabProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  desc: string
  color: string
  count?: number
}

function Tab({ active, onClick, icon, label, desc, color, count }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
        active ? '' : 'opacity-50 hover:opacity-80'
      }`}
      style={{
        background: active ? `${color}12` : 'transparent',
        border: active ? `1px solid ${color}30` : '1px solid transparent',
      }}
    >
      <div
        className="p-2 rounded-lg flex-shrink-0"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {label}
          </span>
          {count !== undefined && count > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: color, color: '#fff' }}
            >
              {count}
            </span>
          )}
        </div>
        <span className="text-[10px] sm:text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {desc}
        </span>
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'finder' | 'keeper' | 'doer'

const TAB_COLORS: Record<TabId, string> = {
  finder: '#4F6FFF',
  keeper: '#EC4899',
  doer: '#10B981',
}

export default function FkdPage() {
  const { user, activeOrg } = useAuth()
  const activeOrgId = useActiveOrgId()
  const lang = (user?.language as 'pt' | 'en' | 'es') || 'pt'
  const t = T[lang]
  const userCurrency = user?.currency || 'BRL'

  const [activeTab, setActiveTab] = useState<TabId>('finder')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Finder data
  const [finderData, setFinderData] = useState<{
    taskCount: number
    doneCount: number
    sequencesCount: number
    hasAccess: boolean
  } | null>(null)

  // Keeper data
  const [keeperSections, setKeeperSections] = useState<{
    followUps: any[]
    noResponse: any[]
    hotStale: any[]
    reengagement: any[]
    referralAsk: any[]
  }>({ followUps: [], noResponse: [], hotStale: [], reengagement: [], referralAsk: [] })

  // Doer data
  const [doerSections, setDoerSections] = useState<{
    visits: any[]
    deals: any[]
    docs: any[]
    doneCount: number
  }>({ visits: [], deals: [], docs: [], doneCount: 0 })

  const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-CL' : 'pt-BR'

  const loadAll = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)
    setError(false)

    try {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

      // ─── Finder: fetch My Day API ───
      let finderHasAccess = false
      let finderTaskCount = 0
      let finderDoneCount = 0
      let finderSeqCount = 0

      try {
        const mdRes = await fetch(`/api/prospection/my-day?org_id=${activeOrgId}`)
        if (mdRes.ok) {
          const md = await mdRes.json()
          finderHasAccess = true
          finderTaskCount = (md.counts?.overdue || 0) + (md.counts?.now || 0) + (md.counts?.today || 0) + (md.counts?.tomorrow || 0)
          finderDoneCount = md.counts?.done_today || 0

          // Active sequences count
          const seqRes = await fetch(`/api/prospection/sequences?org_id=${activeOrgId}`)
          if (seqRes.ok) {
            const seqData = await seqRes.json()
            finderSeqCount = Array.isArray(seqData) ? seqData.filter((s: any) => s.is_active).length : 0
          }
        }
      } catch { /* Finder unavailable */ }

      setFinderData({
        taskCount: finderTaskCount,
        doneCount: finderDoneCount,
        sequencesCount: finderSeqCount,
        hasAccess: finderHasAccess,
      })

      // ─── Keeper: parallel Supabase queries ───
      const [
        followUpRes,
        noResponseRes,
        hotStaleRes,
        reengagementRes,
        referralRes,
      ] = await Promise.all([
        // 1. Follow-ups pendentes
        supabase
          .from('follow_up_queue')
          .select('id, lead_id, attempt_number, max_attempts, next_attempt_at, last_conversation_summary, lead:leads(id, name, nome_empresa)')
          .eq('org_id', activeOrgId)
          .in('status', ['pending', 'active'])
          .lte('next_attempt_at', now.toISOString())
          .order('next_attempt_at', { ascending: true })
          .limit(20),

        // 2. Leads sem resposta (last inbound > 3d)
        supabase
          .from('sdr_messages')
          .select('lead_id, created_at')
          .eq('org_id', activeOrgId)
          .eq('role', 'user')
          .lt('created_at', threeDaysAgo)
          .order('created_at', { ascending: false })
          .limit(100),

        // 3. Leads quentes esfriando (score >= 56, no update in 5d)
        supabase
          .from('leads')
          .select('id, name, score_label, stage, updated_at')
          .eq('org_id', activeOrgId)
          .gte('score', 56)
          .lt('updated_at', fiveDaysAgo)
          .order('score', { ascending: false })
          .limit(30),

        // 4. Reengajamento (lost last 30d) — using closed_at or updated_at
        supabase
          .from('leads')
          .select('id, name, stage, updated_at, total_em_vendas')
          .eq('org_id', activeOrgId)
          .in('stage', ['lost', 'perdido', 'perdeu'])
          .gte('updated_at', thirtyDaysAgo)
          .order('updated_at', { ascending: false })
          .limit(10),

        // 5. Pedir indicação (won 60+d ago)
        supabase
          .from('leads')
          .select('id, name, stage, updated_at, total_em_vendas')
          .eq('org_id', activeOrgId)
          .in('stage', ['won', 'ganhou', 'ganho', 'fechado'])
          .lt('updated_at', sixtyDaysAgo)
          .order('updated_at', { ascending: false })
          .limit(10),
      ])

      // Process follow-ups
      const followUps = (followUpRes.data || []).map((f: any) => ({
        id: f.id,
        leadId: f.lead_id,
        leadName: f.lead ? formatLeadName(f.lead) : 'Sem nome',
        attempt: f.attempt_number,
        maxAttempts: f.max_attempts,
        nextAt: f.next_attempt_at,
        summary: f.last_conversation_summary,
        type: 'followup',
      }))

      // Process no-response leads
      const noRespLeads = new Map<string, any>()
      if (noResponseRes.data) {
        for (const msg of noResponseRes.data) {
          if (!noRespLeads.has(msg.lead_id)) {
            noRespLeads.set(msg.lead_id, msg)
          }
        }
      }
      // Filter: only leads without subsequent outbound after their last inbound
      let noResponse: any[] = []
      if (noRespLeads.size > 0) {
        const leadIds = Array.from(noRespLeads.keys())
        const { data: outbound } = await supabase
          .from('sdr_messages')
          .select('lead_id, created_at')
          .eq('org_id', activeOrgId)
          .eq('role', 'assistant')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })
          .limit(200)

        const latestOutbound = new Map<string, string>()
        if (outbound) {
          for (const m of outbound) {
            if (!latestOutbound.has(m.lead_id)) {
              latestOutbound.set(m.lead_id, m.created_at)
            }
          }
        }

        const { data: leadNames } = await supabase
          .from('leads')
          .select('id, name')
          .eq('org_id', activeOrgId)
          .in('id', leadIds)

        const nameMap = new Map((leadNames || []).map((l: any) => [l.id, l.name]))

        const trulyNoResponse = Array.from(noRespLeads.entries()).filter(([leadId, msg]) => {
          const lastOut = latestOutbound.get(leadId)
          return !lastOut || lastOut < msg.created_at
        })

        noResponse = trulyNoResponse.slice(0, 10).map(([leadId, msg]) => ({
          leadId,
          leadName: formatLeadName({ name: nameMap.get(leadId) || null }),
          lastMsgAt: msg.created_at,
          type: 'noresponse',
        }))
      }

      // Process hot stale
      const hotStale = (hotStaleRes.data || []).slice(0, 10).map((l: any) => ({
        leadId: l.id,
        leadName: l.name,
        stage: l.stage,
        score: l.score_label,
        updatedAt: l.updated_at,
        type: 'hotstale',
      }))

      // Process reengagement
      const reengagement = (reengagementRes.data || []).map((l: any) => ({
        leadId: l.id,
        leadName: l.name,
        value: l.total_em_vendas,
        updatedAt: l.updated_at,
        type: 'reengagement',
      }))

      // Process referral
      const referralAsk = (referralRes.data || []).map((l: any) => ({
        leadId: l.id,
        leadName: l.name,
        value: l.total_em_vendas,
        updatedAt: l.updated_at,
        type: 'referral',
      }))

      setKeeperSections({ followUps, noResponse, hotStale, reengagement, referralAsk })

      // ─── Doer: parallel Supabase queries ───
      const [visitsRes, dealsRes, docsRes, doneRes] = await Promise.all([
        // Visitas de hoje
        supabase
          .from('calendar_events')
          .select('id, lead_id, title, start_time, status, leads(id, name, nome_empresa)')
          .eq('org_id', activeOrgId)
          .eq('event_date', todayStr)
          .eq('status', 'scheduled')
          .order('start_time', { ascending: true }),

        // Fechamentos em andamento
        supabase
          .from('leads')
          .select('id, name, stage, total_em_vendas, updated_at')
          .eq('org_id', activeOrgId)
          .in('stage', ['proposta', 'negociacao', 'fechamento', 'negotiation', 'proposal', 'closing'])
          .gt('total_em_vendas', 0)
          .order('total_em_vendas', { ascending: false })
          .limit(15),

        // Documentos pendentes
        supabase
          .from('org_documents')
          .select('id, lead_id, name, status, sent_at, leads(id, name, nome_empresa)')
          .eq('org_id', activeOrgId)
          .in('status', ['draft', 'ready', 'sent'])
          .is('signed_at', null)
          .order('sent_at', { ascending: false })
          .limit(10),

        // Tasks concluídas hoje (prospection)
        supabase
          .from('prospection_tasks')
          .select('id')
          .eq('org_id', activeOrgId)
          .eq('status', 'done')
          .gte('completed_at', todayStr)
          .limit(100),
      ])

      setDoerSections({
        visits: (visitsRes.data || []).map((v: any) => ({
          id: v.id,
          leadId: v.lead_id,
          leadName: v.leads ? formatLeadName(v.leads) : 'Sem lead',
          title: v.title,
          time: v.start_time,
          type: 'visit',
        })),
        deals: (dealsRes.data || []).map((d: any) => ({
          leadId: d.id,
          leadName: d.name,
          stage: d.stage,
          value: d.total_em_vendas,
          updatedAt: d.updated_at,
          type: 'deal',
        })),
        docs: (docsRes.data || []).map((d: any) => ({
          id: d.id,
          leadId: d.lead_id,
          docName: d.name,
          leadName: d.leads ? formatLeadName(d.leads) : 'Sem lead',
          status: d.status,
          sentAt: d.sent_at,
          type: 'doc',
        })),
        doneCount: (doneRes.data || []).length,
      })

    } catch (err) {
      console.error('FKD: load error', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    if (activeOrgId) loadAll()
  }, [activeOrgId, loadAll])

  // ─── Count badges ───
  const keeperCount = keeperSections.followUps.length + keeperSections.noResponse.length + keeperSections.hotStale.length
  const doerCount = doerSections.visits.length + doerSections.deals.length + doerSections.docs.length

  if (loading) return <Skeleton />

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: Finder Tab
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderFinder = () => {
    if (!finderData) return null

    if (!finderData.hasAccess) {
      return (
        <div className="p-6 text-center">
          <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <Rocket size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.noProspectionAccess}</p>
            <a
              href="/dashboard/crm"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium"
              style={{ color: TAB_COLORS.finder }}
            >
              <Users size={14} /> {t.viewCrm} <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-black" style={{ color: finderData.taskCount > 0 ? '#f59e0b' : 'var(--color-success)' }}>
              {finderData.taskCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.tasksPending}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-black" style={{ color: 'var(--color-success)' }}>{finderData.doneCount}</p>
            <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.tasksDoneToday}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{finderData.sequencesCount}</p>
            <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.sequencesActive}</p>
          </div>
        </div>

        <a
          href="/dashboard/prospection/my-day"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${TAB_COLORS.finder}, ${TAB_COLORS.finder}cc)`,
            color: '#fff',
            boxShadow: '0 4px 16px rgba(79, 111, 255, 0.25)',
          }}
        >
          <Rocket size={16} /> {t.openProspection} <ArrowRight size={16} />
        </a>

        {finderData.taskCount === 0 && finderData.doneCount === 0 && (
          <p className="text-xs text-center" style={{ color: 'var(--color-success)' }}>{t.allCleanFinder}</p>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: Keeper Tab
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderKeeper = () => {
    const sections = [
      {
        key: 'followUps',
        label: t.followUps,
        icon: <Clock size={14} />,
        color: '#f59e0b',
        items: keeperSections.followUps,
        renderItem: (item: any) => (
          <a key={item.id} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.leadName}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                {t.attempt} {item.attempt}/{item.maxAttempts}
                {item.summary ? ` · ${item.summary.slice(0, 60)}` : ''}
              </p>
            </div>
            <ArrowRight size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ),
      },
      {
        key: 'noResponse',
        label: t.noResponse,
        icon: <MessageSquare size={14} />,
        color: '#ef4444',
        items: keeperSections.noResponse,
        renderItem: (item: any) => (
          <a key={item.leadId} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <p className="text-xs font-medium truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>{item.leadName}</p>
            <ArrowRight size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ),
      },
      {
        key: 'hotStale',
        label: t.hotStale,
        icon: <AlertTriangle size={14} />,
        color: '#f97316',
        items: keeperSections.hotStale,
        renderItem: (item: any) => (
          <a key={item.leadId} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.leadName}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {item.score || t.stage}: {item.stage || '-'}
              </p>
            </div>
            <ArrowRight size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ),
      },
      {
        key: 'reengagement',
        label: t.reengagement,
        icon: <Heart size={14} />,
        color: '#8b5cf6',
        items: keeperSections.reengagement,
        renderItem: (item: any) => (
          <a key={item.leadId} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <p className="text-xs font-medium truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>{item.leadName}</p>
            <ArrowRight size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ),
      },
      {
        key: 'referralAsk',
        label: t.referralAsk,
        icon: <Users size={14} />,
        color: '#06b6d4',
        items: keeperSections.referralAsk,
        renderItem: (item: any) => (
          <a key={item.leadId} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.leadName}</p>
              {item.value > 0 && (
                <p className="text-[10px]" style={{ color: 'var(--color-success)' }}>
                  {formatPrice(item.value, userCurrency, locale)}
                </p>
              )}
            </div>
            <ArrowRight size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ),
      },
    ]

    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)
    if (totalItems === 0) {
      return (
        <div className="p-6 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--color-success)' }} />
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>{t.allCleanKeeper}</p>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {sections.map((section) =>
          section.items.length > 0 ? (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: section.color }}>{section.icon}</span>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  {section.label} <span style={{ color: section.color }}>({section.items.length})</span>
                </p>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                {section.items.map(section.renderItem)}
              </div>
            </div>
          ) : null
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: Doer Tab
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderDoer = () => {
    const sections = [
      {
        key: 'visits',
        label: t.todayVisits,
        icon: <Calendar size={14} />,
        color: '#0ea5e9',
        items: doerSections.visits,
        emptyMsg: t.noVisits,
        renderItem: (item: any) => (
          <a key={item.id} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.leadName}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {item.title || 'Visita'} {item.time ? `· ${new Date(item.time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            </div>
            <ArrowRight size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ),
        footerLink: '/dashboard/calendar',
        footerLabel: t.viewCalendar,
      },
      {
        key: 'deals',
        label: t.dealsClosing,
        icon: <DollarSign size={14} />,
        color: '#10b981',
        items: doerSections.deals,
        emptyMsg: t.noDeals,
        renderItem: (item: any) => (
          <a key={item.leadId} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.leadName}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{item.stage}</p>
            </div>
            <span className="text-xs font-bold flex-shrink-0 ml-2" style={{ color: 'var(--color-success)' }}>
              {formatPrice(item.value, userCurrency, locale)}
            </span>
          </a>
        ),
      },
      {
        key: 'docs',
        label: t.pendingDocs,
        icon: <FileText size={14} />,
        color: '#f59e0b',
        items: doerSections.docs,
        emptyMsg: t.noPendingDocs,
        renderItem: (item: any) => (
          <a key={item.id} href={`/dashboard/crm/${item.leadId}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.docName}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {item.leadName} · {item.status}
              </p>
            </div>
            <ArrowRight size={12} className="flex-shrink-0 ml-2" style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ),
        footerLink: '/dashboard/documents',
        footerLabel: t.viewDocs,
      },
    ]

    const totalItems = doerSections.visits.length + doerSections.deals.length + doerSections.docs.length
    if (totalItems === 0 && doerSections.doneCount === 0) {
      return (
        <div className="p-6 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--color-success)' }} />
          <p className="text-sm" style={{ color: 'var(--color-success)' }}>{t.allCleanDoer}</p>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {/* Done today badge */}
        {doerSections.doneCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
              {doerSections.doneCount} {t.doneToday}
            </span>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: section.color }}>{section.icon}</span>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {section.label}
                {section.items.length > 0 && (
                  <span style={{ color: section.color }}> ({section.items.length})</span>
                )}
              </p>
            </div>
            {section.items.length > 0 ? (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                {section.items.map(section.renderItem)}
              </div>
            ) : (
              <p className="text-xs px-1" style={{ color: 'var(--color-text-tertiary)' }}>{section.emptyMsg}</p>
            )}
            {section.footerLink && section.items.length > 0 && (
              <a
                href={section.footerLink}
                className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium opacity-60 hover:opacity-100"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {section.footerLabel} <ArrowRight size={10} />
              </a>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-tertiary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          {t.title}
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          {t.subtitle}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Tab
          active={activeTab === 'finder'}
          onClick={() => setActiveTab('finder')}
          icon={<Rocket size={18} />}
          label={t.finder}
          desc={t.finderDesc}
          color={TAB_COLORS.finder}
          count={finderData?.taskCount || 0}
        />
        <Tab
          active={activeTab === 'keeper'}
          onClick={() => setActiveTab('keeper')}
          icon={<Heart size={18} />}
          label={t.keeper}
          desc={t.keeperDesc}
          color={TAB_COLORS.keeper}
          count={keeperCount}
        />
        <Tab
          active={activeTab === 'doer'}
          onClick={() => setActiveTab('doer')}
          icon={<CheckCircle2 size={18} />}
          label={t.doer}
          desc={t.doerDesc}
          color={TAB_COLORS.doer}
          count={doerCount}
        />
      </div>

      {/* Tab content */}
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        {activeTab === 'finder' && renderFinder()}
        {activeTab === 'keeper' && renderKeeper()}
        {activeTab === 'doer' && renderDoer()}
      </div>
    </div>
  )
}
