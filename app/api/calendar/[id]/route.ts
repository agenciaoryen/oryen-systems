// app/api/calendar/[id]/route.ts
// PATCH: atualizar evento | DELETE: remover evento

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin as supabase } from '@/lib/api-auth'
import { pushEventUpdate, pushEventDelete } from '@/lib/integrations/calendar-sync'

/**
 * PATCH /api/calendar/[id]
 * Body: campos a atualizar (status, event_date, start_time, end_time, notes, etc)
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

    // Campos permitidos para atualização
    const allowed = ['title', 'description', 'event_type', 'event_date', 'start_time', 'end_time', 'address', 'status', 'notes', 'lead_id']
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
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Busca o evento antes de deletar pra pegar external_id
    const { data: existing } = await supabase
      .from('calendar_events')
      .select('external_id, external_integration_id, external_read_only')
      .eq('id', id)
      .single()

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
