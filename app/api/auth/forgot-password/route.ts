// app/api/auth/forgot-password/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Server-side password reset — gera link de recovery via Admin API,
// envia e-mail via Resend no idioma do usuário (busca em users.language)
//
// Retorna sempre success=true para não revelar se o e-mail existe (anti-enumeração).
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api-auth'
import { sendPasswordResetEmail, normalizeLang, type EmailLang } from '@/lib/emails/auth-emails'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, language: fallbackLang } = body

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
    }

    const emailLower = String(email).toLowerCase()
    let userLang: EmailLang = normalizeLang(fallbackLang)

    // Buscar idioma preferido na tabela users (se existir o registro)
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('language')
      .ilike('email', emailLower)
      .maybeSingle()

    if (profile?.language) {
      userLang = normalizeLang(profile.language)
    }

    // Gerar link de recovery — se o e-mail não existir, Supabase retorna erro;
    // mas respondemos success=true mesmo assim (anti-enumeração).
    // Redireciona DIRETO pra /reset-password/update — o callback PKCE não funciona
    // pra recovery porque o code_verifier não existe no browser (link gerado server-side).
    // A página destino lida com a sessão nativamente via onAuthStateChange(PASSWORD_RECOVERY).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oryen.agency'
    const redirectTo = `${appUrl}/reset-password/update`

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.warn('[forgot-password] generateLink falhou (esperado se e-mail não existe):', linkError?.message)
      return NextResponse.json({ success: true })
    }

    try {
      await sendPasswordResetEmail({
        to: email,
        recoveryUrl: linkData.properties.action_link,
        language: userLang,
      })
    } catch (mailError: any) {
      console.error('[forgot-password] Falha ao enviar e-mail:', mailError)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[forgot-password] Erro geral:', error)
    return NextResponse.json({ success: true })
  }
}
