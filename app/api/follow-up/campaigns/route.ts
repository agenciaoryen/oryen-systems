// app/api/follow-up/campaigns/route.ts
// API para campanhas de follow-up personalizáveis
// POST: preview (conta leads) ou dispatch (enfileira leads)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkMonthlyPlanLimit } from '@/lib/planLimits'
import { getPlanConfig } from '@/lib/planConfig'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CampaignFilters {
  stages?: string[]          // estágios do pipeline
  sources?: string[]         // fontes (site, whatsapp_inbound, csv_import, etc.)
  lastContactDaysMin?: number // dias desde último contato (mínimo)
  lastContactDaysMax?: number // dias desde último contato (máximo)
  hasConversation?: boolean  // só leads que tiveram conversa com SDR
}

interface CampaignConfig {
  maxAttempts: number        // 1-5 tentativas
  cadenceHours: number[]     // cadência personalizada
  instanceName: string       // instância WhatsApp
  agentId?: string
  campaignId?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/follow-up/campaigns
// action: "preview" → conta leads que seriam impactados + mostra quota
// action: "dispatch" → enfileira os leads na follow_up_queue
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, org_id, filters, config } = body as {
      action: 'preview' | 'dispatch'
      org_id: string
      filters: CampaignFilters
      config?: CampaignConfig
    }

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    if (action === 'preview') {
      return handlePreview(org_id, filters)
    }

    if (action === 'dispatch') {
      if (!config) {
        return NextResponse.json({ error: 'config required for dispatch' }, { status: 400 })
      }
      return handleDispatch(org_id, filters, config)
    }

    return NextResponse.json({ error: 'Invalid action. Use "preview" or "dispatch"' }, { status: 400 })
  } catch (err: any) {
    console.error('[FollowUp:Campaign] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW — Conta leads + mostra quota de mensagens
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePreview(orgId: string, filters: CampaignFilters) {
  // Buscar leads que atendem os filtros
  const leads = await queryFilteredLeads(orgId, filters)

  // Buscar quota de mensagens do plano
  const msgLimit = await checkMonthlyPlanLimit(
    orgId, 'maxMonthlyMessages', 'sdr_messages', 'created_at',
    { role: 'assistant' }
  )

  // Buscar plano para nome
  const { data: org } = await supabase
    .from('orgs')
    .select('plan')
    .eq('id', orgId)
    .single()

  const planConfig = getPlanConfig(org?.plan || 'starter')

  return NextResponse.json({
    leadCount: leads.length,
    leads: leads.slice(0, 20).map(l => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      stage: l.stage,
      source: l.source,
      lastContact: l.updated_at,
    })),
    quota: {
      used: msgLimit.current,
      limit: msgLimit.limit,
      remaining: msgLimit.limit === -1 ? -1 : Math.max(0, msgLimit.limit - msgLimit.current),
      plan: planConfig.displayName,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH — Enfileira leads para follow-up
// ═══════════════════════════════════════════════════════════════════════════════

async function handleDispatch(orgId: string, filters: CampaignFilters, config: CampaignConfig) {
  const leads = await queryFilteredLeads(orgId, filters)

  if (leads.length === 0) {
    return NextResponse.json({ error: 'no_leads_match', dispatched: 0 }, { status: 400 })
  }

  // Verificar quota de mensagens (leads × maxAttempts)
  const totalMessages = leads.length * config.maxAttempts
  const msgLimit = await checkMonthlyPlanLimit(
    orgId, 'maxMonthlyMessages', 'sdr_messages', 'created_at',
    { role: 'assistant' }
  )

  if (msgLimit.limit !== -1 && (msgLimit.current + totalMessages) > msgLimit.limit) {
    const remaining = Math.max(0, msgLimit.limit - msgLimit.current)
    return NextResponse.json({
      error: 'quota_exceeded',
      detail: `Campaign needs up to ${totalMessages} messages but only ${remaining} remaining`,
      remaining,
      needed: totalMessages,
    }, { status: 403 })
  }

  // Filtrar leads que já têm follow-up ativo
  const { data: activeFollowUps } = await supabase
    .from('follow_up_queue')
    .select('lead_id')
    .eq('org_id', orgId)
    .in('status', ['pending', 'active'])

  const activeLeadIds = new Set((activeFollowUps || []).map(f => f.lead_id))
  const leadsToEnqueue = leads.filter(l => !activeLeadIds.has(l.id))

  if (leadsToEnqueue.length === 0) {
    return NextResponse.json({
      error: 'all_leads_already_in_queue',
      dispatched: 0,
      skipped: leads.length,
    }, { status: 400 })
  }

  // Enfileirar leads
  const now = new Date()
  const cadence = config.cadenceHours.length > 0 ? config.cadenceHours : [4, 24, 72, 120, 168]
  const firstDelay = cadence[0] || 1 // horas até a primeira tentativa

  const rows = leadsToEnqueue.map(lead => ({
    org_id: orgId,
    lead_id: lead.id,
    attempt_number: 0,
    max_attempts: config.maxAttempts,
    next_attempt_at: new Date(now.getTime() + firstDelay * 60 * 60 * 1000).toISOString(),
    last_lead_message_at: lead.updated_at,
    cadence_hours: cadence,
    status: 'pending',
    last_conversation_summary: `Campanha manual de follow-up. Lead no estágio "${lead.stage || 'não definido'}", fonte: ${lead.source || 'desconhecida'}.`,
    lead_stage: lead.stage || null,
    instance_name: config.instanceName,
    agent_id: config.agentId || null,
    campaign_id: config.campaignId || null,
  }))

  // Insert em batch (Supabase suporta batch insert)
  const { error } = await supabase
    .from('follow_up_queue')
    .insert(rows)

  if (error) {
    console.error('[FollowUp:Campaign] Insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[FollowUp:Campaign] Dispatched ${rows.length} leads for org ${orgId}`)

  return NextResponse.json({
    dispatched: rows.length,
    skipped: leads.length - leadsToEnqueue.length,
    maxAttempts: config.maxAttempts,
    estimatedMessages: rows.length * config.maxAttempts,
    firstAttemptIn: `${firstDelay}h`,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY — Busca leads com filtros
// ═══════════════════════════════════════════════════════════════════════════════

async function queryFilteredLeads(orgId: string, filters: CampaignFilters) {
  let query = supabase
    .from('leads')
    .select('id, name, phone, stage, source, updated_at, conversa_finalizada')
    .eq('org_id', orgId)

  // Filtrar por estágios
  if (filters.stages && filters.stages.length > 0) {
    query = query.in('stage', filters.stages)
  }

  // Filtrar por fontes
  if (filters.sources && filters.sources.length > 0) {
    query = query.in('source', filters.sources)
  }

  // Filtrar por último contato (dias atrás)
  if (filters.lastContactDaysMin != null) {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() - filters.lastContactDaysMin)
    query = query.lte('updated_at', maxDate.toISOString())
  }

  if (filters.lastContactDaysMax != null) {
    const minDate = new Date()
    minDate.setDate(minDate.getDate() - filters.lastContactDaysMax)
    query = query.gte('updated_at', minDate.toISOString())
  }

  // Só leads que tiveram conversa com SDR
  if (filters.hasConversation) {
    query = query.eq('conversa_finalizada', true)
  }

  // Excluir leads perdidos/ganhos (não faz sentido follow-up)
  query = query
    .not('stage', 'in', '("won","lost","venda_fechada")')
    .order('updated_at', { ascending: true })
    .limit(500)

  const { data, error } = await query

  if (error) {
    console.error('[FollowUp:Campaign] Query error:', error.message)
    return []
  }

  return data || []
}
