// app/api/sdr/stop-status/route.ts
// Retorna o TTL da tag STOP (pausa temporária do atendente) para um lead

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { stopTTL } from '@/lib/sdr/redis'

/**
 * GET /api/sdr/stop-status?org_id=xxx&phone=5511999887766
 * Retorna { active: boolean, remaining_seconds: number }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, request.nextUrl.searchParams.get('org_id'))
    const phone = request.nextUrl.searchParams.get('phone')

    if (!phone) {
      return NextResponse.json({ error: 'missing phone' }, { status: 400 })
    }

    const remaining = await stopTTL(orgId, phone)

    return NextResponse.json({
      active: remaining > 0,
      remaining_seconds: remaining
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
