// GET  /api/prospection/tasks/reassign?user_id=...
//   Retorna agregação de tasks abertas do user, agrupadas por step
//   (step_id, step_title, step_position, sequence_name, count). Usado pelo
//   modal de transferência pra deixar o admin filtrar por etapa.
//
// POST /api/prospection/tasks/reassign
//   Transfere N tasks abertas de um user para outro (admin only).
//   Body: { from_user_id, to_user_id, count, step_ids? }
//   step_ids opcional — se passado, filtra só tasks dos steps listados.
//   Pega as `count` tasks mais urgentes (due_at ASC) e atualiza assignee.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OPEN_STATUSES = ['pending', 'in_progress', 'overdue', 'queued']

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const userId = request.nextUrl.searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })
    }

    const { data: tasks, error } = await supabase
      .from('prospection_tasks')
      .select(`
        id, step_id,
        step:prospection_steps(id, position, title, channel,
          sequence:prospection_sequences(id, name)
        )
      `)
      .eq('org_id', orgId)
      .eq('assignee_user_id', userId)
      .in('status', OPEN_STATUSES)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type StepGroup = {
      step_id: string
      step_position: number
      step_title: string | null
      step_channel: string
      sequence_id: string
      sequence_name: string
      count: number
    }
    const groups = new Map<string, StepGroup>()

    for (const t of tasks || []) {
      const step: any = t.step
      if (!step) continue
      const seq: any = step.sequence
      const key = step.id
      const existing = groups.get(key)
      if (existing) {
        existing.count++
      } else {
        groups.set(key, {
          step_id: step.id,
          step_position: step.position,
          step_title: step.title,
          step_channel: step.channel,
          sequence_id: seq?.id || '',
          sequence_name: seq?.name || '',
          count: 1,
        })
      }
    }

    const list = Array.from(groups.values()).sort((a, b) => {
      if (a.sequence_name !== b.sequence_name) return a.sequence_name.localeCompare(b.sequence_name)
      return a.step_position - b.step_position
    })

    return NextResponse.json({ steps: list, total: tasks?.length || 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

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
    const stepIds = Array.isArray(body.step_ids)
      ? body.step_ids.filter((s: any) => typeof s === 'string')
      : null

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'from_user_id e to_user_id obrigatórios' }, { status: 400 })
    }
    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Origem e destino são o mesmo user' }, { status: 400 })
    }
    if (!Number.isFinite(count) || count <= 0 || count > 500) {
      return NextResponse.json({ error: 'count deve ser entre 1 e 500' }, { status: 400 })
    }
    if (stepIds && stepIds.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos uma etapa' }, { status: 400 })
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

    // Pega as N tasks abertas mais urgentes do origem (due_at ASC).
    // Quando step_ids é passado, restringe àquelas etapas.
    let q = supabase
      .from('prospection_tasks')
      .select('id')
      .eq('org_id', orgId)
      .eq('assignee_user_id', fromUserId)
      .in('status', OPEN_STATUSES)
      .order('due_at', { ascending: true })
      .limit(count)

    if (stepIds && stepIds.length > 0) {
      q = q.in('step_id', stepIds)
    }

    const { data: tasks, error: selErr } = await q

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
