// app/api/onboarding/route.ts
// POST: Cria org + vincula user + pipeline padrão (self-service onboarding)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pipeline stages padrão para novas orgs — labels por idioma
const STAGE_LABELS = {
  pt: { new: 'Novo Lead', contacted: 'Em Atendimento', visit_scheduled: 'Visita Agendada', visit_done: 'Visita Realizada', proposal: 'Proposta Enviada', negotiation: 'Em Negociação', won: 'Fechado', lost: 'Perdido' },
  en: { new: 'New Lead', contacted: 'In Contact', visit_scheduled: 'Visit Scheduled', visit_done: 'Visit Done', proposal: 'Proposal Sent', negotiation: 'In Negotiation', won: 'Closed Won', lost: 'Lost' },
  es: { new: 'Nuevo Lead', contacted: 'En Contacto', visit_scheduled: 'Visita Programada', visit_done: 'Visita Realizada', proposal: 'Propuesta Enviada', negotiation: 'En Negociación', won: 'Cerrado', lost: 'Perdido' },
} as const

function buildDefaultStages(lang: 'pt' | 'en' | 'es') {
  const L = STAGE_LABELS[lang] || STAGE_LABELS.pt
  return [
    { name: 'new',             label: L.new,             color: '#6B7280', position: 0, is_active: true, is_won: false, is_lost: false },
    { name: 'contacted',       label: L.contacted,       color: '#3B82F6', position: 1, is_active: true, is_won: false, is_lost: false },
    { name: 'visit_scheduled', label: L.visit_scheduled, color: '#8B5CF6', position: 2, is_active: true, is_won: false, is_lost: false },
    { name: 'visit_done',      label: L.visit_done,      color: '#F59E0B', position: 3, is_active: true, is_won: false, is_lost: false },
    { name: 'proposal',        label: L.proposal,        color: '#F97316', position: 4, is_active: true, is_won: false, is_lost: false },
    { name: 'negotiation',     label: L.negotiation,     color: '#EC4899', position: 5, is_active: true, is_won: false, is_lost: false },
    { name: 'won',             label: L.won,             color: '#10B981', position: 6, is_active: true, is_won: true,  is_lost: false },
    { name: 'lost',            label: L.lost,            color: '#EF4444', position: 7, is_active: true, is_won: false, is_lost: true },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, company_name, niche, language, currency, timezone } = body

    if (!user_id || !company_name) {
      return NextResponse.json(
        { error: 'user_id and company_name are required' },
        { status: 400 }
      )
    }

    // Verificar que o user existe e ainda não tem org
    let { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, org_id, email, full_name')
      .eq('id', user_id)
      .maybeSingle()

    if (selectError) {
      console.error('[Onboarding] Erro ao buscar user:', selectError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Safety net: row pode não existir em public.users se o trigger não rodou.
    // Cria a partir dos dados do auth.users.
    if (!existingUser) {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user_id)
      if (authError || !authData?.user) {
        console.error('[Onboarding] Auth user not found:', authError)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const meta = authData.user.user_metadata || {}
      const { data: created, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user_id,
          email: authData.user.email,
          full_name: meta.full_name || '',
          language: meta.language || 'pt',
        })
        .select('id, org_id, email, full_name')
        .single()

      if (insertError || !created) {
        console.error('[Onboarding] Falha ao criar user row:', insertError)
        return NextResponse.json({ error: 'Failed to initialize user profile' }, { status: 500 })
      }
      existingUser = created
    }

    if (existingUser.org_id) {
      return NextResponse.json({ error: 'User already has an organization' }, { status: 409 })
    }

    // 1. Criar org
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: company_name,
        niche: niche || null,
        plan: 'starter',
        plan_status: 'trial',
      })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('[Onboarding] Erro ao criar org:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // 2. Vincular user à org como admin + salvar preferências
    const { error: userError } = await supabase
      .from('users')
      .update({
        org_id: org.id,
        role: 'admin',
        language: language || 'pt',
        currency: currency || 'BRL',
        timezone: timezone || 'America/Sao_Paulo',
        status: 'active',
      })
      .eq('id', user_id)

    if (userError) {
      console.error('[Onboarding] Erro ao atualizar user:', userError)
      // Rollback: deletar org criada
      await supabase.from('orgs').delete().eq('id', org.id)
      return NextResponse.json({ error: 'Failed to link user to organization' }, { status: 500 })
    }

    // 3. Criar pipeline stages padrão (no idioma do usuário)
    const userLang = (language === 'en' || language === 'es' ? language : 'pt') as 'pt' | 'en' | 'es'
    const stages = buildDefaultStages(userLang).map(s => ({
      ...s,
      org_id: org.id,
    }))

    const { error: stagesError } = await supabase
      .from('pipeline_stages')
      .insert(stages)

    if (stagesError) {
      console.error('[Onboarding] Erro ao criar pipeline stages:', stagesError)
      // Não faz rollback — org e user já estão ok, stages pode ser criado depois
    }

    // 4. Criar roles de sistema da org (admin + vendedor)
    const { error: rolesError } = await supabase
      .from('org_roles')
      .insert([
        {
          org_id: org.id,
          name: 'Administrador',
          slug: 'admin',
          is_system: true,
          is_admin: true,
          permissions: {},
        },
        {
          org_id: org.id,
          name: 'Vendedor',
          slug: 'vendedor',
          is_system: true,
          is_admin: false,
          permissions: {
            crm: true,
            messages: true,
            calendar: true,
            distribution: false,
            goals: true,
            agents: false,
            follow_up: false,
            analytics: false,
            portfolio: true,
            property_stats: false,
            site: false,
            financial: false,
            subscription: false,
            whatsapp: false,
            documents: true,
            reports: true,
            financing: false,
          },
        },
      ])

    if (rolesError) {
      console.error('[Onboarding] Erro ao criar org_roles:', rolesError)
      // Não faz rollback — roles do sistema podem ser recriados depois via seeder
    }

    // 5. Enviar welcome email (fire-and-forget, não bloqueia a resposta)
    if (existingUser.email) {
      const origin = request.nextUrl.origin
      fetch(`${origin}/api/auth/welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: existingUser.email,
          name: existingUser.full_name || '',
          orgName: company_name,
        }),
      }).catch((err) => console.warn('[Onboarding] Welcome email failed:', err))
    }

    return NextResponse.json({
      success: true,
      org_id: org.id,
    })
  } catch (error: any) {
    console.error('[Onboarding] Erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
