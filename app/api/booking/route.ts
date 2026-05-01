// app/api/booking/route.ts
// CRUD para links públicos de agendamento do usuário logado

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'

/**
 * GET /api/booking?org_id=X — lista links da org
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, request.nextUrl.searchParams.get('org_id'))

    const { data, error } = await supabase
      .from('public_booking_slots')
      .select('*, users(full_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bookings: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/booking — cria novo link
 * Body: { slug, title, description?, duration_minutes?, buffer_minutes?, availability_config? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const org_id = resolveOrgId(auth, body.org_id)

    if (!body.slug || !body.title) {
      return NextResponse.json({ error: 'slug e title são obrigatórios' }, { status: 400 })
    }

    // Valida slug
    if (!/^[a-z0-9-]{3,50}$/.test(body.slug)) {
      return NextResponse.json({ error: 'Slug deve conter apenas letras minúsculas, números e hífens (3-50 caracteres)' }, { status: 400 })
    }

    // Verifica slug único
    const { data: existing } = await supabase
      .from('public_booking_slots')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Este slug já está em uso' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('public_booking_slots')
      .insert({
        org_id,
        user_id: auth.userId!,
        slug: body.slug,
        title: body.title,
        description: body.description || null,
        duration_minutes: body.duration_minutes || 30,
        buffer_minutes: body.buffer_minutes || 0,
        availability_config: body.availability_config || { days: [1, 2, 3, 4, 5], start_hour: 9, end_hour: 18, timezone: 'America/Sao_Paulo' },
      })
      .select('*, users(full_name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ booking: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/booking — atualiza link
 * Body: { id, slug?, title?, description?, duration_minutes?, buffer_minutes?, availability_config?, is_active? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const allowed = ['title', 'description', 'duration_minutes', 'buffer_minutes', 'availability_config', 'is_active', 'slug']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    // Se slug mudou, valida unicidade
    if (body.slug) {
      if (!/^[a-z0-9-]{3,50}$/.test(body.slug)) {
        return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
      }
      const { data: dup } = await supabase
        .from('public_booking_slots')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', body.id)
        .maybeSingle()
      if (dup) return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('public_booking_slots')
      .update(updates)
      .eq('id', body.id)
      .select('*, users(full_name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ booking: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/booking — remove link
 * Body: { id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const { error } = await supabase
      .from('public_booking_slots')
      .delete()
      .eq('id', body.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
