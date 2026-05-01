// lib/agents/handlers/generate_reply.ts
// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER: generate_reply
//
// Capability `generate_reply` — wrapper sobre `runAgent` (lib/sdr/ai-agent).
// Gera a resposta IA via LLM com tools, mantendo o pipeline existente
// (intake → enricher → responder → tool loop) intocado. Só envolve no
// padrão do kernel pra ganhar:
//   - Audit log central (toda chamada vira agent_action)
//   - Visibilidade no /dashboard/agents/<id>/live
//   - Modo supervisão configurável (admin pode forçar review antes da
//     resposta sair — útil pra início de implantação até confiança)
//
// Input esperado:
//   - phone, lead_id, agent_id, campaign_id, instance_name
//   - user_message (texto recebido)
//   - history (conversação)
//   - lead, config (opcionais — passa pra runAgent montar contexto)
//
// Output:
//   - messages[]: respostas já splitadas
//   - tools_executed[], tokens_used, model
// ═══════════════════════════════════════════════════════════════════════════════

import { runAgent, type AgentResponse } from '@/lib/sdr/ai-agent'
import type { HandlerContext, HandlerResult } from '../kernel'

interface GenerateReplyInput {
  phone: string
  lead_id: string
  campaign_id: string | null
  instance_name: string
  user_message: string
  history: any[]
  lead: any
  config?: Record<string, any> | null
}

export async function generateReplyHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const input = ctx.input as GenerateReplyInput

  if (!input.phone || !input.lead_id || !input.user_message) {
    return { ok: false, error: 'phone, lead_id e user_message são obrigatórios' }
  }

  let response: AgentResponse
  try {
    response = await runAgent({
      org_id: ctx.org_id,
      phone: input.phone,
      lead_id: input.lead_id,
      agent_id: ctx.agent.id,
      campaign_id: input.campaign_id,
      instance_name: input.instance_name,
      user_message: input.user_message,
      history: input.history || [],
      config: input.config || (ctx.agent.config as any) || null,
      lead: input.lead,
      org: {
        name: ctx.org.name || undefined,
        country: ctx.org.country || undefined,
        language: ctx.org.language || undefined,
        niche: ctx.org.niche || undefined,
      },
    })
  } catch (err: any) {
    return { ok: false, error: `runAgent falhou: ${err.message}` }
  }

  return {
    ok: true,
    data: {
      messages: response.messages,
      tools_executed: response.toolsExecuted,
      tokens_used: response.tokensUsed,
      model: response.model,
      messages_count: response.messages.length,
    },
  }
}
