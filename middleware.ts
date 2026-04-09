// middleware.ts
// Detecta domínios customizados e reescreve internamente para /sites/[slug]

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  '/dashboard/',
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0] // remove port

  // 1. Se é um domínio da plataforma, não faz nada
  if (PLATFORM_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
    return NextResponse.next()
  }

  // 2. Se é um path que não deve ser reescrito, não faz nada
  if (SKIP_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // 3. É um domínio customizado — buscar o slug no banco
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
      // Domínio não encontrado ou site não publicado — redireciona para plataforma
      return NextResponse.redirect(new URL('https://oryen.ai'))
    }

    // 4. Reescrever para /sites/[slug] + path original
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
