// app/dashboard/crm/components/DensityToggle.tsx
'use client'

interface DensityToggleProps {
  value: 'compact' | 'balanced' | 'detailed'
  onChange: (v: 'compact' | 'balanced' | 'detailed') => void
  labels: { compact: string; balanced: string; detailed: string }
}

export function DensityToggle({ value, onChange, labels }: DensityToggleProps) {
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
