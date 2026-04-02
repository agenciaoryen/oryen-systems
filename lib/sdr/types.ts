// lib/sdr/types.ts
// Tipos para o módulo SDR Imobiliário

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK PAYLOAD (UAZAPI)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payload que chega do UAZAPI via webhook.
 * Campos variam conforme o tipo de mensagem.
 */
export interface UazapiWebhookPayload {
  // Identificadores da mensagem
  messageId?: string
  id?: string

  // Remetente - pode vir em diferentes formatos
  lid?: string              // formato lid (ex: "123456789:0@lid")
  senderPn?: string         // numero com @s.whatsapp.net (ex: "5511999887766@s.whatsapp.net")
  remoteJidAlt?: string     // fallback para o remetente
  from?: string             // campo genérico
  chatId?: string           // ID do chat

  // Grupo
  isGroup?: boolean
  participantId?: string    // quem mandou no grupo (se for grupo)

  // Direção
  fromMe?: boolean          // true = enviada pelo chip (agente ou atendente)

  // Conteúdo
  body?: string             // texto da mensagem
  text?: string             // alternativo para body
  type?: string             // text, image, audio, video, document, etc.
  caption?: string          // legenda de mídia

  // Mídia
  mediaUrl?: string
  mimetype?: string

  // Metadados
  timestamp?: number
  pushName?: string         // nome do contato no WhatsApp
  status?: string           // sent, delivered, read, etc.

  // Instância (identificador do chip)
  instanceName?: string
  instance?: string
  token?: string

  // Qualquer campo extra
  [key: string]: any
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENSAGEM NORMALIZADA
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedMessage {
  messageId: string
  phone: string              // numero normalizado (ex: "5511999887766")
  phoneFallback: string | null  // versão sem dígito 9 (ou com, se original não tem)
  body: string
  type: string               // text, image, audio, etc.
  pushName: string
  timestamp: number
  fromMe: boolean
  instanceName: string
  isLid: boolean             // se veio no formato lid (sem numero real)
  rawPayload: UazapiWebhookPayload
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP INSTANCE (banco de dados)
// ═══════════════════════════════════════════════════════════════════════════════

export interface WhatsAppInstance {
  id: string
  org_id: string
  agent_id: string | null
  instance_name: string
  instance_token: string | null
  api_url: string | null
  phone_number: string | null
  display_name: string | null
  status: 'connected' | 'disconnected' | 'qr_pending' | 'banned'
  campaign_id: string | null
  connected_at: string | null
  disconnected_at: string | null
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAD (CRM lookup result)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CRMLead {
  id: string
  name: string
  phone: string
  email: string | null
  stage: string | null
  source: string | null
  org_id: string
  created_at: string
  conversa_finalizada: boolean | null
  [key: string]: any
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTADO DO WEBHOOK PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

export type WebhookFilterResult =
  | { action: 'skip'; reason: string }
  | { action: 'process'; message: NormalizedMessage }
