'use client'

import { ChevronDown, ChevronUp, User } from 'lucide-react'
import { useState } from 'react'
import { formatPrice } from '@/lib/format'

const TRANSLATIONS = {
  pt: { title: 'Contribuição por Corretor', noData: 'Sem dados de equipe' },
  en: { title: 'Broker Contribution', noData: 'No team data' },
  es: { title: 'Contribución por Corredor', noData: 'Sin datos de equipo' },
}

type Lang = keyof typeof TRANSLATIONS

interface BrokerData {
  broker_id: string
  broker_name: string
  value: number
}

interface Props {
  data: BrokerData[]
  unit: string
  targetValue: number
  color: string
  lang?: Lang
  currency?: string
}

function formatValue(value: number, unit: string, currency: string): string {
  if (unit === 'currency') return formatPrice(value, currency, 'pt-BR')
  if (unit === 'percentage') return `${Math.round(value * 10) / 10}%`
  if (unit === 'minutes') return `${Math.round(value)}min`
  return Math.round(value).toLocaleString('pt-BR')
}

export default function BrokerBreakdown({ data, unit, targetValue, color, lang = 'pt', currency = 'BRL' }: Props) {
  const t = TRANSLATIONS[lang]
  const [expanded, setExpanded] = useState(false)

  if (!data || data.length === 0) return null

  const sorted = [...data].sort((a, b) => b.value - a.value)
  const total = sorted.reduce((sum, b) => sum + b.value, 0)

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
        style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-elevated)' }}
      >
        <span>{t.title}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-3" style={{ background: 'var(--color-bg-surface)' }}>
          {sorted.map((broker) => {
            const pct = total > 0 ? (broker.value / total) * 100 : 0
            return (
              <div key={broker.broker_id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <User size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {broker.broker_name}
                    </span>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                    {formatValue(broker.value, unit, currency)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
