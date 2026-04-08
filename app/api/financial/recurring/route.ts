import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — list recurring expenses
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const orgId = searchParams.get('org_id')

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('recurring_expenses')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — create recurring expense
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { org_id, category, description, amount, currency, day_of_month, created_by } = body

  if (!org_id || !category || !description || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const day = Number(day_of_month) || 1
  if (day < 1 || day > 28) {
    return NextResponse.json({ error: 'day_of_month must be between 1 and 28' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('recurring_expenses')
    .insert({
      org_id,
      category,
      description,
      amount: Number(amount),
      currency: currency || 'BRL',
      day_of_month: day,
      is_active: true,
      created_by: created_by || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH — update recurring expense
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('recurring_expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE — delete recurring expense
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('recurring_expenses')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
