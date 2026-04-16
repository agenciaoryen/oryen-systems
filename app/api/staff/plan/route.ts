import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin, safeErrorResponse } from '@/lib/api-auth'

/**
 * POST /api/staff/plan
 * Altera o plano e status de uma organização manualmente.
 * Apenas staff pode usar.
 *
 * Body: { org_id: string, plan: string, plan_status: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (!auth.isStaff) {
      return NextResponse.json({ error: 'Acesso restrito a staff' }, { status: 403 })
    }

    const { org_id, plan, plan_status } = await request.json()

    if (!org_id || !plan || !plan_status) {
      return NextResponse.json({ error: 'org_id, plan e plan_status são obrigatórios' }, { status: 400 })
    }

    const validPlans = ['starter', 'pro', 'business', 'enterprise']
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    const validStatuses = ['active', 'trial', 'past_due', 'canceled']
    if (!validStatuses.includes(plan_status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      plan,
      plan_status,
    }

    // Se ativando, setar plan_started_at
    if (plan_status === 'active') {
      updateData.plan_started_at = new Date().toISOString()
    }

    // Se cancelando ou mudando pra trial, limpar trial_ends_at
    if (plan_status === 'canceled' || plan_status === 'trial') {
      updateData.trial_ends_at = null
    }

    const { error } = await supabaseAdmin
      .from('orgs')
      .update(updateData)
      .eq('id', org_id)

    if (error) {
      console.error('[Staff Plan] Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao alterar plano' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan,
      plan_status,
    })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao alterar plano')
  }
}
