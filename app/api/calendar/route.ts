// app/api/calendar/route.ts
// GET: listar eventos por período | POST: criar evento

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'
import { pushEventToGoogle } from '@/lib/integrations/calendar-sync'

/**
 * GET /api/calendar?org_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD&status=scheduled
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = request.nextUrl
    const orgId = resolveOrgId(auth, searchParams.get('org_id'))
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')

    let query = supabase
      .from('calendar_events')
      .select('*, leads(id, name, phone)')
      .eq('org_id', orgId)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (from) query = query.gte('event_date', from)
    if (to) query = query.lte('event_date', to)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ events: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/calendar
 * Body: { org_id, title, event_type, event_date, start_time, end_time?, address?, description?, lead_id?, notes?, created_by }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { title, event_type, event_date, start_time } = body

    if (!title || !event_date || !start_time) {
      return NextResponse.json({ error: 'Missing required fields: title, event_date, start_time' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        org_id,
        lead_id: body.lead_id || null,
        title,
        description: body.description || null,
        event_type: event_type || 'other',
        event_date,
        start_time,
        end_time: body.end_time || null,
        address: body.address || null,
        status: 'scheduled',
        created_by: body.created_by || 'user',
        notes: body.notes || null
      })
      .select('*, leads(id, name, phone)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Push pro Google Calendar (se usuário tiver integração ativa)
    if (data && auth.userId) {
      await pushEventToGoogle({ userId: auth.userId, event: data as any })
    }

    return NextResponse.json({ event: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
