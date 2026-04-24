// POST /api/email/webhook/resend
// Recebe eventos do Resend: email.sent, email.delivered, email.opened,
// email.clicked, email.bounced, email.complained, email.delivery_delayed.
// Docs: https://resend.com/docs/dashboard/webhooks/introduction

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || !body.type || !body.data?.email_id) {
    return NextResponse.json({ ok: true, ignored: 'payload inválido' })
  }

  const eventType: string = body.type
  const messageId: string = body.data.email_id
  const now = new Date().toISOString()

  // Mapeia tipo → atualização de campo
  let update: Record<string, any> | null = null
  switch (eventType) {
    case 'email.delivered':
      update = { status: 'delivered', delivered_at: now }
      break
    case 'email.opened':
      update = { status: 'opened', opened_at: now }
      break
    case 'email.clicked':
      update = { status: 'clicked', clicked_at: now }
      break
    case 'email.bounced':
      update = { status: 'bounced', bounced_at: now, error_message: body.data?.bounce?.message || null }
      break
    case 'email.complained':
      update = { status: 'bounced', bounced_at: now, error_message: 'complained' }
      break
    case 'email.failed':
      update = { status: 'failed', error_message: body.data?.reason || 'failed' }
      break
    default:
      return NextResponse.json({ ok: true, ignored: eventType })
  }

  // Não "degrada" status: se já tava em opened/clicked/replied, não volta pra delivered
  const { data: current } = await supabaseAdmin
    .from('email_sends')
    .select('status')
    .eq('resend_message_id', messageId)
    .maybeSingle()

  if (!current) return NextResponse.json({ ok: true, not_found: true })

  const statusRank: Record<string, number> = {
    queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4, replied: 5,
    bounced: -1, failed: -1, cancelled: -1,
  }
  const currentRank = statusRank[current.status] ?? 0
  const nextRank = statusRank[update.status] ?? 0

  // Só atualiza se o novo rank é maior OU é um status terminal negativo
  if (nextRank > currentRank || nextRank === -1) {
    await supabaseAdmin
      .from('email_sends')
      .update({ ...update, updated_at: now })
      .eq('resend_message_id', messageId)
  } else {
    // Só registra o timestamp específico sem mudar status
    const timestampField = update.delivered_at ? 'delivered_at'
      : update.opened_at ? 'opened_at'
      : update.clicked_at ? 'clicked_at'
      : update.bounced_at ? 'bounced_at'
      : null
    if (timestampField) {
      await supabaseAdmin
        .from('email_sends')
        .update({ [timestampField]: now, updated_at: now })
        .eq('resend_message_id', messageId)
        .is(timestampField, null)
    }
  }

  return NextResponse.json({ ok: true })
}
