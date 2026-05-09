'use client'

import { useState, useMemo } from 'react'
import { DollarSign, Calendar, FileText, CheckCircle2, ChevronDown, Lightbulb, ArrowRight } from 'lucide-react'
import DealCard from './DealCard'
import { getValueOpportunities } from '@/lib/fkd/doer-rules'
import { formatPrice } from '@/lib/format'
import type { DealItem, VisitItem, DocItem } from '@/lib/fkd/types'

const T = {
  pt: {
    activeDeals: 'negócios ativos',
    pipelineTotal: 'pipeline total',
    todayVisits: 'Visitas de hoje',
    noVisits: 'Nenhuma visita agendada para hoje',
    pendingDocs: 'Documentos pendentes',
    noPendingDocs: 'Nenhum documento pendente',
    valueOpportunities: 'Oportunidades de valor',
    noOpportunities: 'Nenhuma oportunidade detectada',
    doneToday: 'Concluídos hoje',
    allClean: 'Nada pendente para executar.',
    viewCalendar: 'Ver agenda',
    viewDocs: 'Ver documentos',
    viewDeal: 'Ver negócio',
    timeAt: 'às',
  },
  en: {
    activeDeals: 'active deals',
    pipelineTotal: 'total pipeline',
    todayVisits: "Today's visits",
    noVisits: 'No visits scheduled for today',
    pendingDocs: 'Pending documents',
    noPendingDocs: 'No pending documents',
    valueOpportunities: 'Value opportunities',
    noOpportunities: 'No opportunities detected',
    doneToday: 'Done today',
    allClean: 'Nothing to execute.',
    viewCalendar: 'View calendar',
    viewDocs: 'View documents',
    viewDeal: 'View deal',
    timeAt: 'at',
  },
  es: {
    activeDeals: 'negocios activos',
    pipelineTotal: 'pipeline total',
    todayVisits: 'Visitas de hoy',
    noVisits: 'Sin visitas programadas para hoy',
    pendingDocs: 'Documentos pendientes',
    noPendingDocs: 'Sin documentos pendientes',
    valueOpportunities: 'Oportunidades de valor',
    noOpportunities: 'Sin oportunidades detectadas',
    doneToday: 'Hechas hoy',
    allClean: 'Nada pendiente para ejecutar.',
    viewCalendar: 'Ver agenda',
    viewDocs: 'Ver documentos',
    viewDeal: 'Ver negocio',
    timeAt: 'a las',
  },
}

interface RawDeal {
  leadId: string
  leadName: string
  stage: string
  value: number
  updatedAt: string
  phone?: string | null
}

interface RawVisit {
  id: string
  leadId: string | null
  leadName: string
  title: string
  time: string
}

interface RawDoc {
  id: string
  leadId: string | null
  leadName: string
  docName: string
  status: string
  sentAt: string | null
}

interface Props {
  deals: RawDeal[]
  visits: RawVisit[]
  docs: RawDoc[]
  doneCount: number
  orgId: string
  lang?: 'pt' | 'en' | 'es'
  currency?: string
  locale?: string
  actionedToday: Set<string>
  onMessageSent: (leadId: string) => void
}

function getDaysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function DoerTab({
  deals: rawDeals, visits, docs, doneCount, orgId,
  lang = 'pt', currency = 'BRL', locale = 'pt-BR',
  actionedToday, onMessageSent,
}: Props) {
  const [doneExpanded, setDoneExpanded] = useState(false)
  const [oppExpanded, setOppExpanded] = useState(true)
  const t = T[lang]

  // Enrich deals into DealItems
  const deals: DealItem[] = useMemo(() => {
    const pendingDocLeadIds = new Set(docs.map((d) => d.leadId).filter(Boolean))
    return rawDeals
      .filter((d) => !actionedToday.has(d.leadId))
      .map((d) => {
        const daysSinceActivity = getDaysSince(d.updatedAt)
        return {
          leadId: d.leadId,
          leadName: d.leadName,
          stage: d.stage,
          value: d.value,
          daysInStage: daysSinceActivity,
          daysSinceActivity,
          visitCount: 0,
          hasPendingDoc: pendingDocLeadIds.has(d.leadId),
          lastDocStatus: null,
          phone: d.phone || null,
          nextAction: null, // Computed inside DealCard via getNextAction
        }
      })
  }, [rawDeals, docs, actionedToday])

  // Filter visits/done by actioned
  const pendingVisits = visits.filter((v) => v.leadId && !actionedToday.has(v.leadId))
  const pendingDocs = docs.filter((d) => d.leadId && !actionedToday.has(d.leadId))

  // Value opportunities
  const opportunities = useMemo(() => {
    return getValueOpportunities(
      rawDeals.map((d) => ({
        id: d.leadId,
        name: d.leadName,
        stage: d.stage,
        total_em_vendas: d.value,
        updated_at: d.updatedAt,
        phone: d.phone || null,
      })),
      lang
    ).filter((o) => !actionedToday.has(o.leadId))
  }, [rawDeals, lang, actionedToday])

  const pipelineTotal = deals.reduce((sum, d) => sum + d.value, 0)
  const totalItems = deals.length + pendingVisits.length + pendingDocs.length + opportunities.length

  if (totalItems === 0 && doneCount === 0) {
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
      {deals.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <DollarSign size={14} style={{ color: 'var(--color-success)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
              {deals.length} {t.activeDeals}
            </span>
          </div>
          {pipelineTotal > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {t.pipelineTotal}: <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {formatPrice(pipelineTotal, currency, locale as 'pt-BR' | 'en-US' | 'es-CL')}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Done today badge */}
      {doneCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
            {doneCount} {t.doneToday}
          </span>
        </div>
      )}

      {/* Deal Pipeline Section */}
      {deals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} style={{ color: 'var(--color-success)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              Pipeline
            </p>
          </div>
          <div className="space-y-2">
            {deals.map((deal) => (
              <DealCard
                key={deal.leadId}
                item={deal}
                orgId={orgId}
                lang={lang}
                onMessageSent={onMessageSent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Today's Visits */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} style={{ color: '#0ea5e9' }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {t.todayVisits}
            {pendingVisits.length > 0 && (
              <span style={{ color: '#0ea5e9' }}> ({pendingVisits.length})</span>
            )}
          </p>
        </div>
        {pendingVisits.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            {pendingVisits.map((v) => {
              const timeStr = v.time
                ? new Date(v.time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <a
                  key={v.id}
                  href={`/dashboard/crm/${v.leadId}`}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {v.leadName}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {v.title || 'Visita'}{timeStr ? ` · ${t.timeAt} ${timeStr}` : ''}
                    </p>
                  </div>
                  <ArrowRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t.noVisits}</p>
        )}
        {pendingVisits.length > 0 && (
          <a
            href="/dashboard/calendar"
            className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium opacity-60 hover:opacity-100"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t.viewCalendar} <ArrowRight size={10} />
          </a>
        )}
      </div>

      {/* Pending Documents */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} style={{ color: '#f59e0b' }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {t.pendingDocs}
            {pendingDocs.length > 0 && (
              <span style={{ color: '#f59e0b' }}> ({pendingDocs.length})</span>
            )}
          </p>
        </div>
        {pendingDocs.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            {pendingDocs.map((d) => {
              const daysSinceSent = d.sentAt ? getDaysSince(d.sentAt) : 0
              return (
                <a
                  key={d.id}
                  href={`/dashboard/crm/${d.leadId}`}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {d.docName}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {d.leadName} · {d.status}{d.sentAt ? ` · ${daysSinceSent}d` : ''}
                    </p>
                  </div>
                  <ArrowRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t.noPendingDocs}</p>
        )}
        {pendingDocs.length > 0 && (
          <a
            href="/dashboard/documents"
            className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium opacity-60 hover:opacity-100"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t.viewDocs} <ArrowRight size={10} />
          </a>
        )}
      </div>

      {/* Value Opportunities */}
      <div>
        <button
          onClick={() => setOppExpanded(!oppExpanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <Lightbulb size={14} style={{ color: '#f59e0b' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {t.valueOpportunities}
            {opportunities.length > 0 && (
              <span style={{ color: '#f59e0b' }}> ({opportunities.length})</span>
            )}
          </span>
          <ChevronDown
            size={12}
            className="ml-auto transition-transform"
            style={{
              color: 'var(--color-text-tertiary)',
              transform: oppExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
        {oppExpanded && (
          opportunities.length > 0 ? (
            <div className="space-y-1.5 mt-2">
              {opportunities.map((opp) => (
                <div
                  key={opp.leadId}
                  className="flex items-start gap-2 p-2.5 rounded-lg"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}
                >
                  <Lightbulb size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {opp.suggestion}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {opp.suggestedMessage.slice(0, 100)}
                    </p>
                  </div>
                  <a
                    href={`/dashboard/crm/${opp.leadId}`}
                    className="flex-shrink-0 p-1 rounded hover:bg-white/5"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <ArrowRight size={12} />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.noOpportunities}</p>
          )
        )}
      </div>
    </div>
  )
}
