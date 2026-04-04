// app/api/sdr/stop-clear/route.ts
// Remove a tag STOP (pausa temporária do atendente) para um lead

import { NextRequest, NextResponse } from 'next/server'
import { stopClear } from '@/lib/sdr/redis'

/**
 * POST /api/sdr/stop-clear
 * Body: { org_id, phone }
 * Remove o STOP e permite que a IA volte a responder imediatamente
 */
export async function POST(request: NextRequest) {
  try {
    const { org_id, phone } = await request.json()

    if (!org_id || !phone) {
      return NextResponse.json({ error: 'missing org_id or phone' }, { status: 400 })
    }

    await stopClear(org_id, phone)

    return NextResponse.json({ success: true, cleared: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
