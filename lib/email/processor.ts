// lib/email/processor.ts
// Processa a fila de envios de uma campanha de email BDR.
// Respeita rate limit por hora. Idempotente — pode ser chamado várias vezes.

import { createClient } from '@supabase/supabase-js'
import { generateColdEmail } from './ai-generator'
import { sendColdEmail } from './sender'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ProcessResult {
  campaign_id: string
  processed: number
  failed: number
  remaining: number
  rate_limited: boolean
}

/**
 * Processa uma campanha de email — envia N contatos pending respeitando rate limit.
 *
 * Fluxo:
 *   1. Busca campanha ativa + config
 *   2. Conta quantos emails já enviamos na última hora (rate limit)
 *   3. Calcula "budget" restante pra essa execução
 *   4. Pega N contatos pending, gera email pra cada um, envia, atualiza status
 */
export async function processEmailCampaign(campaignId: string): Promise<ProcessResult> {
  // 1. Busca campanha
  const { data: campaign, error: campErr } = await supabase
    .from('agent_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campErr || !campaign) throw new Error(`Campanha ${campaignId} não encontrada`)
  if (campaign.status !== 'active') {
    return { campaign_id: campaignId, processed: 0, failed: 0, remaining: 0, rate_limited: false }
  }

  const config = campaign.config || {}
  const emailsPerHour = Number(config.emails_per_hour) || 30
  const senderName = config.sender_name || 'Oryen'
  const pitchHook = config.pitch_hook || ''
  const cta = config.call_to_action || 'Pode responder?'
  const tone = (config.tone as any) || 'direto'

  if (!pitchHook) {
    throw new Error('Campanha sem pitch_hook configurado')
  }

  // 2. Rate limit: quantos já enviei na última hora?
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: sentLastHour } = await supabase
    .from('email_sends')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['sent', 'delivered', 'opened', 'clicked'])
    .gte('sent_at', oneHourAgo)

  const budget = Math.max(0, emailsPerHour - (sentLastHour || 0))

  if (budget === 0) {
    const { count: remaining } = await supabase
      .from('email_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
    return {
      campaign_id: campaignId,
      processed: 0,
      failed: 0,
      remaining: remaining || 0,
      rate_limited: true,
    }
  }

  // 3. Pega contatos pending respeitando budget (limita a 10 por execução pra não bloquear o cron)
  const batchSize = Math.min(budget, 10)
  const { data: contacts } = await supabase
    .from('email_contacts')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (!contacts || contacts.length === 0) {
    return { campaign_id: campaignId, processed: 0, failed: 0, remaining: 0, rate_limited: false }
  }

  // Marca como processing pra evitar envios duplicados se cron rodar simultâneo
  const contactIds = contacts.map(c => c.id)
  await supabase
    .from('email_contacts')
    .update({ status: 'processing' })
    .in('id', contactIds)

  let processed = 0
  let failed = 0

  // 4. Envia um por um (sequencial pra não estourar rate do Resend)
  for (const contact of contacts) {
    try {
      // Valida email básico
      if (!contact.email || !/.+@.+\..+/.test(contact.email)) {
        await markContactSkipped(contact.id, 'email_invalido')
        continue
      }

      // Gera email via IA
      const generated = await generateColdEmail(
        {
          email: contact.email,
          first_name: contact.first_name,
          company: contact.company,
          role: contact.role,
          city: contact.city,
          custom_fields: contact.custom_fields || {},
        },
        {
          pitch_hook: pitchHook,
          sender_name: senderName,
          call_to_action: cta,
          tone,
          language: 'pt',
        }
      )

      // Cria registro de envio (queued)
      const { data: sendRow, error: insErr } = await supabase
        .from('email_sends')
        .insert({
          org_id: campaign.org_id,
          campaign_id: campaignId,
          contact_id: contact.id,
          subject: generated.subject,
          body_text: generated.body_text,
          status: 'queued',
        })
        .select()
        .single()

      if (insErr || !sendRow) throw new Error(`insert email_sends: ${insErr?.message}`)

      // Dispara via Resend
      const result = await sendColdEmail({
        to: contact.email,
        subject: generated.subject,
        bodyText: generated.body_text,
        fromName: senderName,
      })

      // Atualiza status
      await supabase
        .from('email_sends')
        .update({
          status: 'sent',
          resend_message_id: result.id,
          sent_at: new Date().toISOString(),
        })
        .eq('id', sendRow.id)

      await supabase
        .from('email_contacts')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', contact.id)

      processed++

      // Delay pequeno pra espalhar no tempo (ajuda deliverability)
      await sleep(1500)
    } catch (err: any) {
      failed++
      console.error(`[email-processor] falhou contact ${contact.id}:`, err.message)
      // Marca send como failed se existe
      await supabase
        .from('email_sends')
        .update({ status: 'failed', error_message: err.message })
        .eq('contact_id', contact.id)
        .eq('campaign_id', campaignId)
        .eq('status', 'queued')
      // Volta contato pra pending pra tentar de novo depois (após 1h)
      await supabase
        .from('email_contacts')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', contact.id)
    }
  }

  // 5. Contagem final
  const { count: remaining } = await supabase
    .from('email_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')

  // Se não sobrou ninguém, marca campanha como completed
  if (remaining === 0) {
    await supabase
      .from('agent_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId)
  }

  return {
    campaign_id: campaignId,
    processed,
    failed,
    remaining: remaining || 0,
    rate_limited: false,
  }
}

async function markContactSkipped(contactId: string, reason: string) {
  await supabase
    .from('email_contacts')
    .update({ status: 'skipped', skip_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', contactId)
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms))
}
