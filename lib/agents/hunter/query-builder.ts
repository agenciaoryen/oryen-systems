// Monta a query do Serper baseada em estratégia + cidade + segmento.
// Cada estratégia tem um padrão diferente que o Serper otimiza.

import type { CountryConfig } from './country-config'
import type { SearchStrategy } from '../sources/types'

export interface QueryParams {
  city: string
  segment: string
  strategy: SearchStrategy
  country: CountryConfig
  keywords?: string[]
  excludeKeywords?: string[]
  hasPhone?: boolean             // adiciona "telefone" / "teléfono" na query
}

export interface BuiltQuery {
  query: string
  strategy: SearchStrategy
  description: string            // explicação humana da query, pra log
}

export function buildQuery(params: QueryParams): BuiltQuery {
  const { city, segment, strategy, country, keywords = [], excludeKeywords = [], hasPhone } = params

  const phoneWord = country.searchLang === 'pt-br' ? 'telefone' : 'teléfono'
  const extraKeywords = keywords.length > 0 ? ' ' + keywords.join(' ') : ''
  const exclusions =
    excludeKeywords.length > 0 ? ' ' + excludeKeywords.map((k) => `-${k}`).join(' ') : ''

  switch (strategy) {
    case 'instagram': {
      // Busca perfis comerciais no IG.
      // Snippet do Google traz bio/contato dos perfis em muitos casos.
      const query = `site:instagram.com ${segment} ${city}${extraKeywords}${exclusions}`
      return {
        query,
        strategy,
        description: `IG perfis ${segment} em ${city}`,
      }
    }

    case 'google_maps': {
      // /maps endpoint — Serper devolve `places[]` estruturado com phone, website, rating
      const query = `${segment} ${city}${extraKeywords}${exclusions}`
      return {
        query,
        strategy,
        description: `Maps: ${segment} ${city}`,
      }
    }

    case 'general':
    default: {
      // Busca orgânica genérica. Inclui "telefone" se hasPhone pra forçar resultados com contato
      const phoneTail = hasPhone ? ` ${phoneWord}` : ''
      const query = `${segment} ${country.preposition} ${city}, ${country.name}${extraKeywords}${phoneTail}${exclusions}`
      return {
        query,
        strategy,
        description: `Geral: ${segment} ${country.preposition} ${city}`,
      }
    }
  }
}
