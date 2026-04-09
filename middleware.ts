// middleware.ts
// 1. Protege rotas autenticadas (/dashboard, /onboarding) → redireciona para /login
// 2. Detecta domínios customizados e reescreve internamente para /sites/[slug]

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

// Paths que requerem autenticação
const AUTH_REQUIRED_PREFIXES = [
  '/dashboard',
  '/onboarding',
]

// Paths públicos (nunca protegidos, nunca reescritos)
const PUBLIC_PREFIXES = [
  '/api/',
  '/login',
  '/register',
  '/reset-password',
  '/privacy',
  '/terms',
  '/sites/',
  '/_next/',
  '/favicon',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]

  // ─── 1. Proteção de autenticação para rotas protegidas ───
  if (AUTH_REQUIRED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    const response = NextResponse.next()

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  // ─── 2. Paths públicos — não fazer nada ───
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // ─── 3. Custom domain — se não é plataforma, reescrever ───
  if (PLATFORM_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
    return NextResponse.next()
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: site } = await supabase
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

export const config = {
  matcher: [
    // Roda em todas as rotas exceto arquivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
}
