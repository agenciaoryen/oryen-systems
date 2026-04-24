// GET  /api/prospection/sequences   — lista sequences da org
// POST /api/prospection/sequences   — cria nova sequence (admin-only)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, request.nextUrl.searchParams.get('org_id'))
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const { data, error } = await supabase
      .from('prospection_sequences')
      .select(`
        id, name, description, is_active, exit_on_reply, pause_weekends,
        created_at, updated_at,
        steps:prospection_steps(id, position, day_offset, channel, title, execution_mode),
        rules:prospection_enrollment_rules(id, name, trigger_event, is_active, priority),
        active_count:prospection_enrollments(count)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sequences = (data || []).map((s: any) => ({
      ...s,
      steps: (s.steps || []).sort((a: any, b: any) => a.position - b.position),
      active_count: s.active_count?.[0]?.count ?? 0,
    }))

    return NextResponse.json({ sequences })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin pode criar sequences' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const body = await request.json()
    const {
      name,
      description,
      duplicate_of,
    } = body as { name?: string; description?: string; duplicate_of?: string }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
    }

    // Cria sequence vazia
    const { data: seq, error: seqErr } = await supabase
      .from('prospection_sequences')
      .insert({
        org_id: orgId,
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true,
        exit_on_reply: true,
        pause_weekends: false,
        timezone_mode: 'org',
        business_hours_start: '09:00:00',
        business_hours_end: '19:00:00',
        created_by: auth.userId,
      })
      .select()
      .single()

    if (seqErr || !seq) {
      return NextResponse.json({ error: seqErr?.message || 'Erro ao criar' }, { status: 500 })
    }

    // Se for duplicação, copia os steps da sequence-fonte
    if (duplicate_of) {
      const { data: sourceSteps } = await supabase
        .from('prospection_steps')
        .select('*')
        .eq('sequence_id', duplicate_of)
        .order('position', { ascending: true })

      if (sourceSteps && sourceSteps.length > 0) {
        const clonedSteps = sourceSteps.map((s: any) => ({
          sequence_id: seq.id,
          position: s.position,
          day_offset: s.day_offset,
          channel: s.channel,
          execution_mode: s.execution_mode,
          agent_slug: s.agent_slug,
          assignee_mode: s.assignee_mode,
          assignee_user_id: s.assignee_user_id,
          assignee_role: s.assignee_role,
          whatsapp_instance_id: s.whatsapp_instance_id,
          title: s.title,
          instruction: s.instruction,
          message_templates: s.message_templates,
          outcomes_policy: s.outcomes_policy,
        }))
        await supabase.from('prospection_steps').insert(clonedSteps)
      }
    }

    return NextResponse.json({ sequence: seq })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
