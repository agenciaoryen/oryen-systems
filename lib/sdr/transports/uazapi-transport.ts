// lib/sdr/transports/uazapi-transport.ts
// ═══════════════════════════════════════════════════════════════════════════════
// UAZAPI (API não-oficial) Transport
//
// Wraps as chamadas existentes da UAZAPI na interface do adapter.
// Endpoints:
//   POST {api_url}/send/text     — envia texto
//   POST {api_url}/send/presence — envia "digitando..."
// ═══════════════════════════════════════════════════════════════════════════════

import type { WhatsAppTransport, ApiType, InstanceRecord } from '../whatsapp-adapter'

export class UazapiTransport implements WhatsAppTransport {
  readonly apiType: ApiType = 'uazapi'

  private apiUrl: string
  private token: string

  constructor(instance: InstanceRecord) {
    if (!instance.api_url || !instance.instance_token) {
      throw new Error('UazapiTransport: api_url and instance_token are required')
    }
    this.apiUrl = instance.api_url
    this.token = instance.instance_token
  }

  /**
   * Envia mensagem de texto via UAZAPI.
   * Sem restrição de janela 24h (API não-oficial).
   */
  async sendText(phone: string, text: string): Promise<{ messageId?: string }> {
    const number = formatNumber(phone)

    const response = await fetch(`${this.apiUrl}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': this.token,
      },
      body: JSON.stringify({ number, text, delay: 1200 }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`UAZAPI sendText error ${response.status}: ${body}`)
    }

    const data = await response.json().catch(() => ({}))
    return { messageId: data?.key?.id || data?.messageId }
  }

  /**
   * Envia imagem via URL usando UAZAPI /send/media.
   */
  async sendImage(phone: string, imageUrl: string, caption?: string): Promise<{ messageId?: string }> {
    const number = formatNumber(phone)

    const body: any = {
      number,
      type: 'image',
      file: imageUrl,
      delay: 2000,
    }
    if (caption) body.caption = caption

    const response = await fetch(`${this.apiUrl}/send/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': this.token,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const respBody = await response.text().catch(() => '')
      throw new Error(`UAZAPI sendImage error ${response.status}: ${respBody}`)
    }

    const data = await response.json().catch(() => ({}))
    return { messageId: data?.key?.id || data?.messageId }
  }

  /**
   * Templates não existem na UAZAPI. Envia como texto livre.
   */
  async sendTemplate(
    phone: string,
    _templateName: string,
    _language: string,
    params: string[]
  ): Promise<{ messageId?: string }> {
    throw new Error('UazapiTransport: templates not supported. Use sendText instead.')
  }

  /**
   * Envia presença (composing/available) via UAZAPI.
   */
  async sendPresence(phone: string, state: 'composing' | 'available'): Promise<void> {
    const number = formatNumber(phone)

    await fetch(`${this.apiUrl}/send/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': this.token,
      },
      body: JSON.stringify({ number, state }),
    }).catch(() => {})
  }

  /**
   * Marca mensagem como lida (read receipts / ticks azuis) via UAZAPI.
   */
  async markAsRead(messageId: string): Promise<void> {
    await fetch(`${this.apiUrl}/chat/readMessages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': this.token,
      },
      body: JSON.stringify({ id: messageId }),
    }).catch(() => {
      // Read receipt não é crítico — ignorar erros
    })
  }
}

// ─── Helpers ───

function formatNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}
