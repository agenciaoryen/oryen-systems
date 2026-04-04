// app/api/calendar/route.ts
// GET: listar eventos por período | POST: criar evento

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/calendar?org_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD&status=scheduled
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const orgId = searchParams.get('org_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')

    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

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
    const body = await request.json()
    const { org_id, title, event_type, event_date, start_time } = body

    if (!org_id || !title || !event_date || !start_time) {
      return NextResponse.json({ error: 'Missing required fields: org_id, title, event_date, start_time' }, { status: 400 })
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

    return NextResponse.json({ event: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
