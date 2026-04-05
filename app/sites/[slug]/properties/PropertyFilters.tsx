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
        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
        >
          <option value="">Todos</option>
          {Object.entries(PROPERTY_TYPES).map(([key, labels]) => (
            <option key={key} value={key}>{labels.pt}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Transação</label>
        <select
          value={transaction}
          onChange={(e) => setTransaction(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
        >
          <option value="">Todas</option>
          {Object.entries(TRANSACTION_TYPES).map(([key, labels]) => (
            <option key={key} value={key}>{labels.pt}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Quartos (mín.)</label>
        <select
          value={minBedrooms}
          onChange={(e) => setMinBedrooms(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
        >
          <option value="">Qualquer</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}+</option>
          ))}
        </select>
      </div>

      <button
        onClick={applyFilters}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'var(--site-primary)' }}
      >
        Filtrar
      </button>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all"
        >
          Limpar
        </button>
      )}
    </div>
  )
}
