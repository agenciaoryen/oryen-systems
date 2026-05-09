'use client'

import { useState } from 'react'
import { DollarSign, Clock, ArrowRight, MessageSquare, Calendar, FileText } from 'lucide-react'
import QuickMessagePanel from './QuickMessagePanel'
import { getNextAction } from '@/lib/fkd/doer-rules'
import type { DealItem } from '@/lib/fkd/types'

const T = {
  pt: {
    sendMsg: 'Enviar msg',
    schedule: 'Agendar',
    sendDoc: 'Doc',
    viewDeal: 'Ver negócio',
    stalled: 'Estagnado há',
    days: 'd',
    daysInStage: 'd no estágio',
    noActivity: 'sem atividade',
    stage: 'estágio',
  },
  en: {
    sendMsg: 'Send msg',
    schedule: 'Schedule',
    sendDoc: 'Doc',
    viewDeal: 'View deal',
    stalled: 'Stalled for',
    days: 'd',
    daysInStage: 'd in stage',
    noActivity: 'no activity',
    stage: 'stage',
  },
  es: {
    sendMsg: 'Enviar msg',
    schedule: 'Agendar',
    sendDoc: 'Doc',
    viewDeal: 'Ver negocio',
    stalled: 'Estancado por',
    days: 'd',
    daysInStage: 'd en etapa',
    noActivity: 'sin actividad',
    stage: 'etapa',
  },
}

interface Props {
  item: DealItem
  orgId: string
  lang?: 'pt' | 'en' | 'es'
  onMessageSent: (leadId: string) => void
}

export default function DealCard({ item, orgId, lang = 'pt', onMessageSent }: Props) {
  const [showMessage, setShowMessage] = useState(false)
  const t = T[lang]

  const nextAction = item.nextAction || getNextAction(
    {
      stage: item.stage,
      daysInStage: item.daysInStage,
      daysSinceActivity: item.daysSinceActivity,
      dealValue: item.value,
      visitCount: item.visitCount,
      hasPendingDoc: item.hasPendingDoc,
      lastDocStatus: item.lastDocStatus || undefined,
    },
    item.leadName,
    lang
  )

  const isStalled = item.daysSinceActivity >= 7

  const formatValue = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
    return String(v)
  }

  return (
    <div
      className="p-3 rounded-xl transition-all duration-300 hover:-translate-y-px"
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header: Lead + Value + Stage */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {item.leadName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
              }}
            >
              {item.stage}
            </span>
            {item.daysInStage > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {item.daysInStage}{t.daysInStage}
              </span>
            )}
          </div>
        </div>
        <span className="text-sm font-black flex-shrink-0" style={{ color: 'var(--color-success)' }}>
          {item.value > 0 ? formatValue(item.value) : '—'}
        </span>
      </div>

      {/* Stalled Warning */}
      {isStalled && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md mb-2 text-[10px]"
          style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
        >
          <Clock size={10} style={{ color: '#f59e0b' }} />
          <span style={{ color: '#f59e0b' }}>{t.stalled} {item.daysSinceActivity}{t.days}</span>
        </div>
      )}

      {/* Next Action Suggestion */}
      <div className="flex items-start gap-1.5 mb-2.5">
        <span className="text-[10px] mt-px flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {nextAction.priority === 'high' ? '🔴' : nextAction.priority === 'medium' ? '🟡' : '🟢'}
        </span>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {nextAction.suggestion}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMessage(!showMessage)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-200 active:scale-95"
          style={{
            background: showMessage ? 'var(--color-primary-subtle)' : 'var(--color-primary)',
            color: showMessage ? 'var(--color-primary)' : '#fff',
          }}
        >
          <MessageSquare size={12} /> {t.sendMsg}
        </button>
        <a
          href={`/dashboard/calendar/new?lead_id=${item.leadId}`}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          <Calendar size={12} />
        </a>
        <a
          href={`/dashboard/documents/new?lead_id=${item.leadId}`}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          <FileText size={12} />
        </a>
        <a
          href={`/dashboard/crm/${item.leadId}`}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors hover:bg-white/5 ml-auto"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          {t.viewDeal} <ArrowRight size={10} />
        </a>
      </div>

      {/* QuickMessagePanel */}
      <QuickMessagePanel
        leadId={item.leadId}
        leadName={item.leadName}
        phone={item.phone}
        orgId={orgId}
        suggestedMessage={nextAction.suggestedMessage}
        lang={lang}
        isExpanded={showMessage}
        onSent={() => {
          setShowMessage(false)
          onMessageSent(item.leadId)
        }}
        onCancel={() => setShowMessage(false)}
      />
    </div>
  )
}
