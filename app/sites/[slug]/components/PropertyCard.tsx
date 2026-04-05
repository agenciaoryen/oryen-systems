// Site público — Card de imóvel

import Link from 'next/link'
import { formatPrice, formatArea, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/properties/constants'

interface PropertyCardProps {
  property: any
  slug: string
}

export default function PropertyCard({ property, slug }: PropertyCardProps) {
  const cover = property.images?.find((img: any) => img.is_cover)?.url || property.images?.[0]?.url || null

  return (
    <Link
      href={`/sites/${slug}/properties/${property.slug || property.id}`}
      className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300"
    >
      {/* Imagem */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {cover ? (
          <img
            src={cover}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="40" height="40" className="text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}

        {/* Transaction badge */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-bold text-white"
          style={{ background: 'var(--site-primary)' }}
        >
          {TRANSACTION_TYPES[property.transaction_type]?.pt || property.transaction_type}
        </div>

        {/* Price */}
        {property.price && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white font-bold text-sm">
            {formatPrice(property.price)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">
          {PROPERTY_TYPES[property.property_type]?.pt || property.property_type}
          {property.address_neighborhood && ` • ${property.address_neighborhood}`}
        </p>
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
          {property.title}
        </h3>

        {/* Features */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span>{property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}</span>
          )}
          {property.parking_spots > 0 && (
            <span>{property.parking_spots} {property.parking_spots === 1 ? 'vaga' : 'vagas'}</span>
          )}
          {property.total_area && (
            <span>{formatArea(property.total_area)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
