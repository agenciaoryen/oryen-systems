// app/dashboard/components/UsageBar.tsx
'use client'

interface UsageBarProps {
  label: string
  current: number
  limit: number
  unit?: string
  monthly?: boolean
  monthlyLabel?: string
}

export default function UsageBar({ label, current, limit, unit, monthly, monthlyLabel }: UsageBarProps) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const barColor = isAtLimit
    ? 'var(--color-error)'
    : isNearLimit
    ? 'var(--color-accent)'
    : 'var(--color-primary)'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}{monthly ? ` (${monthlyLabel || 'mês'})` : ''}</span>
        <span style={{ color: isAtLimit ? 'var(--color-error)' : 'var(--color-text-tertiary)' }}>
          {current.toLocaleString()}{' / '}
          {isUnlimited ? '∞' : limit.toLocaleString()}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: isUnlimited ? '0%' : `${percentage}%`,
            background: barColor,
          }}
        />
      </div>
    </div>
  )
}
