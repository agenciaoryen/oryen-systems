// app/api/sdr/process/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Pipeline completo: Buffer → IA → Humanização → Envio
//
// Chamado após buffer time (6-12s) para verificar se lead parou de digitar.
// Se parou → flush buffer → Claude + tools → humanizar → enviar via UAZAPI.
//
// Fluxo:
// 1. Verificar STOP tag (atendente humano)
// 2. Verificar se buffer cresceu (novas msgs)
// 3. Flush buffer → concatenar mensagens
// 4. Carregar contexto (histórico + lead + org + config)
// 5. Chamar agente IA (Claude Sonnet + 8 tools)
// 6. Salvar resposta em sdr_messages
// 7. Humanizar (typing delay 55ms/char) + enviar via UAZAPI
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  bufferCount,
  bufferFlush,
  bufferGetScheduledCount,
  stopCheck,
  acquireProcessLock,
  releaseProcessLock
} from '@/lib/sdr/redis'
import { runAgent } from '@/lib/sdr/ai-agent'
import { sendWithHumanization } from '@/lib/sdr/whatsapp-sender'
import { notifyError } from '@/lib/monitoring/error-notifier'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Token secreto para validar que a chamada vem do nosso webhook (não externo)
const PROCESS_SECRET = process.env.SDR_PROCESS_SECRET || 'sdr-internal-token'

export async function POST(request: NextRequest) {
  let body: any = {}
  try {
    body = await request.json()
    const {
      org_id,
      phone,
      lead_id,
      agent_id,
      campaign_id,
      instance_name,
      secret
    } = body

    // ─── Validação básica ───
    if (secret !== PROCESS_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!org_id || !phone) {
      return NextResponse.json({ error: 'missing org_id or phone' }, { status: 400 })
    }

    // ─── 1. Verificar tag STOP ───
    const isStopped = await stopCheck(org_id, phone)
    if (isStopped) {
      console.log(`[SDR:Process] STOP ativo para ${phone} — atendente humano no controle`)
      return NextResponse.json({ skipped: true, reason: 'attendant_active' })
    }

    // ─── 2. Verificar se chegaram novas mensagens durante o buffer ───
    const scheduledCount = await bufferGetScheduledCount(org_id, phone)
    const currentCount = await bufferCount(org_id, phone)

    if (scheduledCount !== null && currentCount > scheduledCount) {
      // Novas mensagens chegaram — o trigger mais recente vai processar
      console.log(`[SDR:Process] Buffer cresceu (${scheduledCount} → ${currentCount}) para ${phone} — aguardando`)
      return NextResponse.json({ skipped: true, reason: 'buffer_growing' })
    }

    // ─── 2b. Lock — evitar processamento duplicado ───
    const gotLock = await acquireProcessLock(org_id, phone)
    if (!gotLock) {
      console.log(`[SDR:Process] Lock ativo para ${phone} — outro processo já está respondendo`)
      return NextResponse.json({ skipped: true, reason: 'already_processing' })
    }

    // ─── 3. Flush do buffer — consumir todas as mensagens ───
    const messages = await bufferFlush(org_id, phone)

    if (messages.length === 0) {
      await releaseProcessLock(org_id, phone)
      return NextResponse.json({ skipped: true, reason: 'empty_buffer' })
    }

    // Concatenar mensagens (como no n8n: junta com \n)
    const fullMessage = messages.join('\n')

    console.log(`[SDR:Process] Processando ${messages.length} msg(s) de ${phone}: "${fullMessage.slice(0, 80)}..."`)

    // ─── 4. Buscar contexto de conversa (últimas N mensagens) ───
    const CONTEXT_WINDOW = 30 // mensagens de contexto para a IA

    const { data: history } = await supabase
      .from('sdr_messages')
      .select('role, body, created_at, type')
      .eq('lead_id', lead_id)
      .eq('org_id', org_id)
      .or('role.in.(user,assistant),type.eq.context')  // Mensagens + contexto de imóveis apresentados
      .order('created_at', { ascending: false })
      .limit(CONTEXT_WINDOW)

    // Inverter para ordem cronológica
    const conversationHistory = (history || []).reverse()

    // ─── 5. Buscar dados do lead para contexto ───
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, phone, email, stage, source, created_at, conversa_finalizada')
      .eq('id', lead_id)
      .single()

    // ─── 6. Buscar config (campanha ou agente single-config) ───
    let campaignConfig = null
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('agent_campaigns')
        .select('config, name')
        .eq('id', campaign_id)
        .single()
      campaignConfig = campaign?.config || null
    }

    // Fallback: se não tem campaign_id, buscar config direto do agente (SDR single-config)
    if (!campaignConfig && agent_id) {
      const { data: agentRow } = await supabase
        .from('agents')
        .select('config')
        .eq('id', agent_id)
        .single()
      campaignConfig = agentRow?.config || null
    }

    // Mensagem do lead já foi salva no webhook — não duplicar aqui

    // ─── 7. Buscar dados da org para contexto do prompt ───
    let orgData = null
    const { data: orgRow } = await supabase
      .from('orgs')
      .select('name, country, language, niche')
      .eq('id', org_id)
      .single()
    if (orgRow) orgData = orgRow

    // ─── 9. Chamar agente IA (Claude + tools) ───
    console.log(`[SDR:Process] Chamando agente IA para lead ${lead_id}...`)

    const agentResponse = await runAgent({
      org_id,
      phone,
      lead_id,
      agent_id,
      campaign_id,
      instance_name,
      user_message: fullMessage,
      history: conversationHistory,
      config: campaignConfig,
      lead,
      org: orgData ? {
        name: orgData.name,
        country: orgData.country,
        language: orgData.language,
        niche: orgData.niche
      } : undefined
    })

    console.log(`[SDR:Process] IA respondeu: ${agentResponse.messages.length} msg(s) | tools: [${agentResponse.toolsExecuted.join(', ')}] | tokens: ${agentResponse.tokensUsed}`)

    // Alerta se IA não gerou resposta — MAS não alertar se end_conversation foi chamado
    // (0 mensagens após end_conversation é comportamento correto: lead se despediu)
    const isLegitimateEnd = agentResponse.toolsExecuted.includes('end_conversation')
    if (agentResponse.messages.length === 0 && !isLegitimateEnd) {
      notifyError({
        module: 'SDR',
        severity: 'warning',
        error: 'Agente IA não gerou mensagem para o lead',
        context: `Lead: ${lead_id} | Phone: ${phone} | Tools: ${agentResponse.toolsExecuted.join(', ')} | Tokens: ${agentResponse.tokensUsed}`
      })
    }

    // ─── 10. Salvar resposta do agente em sdr_messages + conversations ───
    if (agentResponse.messages.length > 0) {
      const fullResponse = agentResponse.messages.join('\n\n')
      await supabase
        .from('sdr_messages')
        .insert({
          org_id,
          lead_id,
          campaign_id: campaign_id || null,
          instance_name,
          phone,
          role: 'assistant',
          body: fullResponse,
          type: 'text',
          processed_at: new Date().toISOString()
        })

      // Salvar no módulo de conversas do dashboard
      try {
        await supabase.rpc('fn_insert_message', {
          p_org_id: org_id,
          p_lead_id: lead_id,
          p_channel: 'whatsapp',
          p_direction: 'outbound',
          p_body: fullResponse,
          p_sender_type: 'agent_bot',
          p_sender_name: 'SDR Agent',
          p_message_type: 'text',
          p_timestamp: new Date().toISOString()
        })
      } catch (rpcErr: any) {
        console.warn(`[SDR:Process] fn_insert_message error (non-fatal): ${rpcErr.message}`)
      }
    }

    // ─── 11. Enviar mensagens via WhatsApp com humanização ───
    let sendResult = null

    if (agentResponse.messages.length > 0) {
      console.log(`[SDR:Process] Enviando ${agentResponse.messages.length} msg(s) via UAZAPI...`)

      sendResult = await sendWithHumanization({
        org_id,
        phone,
        instance_name,
        messages: agentResponse.messages
      })

      console.log(`[SDR:Process] Envio completo: ${sendResult.sent} ok, ${sendResult.failed} falha | ${Math.round(sendResult.total_time_ms / 1000)}s`)
    }

    // Liberar lock após processamento completo
    await releaseProcessLock(org_id, phone)

    return NextResponse.json({
      success: true,
      processed: true,
      messages_count: messages.length,
      lead_id,
      lead_name: lead?.name || 'unknown',
      agent_messages: agentResponse.messages,
      tools_executed: agentResponse.toolsExecuted,
      tokens_used: agentResponse.tokensUsed,
      model: agentResponse.model,
      send_result: sendResult ? {
        sent: sendResult.sent,
        failed: sendResult.failed,
        total_time_ms: sendResult.total_time_ms
      } : null
    })

  } catch (error: any) {
    console.error('[SDR:Process] Error:', error)
    // Liberar lock mesmo em caso de erro
    try { await releaseProcessLock(body?.org_id, body?.phone) } catch {}
    notifyError({
      module: 'SDR',
      severity: 'error',
      error: error.message || 'Erro desconhecido no processamento',
      context: `Lead: ${body?.lead_id || '?'} | Phone: ${body?.phone || '?'}`
    })
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    )
  }
}
