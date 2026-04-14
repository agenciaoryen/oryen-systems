// app/api/distribution/broker-config/route.ts
// GET: retorna configs de todos os corretores da org
// PUT: atualiza config de um corretor específico

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, req.nextUrl.searchParams.get('org_id'))

    // Buscar todos os usuários elegíveis da org
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, role, status')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin', 'vendedor'])

    if (!users) return NextResponse.json({ brokers: [] })

    // Buscar configs de broker
    const { data: configs } = await supabase
      .from('broker_config')
      .select('*')
      .eq('org_id', orgId)

    const configMap = new Map((configs || []).map(c => [c.user_id, c]))

    const brokers = users.map(user => ({
      user_id: user.id,
      name: user.full_name || user.email,
      email: user.email,
      role: user.role,
      config: configMap.get(user.id) || null,
    }))

    return NextResponse.json({ brokers })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { user_id, ...configFields } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    const updateData: any = {
      user_id,
      org_id,
      updated_at: new Date().toISOString(),
    }

    // Campos permitidos
    const allowedFields = [
      'is_available', 'max_active_leads',
      'regions', 'cities', 'property_types', 'transaction_types',
      'price_range_min', 'price_range_max',
    ]

    for (const field of allowedFields) {
      if (configFields[field] !== undefined) {
        updateData[field] = configFields[field]
      }
    }

    const { data, error } = await supabase
      .from('broker_config')
      .upsert(updateData, { onConflict: 'user_id,org_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, config: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
