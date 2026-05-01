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

  // ─── 1. Cria registro em email_sends 'queued' ───
  // O webhook /api/email/webhook/resend escuta eventos do Resend e atualiza
  // este row pra delivered/opened/clicked/bounced. Sem esse insert, o admin
  // não tem visibilidade nenhuma sobre o que aconteceu com o email.
  const { data: sendRow, error: sendErr } = await supabase
    .from('email_sends')
    .insert({
      org_id: ctx.org_id,
      contact_id: null,                // não vem de email_contacts (este é o caminho prospection)
      lead_id: leadId,                  // referência direta pro lead
      subject,
      body_text: body,
      status: 'queued',
      agent_id: ctx.agent.id,           // qual colaborador IA mandou
      action_id: ctx.action_id,         // linha-de-rastro pro audit do kernel
    })
    .select('id')
    .single()

  if (sendErr) {
    return {
      ok: false,
      error: `Falha ao criar email_sends: ${sendErr.message}`,
    }
  }

  const emailSendId = sendRow.id

  // ─── 2. Dispara via Resend ───
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
    // Marca como failed em email_sends antes de retornar
    await supabase
      .from('email_sends')
      .update({
        status: 'failed',
        error_message: err.message?.substring(0, 500) || 'Resend error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailSendId)
    return { ok: false, error: `Resend falhou: ${err.message}` }
  }

  // ─── 3. Atualiza email_sends 'sent' com resend_message_id ───
  // Esse ID é a chave que o webhook Resend usa pra encontrar o row e
  // atualizar quando vier evento de delivered/opened/clicked/bounced.
  await supabase
    .from('email_sends')
    .update({
      status: 'sent',
      resend_message_id: providerId || null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', emailSendId)

  // ─── 4. Registra em messages pra aparecer em Conversas ───
  // Estratégia defensiva: garante que existe conversation channel='email'
  // ANTES de inserir a mensagem. Sem isso, RPCs antigas que assumiam
  // channel='whatsapp' não criavam conversation pra email e o admin não
  // via no módulo Conversas.
  let messageRowId: string | undefined
  try {
    // Upsert manual em conversations (channel='email')
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('org_id', ctx.org_id)
      .eq('lead_id', leadId)
      .eq('channel', 'email')
      .maybeSingle()

    let conversationId = existingConv?.id

    if (!conversationId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          org_id: ctx.org_id,
          lead_id: leadId,
          channel: 'email',
          status: 'active',
          last_message_body: subject,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      conversationId = newConv?.id
    } else {
      // Atualiza last_message do existente
      await supabase
        .from('conversations')
        .update({
          last_message_body: subject,
          last_message_at: new Date().toISOString(),
          status: 'active',
        })
        .eq('id', conversationId)
    }

    // Tenta a RPC unificada (cobre lógicas adicionais que existirem). Se falhar,
    // cai no insert direto em messages.
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
    } catch {
      // Fallback: insert direto em messages
      const { data: msgInsert } = await supabase
        .from('messages')
        .insert({
          org_id: ctx.org_id,
          lead_id: leadId,
          conversation_id: conversationId,
          channel: 'email',
          direction: 'outbound',
          body: `Assunto: ${subject}\n\n${body}`,
          sender_type: 'agent_bot',
          sender_name: 'BDR Email',
          message_type: 'text',
        })
        .select('id')
        .single()
      messageRowId = msgInsert?.id
    }
  } catch (msgErr: any) {
    // Não falha o handler — email já foi enviado e está em email_sends
    console.warn(`[handler:send_email] timeline em messages falhou (não-fatal): ${msgErr.message}`)
  }

  return {
    ok: true,
    data: {
      email_to: lead.email,
      email_send_id: emailSendId,        // permite consultar status no email_sends
      email_provider_id: providerId,
      message_row_id: messageRowId,
      variant: variant || 'A',
      subject,
    },
  }
}
