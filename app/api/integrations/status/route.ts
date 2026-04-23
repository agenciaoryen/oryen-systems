// GET /api/integrations/status
// Retorna o status das integrações do usuário autenticado (sem tokens).
// Usado pela página /dashboard/integrations pra renderizar os cards.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('integrations')
    .select('id, provider, status, provider_account_email, provider_account_name, last_sync_at, last_sync_error, created_at')
    .eq('user_id', auth.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ integrations: data || [] })
}
