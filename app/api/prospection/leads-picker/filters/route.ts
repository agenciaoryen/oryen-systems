// GET /api/prospection/leads-picker/filters
// Retorna as opções disponíveis para os filtros do modal de bulk enroll:
//   - stages: pipeline_stages da org
//   - sources: distinct de leads.source
//   - nichos: distinct de leads.nicho
//   - cities: top 30 cidades por volume

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'
import { stageColorHex } from '@/lib/stage-colors'

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

    // Stages do pipeline ATIVO da org
    const { data: stageRows } = await supabase
      .from('pipeline_stages')
      .select('name, label, color, position')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position', { ascending: true })
    const stages = (stageRows || []).map((s: any) => ({
      value: s.name,
      label: s.label || s.name,
      color: stageColorHex(s.color),
    }))

    // Campos distintos — busca leads da org e extrai únicos
    const { data: leadRows } = await supabase
      .from('leads')
      .select('source, nicho, city')
      .eq('org_id', orgId)
      .limit(5000)

    const sourceSet = new Set<string>()
    const nichoSet = new Set<string>()
    const cityCount: Record<string, number> = {}

    for (const l of leadRows || []) {
      if (l.source && String(l.source).trim()) sourceSet.add(l.source)
      if (l.nicho && String(l.nicho).trim()) nichoSet.add(l.nicho)
      if (l.city && String(l.city).trim()) {
        cityCount[l.city] = (cityCount[l.city] || 0) + 1
      }
    }

    const sources = Array.from(sourceSet).sort().map((v) => ({ value: v, label: v }))
    const nichos = Array.from(nichoSet).sort().map((v) => ({ value: v, label: v }))
    const cities = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([name, count]) => ({ value: name, label: `${name} (${count})` }))

    return NextResponse.json({ stages, sources, nichos, cities })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
