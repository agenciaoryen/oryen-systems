// GET  /api/email/campaigns — lista campanhas do agente bdr_email da org
// POST /api/email/campaigns — cria campanha (body: { name, config })

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  // Busca agent do tipo bdr_email da org
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id')
    .eq('org_id', auth.orgId)
    .eq('solution_slug', 'bdr_email')
    .maybeSingle()

  if (!agent) return NextResponse.json({ campaigns: [] })

  const { data, error } = await supabaseAdmin
    .from('agent_campaigns')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const body = await request.json()
  const { name, config } = body

  if (!name || !config?.pitch_hook || !config?.sender_name || !config?.call_to_action) {
    return NextResponse.json({ error: 'Campos obrigatórios: name, config.pitch_hook, config.sender_name, config.call_to_action' }, { status: 400 })
  }

  // Garante que existe um agent bdr_email pra org — se não, cria automaticamente
  let { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id')
    .eq('org_id', auth.orgId)
    .eq('solution_slug', 'bdr_email')
    .maybeSingle()

  if (!agent) {
    const { data: newAgent, error: agErr } = await supabaseAdmin
      .from('agents')
      .insert({
        org_id: auth.orgId,
        solution_slug: 'bdr_email',
        status: 'active',
        limits: { emails_per_month: 3000, campaigns_max: 10 },
        activated_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (agErr || !newAgent) return NextResponse.json({ error: 'Falha ao criar agent' }, { status: 500 })
    agent = newAgent
  }

  // Cria a campanha
  const { data: campaign, error } = await supabaseAdmin
    .from('agent_campaigns')
    .insert({
      agent_id: agent.id,
      org_id: auth.orgId,
      user_id: auth.userId,
      name,
      config: {
        pitch_hook: config.pitch_hook,
        sender_name: config.sender_name,
        call_to_action: config.call_to_action,
        tone: config.tone || 'direto',
        emails_per_hour: Number(config.emails_per_hour) || 30,
      },
      status: 'draft',
      schedule_frequency: 'manual',
      schedule_time: '09:00',
      schedule_days: [],
      schedule_timezone: 'America/Sao_Paulo',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign })
}
