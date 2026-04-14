// lib/api-auth.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Autenticação e autorização server-side para API routes
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client para queries após validação de auth
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export type AuthResult = {
  userId: string
  orgId: string | null
  role: string
  isStaff: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH PRINCIPAL — valida cookies de sessão Supabase
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAuthUser(request: NextRequest): Promise<AuthResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Read-only em API routes (middleware cuida do refresh)
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthError('Não autorizado', 401)
  }

  // Buscar org_id e role do usuário
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    orgId: profile?.org_id || null,
    role: profile?.role || 'user',
    isStaff: profile?.role === 'staff',
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRAPPER — retorna AuthResult ou NextResponse de erro (para uso direto em routes)
// ═══════════════════════════════════════════════════════════════════════════════

export async function requireAuth(request: NextRequest): Promise<AuthResult | NextResponse> {
  try {
    return await getAuthUser(request)
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Erro de autenticação' }, { status: 401 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORG ID — resolve org_id com base na auth (staff pode acessar qualquer org)
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveOrgId(auth: AuthResult, requestedOrgId?: string | null): string {
  if (auth.isStaff) {
    // Staff pode acessar qualquer org
    if (requestedOrgId) return requestedOrgId
    if (auth.orgId) return auth.orgId
    throw new AuthError('org_id obrigatório para staff', 400)
  }

  // Usuário normal: usar org_id do perfil
  if (!auth.orgId) {
    throw new AuthError('Usuário sem organização', 403)
  }

  // Se enviou org_id diferente da sua, bloquear
  if (requestedOrgId && requestedOrgId !== auth.orgId) {
    throw new AuthError('Acesso negado', 403)
  }

  return auth.orgId
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRON — validação de secret para endpoints de cron job
// ═══════════════════════════════════════════════════════════════════════════════

export function validateCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // Fail closed: sem secret = sem acesso
  const provided =
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.headers.get('x-cron-secret')
  return provided === secret
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK — validação HMAC SHA-256 (Meta Cloud API)
// ═══════════════════════════════════════════════════════════════════════════════

export async function validateMetaSignature(
  request: NextRequest,
  rawBody: string
): Promise<boolean> {
  const signature = request.headers.get('x-hub-signature-256')
  const secret = process.env.META_APP_SECRET
  if (!secret || !signature) return false

  const expectedSig = signature.replace('sha256=', '')
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const hexSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return hexSig === expectedSig
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK — validação de token UAZAPI
// ═══════════════════════════════════════════════════════════════════════════════

export function validateUazapiToken(request: NextRequest): boolean {
  const expected = process.env.UAZAPI_WEBHOOK_SECRET
  if (!expected) return true // backward-compatible: sem secret = permitir
  const provided =
    request.headers.get('x-webhook-token') ||
    request.nextUrl.searchParams.get('token')
  return provided === expected
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — sanitização para logs e respostas de erro
// ═══════════════════════════════════════════════════════════════════════════════

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***'
  return `***${phone.slice(-4)}`
}

export function maskEmail(email: string): string {
  if (!email) return '***'
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 2)}***@${domain}`
}

export function safeErrorResponse(error: unknown, fallbackMessage = 'Erro interno') {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  // Log detalhado no server, resposta genérica ao client
  console.error('[API]', error instanceof Error ? error.message : error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
