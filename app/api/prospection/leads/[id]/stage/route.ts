// POST /api/prospection/leads/:id/stage
// Muda o estágio do lead + registra lead_event de stage_changed.
// Gated por niche ai_agency e valida que o lead pertence à org.

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

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { id: leadId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { stage } = body as { stage?: string }

    if (!stage || typeof stage !== 'string') {
      return NextResponse.json({ error: 'stage é obrigatório' }, { status: 400 })
    }

    // Busca estado atual do lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, stage')
      .eq('id', leadId)
      .eq('org_id', orgId)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    if (lead.stage === stage) {
      return NextResponse.json({ ok: true, unchanged: true })
    }

    // Valida que o stage existe no pipeline da org
    const { data: stageRow } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('org_id', orgId)
      .eq('name', stage)
      .maybeSingle()

    if (!stageRow) {
      return NextResponse.json(
        { error: `Estágio "${stage}" não existe no pipeline desta org` },
        { status: 400 }
      )
    }

    // Atualiza lead
    const { error: updErr } = await supabase
      .from('leads')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('org_id', orgId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Registra evento de mudança de estágio (pra relatórios de fluxo)
    await supabase.from('lead_events').insert({
      org_id: orgId,
      lead_id: leadId,
      type: 'stage_changed',
      user_id: auth.userId,
      content: `Estágio alterado de "${lead.stage ?? '—'}" para "${stage}"`,
      details: {
        from_stage: lead.stage,
        to_stage: stage,
        source: 'prospection_card',
      },
    })

    return NextResponse.json({ ok: true, from: lead.stage, to: stage })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
