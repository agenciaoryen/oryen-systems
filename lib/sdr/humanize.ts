// lib/sdr/humanize.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Humanização de envio de mensagens WhatsApp
// Portado do n8n validado: simula tempo de digitação real
//
// No n8n original:
//   - 55ms por caractere
//   - Mínimo 1.5s, máximo 8s
//   - Entre mensagens: 1-2s de pausa extra
// ═══════════════════════════════════════════════════════════════════════════════

const MS_PER_CHAR = 40
const MIN_TYPING_MS = 1200
const MAX_TYPING_MS = 6000
const PAUSE_BETWEEN_MS = 1000  // pausa entre mensagens consecutivas

export interface ScheduledMessage {
  text: string
  delayMs: number       // delay ANTES de enviar esta mensagem
  typingDurationMs: number  // quanto tempo simular "digitando..."
}

/**
 * Recebe array de mensagens do agente e calcula os delays humanizados.
 * Retorna array com timing para cada mensagem.
 */
export function scheduleMessages(messages: string[]): ScheduledMessage[] {
  return messages.map((text, index) => {
    const typingMs = calculateTypingDelay(text)
    // Primeira mensagem: pequeno delay inicial (simula leitura da msg do lead)
    // Demais: pausa entre mensagens
    const delayMs = index === 0 ? 800 : PAUSE_BETWEEN_MS

    return {
      text,
      delayMs,
      typingDurationMs: typingMs
    }
  })
}

/**
 * Calcula tempo de digitação baseado no tamanho da mensagem.
 * 55ms por caractere, clampado entre 1.5s e 8s.
 */
function calculateTypingDelay(text: string): number {
  const raw = text.length * MS_PER_CHAR
  return Math.max(MIN_TYPING_MS, Math.min(raw, MAX_TYPING_MS))
}

/**
 * Calcula o tempo total que todas as mensagens levarão para serem enviadas.
 * Útil para estimar timeout da função serverless.
 */
export function totalSendTimeMs(scheduled: ScheduledMessage[]): number {
  return scheduled.reduce((acc, msg) => acc + msg.delayMs + msg.typingDurationMs, 0)
}
