// app/api/sdr/process/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// PARTE 2: Processador de mensagens bufferizadas
//
// Chamado após o buffer time (6-12s) para verificar se o lead parou de digitar.
// Se parou → concatena mensagens e encaminha para a IA (Parte 3).
// Se não → ignora (o próximo trigger vai cuidar).
//
// Fluxo:
// 1. Recebe org_id + phone + expected_count
// 2. Verifica tag STOP (atendente humano)
// 3. Compara count atual do buffer com expected_count
// 4. Se igual → flush buffer, carregar contexto, chamar IA
// 5. Se diferente → skip (novas mensagens chegaram)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  bufferCount,
  bufferFlush,
  bufferGetScheduledCount,
  stopCheck
} from '@/lib/sdr/redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Token secreto para validar que a chamada vem do nosso webhook (não externo)
const PROCESS_SECRET = process.env.SDR_PROCESS_SECRET || 'sdr-internal-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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

    // ─── 3. Flush do buffer — consumir todas as mensagens ───
    const messages = await bufferFlush(org_id, phone)

    if (messages.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'empty_buffer' })
    }

    // Concatenar mensagens (como no n8n: junta com \n)
    const fullMessage = messages.join('\n')

    console.log(`[SDR:Process] Processando ${messages.length} msg(s) de ${phone}: "${fullMessage.slice(0, 80)}..."`)

    // ─── 4. Buscar contexto de conversa (últimas N mensagens) ───
    const CONTEXT_WINDOW = 20 // mensagens de contexto para a IA

    const { data: history } = await supabase
      .from('sdr_messages')
      .select('role, body, created_at')
      .eq('lead_id', lead_id)
      .eq('org_id', org_id)
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

    // ─── 6. Buscar config da campanha (prompt, tom, instruções) ───
    let campaignConfig = null
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('agent_campaigns')
        .select('config, name')
        .eq('id', campaign_id)
        .single()
      campaignConfig = campaign?.config || null
    }

    // ─── 7. Salvar mensagem do lead na tabela sdr_messages ───
    await supabase
      .from('sdr_messages')
      .insert({
        org_id,
        lead_id,
        campaign_id: campaign_id || null,
        instance_name,
        phone,
        role: 'user',
        body: fullMessage,
        type: 'text'
      })

    // ═══════════════════════════════════════════════════════════════════════════
    // PARTE 3 vai ser plugada aqui:
    // - Montar prompt com contexto + config + lead data
    // - Chamar Claude API
    // - Parsear resposta em mensagens WhatsApp-friendly
    // - Salvar resposta do agente em sdr_messages
    //
    // PARTE 4 vai ser plugada aqui:
    // - Humanizar (split messages + typing delay)
    // - Enviar via UAZAPI
    // ═══════════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      processed: true,
      messages_count: messages.length,
      full_message: fullMessage,
      lead_id,
      lead_name: lead?.name || 'unknown',
      conversation_history_length: conversationHistory.length,
      campaign_config: campaignConfig,
      // Dados prontos para Parte 3
      _ready_for_ai: {
        org_id,
        phone,
        lead_id,
        lead,
        agent_id,
        campaign_id,
        instance_name,
        user_message: fullMessage,
        history: conversationHistory,
        config: campaignConfig
      }
    })

  } catch (error: any) {
    console.error('[SDR:Process] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    )
  }
}
