// POST /api/email/campaigns/[id]/pause — pausa a campanha
// Contatos pending ficam na fila mas nada é enviado enquanto pausada.

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

  const { error } = await supabaseAdmin
    .from('agent_campaigns')
    .update({ status: 'paused' })
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .in('status', ['active', 'draft'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
