// Site público — Filtros de imóveis (Client Component)
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/properties/constants'
import CustomSelect from '@/app/dashboard/components/CustomSelect'
import { SITE_T, type SiteLang } from '../i18n'

interface PropertyFiltersProps {
  slug: string
  neighborhoods?: string[]
  lang?: SiteLang
}

export default function PropertyFilters({ slug, neighborhoods = [], lang = 'pt' }: PropertyFiltersProps) {
  const t = SITE_T[lang]
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
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t.filterTypeLabel}</label>
        <CustomSelect
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: '', label: t.filterAll },
            ...Object.entries(PROPERTY_TYPES).map(([key, labels]) => ({ value: key, label: labels[lang] })),
          ]}
        />
      </div>

      <div className="w-40">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t.filterTransactionLabel}</label>
        <CustomSelect
          value={transaction}
          onChange={(v) => setTransaction(v)}
          options={[
            { value: '', label: t.filterAllFem },
            ...Object.entries(TRANSACTION_TYPES).map(([key, labels]) => ({ value: key, label: labels[lang] })),
          ]}
        />
      </div>

      {neighborhoods.length > 0 && (
        <div className="w-44">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t.filterNeighborhoodLabel}</label>
          <CustomSelect
            value={neighborhood}
            onChange={(v) => setNeighborhood(v)}
            options={[
              { value: '', label: t.filterAll },
              ...neighborhoods.map((n) => ({ value: n, label: n })),
            ]}
          />
        </div>
      )}

      <div className="w-36">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t.filterMinBedroomsLabel}</label>
        <CustomSelect
          value={minBedrooms}
          onChange={(v) => setMinBedrooms(v)}
          options={[
            { value: '', label: t.filterAny },
            ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` })),
          ]}
        />
      </div>

      <button
        onClick={applyFilters}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'var(--site-primary)', color: 'var(--color-text-on-primary)' }}
      >
        {t.filterApply}
      </button>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)' }}
        >
          {t.filterClear}
        </button>
      )}
    </div>
  )
}
