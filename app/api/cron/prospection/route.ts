// GET /api/cron/prospection
// Endpoint do Vercel Cron que executa um ciclo completo do motor de prospecção.
// Configurado em vercel.json pra rodar a cada 15 minutos.

import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/api-auth'
import { runFullCycle } from '@/lib/prospection/engine'

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runFullCycle()
    return NextResponse.json({
      success: true,
      ran_at: new Date().toISOString(),
      ...result,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Engine failure' },
      { status: 500 }
    )
  }
}
