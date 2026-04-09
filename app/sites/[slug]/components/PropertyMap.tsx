'use client'

interface PropertyMapProps {
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  title?: string
}

export default function PropertyMap({ latitude, longitude, address, title }: PropertyMapProps) {
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
      <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Localização</h2>
      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--color-border-subtle)' }}>
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
          width="100%"
          height="350"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={title ? `Localização - ${title}` : 'Localização do imóvel'}
        />
      </div>
    </div>
  )
}
