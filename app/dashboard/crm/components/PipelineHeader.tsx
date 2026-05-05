// app/dashboard/crm/components/PipelineHeader.tsx
'use client'

import type { LucideIcon } from 'lucide-react'

interface Stat {
  value: string | number
  label: string
  /** Se true, valor sai em accent (amber) — use para o valor total do pipeline */
  highlight?: boolean
}

interface Action {
  label: string
  icon?: LucideIcon
  onClick: () => void
}

interface PipelineHeaderProps {
  /** Ex: "03" — índice editorial à esquerda do kicker (opcional) */
  index?: string
  /** Ex: "DOSSIÊ" — primeira palavra do kicker (opcional) */
  kicker?: string
  /** Ex: "CRM" — última palavra do kicker, depois do separador (opcional) */
  section?: string
  /** Primeira parte do título, à esquerda da barra */
  titleLeft: string
  /** Segunda parte do título, à direita da barra */
  titleRight: string
  /** Stats inline à direita do título — recomendo 2-3 itens */
  stats?: Stat[]
  /** Texto pequeno abaixo do título (ex: "Sincronizado em tempo real") */
  syncedLabel?: string
  /** Botão principal — sai em accent (amber) */
  primaryAction?: Action
  /** Ícones de ação secundária — fundo neutro */
  secondaryActions?: Action[]
}

export function PipelineHeader({
  index,
  kicker,
  section,
  titleLeft,
  titleRight,
  stats = [],
  syncedLabel,
  primaryAction,
  secondaryActions = [],
}: PipelineHeaderProps) {
  const showKicker = !!(kicker || index || section)

  return (
    <header className="flex flex-col gap-4 px-6 py-5 border-b border-border-subtle">
      {/* Linha 1: kicker + ações (só aparece se kicker/index/section forem fornecidos) */}
      {showKicker && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono text-caption uppercase tracking-uppercase text-text-tertiary">
            {index && (
              <>
                <span className="text-text-secondary">{index}</span>
                <span aria-hidden className="text-text-tertiary opacity-50">·</span>
              </>
            )}
            {kicker && <span>{kicker}</span>}
            {section && (
              <>
                <span aria-hidden className="text-text-tertiary opacity-50">·</span>
                <span>{section}</span>
              </>
            )}
            {syncedLabel && (
              <>
                <span aria-hidden className="text-text-tertiary opacity-50 ml-2">·</span>
                <span className="flex items-center gap-1.5 normal-case tracking-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
                  {syncedLabel}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {secondaryActions.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  title={action.label}
                  aria-label={action.label}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                >
                  {Icon && <Icon size={16} strokeWidth={1.75} />}
                </button>
              )
            })}
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-accent text-text-on-accent font-medium text-body-sm hover:bg-accent-hover transition-colors shadow-accent"
              >
                {primaryAction.icon && <primaryAction.icon size={16} strokeWidth={2} />}
                {primaryAction.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Linha 2: título + stats + ações (quando sem kicker, ações ficam aqui) */}
      <div className="flex items-end justify-between gap-8 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-semibold text-h1 text-text-primary leading-h1 tracking-h1">
            {titleLeft}
            <span className="mx-3 font-light text-text-tertiary">/</span>
            <span className="text-text-secondary font-normal">{titleRight}</span>
          </h1>
          {!showKicker && syncedLabel && (
            <span className="flex items-center gap-1.5 font-mono text-caption text-text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
              {syncedLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {stats.length > 0 && (
            <ul className="flex items-center gap-6">
              {stats.map((stat, i) => (
                <li key={i} className="flex flex-col items-end">
                  <span
                    className={`font-mono text-h4 leading-tight ${
                      stat.highlight ? 'text-accent' : 'text-text-primary'
                    }`}
                  >
                    {stat.value}
                  </span>
                  <span className="font-mono text-caption uppercase tracking-uppercase text-text-tertiary mt-0.5">
                    {stat.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!showKicker && (secondaryActions.length > 0 || primaryAction) && (
            <div className="flex items-center gap-2">
              {secondaryActions.map((action, i) => {
                const Icon = action.icon
                return (
                  <button
                    key={i}
                    onClick={action.onClick}
                    title={action.label}
                    aria-label={action.label}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                  >
                    {Icon && <Icon size={16} strokeWidth={1.75} />}
                  </button>
                )
              })}
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-accent text-text-on-accent font-medium text-body-sm hover:bg-accent-hover transition-colors shadow-accent"
                >
                  {primaryAction.icon && <primaryAction.icon size={16} strokeWidth={2} />}
                  {primaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
