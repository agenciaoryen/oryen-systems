// app/api/whatsapp/cloud/webhook/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Webhook para WhatsApp Cloud API (Meta)
//
// GET  — Verificação do webhook (Meta envia challenge)
// POST — Recebe mensagens e status updates
//
// Após normalizar o payload, delega ao mesmo pipeline do uazapi:
//   → resolve instância → find/create lead → salva msg → buffer → /process
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractPhone, isValidPhone } from '@/lib/sdr/normalize-phone'
import { transcribeAudio, isTranscriptionAvailable } from '@/lib/sdr/transcribe'
import {
  bufferPush,
  bufferSetScheduledCount,
  stopCheck,
  calculateBufferSeconds
} from '@/lib/sdr/redis'
import { recordInboundTimestamp } from '@/lib/sdr/messaging-window'

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
    const body = await request.json()

    // Cloud API sempre envia object === "whatsapp_business_account"
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ skipped: true, reason: 'not_whatsapp' }, { status: 200 })
    }

    // Processar cada entry (pode vir mais de uma)
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue

        const value = change.value
        if (!value) continue

        // ─── Status updates (delivered, read, sent) — ignorar ───
        if (value.statuses && !value.messages) {
          continue
        }

        // ─── Template status updates ───
        if (change.field === 'message_template_status_update') {
          await handleTemplateStatusUpdate(value)
          continue
        }

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

    // Cloud API exige 200 sempre (senão reenvia)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('[CloudAPI:Webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 200 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSAR MENSAGEM INDIVIDUAL
// ═══════════════════════════════════════════════════════════════════════════════

async function processCloudMessage(
  msg: any,
  contacts: any[],
  phoneNumberId: string
) {
  // ─── Extrair dados da mensagem ───
  const from = msg.from // número do lead (ex: "5511999887766")
  const msgId = msg.id
  const msgType = msg.type // text, image, audio, video, document, etc.
  const timestamp = parseInt(msg.timestamp || '0') * 1000 // Cloud API envia em seconds

  // Extrair texto conforme tipo
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
      // Audio será transcrito se possível
      break
    case 'reaction':
      return // Ignorar reações
    case 'sticker':
      return // Ignorar stickers
    default:
      break
  }

  // Extrair pushName do contato
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
    console.warn(`[CloudAPI:Webhook] Instance ${instance.id} has no agent linked`)
    return
  }

  // ─── Registrar timestamp para janela 24h ───
  await recordInboundTimestamp(instance.org_id, phone)

  // ─── Buscar ou criar lead ───
  // Gerar phoneFallback para BR (com/sem dígito 9)
  let phoneFallback: string | null = null
  if (phone.startsWith('55') && phone.length === 13) {
    phoneFallback = phone.slice(0, 4) + phone.slice(5) // remove 9th digit
  } else if (phone.startsWith('55') && phone.length === 12) {
    phoneFallback = phone.slice(0, 4) + '9' + phone.slice(4) // add 9th digit
  }

  const lead = await findOrCreateLead(phone, phoneFallback, instance.org_id, pushName)

  // ─── Transcrever áudio se necessário ───
  const isAudioMessage = ['audio', 'voice'].includes(msgType)
  let wasTranscribed = false

  if (isAudioMessage && !messageText.trim()) {
    // Cloud API precisa download via Graph API para transcrever
    // TODO: implementar download de mídia via Cloud API
    // Por agora, registra como áudio sem transcrição
    console.log(`[CloudAPI:Webhook] Audio from ${phone} — transcription not yet implemented for Cloud API`)
  }

  // Se mensagem vazia e não é áudio, ignorar
  if (!messageText.trim() && !isAudioMessage) {
    console.log(`[CloudAPI:Webhook] Empty message from ${phone} — skipping`)
    return
  }

  // ─── Salvar mensagem no histórico ───
  await supabase.from('sdr_messages').insert({
    org_id: instance.org_id,
    lead_id: lead.id,
    campaign_id: instance.campaign_id || null,
    instance_name: instance.instance_name,
    phone,
    role: 'user',
    body: messageText,
    type: isAudioMessage ? 'audio' : 'text',
    source: 'lead',
    whatsapp_message_id: msgId,
    push_name: pushName,
  })

  // Salvar em conversations/messages
  try {
    await supabase.rpc('fn_insert_message', {
      p_org_id: instance.org_id,
      p_lead_id: lead.id,
      p_channel: 'whatsapp',
      p_direction: 'inbound',
      p_body: messageText,
      p_sender_type: 'lead',
      p_sender_name: pushName || lead.name || `Lead ${phone.slice(-4)}`,
      p_message_type: isAudioMessage ? 'audio' : 'text',
      p_timestamp: new Date(timestamp || Date.now()).toISOString(),
    })
  } catch (rpcErr: any) {
    console.warn(`[CloudAPI:Webhook] fn_insert_message error (non-fatal): ${rpcErr.message}`)
  }

  // ─── Verificar STOP (atendente humano) ───
  const isStopped = await stopCheck(instance.org_id, phone)
  if (isStopped) {
    console.log(`[CloudAPI:Webhook] STOP active for ${phone} — msg saved, AI paused`)
    return
  }

  // ─── Reabrir conversa se finalizada ───
  if (lead.conversa_finalizada === true) {
    await supabase
      .from('leads')
      .update({ conversa_finalizada: false, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('org_id', instance.org_id)
  }

  // ─── Cancelar follow-ups ativos ───
  try {
    await supabase
      .from('follow_up_queue')
      .update({
        status: 'responded',
        last_inbound_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', lead.id)
      .eq('org_id', instance.org_id)
      .in('status', ['pending', 'active'])
  } catch (fuErr: any) {
    console.warn(`[CloudAPI:Webhook] Follow-up reset error: ${fuErr.message}`)
  }

  // ─── Áudio sem transcrição → não processar pela IA ───
  if (isAudioMessage && !messageText.trim()) {
    return
  }

  // ─── Buffer anti-fragmentação + agendar processamento ───
  const bufferTotal = await bufferPush(instance.org_id, phone, messageText)
  const bufferSeconds = calculateBufferSeconds(messageText)
  await bufferSetScheduledCount(instance.org_id, phone, bufferTotal)

  console.log(`[CloudAPI:Webhook] Buffer: ${bufferTotal} msg(s) | wait: ${bufferSeconds}s | lead: ${lead.id}`)

  // Agendar /api/sdr/process (mesmo pipeline do uazapi)
  const processUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sdr/process`
  const processPayload = {
    org_id: instance.org_id,
    phone,
    lead_id: lead.id,
    agent_id: instance.agent_id,
    campaign_id: instance.campaign_id,
    instance_name: instance.instance_name,
    secret: process.env.SDR_PROCESS_SECRET || 'sdr-internal-token',
  }

  after(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, bufferSeconds * 1000))
      console.log(`[CloudAPI:Webhook] Dispatching /process after ${bufferSeconds}s for ${phone}`)
      await fetch(processUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processPayload),
      })
    } catch (err: any) {
      console.error(`[CloudAPI:Webhook] Error calling /process: ${err.message}`)
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIND OR CREATE LEAD (simplificado do webhook uazapi)
// ═══════════════════════════════════════════════════════════════════════════════

async function findOrCreateLead(
  phone: string,
  phoneFallback: string | null,
  orgId: string,
  pushName: string
): Promise<any> {
  // Busca 1: número principal
  const { data: lead1 } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .eq('phone', phone)
    .single()

  if (lead1) return lead1

  // Busca 2: fallback BR
  if (phoneFallback) {
    const { data: lead2 } = await supabase
      .from('leads')
      .select('*')
      .eq('org_id', orgId)
      .eq('phone', phoneFallback)
      .single()

    if (lead2) return lead2
  }

  // Criar novo lead
  const leadName = pushName || `Lead ${phone.slice(-4)}`

  const { data: firstStage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('org_id', orgId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      name: leadName,
      phone,
      source: 'whatsapp_inbound',
      stage: firstStage?.name || 'new',
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    console.error('[CloudAPI:Webhook] Error creating lead:', error)
    return {
      id: 'temp_' + phone,
      name: leadName,
      phone,
      email: null,
      stage: 'new',
      source: 'whatsapp_inbound',
      org_id: orgId,
      created_at: new Date().toISOString(),
      conversa_finalizada: null,
    }
  }

  console.log(`[CloudAPI:Webhook] New lead created: ${newLead.id} (${leadName})`)
  return newLead
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

    const newStatus = event.toUpperCase() // APPROVED, REJECTED, PAUSED, DISABLED

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
