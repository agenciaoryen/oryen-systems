import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email, orgId } = await req.json()

    // Validação básica
    if (!email || !orgId) {
      return NextResponse.json({ error: 'Email e Org ID são obrigatórios' }, { status: 400 })
    }

    // Verifica se a chave secreta existe
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local')
      return NextResponse.json({ error: 'Erro de configuração do servidor.' }, { status: 500 })
    }

    // Cria cliente ADMIN
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log(`[API] Convidando ${email} para Org ${orgId}...`)

    // 1. DISPARAR O E-MAIL (AUTH)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/accept-invite` }
    )

    if (authError) {
      if (authError.message.includes('already been registered') || authError.status === 422) {
        console.log('[API] Usuário já existe no Auth. Prosseguindo para vínculo...')
      } else {
        console.error('[API] Erro Auth:', authError)
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }

    // 2. RECUPERAR O ID DO USUÁRIO
    let userId = authData?.user?.id

    if (!userId) {
      const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = listUsers.users.find(u => u.email === email)
      userId = existingUser?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Falha crítica: ID do usuário não encontrado.' }, { status: 500 })
    }

    console.log(`[API] ID do Usuário identificado: ${userId}`)

    // 3. VINCULAR NA TABELA PÚBLICA (USERS)
    const { data: existingPublicUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    let dbError

    if (existingPublicUser) {
      // USUÁRIO JÁ EXISTE: Atualizamos org e status
      console.log('[API] Atualizando usuário existente...')
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          org_id: orgId,
          status: 'active',
          role: 'vendedor'
        })
        .eq('id', userId)
      dbError = error
    } else {
      // USUÁRIO NOVO: Inserimos do zero
      console.log('[API] Criando novo registro na tabela users...')
      const { error } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          org_id: orgId,
          role: 'vendedor',
          status: 'active',
          // --- CORREÇÃO AQUI ---
          // Antes estava 'name', agora usamos 'full_name' que é o que existe no seu banco
          full_name: email.split('@')[0] 
        })
      dbError = error
    }

    if (dbError) {
      console.error('[API] Erro no Banco:', dbError)
      return NextResponse.json({ 
        error: `Erro ao vincular usuário à organização no banco: ${dbError.message}` 
      }, { status: 500 })
    }

    console.log('[API] Sucesso total.')
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[API] Erro Inesperado:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}