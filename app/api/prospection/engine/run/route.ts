// POST /api/prospection/engine/run
// Dispara um ciclo do motor sob demanda (admin only).
// Útil pra testar sem esperar o cron de 15min.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId } from '@/lib/api-auth'
import { ensureProspectionAccess } from '@/lib/prospection/access'
import { runFullCycle } from '@/lib/prospection/engine'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    // Só admin ou staff podem disparar manualmente
    if (auth.role !== 'admin' && !auth.isStaff) {
      return NextResponse.json({ error: 'Somente admin pode rodar o motor manualmente' }, { status: 403 })
    }

    const orgId = resolveOrgId(auth, null)
    const gate = await ensureProspectionAccess(orgId)
    if (gate) return gate

    const result = await runFullCycle()
    return NextResponse.json({ success: true, ran_at: new Date().toISOString(), ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
