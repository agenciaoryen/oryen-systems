// lib/sdr/webhook-processor.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Processador compartilhado de webhooks (uazapi + Cloud API)
//
// Recebe mensagem já normalizada e executa o pipeline padrão:
// 1. Find/create lead
// 2. Salvar em sdr_messages + conversations
// 3. Checar STOP (atendente humano)
// 4. Reabrir conversa se finalizada
// 5. Cancelar follow-ups ativos
// 6. Buffer anti-fragmentação + agendar /process
// ═══════════════════════════════════════════════════════════════════════════════

import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  bufferPush,
  bufferSetScheduledCount,
  stopCheck,
  stopSet,
  calculateBufferSeconds
} from '@/lib/sdr/redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ───

export interface NormalizedInbound {
  phone: string
  phoneFallback: string | null
  messageText: string
  messageType: 'text' | 'audio' | 'image' | 'video' | 'document'
  pushName: string
  whatsappMessageId?: string
  timestamp?: number

  // Instância já resolvida
  orgId: string
  agentId: string
  campaignId?: string | null
  instanceName: string

  // Flags
  isAttendant?: boolean  // mensagem enviada por atendente humano (fromMe no celular)
  isAudioNoText?: boolean // áudio sem transcrição
}

export interface ProcessResult {
  success: boolean
  saved: boolean
  buffered?: boolean
  skipped?: boolean
  reason?: string
  leadId?: string
  leadName?: string
  isNewLead?: boolean
  bufferCount?: number
  bufferSeconds?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function processInboundMessage(msg: NormalizedInbound): Promise<ProcessResult> {
  const { phone, phoneFallback, orgId, instanceName } = msg

  // ─── 1. Find/create lead ───
  const lead = await findOrCreateLead(phone, phoneFallback, orgId, msg.pushName, msg.isAttendant)

  // ─── 2. Salvar mensagem no histórico ───
  const messageRole = msg.isAttendant ? 'assistant' : 'user'
  const direction = msg.isAttendant ? 'outbound' : 'inbound'
  const senderType = msg.isAttendant ? 'agent_human' : 'lead'
  const senderName = msg.isAttendant
    ? 'Atendente'
    : (msg.pushName || lead.name || `Lead ${phone.slice(-4)}`)
  const bodyToSave = msg.messageType === 'audio' && msg.messageText
    ? `[Áudio transcrito]: ${msg.messageText}`
    : msg.messageText

  await supabase.from('sdr_messages').insert({
    org_id: orgId,
    lead_id: lead.id,
    campaign_id: msg.campaignId || null,
    instance_name: instanceName,
    phone,
    role: messageRole,
    body: bodyToSave,
    type: msg.isAttendant ? 'attendant' : msg.messageType,
    source: msg.isAttendant ? 'human' : 'lead',
  })

  // Salvar em conversations/messages
  try {
    await supabase.rpc('fn_insert_message', {
      p_org_id: orgId,
      p_lead_id: lead.id,
      p_channel: 'whatsapp',
      p_direction: direction,
      p_body: bodyToSave,
      p_sender_type: senderType,
      p_sender_name: senderName,
      p_message_type: msg.messageType,
      p_timestamp: new Date(msg.timestamp || Date.now()).toISOString(),
    })
  } catch (rpcErr: any) {
    console.warn(`[Webhook:Processor] fn_insert_message error (non-fatal): ${rpcErr.message}`)
  }

  console.log(`[Webhook:Processor] ✓ Histórico salvo | role: ${messageRole} | lead: ${lead.id} | phone: ${phone}`)

  // ─── 2b. Track activity for lead scoring (non-blocking) ───
  if (!msg.isAttendant) {
    after(async () => {
      try {
        const { trackActivity } = await import('@/lib/scoring/activity-tracker')
        await trackActivity(orgId, lead.id, 'inbound_message')
      } catch (err: any) {
        console.warn(`[Webhook:Processor] Score tracking error (non-fatal): ${err.message}`)
      }
    })
  }

  // ─── 3. Se atendente → setar STOP e parar ───
  if (msg.isAttendant) {
    await stopSet(orgId, phone)
    console.log(`[Webhook:Processor] STOP setado por atendente | lead: ${lead.id}`)
    return { success: true, saved: true, skipped: true, reason: 'attendant_message_saved', leadId: lead.id }
  }

  // ─── 4. Checar STOP ───
  const isStopped = await stopCheck(orgId, phone)
  if (isStopped) {
    console.log(`[Webhook:Processor] STOP ativo para ${phone} — IA pausada`)
    return { success: true, saved: true, skipped: true, reason: 'attendant_active', leadId: lead.id }
  }

  // ─── 5. Reabrir conversa se finalizada ───
  if (lead.conversa_finalizada === true) {
    console.log(`[Webhook:Processor] Reabrindo conversa para lead ${lead.id}`)
    await supabase
      .from('leads')
      .update({ conversa_finalizada: false, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('org_id', orgId)
  }

  // ─── 6. Cancelar follow-ups ativos ───
  try {
    const { data: activeFollowUps } = await supabase
      .from('follow_up_queue')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('org_id', orgId)
      .in('status', ['pending', 'active'])

    if (activeFollowUps && activeFollowUps.length > 0) {
      await supabase
        .from('follow_up_queue')
        .update({ status: 'responded', updated_at: new Date().toISOString() })
        .eq('lead_id', lead.id)
        .eq('org_id', orgId)
        .in('status', ['pending', 'active'])

      console.log(`[Webhook:Processor] ✓ Follow-up cancelado (lead respondeu) — ${activeFollowUps.length} item(s)`)
    }
  } catch (fuErr: any) {
    console.warn(`[Webhook:Processor] Follow-up reset error (non-fatal): ${fuErr.message}`)
  }

  // ─── 7. Áudio sem transcrição → não processar pela IA ───
  if (msg.isAudioNoText) {
    console.log(`[Webhook:Processor] Áudio sem transcrição para ${phone} — salvo, IA não processa`)
    return { success: true, saved: true, skipped: true, reason: 'audio_no_transcription', leadId: lead.id }
  }

  // ─── 8. Mensagem vazia → não processar ───
  if (!msg.messageText.trim()) {
    return { success: true, saved: true, skipped: true, reason: 'empty_after_save', leadId: lead.id }
  }

  // ─── 9. Buffer anti-fragmentação + agendar /process ───
  const bufferTotal = await bufferPush(orgId, phone, msg.messageText)
  const bufferSeconds = calculateBufferSeconds(msg.messageText)
  await bufferSetScheduledCount(orgId, phone, bufferTotal)

  console.log(`[Webhook:Processor] ✓ Buffer: ${bufferTotal} msg(s) | espera: ${bufferSeconds}s | lead: ${lead.id}`)

  const processUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sdr/process`
  const processPayload = {
    org_id: orgId,
    phone,
    lead_id: lead.id,
    agent_id: msg.agentId,
    campaign_id: msg.campaignId,
    instance_name: instanceName,
    secret: process.env.SDR_PROCESS_SECRET || 'sdr-internal-token',
  }

  after(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, bufferSeconds * 1000))
      console.log(`[Webhook:Processor] Disparando /process após ${bufferSeconds}s para ${phone}`)
      const res = await fetch(processUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processPayload),
      })
      const data = await res.json().catch(() => ({}))
      console.log(`[Webhook:Processor] /process respondeu: ${res.status} | ${JSON.stringify(data).slice(0, 200)}`)
    } catch (err: any) {
      console.error(`[Webhook:Processor] Erro ao chamar /process: ${err.message}`)
    }
  })

  return {
    success: true,
    saved: true,
    buffered: true,
    leadId: lead.id,
    leadName: lead.name,
    isNewLead: lead._isNew || false,
    bufferCount: bufferTotal,
    bufferSeconds,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIND OR CREATE LEAD
// ═══════════════════════════════════════════════════════════════════════════════

async function findOrCreateLead(
  phone: string,
  phoneFallback: string | null,
  orgId: string,
  pushName: string,
  isAttendant?: boolean
): Promise<any> {
  // Busca 1: número principal
  const { data: lead1 } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .eq('phone', phone)
    .single()

  if (lead1) return lead1

  // Busca 2: fallback BR (com/sem dígito 9)
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
  let leadName = isAttendant ? null : (pushName || null)
  if (!leadName) leadName = `Lead ${phone.slice(-4)}`

  // Buscar primeiro estágio do pipeline
  const { data: firstStage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('org_id', orgId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  const initialStage = firstStage?.name || 'new'

  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      name: leadName,
      phone,
      source: isAttendant ? 'whatsapp_outbound' : 'whatsapp_inbound',
      stage: initialStage,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    console.error('[Webhook:Processor] Erro ao criar lead:', error)
    return {
      id: 'temp_' + phone,
      name: leadName,
      phone,
      email: null,
      stage: initialStage,
      source: 'whatsapp_inbound',
      org_id: orgId,
      created_at: new Date().toISOString(),
      conversa_finalizada: null,
      _isNew: true,
    }
  }

  console.log(`[Webhook:Processor] Novo lead criado: ${newLead.id} (${leadName})`)
  return { ...newLead, _isNew: true }
}
