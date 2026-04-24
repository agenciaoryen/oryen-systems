// POST /api/email/campaigns/[id]/start — ativa a campanha (status=active)
// A partir daí o cron vai processar a fila respeitando rate limit.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const { id } = await params

  // Confirma que existe + tem contatos
  const { data: campaign } = await supabaseAdmin
    .from('agent_campaigns')
    .select('*')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { count: contactCount } = await supabaseAdmin
    .from('email_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)
  if (!contactCount) {
    return NextResponse.json({ error: 'campanha sem contatos — importe um CSV antes' }, { status: 400 })
  }

  const config = campaign.config || {}
  if (!config.pitch_hook || !config.sender_name || !config.call_to_action) {
    return NextResponse.json({ error: 'config incompleta' }, { status: 400 })
  }

  await supabaseAdmin
    .from('agent_campaigns')
    .update({ status: 'active', last_run_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, status: 'active' })
}
