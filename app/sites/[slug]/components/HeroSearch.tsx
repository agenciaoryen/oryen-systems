'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/properties/constants'
import { SITE_T, type SiteLang } from '../i18n'

interface HeroSearchProps {
  slug: string
  neighborhoods: string[]
  lang?: SiteLang
}

export default function HeroSearch({ slug, neighborhoods, lang = 'pt' }: HeroSearchProps) {
  const t = SITE_T[lang]
  const router = useRouter()
  const [transaction, setTransaction] = useState('')
  const [type, setType] = useState('')
  const [neighborhood, setNeighborhood] = useState('')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (transaction) params.set('transaction', transaction)
    if (type) params.set('type', type)
    if (neighborhood) params.set('neighborhood', neighborhood)
    router.push(`/sites/${slug}/properties?${params.toString()}`)
  }

  const selectStyle: React.CSSProperties = {
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  }

  return (
    <div
      className="rounded-2xl p-2 sm:p-3 backdrop-blur-md shadow-2xl"
      style={{ background: 'color-mix(in srgb, var(--color-bg-elevated) 85%, transparent)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Transação */}
        <select
          value={transaction}
          onChange={e => setTransaction(e.target.value)}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-medium outline-none cursor-pointer appearance-none"
          style={selectStyle}
        >
          <option value="">{t.searchTransaction}</option>
          {Object.entries(TRANSACTION_TYPES).map(([key, labels]) => (
            <option key={key} value={key}>{labels[lang]}</option>
          ))}
        </select>

        {/* Tipo */}
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-medium outline-none cursor-pointer appearance-none"
          style={selectStyle}
        >
          <option value="">{t.searchType}</option>
          {Object.entries(PROPERTY_TYPES).map(([key, labels]) => (
            <option key={key} value={key}>{labels[lang]}</option>
          ))}
        </select>

        {/* Bairro */}
        {neighborhoods.length > 0 && (
          <select
            value={neighborhood}
            onChange={e => setNeighborhood(e.target.value)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium outline-none cursor-pointer appearance-none"
            style={selectStyle}
          >
            <option value="">{t.searchNeighborhood}</option>
            {neighborhoods.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}

        {/* Buscar */}
        <button
          onClick={handleSearch}
          className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 shadow-lg flex items-center justify-center gap-2"
          style={{ background: 'var(--site-primary)', color: 'var(--color-text-on-primary)' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {t.searchBtn}
        </button>
      </div>
    </div>
  )
}
