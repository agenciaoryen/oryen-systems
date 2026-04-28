// Faz fetch do site do lead e extrai email/phone/instagram via regex.
// Usado quando o lead vem do Serper sem contato (típico em /maps).
//
// Sem cheerio — regex puro no HTML é suficiente pra os 3 campos que precisamos.
// Timeout curto (8s) pra não atrasar a campanha quando o site for lento.

import { extractPhonesFromText } from './phone-normalizer'
import type { CountryConfig } from './country-config'

interface ScrapeResult {
  email: string | null
  phone: string | null
  instagram: string | null
  facebook: string | null
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const SCRAPE_TIMEOUT_MS = 8000
const MAX_HTML_SIZE = 500_000  // 500KB — corta sites muito grandes

const UA = 'Mozilla/5.0 (compatible; OryenHunter/1.0; +https://oryen.agency)'

const EMAIL_BLACKLIST = [
  'sentry.io',
  'wixpress.com',
  'example.com',
  '@u003c',
  'sentry-next.wixpress.com',
  '.png',
  '.jpg',
  '.gif',
]

function isEmailValid(email: string): boolean {
  const e = email.toLowerCase()
  return !EMAIL_BLACKLIST.some((b) => e.includes(b))
}

function pickInstagram(html: string): string | null {
  const m = html.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i)
  if (!m) return null
  const handle = m[1]
  if (['p', 'reel', 'reels', 'tv', 'explore', 'accounts'].includes(handle.toLowerCase())) {
    return null
  }
  return `@${handle}`
}

function pickFacebook(html: string): string | null {
  const m = html.match(/facebook\.com\/([a-zA-Z0-9_.\-]+)/i)
  if (!m) return null
  const handle = m[1]
  if (['sharer', 'plugins', 'tr', 'dialog', 'login'].includes(handle.toLowerCase())) {
    return null
  }
  return handle
}

export async function scrapeContact(
  url: string,
  country: CountryConfig
): Promise<ScrapeResult> {
  const empty: ScrapeResult = { email: null, phone: null, instagram: null, facebook: null }

  if (!url) return empty

  let target = url
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': country.searchLang,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
    })

    if (!res.ok) return empty

    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return empty

    let html = await res.text()
    if (html.length > MAX_HTML_SIZE) {
      html = html.substring(0, MAX_HTML_SIZE)
    }

    // Captura emails (priorizando os de mailto: que são mais confiáveis)
    const mailtos = [...html.matchAll(/mailto:([^"'\s<>]+)/gi)].map((m) => m[1])
    const allEmails = html.match(EMAIL_REGEX) || []
    const validEmails = [...mailtos, ...allEmails]
      .map((e) => e.toLowerCase().trim())
      .filter(isEmailValid)
      .filter((v, i, a) => a.indexOf(v) === i)

    const phones = extractPhonesFromText(html, country.name)

    return {
      email: validEmails[0] || null,
      phone: phones[0] || null,
      instagram: pickInstagram(html),
      facebook: pickFacebook(html),
    }
  } catch (err: any) {
    // Timeout, DNS, cert ruim — retorna vazio sem propagar
    return empty
  }
}
