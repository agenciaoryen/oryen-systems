'use client'

import { useState } from 'react'
import { ArrowRight, Eye, MessageSquare, X as XIcon } from 'lucide-react'
import QuickMessagePanel from './QuickMessagePanel'
import { getHealthScore, getHealthColor, getHealthLabel } from '@/lib/fkd/health'
import type { ActionItem } from '@/lib/fkd/types'

const T = {
  pt: {
    send: 'Enviar msg',
    view: 'Ver lead',
    dismiss: 'Ignorar',
    daysAgo: 'd atrás',
    noActivity: 'sem atividade',
    todayAt: 'hoje às',
  },
  en: {
    send: 'Send msg',
    view: 'View lead',
    dismiss: 'Dismiss',
    daysAgo: 'd ago',
    noActivity: 'no activity',
    todayAt: 'today at',
  },
  es: {
    send: 'Enviar msg',
    view: 'Ver lead',
    dismiss: 'Ignorar',
    daysAgo: 'd atrás',
    noActivity: 'sin actividad',
    todayAt: 'hoy a las',
  },
}

interface Props {
  item: ActionItem
  orgId: string
  lang?: 'pt' | 'en' | 'es'
  onActioned: (leadId: string) => void
  onDismiss: (leadId: string) => void
}

export default function ActionCard({ item, orgId, lang = 'pt', onActioned, onDismiss }: Props) {
  const [showMessage, setShowMessage] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const t = T[lang]
  const health = getHealthScore(item.daysSinceContact)
  const healthColor = getHealthColor(health)
  const healthLabel = getHealthLabel(health, lang)

  if (dismissed) return null

  const priorityBorder = {
    urgent: 'rgba(239, 68, 68, 0.5)',
    important: 'rgba(245, 158, 11, 0.5)',
    opportunity: 'rgba(79, 111, 255, 0.5)',
  }[item.priority]

  return (
    <div
      className="p-3 rounded-xl transition-all duration-300 hover:-translate-y-px"
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid ${priorityBorder}`,
        borderLeft: `3px solid ${priorityBorder}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
            style={{ background: healthColor }}
            title={healthLabel}
          />
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {item.leadName}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {item.context}
              {item.daysSinceContact > 0 && (
                <span style={{ color: healthColor }}> · {item.daysSinceContact}{t.daysAgo}</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <XIcon size={12} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMessage(!showMessage)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-200 active:scale-95"
          style={{
            background: showMessage ? 'var(--color-primary-subtle)' : 'var(--color-primary)',
            color: showMessage ? 'var(--color-primary)' : '#fff',
          }}
        >
          <MessageSquare size={12} /> {showMessage ? t.view : t.send}
        </button>
        <a
          href={`/dashboard/crm/${item.leadId}`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          <Eye size={12} /> {t.view} <ArrowRight size={10} />
        </a>
      </div>

      {/* QuickMessagePanel */}
      <QuickMessagePanel
        leadId={item.leadId}
        leadName={item.leadName}
        phone={item.phone}
        orgId={orgId}
        suggestedMessage={item.suggestedMessage}
        lang={lang}
        isExpanded={showMessage}
        onSent={() => {
          setShowMessage(false)
          onActioned(item.leadId)
        }}
        onCancel={() => setShowMessage(false)}
      />
    </div>
  )
}
