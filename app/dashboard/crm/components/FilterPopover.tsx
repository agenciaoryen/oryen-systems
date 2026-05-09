// app/dashboard/crm/components/FilterPopover.tsx
'use client'

interface TeamMember {
  id: string
  full_name: string
}

interface FilterPopoverProps {
  open: boolean

  // Período
  daysFilter: string
  onDaysFilterChange: (v: string) => void

  // Responsável
  filterAssigned: string
  onFilterAssignedChange: (v: string) => void
  teamMembers: TeamMember[]

  // IA
  aiFilter: string
  onAiFilterChange: (v: string) => void

  // Nicho (ai_agency only)
  isAiAgency?: boolean
  filterNicho?: string
  onFilterNichoChange?: (v: string) => void
  nichoOptions?: string[]
  hasUnassignedNicho?: boolean

  // Labels
  labels: {
    period: string
    days7: string
    days30: string
    days90: string
    daysAll: string
    assigned: string
    all: string
    unassigned: string
    source: string
    nicheTagsAi: string
    allNichos: string
    aiActive: string
    aiPaused: string
    staleLead: string
    sourceOptions: string[]
  }
}

export function FilterPopover({
  open,
  daysFilter,
  onDaysFilterChange,
  filterAssigned,
  onFilterAssignedChange,
  teamMembers,
  aiFilter,
  onAiFilterChange,
  isAiAgency,
  filterNicho,
  onFilterNichoChange,
  nichoOptions,
  hasUnassignedNicho,
  labels,
}: FilterPopoverProps) {
  if (!open) return null

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-4 md:px-6 py-4 border-t border-dashed border-border-subtle"
      style={{ animation: 'fadeIn 160ms ease' }}
    >
      {/* Período */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[9.5px] uppercase tracking-uppercase text-text-muted">{labels.period}</span>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={daysFilter === '7'} onClick={() => onDaysFilterChange('7')}>{labels.days7}</FilterPill>
          <FilterPill active={daysFilter === '30'} onClick={() => onDaysFilterChange('30')}>{labels.days30}</FilterPill>
          <FilterPill active={daysFilter === '90'} onClick={() => onDaysFilterChange('90')}>{labels.days90}</FilterPill>
          <FilterPill active={daysFilter === 'all'} onClick={() => onDaysFilterChange('all')}>{labels.daysAll}</FilterPill>
        </div>
      </div>

      {/* Responsável */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[9.5px] uppercase tracking-uppercase text-text-muted">{labels.assigned}</span>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={filterAssigned === 'all'} onClick={() => onFilterAssignedChange('all')}>{labels.all}</FilterPill>
          {teamMembers.map(m => (
            <FilterPill key={m.id} active={filterAssigned === m.id} onClick={() => onFilterAssignedChange(m.id)}>
              {m.full_name}
            </FilterPill>
          ))}
          <FilterPill active={filterAssigned === 'unassigned'} onClick={() => onFilterAssignedChange('unassigned')}>{labels.unassigned}</FilterPill>
        </div>
      </div>

      {/* Origem (visual only por enquanto — sem filter state) */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[9.5px] uppercase tracking-uppercase text-text-muted">{labels.source}</span>
        <div className="flex flex-wrap gap-1.5">
          {(labels.sourceOptions || []).map(src => (
            <FilterPill key={src} onClick={() => {}}>{src}</FilterPill>
          ))}
        </div>
      </div>

      {/* Nicho/Tags/IA */}
      {(isAiAgency || true) && (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-uppercase text-text-muted">{labels.nicheTagsAi}</span>
          <div className="flex flex-wrap gap-1.5">
            {isAiAgency && filterNicho !== undefined && onFilterNichoChange && (
              <>
                <FilterPill active={filterNicho === 'all'} onClick={() => onFilterNichoChange('all')}>{labels.allNichos}</FilterPill>
                {hasUnassignedNicho && (
                  <FilterPill active={filterNicho === '__unassigned__'} onClick={() => onFilterNichoChange('__unassigned__')}>{labels.unassigned}</FilterPill>
                )}
                {(nichoOptions || []).map(n => (
                  <FilterPill key={n} active={filterNicho === n} onClick={() => onFilterNichoChange(n)}>{n}</FilterPill>
                ))}
              </>
            )}
            {!isAiAgency && (
              <>
                <FilterPill active={aiFilter === 'all'} onClick={() => onAiFilterChange('all')}>{labels.all}</FilterPill>
                <FilterPill active={aiFilter === 'active'} onClick={() => onAiFilterChange('active')}>{labels.aiActive}</FilterPill>
                <FilterPill active={aiFilter === 'paused'} onClick={() => onAiFilterChange('paused')}>{labels.aiPaused}</FilterPill>
                <FilterPill active={false} onClick={() => {}}>{labels.staleLead}</FilterPill>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  children,
  active = false,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] border transition-colors"
      style={{
        background: active ? 'var(--color-bg-hover)' : 'var(--color-bg-elevated)',
        borderColor: active ? 'var(--color-border-strong)' : 'var(--color-border)',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
      }}
    >
      {children}
    </button>
  )
}
