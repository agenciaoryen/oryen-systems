import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'

// GET — list active goals for org + month
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const orgId = resolveOrgId(auth, searchParams.get('org_id'))
  const month = searchParams.get('month') // format: YYYY-MM-01

  let query = supabaseAdmin
    .from('org_goals')
    .select('*, goal_templates(*)')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (month) {
    query = query.eq('period_start', month)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — create or activate a goal
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const org_id = resolveOrgId(auth, body.org_id)
  const { template_id, period_start, target_value, broker_id, custom_name, custom_description, created_by } = body

  if (!template_id || !period_start || !target_value) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Calculate period_end (last day of month)
  const start = new Date(period_start)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  const periodEnd = end.toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('org_goals')
    .upsert({
      org_id,
      template_id,
      period_start,
      period_end: periodEnd,
      target_value: Number(target_value),
      broker_id: broker_id || null,
      custom_name: custom_name || null,
      custom_description: custom_description || null,
      is_active: true,
      created_by: created_by || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'org_id,template_id,period_start,broker_id',
    })
    .select('*, goal_templates(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE — deactivate a goal
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('org_goals')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
