// lib/sdr/redis.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Upstash Redis — Buffer anti-fragmentação + Tag STOP
//
// Buffer: acumula mensagens por N segundos antes de processar
//   - Lead manda "oi" → espera 8s → Lead manda "tudo bem?" → reseta timer
//   - Só processa quando o lead para de digitar
//
// STOP tag: pausa a IA quando atendente humano assume
//   - Atendente envia mensagem manual → seta STOP com TTL 300s
//   - IA verifica STOP antes de responder → se existe, não responde
// ═══════════════════════════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis'

// Singleton — reutilizado entre requests no mesmo cold start
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

// ═══════════════════════════════════════════════════════════════════════════════
// BUFFER ANTI-FRAGMENTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

const BUFFER_KEY_PREFIX = 'sdr:buffer:'
const BUFFER_COUNT_PREFIX = 'sdr:bufcount:'

/**
 * Adiciona mensagem ao buffer do lead.
 * Retorna o total de mensagens no buffer após o push.
 */
export async function bufferPush(orgId: string, phone: string, message: string): Promise<number> {
  const r = getRedis()
  const key = `${BUFFER_KEY_PREFIX}${orgId}:${phone}`

  // RPUSH + definir TTL de 120s (segurança: limpa buffer se nunca for processado)
  const count = await r.rpush(key, message)
  await r.expire(key, 120)

  return count
}

/**
 * Lê o total de mensagens no buffer sem consumir.
 */
export async function bufferCount(orgId: string, phone: string): Promise<number> {
  const r = getRedis()
  const key = `${BUFFER_KEY_PREFIX}${orgId}:${phone}`
  return await r.llen(key)
}

/**
 * Consome todas as mensagens do buffer (LRANGE + DEL atômico via pipeline).
 * Retorna array de mensagens concatenáveis.
 */
export async function bufferFlush(orgId: string, phone: string): Promise<string[]> {
  const r = getRedis()
  const key = `${BUFFER_KEY_PREFIX}${orgId}:${phone}`

  const pipeline = r.pipeline()
  pipeline.lrange(key, 0, -1)
  pipeline.del(key)

  const results = await pipeline.exec()
  const messages = (results[0] as string[]) || []

  return messages
}

/**
 * Salva o count no momento do agendamento, para comparação posterior.
 * Usado pelo webhook para saber se chegaram novas mensagens durante o buffer time.
 */
export async function bufferSetScheduledCount(orgId: string, phone: string, count: number): Promise<void> {
  const r = getRedis()
  const key = `${BUFFER_COUNT_PREFIX}${orgId}:${phone}`
  await r.set(key, count, { ex: 120 })
}

/**
 * Retorna o count que foi salvo no momento do agendamento.
 */
export async function bufferGetScheduledCount(orgId: string, phone: string): Promise<number | null> {
  const r = getRedis()
  const key = `${BUFFER_COUNT_PREFIX}${orgId}:${phone}`
  const val = await r.get<number>(key)
  return val
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAG STOP (PAUSA ATENDENTE)
// ═══════════════════════════════════════════════════════════════════════════════

const STOP_KEY_PREFIX = 'sdr:stop:'
const STOP_TTL_SECONDS = 900 // 15 minutos — cada msg do atendente renova o timer

/**
 * Ativa a tag STOP para um lead.
 * Chamado quando o atendente humano envia mensagem manual.
 * A IA não responde enquanto a tag existir.
 */
export async function stopSet(orgId: string, phone: string): Promise<void> {
  const r = getRedis()
  const key = `${STOP_KEY_PREFIX}${orgId}:${phone}`
  await r.set(key, '1', { ex: STOP_TTL_SECONDS })
}

/**
 * Verifica se a tag STOP está ativa para um lead.
 * Se true → IA não deve responder (atendente humano assumiu).
 */
export async function stopCheck(orgId: string, phone: string): Promise<boolean> {
  const r = getRedis()
  const key = `${STOP_KEY_PREFIX}${orgId}:${phone}`
  const val = await r.get(key)
  return val !== null
}

/**
 * Retorna os segundos restantes da tag STOP.
 * Retorna 0 se não existe ou expirou.
 */
export async function stopTTL(orgId: string, phone: string): Promise<number> {
  const r = getRedis()
  const key = `${STOP_KEY_PREFIX}${orgId}:${phone}`
  const ttl = await r.ttl(key)
  return ttl > 0 ? ttl : 0
}

/**
 * Remove a tag STOP manualmente (ex: atendente devolve para a IA).
 */
export async function stopClear(orgId: string, phone: string): Promise<void> {
  const r = getRedis()
  const key = `${STOP_KEY_PREFIX}${orgId}:${phone}`
  await r.del(key)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CÁLCULO DO BUFFER TIME
// Portado do n8n: 6-40 segundos baseado no tamanho da mensagem
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula quantos segundos esperar antes de processar.
 * Mensagens curtas ("oi") → espera mais (lead pode mandar mais)
 * Mensagens longas (parágrafo) → espera menos (lead já terminou)
 */
export function calculateBufferSeconds(messageText: string): number {
  const len = messageText.length

  if (len <= 5) return 12     // "oi", "olá" → espera bastante
  if (len <= 20) return 10    // frase curta
  if (len <= 50) return 8     // frase média
  if (len <= 100) return 6    // mensagem completa
  return 6                    // mensagem longa → processa rápido
}
