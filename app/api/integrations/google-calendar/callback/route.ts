// GET /api/integrations/google-calendar/callback
// Google redireciona aqui depois do consentimento.
// Troca o code por tokens, encripta e salva em integrations.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'
import {
  exchangeCodeForTokens,
  fetchUserInfo,
  GOOGLE_CALENDAR_SCOPES,
} from '@/lib/integrations/google-calendar'
import { encryptString } from '@/lib/integrations/crypto'

const STATE_COOKIE = 'gcal_oauth_state'
const DASHBOARD_URL = '/dashboard/integrations'

function redirectWith(origin: string, params: Record<string, string>) {
  const url = new URL(DASHBOARD_URL, origin)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const origin = request.nextUrl.origin
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const errorParam = searchParams.get('error')

  // Usuário cancelou ou Google devolveu erro
  if (errorParam) {
    return redirectWith(origin, { gcal_error: errorParam })
  }

  if (!code || !stateParam) {
    return redirectWith(origin, { gcal_error: 'missing_code_or_state' })
  }

  // Valida state (CSRF)
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value
  if (!stateCookie || stateCookie !== stateParam) {
    return redirectWith(origin, { gcal_error: 'invalid_state' })
  }
  const [stateUserId] = stateParam.split('.')
  if (stateUserId !== auth.userId) {
    return redirectWith(origin, { gcal_error: 'user_mismatch' })
  }

  if (!auth.orgId) {
    return redirectWith(origin, { gcal_error: 'no_org' })
  }

  try {
    // 1. Troca code por tokens
    const tokens = await exchangeCodeForTokens(code)

    // 2. Descobre email/nome da conta Google conectada
    const userInfo = await fetchUserInfo(tokens.access_token)

    // 3. Upsert na tabela integrations
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const payload: Record<string, any> = {
      org_id: auth.orgId,
      user_id: auth.userId,
      provider: 'google_calendar',
      status: 'active',
      access_token: encryptString(tokens.access_token),
      token_expires_at: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(' ') : GOOGLE_CALENDAR_SCOPES,
      provider_account_email: userInfo.email,
      provider_account_name: userInfo.name || null,
      last_sync_error: null,
      last_sync_at: null,
    }
    // refresh_token só vem na primeira autorização (a menos que usemos prompt=consent)
    if (tokens.refresh_token) {
      payload.refresh_token = encryptString(tokens.refresh_token)
    }

    // UNIQUE(user_id, provider) → reconectar atualiza o registro
    const { error: upsertErr } = await supabaseAdmin
      .from('integrations')
      .upsert(payload, { onConflict: 'user_id,provider' })

    if (upsertErr) {
      console.error('[gcal callback] upsert falhou:', upsertErr.message)
      return redirectWith(origin, { gcal_error: 'db_error' })
    }

    // Limpa o cookie de state
    const response = redirectWith(origin, { gcal_connected: '1' })
    response.cookies.delete(STATE_COOKIE)
    return response
  } catch (err: any) {
    console.error('[gcal callback] falha:', err.message)
    return redirectWith(origin, { gcal_error: 'exchange_failed' })
  }
}
