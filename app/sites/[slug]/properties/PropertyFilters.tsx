// Site público — Filtros de imóveis (Client Component)
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/properties/constants'

interface PropertyFiltersProps {
  slug: string
}

export default function PropertyFilters({ slug }: PropertyFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [type, setType] = useState(searchParams.get('type') || '')
  const [transaction, setTransaction] = useState(searchParams.get('transaction') || '')
  const [minBedrooms, setMinBedrooms] = useState(searchParams.get('min_bedrooms') || '')

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (transaction) params.set('transaction', transaction)
    if (minBedrooms) params.set('min_bedrooms', minBedrooms)
    router.push(`/sites/${slug}/properties?${params.toString()}`)
  }

  const clearFilters = () => {
    setType('')
    setTransaction('')
    setMinBedrooms('')
    router.push(`/sites/${slug}/properties`)
  }

  const hasFilters = type || transaction || minBedrooms

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 cursor-pointer"
          style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-elevated)' }}
        >
          <option value="">Todos</option>
          {Object.entries(PROPERTY_TYPES).map(([key, labels]) => (
            <option key={key} value={key}>{labels.pt}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Transação</label>
        <select
          value={transaction}
          onChange={(e) => setTransaction(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 cursor-pointer"
          style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-elevated)' }}
        >
          <option value="">Todas</option>
          {Object.entries(TRANSACTION_TYPES).map(([key, labels]) => (
            <option key={key} value={key}>{labels.pt}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Quartos (mín.)</label>
        <select
          value={minBedrooms}
          onChange={(e) => setMinBedrooms(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 cursor-pointer"
          style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-elevated)' }}
        >
          <option value="">Qualquer</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}+</option>
          ))}
        </select>
      </div>

      <button
        onClick={applyFilters}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'var(--site-primary)', color: 'var(--color-text-primary)' }}
      >
        Filtrar
      </button>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ color: 'var(--color-text-muted)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)' }}
        >
          Limpar
        </button>
      )}
    </div>
  )
}
