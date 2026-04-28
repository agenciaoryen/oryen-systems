// Cliente do Serper.dev com round-robin de múltiplas API keys.
//
// Configurar SERPER_API_KEYS no .env como CSV:
//   SERPER_API_KEYS=key1,key2,key3
//
// Quando uma key estoura (401/402/429), automaticamente tenta a próxima.
// Mantém cursor in-memory pra distribuir as chamadas — não fica preso numa.

import type { SearchOptions, RawSerperResponse, SearchStrategy } from './types'

const ENDPOINTS: Record<SearchStrategy, string> = {
  general: 'https://google.serper.dev/search',
  instagram: 'https://google.serper.dev/search',  // mesmo endpoint, query muda
  google_maps: 'https://google.serper.dev/maps',
}

// Cursor in-memory pra round-robin. Reseta a cada cold start (Vercel),
// mas isso é OK — ainda distribui dentro de uma run e entre runs próximas.
let keyCursor = 0

function getApiKeys(): string[] {
  const env = process.env.SERPER_API_KEYS || process.env.SERPER_API_KEY || ''
  return env
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

export class SerperClient {
  name = 'serper'

  async search(opts: SearchOptions): Promise<RawSerperResponse> {
    const keys = getApiKeys()
    if (keys.length === 0) {
      throw new Error('SERPER_API_KEYS não configurado no .env')
    }

    const endpoint = ENDPOINTS[opts.strategy]
    const body = {
      q: opts.query,
      hl: opts.hl || 'es',
      gl: opts.gl || 'cl',
      num: opts.num || 10,
    }

    let lastError: string | undefined

    // Tenta cada key uma vez (round-robin a partir do cursor atual)
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const idx = (keyCursor + attempt) % keys.length
      const key = keys[idx]

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': key,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        })

        // 401 = key inválida, 402 = sem créditos, 429 = rate limit
        // Em todos os casos, tenta a próxima key
        if (res.status === 401 || res.status === 402 || res.status === 429) {
          lastError = `[serper key #${idx}] HTTP ${res.status}`
          console.warn(`[serper] key #${idx} esgotada (HTTP ${res.status}), tentando próxima`)
          continue
        }

        if (!res.ok) {
          lastError = `HTTP ${res.status}`
          continue
        }

        const json = await res.json()

        // Avança cursor pra próxima chamada começar por outra key
        keyCursor = (idx + 1) % keys.length

        const hasResults =
          (Array.isArray(json.organic) && json.organic.length > 0) ||
          (Array.isArray(json.places) && json.places.length > 0) ||
          (Array.isArray(json.local) && json.local.length > 0)

        return {
          endpoint,
          raw: json,
          hasResults,
        }
      } catch (err: any) {
        lastError = err.message
        console.warn(`[serper] key #${idx} falhou: ${err.message}`)
        continue
      }
    }

    return {
      endpoint,
      raw: null,
      hasResults: false,
      errorMessage: lastError || 'Todas as keys do Serper falharam',
    }
  }
}

export const serper = new SerperClient()
