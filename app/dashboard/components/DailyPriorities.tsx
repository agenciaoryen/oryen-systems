'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatLeadName } from '@/lib/format/leadName'
import {
  AlertTriangle,
  RefreshCw,
  Calendar,
  Flame,
  DollarSign,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR, enUS, es as esLocale } from 'date-fns/locale'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Prioridades do Dia',
    pending: 'pendentes',
    allClear: 'Tudo em dia!',
    allClearDesc: 'Nenhuma acao urgente no momento.',
    seeMore: 'ver mais',
    noResponse: 'Leads sem resposta',
    noResponseTime: 'sem resposta',
    followUps: 'Follow-ups pendentes',
    attempt: 'Tentativa',
    todayVisits: 'Visitas de hoje',
    hotLeadsStale: 'Leads quentes sem atividade',
    daysAgo: 'd atras',
    score: 'Score',
    highValue: 'Oportunidades de alto valor',
    stale: 'd parado',
  },
  en: {
    title: 'Daily Priorities',
    pending: 'pending',
    allClear: 'All caught up!',
    allClearDesc: 'No urgent actions right now.',
    seeMore: 'see more',
    noResponse: 'Unanswered leads',
    noResponseTime: 'no response',
    followUps: 'Pending follow-ups',
    attempt: 'Attempt',
    todayVisits: "Today's visits",
    hotLeadsStale: 'Hot leads going cold',
    daysAgo: 'd ago',
    score: 'Score',
    highValue: 'High value opportunities',
    stale: 'd stale',
  },
  es: {
    title: 'Prioridades del Dia',
    pending: 'pendientes',
    allClear: 'Todo al dia!',
    allClearDesc: 'Ninguna accion urgente en este momento.',
    seeMore: 'ver mas',
    noResponse: 'Leads sin respuesta',
    noResponseTime: 'sin respuesta',
    followUps: 'Follow-ups pendientes',
    attempt: 'Intento',
    todayVisits: 'Visitas de hoy',
    hotLeadsStale: 'Leads calientes sin actividad',
    daysAgo: 'd atras',
    score: 'Score',
    highValue: 'Oportunidades de alto valor',
    stale: 'd inactivo',
  },
}

const DATE_LOCALES = { pt: ptBR, en: enUS, es: esLocale }

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  orgId: string
  lang: 'pt' | 'en' | 'es'
  orgNiche?: string | null
}

interface PriorityItem {
  id: string
  leadId: string
  cols: string[] // up to 3 columns of text
}

interface PriorityCategory {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  items: PriorityItem[]
  link: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13) {
    // 55 + DDD + 9 digits
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  return phone
}

function daysBetween(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value.toFixed(0)}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DailyPriorities({ orgId, lang, orgNiche }: Props) {
  const [categories, setCategories] = useState<PriorityCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const t = TRANSLATIONS[lang] || TRANSLATIONS.pt
  const dateLocale = DATE_LOCALES[lang] || ptBR

  const MAX_ITEMS = 5

  // ─── Fetch all priorities ───
  const fetchPriorities = useCallback(async () => {
    if (!orgId) return
    setLoading(true)

    try {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const todayStr = now.toISOString().split('T')[0]

      // Run all queries in parallel
      const [
        noResponseRes,
        followUpRes,
        visitsRes,
        hotLeadsRes,
        highValueRes,
      ] = await Promise.all([
        // 1. Leads sem resposta (last inbound message > 2h, no outbound after)
        supabase
          .from('sdr_messages')
          .select('lead_id, created_at, phone')
          .eq('org_id', orgId)
          .eq('role', 'user')
          .lt('created_at', twoHoursAgo)
          .order('created_at', { ascending: false })
          .limit(200),

        // 2. Follow-ups pendentes
        supabase
          .from('follow_up_queue')
          .select('id, lead_id, attempt_number, max_attempts, last_conversation_summary, next_attempt_at, status, lead:leads(id, name, nome_empresa, phone)')
          .eq('org_id', orgId)
          .in('status', ['pending', 'active'])
          .lte('next_attempt_at', now.toISOString())
          .order('next_attempt_at', { ascending: true })
          .limit(50),

        // 3. Visitas de hoje
        supabase
          .from('calendar_events')
          .select('id, lead_id, title, start_time, address, leads(id, name, nome_empresa, phone)')
          .eq('org_id', orgId)
          .eq('event_date', todayStr)
          .eq('status', 'scheduled')
          .order('start_time', { ascending: true }),

        // 4. Leads quentes sem atividade (score >= 56, updated > 3 days ago)
        supabase
          .from('leads')
          .select('id, name, phone, score, score_label, updated_at')
          .eq('org_id', orgId)
          .gte('score', 56)
          .lt('updated_at', threeDaysAgo)
          .order('score', { ascending: false })
          .limit(50),

        // 5. Oportunidades de alto valor paradas
        supabase
          .from('leads')
          .select('id, name, phone, total_em_vendas, stage, updated_at')
          .eq('org_id', orgId)
          .gt('total_em_vendas', 0)
          .lt('updated_at', fiveDaysAgo)
          .not('stage', 'in', '("won","lost","ganhou","perdeu")')
          .order('total_em_vendas', { ascending: false })
          .limit(50),
      ])

      // ─── Process Category 1: No Response ───
      const noResponseItems: PriorityItem[] = []
      if (noResponseRes.data && noResponseRes.data.length > 0) {
        // Group by lead_id, keep latest inbound per lead
        const latestByLead = new Map<string, { lead_id: string; created_at: string; phone: string }>()
        for (const msg of noResponseRes.data) {
          if (!latestByLead.has(msg.lead_id)) {
            latestByLead.set(msg.lead_id, msg)
          }
        }

        // Check for each lead if there's an outbound message AFTER their last inbound
        const leadIds = Array.from(latestByLead.keys())

        if (leadIds.length > 0) {
          // Get the latest outbound per lead
          const { data: outboundMsgs } = await supabase
            .from('sdr_messages')
            .select('lead_id, created_at')
            .eq('org_id', orgId)
            .eq('role', 'assistant')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })
            .limit(500)

          const latestOutbound = new Map<string, string>()
          if (outboundMsgs) {
            for (const msg of outboundMsgs) {
              if (!latestOutbound.has(msg.lead_id)) {
                latestOutbound.set(msg.lead_id, msg.created_at)
              }
            }
          }

          // Get lead names
          const { data: leadNames } = await supabase
            .from('leads')
            .select('id, name')
            .in('id', leadIds)

          const nameMap = new Map<string, string>()
          if (leadNames) {
            for (const l of leadNames) {
              nameMap.set(l.id, l.name || '')
            }
          }

          for (const [leadId, msg] of latestByLead) {
            const lastOut = latestOutbound.get(leadId)
            // If no outbound OR outbound is before the inbound
            if (!lastOut || new Date(lastOut) < new Date(msg.created_at)) {
              const timeSince = formatDistanceToNow(new Date(msg.created_at), {
                addSuffix: false,
                locale: dateLocale,
              })
              noResponseItems.push({
                id: `nr-${leadId}`,
                leadId,
                cols: [
                  truncate(nameMap.get(leadId) || 'Lead', 20),
                  formatPhone(msg.phone),
                  `${timeSince} ${t.noResponseTime}`,
                ],
              })
            }
          }
        }
      }

      // ─── Process Category 2: Follow-ups ───
      const followUpItems: PriorityItem[] = []
      if (followUpRes.data) {
        for (const fu of followUpRes.data) {
          const lead = fu.lead as any
          followUpItems.push({
            id: `fu-${fu.id}`,
            leadId: fu.lead_id,
            cols: [
              truncate(formatLeadName(lead, orgNiche, { lang }), 20),
              `${t.attempt} ${fu.attempt_number}/${fu.max_attempts}`,
              truncate(fu.last_conversation_summary, 30),
            ],
          })
        }
      }

      // ─── Process Category 3: Today's Visits ───
      const visitItems: PriorityItem[] = []
      if (visitsRes.data) {
        for (const ev of visitsRes.data) {
          const lead = ev.leads as any
          const timeStr = ev.start_time ? ev.start_time.slice(0, 5) : ''
          visitItems.push({
            id: `vi-${ev.id}`,
            leadId: ev.lead_id || '',
            cols: [
              truncate(lead ? formatLeadName(lead, orgNiche, { lang }) : (ev.title || 'Evento'), 20),
              timeStr,
              truncate(ev.address, 30),
            ],
          })
        }
      }

      // ─── Process Category 4: Hot Leads Stale ───
      const hotItems: PriorityItem[] = []
      if (hotLeadsRes.data) {
        for (const lead of hotLeadsRes.data) {
          const days = daysBetween(lead.updated_at || lead.updated_at)
          hotItems.push({
            id: `hot-${lead.id}`,
            leadId: lead.id,
            cols: [
              truncate(formatLeadName(lead, orgNiche, { lang }), 20),
              `${t.score} ${lead.score}`,
              `${days}${t.daysAgo}`,
            ],
          })
        }
      }

      // ─── Process Category 5: High Value Stale ───
      const highValueItems: PriorityItem[] = []
      if (highValueRes.data) {
        for (const lead of highValueRes.data) {
          const days = daysBetween(lead.updated_at || lead.updated_at)
          highValueItems.push({
            id: `hv-${lead.id}`,
            leadId: lead.id,
            cols: [
              truncate(formatLeadName(lead, orgNiche, { lang }), 20),
              formatCurrency(lead.total_em_vendas || 0),
              `${days}${t.stale}`,
            ],
          })
        }
      }

      // ─── Build categories ───
      const cats: PriorityCategory[] = [
        {
          key: 'no-response',
          label: t.noResponse,
          icon: <AlertTriangle size={15} />,
          color: '#f97316',
          items: noResponseItems,
          link: '/dashboard/messages',
        },
        {
          key: 'follow-ups',
          label: t.followUps,
          icon: <RefreshCw size={15} />,
          color: '#3b82f6',
          items: followUpItems,
          link: '/dashboard/follow-up',
        },
        {
          key: 'visits',
          label: t.todayVisits,
          icon: <Calendar size={15} />,
          color: '#22c55e',
          items: visitItems,
          link: '/dashboard/calendar',
        },
        {
          key: 'hot-leads',
          label: t.hotLeadsStale,
          icon: <Flame size={15} />,
          color: '#ef4444',
          items: hotItems,
          link: '/dashboard/crm',
        },
        {
          key: 'high-value',
          label: t.highValue,
          icon: <DollarSign size={15} />,
          color: '#eab308',
          items: highValueItems,
          link: '/dashboard/crm',
        },
      ]

      setCategories(cats)

      // Auto-collapse empty categories, expand ones with items
      const newCollapsed: Record<string, boolean> = {}
      for (const cat of cats) {
        newCollapsed[cat.key] = cat.items.length === 0
      }
      setCollapsed(newCollapsed)
    } catch (err) {
      console.error('[DailyPriorities] Error fetching priorities:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, lang, t, dateLocale])

  useEffect(() => {
    fetchPriorities()
  }, [fetchPriorities])

  // ─── Total count ───
  const totalCount = categories.reduce((sum, cat) => sum + cat.items.length, 0)

  // ─── Toggle collapse ───
  const toggleCategory = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* ─── Header ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {t.title}
        </h3>
        {loading ? (
          <Loader2
            size={14}
            style={{ color: 'var(--color-text-tertiary)', animation: 'spin 1s linear infinite' }}
          />
        ) : totalCount > 0 ? (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              background: 'var(--color-bg-elevated)',
              padding: '2px 10px',
              borderRadius: '10px',
            }}
          >
            {totalCount} {t.pending}
          </span>
        ) : null}
      </div>

      {/* ─── Body ─── */}
      <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
        {loading ? (
          <LoadingSkeleton />
        ) : totalCount === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
            }}
          >
            <CheckCircle2
              size={32}
              style={{ color: '#22c55e', margin: '0 auto 12px', display: 'block' }}
            />
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {t.allClear}
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '12px',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {t.allClearDesc}
            </p>
          </div>
        ) : (
          categories
            .filter((cat) => cat.items.length > 0)
            .map((cat) => (
              <CategorySection
                key={cat.key}
                category={cat}
                isCollapsed={!!collapsed[cat.key]}
                onToggle={() => toggleCategory(cat.key)}
                maxItems={MAX_ITEMS}
                seeMoreLabel={t.seeMore}
              />
            ))
        )}
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function CategorySection({
  category,
  isCollapsed,
  onToggle,
  maxItems,
  seeMoreLabel,
}: {
  category: PriorityCategory
  isCollapsed: boolean
  onToggle: () => void
  maxItems: number
  seeMoreLabel: string
}) {
  const displayItems = category.items.slice(0, maxItems)
  const hasMore = category.items.length > maxItems

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      {/* Category header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--color-bg-hover)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: category.color, display: 'flex' }}>
            {category.icon}
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}
          >
            {category.label}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: category.color,
              background: `${category.color}18`,
              padding: '1px 7px',
              borderRadius: '8px',
            }}
          >
            {category.items.length}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        ) : (
          <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        )}
      </button>

      {/* Items */}
      {!isCollapsed && (
        <div style={{ paddingBottom: '4px' }}>
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={item.leadId ? `/dashboard/crm/${item.leadId}` : '#'}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '4px',
                padding: '7px 20px 7px 44px',
                textDecoration: 'none',
                transition: 'background 0.15s',
                borderRadius: '0',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--color-bg-hover)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.cols[0]}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.cols[1]}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}
              >
                {item.cols[2]}
              </span>
            </Link>
          ))}

          {hasMore && (
            <Link
              href={category.link}
              style={{
                display: 'block',
                padding: '6px 20px 6px 44px',
                fontSize: '11px',
                fontWeight: 600,
                color: category.color,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {seeMoreLabel} →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingSkeleton() {
  const rows = [1, 2, 3]
  return (
    <div style={{ padding: '12px 20px' }}>
      {rows.map((r) => (
        <div key={r} style={{ marginBottom: '16px' }}>
          {/* Category header skeleton */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: 'var(--color-bg-elevated)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '120px',
                height: '12px',
                borderRadius: '6px',
                background: 'var(--color-bg-elevated)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
          {/* Item skeleton */}
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                padding: '6px 0 6px 24px',
              }}
            >
              <div
                style={{
                  height: '10px',
                  borderRadius: '5px',
                  background: 'var(--color-bg-elevated)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  height: '10px',
                  borderRadius: '5px',
                  background: 'var(--color-bg-elevated)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  height: '10px',
                  width: '60%',
                  borderRadius: '5px',
                  background: 'var(--color-bg-elevated)',
                  marginLeft: 'auto',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          ))}
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
