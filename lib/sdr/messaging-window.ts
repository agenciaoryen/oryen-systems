// lib/sdr/messaging-window.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Rastreamento da Janela de 24h — WhatsApp Cloud API (Meta)
//
// A Cloud API só permite mensagens de texto livre dentro de 24h após a última
// mensagem RECEBIDA do lead. Fora da janela, é obrigatório usar templates.
//
// Usa Redis com TTL de 86400s (24h) para performance.
// Fallback: query em sdr_messages se Redis não tiver o dado.
// ═══════════════════════════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis'
import { createClient } from '@supabase/supabase-js'

const WINDOW_KEY_PREFIX = 'sdr:window:'
const WINDOW_TTL = 86400 // 24h em segundos

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}

/**
 * Registra timestamp de mensagem recebida do lead.
 * Chamado pelo webhook ao receber mensagem inbound.
 * Seta chave no Redis com TTL de 24h.
 */
export async function recordInboundTimestamp(orgId: string, phone: string): Promise<void> {
  const r = getRedis()
  const key = `${WINDOW_KEY_PREFIX}${orgId}:${phone}`
  const now = Date.now().toString()

  await r.set(key, now, { ex: WINDOW_TTL })
}

/**
 * Verifica se estamos dentro da janela de 24h para enviar texto livre.
 * Retorna true se o lead enviou mensagem nas últimas 24h.
 *
 * Fallback: consulta sdr_messages se Redis não tiver o dado
 * (ex: Redis reiniciou ou chave expirou antes das 24h por outro motivo).
 */
export async function isWithinWindow(orgId: string, phone: string): Promise<boolean> {
  const r = getRedis()
  const key = `${WINDOW_KEY_PREFIX}${orgId}:${phone}`

  // Verificar no Redis primeiro
  const cached = await r.get<string>(key)
  if (cached) {
    const ts = parseInt(cached)
    const elapsed = Date.now() - ts
    return elapsed < WINDOW_TTL * 1000
  }

  // Fallback: consultar banco
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const twentyFourHoursAgo = new Date(Date.now() - WINDOW_TTL * 1000).toISOString()

  const { data } = await supabase
    .from('sdr_messages')
    .select('created_at')
    .eq('org_id', orgId)
    .eq('phone', phone)
    .eq('role', 'user')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (data) {
    // Recache no Redis para próximas consultas
    const msgTime = new Date(data.created_at).getTime()
    const remainingTtl = Math.floor((msgTime + WINDOW_TTL * 1000 - Date.now()) / 1000)

    if (remainingTtl > 0) {
      await r.set(key, msgTime.toString(), { ex: remainingTtl })
      return true
    }
  }

  return false
}

/**
 * Verifica se a transcrição de áudio está disponível.
 * Helper exportado para uso no webhook.
 */
export function isTranscriptionAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY
}
