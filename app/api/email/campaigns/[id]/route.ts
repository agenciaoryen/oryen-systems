// GET  /api/email/campaigns/[id] — detalhe + stats
// PATCH /api/email/campaigns/[id] — atualizar config/status

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const { id } = await params

  const { data: campaign } = await supabaseAdmin
    .from('agent_campaigns')
    .select('*')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .maybeSingle()

  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Stats por status de contato
  const { data: contactsByStatus } = await supabaseAdmin
    .from('email_contacts')
    .select('status')
    .eq('campaign_id', id)
  const contactStats: Record<string, number> = { pending: 0, processing: 0, sent: 0, skipped: 0 }
  ;(contactsByStatus || []).forEach((c: any) => {
    contactStats[c.status] = (contactStats[c.status] || 0) + 1
  })

  // Stats por status de send
  const { data: sendsByStatus } = await supabaseAdmin
    .from('email_sends')
    .select('status')
    .eq('campaign_id', id)
  const sendStats: Record<string, number> = {
    queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, failed: 0,
  }
  ;(sendsByStatus || []).forEach((s: any) => {
    sendStats[s.status] = (sendStats[s.status] || 0) + 1
  })

  const total = (contactStats.pending || 0) + (contactStats.processing || 0) + (contactStats.sent || 0) + (contactStats.skipped || 0)
  const openRate = sendStats.sent > 0
    ? Math.round(((sendStats.opened + sendStats.clicked + sendStats.replied) / (sendStats.sent + sendStats.delivered + sendStats.opened + sendStats.clicked + sendStats.replied)) * 100)
    : 0
  const replyRate = sendStats.sent > 0
    ? Math.round((sendStats.replied / (sendStats.sent + sendStats.delivered + sendStats.opened + sendStats.clicked + sendStats.replied)) * 100)
    : 0

  return NextResponse.json({
    campaign,
    stats: {
      contacts_total: total,
      contacts_pending: contactStats.pending || 0,
      contacts_sent: contactStats.sent || 0,
      contacts_skipped: contactStats.skipped || 0,
      sends: sendStats,
      open_rate_pct: openRate,
      reply_rate_pct: replyRate,
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const allowedFields = ['name', 'config', 'status']
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const k of allowedFields) {
    if (body[k] !== undefined) updates[k] = body[k]
  }

  const { data, error } = await supabaseAdmin
    .from('agent_campaigns')
    .update(updates)
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}
