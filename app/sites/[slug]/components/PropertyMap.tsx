'use client'

import { SITE_T, type SiteLang } from '../i18n'

interface PropertyMapProps {
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  title?: string
  lang?: SiteLang
}

export default function PropertyMap({ latitude, longitude, address, title, lang = 'pt' }: PropertyMapProps) {
  const t = SITE_T[lang]
  // Montar query do mapa: prioriza lat/lng, senão usa endereço
  let mapQuery = ''
  if (latitude && longitude) {
    mapQuery = `${latitude},${longitude}`
  } else if (address) {
    mapQuery = address
  }

  if (!mapQuery) return null

  return (
    <div>
      <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t.propertyLocation}</h2>
      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
          width="100%"
          height="350"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={title ? `${t.propertyLocation} - ${title}` : t.propertyLocation}
        />
      </div>
    </div>
  )
}
