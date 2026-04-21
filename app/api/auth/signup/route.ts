// app/api/auth/signup/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Server-side signup — cria user via Admin API, gera link de confirmação,
// envia e-mail via Resend no idioma do usuário (bypass do e-mail automático do Supabase)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api-auth'
import { sendConfirmationEmail, normalizeLang } from '@/lib/emails/auth-emails'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, language } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    const lang = normalizeLang(language)

    // 1. Criar usuário via Admin API (sem envio automático de e-mail)
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: name || '',
        language: lang,
      },
    })

    if (createError || !created?.user) {
      // Se o e-mail já existe, a mensagem tem "already been registered" ou similar
      const msg = createError?.message || 'Erro ao criar conta'
      const status = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered') ? 409 : 500
      return NextResponse.json({ error: msg }, { status })
    }

    // 1.5. Garantir row em public.users (caso o trigger on_auth_user_created
    // não exista ou não tenha rodado). Upsert para não conflitar se existir.
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: created.user.id,
        email,
        full_name: name || '',
        language: lang,
      }, { onConflict: 'id' })

    if (profileError) {
      console.warn('[signup] Falha ao criar/atualizar profile em public.users:', profileError)
      // Não aborta — a rota de onboarding tem safety net que recria se faltar
    }

    // 2. Gerar link de confirmação de signup
    // Redireciona pra /auth/callback que processa o token antes de mandar pro /onboarding,
    // evitando race-condition em que a página destino vê !user e manda pro /login.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oryen-systems.vercel.app'
    const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent('/onboarding')}`

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      // Rollback: deletar user criado para permitir nova tentativa
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {})
      return NextResponse.json(
        { error: linkError?.message || 'Erro ao gerar link de confirmação' },
        { status: 500 }
      )
    }

    const confirmationUrl = linkData.properties.action_link

    // 3. Enviar e-mail via Resend
    try {
      await sendConfirmationEmail({
        to: email,
        name: name || '',
        confirmationUrl,
        language: lang,
      })
    } catch (mailError: any) {
      console.error('[signup] Falha ao enviar e-mail de confirmação:', mailError)
      // Não fazer rollback — o user foi criado, mas não recebeu o e-mail.
      // Pode ser reenviado com "resend confirmation" no futuro.
      return NextResponse.json(
        {
          error: 'Conta criada, mas não foi possível enviar o e-mail de confirmação. Tente novamente em instantes.',
          userId: created.user.id,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: created.user.id,
    })

  } catch (error: any) {
    console.error('[signup] Erro geral:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
