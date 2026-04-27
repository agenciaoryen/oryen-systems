// GET /api/prospection/upcoming
// Lista o que está agendado para sair hoje + amanhã pelo motor de prospecção.
// Útil pro admin enxergar a fila de emails antes do cron rodar.

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

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    // Busca enrollments ativos com next_action_at até fim de amanhã
    const now = new Date()
    const endOfTomorrow = new Date(now)
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
    endOfTomorrow.setHours(23, 59, 59, 999)

    const { data: enrollments, error } = await supabase
      .from('prospection_enrollments')
      .select(`
        id, status, current_step_position, next_action_at, enrolled_at,
        sequence:prospection_sequences(id, name, is_active),
        lead:leads(id, name, nome_empresa, email, phone, city, stage)
      `)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .not('next_action_at', 'is', null)
      .lte('next_action_at', endOfTomorrow.toISOString())
      .order('next_action_at', { ascending: true })
      .limit(500)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Pega todos os steps das sequences referenciadas (1 query só, sem N+1)
    const sequenceIds = Array.from(
      new Set((enrollments || []).map((e: any) => e.sequence?.id).filter(Boolean))
    )

    const stepsBySequence: Record<string, any[]> = {}
    if (sequenceIds.length > 0) {
      const { data: steps } = await supabase
        .from('prospection_steps')
        .select('id, sequence_id, position, channel, execution_mode, agent_slug, title, day_offset, message_templates')
        .in('sequence_id', sequenceIds)

      for (const s of steps || []) {
        if (!stepsBySequence[s.sequence_id]) stepsBySequence[s.sequence_id] = []
        stepsBySequence[s.sequence_id].push(s)
      }
    }

    // Resolve o step de cada enrollment + bucketiza
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    type Item = {
      enrollment_id: string
      lead: any
      sequence: any
      step: any
      next_action_at: string
      bucket: 'overdue' | 'today' | 'tomorrow'
    }

    const items: Item[] = []
    for (const e of enrollments || []) {
      const seqId = (e.sequence as any)?.id
      if (!seqId) continue
      const steps = stepsBySequence[seqId] || []
      const step = steps.find((s) => s.position === e.current_step_position)
      if (!step) continue

      const due = new Date(e.next_action_at!)
      let bucket: Item['bucket']
      if (due < now) bucket = 'overdue'
      else if (due <= todayEnd) bucket = 'today'
      else bucket = 'tomorrow'

      items.push({
        enrollment_id: e.id,
        lead: e.lead,
        sequence: e.sequence,
        step,
        next_action_at: e.next_action_at!,
        bucket,
      })
    }

    // Resumo por canal/modo
    const summary = {
      total: items.length,
      automated_email: items.filter((i) => i.step.execution_mode === 'automated' && i.step.channel === 'email').length,
      manual: items.filter((i) => i.step.execution_mode === 'manual').length,
      overdue: items.filter((i) => i.bucket === 'overdue').length,
      today: items.filter((i) => i.bucket === 'today').length,
      tomorrow: items.filter((i) => i.bucket === 'tomorrow').length,
    }

    return NextResponse.json({ items, summary })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
