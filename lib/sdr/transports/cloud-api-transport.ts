// lib/sdr/transports/cloud-api-transport.ts
// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Cloud API (Meta) Transport
//
// Endpoints:
//   POST https://graph.facebook.com/{version}/{phone_number_id}/messages
//
// Auth: Bearer token (System User token do Tech Provider)
// ═══════════════════════════════════════════════════════════════════════════════

import type { WhatsAppTransport, ApiType, InstanceRecord } from '../whatsapp-adapter'

const GRAPH_API_VERSION = process.env.CLOUD_API_VERSION || 'v21.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export class CloudApiTransport implements WhatsAppTransport {
  readonly apiType: ApiType = 'cloud_api'

  private phoneNumberId: string
  private token: string

  constructor(instance: InstanceRecord) {
    if (!instance.phone_number_id) {
      throw new Error('CloudApiTransport: phone_number_id is required')
    }
    this.phoneNumberId = instance.phone_number_id
    // Usa o token da instância ou o System User token global
    this.token = instance.cloud_api_token || process.env.META_SYSTEM_USER_TOKEN || ''

    if (!this.token) {
      throw new Error('CloudApiTransport: no token available (cloud_api_token or META_SYSTEM_USER_TOKEN)')
    }
  }

  /**
   * Envia mensagem de texto livre.
   * Só funciona dentro da janela de 24h (lead enviou msg nas últimas 24h).
   * Fora da janela, a Meta rejeita com erro 131047.
   */
  async sendText(phone: string, text: string): Promise<{ messageId?: string }> {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatPhone(phone),
      type: 'text',
      text: { body: text },
    }

    const result = await this.callApi(body)
    return { messageId: result?.messages?.[0]?.id }
  }

  /**
   * Envia template pré-aprovado pela Meta.
   * Funciona a qualquer momento (não depende da janela 24h).
   * Os params mapeiam para {{1}}, {{2}}, etc. no body do template.
   */
  async sendTemplate(
    phone: string,
    templateName: string,
    language: string,
    params: string[]
  ): Promise<{ messageId?: string }> {
    const components: any[] = []

    if (params.length > 0) {
      components.push({
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: p })),
      })
    }

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatPhone(phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length > 0 ? { components } : {}),
      },
    }

    const result = await this.callApi(body)
    return { messageId: result?.messages?.[0]?.id }
  }

  /**
   * Cloud API não suporta typing indicators via API.
   * No-op para manter compatibilidade com o adapter.
   */
  async sendPresence(_phone: string, _state: 'composing' | 'available'): Promise<void> {
    // No-op — Cloud API não tem presença via API
  }

  /**
   * Marca mensagem como lida (read receipt).
   * Útil para UX — o lead vê os ticks azuis.
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.callApi({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    })
  }

  // ─── Chamada genérica ao Graph API com retry ───

  private async callApi(body: Record<string, any>, retries = 2): Promise<any> {
    const url = `${GRAPH_API_BASE}/${this.phoneNumberId}/messages`

    for (let attempt = 0; attempt <= retries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) return data

      const errorCode = data?.error?.code || 0
      const errorMsg = data?.error?.message || `HTTP ${response.status}`

      // Erros retentáveis: rate limit (80007), temporário (2), throttle (130429)
      const retryableCodes = [80007, 2, 130429, 131048]
      const isRetryable = retryableCodes.includes(errorCode) || response.status === 429 || response.status >= 500

      if (isRetryable && attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000) // 1s, 2s, 4s, max 8s
        console.warn(`[CloudAPI] Retry ${attempt + 1}/${retries} after ${delay}ms — error ${errorCode}: ${errorMsg}`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      // Erro não retentável ou esgotou retries
      console.error(`[CloudAPI] Error ${errorCode}: ${errorMsg}`, JSON.stringify(data?.error || {}))
      throw new CloudApiError(errorCode, errorMsg, data?.error)
    }
  }
}

// ─── Helpers ───

/**
 * Erro tipado da Cloud API com código e detalhes
 */
export class CloudApiError extends Error {
  code: number
  details: any

  constructor(code: number, message: string, details?: any) {
    super(`CloudAPI error ${code}: ${message}`)
    this.name = 'CloudApiError'
    this.code = code
    this.details = details
  }

  /** Mensagem fora da janela 24h — precisa usar template */
  get isOutsideWindow(): boolean {
    return this.code === 131047
  }

  /** Rate limit atingido */
  get isRateLimited(): boolean {
    return this.code === 80007 || this.code === 130429
  }

  /** Número inválido ou não registrado no WhatsApp */
  get isInvalidNumber(): boolean {
    return this.code === 131026
  }
}

/**
 * Formata telefone para Cloud API.
 * Cloud API aceita apenas dígitos (sem + ou espaços).
 */
function formatPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}
