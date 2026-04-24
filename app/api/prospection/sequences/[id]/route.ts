// GET /api/prospection/sequences/:id — detalhe de uma sequence

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
        lead:leads(id, name, phone, email, city, stage, source)
      `)
      .eq('sequence_id', id)
      .order('enrolled_at', { ascending: false })
      .limit(100)

    return NextResponse.json({
      sequence,
      steps: steps || [],
      rules: rules || [],
      enrollments: enrollments || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
