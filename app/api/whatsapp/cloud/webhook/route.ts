// app/api/whatsapp/cloud/webhook/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Webhook para WhatsApp Cloud API (Meta)
//
// GET  — Verificação do webhook (Meta envia challenge)
// POST — Recebe mensagens e status updates → delega ao processador compartilhado
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateMetaSignature } from '@/lib/api-auth'
import { isValidPhone } from '@/lib/sdr/normalize-phone'
import { recordInboundTimestamp } from '@/lib/sdr/messaging-window'
import { processInboundMessage, type NormalizedInbound } from '@/lib/sdr/webhook-processor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════════════════════════════
// GET — Webhook Verification (Meta envia ao registrar o webhook)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[CloudAPI:Webhook] Verification successful')
    return new Response(challenge || '', { status: 200 })
  }

  console.warn('[CloudAPI:Webhook] Verification failed — invalid token')
  return new Response('Forbidden', { status: 403 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Recebe mensagens e status updates
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // Validar assinatura HMAC da Meta (se META_APP_SECRET estiver configurado)
    const rawBody = await request.text()
    const isValid = await validateMetaSignature(request, rawBody)
    if (!isValid && process.env.META_APP_SECRET) {
      console.warn('[CloudAPI:Webhook] Assinatura HMAC inválida — rejeitado')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ skipped: true, reason: 'not_whatsapp' }, { status: 200 })
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (!value) continue

        // ─── Template status updates ───
        if (change.field === 'message_template_status_update') {
          await handleTemplateStatusUpdate(value)
          continue
        }

        if (change.field !== 'messages') continue

        // ─── Status updates (delivered, read, sent) — ignorar ───
        if (value.statuses && !value.messages) continue

        // ─── Mensagens ───
        const messages = value.messages || []
        const contacts = value.contacts || []
        const metadata = value.metadata || {}
        const phoneNumberId = metadata.phone_number_id

        if (!phoneNumberId) {
          console.warn('[CloudAPI:Webhook] No phone_number_id in metadata')
          continue
        }

        for (const msg of messages) {
          await processCloudMessage(msg, contacts, phoneNumberId)
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('[CloudAPI:Webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 200 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZAR + DELEGAR AO PROCESSADOR COMPARTILHADO
// ═══════════════════════════════════════════════════════════════════════════════

async function processCloudMessage(
  msg: any,
  contacts: any[],
  phoneNumberId: string
) {
  const from = msg.from
  const msgType = msg.type
  const timestamp = parseInt(msg.timestamp || '0') * 1000

  // ─── Ignorar tipos não processáveis ───
  if (['reaction', 'sticker'].includes(msgType)) return

  // ─── Extrair texto conforme tipo ───
  let messageText = ''
  switch (msgType) {
    case 'text':
      messageText = msg.text?.body || ''
      break
    case 'image':
      messageText = msg.image?.caption || ''
      break
    case 'video':
      messageText = msg.video?.caption || ''
      break
    case 'document':
      messageText = msg.document?.caption || ''
      break
    case 'audio':
      // TODO: implementar download de mídia via Graph API + transcrição
      break
  }

  // ─── Extrair pushName do contato ───
  const contact = contacts.find((c: any) => c.wa_id === from)
  const pushName = contact?.profile?.name || ''
  const phone = from.replace(/[^0-9]/g, '')

  if (!isValidPhone(phone)) {
    console.warn(`[CloudAPI:Webhook] Invalid phone: ${phone}`)
    return
  }

  console.log(`[CloudAPI:Webhook] Msg recebida | from: ${phone} | type: ${msgType} | text: "${messageText.slice(0, 60)}"`)

  // ─── Resolver instância pela phone_number_id ───
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .eq('api_type', 'cloud_api')
    .eq('status', 'connected')
    .single()

  if (!instance) {
    console.warn(`[CloudAPI:Webhook] No instance for phone_number_id: ${phoneNumberId}`)
    return
  }

  if (!instance.agent_id) {
    console.warn(`[CloudAPI:Webhook] Instance ${instance.instance_name} has no agent linked`)
    return
  }

  // ─── Registrar timestamp para janela 24h ───
  await recordInboundTimestamp(instance.org_id, phone)

  // ─── Gerar phoneFallback para BR ───
  let phoneFallback: string | null = null
  if (phone.startsWith('55') && phone.length === 13) {
    phoneFallback = phone.slice(0, 4) + phone.slice(5)
  } else if (phone.startsWith('55') && phone.length === 12) {
    phoneFallback = phone.slice(0, 4) + '9' + phone.slice(4)
  }

  // ─── Normalizar e delegar ao processador compartilhado ───
  const isAudio = ['audio', 'voice'].includes(msgType)

  const normalized: NormalizedInbound = {
    phone,
    phoneFallback,
    messageText,
    messageType: isAudio ? 'audio' : (msgType === 'image' ? 'image' : msgType === 'video' ? 'video' : msgType === 'document' ? 'document' : 'text'),
    pushName,
    whatsappMessageId: msg.id,
    timestamp,
    orgId: instance.org_id,
    agentId: instance.agent_id,
    campaignId: instance.campaign_id,
    instanceName: instance.instance_name,
    isAttendant: false,
    isAudioNoText: isAudio && !messageText.trim(),
  }

  const result = await processInboundMessage(normalized)
  console.log(`[CloudAPI:Webhook] Processado: ${JSON.stringify(result).slice(0, 200)}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE STATUS UPDATE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

async function handleTemplateStatusUpdate(value: any) {
  try {
    const event = value.event
    const messageTemplateId = value.message_template_id?.toString()
    const messageTemplateName = value.message_template_name

    if (!messageTemplateId || !event) return

    const newStatus = event.toUpperCase()

    const { error } = await supabase
      .from('whatsapp_templates')
      .update({
        meta_status: newStatus,
        rejection_reason: value.reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('meta_template_id', messageTemplateId)

    if (error) {
      console.warn(`[CloudAPI:Webhook] Template status update error: ${error.message}`)
    } else {
      console.log(`[CloudAPI:Webhook] Template "${messageTemplateName}" status → ${newStatus}`)
    }
  } catch (err: any) {
    console.warn(`[CloudAPI:Webhook] Template status handler error: ${err.message}`)
  }
}
