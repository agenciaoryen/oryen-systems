// lib/properties/constants.ts

type Lang = 'pt' | 'en' | 'es'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE IMÓVEL
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
// AMENIDADES
// ═══════════════════════════════════════════════════════════════════════════════

export const AMENITIES: { key: string; label: Record<Lang, string> }[] = [
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
]

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

export function formatPrice(value: number | null, lang: Lang = 'pt'): string {
  if (!value) return '—'
  if (lang === 'en') return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

export function formatArea(value: number | null): string {
  if (!value) return '—'
  return `${value.toLocaleString('pt-BR')} m²`
}
