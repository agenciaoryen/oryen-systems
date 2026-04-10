// lib/sdr/whatsapp-adapter.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Adapter Pattern — abstrai uazapi vs Cloud API
//
// O pipeline de AI/SDR/Follow-up chama o adapter sem saber qual API está por trás.
// A factory createTransport() retorna a implementação correta baseada em api_type.
// ═══════════════════════════════════════════════════════════════════════════════

export type ApiType = 'uazapi' | 'cloud_api'

// ─── Interface unificada que ambos transports implementam ───

export interface WhatsAppTransport {
  /** Envia mensagem de texto livre (dentro da janela 24h para Cloud API) */
  sendText(phone: string, text: string): Promise<{ messageId?: string }>

  /** Envia imagem via URL */
  sendImage(phone: string, imageUrl: string, caption?: string): Promise<{ messageId?: string }>

  /** Envia template pré-aprovado (Cloud API). uazapi não suporta — lança erro */
  sendTemplate(phone: string, templateName: string, language: string, params: string[]): Promise<{ messageId?: string }>

  /** Envia presença (digitando...). Cloud API = no-op */
  sendPresence(phone: string, state: 'composing' | 'available'): Promise<void>

  /** Marca mensagem como lida (read receipts — ticks azuis) */
  markAsRead(messageId: string): Promise<void>

  /** Tipo da API */
  readonly apiType: ApiType
}

// ─── Record da instância necessário para criar o transport ───

export interface InstanceRecord {
  api_type: ApiType
  // uazapi
  instance_name?: string
  instance_token?: string | null
  api_url?: string | null
  // Cloud API
  phone_number_id?: string | null
  waba_id?: string | null
  cloud_api_token?: string | null
}

// ─── Factory ───

export function createTransport(instance: InstanceRecord): WhatsAppTransport {
  if (instance.api_type === 'cloud_api') {
    const { CloudApiTransport } = require('./transports/cloud-api-transport')
    return new CloudApiTransport(instance)
  }
  const { UazapiTransport } = require('./transports/uazapi-transport')
  return new UazapiTransport(instance)
}
