// PATCH  /api/prospection/sequences/:id/steps/:stepId — edita step
// DELETE /api/prospection/sequences/:id/steps/:stepId — remove step
// POST   /api/prospection/sequences/:id/steps/:stepId/move (body: direction=up|down)
//   implementado como PATCH especial via query ?action=move

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { id: sequenceId, stepId } = await context.params
    const body = await request.json()

    // Valida que step pertence à sequence e sequence à org
    const { data: step } = await supabase
      .from('prospection_steps')
      .select('*, sequence:prospection_sequences(id, org_id)')
      .eq('id', stepId)
      .eq('sequence_id', sequenceId)
      .single()
    if (!step || (Array.isArray(step.sequence) ? step.sequence[0] : step.sequence)?.org_id !== orgId) {
      return NextResponse.json({ error: 'Step não encontrado' }, { status: 404 })
    }

    // Ação especial: mover posição up/down
    if (body.action === 'move' && (body.direction === 'up' || body.direction === 'down')) {
      const delta = body.direction === 'up' ? -1 : 1
      const targetPosition = step.position + delta

      if (targetPosition < 1) {
        return NextResponse.json({ error: 'Já está no topo' }, { status: 400 })
      }

      // Encontra o step vizinho
      const { data: sibling } = await supabase
        .from('prospection_steps')
        .select('id, position')
        .eq('sequence_id', sequenceId)
        .eq('position', targetPosition)
        .maybeSingle()

      if (!sibling) {
        return NextResponse.json({ error: 'Nenhum step adjacente' }, { status: 400 })
      }

      // Troca posições usando buffer (pra não violar UNIQUE)
      await supabase.from('prospection_steps').update({ position: -1 }).eq('id', step.id)
      await supabase.from('prospection_steps').update({ position: step.position }).eq('id', sibling.id)
      await supabase.from('prospection_steps').update({ position: targetPosition }).eq('id', step.id)

      return NextResponse.json({ ok: true, new_position: targetPosition })
    }

    // Edição normal — whitelist de campos
    const allowed: Record<string, any> = {}
    const patchable = [
      'day_offset', 'channel', 'execution_mode', 'agent_slug',
      'assignee_mode', 'assignee_user_id', 'assignee_role',
      'whatsapp_instance_id', 'title', 'instruction',
      'message_templates', 'outcomes_policy',
    ]
    for (const key of patchable) {
      if (key in body) allowed[key] = body[key]
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'Nada pra atualizar' }, { status: 400 })
    }

    // Validações
    if (allowed.execution_mode === 'automated' && !allowed.agent_slug && !step.agent_slug) {
      return NextResponse.json({ error: 'agent_slug obrigatório quando automated' }, { status: 400 })
    }
    if (allowed.execution_mode === 'manual') {
      allowed.agent_slug = null
    }

    const { error } = await supabase
      .from('prospection_steps')
      .update(allowed)
      .eq('id', stepId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { id: sequenceId, stepId } = await context.params

    const { data: step } = await supabase
      .from('prospection_steps')
      .select('position, sequence:prospection_sequences(id, org_id)')
      .eq('id', stepId)
      .eq('sequence_id', sequenceId)
      .single()
    if (!step || (Array.isArray(step.sequence) ? step.sequence[0] : step.sequence)?.org_id !== orgId) {
      return NextResponse.json({ error: 'Step não encontrado' }, { status: 404 })
    }

    // Deleta o step
    await supabase.from('prospection_steps').delete().eq('id', stepId)

    // Compacta positions: decrementa 1 em todo step com position > deletada
    const { data: toShift } = await supabase
      .from('prospection_steps')
      .select('id, position')
      .eq('sequence_id', sequenceId)
      .gt('position', step.position)
      .order('position', { ascending: true })

    // Atualiza um a um (pra respeitar UNIQUE sequence_id + position)
    if (toShift) {
      for (const s of toShift) {
        await supabase
          .from('prospection_steps')
          .update({ position: s.position - 1 })
          .eq('id', s.id)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
