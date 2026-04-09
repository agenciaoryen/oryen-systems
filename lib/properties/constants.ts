// lib/properties/constants.ts

type Lang = 'pt' | 'en' | 'es'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE PROPRIEDADE
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPERTY_TYPES: Record<string, Record<Lang, string>> = {
  apartment: { pt: 'Apartamento', en: 'Apartment', es: 'Apartamento' },
  house: { pt: 'Casa', en: 'House', es: 'Casa' },
  commercial: { pt: 'Comercial', en: 'Commercial', es: 'Comercial' },
  land: { pt: 'Terreno', en: 'Land', es: 'Terreno' },
  rural: { pt: 'Rural', en: 'Rural', es: 'Rural' },
  other: { pt: 'Outro', en: 'Other', es: 'Otro' },
}

export const TRANSACTION_TYPES: Record<string, Record<Lang, string>> = {
  sale: { pt: 'Venda', en: 'Sale', es: 'Venta' },
  rent: { pt: 'Aluguel', en: 'Rent', es: 'Alquiler' },
  sale_or_rent: { pt: 'Venda ou Aluguel', en: 'Sale or Rent', es: 'Venta o Alquiler' },
}

export const PROPERTY_STATUSES: Record<string, Record<Lang, string>> = {
  draft: { pt: 'Rascunho', en: 'Draft', es: 'Borrador' },
  active: { pt: 'Ativo', en: 'Active', es: 'Activo' },
  sold: { pt: 'Vendido', en: 'Sold', es: 'Vendido' },
  rented: { pt: 'Alugado', en: 'Rented', es: 'Alquilado' },
  inactive: { pt: 'Inativo', en: 'Inactive', es: 'Inactivo' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// AMENIDADES — organizadas por tipo de propriedade
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_AMENITIES: { key: string; label: Record<Lang, string> }[] = [
  // Residencial (apartment, house)
  { key: 'pool', label: { pt: 'Piscina', en: 'Pool', es: 'Piscina' } },
  { key: 'gym', label: { pt: 'Academia', en: 'Gym', es: 'Gimnasio' } },
  { key: 'playground', label: { pt: 'Playground', en: 'Playground', es: 'Parque infantil' } },
  { key: 'gourmet_area', label: { pt: 'Espaço gourmet', en: 'Gourmet area', es: 'Área gourmet' } },
  { key: 'barbecue', label: { pt: 'Churrasqueira', en: 'Barbecue', es: 'Parrilla' } },
  { key: 'sauna', label: { pt: 'Sauna', en: 'Sauna', es: 'Sauna' } },
  { key: 'party_room', label: { pt: 'Salão de festas', en: 'Party room', es: 'Salón de fiestas' } },
  { key: 'elevator', label: { pt: 'Elevador', en: 'Elevator', es: 'Ascensor' } },
  { key: 'doorman', label: { pt: 'Portaria 24h', en: '24h Doorman', es: 'Portería 24h' } },
  { key: 'security', label: { pt: 'Segurança', en: 'Security', es: 'Seguridad' } },
  { key: 'garden', label: { pt: 'Jardim', en: 'Garden', es: 'Jardín' } },
  { key: 'balcony', label: { pt: 'Sacada/Varanda', en: 'Balcony', es: 'Balcón' } },
  { key: 'furnished', label: { pt: 'Mobiliado', en: 'Furnished', es: 'Amueblado' } },
  { key: 'air_conditioning', label: { pt: 'Ar condicionado', en: 'Air conditioning', es: 'Aire acondicionado' } },
  { key: 'laundry', label: { pt: 'Lavanderia', en: 'Laundry', es: 'Lavandería' } },
  { key: 'pet_friendly', label: { pt: 'Aceita pets', en: 'Pet friendly', es: 'Acepta mascotas' } },
  { key: 'solar_energy', label: { pt: 'Energia solar', en: 'Solar energy', es: 'Energía solar' } },
  { key: 'fireplace', label: { pt: 'Lareira', en: 'Fireplace', es: 'Chimenea' } },
  { key: 'closet', label: { pt: 'Closet', en: 'Walk-in closet', es: 'Vestidor' } },
  { key: 'home_office', label: { pt: 'Home office', en: 'Home office', es: 'Oficina en casa' } },
  // Terreno (land)
  { key: 'paved_access', label: { pt: 'Acesso asfaltado', en: 'Paved access', es: 'Acceso pavimentado' } },
  { key: 'water_supply', label: { pt: 'Água encanada', en: 'Water supply', es: 'Agua potable' } },
  { key: 'sewage', label: { pt: 'Esgoto/Fossa', en: 'Sewage system', es: 'Alcantarillado' } },
  { key: 'electricity', label: { pt: 'Energia elétrica', en: 'Electricity', es: 'Electricidad' } },
  { key: 'natural_gas', label: { pt: 'Gás encanado', en: 'Natural gas', es: 'Gas natural' } },
  { key: 'flat_terrain', label: { pt: 'Terreno plano', en: 'Flat terrain', es: 'Terreno plano' } },
  { key: 'fenced', label: { pt: 'Cercado/Murado', en: 'Fenced', es: 'Cercado' } },
  { key: 'corner_lot', label: { pt: 'Esquina', en: 'Corner lot', es: 'Esquina' } },
  { key: 'gated_community', label: { pt: 'Condomínio fechado', en: 'Gated community', es: 'Comunidad cerrada' } },
  { key: 'street_lighting', label: { pt: 'Iluminação pública', en: 'Street lighting', es: 'Alumbrado público' } },
  // Comercial (commercial)
  { key: 'reception', label: { pt: 'Recepção', en: 'Reception', es: 'Recepción' } },
  { key: 'meeting_room', label: { pt: 'Sala de reunião', en: 'Meeting room', es: 'Sala de reuniones' } },
  { key: 'loading_dock', label: { pt: 'Doca de carga', en: 'Loading dock', es: 'Muelle de carga' } },
  { key: 'handicap_access', label: { pt: 'Acessibilidade', en: 'Handicap access', es: 'Accesibilidad' } },
  // Rural
  { key: 'well', label: { pt: 'Poço artesiano', en: 'Artesian well', es: 'Pozo artesiano' } },
  { key: 'corral', label: { pt: 'Curral', en: 'Corral', es: 'Corral' } },
  { key: 'barn', label: { pt: 'Galpão', en: 'Barn', es: 'Granero' } },
  { key: 'fruit_trees', label: { pt: 'Pomar', en: 'Fruit trees', es: 'Frutales' } },
  { key: 'river_access', label: { pt: 'Acesso a rio/lago', en: 'River/lake access', es: 'Acceso a río/lago' } },
]

// Quais amenidades mostrar por tipo de propriedade
const SHARED_AMENITIES = ['pool', 'security', 'garden', 'solar_energy', 'gated_community']
const RESIDENTIAL_AMENITIES = [
  ...SHARED_AMENITIES, 'gym', 'playground', 'gourmet_area', 'barbecue', 'sauna',
  'party_room', 'elevator', 'doorman', 'balcony', 'furnished', 'air_conditioning',
  'laundry', 'pet_friendly', 'fireplace', 'closet', 'home_office',
]

export const AMENITIES_BY_TYPE: Record<string, string[]> = {
  apartment: RESIDENTIAL_AMENITIES,
  house: RESIDENTIAL_AMENITIES,
  land: [
    'paved_access', 'water_supply', 'sewage', 'electricity', 'natural_gas',
    'flat_terrain', 'fenced', 'corner_lot', 'gated_community', 'street_lighting',
    'security', 'garden',
  ],
  commercial: [
    ...SHARED_AMENITIES, 'elevator', 'air_conditioning', 'doorman', 'furnished',
    'reception', 'meeting_room', 'loading_dock', 'handicap_access',
  ],
  rural: [
    'paved_access', 'water_supply', 'electricity', 'fenced', 'well',
    'corral', 'barn', 'fruit_trees', 'river_access', 'pool', 'garden', 'solar_energy',
  ],
  other: RESIDENTIAL_AMENITIES,
}

// Quais campos numéricos mostrar por tipo de propriedade
export const NUMERIC_FIELDS_BY_TYPE: Record<string, string[]> = {
  apartment: ['bedrooms', 'suites', 'bathrooms', 'parking_spots'],
  house: ['bedrooms', 'suites', 'bathrooms', 'parking_spots'],
  land: [],
  commercial: ['bathrooms', 'parking_spots'],
  rural: ['bedrooms', 'bathrooms', 'parking_spots'],
  other: ['bedrooms', 'suites', 'bathrooms', 'parking_spots'],
}

// Retrocompatibilidade — exportar lista completa como AMENITIES
export const AMENITIES = ALL_AMENITIES

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADOS BRASILEIROS
// ═══════════════════════════════════════════════════════════════════════════════

export const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function formatPrice(value: number | null, currency?: string): string {
  if (!value) return '—'
  const cur = currency || 'BRL'
  const localeMap: Record<string, string> = {
    BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE', CLP: 'es-CL', ARS: 'es-AR',
    MXN: 'es-MX', COP: 'es-CO', PEN: 'es-PE', UYU: 'es-UY', PYG: 'es-PY',
  }
  const locale = localeMap[cur] || 'pt-BR'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${cur} ${value.toLocaleString()}`
  }
}

export function formatArea(value: number | null): string {
  if (!value) return '—'
  return `${value.toLocaleString('pt-BR')} m²`
}
