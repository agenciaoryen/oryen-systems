// GET /api/email/process-queue
// Cron endpoint — chamado a cada 5 min pelo Vercel Cron.
// Pra cada campanha active, manda processar respeitando rate limit.
// Protegido por CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api-auth'
import { processEmailCampaign } from '@/lib/email/processor'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Busca campanhas ativas do agent bdr_email
  const { data: activeCampaigns } = await supabaseAdmin
    .from('agent_campaigns')
    .select('id, agent_id, agents!inner(solution_slug)')
    .eq('status', 'active')
    .eq('agents.solution_slug', 'bdr_email')

  if (!activeCampaigns || activeCampaigns.length === 0) {
    return NextResponse.json({ processed: 0, campaigns: 0 })
  }

  const results = []
  for (const c of activeCampaigns) {
    try {
      const r = await processEmailCampaign(c.id)
      results.push(r)
    } catch (err: any) {
      console.error(`[email-cron] campanha ${c.id} falhou:`, err.message)
      results.push({ campaign_id: c.id, error: err.message })
    }
  }

  return NextResponse.json({ campaigns: activeCampaigns.length, results })
}
