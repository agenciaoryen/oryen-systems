// lib/properties/tracker.ts
// Utilitário client-side para tracking de eventos de imóveis no site público.
// Usa sendBeacon (non-blocking) com fallback para fetch.

const TRACK_ENDPOINT = '/api/properties/track'

function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let vid = sessionStorage.getItem('_pvid')
  if (!vid) {
    vid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('_pvid', vid)
  }
  return vid
}

function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const val = params.get(key)
    if (val) utm[key] = val
  }
  return utm
}

// Dedup: evita enviar o mesmo evento mais de 1x por sessão
const sent = new Set<string>()

export function trackPropertyEvent(
  siteSlug: string,
  propertyId: string,
  eventType: string,
  metadata?: Record<string, any>,
  options?: { allowDuplicate?: boolean }
) {
  if (typeof window === 'undefined') return

  const dedup = !options?.allowDuplicate
  if (dedup) {
    const key = `${propertyId}:${eventType}`
    if (sent.has(key)) return
    sent.add(key)
  }

  const payload = JSON.stringify({
    site_slug: siteSlug,
    property_id: propertyId,
    event_type: eventType,
    visitor_id: getVisitorId(),
    referrer: document.referrer || null,
    metadata: metadata || null,
    ...getUtmParams(),
  })

  // sendBeacon é non-blocking e funciona mesmo ao sair da página
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon(TRACK_ENDPOINT, blob)
  } else {
    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}
