// POST /api/prospection/sequences/:id/steps
// Adiciona um novo step à sequence. Calcula a próxima position automaticamente.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { id: sequenceId } = await context.params
    const body = await request.json()

    // Valida que a sequence pertence à org
    const { data: seq } = await supabase
      .from('prospection_sequences')
      .select('id')
      .eq('id', sequenceId)
      .eq('org_id', orgId)
      .single()
    if (!seq) {
      return NextResponse.json({ error: 'Sequence não encontrada' }, { status: 404 })
    }

    // Próxima position = max existente + 1
    const { data: lastStep } = await supabase
      .from('prospection_steps')
      .select('position, day_offset')
      .eq('sequence_id', sequenceId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (lastStep?.position ?? 0) + 1
    const defaultDay = Math.max(lastStep?.day_offset ?? 0, 1) + 1

    const insertData: any = {
      sequence_id: sequenceId,
      position: nextPosition,
      day_offset: typeof body.day_offset === 'number' ? body.day_offset : defaultDay,
      channel: body.channel || 'whatsapp',
      execution_mode: body.execution_mode || 'manual',
      agent_slug: body.agent_slug || null,
      assignee_mode: body.assignee_mode || 'team_round_robin',
      assignee_user_id: body.assignee_user_id || null,
      assignee_role: body.assignee_role || null,
      whatsapp_instance_id: body.whatsapp_instance_id || null,
      title: body.title || `Etapa ${nextPosition}`,
      instruction: body.instruction || null,
      message_templates: Array.isArray(body.message_templates) ? body.message_templates : [],
      outcomes_policy: body.outcomes_policy || null,
    }

    // Validações: quando automated, agent_slug obrigatório
    if (insertData.execution_mode === 'automated' && !insertData.agent_slug) {
      return NextResponse.json(
        { error: 'agent_slug obrigatório quando execution_mode=automated' },
        { status: 400 }
      )
    }

    const { data: step, error } = await supabase
      .from('prospection_steps')
      .insert(insertData)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ step })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
