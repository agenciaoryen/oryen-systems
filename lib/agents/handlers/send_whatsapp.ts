// lib/agents/handlers/send_whatsapp.ts
// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER: send_whatsapp
//
// Capability `send_whatsapp` — wrapper sobre `sendWithHumanization`
// (lib/sdr/whatsapp-sender). Envia mensagem(ns) via UAZAPI ou Cloud API
// com humanização (typing delay 55ms/char), retries e logging.
//
// Quem chama:
//   - SDR ao responder lead (via /api/sdr/process)
//   - Follow-up (via /api/sdr/follow-up)
//   - BDR Prospector (cold outreach — admin pode override pra modo
//     supervisão via approval_overrides)
//
// Input esperado:
//   - phone (sem @s.whatsapp.net)
//   - instance_name
//   - messages[]
//
// Output:
//   - sent_count, failed_count, total_time_ms
// ═══════════════════════════════════════════════════════════════════════════════

import { sendWithHumanization } from '@/lib/sdr/whatsapp-sender'
import type { HandlerContext, HandlerResult } from '../kernel'

interface SendWhatsAppInput {
  phone: string
  instance_name: string
  messages: string[]
}

export async function sendWhatsAppHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const input = ctx.input as SendWhatsAppInput

  if (!input.phone || !input.instance_name || !Array.isArray(input.messages) || input.messages.length === 0) {
    return { ok: false, error: 'phone, instance_name e messages[] são obrigatórios' }
  }

  try {
    const result = await sendWithHumanization({
      org_id: ctx.org_id,
      phone: input.phone,
      instance_name: input.instance_name,
      messages: input.messages,
    })

    const ok = result.failed === 0
    return {
      ok,
      data: {
        sent_count: result.sent,
        failed_count: result.failed,
        total_time_ms: result.total_time_ms,
        // Detalhes só pra audit interno — não vamos vazar conteúdo no kernel
        // se houver falhas, retorna o motivo agregado pro UI mostrar.
        first_error: result.details.find((d) => d.status === 'failed')?.error || null,
      },
      error: ok ? undefined : `${result.failed} mensagem(ns) falharam`,
    }
  } catch (err: any) {
    return { ok: false, error: `sendWithHumanization falhou: ${err.message}` }
  }
}
