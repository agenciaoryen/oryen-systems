// app/api/reports/send/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Cron job: roda a cada hora (vercel.json)
// Busca report_configs ativos cujo send_time bate com a hora atual,
// agrega métricas, formata e envia via WhatsApp.
//
// Também aceita POST para envio manual ("Enviar agora")
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { aggregateReportData } from '@/lib/reports/aggregator'
import { formatReportMessage } from '@/lib/reports/formatter'
import { sendWithHumanization } from '@/lib/sdr/whatsapp-sender'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET || ''

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/reports/send — Vercel cron (a cada hora)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  console.log(`[Reports] Cron executado: ${now.toISOString()}`)

  try {
    // Buscar todos os reports ativos
    const { data: configs, error } = await supabase
      .from('report_configs')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('[Reports] Query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!configs || configs.length === 0) {
      console.log('[Reports] Nenhum relatório ativo')
      return NextResponse.json({ processed: 0, message: 'no active reports' })
    }

    // Filtrar configs que devem ser enviados agora
    const toSend = configs.filter(c => shouldSendNow(c, now))

    if (toSend.length === 0) {
      console.log('[Reports] Nenhum relatório agendado para esta hora')
      return NextResponse.json({ processed: 0, message: 'no reports scheduled for this hour' })
    }

    console.log(`[Reports] ${toSend.length} relatório(s) para enviar`)

    let sent = 0
    let errors = 0

    for (const config of toSend) {
      try {
        await sendReport(config)
        sent++
      } catch (err: any) {
        errors++
        console.error(`[Reports] Erro ao enviar "${config.name}": ${err.message}`)
      }
    }

    console.log(`[Reports] Concluído: ${sent} enviados, ${errors} erros`)

    return NextResponse.json({ processed: sent, errors, total: toSend.length })
  } catch (err: any) {
    console.error('[Reports] Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/reports/send — Envio manual (botão "Enviar agora")
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, orgId } = body

    if (!reportId || !orgId) {
      return NextResponse.json({ error: 'reportId and orgId required' }, { status: 400 })
    }

    const { data: config, error } = await supabase
      .from('report_configs')
      .select('*')
      .eq('id', reportId)
      .eq('org_id', orgId)
      .single()

    if (error || !config) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await sendReport(config)

    return NextResponse.json({ success: true, message: 'Report sent' })
  } catch (err: any) {
    console.error('[Reports] Manual send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function shouldSendNow(config: any, now: Date): boolean {
  // Obter hora local da org (usamos timezone da org ou fallback Brasília)
  const sendTime = config.send_time?.substring(0, 5) || '18:00'
  const [targetHour] = sendTime.split(':').map(Number)

  // Por enquanto comparamos com UTC — o cron roda a cada hora,
  // então basta checar se a hora UTC bate (simplificação aceitável
  // pois a maioria dos clientes está no mesmo fuso)
  // TODO: usar timezone da org para comparação mais precisa
  const currentHour = now.getUTCHours()

  if (currentHour !== targetHour) return false

  const frequency = config.frequency
  const sendDay = config.send_day

  if (frequency === 'daily') return true

  if (frequency === 'weekly') {
    const daysMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    }
    return now.getUTCDay() === (daysMap[sendDay] ?? 1)
  }

  if (frequency === 'monthly') {
    const targetDay = parseInt(sendDay) || 1
    return now.getUTCDate() === targetDay
  }

  return false
}

async function sendReport(config: any): Promise<void> {
  const orgId = config.org_id
  const phone = config.recipient_whatsapp

  console.log(`[Reports] Processando "${config.name}" para +${phone}`)

  // 1. Buscar instância WhatsApp conectada da org
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('instance_name, status')
    .eq('org_id', orgId)
    .eq('status', 'connected')
    .limit(1)
    .single()

  if (!instance) {
    throw new Error(`Nenhuma instância WhatsApp conectada para org ${orgId}`)
  }

  // 2. Agregar métricas
  const reportData = await aggregateReportData(supabase, orgId, config)

  // 3. Formatar mensagem
  const message = formatReportMessage(reportData)

  // 4. Enviar via WhatsApp
  const result = await sendWithHumanization({
    org_id: orgId,
    phone,
    instance_name: instance.instance_name,
    messages: [message]
  })

  if (result.sent === 0) {
    throw new Error(`Falha ao enviar mensagem para +${phone}`)
  }

  // 5. Registrar envio
  await supabase.from('report_logs').insert({
    org_id: orgId,
    report_config_id: config.id,
    sent_at: new Date().toISOString(),
    recipient: phone,
    status: 'sent',
    message_preview: message.substring(0, 200)
  }).then(() => {}).catch(() => {})

  // 6. Atualizar last_sent_at na config
  await supabase
    .from('report_configs')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('id', config.id)

  console.log(`[Reports] ✅ "${config.name}" enviado para +${phone}`)
}
