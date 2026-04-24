// GET  /api/prospection/sequences           — lista sequences da org
// POST /api/prospection/sequences           — cria nova sequence (v2)

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
