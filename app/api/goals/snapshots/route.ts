import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'

// GET — historical snapshots for a goal
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const goalId = searchParams.get('goal_id')
  const orgId = searchParams.get('org_id') ? resolveOrgId(auth, searchParams.get('org_id')) : null

  if (!goalId && !orgId) {
    return NextResponse.json({ error: 'goal_id or org_id required' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('goal_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })

  if (goalId) query = query.eq('goal_id', goalId)
  if (orgId) query = query.eq('org_id', orgId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — save daily snapshot for all active goals of an org
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const org_id = resolveOrgId(auth, body.org_id)

  const today = new Date().toISOString().split('T')[0]

  const { data: goals } = await supabaseAdmin
    .from('org_goals')
    .select('id, current_value')
    .eq('org_id', org_id)
    .eq('is_active', true)

  if (!goals || goals.length === 0) {
    return NextResponse.json({ saved: 0 })
  }

  const snapshots = goals.map(g => ({
    goal_id: g.id,
    org_id: org_id,
    snapshot_date: today,
    value: g.current_value,
  }))

  const { error } = await supabaseAdmin
    .from('goal_snapshots')
    .upsert(snapshots, { onConflict: 'goal_id,snapshot_date' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ saved: snapshots.length })
}
