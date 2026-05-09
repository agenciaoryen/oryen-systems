// app/dashboard/crm/components/PipelineMobileV3.tsx
'use client'

import { useState } from 'react'
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { PipelineCard } from './PipelineCard'

interface Lead {
  id: string
  name: string
  nome_empresa?: string
  email: string
  phone?: string
  stage?: string
  source?: string
  nicho?: string
  created_at: string
  updated_at?: string
  total_em_vendas?: number
  org_id?: string
  conversa_finalizada?: boolean
  score?: number
  score_label?: 'hot' | 'warm' | 'cold' | 'lost'
  assigned_to?: string
  assigned_to_name?: string
}

interface PipelineStage {
  id: string
  org_id: string
  name: string
  label: string
  color: string
  position: number
  is_active: boolean
  is_won: boolean
  is_lost: boolean
}

interface Tag {
  id: string
  org_id: string
  name: string
  color: string
}

interface LeadTag {
  lead_id: string
  tag_id: string
}

interface PipelineMobileV3Props {
  stages: PipelineStage[]
  stageLeads: Record<string, Lead[]>
  stageCounts: Record<string, number>
  stageSums: Record<string, number>
  leadTags: LeadTag[]
  tags: Tag[]
  density: 'compact' | 'balanced' | 'detailed'
  userCurrency: string
  onOpenLead: (id: string) => void
  onAddLead: () => void
  syncedLabel: string
  totalLeads: number
  totalValueFormatted: string
  filterCount: number
  onOpenFilters: () => void
  labels: {
    pipeline: string
    negócios: string
    filters: string
    noLeads: string
    add: string
  }
}

const STAGE_HEX: Record<string, string> = {
  gray: '#6B7280', blue: '#5A7AE6', orange: '#D98A30', purple: '#9568D0',
  indigo: '#6E6BD6', emerald: '#34B368', rose: '#D4506A', pink: '#D06090',
  yellow: '#D4A420', green: '#34B368', red: '#D95454', amber: '#F0A030',
  cyan: '#4AAAD6',
}

export function PipelineMobileV3({
  stages,
  stageLeads,
  stageCounts,
  stageSums,
  leadTags,
  tags,
  density,
  userCurrency,
  onOpenLead,
  onAddLead,
  syncedLabel,
  totalLeads,
  totalValueFormatted,
  filterCount,
  onOpenFilters,
  labels,
}: PipelineMobileV3Props) {
  const [stageIdx, setStageIdx] = useState(0)

  const stage = stages[stageIdx]
  const cards = stage ? (stageLeads[stage.name] || []) : []
  const stageTotal = stage ? (stageSums[stage.name] || 0) : 0

  const formatPriceLocal = (value: number) => {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: userCurrency, maximumFractionDigits: 0 }).format(value)
    } catch {
      return `${userCurrency} ${value.toFixed(0)}`
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-3.5 py-3 border-b border-border-subtle">
        <h1 className="font-display font-semibold text-[22px] tracking-[-0.025em] leading-tight text-text-primary">
          {labels.pipeline} <span className="font-light text-text-tertiary">/</span>{' '}
          <span className="text-text-secondary">{labels.negócios}</span>
        </h1>
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono text-[11px] text-text-tertiary inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {syncedLabel} · {totalLeads} ops · {totalValueFormatted}
          </span>
          <button
            onClick={onOpenFilters}
            className="h-[26px] px-2 inline-flex items-center gap-1 rounded-md border border-border text-[11px] text-text-secondary"
          >
            <Filter size={11} />
            {labels.filters}
            {filterCount > 0 && (
              <span className="font-mono text-[9px] bg-accent text-text-on-accent rounded-full px-1 font-semibold">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stage pager */}
      <div className="px-3.5 py-3 border-b border-border-subtle bg-bg-surface">
        <div className="flex items-center justify-between mb-2.5">
          <button
            onClick={() => setStageIdx(Math.max(0, stageIdx - 1))}
            disabled={stageIdx === 0}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="text-center flex-1">
            <div className="inline-flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-text-tertiary font-medium">
                {String(stageIdx + 1).padStart(2, '0')}
                <span className="text-text-muted"> / {String(stages.length).padStart(2, '0')}</span>
              </span>
              <span className="font-display font-semibold text-sm tracking-[-0.01em] text-text-primary">
                {stage?.label || ''}
              </span>
            </div>
            <div className="font-mono text-[10.5px] text-text-tertiary mt-0.5">
              {stageCounts[stage?.name] || 0} ops · {formatPriceLocal(stageTotal)}
            </div>
          </div>

          <button
            onClick={() => setStageIdx(Math.min(stages.length - 1, stageIdx + 1))}
            disabled={stageIdx === stages.length - 1}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Stage dots */}
        <div className="flex items-center justify-center gap-1.5">
          {stages.map((s, i) => {
            const active = i === stageIdx
            const hex = STAGE_HEX[s.color] || STAGE_HEX.gray
            return (
              <button
                key={s.id}
                onClick={() => setStageIdx(i)}
                className="rounded-full transition-all"
                style={{
                  height: 4,
                  width: active ? 24 : 8,
                  background: active ? hex : 'var(--color-border-strong)',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5">
        {cards.map(lead => (
          <PipelineCard
            key={lead.id}
            lead={lead}
            leadTags={leadTags}
            tags={tags}
            density={density}
            userCurrency={userCurrency}
            onClick={() => onOpenLead(lead.id)}
            onDragStart={() => {}}
            onDragEnd={() => {}}
          />
        ))}

        {cards.length === 0 && (
          <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg text-text-muted text-xs italic">
            {labels.noLeads}
            <button
              onClick={onAddLead}
              className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-border text-text-secondary text-[11px]"
            >
              <Plus size={11} />
              {labels.add}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
