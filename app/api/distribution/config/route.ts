// app/api/distribution/config/route.ts
// GET: retorna config de distribuição da org
// PUT: atualiza config (admin/owner only)

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'
import { DEFAULT_DISTRIBUTION_CONFIG } from '@/lib/distribution/types'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, req.nextUrl.searchParams.get('org_id'))

    const { data } = await supabase
      .from('orgs')
      .select('distribution_config')
      .eq('id', orgId)
      .single()

    const config = data?.distribution_config
      ? { ...DEFAULT_DISTRIBUTION_CONFIG, ...data.distribution_config }
      : DEFAULT_DISTRIBUTION_CONFIG

    return NextResponse.json({ config })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { config } = body

    if (!config) {
      return NextResponse.json({ error: 'config required' }, { status: 400 })
    }

    // Validar campos
    const validStrategies = ['round_robin', 'balanced_load', 'score_weighted', 'expertise_match']
    if (config.strategy && !validStrategies.includes(config.strategy)) {
      return NextResponse.json({ error: 'Invalid strategy' }, { status: 400 })
    }

    const { error } = await supabase
      .from('orgs')
      .update({
        distribution_config: config,
      })
      .eq('id', org_id)

    if (error) throw error

    return NextResponse.json({ success: true, config })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
