// POST /api/prospection/enrollments/bulk
// Inscreve múltiplos leads numa sequence de uma vez.
// Body: { sequence_id: string, lead_ids: string[] }
//
// Respeita a regra de 1 lead ativo por sequence (skip quem já tem enrollment).
// Retorna contagem de sucessos/falhas.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const body = await request.json()
    const { sequence_id, lead_ids } = body as {
      sequence_id: string
      lead_ids: string[]
    }

    if (!sequence_id || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'sequence_id e lead_ids (array não vazio) são obrigatórios' },
        { status: 400 }
      )
    }

    // Valida sequence pertence à org
    const { data: sequence } = await supabase
      .from('prospection_sequences')
      .select('id, org_id')
      .eq('id', sequence_id)
      .eq('org_id', orgId)
      .single()
    if (!sequence) {
      return NextResponse.json({ error: 'Sequence não encontrada' }, { status: 404 })
    }

    // Busca primeiro step da sequence
    const { data: firstStep } = await supabase
      .from('prospection_steps')
      .select('day_offset')
      .eq('sequence_id', sequence_id)
      .eq('position', 1)
      .single()
    if (!firstStep) {
      return NextResponse.json(
        { error: 'Sequence não tem o step 1 configurado' },
        { status: 400 }
      )
    }

    // Filtra leads da org que não têm enrollment ativo
    const { data: validLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('org_id', orgId)
      .in('id', lead_ids)

    const validIds = (validLeads || []).map((l: any) => l.id)

    const { data: alreadyActive } = await supabase
      .from('prospection_enrollments')
      .select('lead_id')
      .eq('status', 'active')
      .in('lead_id', validIds)

    const activeSet = new Set((alreadyActive || []).map((e: any) => e.lead_id))
    const toEnroll = validIds.filter((id) => !activeSet.has(id))

    if (toEnroll.length === 0) {
      return NextResponse.json({
        enrolled: 0,
        skipped: lead_ids.length,
        reason: 'Nenhum lead elegível (já estão em sequence ou não pertencem à org)',
      })
    }

    // next_action_at baseado no day_offset do step 1
    const nextActionAt = new Date()
    nextActionAt.setDate(nextActionAt.getDate() + Math.max(firstStep.day_offset - 1, 0))

    const rows = toEnroll.map((lead_id) => ({
      org_id: orgId,
      sequence_id,
      lead_id,
      current_step_position: 1,
      status: 'active' as const,
      next_action_at: nextActionAt.toISOString(),
      enrolled_by_user_id: auth.userId,
    }))

    const { error: insertErr, data: inserted } = await supabase
      .from('prospection_enrollments')
      .insert(rows)
      .select('id')

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      enrolled: inserted?.length ?? 0,
      skipped: lead_ids.length - (inserted?.length ?? 0),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
