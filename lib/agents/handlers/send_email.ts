// lib/agents/handlers/send_email.ts
// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER: send_email
//
// Capability `send_email` — envia email pro lead via Resend e registra a
// mensagem em `messages` pra aparecer no módulo Conversas.
//
// Input esperado:
//   - lead_id (resolvido via target.id se target.type='lead')
//   - subject, body                  (já renderizados, sem placeholders)
//   - variant?                       (variação A/B usada, opcional)
//   - from_name?                     (override do org.name)
//
// Output:
//   - email_to, email_provider_id, message_row_id
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { sendColdEmail } from '@/lib/email/sender'
import type { HandlerContext, HandlerResult } from '../kernel'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
function isValidEmail(s: string | null | undefined): boolean {
  if (!s) return false
  const v = String(s).trim().toLowerCase()
  if (!v || v === 'null' || v === 'undefined' || v === 'n/a') return false
  return EMAIL_REGEX.test(v)
}

export async function sendEmailHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const leadId = ctx.target?.id
  if (!leadId) {
    return { ok: false, error: 'lead_id não fornecido (target.id ausente)' }
  }

  const { subject, body, variant, from_name } = ctx.input as {
    subject?: string
    body?: string
    variant?: string
    from_name?: string
  }

  if (!subject || !body) {
    return { ok: false, error: 'subject e body são obrigatórios' }
  }

  // Busca o lead
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, email, phone')
    .eq('id', leadId)
    .single()

  if (!lead) {
    return { ok: false, error: `Lead ${leadId} não encontrado` }
  }

  if (!isValidEmail(lead.email)) {
    return {
      ok: false,
      error: `Email do lead inválido: ${lead.email || '(vazio)'}`,
    }
  }

  // Envia via Resend
  let providerId: string | undefined
  try {
    const result: any = await sendColdEmail({
      to: lead.email!,
      subject,
      bodyText: body,
      fromName: from_name || ctx.org.name || 'Oryen',
    })
    providerId = result?.id
  } catch (err: any) {
    return {
      ok: false,
      error: `Resend falhou: ${err.message}`,
    }
  }

  // Registra em messages pra aparecer em Conversas (via fn_insert_message)
  let messageRowId: string | undefined
  try {
    const { data: msgRow } = await supabase.rpc('fn_insert_message', {
      p_org_id: ctx.org_id,
      p_lead_id: leadId,
      p_channel: 'email',
      p_direction: 'outbound',
      p_body: `Assunto: ${subject}\n\n${body}`,
      p_sender_type: 'agent_bot',
      p_sender_name: 'BDR Email',
      p_message_type: 'text',
      p_timestamp: new Date().toISOString(),
    })
    messageRowId = (msgRow as any)?.id
  } catch (msgErr: any) {
    // Não falha o handler se o registro em messages falhar — email já foi enviado
    console.warn(`[handler:send_email] fn_insert_message falhou (não-fatal): ${msgErr.message}`)
  }

  return {
    ok: true,
    data: {
      email_to: lead.email,
      email_provider_id: providerId,
      message_row_id: messageRowId,
      variant: variant || 'A',
      subject,
    },
  }
}
