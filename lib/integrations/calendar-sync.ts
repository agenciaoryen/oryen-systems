// lib/integrations/calendar-sync.ts
// Helpers pra sincronizar eventos nativos da Oryen com o Google Calendar do usuário.
//
// Fluxo:
//   - Usuário/SDR cria evento em calendar_events (stage Oryen)
//   - Chamamos pushEventToGoogle() que:
//     1. busca a integração do usuário (se não tem, no-op silencioso)
//     2. cria o evento no Google via API
//     3. atualiza a linha em calendar_events com external_id + external_integration_id
//
//   - Em update/delete, só age se o evento já tem external_id.
//
// Importante:
//   - Nada dessas funções deve JOGAR erro pra cima se falhar — queremos que o fluxo
//     principal (criar evento local) não falhe só porque o push pro Google deu pane.
//   - Loga o erro e segue.

import { supabaseAdmin } from '@/lib/api-auth'
import { getValidAccessToken } from './token-manager'
import { insertEvent, updateEvent, deleteEvent as gcalDeleteEvent, type CalendarEventInput } from './google-calendar'

interface OryenEvent {
  id: string
  title: string
  description?: string | null
  event_date: string   // YYYY-MM-DD
  start_time: string   // HH:MM:SS
  end_time?: string | null
  address?: string | null
  external_id?: string | null
  external_integration_id?: string | null
  external_read_only?: boolean | null
}

/**
 * Monta start/end ISO a partir dos campos da Oryen.
 * Usa timezone do ambiente (assume-se que o servidor roda em UTC e a data vem local).
 * Pra simplicidade, usamos ISO sem timezone — Google aceita em combinação com timeZone param.
 */
function buildEventInput(ev: OryenEvent, timeZone?: string): CalendarEventInput {
  const startIso = `${ev.event_date}T${(ev.start_time || '00:00:00').substring(0, 8)}`
  const endTime = ev.end_time || ev.start_time
  // Se não tem end_time, assume 1h de duração
  let endIso: string
  if (ev.end_time) {
    endIso = `${ev.event_date}T${ev.end_time.substring(0, 8)}`
  } else {
    const [h, m] = (ev.start_time || '00:00:00').split(':').map(Number)
    const endH = Math.min(h + 1, 23)
    endIso = `${ev.event_date}T${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  }
  return {
    summary: ev.title,
    description: ev.description || undefined,
    location: ev.address || undefined,
    startIso,
    endIso,
    timeZone: timeZone || 'America/Sao_Paulo',
  }
}

/**
 * Empurra um evento nativo pro Google Calendar do usuário.
 * No-op se o usuário não tem integração ativa.
 * Atualiza calendar_events com external_id e external_integration_id em caso de sucesso.
 */
export async function pushEventToGoogle(params: {
  userId: string
  event: OryenEvent
  timeZone?: string
}): Promise<void> {
  const { userId, event, timeZone } = params

  const token = await getValidAccessToken(userId)
  if (!token) return // sem integração — no-op

  try {
    const input = buildEventInput(event, timeZone)
    const created = await insertEvent({ accessToken: token.accessToken, event: input })

    await supabaseAdmin
      .from('calendar_events')
      .update({
        external_source: 'google_calendar',
        external_id: created.id,
        external_integration_id: token.integrationId,
        external_read_only: false,
        external_updated_at: created.updated,
      })
      .eq('id', event.id)
  } catch (err: any) {
    console.error('[calendar-sync] pushEventToGoogle falhou:', err.message)
    // Não re-throw — evento local já foi criado, o push é best-effort
  }
}

/**
 * Atualiza um evento no Google (se já foi pushado antes).
 * No-op se não tem external_id (evento só existe localmente).
 * No-op se external_read_only (evento veio do Google — não devemos sobrescrever).
 */
export async function pushEventUpdate(params: {
  userId: string
  event: OryenEvent
  timeZone?: string
}): Promise<void> {
  const { userId, event, timeZone } = params

  if (!event.external_id || event.external_read_only) return

  const token = await getValidAccessToken(userId)
  if (!token) return

  try {
    const input = buildEventInput(event, timeZone)
    await updateEvent({
      accessToken: token.accessToken,
      eventId: event.external_id,
      event: input,
    })
    await supabaseAdmin
      .from('calendar_events')
      .update({ external_updated_at: new Date().toISOString() })
      .eq('id', event.id)
  } catch (err: any) {
    console.error('[calendar-sync] pushEventUpdate falhou:', err.message)
  }
}

/**
 * Deleta um evento no Google.
 * No-op se não tem external_id ou se é read-only.
 */
export async function pushEventDelete(params: {
  userId: string
  externalId: string | null | undefined
  externalIntegrationId: string | null | undefined
  readOnly?: boolean | null
}): Promise<void> {
  const { userId, externalId, readOnly } = params
  if (!externalId || readOnly) return

  const token = await getValidAccessToken(userId)
  if (!token) return

  try {
    await gcalDeleteEvent({ accessToken: token.accessToken, eventId: externalId })
  } catch (err: any) {
    console.error('[calendar-sync] pushEventDelete falhou:', err.message)
  }
}
