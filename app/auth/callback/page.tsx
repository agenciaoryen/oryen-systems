// app/auth/callback/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Callback unificado para confirmação de e-mail e reset de senha.
//
// Supabase redireciona pra cá com `?code=...` (PKCE) ou `#access_token=...`
// (implicit). Aqui processamos o token ANTES de redirecionar pra página final,
// evitando a race-condition em que a página destino vê `!user` e manda pro login.
// ═══════════════════════════════════════════════════════════════════════════════

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const run = async () => {
      const next = searchParams.get('next') || '/onboarding'
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error') || searchParams.get('error_description')

      // Supabase pode mandar erro na query (ex: link expirado)
      if (errorParam) {
        setErrorMsg(errorParam)
        setTimeout(() => router.replace('/login?error=' + encodeURIComponent(errorParam)), 1500)
        return
      }

      try {
        // Caminho A: PKCE — trocar code por sessão
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('[auth/callback] exchangeCodeForSession falhou:', error.message)
            setErrorMsg(error.message)
            setTimeout(() => router.replace('/login'), 1500)
            return
          }
          router.replace(next)
          return
        }

        // Caminho B: implicit flow — tokens no hash. Dar um tempo pro client parsear.
        await new Promise(r => setTimeout(r, 150))
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          router.replace(next)
        } else {
          // Sem sessão e sem código → provavelmente o link foi aberto manualmente.
          router.replace('/login')
        }
      } catch (err: any) {
        console.error('[auth/callback] Erro:', err)
        setErrorMsg(err?.message || 'Erro ao processar autenticação')
        setTimeout(() => router.replace('/login'), 1500)
      }
    }
    run()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen w-full items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] opacity-[0.08]"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-primary), transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <span
          className="text-2xl font-extrabold tracking-widest"
          style={{
            fontFamily: 'var(--font-orbitron), sans-serif',
            background: 'linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >ORYEN</span>

        {errorMsg ? (
          <p className="text-sm px-4 py-3 rounded-xl max-w-sm text-center"
            style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error-subtle-fg)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            {errorMsg}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Autenticando…</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
