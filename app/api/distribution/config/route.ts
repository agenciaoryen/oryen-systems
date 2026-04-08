// app/api/distribution/config/route.ts
// GET: retorna config de distribuição da org
// PUT: atualiza config (admin/owner only)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_DISTRIBUTION_CONFIG } from '@/lib/distribution/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('org_id')
    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

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
    const body = await req.json()
    const { org_id, config } = body

    if (!org_id || !config) {
      return NextResponse.json({ error: 'org_id and config required' }, { status: 400 })
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
