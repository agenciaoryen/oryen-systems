// app/api/calendar/[id]/route.ts
// PATCH: atualizar evento | DELETE: remover evento

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin as supabase } from '@/lib/api-auth'
import { pushEventUpdate, pushEventDelete } from '@/lib/integrations/calendar-sync'

/**
 * PATCH /api/calendar/[id]
 * Body: campos a atualizar (status, event_date, start_time, end_time, notes, etc)
 *
 * Para eventos recorrentes:
 * - Se body.update_all === true, atualiza o mestre (rrule incluso)
 * - Se body.recurrence_master_id está setado (override de instância virtual),
 *   cria um registro separado com recurrence_master_id + adiciona excluded_date no mestre
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()

    // ─── Script: editar apenas esta ocorrência de um evento recorrente ───
    if (body._editThis && body._masterId && body._occurrenceDate) {
      // 1. Adiciona a data ao excluded_dates do mestre
      const { data: master } = await supabase
        .from('calendar_events')
        .select('excluded_dates')
        .eq('id', body._masterId)
        .single()

      const excluded = master?.excluded_dates || []
      if (!excluded.includes(body._occurrenceDate)) {
        await supabase
          .from('calendar_events')
          .update({ excluded_dates: [...excluded, body._occurrenceDate] })
          .eq('id', body._masterId)
      }

      // 2. Cria um novo evento standalone com as alterações
      const allowed = ['title', 'description', 'event_type', 'event_date', 'start_time', 'end_time', 'address', 'status', 'notes', 'lead_id', 'assigned_to']
      const insertData: Record<string, any> = {}
      for (const key of allowed) {
        if (body[key] !== undefined) insertData[key] = body[key]
      }
      insertData.org_id = auth.orgId!
      insertData.recurrence_master_id = body._masterId
      insertData.status = body.status || 'scheduled'
      insertData.created_by = body.created_by || 'user'

      const { data: newEvent, error } = await supabase
        .from('calendar_events')
        .insert(insertData)
        .select('*, leads(id, name, nome_empresa, phone)')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ event: newEvent })
    }

    // ─── Script: excluir apenas esta ocorrência ───
    if (body._deleteThis && body._masterId && body._occurrenceDate) {
      const { data: master } = await supabase
        .from('calendar_events')
        .select('excluded_dates')
        .eq('id', body._masterId)
        .single()

      const excluded = master?.excluded_dates || []
      if (!excluded.includes(body._occurrenceDate)) {
        const { error } = await supabase
          .from('calendar_events')
          .update({ excluded_dates: [...excluded, body._occurrenceDate] })
          .eq('id', body._masterId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // ─── Atualização normal ───
    const allowed = ['title', 'description', 'event_type', 'event_date', 'start_time', 'end_time', 'address', 'status', 'notes', 'lead_id', 'assigned_to', 'rrule', 'excluded_dates']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .select('*, leads(id, name, nome_empresa, phone)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Push update pro Google se o evento está linkado
    if (data && auth.userId && !data.external_read_only) {
      await pushEventUpdate({ userId: auth.userId, event: data as any })
    }

    return NextResponse.json({ event: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/calendar/[id]
 * Body (opcional): { delete_all?: boolean, recurrence_master_id?: string, occurrence_date?: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json().catch(() => ({}))

    // Busca o evento antes de deletar pra pegar metadados
    const { data: existing } = await supabase
      .from('calendar_events')
      .select('external_id, external_integration_id, external_read_only, rrule, event_date, recurrence_master_id, excluded_dates')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // ─── Deletar apenas esta ocorrência de um recorrente ───
    if (existing.rrule && !body.delete_all && existing.event_date) {
      const excluded = existing.excluded_dates || []
      if (!excluded.includes(existing.event_date)) {
        await supabase
          .from('calendar_events')
          .update({ excluded_dates: [...excluded, existing.event_date] })
          .eq('id', id)
      }
      return NextResponse.json({ success: true })
    }

    // ─── Deletar override de instância virtual ───
    if (existing.recurrence_master_id && !body.delete_all) {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    // ─── Deletar definitivo ───
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Deleta no Google também (se evento estava linkado e não era read-only)
    if (existing?.external_id && !existing.external_read_only && auth.userId) {
      await pushEventDelete({
        userId: auth.userId,
        externalId: existing.external_id,
        externalIntegrationId: existing.external_integration_id,
        readOnly: existing.external_read_only,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
