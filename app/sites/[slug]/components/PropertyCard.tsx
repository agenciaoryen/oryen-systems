// Site público — Card de imóvel
'use client'

import Link from 'next/link'
import { formatPrice, formatArea, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/properties/constants'
import { trackPropertyEvent } from '@/lib/properties/tracker'

interface PropertyCardProps {
  property: any
  slug: string
  currency?: string
}

export default function PropertyCard({ property, slug, currency }: PropertyCardProps) {
  const cover = property.images?.find((img: any) => img.is_cover)?.url || property.images?.[0]?.url || null

  const handleClick = () => {
    trackPropertyEvent(slug, property.id, 'click')
  }

  return (
    <Link
      href={`/sites/${slug}/properties/${property.slug || property.id}`}
      className="group h-full flex flex-col rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
      style={{ background: 'var(--color-bg-base)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)' }}
      onClick={handleClick}
    >
      {/* Imagem */}
      <div className="relative aspect-[4/3] overflow-hidden shrink-0" style={{ background: 'var(--color-bg-surface)' }}>
        {cover ? (
          <img
            src={cover}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" style={{ color: 'var(--color-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}

        {/* Transaction badge */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-bold"
          style={{ background: 'var(--site-primary)', color: 'var(--color-text-on-primary)' }}
        >
          {TRANSACTION_TYPES[property.transaction_type]?.pt || property.transaction_type}
        </div>

        {/* Price */}
        {property.price && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg backdrop-blur-sm font-bold text-sm" style={{ background: 'var(--color-bg-overlay)', color: '#FFFFFF' }}>
            {formatPrice(property.price, currency)}
          </div>
        )}
      </div>

      {/* Info */}
      <div
        className="p-5 border-t flex-1 flex flex-col"
        style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {PROPERTY_TYPES[property.property_type]?.pt || property.property_type}
          {property.address_neighborhood && (
            <span> • {property.address_neighborhood}</span>
          )}
        </p>
        <h3
          className="font-bold text-base line-clamp-2 mb-3 transition-colors min-h-[2.75rem]"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {property.title}
        </h3>

        {/* Features — sempre no rodapé do card (mt-auto) */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium pt-3 mt-auto border-t"
          style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
        >
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="whitespace-nowrap">{property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}</span>
          )}
          {property.parking_spots > 0 && (
            <span className="whitespace-nowrap">{property.parking_spots} {property.parking_spots === 1 ? 'vaga' : 'vagas'}</span>
          )}
          {property.total_area && (
            <span className="whitespace-nowrap">{formatArea(property.total_area)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
