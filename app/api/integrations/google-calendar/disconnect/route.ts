// POST /api/integrations/google-calendar/disconnect
// Revoga o token no Google, apaga a integração do usuário, e remove
// todos os eventos que foram puxados do Google (external_read_only=true)
// e os eventos nativos que foram espelhados lá.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'
import { revokeToken } from '@/lib/integrations/google-calendar'
import { decryptString } from '@/lib/integrations/crypto'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  // Busca a integração do usuário
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('provider', 'google_calendar')
    .maybeSingle()

  if (!integration) {
    return NextResponse.json({ ok: true, already_disconnected: true })
  }

  // Revoga no Google (usa refresh_token se houver, senão access_token)
  try {
    const tokenToRevoke = integration.refresh_token || integration.access_token
    if (tokenToRevoke) {
      await revokeToken(decryptString(tokenToRevoke))
    }
  } catch (err: any) {
    // Não bloqueia — mesmo se revoke falhar, seguimos limpando localmente
    console.warn('[gcal disconnect] revoke warning:', err.message)
  }

  // Remove eventos PULLED do Google (read-only; são espelhos do lado de lá)
  await supabaseAdmin
    .from('calendar_events')
    .delete()
    .eq('external_integration_id', integration.id)
    .eq('external_read_only', true)

  // Eventos originados na Oryen que foram espelhados no Google: mantém na Oryen
  // mas desvincula (vão parar de sincronizar — usuário pode reconectar depois)
  await supabaseAdmin
    .from('calendar_events')
    .update({
      external_source: null,
      external_id: null,
      external_integration_id: null,
      external_updated_at: null,
    })
    .eq('external_integration_id', integration.id)
    .eq('external_read_only', false)

  // Apaga a integração
  const { error: delErr } = await supabaseAdmin
    .from('integrations')
    .delete()
    .eq('id', integration.id)

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
