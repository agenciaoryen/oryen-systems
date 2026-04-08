// app/api/distribution/reassign/route.ts
// POST: reatribuir lead manualmente ou via engine

import { NextRequest, NextResponse } from 'next/server'
import { reassignLead } from '@/lib/distribution/engine'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { org_id, lead_id, new_assignee_id } = body

    if (!org_id || !lead_id) {
      return NextResponse.json({ error: 'org_id and lead_id required' }, { status: 400 })
    }

    const result = await reassignLead(
      lead_id,
      org_id,
      'manual_reassign',
      new_assignee_id || undefined
    )

    return NextResponse.json({
      success: true,
      assigned_to: result.assignedTo,
      strategy: result.strategy,
      reason: result.reason,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
