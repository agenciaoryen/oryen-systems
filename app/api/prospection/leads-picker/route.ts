// GET /api/prospection/leads-picker
// Lista leads da org filtráveis pra inscrição manual.
// Marca quais já estão em alguma sequence ativa.
//
// Query params:
//   ?search=texto       → busca por nome/telefone/email
//   ?source=X           → filtro exato por source (pode repetir: source=a&source=b)
//   ?stage=Y            → filtro exato por stage (pode repetir)
//   ?nicho=Z            → filtro exato por nicho (pode repetir)
//   ?city=W             → busca ilike por city
//   ?interesse=compra   → filtro exato
//   ?limit=200          → default 200 (max 500)
//   ?only_eligible=1    → retorna só leads sem enrollment ativo

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
    const sources = params.getAll('source').filter(Boolean)
    const stages = params.getAll('stage').filter(Boolean)
    const nichos = params.getAll('nicho').filter(Boolean)
    const city = params.get('city')?.trim()
    const interesse = params.get('interesse')
    const limit = Math.min(parseInt(params.get('limit') || '200', 10), 500)
    const onlyEligible = params.get('only_eligible') === '1'

    let query = supabase
      .from('leads')
      .select('id, name, phone, email, city, source, stage, nicho, interesse, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (sources.length > 0) query = query.in('source', sources)
    if (stages.length > 0) query = query.in('stage', stages)
    if (nichos.length > 0) query = query.in('nicho', nichos)
    if (city) query = query.ilike('city', `%${city}%`)
    if (interesse) query = query.eq('interesse', interesse)

    const { data: leads, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const leadIds = (leads || []).map((l: any) => l.id)
    let activeSet = new Set<string>()
    if (leadIds.length > 0) {
      const { data: active } = await supabase
        .from('prospection_enrollments')
        .select('lead_id')
        .eq('status', 'active')
        .in('lead_id', leadIds)
      activeSet = new Set((active || []).map((a: any) => a.lead_id))
    }

    let enriched = (leads || []).map((l: any) => ({
      ...l,
      has_active_enrollment: activeSet.has(l.id),
    }))

    if (onlyEligible) {
      enriched = enriched.filter((l: any) => !l.has_active_enrollment)
    }

    return NextResponse.json({
      leads: enriched,
      total: enriched.length,
      has_more: enriched.length === limit,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
