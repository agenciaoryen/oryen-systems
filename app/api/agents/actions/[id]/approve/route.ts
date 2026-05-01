// app/api/agents/actions/[id]/approve/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Aprova ou rejeita uma agent_action pendente.
//
// POST /api/agents/actions/:id/approve
//   body: { decision: 'approved' | 'rejected', reason?: string }
//
//   Approved → atualiza approval_status='approved' + approved_by_user_id
//              chama kernel.resumePendingAction → executa handler
//
//   Rejected → atualiza approval_status='rejected' + rejection_reason
//              status='denied', denied_reason='rejected_by_human'
//
// Apenas admin/staff podem aprovar ações da própria org.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { resumePendingAction, rejectPendingAction } from '@/lib/agents/kernel'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pode demorar (handler executa side-effect real)
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json(
        { error: 'Somente admin pode aprovar/rejeitar ações de colaboradores IA' },
        { status: 403 }
      )
    }

    const orgId = resolveOrgId(auth, null)
    const { id: actionId } = await context.params
    const body = await request.json()
    const decision = body.decision as 'approved' | 'rejected'
    const reason = body.reason as string | undefined

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'decision deve ser "approved" ou "rejected"' },
        { status: 400 }
      )
    }

    // Confirma que a action é da org do admin
    const { data: action } = await supabase
      .from('agent_actions')
      .select('id, org_id, capability, agent_id, approval_status, status')
      .eq('id', actionId)
      .maybeSingle()

    if (!action) {
      return NextResponse.json({ error: 'Action não encontrada' }, { status: 404 })
    }

    if (action.org_id !== orgId && !auth.isStaff) {
      return NextResponse.json({ error: 'Action não pertence à sua org' }, { status: 403 })
    }

    if (action.approval_status !== 'pending') {
      return NextResponse.json(
        {
          error: `Action não está pendente (approval_status=${action.approval_status})`,
          action,
        },
        { status: 409 }
      )
    }

    // ─── REJECT ─────────────────────────────────────────────────────────────
    if (decision === 'rejected') {
      const result = await rejectPendingAction(actionId, auth.userId, reason)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      return NextResponse.json({
        ok: true,
        decision: 'rejected',
        action_id: actionId,
      })
    }

    // ─── APPROVE ────────────────────────────────────────────────────────────
    // 1. Marca approval_status='approved' (o resumePendingAction lê isso)
    await supabase
      .from('agent_actions')
      .update({
        approval_status: 'approved',
        approved_by_user_id: auth.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', actionId)

    // 2. Reexecuta — kernel pega input persistido, resolve handler do registry,
    //    reverifica gates (caso tenha mudado entre pedido e aprovação) e executa.
    const result = await resumePendingAction(actionId, auth.userId)

    return NextResponse.json({
      ok: result.status === 'success',
      decision: 'approved',
      action_id: actionId,
      result,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
