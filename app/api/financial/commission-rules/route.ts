import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — list commission rules
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const orgId = searchParams.get('org_id')

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('commission_rules')
    .select('*')
    .eq('org_id', orgId)
    .order('priority', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — create a commission rule
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { org_id, name, broker_id, tiers, agency_split_pct, broker_split_pct, priority } = body

  if (!org_id || !name || !tiers) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate split sums to 100
  const agencySplit = Number(agency_split_pct) || 50
  const brokerSplit = Number(broker_split_pct) || 50
  if (Math.abs(agencySplit + brokerSplit - 100) > 0.01) {
    return NextResponse.json({ error: 'Split must sum to 100%' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('commission_rules')
    .insert({
      org_id,
      name,
      broker_id: broker_id || null,
      tiers,
      agency_split_pct: agencySplit,
      broker_split_pct: brokerSplit,
      priority: priority || (broker_id ? 10 : 0),
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH — update a commission rule
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // Validate split if provided
  if (updates.agency_split_pct !== undefined && updates.broker_split_pct !== undefined) {
    if (Math.abs(Number(updates.agency_split_pct) + Number(updates.broker_split_pct) - 100) > 0.01) {
      return NextResponse.json({ error: 'Split must sum to 100%' }, { status: 400 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('commission_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE — delete a commission rule
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('commission_rules')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
