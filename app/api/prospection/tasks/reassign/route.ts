// POST /api/prospection/tasks/reassign
// Transfere N tasks abertas de um user para outro (admin only).
// Body: { from_user_id, to_user_id, count }
// Pega as `count` tasks abertas mais urgentes (due_at ASC) do origem
// e atualiza assignee_user_id pro destino.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OPEN_STATUSES = ['pending', 'in_progress', 'overdue', 'queued']

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin pode transferir tasks' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const body = await request.json()
    const fromUserId = body.from_user_id
    const toUserId = body.to_user_id
    const count = Number(body.count)

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'from_user_id e to_user_id obrigatórios' }, { status: 400 })
    }
    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Origem e destino são o mesmo user' }, { status: 400 })
    }
    if (!Number.isFinite(count) || count <= 0 || count > 500) {
      return NextResponse.json({ error: 'count deve ser entre 1 e 500' }, { status: 400 })
    }

    // Confirma que ambos os users são da mesma org
    const { data: users } = await supabase
      .from('users')
      .select('id, org_id, daily_task_capacity, status')
      .in('id', [fromUserId, toUserId])

    const fromUser = users?.find((u) => u.id === fromUserId)
    const toUser = users?.find((u) => u.id === toUserId)

    if (!fromUser || fromUser.org_id !== orgId) {
      return NextResponse.json({ error: 'User de origem não encontrado nesta org' }, { status: 404 })
    }
    if (!toUser || toUser.org_id !== orgId) {
      return NextResponse.json({ error: 'User de destino não encontrado nesta org' }, { status: 404 })
    }
    if ((toUser.daily_task_capacity ?? 0) <= 0) {
      return NextResponse.json(
        { error: 'User de destino está em opt-out (capacidade 0). Ajuste a capacidade antes.' },
        { status: 400 }
      )
    }
    if (toUser.status === 'inactive') {
      return NextResponse.json({ error: 'User de destino está inativo' }, { status: 400 })
    }

    // Pega as N tasks abertas mais urgentes do origem (due_at ASC)
    const { data: tasks, error: selErr } = await supabase
      .from('prospection_tasks')
      .select('id')
      .eq('org_id', orgId)
      .eq('assignee_user_id', fromUserId)
      .in('status', OPEN_STATUSES)
      .order('due_at', { ascending: true })
      .limit(count)

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })

    const taskIds = (tasks || []).map((t) => t.id)
    if (taskIds.length === 0) {
      return NextResponse.json({ ok: true, transferred: 0, message: 'Nenhuma task aberta para transferir' })
    }

    const { error: updErr } = await supabase
      .from('prospection_tasks')
      .update({ assignee_user_id: toUserId })
      .in('id', taskIds)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      transferred: taskIds.length,
      requested: count,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
