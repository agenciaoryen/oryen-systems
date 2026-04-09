// lib/properties/zipLookup.ts
// Busca de endereço por código postal — suporta múltiplos países

type CountryCode = 'BR' | 'US' | 'UK' | 'ES' | 'PT' | 'MX' | 'CO' | 'CL'

export interface ZipResult {
  street: string
  neighborhood: string
  city: string
  state: string
  complement: string
}

// Mapeia currency → country code para inferir o país
const CURRENCY_TO_COUNTRY: Record<string, CountryCode> = {
  BRL: 'BR',
  USD: 'US',
  GBP: 'UK',
  EUR: 'PT', // default EUR → Portugal (pode ser ES também)
  MXN: 'MX',
  COP: 'CO',
  CLP: 'CL',
}

// Código ISO do Zippopotam.us para cada país
const ZIPPOPOTAM_CODES: Record<CountryCode, string> = {
  BR: 'BR',
  US: 'US',
  UK: 'GB',
  ES: 'ES',
  PT: 'PT',
  MX: 'MX',
  CO: 'CO',
  CL: 'CL',
}

// Links para busca manual de CEP/código postal por país
const ZIP_LOOKUP_URLS: Record<CountryCode, string> = {
  BR: 'https://buscacepinter.correios.com.br/app/endereco/index.php',
  US: 'https://tools.usps.com/zip-code-lookup.htm',
  UK: 'https://www.royalmail.com/find-a-postcode',
  ES: 'https://www.correos.es/es/es/herramientas/codigos-postales',
  PT: 'https://www.ctt.pt/feacp_2/app/open/postalCodeSearch/postalCodeSearch.jspx',
  MX: 'https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/Consulta.aspx',
  CO: 'https://visor.codigopostal.gov.co/472/visor/',
  CL: 'https://www.correos.cl/web/guest/codigo-postal',
}

export function getCountryFromCurrency(currency: string): CountryCode {
  return CURRENCY_TO_COUNTRY[currency] || 'BR'
}

export function getZipLookupUrl(country: CountryCode): string {
  return ZIP_LOOKUP_URLS[country]
}

export function getZipLabel(country: CountryCode): { pt: string; en: string; es: string } {
  switch (country) {
    case 'BR': return { pt: 'CEP', en: 'ZIP (CEP)', es: 'CEP' }
    case 'US': return { pt: 'ZIP Code', en: 'ZIP Code', es: 'ZIP Code' }
    case 'UK': return { pt: 'Postcode', en: 'Postcode', es: 'Postcode' }
    case 'MX': return { pt: 'Código Postal', en: 'Postal Code', es: 'Código Postal' }
    case 'CO': return { pt: 'Código Postal', en: 'Postal Code', es: 'Código Postal' }
    case 'CL': return { pt: 'Código Postal', en: 'Postal Code', es: 'Código Postal' }
    default: return { pt: 'Código Postal', en: 'Postal Code', es: 'Código Postal' }
  }
}

export function getZipMask(country: CountryCode): { maxLength: number; placeholder: string; format: (v: string) => string } {
  switch (country) {
    case 'BR':
      return {
        maxLength: 9,
        placeholder: '00000-000',
        format: (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2'),
      }
    case 'US':
      return {
        maxLength: 10,
        placeholder: '12345',
        format: (v) => v.replace(/\D/g, '').slice(0, 5),
      }
    case 'UK':
      return {
        maxLength: 8,
        placeholder: 'SW1A 1AA',
        format: (v) => v.toUpperCase(),
      }
    case 'PT':
      return {
        maxLength: 8,
        placeholder: '1000-001',
        format: (v) => v.replace(/\D/g, '').replace(/(\d{4})(\d)/, '$1-$2'),
      }
    case 'ES':
      return {
        maxLength: 5,
        placeholder: '28001',
        format: (v) => v.replace(/\D/g, '').slice(0, 5),
      }
    case 'MX':
      return {
        maxLength: 5,
        placeholder: '01000',
        format: (v) => v.replace(/\D/g, '').slice(0, 5),
      }
    case 'CO':
      return {
        maxLength: 6,
        placeholder: '110111',
        format: (v) => v.replace(/\D/g, '').slice(0, 6),
      }
    case 'CL':
      return {
        maxLength: 7,
        placeholder: '8320000',
        format: (v) => v.replace(/\D/g, '').slice(0, 7),
      }
    default:
      return {
        maxLength: 10,
        placeholder: '',
        format: (v) => v,
      }
  }
}

// ViaCEP — Brasil (mais completo que Zippopotam)
async function lookupBrazil(zip: string): Promise<ZipResult | null> {
  const raw = zip.replace(/\D/g, '')
  if (raw.length !== 8) return null

  const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
  const data = await res.json()
  if (data.erro) return null

  return {
    street: data.logradouro || '',
    neighborhood: data.bairro || '',
    city: data.localidade || '',
    state: data.uf || '',
    complement: data.complemento || '',
  }
}

// Zippopotam.us — genérico para todos os outros países
async function lookupGeneric(zip: string, country: CountryCode): Promise<ZipResult | null> {
  const code = ZIPPOPOTAM_CODES[country]
  const raw = country === 'UK' ? zip.replace(/\s+/g, '%20') : zip.replace(/\D/g, '')

  const res = await fetch(`https://api.zippopotam.us/${code}/${raw}`)
  if (!res.ok) return null

  const data = await res.json()
  const place = data.places?.[0]
  if (!place) return null

  return {
    street: '',  // Zippopotam não retorna rua
    neighborhood: '',
    city: place['place name'] || '',
    state: place['state abbreviation'] || place['state'] || '',
    complement: '',
  }
}

export async function lookupZip(zip: string, country: CountryCode): Promise<ZipResult | null> {
  try {
    if (country === 'BR') {
      return await lookupBrazil(zip)
    }
    return await lookupGeneric(zip, country)
  } catch {
    return null
  }
}
