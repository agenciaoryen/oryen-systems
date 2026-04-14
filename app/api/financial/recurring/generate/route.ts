import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin } from '@/lib/api-auth'

// POST — generate monthly recurring expense transactions
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const org_id = resolveOrgId(auth, body.org_id)

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Get active recurring expenses that haven't been generated for this month
  const { data: recurring, error: fetchError } = await supabaseAdmin
    .from('recurring_expenses')
    .select('*')
    .eq('org_id', org_id)
    .eq('is_active', true)
    .or(`last_generated_month.is.null,last_generated_month.lt.${currentMonth}`)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!recurring || recurring.length === 0) {
    return NextResponse.json({ generated: 0, message: 'No recurring expenses to generate' })
  }

  let generated = 0

  for (const rec of recurring) {
    const txDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.min(rec.day_of_month, 28)).padStart(2, '0')}`

    const { error: insertError } = await supabaseAdmin
      .from('financial_transactions')
      .insert({
        org_id,
        type: 'expense',
        category: rec.category,
        amount: rec.amount,
        currency: rec.currency,
        description: rec.description,
        recurring_id: rec.id,
        status: 'confirmed',
        transaction_date: txDate,
        reference_month: currentMonth,
        created_by: rec.created_by,
      })

    if (!insertError) {
      await supabaseAdmin
        .from('recurring_expenses')
        .update({ last_generated_month: currentMonth, updated_at: new Date().toISOString() })
        .eq('id', rec.id)

      generated++
    }
  }

  return NextResponse.json({ generated, total: recurring.length })
}
