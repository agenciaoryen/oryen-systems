// app/api/distribution/reassign/route.ts
// POST: reatribuir lead manualmente ou via engine

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { reassignLead } from '@/lib/distribution/engine'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { lead_id, new_assignee_id } = body

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
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
