// app/api/distribution/stale/route.ts
// GET: leads estagnados da org

import { NextRequest, NextResponse } from 'next/server'
import { detectStaleLeads } from '@/lib/distribution/stale-detector'

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('org_id')
    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

    const staleLeads = await detectStaleLeads(orgId)

    return NextResponse.json({
      stale_leads: staleLeads,
      count: staleLeads.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
