// @ts-nocheck
'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export default function CustomSelect({ value, onChange, options, placeholder, className, style }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={className || "w-full px-3 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]/50"}
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
          textAlign: 'left',
          ...style,
        }}
      >
        <span className="flex items-center justify-between gap-2">
          <span className={selected ? '' : 'opacity-50'}>
            {selected?.label || placeholder || 'Selecione...'}
          </span>
          <ChevronDown
            size={14}
            className="shrink-0 transition-transform"
            style={{
              color: 'var(--color-text-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl border shadow-xl overflow-hidden animate-fade-in"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full px-3 py-2.5 text-sm text-left flex items-center justify-between gap-2 transition-colors"
              style={{
                color: opt.value === value ? 'var(--color-primary)' : 'var(--color-text-primary)',
                background: opt.value === value ? 'var(--color-primary-subtle)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'var(--color-bg-hover)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = opt.value === value ? 'var(--color-primary-subtle)' : 'transparent'
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
