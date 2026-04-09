// Site público — Filtros de imóveis (Client Component)
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/properties/constants'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

interface PropertyFiltersProps {
  slug: string
  neighborhoods?: string[]
}

export default function PropertyFilters({ slug, neighborhoods = [] }: PropertyFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [type, setType] = useState(searchParams.get('type') || '')
  const [transaction, setTransaction] = useState(searchParams.get('transaction') || '')
  const [neighborhood, setNeighborhood] = useState(searchParams.get('neighborhood') || '')
  const [minBedrooms, setMinBedrooms] = useState(searchParams.get('min_bedrooms') || '')

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (transaction) params.set('transaction', transaction)
    if (neighborhood) params.set('neighborhood', neighborhood)
    if (minBedrooms) params.set('min_bedrooms', minBedrooms)
    router.push(`/sites/${slug}/properties?${params.toString()}`)
  }

  const clearFilters = () => {
    setType('')
    setTransaction('')
    setNeighborhood('')
    setMinBedrooms('')
    router.push(`/sites/${slug}/properties`)
  }

  const hasFilters = type || transaction || neighborhood || minBedrooms

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="w-40">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Tipo</label>
        <CustomSelect
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: '', label: 'Todos' },
            ...Object.entries(PROPERTY_TYPES).map(([key, labels]) => ({ value: key, label: labels.pt })),
          ]}
        />
      </div>

      <div className="w-40">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Transação</label>
        <CustomSelect
          value={transaction}
          onChange={(v) => setTransaction(v)}
          options={[
            { value: '', label: 'Todas' },
            ...Object.entries(TRANSACTION_TYPES).map(([key, labels]) => ({ value: key, label: labels.pt })),
          ]}
        />
      </div>

      {neighborhoods.length > 0 && (
        <div className="w-44">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Bairro</label>
          <CustomSelect
            value={neighborhood}
            onChange={(v) => setNeighborhood(v)}
            options={[
              { value: '', label: 'Todos' },
              ...neighborhoods.map((n) => ({ value: n, label: n })),
            ]}
          />
        </div>
      )}

      <div className="w-36">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Quartos (mín.)</label>
        <CustomSelect
          value={minBedrooms}
          onChange={(v) => setMinBedrooms(v)}
          options={[
            { value: '', label: 'Qualquer' },
            ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` })),
          ]}
        />
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
