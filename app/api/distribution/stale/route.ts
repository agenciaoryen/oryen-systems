// app/api/distribution/stale/route.ts
// GET: leads estagnados da org

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { detectStaleLeads } from '@/lib/distribution/stale-detector'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, req.nextUrl.searchParams.get('org_id'))

    const staleLeads = await detectStaleLeads(orgId)

    return NextResponse.json({
      stale_leads: staleLeads,
      count: staleLeads.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
