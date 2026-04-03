// app/api/sdr/webhook/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// PARTE 1+2: Webhook SDR Imobiliário
// Recebe mensagens do UAZAPI, filtra, normaliza, bufferiza e agenda processamento
//
// Fluxo:
// 1. Receber payload UAZAPI
// 2. Filtrar: grupo, fromMe, status-only, sem texto
// 3. Resolver instância → org_id (multi-tenant)
// 4. Normalizar número (BR dígito 9)
// 5. Buscar lead no CRM (dupla busca: com e sem dígito 9)
// 6. Se lead não existe → criar lead novo
// 7. Verificar tag STOP (atendente humano)
// 8. Adicionar ao buffer Redis (anti-fragmentação)
// 9. Agendar processamento após buffer_seconds
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractPhone, isValidPhone } from '@/lib/sdr/normalize-phone'
import {
  bufferPush,
  bufferSetScheduledCount,
  stopCheck,
  stopSet,
  calculateBufferSeconds
} from '@/lib/sdr/redis'
import type {
  UazapiWebhookPayload,
  NormalizedMessage,
  WhatsAppInstance,
  CRMLead
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
    const rawPayload = await request.json()

    // ─── Normalizar payload UAZAPI v2 para formato plano ───
    const payload = normalizeV2Payload(rawPayload)

    const instName = payload.instanceName || '(sem nome)'
    const msgText = payload.body || ''
    console.log(`[SDR] Webhook recebido | instance: ${instName} | fromMe: ${payload.fromMe} | type: ${payload.type} | text: "${msgText.slice(0, 60)}" | phone: ${payload.chatId || '?'}`)

    // ─── 1. Filtros rápidos (antes de qualquer query ao banco) ───
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

    console.log(`[SDR] Instância resolvida: ${instance.instance_name} | org: ${instance.org_id} | agent: ${instance.agent_id || 'NENHUM'}`)


    // Verificar se o agente está ativo
    if (!instance.agent_id) {
      console.warn(`[SDR] Instância ${instance.instance_name} sem agente vinculado — mensagem ignorada`)
      return NextResponse.json({ skipped: true, reason: 'no_agent_linked' }, { status: 200 })
    }

    // ─── 3. Normalizar número ───
    const { phone, phoneFallback, isLid } = extractPhone(payload)

    if (!isValidPhone(phone)) {
      console.warn(`[SDR] Número inválido extraído: "${phone}" (lid: ${isLid})`)
      return NextResponse.json({ skipped: true, reason: 'invalid_phone' }, { status: 200 })
    }

    // ─── 4. Buscar lead no CRM (dupla busca para BR) ───
    const lead = await findOrCreateLead(phone, phoneFallback, instance.org_id, payload)
    const messageText = payload.body || payload.text || payload.caption || ''

    // ─── 5. Salvar mensagem no histórico (sdr_messages + conversations/messages) ───
    const messageRole = isAttendant ? 'assistant' : 'user'
    const direction = isAttendant ? 'outbound' : 'inbound'
    const senderType = isAttendant ? 'agent_human' : 'lead'
    const senderName = isAttendant ? 'Atendente' : (payload.pushName || lead.name || `Lead ${phone.slice(-4)}`)

    // Salvar em sdr_messages (histórico para IA)
    await supabase.from('sdr_messages').insert({
      org_id: instance.org_id,
      lead_id: lead.id,
      campaign_id: instance.campaign_id || null,
      instance_name: instanceName,
      phone,
      role: messageRole,
      body: messageText,
      type: isAttendant ? 'attendant' : 'text',
      source: isAttendant ? 'human' : 'lead'
    })

    // Salvar em conversations/messages (módulo de conversas do dashboard)
    try {
      await supabase.rpc('fn_insert_message', {
        p_org_id: instance.org_id,
        p_lead_id: lead.id,
        p_channel: 'whatsapp',
        p_direction: direction,
        p_body: messageText,
        p_sender_type: senderType,
        p_sender_name: senderName,
        p_message_type: 'text',
        p_timestamp: new Date().toISOString()
      })
    } catch (rpcErr: any) {
      console.warn(`[SDR] fn_insert_message error (non-fatal): ${rpcErr.message}`)
    }

    console.log(`[SDR] ✓ Histórico salvo | role: ${messageRole} | lead: ${lead.id} | phone: ${phone} | text: "${messageText.slice(0, 50)}"`)

    // ─── 6. Se é atendente humano → setar STOP e parar ───
    if (isAttendant) {
      await stopSet(instance.org_id, phone)
      console.log(`[SDR] STOP setado por atendente humano | lead: ${lead.id} | phone: ${phone}`)
      return NextResponse.json({
        success: true,
        saved: true,
        stop_set: true,
        lead_id: lead.id,
        reason: 'attendant_message_saved'
      })
    }

    // ─── 7. Verificar tag STOP (atendente humano ativo) ───
    const isStopped = await stopCheck(instance.org_id, phone)
    if (isStopped) {
      console.log(`[SDR] STOP ativo para ${phone} — mensagem salva, IA pausada`)
      return NextResponse.json({
        success: true,
        saved: true,
        skipped: true,
        reason: 'attendant_active',
        lead_id: lead.id
      })
    }

    // ─── 8. Verificar conversa_finalizada no lead (IA pausada pelo CRM) ───
    if (lead.conversa_finalizada === true) {
      console.log(`[SDR] conversa_finalizada=true para lead ${lead.id} — mensagem salva, IA pausada`)
      return NextResponse.json({
        success: true,
        saved: true,
        skipped: true,
        reason: 'conversation_ended',
        lead_id: lead.id
      })
    }

    // ─── 9. Adicionar mensagem ao buffer Redis (anti-fragmentação) ───
    const bufferTotal = await bufferPush(instance.org_id, phone, messageText)
    const bufferSeconds = calculateBufferSeconds(messageText)

    // Salvar count esperado para comparação no /process
    await bufferSetScheduledCount(instance.org_id, phone, bufferTotal)

    console.log(`[SDR] ✓ Buffer: ${bufferTotal} msg(s) | espera: ${bufferSeconds}s | lead: ${lead.id} | phone: ${phone}`)

    // ─── 10. Agendar processamento após buffer time ───
    const processUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sdr/process`
    const processPayload = {
      org_id: instance.org_id,
      phone,
      lead_id: lead.id,
      agent_id: instance.agent_id,
      campaign_id: instance.campaign_id,
      instance_name: instanceName,
      secret: process.env.SDR_PROCESS_SECRET || 'sdr-internal-token'
    }

    scheduleProcess(processUrl, processPayload, bufferSeconds)

    return NextResponse.json({
      success: true,
      saved: true,
      buffered: true,
      buffer_count: bufferTotal,
      buffer_seconds: bufferSeconds,
      lead_id: lead.id,
      lead_name: lead.name,
      is_new_lead: lead._isNew || false
    })

  } catch (error: any) {
    console.error('[SDR] Webhook error:', error)
    // Retornar 200 mesmo em erro para o UAZAPI não reenviar em loop
    return NextResponse.json(
      { error: error.message || 'Internal error', skipped: true },
      { status: 200 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZAR PAYLOAD UAZAPI V2
// Converte o formato aninhado (message, chat, EventType) para formato plano
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeV2Payload(raw: any): UazapiWebhookPayload {
  // Se já tem campos v1 (body, from, etc.), retornar como está
  if (raw.body || raw.senderPn || raw.from) {
    return raw as UazapiWebhookPayload
  }

  // Formato v2: { EventType, instanceName, message: {...}, chat: {...}, owner, token }
  const msg = raw.message || {}
  const chat = raw.chat || {}
  const eventType = raw.EventType || ''

  return {
    // Identificadores
    messageId: msg.messageid || msg.id || '',
    id: msg.messageid || '',

    // Remetente — chatid é o número do contato (remoto)
    chatId: msg.chatid || '',
    senderPn: msg.sender_pn || '',
    lid: msg.chatlid || msg.sender_lid || msg.sender || '',
    from: msg.chatid || '',
    remoteJidAlt: msg.sender_pn || '',

    // Grupo
    isGroup: msg.isGroup === true,

    // Direção
    fromMe: msg.fromMe === true,

    // Conteúdo
    body: msg.content || msg.body || msg.text || msg.conversation || '',
    text: msg.content || '',
    type: eventType || msg.messageType || 'text',
    caption: msg.caption || '',

    // Mídia
    mediaUrl: msg.mediaUrl || '',
    mimetype: msg.mimetype || '',

    // Metadados
    timestamp: msg.messageTimestamp || Date.now(),
    pushName: msg.senderName || '',
    status: msg.status || '',

    // Instância
    instanceName: raw.instanceName || '',
    instance: raw.instanceName || '',
    token: raw.token || '',

    // API detection
    fromApi: msg.fromApi === true || msg.source === 'api',
    isApi: msg.fromApi === true,
    source: msg.source || '',

    // Owner (número do chip)
    owner: raw.owner || msg.owner || '',
  } as UazapiWebhookPayload
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTROS
// Retorna motivo do skip, ou null se deve processar
// ═══════════════════════════════════════════════════════════════════════════════

function applyFilters(payload: UazapiWebhookPayload): string | null {
  // 1. Ignorar mensagens de grupo
  if (payload.isGroup) return 'group_message'

  // 2. Mensagens enviadas pelo próprio chip (fromMe)
  // NÃO filtrar — precisa salvar no histórico e setar STOP se atendente humano
  // Apenas mensagens enviadas pela API (agente IA) são ignoradas
  if (payload.fromMe === true) {
    const isFromApi = payload.fromApi === true || payload.isApi === true || payload.source === 'api'
    if (isFromApi) {
      return 'from_api' // IA enviou — ignorar para não criar loop
    }
    // Atendente humano → marcar para processar (salvar + STOP)
    ;(payload as any)._isAttendant = true
    // NÃO retorna — continua para salvar no histórico
  }

  // 3. Ignorar notificações de status (delivered, read, etc.)
  // UAZAPI envia status updates sem body
  if (payload.status && !payload.body && !payload.text) return 'status_update'

  // 4. Ignorar mensagens vazias
  const text = payload.body || payload.text || payload.caption || ''
  if (!text.trim() && payload.type === 'text') return 'empty_message'

  // 5. Ignorar reações e protocolos internos
  if (payload.type === 'reaction') return 'reaction'
  if (payload.type === 'protocol') return 'protocol'

  // 6. Ignorar tipos não-mensagem da UAZAPI (ReadReceipt, presence, etc.)
  const nonMessageTypes = ['ReadReceipt', 'receipt', 'presence', 'call', 'notification', 'revoked', 'messages_update', 'connection']
  if (payload.type && nonMessageTypes.includes(payload.type)) return `non_message_type:${payload.type}`

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLVER INSTÂNCIA → ORG
// Cache simples em memória (reseta a cada cold start do serverless)
// ═══════════════════════════════════════════════════════════════════════════════

const instanceCache = new Map<string, { data: WhatsAppInstance; cachedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

async function resolveInstance(instanceName: string): Promise<WhatsAppInstance | null> {
  // Check cache
  const cached = instanceCache.get(instanceName)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data
  }

  // Busca 1: pelo instance_name exato
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

  // Busca 2: pelo display_name (instâncias criadas manualmente podem ter nome diferente)
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

  // Busca 3: só tem uma instância conectada nessa API? (fallback para single-instance)
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

// ═══════════════════════════════════════════════════════════════════════════════
// AGENDAMENTO DO PROCESSAMENTO
// Dispara /api/sdr/process após N segundos de delay
// ═══════════════════════════════════════════════════════════════════════════════

function scheduleProcess(url: string, payload: any, delaySeconds: number): void {
  // Usar setTimeout para delay, depois fetch fire-and-forget
  // O .catch silencia erros de rede (se a função serverless morrer antes, o buffer
  // será processado pelo próximo webhook que chegar — design resiliente)
  setTimeout(() => {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => {
      console.error('[SDR] Erro ao chamar /process:', err.message)
    })
  }, delaySeconds * 1000)
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUSCAR OU CRIAR LEAD NO CRM
// Busca dupla (com e sem dígito 9) como no workflow n8n validado
// ═══════════════════════════════════════════════════════════════════════════════

async function findOrCreateLead(
  phone: string,
  phoneFallback: string | null,
  orgId: string,
  payload: UazapiWebhookPayload
): Promise<CRMLead & { _isNew?: boolean }> {
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

  // Lead não encontrado → criar novo
  const newLeadName = payload.pushName || `Lead ${phone.slice(-4)}`

  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      name: newLeadName,
      phone: phone,
      source: 'whatsapp_inbound',
      stage: 'new',
      created_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (error) {
    console.error('[SDR] Erro ao criar lead:', error)
    // Retornar objeto mínimo para não quebrar o fluxo
    return {
      id: 'temp_' + phone,
      name: newLeadName,
      phone,
      email: null,
      stage: 'new',
      source: 'whatsapp_inbound',
      org_id: orgId,
      created_at: new Date().toISOString(),
      conversa_finalizada: null,
      _isNew: true
    }
  }

  console.log(`[SDR] Novo lead criado: ${newLead.id} (${newLeadName})`)
  return { ...newLead, _isNew: true }
}
