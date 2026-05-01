// lib/agents/handlers/capture_leads_serper.ts
// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER: capture_leads_serper
//
// Capability `capture_leads_serper` — adapter que executa o runHunterCampaign
// existente dentro do kernel. Sem reescrever a lógica de busca/scrape/dedup
// (que já é robusta), só envolve no padrão do kernel pra ganhar:
//   - Gates uniformes (plano, estado, capability, quota)
//   - Audit log central em agent_actions
//   - Aprovação humana (quando admin habilita)
//   - Visibilidade no /dashboard/agents/<id>/live
//
// Input esperado (preenchido pelo dispatcher /api/agents/run-campaign):
//   - run_id, campaign_id, max_leads
//   - campaign (objeto completo da campanha pra runner usar config)
// Output:
//   - leads_found, leads_saved, leads_duplicated, status
// ═══════════════════════════════════════════════════════════════════════════════

import { runHunterCampaign } from '@/lib/agents/hunter/runner'
import type { HandlerContext, HandlerResult } from '../kernel'

export async function captureLeadsSerperHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const input = ctx.input as {
    run_id?: string
    campaign?: any
    max_leads?: number
  }

  if (!input.run_id || !input.campaign || !input.max_leads) {
    return {
      ok: false,
      error: 'run_id, campaign e max_leads são obrigatórios',
    }
  }

  const result = await runHunterCampaign({
    runId: input.run_id,
    campaign: input.campaign,
    agent: ctx.agent,
    org: {
      id: ctx.org.id,
      country: ctx.org.country,
      language: ctx.org.language,
      name: ctx.org.name,
      niche: ctx.org.niche,
    },
    maxLeads: input.max_leads,
  })

  if (result.status === 'error') {
    return {
      ok: false,
      error: result.error_message || 'Hunter runner falhou',
      data: {
        leads_found: result.leads_found,
        leads_saved: result.leads_saved,
        leads_duplicated: result.leads_duplicated,
        duration_ms: result.duration_ms,
      },
    }
  }

  return {
    ok: true,
    data: {
      leads_found: result.leads_found,
      leads_saved: result.leads_saved,
      leads_duplicated: result.leads_duplicated,
      duration_ms: result.duration_ms,
      status: result.status,
    },
  }
}
