// app/api/sdr/follow-up/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Cron job: Vercel cron roda a cada hora (vercel.json)
// Busca leads na follow_up_queue prontos para reengajamento e envia mensagens
//
// Fluxo:
// 1. Verificar horário comercial (8h-20h no fuso da org)
// 2. Buscar items da fila com next_attempt_at <= now()
// 3. Para cada item: gerar mensagem via Claude + enviar via UAZAPI
// 4. Atualizar fila: próxima tentativa ou marcar como exhausted
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { buildFollowUpPrompt } from '@/lib/sdr/follow-up-prompt'
import { sendWithHumanization } from '@/lib/sdr/whatsapp-sender'
import { notifyError } from '@/lib/monitoring/error-notifier'
import { stopCheck } from '@/lib/sdr/redis'
import { isWithinWindow } from '@/lib/sdr/messaging-window'
import { checkMonthlyPlanLimit } from '@/lib/planLimits'
import { isAgentAllowed, logGateDenied } from '@/lib/agents/gate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET
const MAX_PER_RUN = 20 // máximo de follow-ups por execução do cron
const SILENCE_THRESHOLD_HOURS = 4 // horas sem resposta do lead para considerar "silencioso"

// Estágios que indicam conversão — NÃO precisam de follow-up
const CONVERTED_STAGES = [
  'visita_agendada', 'visita_realizada', 'venda_fechada', 'won', 'lost',
  'visit_scheduled', 'visit_done', 'deal_closed',
]

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR LEADS SILENCIOSOS (sem resposta há X horas)
// Busca leads onde:
// - A última mensagem no sdr_messages foi do assistant (agente respondeu)
// - O lead NÃO respondeu há mais de SILENCE_THRESHOLD_HOURS
// - Conversa NÃO está finalizada (ainda "aberta")
// - NÃO tem follow-up já na fila
// - NÃO está em estágio de conversão
// ═══════════════════════════════════════════════════════════════════════════════

async function detectSilentLeads(now: Date): Promise<number> {
  try {
    const threshold = new Date(now.getTime() - SILENCE_THRESHOLD_HOURS * 60 * 60 * 1000)

    // Buscar as últimas mensagens por lead onde a última foi do assistant
    // e a mensagem foi enviada antes do threshold (lead não respondeu a tempo)
    const { data: silentMessages, error } = await supabase
      .rpc('fn_find_silent_leads', {
        p_threshold: threshold.toISOString(),
        p_converted_stages: CONVERTED_STAGES
      })

    if (error) {
      // Se a function não existe, usar fallback com query direta
      if (error.message.includes('fn_find_silent_leads')) {
        return await detectSilentLeadsFallback(now, threshold)
      }
      console.error('[FollowUp:Detect] RPC error:', error.message)
      return 0
    }

    if (!silentMessages || silentMessages.length === 0) {
      return 0
    }

    let enqueued = 0
    for (const row of silentMessages) {
      try {
        await enqueueSilentLead(row, now)
        enqueued++
      } catch (e: any) {
        console.warn(`[FollowUp:Detect] Erro ao enfileirar lead ${row.lead_id}: ${e.message}`)
      }
    }

    if (enqueued > 0) {
      console.log(`[FollowUp:Detect] ${enqueued} lead(s) silencioso(s) enfileirado(s) para follow-up`)
    }

    return enqueued
  } catch (err: any) {
    console.error('[FollowUp:Detect] Error:', err.message)
    return 0
  }
}

/**
 * Fallback: query direta (sem RPC function) para detectar leads silenciosos.
 * Funciona sem migration, porém mais lento que a RPC.
 */
async function detectSilentLeadsFallback(now: Date, threshold: Date): Promise<number> {
  // Buscar instâncias conectadas com agente de follow-up
  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('org_id, instance_name, agent_id, campaign_id')
    .eq('status', 'connected')

  if (!instances || instances.length === 0) return 0

  let enqueued = 0

  for (const inst of instances) {
    // Buscar leads ativos desta org que receberam mensagem do SDR antes do threshold
    // e cuja última mensagem foi do agente (não do lead)
    const { data: lastMessages } = await supabase
      .from('sdr_messages')
      .select('lead_id, role, created_at, body')
      .eq('org_id', inst.org_id)
      .eq('instance_name', inst.instance_name)
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()) // últimos 7 dias
      .order('created_at', { ascending: false })
      .limit(500)

    if (!lastMessages || lastMessages.length === 0) continue

    // Agrupar por lead_id e pegar a mensagem mais recente de cada
    const lastByLead = new Map<string, { role: string; created_at: string; body: string }>()
    for (const msg of lastMessages) {
      if (!lastByLead.has(msg.lead_id)) {
        lastByLead.set(msg.lead_id, msg)
      }
    }

    for (const [leadId, lastMsg] of lastByLead) {
      // Só enfileirar se a última mensagem foi do ASSISTANT e foi antes do threshold
      if (lastMsg.role !== 'assistant') continue
      if (new Date(lastMsg.created_at) > threshold) continue

      // Verificar se o lead não está em estágio de conversão
      const { data: lead } = await supabase
        .from('leads')
        .select('id, stage, conversa_finalizada')
        .eq('id', leadId)
        .eq('org_id', inst.org_id)
        .single()

      if (!lead) continue
      if (lead.conversa_finalizada) continue // conversa já foi encerrada pelo SDR
      if (CONVERTED_STAGES.includes(lead.stage || '')) continue

      // Verificar se já tem follow-up na fila
      const { data: existing } = await supabase
        .from('follow_up_queue')
        .select('id')
        .eq('lead_id', leadId)
        .eq('org_id', inst.org_id)
        .in('status', ['pending', 'active'])
        .limit(1)

      if (existing && existing.length > 0) continue

      // Enfileirar
      try {
        await enqueueSilentLead({
          org_id: inst.org_id,
          lead_id: leadId,
          instance_name: inst.instance_name,
          agent_id: inst.agent_id,
          campaign_id: inst.campaign_id,
          lead_stage: lead.stage,
          last_message: lastMsg.body,
        }, now)
        enqueued++
      } catch (e: any) {
        console.warn(`[FollowUp:Detect] Erro ao enfileirar lead ${leadId}: ${e.message}`)
      }
    }
  }

  if (enqueued > 0) {
    console.log(`[FollowUp:Detect:Fallback] ${enqueued} lead(s) silencioso(s) enfileirado(s)`)
  }

  return enqueued
}

async function enqueueSilentLead(row: any, now: Date) {
  const firstAttempt = new Date(now.getTime() + 1 * 60 * 60 * 1000) // 1h a partir de agora

  await supabase.from('follow_up_queue').insert({
    org_id: row.org_id,
    lead_id: row.lead_id,
    attempt_number: 0,
    max_attempts: 5,
    next_attempt_at: firstAttempt.toISOString(),
    last_lead_message_at: now.toISOString(),
    cadence_hours: [1, 24, 72, 120, 168], // 1ª tentativa rápida (já esperou 4h+)
    status: 'pending',
    last_conversation_summary: row.last_message ? `Lead silencioso. Última msg do agente: "${(row.last_message || '').slice(0, 200)}"` : 'Lead parou de responder após mensagem do agente',
    lead_stage: row.lead_stage || null,
    instance_name: row.instance_name,
    agent_id: row.agent_id || null,
    campaign_id: row.campaign_id || null,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/sdr/follow-up — Vercel cron chama via GET
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Verificar autenticação do cron (obrigatório)
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  console.log(`[FollowUp] Cron executado: ${now.toISOString()}`)

  try {
    // ─── 0. Detectar leads silenciosos e enfileirar automaticamente ───
    const enqueued = await detectSilentLeads(now)

    // ─── 1. Buscar items prontos para follow-up ───
    const { data: queue, error } = await supabase
      .from('follow_up_queue')
      .select(`
        id, org_id, lead_id, attempt_number, max_attempts,
        cadence_hours, last_conversation_summary, lead_stage,
        instance_name, agent_id, campaign_id, status
      `)
      .in('status', ['pending', 'active'])
      .lte('next_attempt_at', now.toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(MAX_PER_RUN)

    if (error) {
      console.error('[FollowUp] Query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!queue || queue.length === 0) {
      console.log(`[FollowUp] Nenhum follow-up pendente (${enqueued} novos enfileirados)`)
      return NextResponse.json({ processed: 0, enqueued, message: 'no pending follow-ups ready' })
    }

    console.log(`[FollowUp] ${queue.length} follow-up(s) para processar`)

    let processed = 0
    let skipped = 0
    let errors = 0

    for (const item of queue) {
      try {
        const result = await processFollowUp(item, now)
        if (result === 'processed') processed++
        else if (result === 'skipped') skipped++
      } catch (err: any) {
        errors++
        console.error(`[FollowUp] Erro no item ${item.id}: ${err.message}`)
        notifyError({
          module: 'FollowUp',
          severity: 'error',
          error: err.message,
          context: `Item: ${item.id} | Lead: ${item.lead_id}`
        })
      }
    }

    console.log(`[FollowUp] Concluído: ${processed} enviados, ${skipped} pulados, ${errors} erros, ${enqueued} novos`)

    return NextResponse.json({
      processed,
      skipped,
      errors,
      enqueued,
      total: queue.length
    })

  } catch (err: any) {
    console.error('[FollowUp] Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSAR UM ITEM DA FILA
// ═══════════════════════════════════════════════════════════════════════════════

async function processFollowUp(
  item: any,
  now: Date
): Promise<'processed' | 'skipped'> {
  const nextAttempt = item.attempt_number + 1

  // ─── 1. Buscar dados da org ───
  const { data: org } = await supabase
    .from('orgs')
    .select('name, country, language, niche, timezone')
    .eq('id', item.org_id)
    .single()

  if (!org) {
    console.warn(`[FollowUp] Org ${item.org_id} não encontrada — pulando`)
    return 'skipped'
  }

  // ─── 1b. GATE: org tem o agente followup contratado e ativo? ───
  // Sem este gate, o cron processava qualquer item da fila independente
  // do plano — causou caso real de org agency_ai recebendo follow-up
  // imobiliário (item enfileirado por instance + plano não tinha o agente).
  const gate = await isAgentAllowed(item.org_id, 'followup')
  if (!gate.allowed) {
    logGateDenied('follow-up:processFollowUp', gate, { item_id: item.id, lead_id: item.lead_id })
    // Cancela o item da fila — org não está autorizada
    await supabase
      .from('follow_up_queue')
      .update({
        status: 'cancelled',
        last_error: `gate_denied:${gate.reason}`,
        updated_at: now.toISOString(),
      })
      .eq('id', item.id)
    return 'skipped'
  }

  // ─── 2. Verificar horário comercial (8h-20h no fuso da org) ───
  const timezone = org.timezone || 'America/Sao_Paulo'
  const localHour = getLocalHour(now, timezone)

  if (localHour < 8 || localHour >= 20) {
    console.log(`[FollowUp] Fora do horário comercial (${localHour}h em ${timezone}) — pulando ${item.id}`)
    return 'skipped'
  }

  // ─── 3. Buscar dados do lead ───
  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, phone, email, stage, conversa_finalizada')
    .eq('id', item.lead_id)
    .single()

  if (!lead) {
    console.warn(`[FollowUp] Lead ${item.lead_id} não encontrado — cancelando`)
    await supabase.from('follow_up_queue').update({ status: 'cancelled', updated_at: now.toISOString() }).eq('id', item.id)
    return 'skipped'
  }

  // ─── 4. Verificar se STOP está ativo (atendente humano) ───
  const isStopped = await stopCheck(item.org_id, lead.phone)
  if (isStopped) {
    console.log(`[FollowUp] STOP ativo para ${lead.phone} — pulando`)
    return 'skipped'
  }

  // ─── 4b. Verificar limite mensal de mensagens IA do plano ───
  const msgLimit = await checkMonthlyPlanLimit(
    item.org_id, 'maxMonthlyMessages', 'sdr_messages', 'created_at',
    { role: 'assistant' }
  )
  if (!msgLimit.allowed) {
    console.warn(`[FollowUp] AI message limit reached for org ${item.org_id}: ${msgLimit.current}/${msgLimit.limit} — pulando`)
    return 'skipped'
  }

  // ─── 5. Verificar instância conectada ───
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('instance_name, instance_token, api_url, status, api_type, waba_id, phone_number_id')
    .eq('instance_name', item.instance_name)
    .eq('org_id', item.org_id)
    .single()

  if (!instance || instance.status !== 'connected') {
    console.warn(`[FollowUp] Instância ${item.instance_name} não conectada — pulando`)
    return 'skipped'
  }

  const isCloudApi = instance.api_type === 'cloud_api'

  // ─── 5.1. Cloud API: checar janela de 24h ───
  if (isCloudApi) {
    const withinWindow = await isWithinWindow(item.org_id, lead.phone)

    if (!withinWindow) {
      // Fora da janela → enviar template ao invés de texto livre
      console.log(`[FollowUp] Cloud API fora da janela 24h para ${lead.phone} — usando template`)
      const templateResult = await sendFollowUpTemplate(item, lead, instance, now)
      return templateResult
    }
    // Dentro da janela → segue fluxo normal (texto livre via Claude)
    console.log(`[FollowUp] Cloud API dentro da janela 24h para ${lead.phone} — texto livre`)
  }

  // ─── 6. Buscar config da campanha ───
  let campaignConfig: any = null
  if (item.campaign_id) {
    const { data: campaign } = await supabase
      .from('agent_campaigns')
      .select('config, name')
      .eq('id', item.campaign_id)
      .single()
    campaignConfig = campaign?.config || null
  }

  // ─── 7. Gerar mensagem de follow-up via Claude ───
  const prompt = buildFollowUpPrompt({
    assistant_name: campaignConfig?.assistant_name || 'Assistente',
    org_name: org.name || 'sua empresa',
    org_language: org.language,
    org_niche: org.niche,                       // ← novo: ramifica prompt por nicho
    lead_name: lead.name || '',
    lead_stage: item.lead_stage || lead.stage,
    attempt_number: nextAttempt,
    max_attempts: item.max_attempts,
    last_conversation_summary: item.last_conversation_summary,
    company_context: campaignConfig?.company_context,
    tone: campaignConfig?.tone
  })

  // Buscar últimas mensagens para contexto
  const { data: history } = await supabase
    .from('sdr_messages')
    .select('role, body, created_at')
    .eq('lead_id', item.lead_id)
    .eq('org_id', item.org_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const conversationContext = (history || []).reverse()
    .map(m => `${m.role === 'user' ? 'Lead' : 'Agente'}: ${m.body}`)
    .join('\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: prompt,
    messages: [{
      role: 'user',
      content: conversationContext
        ? `Contexto das últimas mensagens:\n${conversationContext}\n\nGere a mensagem de follow-up (tentativa ${nextAttempt}).`
        : `Gere a mensagem de follow-up (tentativa ${nextAttempt}) para o lead ${lead.name || 'sem nome'}.`
    }]
  })

  const textBlock = response.content.find((b: any) => b.type === 'text')
  const followUpMessage = (textBlock as any)?.text?.trim() || ''

  if (!followUpMessage) {
    console.error(`[FollowUp] Claude não gerou mensagem para item ${item.id}`)
    return 'skipped'
  }

  console.log(`[FollowUp] Mensagem gerada (tentativa ${nextAttempt}): "${followUpMessage.slice(0, 80)}"`)

  // ─── 8. Salvar mensagem no histórico ───
  await supabase.from('sdr_messages').insert({
    org_id: item.org_id,
    lead_id: item.lead_id,
    campaign_id: item.campaign_id || null,
    instance_name: item.instance_name,
    phone: lead.phone,
    role: 'assistant',
    body: followUpMessage,
    type: 'text',
    source: 'follow_up',
    processed_at: now.toISOString()
  })

  // Salvar no módulo de conversas
  try {
    await supabase.rpc('fn_insert_message', {
      p_org_id: item.org_id,
      p_lead_id: item.lead_id,
      p_channel: 'whatsapp',
      p_direction: 'outbound',
      p_body: followUpMessage,
      p_sender_type: 'agent_bot',
      p_sender_name: 'Follow-up Agent',
      p_message_type: 'text',
      p_timestamp: now.toISOString()
    })
  } catch (rpcErr: any) {
    console.warn(`[FollowUp] fn_insert_message error (non-fatal): ${rpcErr.message}`)
  }

  // ─── 9. Enviar via WhatsApp ───
  const sendResult = await sendWithHumanization({
    org_id: item.org_id,
    phone: lead.phone,
    instance_name: item.instance_name,
    messages: [followUpMessage]
  })

  console.log(`[FollowUp] Enviado para ${lead.phone}: ${sendResult.sent} ok, ${sendResult.failed} falha`)

  // ─── 10. Atualizar fila ───
  const cadence: number[] = item.cadence_hours || [4, 24, 72, 120, 168]

  if (nextAttempt >= item.max_attempts) {
    // Esgotou tentativas
    await supabase.from('follow_up_queue').update({
      status: 'exhausted',
      attempt_number: nextAttempt,
      last_attempt_at: now.toISOString(),
      updated_at: now.toISOString()
    }).eq('id', item.id)

    console.log(`[FollowUp] Lead ${lead.phone} esgotou ${item.max_attempts} tentativas — exhausted`)
  } else {
    // Agendar próxima tentativa
    const nextCadenceHours = cadence[nextAttempt] || cadence[cadence.length - 1] || 168
    const nextAttemptAt = new Date(now.getTime() + nextCadenceHours * 60 * 60 * 1000)

    await supabase.from('follow_up_queue').update({
      status: 'active',
      attempt_number: nextAttempt,
      last_attempt_at: now.toISOString(),
      next_attempt_at: nextAttemptAt.toISOString(),
      updated_at: now.toISOString()
    }).eq('id', item.id)

    console.log(`[FollowUp] Próxima tentativa ${nextAttempt + 1} agendada para ${nextAttemptAt.toISOString()} (${nextCadenceHours}h)`)
  }

  // ─── 11. Criar alerta para o corretor ───
  await supabase.from('alerts').insert({
    org_id: item.org_id,
    lead_id: item.lead_id,
    type: 'follow_up_sent',
    title: `Follow-up #${nextAttempt} enviado`,
    body: `Mensagem de reengajamento enviada para ${lead.name || lead.phone}. Tentativa ${nextAttempt} de ${item.max_attempts}.`,
    priority: nextAttempt >= item.max_attempts ? 'high' : 'low',
    status: 'unread'
  }).then(() => {}).catch(() => {})

  return 'processed'
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getLocalHour(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    })
    return parseInt(formatter.format(date), 10)
  } catch {
    // Fallback: assume Brasília (UTC-3)
    return (date.getUTCHours() - 3 + 24) % 24
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIAR FOLLOW-UP VIA TEMPLATE (Cloud API fora da janela 24h)
// ═══════════════════════════════════════════════════════════════════════════════

async function sendFollowUpTemplate(
  item: any,
  lead: any,
  instance: any,
  now: Date
): Promise<'processed' | 'skipped'> {
  const nextAttempt = item.attempt_number + 1

  // Buscar template aprovado de follow-up
  const { data: template } = await supabase
    .from('whatsapp_templates')
    .select('template_name, language, body_text')
    .eq('waba_id', instance.waba_id)
    .eq('meta_status', 'APPROVED')
    .eq('purpose', 'follow_up')
    .limit(1)
    .single()

  if (!template) {
    console.warn(`[FollowUp] No approved follow_up template for WABA ${instance.waba_id} — skipping`)
    return 'skipped'
  }

  // Enviar via adapter (sendWithHumanization detecta Cloud API e usa template)
  const sendResult = await sendWithHumanization({
    org_id: item.org_id,
    phone: lead.phone,
    instance_name: item.instance_name,
    messages: [`[template:${template.template_name}]`] // Marcador — o sender detecta e envia template
  })

  if (sendResult.sent === 0) {
    console.warn(`[FollowUp] Template send failed for ${lead.phone}`)
    return 'skipped'
  }

  // Salvar no histórico
  const templateBody = template.body_text.replace(/\{\{1\}\}/g, lead.name || 'Cliente')
  await supabase.from('sdr_messages').insert({
    org_id: item.org_id,
    lead_id: item.lead_id,
    campaign_id: item.campaign_id || null,
    instance_name: item.instance_name,
    phone: lead.phone,
    role: 'assistant',
    body: `[Template: ${template.template_name}] ${templateBody}`,
    type: 'text',
    source: 'follow_up',
    processed_at: now.toISOString()
  })

  // Salvar no módulo de conversas
  try {
    await supabase.rpc('fn_insert_message', {
      p_org_id: item.org_id,
      p_lead_id: item.lead_id,
      p_channel: 'whatsapp',
      p_direction: 'outbound',
      p_body: `[Template: ${template.template_name}] ${templateBody}`,
      p_sender_type: 'agent_bot',
      p_sender_name: 'Follow-up Agent',
      p_message_type: 'text',
      p_timestamp: now.toISOString()
    })
  } catch (rpcErr: any) {
    console.warn(`[FollowUp] fn_insert_message error (non-fatal): ${rpcErr.message}`)
  }

  console.log(`[FollowUp] Template "${template.template_name}" enviado para ${lead.phone} (tentativa ${nextAttempt})`)

  // Atualizar fila
  const cadence: number[] = item.cadence_hours || [4, 24, 72, 120, 168]

  if (nextAttempt >= item.max_attempts) {
    await supabase.from('follow_up_queue').update({
      status: 'exhausted',
      attempt_number: nextAttempt,
      last_attempt_at: now.toISOString(),
      template_name: template.template_name,
      updated_at: now.toISOString()
    }).eq('id', item.id)
  } else {
    const nextCadenceHours = cadence[nextAttempt] || cadence[cadence.length - 1] || 168
    const nextAttemptAt = new Date(now.getTime() + nextCadenceHours * 60 * 60 * 1000)

    await supabase.from('follow_up_queue').update({
      status: 'active',
      attempt_number: nextAttempt,
      last_attempt_at: now.toISOString(),
      next_attempt_at: nextAttemptAt.toISOString(),
      template_name: template.template_name,
      updated_at: now.toISOString()
    }).eq('id', item.id)
  }

  // Criar alerta
  await supabase.from('alerts').insert({
    org_id: item.org_id,
    lead_id: item.lead_id,
    type: 'follow_up_sent',
    title: `Follow-up #${nextAttempt} enviado (template)`,
    body: `Template "${template.template_name}" enviado para ${lead.name || lead.phone}. Tentativa ${nextAttempt} de ${item.max_attempts}.`,
    priority: nextAttempt >= item.max_attempts ? 'high' : 'low',
    status: 'unread'
  }).then(() => {}).catch(() => {})

  return 'processed'
}
