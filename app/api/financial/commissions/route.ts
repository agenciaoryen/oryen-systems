import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'

// GET — list commissions with filters
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const orgId = resolveOrgId(auth, searchParams.get('org_id'))
  const status = searchParams.get('status')
  const brokerId = searchParams.get('broker_id')

  let query = supabaseAdmin
    .from('commissions')
    .select('*, leads(name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (status) query = query.eq('status', status)
  if (brokerId) query = query.eq('broker_id', brokerId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH — approve, pay, or cancel a commission
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { id, action, approved_by } = body

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  // Fetch current commission
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('commissions')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ['approve', 'cancel'],
    approved: ['pay', 'cancel'],
    paid: [],
    cancelled: [],
  }

  if (!validTransitions[current.status]?.includes(action)) {
    return NextResponse.json(
      { error: `Cannot ${action} a commission with status ${current.status}` },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  let update: Record<string, any> = { updated_at: now }

  switch (action) {
    case 'approve':
      update.status = 'approved'
      update.approved_by = approved_by || null
      update.approved_at = now
      break
    case 'pay':
      update.status = 'paid'
      update.paid_at = now
      break
    case 'cancel':
      update.status = 'cancelled'
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('commissions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
