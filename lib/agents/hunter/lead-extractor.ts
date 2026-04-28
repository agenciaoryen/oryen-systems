// Extrai leads do JSON bruto do Serper sem usar LLM.
// Cada estratégia tem um shape de resposta diferente:
//
//   /search        → { organic: [{ title, link, snippet }], ... }
//   /maps          → { places: [{ title, address, phoneNumber, website, rating, latitude, longitude }] }
//   instagram      → /search com site:instagram.com → links instagram.com/X
//
// Para cada item, monta um RawLead com o que conseguir extrair.
// Phone é normalizado por país. Email é capturado por regex no snippet.
// Website é normalizado (remove www, força https).

import type { RawLead, RawSerperResponse } from '../sources/types'
import type { CountryConfig } from './country-config'
import { normalizePhone, extractPhonesFromText } from './phone-normalizer'

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// Limpa nome de empresa removendo sufixos comuns do título do Google
const TITLE_SUFFIXES = [
  /\s*[-|–·•]\s*Site Oficial.*$/i,
  /\s*[-|–·•]\s*Página Oficial.*$/i,
  /\s*[-|–·•]\s*Inicio.*$/i,
  /\s*[-|–·•]\s*Home$/i,
  /\s*[-|–·•]\s*Welcome$/i,
  /\s*\.\.\.$/,
]

function cleanCompanyName(title: string | null | undefined): string | null {
  if (!title) return null
  let name = String(title).trim()
  for (const re of TITLE_SUFFIXES) name = name.replace(re, '')
  // Remove " - Cidade, País" no fim que aparece em fichas do Maps
  name = name.replace(/\s*[-–]\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s*$/, '')
  return name.trim() || null
}

function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null
  let s = String(url).trim()
  if (!s) return null
  // Remove protocolo, www, e tudo após primeira barra
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]
  if (!s.includes('.')) return null
  return `https://${s.toLowerCase()}`
}

function extractInstagramHandle(url: string | null | undefined): string | null {
  if (!url) return null
  // De https://instagram.com/handle/ → @handle
  const match = String(url).match(/instagram\.com\/([a-zA-Z0-9_.]+)/i)
  if (!match) return null
  const handle = match[1]
  // Ignora rotas internas do IG
  if (['p', 'reel', 'reels', 'tv', 'explore', 'stories', 'accounts'].includes(handle.toLowerCase())) {
    return null
  }
  return `@${handle}`
}

function extractEmailsFromText(text: string): string[] {
  if (!text) return []
  const matches = text.match(EMAIL_REGEX) || []
  // Filtra emails de domínios irrelevantes (CDN, tracking, etc)
  const blacklist = ['sentry.io', 'wixpress.com', 'example.com', 'sentry-next.wixpress.com']
  return matches
    .map((e) => e.toLowerCase())
    .filter((e) => !blacklist.some((b) => e.endsWith(b)))
    .filter((v, i, a) => a.indexOf(v) === i) // dedup
}

// ─── /search e /search instagram ───────────────────────────────────────────
function extractFromSearchResponse(
  response: RawSerperResponse,
  ctx: { city: string; segment: string; country: CountryConfig; isInstagram: boolean }
): RawLead[] {
  const organic = Array.isArray(response.raw?.organic) ? response.raw.organic : []
  const leads: RawLead[] = []

  for (const item of organic) {
    const title = item.title as string | undefined
    const link = item.link as string | undefined
    const snippet = (item.snippet || item.description || '') as string

    const haystack = `${title || ''} ${snippet}`

    const phones = extractPhonesFromText(haystack, ctx.country.name)
    const emails = extractEmailsFromText(haystack)
    const instagram = ctx.isInstagram
      ? extractInstagramHandle(link)
      : (snippet.match(/instagram\.com\/[a-zA-Z0-9_.]+/i)?.[0]
          ? extractInstagramHandle(snippet.match(/instagram\.com\/[a-zA-Z0-9_.]+/i)![0])
          : null)

    // Pra busca IG, o "nome" vem do title do post (usually "Nome (@handle) • Instagram")
    let nome_empresa = cleanCompanyName(title)
    if (ctx.isInstagram && nome_empresa) {
      nome_empresa = nome_empresa.replace(/\s*\(@[^)]+\).*$/, '').replace(/\s*•.*$/, '').trim()
    }

    if (!nome_empresa && !instagram && !link) continue

    leads.push({
      nome_empresa,
      phone: phones[0] || null,
      whatsapp: phones[0] || null,
      email: emails[0] || null,
      website: ctx.isInstagram ? null : normalizeWebsite(link),
      instagram,
      city: ctx.city,
      source: ctx.isInstagram ? 'serper_instagram' : 'serper_search',
      source_url: link || null,
    })
  }

  return leads
}

// ─── /maps ───────────────────────────────────────────────────────────────
function extractFromMapsResponse(
  response: RawSerperResponse,
  ctx: { city: string; segment: string; country: CountryConfig }
): RawLead[] {
  const places = Array.isArray(response.raw?.places) ? response.raw.places : []
  const leads: RawLead[] = []

  for (const place of places) {
    const title = place.title as string | undefined
    const address = place.address as string | undefined
    const phoneNumber = place.phoneNumber as string | undefined
    const website = place.website as string | undefined
    const rating = place.rating as number | undefined

    const phone = normalizePhone(phoneNumber, ctx.country.name)

    // Email não vem no Maps — fica null. Será preenchido pelo site-scraper se ativado.
    leads.push({
      nome_empresa: cleanCompanyName(title),
      phone,
      whatsapp: phone,
      email: null,
      website: normalizeWebsite(website),
      instagram: null,
      city: ctx.city,
      address: address || null,
      latitude: typeof place.latitude === 'number' ? place.latitude : null,
      longitude: typeof place.longitude === 'number' ? place.longitude : null,
      source: 'serper_maps',
      source_url: place.cid ? `https://www.google.com/maps/place/?q=place_id:${place.cid}` : null,
      score: typeof rating === 'number' ? rating : null,
    })
  }

  return leads
}

// ─── Entry point ───────────────────────────────────────────────────────────
export function extractLeads(
  response: RawSerperResponse,
  ctx: {
    city: string
    segment: string
    country: CountryConfig
    strategy: 'general' | 'instagram' | 'google_maps'
  }
): RawLead[] {
  if (!response.hasResults) return []

  if (ctx.strategy === 'google_maps') {
    return extractFromMapsResponse(response, ctx)
  }

  return extractFromSearchResponse(response, {
    city: ctx.city,
    segment: ctx.segment,
    country: ctx.country,
    isInstagram: ctx.strategy === 'instagram',
  })
}
