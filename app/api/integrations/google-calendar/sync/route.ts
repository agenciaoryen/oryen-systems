// POST /api/integrations/google-calendar/sync
// Puxa eventos do Google Calendar primário dos próximos 60 dias e espelha
// em calendar_events. Remove eventos que foram deletados do Google.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'
import { getValidAccessToken, markIntegrationError } from '@/lib/integrations/token-manager'
import { listEvents, type GoogleCalendarEvent } from '@/lib/integrations/google-calendar'

const SYNC_DAYS = 60

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const token = await getValidAccessToken(auth.userId)
  if (!token) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 })
  }

  try {
    // Janela de sincronização: agora até agora + SYNC_DAYS
    const now = new Date()
    const windowEnd = new Date(now.getTime() + SYNC_DAYS * 24 * 60 * 60 * 1000)
    const timeMin = now.toISOString()
    const timeMax = windowEnd.toISOString()

    // Busca todos os eventos da janela (paginando se passar de 250)
    const allEvents: GoogleCalendarEvent[] = []
    let pageToken: string | undefined
    do {
      const page = await listEvents({
        accessToken: token.accessToken,
        timeMin,
        timeMax,
        pageToken,
        maxResults: 250,
      })
      allEvents.push(...page.items)
      pageToken = page.nextPageToken
    } while (pageToken)

    // Mapeia pro formato da Oryen e separa "canceled" (que devemos apagar)
    const upserts: any[] = []
    const canceledExternalIds: string[] = []

    for (const ev of allEvents) {
      if (ev.status === 'cancelled') {
        canceledExternalIds.push(ev.id)
        continue
      }
      const mapped = mapGoogleEventToOryen(ev, auth.orgId, token.integrationId)
      if (mapped) upserts.push(mapped)
    }

    // Upsert dos eventos ativos (UNIQUE em external_integration_id + external_id)
    if (upserts.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from('calendar_events')
        .upsert(upserts, {
          onConflict: 'external_integration_id,external_id',
          ignoreDuplicates: false,
        })
      if (upsertErr) throw new Error(`upsert falhou: ${upsertErr.message}`)
    }

    // Remove eventos que sumiram/cancelaram no Google (read-only pulled only)
    if (canceledExternalIds.length > 0) {
      await supabaseAdmin
        .from('calendar_events')
        .delete()
        .eq('external_integration_id', token.integrationId)
        .in('external_id', canceledExternalIds)
    }

    // Atualiza last_sync_at
    await supabaseAdmin
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: null, status: 'active' })
      .eq('id', token.integrationId)

    return NextResponse.json({
      ok: true,
      synced: upserts.length,
      removed: canceledExternalIds.length,
      window_days: SYNC_DAYS,
    })
  } catch (err: any) {
    console.error('[gcal sync] falhou:', err.message)
    // Só marca 'error' se for problema de autenticação/token — demais erros são
    // transitórios (falha de upsert, rate limit, etc) e não exigem reconexão.
    const isAuthError = /token|unauthorized|401|403/i.test(err.message)
    if (isAuthError) {
      await markIntegrationError(token.integrationId, err.message)
    } else {
      // Mantém status='active' mas salva o erro pro debug
      await supabaseAdmin
        .from('integrations')
        .update({ last_sync_error: err.message })
        .eq('id', token.integrationId)
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Converte um evento do Google pro shape da tabela calendar_events.
 * Retorna null se o evento não pode ser mapeado (ex: all-day sem fim ou dados faltando).
 */
function mapGoogleEventToOryen(
  ev: GoogleCalendarEvent,
  orgId: string,
  integrationId: string
): any | null {
  // Google manda start/end em duas formas:
  //   - dateTime (com timezone)  → evento com hora
  //   - date      (apenas dia)    → evento dia inteiro
  const hasDateTime = !!ev.start.dateTime && !!ev.end.dateTime
  const hasAllDay = !!ev.start.date

  if (!hasDateTime && !hasAllDay) return null

  let eventDate: string
  let startTime: string
  let endTime: string | null

  if (hasDateTime) {
    const startDt = new Date(ev.start.dateTime!)
    const endDt = new Date(ev.end.dateTime!)
    eventDate = formatLocalDate(startDt)
    startTime = formatLocalTime(startDt)
    endTime = formatLocalTime(endDt)
  } else {
    // All-day event: guarda como dia inteiro (start 00:00, end 23:59 se tiver)
    eventDate = ev.start.date!
    startTime = '00:00:00'
    // Google manda end.date como o dia SEGUINTE ao último dia — se for mesmo dia, usa 23:59
    endTime = '23:59:59'
  }

  return {
    org_id: orgId,
    title: ev.summary || '(sem título)',
    description: ev.description || null,
    event_type: 'other',
    event_date: eventDate,
    start_time: startTime,
    end_time: endTime,
    address: ev.location || null,
    status: 'scheduled',
    created_by: 'google_calendar',
    external_source: 'google_calendar',
    external_id: ev.id,
    external_integration_id: integrationId,
    external_read_only: true,
    external_updated_at: ev.updated,
  }
}

function formatLocalDate(d: Date): string {
  // YYYY-MM-DD local
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatLocalTime(d: Date): string {
  // HH:MM:SS local
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}
