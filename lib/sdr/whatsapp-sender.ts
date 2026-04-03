// lib/sdr/whatsapp-sender.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Envio de mensagens via UAZAPI com humanização
//
// Fluxo por mensagem:
// 1. Espera delay (pausa entre mensagens)
// 2. Envia "composing" (digitando...) via UAZAPI
// 3. Espera typingDurationMs (simula digitação)
// 4. Envia mensagem de texto
//
// A UAZAPI tem 3 endpoints relevantes:
// - POST /sendText — envia mensagem de texto
// - POST /sendPresence — envia status "composing" ou "available"
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { scheduleMessages, totalSendTimeMs, type ScheduledMessage } from './humanize'

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

  // Buscar credenciais da instância
  const instance = await getInstanceCredentials(ctx.instance_name)
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

  // Calcular schedule
  const scheduled = scheduleMessages(ctx.messages)
  const estimatedTime = totalSendTimeMs(scheduled)
  console.log(`[SDR:Send] Enviando ${scheduled.length} msg(s) | tempo estimado: ${Math.round(estimatedTime / 1000)}s`)

  // Formatar número para UAZAPI (com @s.whatsapp.net)
  const chatId = formatChatId(ctx.phone)

  const details: SendResult['details'] = []
  let sent = 0
  let failed = 0

  for (const msg of scheduled) {
    try {
      // 1. Espera pausa entre mensagens
      await sleep(msg.delayMs)

      // 2. Enviar "digitando..."
      await sendPresence(instance.api_url, instance.instance_token, chatId, 'composing')

      // 3. Espera tempo de digitação
      await sleep(msg.typingDurationMs)

      // 4. Enviar mensagem
      await sendText(instance.api_url, instance.instance_token, chatId, msg.text)

      // 5. Limpar status de digitação
      await sendPresence(instance.api_url, instance.instance_token, chatId, 'available')

      details.push({ text: msg.text, status: 'sent' })
      sent++

      console.log(`[SDR:Send] ✓ "${msg.text.slice(0, 50)}..." → ${ctx.phone}`)
    } catch (err: any) {
      console.error(`[SDR:Send] ✗ Erro ao enviar para ${ctx.phone}:`, err.message)
      details.push({ text: msg.text, status: 'failed', error: err.message })
      failed++
    }
  }

  return {
    sent,
    failed,
    total_time_ms: Date.now() - startTime,
    details
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UAZAPI API CALLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Envia mensagem de texto via UAZAPI
 */
async function sendText(
  apiUrl: string,
  token: string,
  chatId: string,
  text: string
): Promise<void> {
  const url = `${apiUrl}/sendText`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': token
    },
    body: JSON.stringify({
      chatId,
      text
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`UAZAPI sendText error ${response.status}: ${body}`)
  }
}

/**
 * Envia presença (composing/available) via UAZAPI
 * "composing" = mostra "digitando..." no WhatsApp do lead
 * "available" = remove o status de digitação
 */
async function sendPresence(
  apiUrl: string,
  token: string,
  chatId: string,
  state: 'composing' | 'available'
): Promise<void> {
  const url = `${apiUrl}/sendPresence`

  // Fire-and-forget: não precisa esperar resposta
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': token
    },
    body: JSON.stringify({
      chatId,
      state
    })
  }).catch(() => {
    // Presença não é crítica — ignorar erros silenciosamente
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Busca api_url e token da instância no banco
 */
async function getInstanceCredentials(instanceName: string): Promise<{
  api_url: string
  instance_token: string
} | null> {
  const { data } = await supabase
    .from('whatsapp_instances')
    .select('api_url, instance_token')
    .eq('instance_name', instanceName)
    .single()

  if (!data?.api_url || !data?.instance_token) return null
  return { api_url: data.api_url, instance_token: data.instance_token }
}

/**
 * Formata número para o chatId da UAZAPI
 * Ex: "5511999887766" → "5511999887766@s.whatsapp.net"
 */
function formatChatId(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '')
  return `${clean}@s.whatsapp.net`
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
