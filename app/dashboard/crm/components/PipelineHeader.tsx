// app/dashboard/crm/components/PipelineHeader.tsx
'use client'

import type { LucideIcon } from 'lucide-react'
import { Search, Filter, ChevronDown } from 'lucide-react'

interface Stat {
  value: string | number
  label: string
  highlight?: boolean
}

interface Action {
  label: string
  icon?: LucideIcon
  onClick: () => void
}

interface PipelineHeaderProps {
  titleLeft: string
  titleRight: string
  syncedLabel?: string
  stats?: Stat[]

  // Search
  search: string
  onSearchChange: (s: string) => void
  searchPlaceholder: string

  // Temperature filter
  tempFilter: 'all' | 'hot' | 'warm' | 'cold'
  onTempFilterChange: (t: 'all' | 'hot' | 'warm' | 'cold') => void
  tempCounts: { hot: number; warm: number; cold: number; total: number }

  // Density
  density: 'compact' | 'balanced' | 'detailed'
  onDensityChange: (d: 'compact' | 'balanced' | 'detailed') => void

  // View
  viewMode: 'list' | 'kanban'
  onViewModeChange: (v: 'list' | 'kanban') => void

  // Advanced filters
  activeFilterCount: number
  filterPopoverOpen: boolean
  onToggleFilterPopover: () => void

  // Actions
  primaryAction?: Action
  secondaryActions?: Action[]

  // Labels
  exportLabel?: string
  importLabel?: string
  newLeadLabel: string
  fullscreenLabel: string
  exitFullscreenLabel: string
  isFullscreen: boolean
  onToggleFullscreen: () => void
  listViewLabel: string
  kanbanViewLabel: string
  densityLabels: { compact: string; balanced: string; detailed: string }
  tempLabels: { all: string; hot: string; warm: string; cold: string }
  filtersLabel: string
  onExport?: () => void
  onImport?: () => void
}

export function PipelineHeader({
  titleLeft,
  titleRight,
  syncedLabel,
  stats = [],
  search,
  onSearchChange,
  searchPlaceholder,
  tempFilter,
  onTempFilterChange,
  tempCounts,
  density,
  onDensityChange,
  viewMode,
  onViewModeChange,
  activeFilterCount,
  filterPopoverOpen,
  onToggleFilterPopover,
  primaryAction,
  secondaryActions = [],
  exportLabel,
  importLabel,
  newLeadLabel,
  fullscreenLabel,
  exitFullscreenLabel,
  isFullscreen,
  onToggleFullscreen,
  listViewLabel,
  kanbanViewLabel,
  densityLabels,
  tempLabels,
  filtersLabel,
  onExport,
  onImport,
}: PipelineHeaderProps) {
  const tempPills = [
    { id: 'all' as const,  label: tempLabels.all,  count: tempCounts.total },
    { id: 'hot' as const,  label: tempLabels.hot,  count: tempCounts.hot,  color: '#D95454' },
    { id: 'warm' as const, label: tempLabels.warm, count: tempCounts.warm, color: 'var(--color-accent)' },
    { id: 'cold' as const, label: tempLabels.cold, count: tempCounts.cold, color: 'var(--color-primary)' },
  ]

  return (
    <header className="flex flex-col px-4 md:px-6 pt-5 pb-0 border-b border-border-subtle">
      {/* Row 1: Title + stats + actions */}
      <div className="flex items-end justify-between gap-6 flex-wrap pb-3.5">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="font-display font-semibold text-h1 text-text-primary leading-h1 tracking-h1">
            {titleLeft}
            <span className="mx-3 font-light text-text-tertiary">/</span>
            <span className="text-text-secondary font-normal">{titleRight}</span>
          </h1>
          {syncedLabel && (
            <div className="flex items-center gap-2 font-mono text-caption text-text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
              {syncedLabel}
              {stats.length > 0 && (
                <>
                  <span className="text-text-tertiary opacity-50">·</span>
                  {stats.map((stat, i) => (
                    <span key={i}>
                      <span className={stat.highlight ? 'text-accent' : 'text-text-primary'}>{stat.value}</span>
                      {' '}{stat.label.toLowerCase()}
                      {i < stats.length - 1 && <span className="text-text-tertiary opacity-50"> · </span>}
                    </span>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onExport && (
            <button onClick={onExport} className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-border-subtle text-text-secondary text-body-sm hover:bg-bg-hover hover:text-text-primary transition-colors">
              {exportLabel || 'Exportar'}
            </button>
          )}
          {onImport && (
            <button onClick={onImport} className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-border-subtle text-text-secondary text-body-sm hover:bg-bg-hover hover:text-text-primary transition-colors">
              {importLabel || 'Importar CSV'}
            </button>
          )}
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

      {/* Row 2: Search + temperature filter + advanced filters + density + view */}
      <div className="flex items-center gap-2.5 pb-3.5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[420px] h-[34px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-full pl-9 pr-3 rounded-lg text-body-sm outline-none transition-all bg-surface border border-border text-text-primary focus:border-border-focus"
            style={{ boxShadow: 'none' }}
          />
        </div>

        {/* Temperature segmented */}
        <div className="inline-flex rounded-lg p-0.5 border border-border bg-surface h-[34px]">
          {tempPills.map(pill => {
            const active = tempFilter === pill.id
            return (
              <button
                key={pill.id}
                onClick={() => onTempFilterChange(pill.id)}
                className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-md text-xs transition-colors"
                style={{
                  background: active ? 'var(--color-bg-hover)' : 'transparent',
                  color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {pill.color && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pill.color }} />
                )}
                {pill.label}
                <span className="font-mono text-[10px] opacity-60">{pill.count}</span>
              </button>
            )
          })}
        </div>

        {/* Advanced filters */}
        <button
          onClick={onToggleFilterPopover}
          className="h-[34px] px-3 inline-flex items-center gap-1.5 rounded-lg text-xs border transition-colors"
          style={{
            background: filterPopoverOpen ? 'var(--color-accent-subtle)' : 'var(--color-bg-surface)',
            borderColor: filterPopoverOpen ? 'var(--color-accent)' : 'var(--color-border)',
            color: filterPopoverOpen ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}
        >
          <Filter size={13} />
          {filtersLabel}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent text-text-on-accent font-mono font-semibold text-[10px] px-1">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={12} className={filterPopoverOpen ? 'rotate-180' : ''} />
        </button>

        {/* Density + View toggles (right side) */}
        <div className="ml-auto flex items-center gap-2">
          <DensityToggle value={density} onChange={onDensityChange} labels={densityLabels} />
          <ViewToggle value={viewMode} onChange={onViewModeChange} labels={{ list: listViewLabel, kanban: kanbanViewLabel }} />
        </div>
      </div>
    </header>
  )
}

// ─── DensityToggle ──────────────────────────────────────────────────────────────

function DensityToggle({
  value,
  onChange,
  labels,
}: {
  value: 'compact' | 'balanced' | 'detailed'
  onChange: (v: 'compact' | 'balanced' | 'detailed') => void
  labels: { compact: string; balanced: string; detailed: string }
}) {
  const opts = [
    { id: 'compact' as const,  label: labels.compact },
    { id: 'balanced' as const, label: labels.balanced },
    { id: 'detailed' as const, label: labels.detailed },
  ]

  return (
    <div className="inline-flex rounded-lg p-0.5 border border-border bg-surface h-[34px]">
      {opts.map(o => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            title={o.label}
            className="h-[28px] px-2.5 rounded-md text-[11px] transition-colors"
            style={{
              background: active ? 'var(--color-bg-hover)' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontWeight: active ? 500 : 400,
              letterSpacing: '0.01em',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── ViewToggle ─────────────────────────────────────────────────────────────────

function ViewToggle({
  value,
  onChange,
  labels,
}: {
  value: 'list' | 'kanban'
  onChange: (v: 'list' | 'kanban') => void
  labels: { list: string; kanban: string }
}) {
  const opts = [
    { id: 'list' as const,   label: labels.list },
    { id: 'kanban' as const, label: labels.kanban },
  ]

  return (
    <div className="inline-flex rounded-lg p-0.5 border border-border bg-surface h-[34px]">
      {opts.map(o => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="h-[28px] px-3 rounded-md text-xs font-medium transition-colors"
            style={{
              background: active ? 'var(--color-text-primary)' : 'transparent',
              color: active ? 'var(--color-bg-base)' : 'var(--color-text-muted)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

