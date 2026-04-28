// Tipos compartilhados pelos provedores de busca (Serper hoje, Apollo/Places depois).

export interface RawLead {
  // Identificação
  nome_empresa: string | null
  nome_pessoa?: string | null

  // Contato
  email?: string | null
  phone?: string | null
  whatsapp?: string | null

  // Online
  website?: string | null
  instagram?: string | null
  facebook?: string | null
  linkedin?: string | null

  // Localização
  city?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null

  // Metadados da busca
  source: 'serper_search' | 'serper_maps' | 'serper_instagram' | 'apollo' | 'places' | 'site_scrape'
  source_url?: string | null
  score?: number | null      // rating do Maps, etc
}

export type SearchStrategy = 'general' | 'instagram' | 'google_maps'

export interface SearchOptions {
  query: string
  strategy: SearchStrategy
  hl?: string  // language (es, pt-br, en)
  gl?: string  // country (cl, br, ar, mx, co, pe)
  num?: number // resultados desejados
}

export interface SearchProvider {
  name: string
  search(opts: SearchOptions): Promise<RawSerperResponse>
}

// Estrutura bruta do Serper — compartilhada por search/maps/places
export interface RawSerperResponse {
  endpoint: string
  raw: any              // o JSON original do Serper, intacto
  hasResults: boolean
  errorMessage?: string
}
