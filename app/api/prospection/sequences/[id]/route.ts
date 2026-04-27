// GET   /api/prospection/sequences/:id — detalhe de uma sequence
// PATCH /api/prospection/sequences/:id — atualiza config (name, description,
//                                         pause_on_stages, exit_on_reply, etc)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { id } = await context.params

    const { data: sequence, error } = await supabase
      .from('prospection_sequences')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error || !sequence) {
      return NextResponse.json({ error: 'Sequence não encontrada' }, { status: 404 })
    }

    const { data: steps } = await supabase
      .from('prospection_steps')
      .select('*')
      .eq('sequence_id', id)
      .order('position', { ascending: true })

    const { data: rules } = await supabase
      .from('prospection_enrollment_rules')
      .select('*')
      .eq('sequence_id', id)
      .order('priority', { ascending: true })

    const { data: enrollments } = await supabase
      .from('prospection_enrollments')
      .select(`
        id, status, current_step_position, enrolled_at, next_action_at, paused_at, completed_at,
        lead:leads(id, name, nome_empresa, phone, email, city, stage, source)
      `)
      .eq('sequence_id', id)
      .order('enrolled_at', { ascending: false })
      .limit(100)

    // Estatísticas de execução por step (success/failed/skipped + último erro)
    const stepIds = (steps || []).map((s: any) => s.id)
    const stepExecStats: Record<string, { success: number; failed: number; skipped: number; lastError?: string; lastErrorAt?: string }> = {}
    if (stepIds.length > 0) {
      const { data: executions } = await supabase
        .from('prospection_step_executions')
        .select('step_id, result, metadata, executed_at')
        .in('step_id', stepIds)
        .order('executed_at', { ascending: false })
        .limit(2000)

      for (const e of executions || []) {
        const sid = e.step_id as string
        if (!stepExecStats[sid]) stepExecStats[sid] = { success: 0, failed: 0, skipped: 0 }
        const stats = stepExecStats[sid]
        if (e.result === 'success') stats.success++
        else if (e.result === 'failed') {
          stats.failed++
          if (!stats.lastError && e.metadata?.error) {
            stats.lastError = String(e.metadata.error)
            stats.lastErrorAt = e.executed_at
          }
        } else if (e.result === 'skipped') stats.skipped++
      }
    }

    return NextResponse.json({
      sequence,
      steps: steps || [],
      rules: rules || [],
      enrollments: enrollments || [],
      stepExecStats,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin pode deletar sequences' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { id } = await context.params

    // Verifica se há enrollments ativos
    const { count: activeCount } = await supabase
      .from('prospection_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_id', id)
      .eq('status', 'active')

    if ((activeCount || 0) > 0) {
      return NextResponse.json(
        { error: `${activeCount} lead(s) ainda ativos nesta sequence. Pause-os antes de deletar.` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('prospection_sequences')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin pode editar sequences' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { id } = await context.params
    const body = await request.json()

    // Campos editáveis via PATCH (whitelist)
    const allowed: Record<string, any> = {}
    if (typeof body.name === 'string') allowed.name = body.name
    if (typeof body.description === 'string') allowed.description = body.description
    if (typeof body.is_active === 'boolean') allowed.is_active = body.is_active
    if (typeof body.exit_on_reply === 'boolean') allowed.exit_on_reply = body.exit_on_reply
    if (typeof body.pause_weekends === 'boolean') allowed.pause_weekends = body.pause_weekends
    if (Array.isArray(body.pause_on_stages)) {
      allowed.pause_on_stages = body.pause_on_stages.filter((s: any) => typeof s === 'string')
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido pra atualizar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('prospection_sequences')
      .update(allowed)
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
