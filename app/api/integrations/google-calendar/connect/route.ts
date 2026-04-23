// GET /api/integrations/google-calendar/connect
// Inicia o fluxo OAuth: gera state, seta cookie e redireciona pro Google.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth } from '@/lib/api-auth'
import { buildAuthUrl } from '@/lib/integrations/google-calendar'

const STATE_COOKIE = 'gcal_oauth_state'
const STATE_MAX_AGE = 60 * 10 // 10 minutos

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  // state = user_id + nonce → no callback confirmamos que é o mesmo usuário que iniciou
  const nonce = crypto.randomBytes(16).toString('hex')
  const state = `${auth.userId}.${nonce}`

  const authUrl = buildAuthUrl(state)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_MAX_AGE,
    path: '/',
  })
  return response
}
