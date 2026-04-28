// Config por país pro hunter — DDI, formato de telefone, TLD do site,
// idioma de busca, preposição. Copiado e simplificado do n8n.

export interface CountryConfig {
  name: string                    // Nome do país pra usar em queries ("Chile")
  ddi: string                     // Código do país (56, 55, etc)
  mobilePrefix: string            // Prefixo móvel (9 no CL/BR, 1 no MX)
  localLength: number             // Tamanho do número local sem DDI/prefix
  fullLength: number              // Tamanho total esperado (DDI+ ... +local)
  hasDDD?: boolean                // Brasil tem DDD; CL/AR/MX/CO/PE não
  dddLength?: number              // Tamanho do DDD
  tld: string                     // .cl, .com.br, etc
  searchLang: string              // hl do Serper: es, pt-br, en
  preposition: string             // 'en' (es) ou 'em' (pt) pra montar query
  phoneRegexLocal?: RegExp        // regex pra extrair phones no formato local
}

export const COUNTRY_CONFIG: Record<string, CountryConfig> = {
  CL: {
    name: 'Chile',
    ddi: '56',
    mobilePrefix: '9',
    localLength: 8,
    fullLength: 11,        // 56 + 9 + 8
    tld: '.cl',
    searchLang: 'es',
    preposition: 'en',
    phoneRegexLocal: /(?:\+?56)?\s?9\s?\d{4}\s?\d{4}/g,
  },
  BR: {
    name: 'Brasil',
    ddi: '55',
    mobilePrefix: '9',
    localLength: 8,
    fullLength: 13,        // 55 + 2 DDD + 9 + 8
    hasDDD: true,
    dddLength: 2,
    tld: '.com.br',
    searchLang: 'pt-br',
    preposition: 'em',
    phoneRegexLocal: /(?:\+?55)?\s?\(?\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4}/g,
  },
  AR: {
    name: 'Argentina',
    ddi: '54',
    mobilePrefix: '9',
    localLength: 10,
    fullLength: 13,
    tld: '.com.ar',
    searchLang: 'es',
    preposition: 'en',
    phoneRegexLocal: /(?:\+?54)?\s?9?\s?\d{2,4}[-\s]?\d{4}[-\s]?\d{4}/g,
  },
  MX: {
    name: 'México',
    ddi: '52',
    mobilePrefix: '1',
    localLength: 10,
    fullLength: 13,
    tld: '.com.mx',
    searchLang: 'es',
    preposition: 'en',
    phoneRegexLocal: /(?:\+?52)?\s?1?\s?\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/g,
  },
  CO: {
    name: 'Colombia',
    ddi: '57',
    mobilePrefix: '3',
    localLength: 10,
    fullLength: 12,
    tld: '.com.co',
    searchLang: 'es',
    preposition: 'en',
    phoneRegexLocal: /(?:\+?57)?\s?3\d{2}[-\s]?\d{3}[-\s]?\d{4}/g,
  },
  PE: {
    name: 'Perú',
    ddi: '51',
    mobilePrefix: '9',
    localLength: 8,
    fullLength: 11,
    tld: '.pe',
    searchLang: 'es',
    preposition: 'en',
    phoneRegexLocal: /(?:\+?51)?\s?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/g,
  },
}

export function getCountryConfig(country?: string | null): CountryConfig {
  const c = (country || 'CL').toUpperCase()
  return COUNTRY_CONFIG[c] || COUNTRY_CONFIG.CL
}
