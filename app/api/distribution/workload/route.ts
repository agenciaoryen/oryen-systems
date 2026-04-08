// app/api/distribution/workload/route.ts
// GET: stats de carga da equipe

import { NextRequest, NextResponse } from 'next/server'
import { getTeamWorkload } from '@/lib/distribution/metrics'

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('org_id')
    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

    const workload = await getTeamWorkload(orgId)

    // Calcular métricas de equidade
    const activeCounts = workload.map(w => w.activeLeads)
    const total = activeCounts.reduce((s, c) => s + c, 0)
    const avg = workload.length > 0 ? total / workload.length : 0
    const maxDiff = workload.length > 0
      ? Math.max(...activeCounts) - Math.min(...activeCounts)
      : 0

    return NextResponse.json({
      workload,
      summary: {
        total_active_leads: total,
        avg_per_broker: Math.round(avg * 10) / 10,
        max_difference: maxDiff,
        broker_count: workload.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
