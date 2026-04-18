// app/api/sdr/webhook/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Webhook SDR — Recebe mensagens do UAZAPI
//
// Fluxo:
// 1. Receber e normalizar payload UAZAPI (v1 e v2)
// 2. Filtrar: grupo, fromMe (API), status-only, sem texto
// 3. Resolver instância → org_id
// 4. Normalizar número (BR dígito 9)
// 5. Transcrever áudio se necessário
// 6. Delegar ao processador compartilhado (webhook-processor.ts)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateUazapiToken, maskPhone } from '@/lib/api-auth'
import { transcribeAudio, isTranscriptionAvailable } from '@/lib/sdr/transcribe'
import { extractPhone, isValidPhone } from '@/lib/sdr/normalize-phone'
import { processInboundMessage, type NormalizedInbound } from '@/lib/sdr/webhook-processor'
import type {
  UazapiWebhookPayload,
  WhatsAppInstance,
} from '@/lib/sdr/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/sdr/webhook
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // Validar token do webhook (se UAZAPI_WEBHOOK_SECRET estiver configurado)
    if (!validateUazapiToken(request)) {
      console.warn('[SDR] Webhook rejeitado: token inválido')
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 })
    }

    const rawPayload = await request.json()
    const payload = normalizeV2Payload(rawPayload)

    const instName = payload.instanceName || '(sem nome)'
    const msgText = payload.body || ''
    console.log(`[SDR] Webhook recebido | instance: ${instName} | fromMe: ${payload.fromMe} | type: ${payload.type} | text: "${msgText.slice(0, 30)}..." | phone: ${maskPhone(payload.chatId || '')}`)

    // ─── 1. Filtros rápidos ───
    const filterResult = applyFilters(payload)
    if (filterResult) {
      console.log(`[SDR] Filtrado: ${filterResult} | instance: ${instName}`)
      return NextResponse.json({ skipped: true, reason: filterResult }, { status: 200 })
    }

    const isAttendant = (payload as any)._isAttendant === true

    // ─── 2. Resolver instância → org_id ───
    const instanceName = payload.instanceName || payload.instance || ''
    if (!instanceName) {
      console.warn('[SDR] Webhook sem instanceName — ignorando')
      return NextResponse.json({ skipped: true, reason: 'no_instance' }, { status: 200 })
    }

    const instance = await resolveInstance(instanceName)
    if (!instance) {
      console.warn(`[SDR] Instância desconhecida: ${instanceName}`)
      return NextResponse.json({ skipped: true, reason: 'unknown_instance' }, { status: 200 })
    }

    console.log(`[SDR] Instância resolvida: ${instance.instance_name} | org: ${instance.org_id} | agent: ${instance.agent_id || 'NENHUM (modo WhatsApp Web)'}`)

    // Sem agente vinculado → modo WhatsApp Web: mensagem é salva, mas IA não processa

    // ─── 3. Normalizar número ───
    const { phone, phoneFallback, isLid } = extractPhone(payload)

    if (!isValidPhone(phone)) {
      console.warn(`[SDR] Número inválido extraído: "${phone}" (lid: ${isLid})`)
      return NextResponse.json({ skipped: true, reason: 'invalid_phone' }, { status: 200 })
    }

    // ─── 4. Extrair texto + transcrever áudio ───
    let messageText = payload.body || payload.text || payload.caption || ''
    const isAudioMessage = ['audio', 'ptt', 'voice'].includes(payload.type?.toLowerCase() || '') ||
      (payload.mimetype && payload.mimetype.startsWith('audio/'))
    let wasTranscribed = false

    if (isAudioMessage && !messageText.trim()) {
      const audioUrl = payload.mediaUrl || ''
      if (audioUrl && isTranscriptionAvailable()) {
        try {
          console.log(`[SDR] Áudio detectado para ${phone} — transcrevendo...`)
          const result = await transcribeAudio(audioUrl)
          messageText = result.text
          wasTranscribed = true
          console.log(`[SDR] ✓ Transcrição (${result.provider}, ${result.duration_ms}ms): "${messageText.slice(0, 80)}"`)
        } catch (err: any) {
          console.error(`[SDR] ✗ Falha na transcrição: ${err.message}`)
        }
      } else if (audioUrl && !isTranscriptionAvailable()) {
        console.warn(`[SDR] Áudio recebido mas transcrição não configurada`)
      }
    }

    // ─── 5. Delegar ao processador compartilhado ───
    // ─── 5b. Marcar mensagem como lida (read receipt — ticks azuis) ───
    const whatsappMessageId = payload.messageId || (payload as any).id || ''
    if (whatsappMessageId && !isAttendant) {
      try {
        const { createTransport } = await import('@/lib/sdr/whatsapp-adapter')
        const { data: instRecord } = await supabase
          .from('whatsapp_instances')
          .select('api_type, instance_name, instance_token, api_url, phone_number_id, waba_id, cloud_api_token')
          .eq('instance_name', instanceName)
          .single()

        if (instRecord) {
          const transport = createTransport(instRecord as any)
          transport.markAsRead(whatsappMessageId).catch(() => {})
        }
      } catch {
        // Read receipt não é crítico — ignorar
      }
    }

    // ─── 6. Delegar ao processador compartilhado ───
    const normalized: NormalizedInbound = {
      phone,
      phoneFallback,
      messageText: wasTranscribed ? messageText : messageText,
      messageType: isAudioMessage ? 'audio' : 'text',
      pushName: payload.pushName || '',
      whatsappMessageId,
      timestamp: payload.timestamp || Date.now(),
      orgId: instance.org_id,
      agentId: instance.agent_id || null,
      campaignId: instance.campaign_id,
      instanceName,
      isAttendant,
      isAudioNoText: isAudioMessage && !messageText.trim(),
    }

    const result = await processInboundMessage(normalized)

    return NextResponse.json({
      ...result,
      lead_id: result.leadId,
      lead_name: result.leadName,
      is_new_lead: result.isNewLead,
      buffer_count: result.bufferCount,
      buffer_seconds: result.bufferSeconds,
    })

  } catch (error: any) {
    console.error('[SDR] Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error', skipped: true },
      { status: 200 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZAR PAYLOAD UAZAPI V2
// ═══════════════════════════════════════════════════════════════════════════════

function extractTextContent(msg: any): string {
  const candidates = [msg.content, msg.body, msg.text, msg.conversation]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c
    if (c && typeof c === 'object' && typeof c.text === 'string') return c.text
  }
  return ''
}

function normalizeV2Payload(raw: any): UazapiWebhookPayload {
  if (raw.body || raw.senderPn || raw.from) {
    return raw as UazapiWebhookPayload
  }

  const msg = raw.message || {}
  const chat = raw.chat || {}
  const eventType = raw.EventType || ''

  return {
    messageId: msg.messageid || msg.id || '',
    id: msg.messageid || '',
    chatId: msg.chatid || '',
    senderPn: msg.sender_pn || '',
    lid: msg.chatlid || msg.sender_lid || msg.sender || '',
    from: msg.chatid || '',
    remoteJidAlt: msg.sender_pn || '',
    isGroup: msg.isGroup === true,
    fromMe: msg.fromMe === true,
    body: extractTextContent(msg),
    text: extractTextContent(msg),
    type: eventType || msg.messageType || 'text',
    caption: typeof msg.caption === 'string' ? msg.caption : '',
    mediaUrl: msg.mediaUrl || '',
    mimetype: msg.mimetype || '',
    timestamp: msg.messageTimestamp || Date.now(),
    pushName: msg.senderName || '',
    status: msg.status || '',
    instanceName: raw.instanceName || '',
    instance: raw.instanceName || '',
    token: raw.token || '',
    fromApi: msg.fromApi === true || msg.source === 'api',
    isApi: msg.fromApi === true,
    source: msg.source || '',
    owner: raw.owner || msg.owner || '',
  } as UazapiWebhookPayload
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════════════════════════

function applyFilters(payload: UazapiWebhookPayload): string | null {
  if (payload.isGroup) return 'group_message'

  if (payload.fromMe === true) {
    const isFromApi = payload.fromApi === true || payload.isApi === true || payload.source === 'api'
    if (isFromApi) return 'from_api'
    ;(payload as any)._isAttendant = true
  }

  if (payload.status && !payload.body && !payload.text) return 'status_update'

  const text = payload.body || payload.text || payload.caption || ''
  if (!text.trim() && payload.type === 'text') return 'empty_message'

  if (payload.type === 'reaction') return 'reaction'
  if (payload.type === 'protocol') return 'protocol'

  const nonMessageTypes = ['ReadReceipt', 'receipt', 'presence', 'call', 'notification', 'revoked', 'messages_update', 'connection']
  if (payload.type && nonMessageTypes.includes(payload.type)) return `non_message_type:${payload.type}`

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLVER INSTÂNCIA → ORG
// ═══════════════════════════════════════════════════════════════════════════════

const instanceCache = new Map<string, { data: WhatsAppInstance; cachedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

async function resolveInstance(instanceName: string): Promise<WhatsAppInstance | null> {
  const cached = instanceCache.get(instanceName)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data
  }

  const { data: data1 } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('instance_name', instanceName)
    .eq('status', 'connected')
    .single()

  if (data1) {
    instanceCache.set(instanceName, { data: data1, cachedAt: Date.now() })
    return data1
  }

  const { data: data2 } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .ilike('display_name', instanceName)
    .eq('status', 'connected')
    .single()

  if (data2) {
    instanceCache.set(instanceName, { data: data2, cachedAt: Date.now() })
    return data2
  }

  const { data: allConnected } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('status', 'connected')

  if (allConnected && allConnected.length === 1) {
    const single = allConnected[0]
    console.log(`[SDR] Fallback: única instância conectada ${single.instance_name} para "${instanceName}"`)
    instanceCache.set(instanceName, { data: single, cachedAt: Date.now() })
    return single
  }

  return null
}
