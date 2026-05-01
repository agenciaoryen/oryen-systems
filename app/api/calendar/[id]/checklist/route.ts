// app/api/calendar/[id]/checklist/route.ts
// CRUD para checklist de eventos

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin as supabase } from '@/lib/api-auth'

/**
 * GET /api/calendar/[id]/checklist
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const { id } = await params

    const { data, error } = await supabase
      .from('event_checklists')
      .select('*')
      .eq('event_id', id)
      .order('position', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/calendar/[id]/checklist
 * Body: { text }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    const body = await request.json()

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Get next position
    const { data: last } = await supabase
      .from('event_checklists')
      .select('position')
      .eq('event_id', id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPos = (last?.[0]?.position ?? -1) + 1

    const { data, error } = await supabase
      .from('event_checklists')
      .insert({ event_id: id, text: body.text.trim(), position: nextPos })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/calendar/[id]/checklist
 * Body: { item_id, text?, is_completed? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const body = await request.json()

    if (!body.item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.text !== undefined) updates.text = body.text
    if (body.is_completed !== undefined) updates.is_completed = body.is_completed

    const { data, error } = await supabase
      .from('event_checklists')
      .update(updates)
      .eq('id', body.item_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/calendar/[id]/checklist
 * Body: { item_id }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const body = await request.json()

    if (!body.item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('event_checklists')
      .delete()
      .eq('id', body.item_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
