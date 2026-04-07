// lib/sdr/whatsapp-sender.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Envio de mensagens via Adapter Pattern (uazapi + Cloud API)
//
// uazapi (API não-oficial):
//   Humanização completa: composing → delay → texto → available
//
// Cloud API (Meta oficial):
//   Envio direto (sem humanização) — Meta não suporta typing indicators
//   Respeita janela de 24h: texto livre dentro, template fora
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { scheduleMessages, totalSendTimeMs } from './humanize'
import { createTransport, type WhatsAppTransport, type InstanceRecord } from './whatsapp-adapter'
import { isWithinWindow } from './messaging-window'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ───

interface SendContext {
  org_id: string
  phone: string              // numero do lead (sem @s.whatsapp.net)
  instance_name: string
  messages: string[]         // mensagens já splitadas pelo ai-agent
}

interface SendResult {
  sent: number
  failed: number
  total_time_ms: number
  details: Array<{
    text: string
    status: 'sent' | 'failed'
    error?: string
  }>
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendWithHumanization(ctx: SendContext): Promise<SendResult> {
  const startTime = Date.now()

  // Buscar instância completa (com api_type)
  const instance = await getInstanceRecord(ctx.instance_name)
  if (!instance) {
    console.error(`[SDR:Send] Instância não encontrada: ${ctx.instance_name}`)
    return {
      sent: 0,
      failed: ctx.messages.length,
      total_time_ms: 0,
      details: ctx.messages.map(text => ({
        text,
        status: 'failed' as const,
        error: 'instance_not_found'
      }))
    }
  }

  // Criar transport via adapter
  const transport = createTransport(instance)

  // Cloud API: envio direto (sem humanização)
  if (instance.api_type === 'cloud_api') {
    return sendViaCloudApi(transport, ctx, startTime)
  }

  // uazapi: envio humanizado (composing, delays, etc.)
  return sendViaUazapi(transport, ctx, startTime)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UAZAPI — ENVIO HUMANIZADO
// ═══════════════════════════════════════════════════════════════════════════════

async function sendViaUazapi(
  transport: WhatsAppTransport,
  ctx: SendContext,
  startTime: number
): Promise<SendResult> {
  const scheduled = scheduleMessages(ctx.messages)
  const estimatedTime = totalSendTimeMs(scheduled)
  console.log(`[SDR:Send:uazapi] Enviando ${scheduled.length} msg(s) | tempo estimado: ${Math.round(estimatedTime / 1000)}s`)

  const details: SendResult['details'] = []
  let sent = 0
  let failed = 0

  for (const msg of scheduled) {
    try {
      // 1. Espera pausa entre mensagens
      await sleep(msg.delayMs)

      // 2. Enviar "digitando..."
      await transport.sendPresence(ctx.phone, 'composing')

      // 3. Espera tempo de digitação
      await sleep(msg.typingDurationMs)

      // 4. Enviar mensagem
      await transport.sendText(ctx.phone, msg.text)

      // 5. Limpar status de digitação
      await transport.sendPresence(ctx.phone, 'available')

      details.push({ text: msg.text, status: 'sent' })
      sent++

      console.log(`[SDR:Send:uazapi] ✓ "${msg.text.slice(0, 50)}..." → ${ctx.phone}`)
    } catch (err: any) {
      console.error(`[SDR:Send:uazapi] ✗ Erro ao enviar para ${ctx.phone}:`, err.message)
      details.push({ text: msg.text, status: 'failed', error: err.message })
      failed++
    }
  }

  return { sent, failed, total_time_ms: Date.now() - startTime, details }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLOUD API — ENVIO DIRETO
// ═══════════════════════════════════════════════════════════════════════════════

async function sendViaCloudApi(
  transport: WhatsAppTransport,
  ctx: SendContext,
  startTime: number
): Promise<SendResult> {
  // Checar janela de 24h
  const withinWindow = await isWithinWindow(ctx.org_id, ctx.phone)

  if (!withinWindow) {
    console.log(`[SDR:Send:cloud] Fora da janela 24h para ${ctx.phone} — usando template`)
    return sendTemplateMessage(transport, ctx, startTime)
  }

  // Dentro da janela: juntar todas as mensagens em um único envio
  // (Cloud API não tem humanização, então enviar tudo de uma vez)
  const fullText = ctx.messages.join('\n\n')
  console.log(`[SDR:Send:cloud] Enviando texto livre para ${ctx.phone} (${ctx.messages.length} parte(s))`)

  const details: SendResult['details'] = []

  try {
    await transport.sendText(ctx.phone, fullText)
    details.push({ text: fullText, status: 'sent' })
    console.log(`[SDR:Send:cloud] ✓ Enviado para ${ctx.phone}`)
    return { sent: 1, failed: 0, total_time_ms: Date.now() - startTime, details }
  } catch (err: any) {
    console.error(`[SDR:Send:cloud] ✗ Erro ao enviar para ${ctx.phone}:`, err.message)
    details.push({ text: fullText, status: 'failed', error: err.message })
    return { sent: 0, failed: 1, total_time_ms: Date.now() - startTime, details }
  }
}

// ─── Template fallback (fora da janela 24h) ───

async function sendTemplateMessage(
  transport: WhatsAppTransport,
  ctx: SendContext,
  startTime: number
): Promise<SendResult> {
  // Buscar template aprovado de follow-up para a org
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('waba_id')
    .eq('instance_name', ctx.instance_name)
    .single()

  if (!instance?.waba_id) {
    console.warn(`[SDR:Send:cloud] No waba_id for instance ${ctx.instance_name}`)
    return {
      sent: 0, failed: 1, total_time_ms: Date.now() - startTime,
      details: [{ text: '(template)', status: 'failed', error: 'no_waba_id' }]
    }
  }

  const { data: template } = await supabase
    .from('whatsapp_templates')
    .select('template_name, language')
    .eq('waba_id', instance.waba_id)
    .eq('meta_status', 'APPROVED')
    .eq('purpose', 'follow_up')
    .limit(1)
    .single()

  if (!template) {
    console.warn(`[SDR:Send:cloud] No approved follow_up template for WABA ${instance.waba_id}`)
    return {
      sent: 0, failed: 1, total_time_ms: Date.now() - startTime,
      details: [{ text: '(template)', status: 'failed', error: 'no_approved_template' }]
    }
  }

  // Buscar nome do lead para parâmetro {{1}}
  const { data: lead } = await supabase
    .from('leads')
    .select('name')
    .eq('org_id', ctx.org_id)
    .eq('phone', ctx.phone)
    .limit(1)
    .single()

  const leadName = lead?.name || `Lead ${ctx.phone.slice(-4)}`

  try {
    await transport.sendTemplate(ctx.phone, template.template_name, template.language, [leadName])
    console.log(`[SDR:Send:cloud] ✓ Template "${template.template_name}" enviado para ${ctx.phone}`)
    return {
      sent: 1, failed: 0, total_time_ms: Date.now() - startTime,
      details: [{ text: `[template: ${template.template_name}]`, status: 'sent' }]
    }
  } catch (err: any) {
    console.error(`[SDR:Send:cloud] ✗ Template error for ${ctx.phone}:`, err.message)
    return {
      sent: 0, failed: 1, total_time_ms: Date.now() - startTime,
      details: [{ text: `[template: ${template.template_name}]`, status: 'failed', error: err.message }]
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Busca instância completa do banco (com api_type e campos Cloud API)
 */
async function getInstanceRecord(instanceName: string): Promise<InstanceRecord | null> {
  const { data } = await supabase
    .from('whatsapp_instances')
    .select('api_type, instance_name, instance_token, api_url, phone_number_id, waba_id, cloud_api_token')
    .eq('instance_name', instanceName)
    .single()

  if (!data) return null
  return data as InstanceRecord
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
