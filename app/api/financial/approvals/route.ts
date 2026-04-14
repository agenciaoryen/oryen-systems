import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'

// GET — list pending approvals
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const orgId = resolveOrgId(auth, searchParams.get('org_id'))
  const status = searchParams.get('status') || 'pending'

  const { data, error } = await supabaseAdmin
    .from('expense_approvals')
    .select('*, financial_transactions(*)')
    .eq('org_id', orgId)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH — approve or reject
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { id, action, reviewed_by, rejection_reason } = body

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { data: approval, error: fetchError } = await supabaseAdmin
    .from('expense_approvals')
    .select('transaction_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  if (approval.status !== 'pending') {
    return NextResponse.json({ error: 'Already processed' }, { status: 400 })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  const { error: updateError } = await supabaseAdmin
    .from('expense_approvals')
    .update({
      status: newStatus,
      reviewed_by: reviewed_by || null,
      reviewed_at: now,
      rejection_reason: action === 'reject' ? (rejection_reason || null) : null,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // If approved, confirm the transaction; if rejected, cancel it
  if (approval.transaction_id) {
    const txStatus = action === 'approve' ? 'confirmed' : 'cancelled'
    await supabaseAdmin
      .from('financial_transactions')
      .update({
        status: txStatus,
        approved_by: reviewed_by || null,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', approval.transaction_id)
  }

  return NextResponse.json({ success: true, status: newStatus })
}
