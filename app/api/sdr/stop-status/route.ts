// app/api/sdr/stop-status/route.ts
// Retorna o TTL da tag STOP (pausa temporária do atendente) para um lead

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stopTTL } from '@/lib/sdr/redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/sdr/stop-status?org_id=xxx&phone=5511999887766
 * Retorna { active: boolean, remaining_seconds: number }
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id')
    const phone = request.nextUrl.searchParams.get('phone')

    if (!orgId || !phone) {
      return NextResponse.json({ error: 'missing org_id or phone' }, { status: 400 })
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
