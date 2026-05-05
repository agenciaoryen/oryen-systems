// app/dashboard/crm/components/PipelineColumn.tsx
'use client'

import type { ReactNode, DragEvent } from 'react'

// Mapa de cor do stage → hex (alinhado com STAGE_HEX no page.tsx)
const STAGE_HEX: Record<string, string> = {
  gray: '#6B7280', blue: '#5A7AE6', orange: '#D98A30', purple: '#9568D0',
  indigo: '#6E6BD6', emerald: '#34B368', rose: '#D4506A', pink: '#D06090',
  yellow: '#D4A420', green: '#34B368', red: '#D95454', amber: '#F0A030',
  cyan: '#4AAAD6',
}

interface PipelineColumnProps {
  /** Ex: "01", "02" — índice mono à esquerda do nome */
  index: string
  /** Nome do estágio (vem de pipeline_stages.label) */
  label: string
  /** Cor do estágio (vem de pipeline_stages.color, ex: "blue", "amber") */
  color: string
  /** Total de leads na coluna */
  count: number
  /** Soma formatada (ex: "R$ 248.000") */
  sumLabel: string
  /** Cards do Kanban — geralmente PipelineCard + ScrollSentinel */
  children: ReactNode
  /** Handlers de drop — passar direto do page.tsx */
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void
  onDrop?: (e: DragEvent<HTMLDivElement>) => void
}

export function PipelineColumn({
  index,
  label,
  color,
  count,
  sumLabel,
  children,
  onDragOver,
  onDrop,
}: PipelineColumnProps) {
  const stageHex = STAGE_HEX[color] || STAGE_HEX.gray

  return (
    <div
      className="flex flex-col w-80 shrink-0 bg-surface border border-border-subtle rounded-lg overflow-hidden"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Faixa colorida do stage */}
      <div className="h-[2px] w-full" style={{ background: stageHex }} aria-hidden />

      {/* Cabeçalho da coluna */}
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-border-subtle">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption text-text-tertiary tracking-uppercase">
              {index}
            </span>
            <h2 className="font-display font-semibold text-h5 text-text-primary truncate">
              {label}
            </h2>
          </div>
          <span className="font-mono text-body-sm text-text-secondary">{sumLabel}</span>
        </div>

        <span className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-bg-hover text-text-secondary font-mono text-caption">
          {count}
        </span>
      </header>

      {/* Lista de cards (scroll vertical interno) */}
      <div className="flex-1 flex flex-col gap-2 px-3 py-3 overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </div>
  )
}
