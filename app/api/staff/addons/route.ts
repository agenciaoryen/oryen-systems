import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin, safeErrorResponse } from '@/lib/api-auth'
import { ALL_ADDON_TYPES, type AddonType } from '@/lib/addons'

/**
 * POST /api/staff/addons
 * Cria ou atualiza um addon manual para uma org (sem Stripe).
 * Apenas staff pode usar.
 *
 * Body: { org_id: string, addon_type: AddonType, quantity: number }
 * quantity = 0 remove o addon
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (!auth.isStaff) {
      return NextResponse.json({ error: 'Acesso restrito a staff' }, { status: 403 })
    }

    const { org_id, addon_type, quantity } = await request.json()

    if (!org_id || !addon_type) {
      return NextResponse.json({ error: 'org_id e addon_type são obrigatórios' }, { status: 400 })
    }

    if (!ALL_ADDON_TYPES.includes(addon_type as AddonType)) {
      return NextResponse.json({ error: 'addon_type inválido' }, { status: 400 })
    }

    const qty = Math.max(0, Math.floor(Number(quantity) || 0))

    // Buscar addon existente (sem stripe — manual)
    const { data: existing } = await supabaseAdmin
      .from('org_addons')
      .select('id')
      .eq('org_id', org_id)
      .eq('addon_type', addon_type)
      .is('stripe_subscription_id', null)
      .limit(1)
      .maybeSingle()

    if (qty === 0) {
      // Remover addon
      if (existing) {
        await supabaseAdmin
          .from('org_addons')
          .delete()
          .eq('id', existing.id)
      }
    } else if (existing) {
      // Atualizar quantidade
      await supabaseAdmin
        .from('org_addons')
        .update({ quantity: qty, status: 'active', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      // Criar novo
      await supabaseAdmin
        .from('org_addons')
        .insert({
          org_id,
          addon_type,
          quantity: qty,
          status: 'active',
          stripe_subscription_id: null,
        })
    }

    return NextResponse.json({ success: true, addon_type, quantity: qty })
  } catch (err) {
    return safeErrorResponse(err, 'Erro ao gerenciar addon')
  }
}
