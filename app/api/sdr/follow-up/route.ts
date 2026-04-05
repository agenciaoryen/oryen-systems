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
import { stopCheck } from '@/lib/sdr/redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET || ''
const MAX_PER_RUN = 20 // máximo de follow-ups por execução do cron

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/sdr/follow-up — Vercel cron chama via GET
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Verificar autenticação do cron
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  console.log(`[FollowUp] Cron executado: ${now.toISOString()}`)

  try {
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
      console.log('[FollowUp] Nenhum follow-up pendente')
      return NextResponse.json({ processed: 0, message: 'no pending follow-ups' })
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
        // Não quebra o loop — continua com os próximos
      }
    }

    console.log(`[FollowUp] Concluído: ${processed} enviados, ${skipped} pulados, ${errors} erros`)

    return NextResponse.json({
      processed,
      skipped,
      errors,
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

  // ─── 5. Verificar instância conectada ───
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('instance_name, instance_token, api_url, status')
    .eq('instance_name', item.instance_name)
    .eq('org_id', item.org_id)
    .single()

  if (!instance || instance.status !== 'connected') {
    console.warn(`[FollowUp] Instância ${item.instance_name} não conectada — pulando`)
    return 'skipped'
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
    org_name: org.name || 'a imobiliária',
    org_language: org.language,
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
