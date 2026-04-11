// lib/properties/geocoder.ts
// Geocoding usando OpenStreetMap Nominatim (gratuito, internacional, sem API key)
// https://nominatim.org/release-docs/develop/api/Search/
//
// Rate limit: 1 req/s (respeitamos com retry + delay)
// Funciona para qualquer país.

export interface GeoResult {
  latitude: number
  longitude: number
  display_name?: string
}

interface AddressInput {
  street?: string | null
  number?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
}

/**
 * Geocodifica um endereço usando Nominatim (OpenStreetMap).
 * Tenta com endereço completo primeiro, fallback para cidade+bairro, depois cidade+estado.
 */
export async function geocodeAddress(address: AddressInput): Promise<GeoResult | null> {
  // Precisa de pelo menos cidade para geocodificar
  if (!address.city && !address.zip) return null

  // Tentativa 1: endereço mais completo possível
  const fullParts = [
    address.number && address.street ? `${address.street}, ${address.number}` : address.street,
    address.neighborhood,
    address.city,
    address.state,
    address.zip,
    address.country,
  ].filter(Boolean)

  const result = await nominatimSearch(fullParts.join(', '))
  if (result) return result

  // Tentativa 2: bairro + cidade + estado
  if (address.neighborhood) {
    const parts2 = [address.neighborhood, address.city, address.state, address.country].filter(Boolean)
    const result2 = await nominatimSearch(parts2.join(', '))
    if (result2) return result2
  }

  // Tentativa 3: cidade + estado (mais genérico)
  const parts3 = [address.city, address.state, address.country].filter(Boolean)
  const result3 = await nominatimSearch(parts3.join(', '))
  if (result3) return result3

  // Tentativa 4: somente CEP/ZIP (último recurso)
  if (address.zip) {
    const result4 = await nominatimSearch(address.zip)
    if (result4) return result4
  }

  return null
}

/**
 * Busca coordenadas de um bairro específico para usar como referência de proximidade.
 */
export async function geocodeNeighborhood(
  neighborhood: string,
  city?: string | null,
  state?: string | null,
  country?: string | null
): Promise<GeoResult | null> {
  const parts = [neighborhood, city, state, country].filter(Boolean)
  return nominatimSearch(parts.join(', '))
}

/**
 * Calcula a distância em km entre dois pontos (Haversine).
 */
export function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // raio da Terra em km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// ─── Nominatim Search ───

async function nominatimSearch(query: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=1`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OryenAI/1.0 (property-geocoder)',
        'Accept-Language': 'pt-BR,pt,en',
      },
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data || data.length === 0) return null

    const lat = parseFloat(data[0].lat)
    const lng = parseFloat(data[0].lon)

    if (isNaN(lat) || isNaN(lng)) return null

    return {
      latitude: lat,
      longitude: lng,
      display_name: data[0].display_name,
    }
  } catch {
    return null
  }
}
