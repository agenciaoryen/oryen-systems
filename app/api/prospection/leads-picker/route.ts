// GET /api/prospection/leads-picker
// Lista leads da org filtráveis pra inscrição manual.
// Marca quais já estão em alguma sequence ativa.
//
// Query params:
//   ?search=texto       → busca por nome ou telefone
//   ?source=X           → filtra por source
//   ?stage=Y            → filtra por stage
//   ?limit=100          → default 100

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

    const params = request.nextUrl.searchParams
    const search = params.get('search')?.trim()
    const source = params.get('source')
    const stage = params.get('stage')
    const limit = Math.min(parseInt(params.get('limit') || '100', 10), 500)

    let query = supabase
      .from('leads')
      .select('id, name, phone, email, city, source, stage, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (source) query = query.eq('source', source)
    if (stage) query = query.eq('stage', stage)

    const { data: leads, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const leadIds = (leads || []).map((l: any) => l.id)
    let activeSet = new Set<string>()
    if (leadIds.length > 0) {
      const { data: active } = await supabase
        .from('prospection_enrollments')
        .select('lead_id, sequence:prospection_sequences(name)')
        .eq('status', 'active')
        .in('lead_id', leadIds)
      activeSet = new Set((active || []).map((a: any) => a.lead_id))
    }

    const enriched = (leads || []).map((l: any) => ({
      ...l,
      has_active_enrollment: activeSet.has(l.id),
    }))

    return NextResponse.json({ leads: enriched, total: enriched.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
