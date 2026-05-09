'use client'

import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Clock, Heart, MessageSquare, Users, CheckCircle2, ChevronDown } from 'lucide-react'
import ActionCard from './ActionCard'
import { getKeeperMessage } from '@/lib/fkd/keeper-templates'
import type { ActionItem, KeeperContext } from '@/lib/fkd/types'

const T = {
  pt: {
    urgent: 'Urgente',
    important: 'Importante',
    opportunity: 'Oportunidade',
    doneToday: 'Concluídos hoje',
    noActions: 'Nada pendente',
    allClean: 'Todos os relacionamentos em dia.',
  },
  en: {
    urgent: 'Urgent',
    important: 'Important',
    opportunity: 'Opportunity',
    doneToday: 'Done today',
    noActions: 'Nothing pending',
    allClean: 'All relationships up to date.',
  },
  es: {
    urgent: 'Urgente',
    important: 'Importante',
    opportunity: 'Oportunidad',
    doneToday: 'Hechas hoy',
    noActions: 'Nada pendiente',
    allClean: 'Todas las relaciones al día.',
  },
}

interface RawItem {
  id?: string
  leadId: string
  leadName: string
  phone?: string | null
  attempt?: number
  maxAttempts?: number
  summary?: string
  lastMsgAt?: string
  stage?: string
  score?: string
  value?: number
  updatedAt?: string
  nextAt?: string
  type: string
}

interface Props {
  sections: {
    followUps: RawItem[]
    noResponse: RawItem[]
    hotStale: RawItem[]
    reengagement: RawItem[]
    referralAsk: RawItem[]
  }
  orgId: string
  lang?: 'pt' | 'en' | 'es'
  actionedToday: Set<string>
  onActioned: (leadId: string) => void
  onDismiss: (leadId: string) => void
}

function getDaysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function toActionItem(item: RawItem, lang: string): ActionItem | null {
  const daysSince = getDaysSince(item.lastMsgAt || item.updatedAt || item.nextAt)

  // Build context for message template
  let contextType: ActionItem['contextType']
  let context: string
  let priority: ActionItem['priority']
  let ctx: KeeperContext

  switch (item.type) {
    case 'followup': {
      contextType = 'followup'
      priority = item.attempt && item.attempt >= 3 ? 'urgent' : 'important'
      context = `${T[lang as keyof typeof T].urgent} · follow-up ${item.attempt}/${item.maxAttempts}`
      ctx = {
        type: 'followup',
        leadName: item.leadName,
        attempt: item.attempt || 1,
        maxAttempts: item.maxAttempts || 3,
        summary: item.summary,
        daysSinceContact: daysSince,
      }
      break
    }
    case 'noresponse': {
      contextType = 'no_response'
      priority = 'urgent'
      context = `Sem resposta · ${daysSince}d`
      ctx = {
        type: 'no_response',
        leadName: item.leadName,
        daysSinceContact: daysSince,
      }
      break
    }
    case 'hotstale': {
      contextType = 'hot_stale'
      priority = 'urgent'
      const scoreStr = item.score ? ` · ${item.score}` : ''
      context = `${item.stage || 'Lead quente'}${scoreStr} · ${daysSince}d`
      ctx = {
        type: 'hot_stale',
        leadName: item.leadName,
        stage: item.stage || '',
        score: item.score || '',
        daysSinceContact: daysSince,
      }
      break
    }
    case 'reengagement': {
      contextType = 'reengagement'
      priority = 'opportunity'
      context = `Perdido há ${daysSince}d`
      ctx = {
        type: 'reengagement',
        leadName: item.leadName,
        daysSinceLost: daysSince,
      }
      break
    }
    case 'referral': {
      contextType = 'referral'
      priority = 'opportunity'
      context = `Cliente há ${daysSince}d`
      ctx = {
        type: 'referral',
        leadName: item.leadName,
        daysSinceWon: daysSince,
        dealValue: item.value || 0,
      }
      break
    }
    default:
      return null
  }

  const suggestedMessage = getKeeperMessage(ctx, lang as 'pt' | 'en' | 'es')

  return {
    id: item.id || item.leadId,
    leadId: item.leadId,
    leadName: item.leadName,
    phone: item.phone || null,
    priority,
    context,
    contextType,
    daysSinceContact: daysSince,
    suggestedMessage,
    metadata: item,
  }
}

export default function KeeperTab({
  sections, orgId, lang = 'pt', actionedToday, onActioned, onDismiss,
}: Props) {
  const [doneExpanded, setDoneExpanded] = useState(false)
  const t = T[lang]

  // Transform + dedup + only show non-actioned items
  const { urgent, important, opportunity, doneItems } = useMemo(() => {
    const seenIds = new Set<string>()
    const all: ActionItem[] = []

    // Priority order: highest first for dedup
    const priorityOrder: Array<{ key: string; items: RawItem[] }> = [
      { key: 'noResponse', items: sections.noResponse },
      { key: 'hotStale', items: sections.hotStale },
      { key: 'followUps', items: sections.followUps },
      { key: 'reengagement', items: sections.reengagement },
      { key: 'referralAsk', items: sections.referralAsk },
    ]

    for (const section of priorityOrder) {
      for (const item of section.items) {
        if (seenIds.has(item.leadId)) continue
        seenIds.add(item.leadId)

        const ai = toActionItem(item, lang)
        if (!ai) continue

        all.push(ai)
      }
    }

    // Split into pending and done
    const pending = all.filter((a) => !actionedToday.has(a.leadId))
    const done = all.filter((a) => actionedToday.has(a.leadId))

    return {
      urgent: pending.filter((a) => a.priority === 'urgent'),
      important: pending.filter((a) => a.priority === 'important'),
      opportunity: pending.filter((a) => a.priority === 'opportunity'),
      doneItems: done,
    }
  }, [sections, actionedToday, lang])

  const totalPending = urgent.length + important.length + opportunity.length

  if (totalPending === 0 && doneItems.length === 0) {
    return (
      <div className="p-6 text-center">
        <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--color-success)' }} />
        <p className="text-sm" style={{ color: 'var(--color-success)' }}>{t.allClean}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      {totalPending > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {urgent.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
              <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                {urgent.length} {t.urgent.toLowerCase()}
              </span>
            </div>
          )}
          {important.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                {important.length} {t.important.toLowerCase()}
              </span>
            </div>
          )}
          {opportunity.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#4F6FFF' }} />
              <span className="text-xs font-semibold" style={{ color: '#4F6FFF' }}>
                {opportunity.length} {t.opportunity.toLowerCase()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Urgent section */}
      {urgent.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#ef4444' }}>
              {t.urgent}
            </p>
          </div>
          <div className="space-y-2">
            {urgent.map((item) => (
              <ActionCard
                key={item.leadId}
                item={item}
                orgId={orgId}
                lang={lang}
                onActioned={onActioned}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Important section */}
      {important.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} style={{ color: '#f59e0b' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
              {t.important}
            </p>
          </div>
          <div className="space-y-2">
            {important.map((item) => (
              <ActionCard
                key={item.leadId}
                item={item}
                orgId={orgId}
                lang={lang}
                onActioned={onActioned}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Opportunity section */}
      {opportunity.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} style={{ color: '#4F6FFF' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4F6FFF' }}>
              {t.opportunity}
            </p>
          </div>
          <div className="space-y-2">
            {opportunity.map((item) => (
              <ActionCard
                key={item.leadId}
                item={item}
                orgId={orgId}
                lang={lang}
                onActioned={onActioned}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Done section */}
      {doneItems.length > 0 && (
        <div>
          <button
            onClick={() => setDoneExpanded(!doneExpanded)}
            className="flex items-center gap-2 w-full text-left"
          >
            <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              {t.doneToday} ({doneItems.length})
            </span>
            <ChevronDown
              size={12}
              className="ml-auto transition-transform"
              style={{
                color: 'var(--color-text-tertiary)',
                transform: doneExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
          {doneExpanded && (
            <div className="space-y-2 mt-2 opacity-60">
              {doneItems.map((item) => (
                <ActionCard
                  key={item.leadId}
                  item={item}
                  orgId={orgId}
                  lang={lang}
                  onActioned={onActioned}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
