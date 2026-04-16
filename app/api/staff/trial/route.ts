import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin, safeErrorResponse } from '@/lib/api-auth'

/**
 * POST /api/staff/trial
 * Ativa um trial temporário para uma organização.
 * Apenas staff pode usar.
 *
 * Body: { org_id: string, plan: 'pro' | 'business' | 'enterprise', days: number }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (!auth.isStaff) {
      return NextResponse.json({ error: 'Acesso restrito a staff' }, { status: 403 })
    }

    const { org_id, plan, days } = await request.json()

    if (!org_id || !plan || !days) {
      return NextResponse.json({ error: 'org_id, plan e days são obrigatórios' }, { status: 400 })
    }

    const validPlans = ['pro', 'business', 'enterprise']
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Plano inválido. Use: pro, business ou enterprise' }, { status: 400 })
    }

    if (days < 1 || days > 30) {
      return NextResponse.json({ error: 'Duração deve ser entre 1 e 30 dias' }, { status: 400 })
    }

    // Calcular data de expiração
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + days)

    const { error } = await supabaseAdmin
      .from('orgs')
      .update({
        plan,
        plan_status: 'active',
        plan_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .eq('id', org_id)

    if (error) {
      console.error('[Staff Trial] Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao ativar trial' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan,
      trial_ends_at: trialEndsAt.toISOString(),
      days,
    })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao ativar trial')
  }
}
