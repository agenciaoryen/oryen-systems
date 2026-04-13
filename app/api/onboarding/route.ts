// app/api/onboarding/route.ts
// POST: Cria org + vincula user + pipeline padrão (self-service onboarding)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pipeline stages padrão para novas orgs
// Pipeline padrão para imobiliárias/corretores
const DEFAULT_PIPELINE_STAGES = [
  { name: 'new', label: 'Novo Lead', color: '#6B7280', position: 0, is_active: true, is_won: false, is_lost: false },
  { name: 'contacted', label: 'Em Atendimento', color: '#3B82F6', position: 1, is_active: true, is_won: false, is_lost: false },
  { name: 'visit_scheduled', label: 'Visita Agendada', color: '#8B5CF6', position: 2, is_active: true, is_won: false, is_lost: false },
  { name: 'visit_done', label: 'Visita Realizada', color: '#F59E0B', position: 3, is_active: true, is_won: false, is_lost: false },
  { name: 'proposal', label: 'Proposta Enviada', color: '#F97316', position: 4, is_active: true, is_won: false, is_lost: false },
  { name: 'negotiation', label: 'Em Negociação', color: '#EC4899', position: 5, is_active: true, is_won: false, is_lost: false },
  { name: 'won', label: 'Fechado', color: '#10B981', position: 6, is_active: true, is_won: true, is_lost: false },
  { name: 'lost', label: 'Perdido', color: '#EF4444', position: 7, is_active: true, is_won: false, is_lost: true },
]

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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('id', user_id)
      .single()

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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

    // 2. Vincular user à org como owner + salvar preferências
    const { error: userError } = await supabase
      .from('users')
      .update({
        org_id: org.id,
        role: 'owner',
        language: language || 'pt',
        currency: currency || 'BRL',
        timezone: timezone || 'America/Sao_Paulo',
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (userError) {
      console.error('[Onboarding] Erro ao atualizar user:', userError)
      // Rollback: deletar org criada
      await supabase.from('orgs').delete().eq('id', org.id)
      return NextResponse.json({ error: 'Failed to link user to organization' }, { status: 500 })
    }

    // 3. Criar pipeline stages padrão
    const stages = DEFAULT_PIPELINE_STAGES.map(s => ({
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

    return NextResponse.json({
      success: true,
      org_id: org.id,
    })
  } catch (error: any) {
    console.error('[Onboarding] Erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
