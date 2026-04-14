// app/api/sdr/stop-clear/route.ts
// Remove a tag STOP (pausa temporária do atendente) para um lead

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { stopClear } from '@/lib/sdr/redis'

/**
 * POST /api/sdr/stop-clear
 * Body: { org_id, phone }
 * Remove o STOP e permite que a IA volte a responder imediatamente
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ error: 'missing phone' }, { status: 400 })
    }

    await stopClear(org_id, phone)

    return NextResponse.json({ success: true, cleared: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
