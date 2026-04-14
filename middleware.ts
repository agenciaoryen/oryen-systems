// middleware.ts
// ═══════════════════════════════════════════════════════════════════════════════
// 1. Detecta domínios customizados → reescreve para /sites/[slug]
// 2. Refresh de auth cookies (mantém sessão viva para API routes)
// 3. Proteção de API routes — bloqueia requests não autenticados
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// Domínios da plataforma (não são custom domains)
const PLATFORM_HOSTS = [
  'localhost',
  'oryen.ai',
  'www.oryen.ai',
  'oryen-systems.vercel.app',
]

// Paths que nunca devem ser reescritos (dashboard, API, assets, etc.)
const SKIP_PREFIXES = [
  '/api/',
  '/dashboard',
  '/login',
  '/register',
  '/onboarding',
  '/reset-password',
  '/privacy',
  '/terms',
  '/sites/',
  '/_next/',
  '/favicon',
]

// API routes que NÃO precisam de auth de usuário (webhooks, crons, públicas)
const AUTH_EXEMPT_API = [
  '/api/auth/',                    // emails de registro
  '/api/onboarding',               // criação de org pós-registro
  '/api/stripe/webhook',           // webhook Stripe (tem assinatura própria)
  '/api/sdr/webhook',              // webhook UAZAPI
  '/api/sdr/process',              // processamento interno
  '/api/sdr/follow-up',            // cron job
  '/api/whatsapp/cloud/webhook',   // webhook Meta
  '/api/distribution/cron',        // cron job
  '/api/agents/scheduler',         // cron job
  '/api/agents/run-callback',      // callback N8N
  '/api/agents/run-campaign',      // chamado pelo scheduler
  '/api/site-leads',               // formulário público do site
  '/api/properties/track',         // tracking público de visualização
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CUSTOM DOMAINS — se não é domínio da plataforma, reescrever para /sites
  // ═══════════════════════════════════════════════════════════════════════════
  const isPlatformHost = PLATFORM_HOSTS.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`)
  )

  if (!isPlatformHost) {
    if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.next()
    }

    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: site } = await supabaseAdmin
        .from('site_settings')
        .select('slug, is_published')
        .eq('custom_domain', hostname)
        .single()

      if (!site || !site.is_published) {
        return NextResponse.redirect(new URL('https://oryen.ai'))
      }

      const url = request.nextUrl.clone()
      url.pathname = `/sites/${site.slug}${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    } catch (err) {
      console.error('[Middleware] Custom domain error:', err)
      return NextResponse.next()
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. AUTH COOKIE REFRESH — para /dashboard e /api routes
  //    Mantém o access token fresco (renova automaticamente se expirado)
  // ═══════════════════════════════════════════════════════════════════════════
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Atualizar cookies na request (para downstream handlers como API routes)
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            // Criar nova response com request atualizada
            response = NextResponse.next({ request })
            // Setar cookies na response (para o browser)
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh do token — isso atualiza os cookies se o access_token expirou
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // ═════════════════════════════════════════════════════════════════════════
    // 3. PROTEÇÃO DE API — bloquear requests não autenticados
    // ═════════════════════════════════════════════════════════════════════════
    if (pathname.startsWith('/api/')) {
      const isExempt = AUTH_EXEMPT_API.some((prefix) =>
        pathname.startsWith(prefix)
      )

      if (!isExempt && !user) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        )
      }
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Roda em todas as rotas exceto arquivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
}
