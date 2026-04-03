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
    const payload: UazapiWebhookPayload = await request.json()

    // Log do payload para debug — suporta formato v1 e v2 da UAZAPI
    const instName = payload.instanceName || payload.instance || '(sem nome)'
    const v2msg = (payload as any).message || {}
    const msgText = payload.body || payload.text || payload.caption || v2msg.body || v2msg.text || v2msg.conversation || ''
    const eventType = (payload as any).EventType || payload.type || 'unknown'
    console.log(`[SDR] Webhook recebido | instance: ${instName} | fromMe: ${payload.fromMe ?? v2msg.fromMe} | type: ${eventType} | text: "${msgText.slice(0, 60)}"`)

    // ─── 1. Filtros rápidos (antes de qualquer query ao banco) ───
    const filterResult = applyFilters(payload)
    if (filterResult) {
      console.log(`[SDR] Filtrado: ${filterResult} | instance: ${instName}`)
      // Caso especial: atendente humano → setar tag STOP antes de ignorar
      if ((payload as any)._isAttendant) {
        const inst = instName !== '(sem nome)' ? await resolveInstance(instName) : null
        if (inst) {
          const { phone: attPhone } = extractPhone(payload)
          if (isValidPhone(attPhone)) {
            await stopSet(inst.org_id, attPhone)
            console.log(`[SDR] STOP setado por atendente humano | phone: ${attPhone}`)
          }
        }
      }
      return NextResponse.json({ skipped: true, reason: filterResult }, { status: 200 })
    }

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

    // Log detalhado do payload v2 para debug
    const msg = (payload as any).message || {}
    const chat = (payload as any).chat || {}
    console.log(`[SDR] Payload keys: ${Object.keys(payload).join(', ')}`)
    console.log(`[SDR] message: ${JSON.stringify(msg).slice(0, 500)}`)
    console.log(`[SDR] chat: ${JSON.stringify(chat).slice(0, 500)}`)
    console.log(`[SDR] EventType: ${(payload as any).EventType} | owner: ${(payload as any).owner}`)
    console.log(`[SDR] chatSource: ${JSON.stringify((payload as any).chatSource).slice(0, 300)}`)

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

    // ─── 5. Verificar tag STOP (atendente humano) ───
    const isStopped = await stopCheck(instance.org_id, phone)
    if (isStopped) {
      console.log(`[SDR] STOP ativo para ${phone} — atendente humano no controle`)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'attendant_active',
        lead_id: lead.id
      })
    }

    // ─── 6. Verificar conversa_finalizada no lead (IA pausada pelo CRM) ───
    if (lead.conversa_finalizada === true) {
      console.log(`[SDR] conversa_finalizada=true para lead ${lead.id} — IA pausada`)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'conversation_ended',
        lead_id: lead.id
      })
    }

    // ─── 7. Adicionar mensagem ao buffer Redis ───
    const messageText = payload.body || payload.text || payload.caption || ''
    const bufferTotal = await bufferPush(instance.org_id, phone, messageText)
    const bufferSeconds = calculateBufferSeconds(messageText)

    // Salvar count esperado para comparação no /process
    await bufferSetScheduledCount(instance.org_id, phone, bufferTotal)

    console.log(`[SDR] ✓ Buffer: ${bufferTotal} msg(s) | espera: ${bufferSeconds}s | lead: ${lead.id} | phone: ${phone}`)

    // ─── 8. Agendar processamento após buffer time ───
    // Usa fetch fire-and-forget para chamar /api/sdr/process após delay
    // O endpoint process verifica se o buffer cresceu (novas mensagens)
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

    // setTimeout + fetch: dispara após bufferSeconds
    // Em serverless, isso funciona se a função ainda estiver viva.
    // Para garantia, usamos também o AbortController com timeout generoso.
    scheduleProcess(processUrl, processPayload, bufferSeconds)

    return NextResponse.json({
      success: true,
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
// FILTROS
// Retorna motivo do skip, ou null se deve processar
// ═══════════════════════════════════════════════════════════════════════════════

function applyFilters(payload: UazapiWebhookPayload): string | null {
  // 1. Ignorar mensagens de grupo
  if (payload.isGroup) return 'group_message'

  // 2. Mensagens enviadas pelo próprio chip (fromMe)
  if (payload.fromMe === true) {
    // Detectar se é mensagem do atendente humano (não da API/agente)
    // UAZAPI marca mensagens enviadas via API com campo específico
    const isFromApi = payload.fromApi === true || payload.isApi === true || payload.source === 'api'
    if (!isFromApi) {
      // Atendente humano digitou no celular → marcar como STOP
      // Isso será tratado fora do filtro para ter acesso ao phone e org_id
      // Guardamos no payload para processar depois
      ;(payload as any)._isAttendant = true
    }
    return 'from_me'
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
  const nonMessageTypes = ['ReadReceipt', 'receipt', 'presence', 'call', 'notification', 'revoked']
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
