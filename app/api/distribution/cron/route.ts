// app/api/distribution/cron/route.ts
// GET: cron job (cada 15min) — reassign timeout + stale + métricas
// Chamado pelo Vercel Cron

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processTimeoutReassignments } from '@/lib/distribution/auto-reassign'
import { processStaleReassignments } from '@/lib/distribution/stale-detector'
import { updateBrokerMetrics } from '@/lib/distribution/metrics'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Buscar todas as orgs com distribuição ativa
    const { data: orgs } = await supabase
      .from('orgs')
      .select('id, distribution_config')
      .not('distribution_config', 'is', null)

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ message: 'No orgs with distribution config', processed: 0 })
    }

    const results: any[] = []

    for (const org of orgs) {
      const config = org.distribution_config
      if (!config?.enabled) continue

      let timeoutReassigned = 0
      let staleReassigned = 0

      // 1. Processar timeouts
      if (config.auto_reassign_enabled) {
        timeoutReassigned = await processTimeoutReassignments(org.id)
        staleReassigned = await processStaleReassignments(org.id)
      }

      // 2. Atualizar métricas de brokers
      await updateBrokerMetrics(org.id)

      results.push({
        org_id: org.id,
        timeout_reassigned: timeoutReassigned,
        stale_reassigned: staleReassigned,
      })
    }

    console.log(`[Distribution:Cron] ✓ Processadas ${results.length} orgs`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (err: any) {
    console.error('[Distribution:Cron] Erro:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
