import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — list transactions with filters
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const orgId = searchParams.get('org_id')
  const type = searchParams.get('type')
  const category = searchParams.get('category')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('financial_transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('transaction_date', { ascending: false })
    .limit(500)

  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)
  if (status) query = query.eq('status', status)
  if (from) query = query.gte('transaction_date', from)
  if (to) query = query.lte('transaction_date', to)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — create a transaction (expense or manual revenue)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { org_id, type, category, amount, currency, description, transaction_date, notes, lead_id, broker_id, created_by } = body

  if (!org_id || !type || !category || !amount || !transaction_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['revenue', 'expense'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Calculate reference_month (first day of transaction month)
  const txDate = new Date(transaction_date)
  const referenceMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabaseAdmin
    .from('financial_transactions')
    .insert({
      org_id,
      type,
      category,
      amount: Number(amount),
      currency: currency || 'BRL',
      description: description || null,
      transaction_date,
      reference_month: referenceMonth,
      notes: notes || null,
      lead_id: lead_id || null,
      broker_id: broker_id || null,
      created_by: created_by || null,
      status: 'confirmed',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH — update transaction status
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, approved_by } = body

  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }

  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const update: Record<string, any> = { status, updated_at: new Date().toISOString() }
  if (status === 'confirmed' && approved_by) {
    update.approved_by = approved_by
    update.approved_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('financial_transactions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
