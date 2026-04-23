// lib/integrations/google-calendar.ts
// Cliente OAuth + wrappers da Google Calendar API (REST v3).
// Usa fetch nativo, zero dependência nova.
//
// Fluxo:
//   1. buildAuthUrl() → URL pra onde o usuário é redirecionado no Google
//   2. exchangeCodeForTokens(code) → troca o code do callback por access/refresh tokens
//   3. refreshAccessToken(refresh_token) → renova access_token quando expira
//   4. fetchUserInfo / listEvents / insertEvent / updateEvent / deleteEvent → chamadas à API
//
// Scopes usados:
//   - calendar.events          → ler/criar/editar/deletar eventos
//   - userinfo.email           → email da conta conectada (pra UI)
//   - userinfo.profile         → nome da conta conectada (pra UI)

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// ═══════════════════════════════════════════════════════════════════════════════
// ENV + TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

function getEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Variáveis GOOGLE_OAUTH_* não configuradas')
  }
  return { clientId, clientSecret, redirectUri }
}

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

export interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
}

export interface GoogleCalendarEvent {
  id: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  description?: string
  location?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  updated: string
  htmlLink?: string
  attendees?: { email: string; responseStatus?: string }[]
  creator?: { email?: string }
  organizer?: { email?: string }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OAuth
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Monta a URL de consentimento do Google.
 * state: valor aleatório que vamos checar no callback pra proteger contra CSRF.
 */
export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getEnv()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES.join(' '),
    access_type: 'offline',     // pra receber refresh_token
    prompt: 'consent',          // força refresh_token mesmo em reconexão
    include_granted_scopes: 'true',
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Troca o code recebido no callback pelos tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = getEnv()
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google token exchange falhou (${res.status}): ${txt}`)
  }
  return res.json()
}

/**
 * Renova um access_token usando refresh_token.
 * O Google NÃO devolve um novo refresh_token aqui — mantém o que já temos.
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getEnv()
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google token refresh falhou (${res.status}): ${txt}`)
  }
  return res.json()
}

/**
 * Revoga o token no Google. Idempotente.
 */
export async function revokeToken(token: string): Promise<void> {
  if (!token) return
  const res = await fetch(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  })
  // 200 = revogado; 400 = já era inválido. Ambos OK pra nossa lógica.
  if (res.status !== 200 && res.status !== 400) {
    const txt = await res.text()
    console.warn(`Google revoke retornou ${res.status}: ${txt}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// User info
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google userinfo falhou (${res.status}): ${txt}`)
  }
  return res.json()
}

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar API (v3) — wrappers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista eventos do calendário primário num intervalo.
 * singleEvents=true expande recorrência em instâncias individuais.
 */
export async function listEvents(params: {
  accessToken: string
  calendarId?: string
  timeMin: string
  timeMax: string
  pageToken?: string
  maxResults?: number
}): Promise<{ items: GoogleCalendarEvent[]; nextPageToken?: string; nextSyncToken?: string }> {
  const { accessToken, calendarId = 'primary', timeMin, timeMax, pageToken, maxResults = 250 } = params
  const q = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  })
  if (pageToken) q.set('pageToken', pageToken)

  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${q}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`listEvents falhou (${res.status}): ${txt}`)
  }
  return res.json()
}

export interface CalendarEventInput {
  summary: string
  description?: string
  location?: string
  startIso: string   // ISO 8601 com timezone, ex: '2026-04-25T14:00:00-03:00'
  endIso: string
  timeZone?: string  // ex: 'America/Sao_Paulo'
}

export async function insertEvent(params: {
  accessToken: string
  calendarId?: string
  event: CalendarEventInput
}): Promise<GoogleCalendarEvent> {
  const { accessToken, calendarId = 'primary', event } = params
  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startIso, timeZone: event.timeZone },
    end: { dateTime: event.endIso, timeZone: event.timeZone },
  }
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`insertEvent falhou (${res.status}): ${txt}`)
  }
  return res.json()
}

export async function updateEvent(params: {
  accessToken: string
  calendarId?: string
  eventId: string
  event: Partial<CalendarEventInput>
}): Promise<GoogleCalendarEvent> {
  const { accessToken, calendarId = 'primary', eventId, event } = params
  const body: any = {}
  if (event.summary !== undefined) body.summary = event.summary
  if (event.description !== undefined) body.description = event.description
  if (event.location !== undefined) body.location = event.location
  if (event.startIso) body.start = { dateTime: event.startIso, timeZone: event.timeZone }
  if (event.endIso) body.end = { dateTime: event.endIso, timeZone: event.timeZone }

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`updateEvent falhou (${res.status}): ${txt}`)
  }
  return res.json()
}

export async function deleteEvent(params: {
  accessToken: string
  calendarId?: string
  eventId: string
}): Promise<void> {
  const { accessToken, calendarId = 'primary', eventId } = params
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  // 204 = deletado; 410 = já estava deletado. Ambos OK.
  if (!res.ok && res.status !== 410) {
    const txt = await res.text()
    throw new Error(`deleteEvent falhou (${res.status}): ${txt}`)
  }
}
