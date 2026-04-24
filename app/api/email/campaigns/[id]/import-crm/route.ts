// POST /api/email/campaigns/[id]/import-crm
// Importa leads do CRM pra uma campanha de email, aplicando filtros.
//
// Body (todos opcionais):
//   stages: string[]                  // leads em quais etapas
//   assigned_to: string | null        // user_id do responsável (ou null = sem responsável)
//   score_labels: string[]            // ['cold', 'warm', 'hot', 'burning']
//   nicho: string                     // pra ai_agency orgs
//   updated_before_days: number       // leads sem atividade há N dias (ex: 3 = inativos >= 3 dias)
//   created_before_days: number       // leads criados há N dias
//   exclude_already_emailed: boolean  // pula leads que já estão em qualquer campanha da org
//   preview: boolean                  // true = só conta, não importa
//
// Retorna: { matched, imported, skipped, reason_counts }

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'

interface Filters {
  stages?: string[]
  assigned_to?: string | null
  score_labels?: string[]
  nicho?: string
  updated_before_days?: number
  created_before_days?: number
  exclude_already_emailed?: boolean
  preview?: boolean
}

const PREVIEW_HARD_LIMIT = 2000 // proteção — não deixa importar mais que isso de uma vez

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const { id: campaignId } = await params

  // Verifica campanha
  const { data: campaign } = await supabaseAdmin
    .from('agent_campaigns')
    .select('id, org_id')
    .eq('id', campaignId)
    .eq('org_id', auth.orgId)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const filters: Filters = await request.json().catch(() => ({}))
  const isPreview = filters.preview === true

  // ═══ Monta query ═══
  let query = supabaseAdmin
    .from('leads')
    .select('id, email, name, nome_empresa, tipo_contato, city, phone, nicho', { count: 'exact' })
    .eq('org_id', auth.orgId)
    .not('email', 'is', null)
    .neq('email', '')
    .limit(PREVIEW_HARD_LIMIT)

  if (filters.stages && filters.stages.length > 0) {
    query = query.in('stage', filters.stages)
  }
  if (filters.assigned_to !== undefined) {
    if (filters.assigned_to === null) query = query.is('assigned_to', null)
    else query = query.eq('assigned_to', filters.assigned_to)
  }
  if (filters.score_labels && filters.score_labels.length > 0) {
    query = query.in('score_label', filters.score_labels)
  }
  if (filters.nicho) {
    query = query.eq('nicho', filters.nicho)
  }
  if (typeof filters.updated_before_days === 'number' && filters.updated_before_days > 0) {
    const d = new Date(Date.now() - filters.updated_before_days * 24 * 60 * 60 * 1000)
    query = query.lt('updated_at', d.toISOString())
  }
  if (typeof filters.created_before_days === 'number' && filters.created_before_days > 0) {
    const d = new Date(Date.now() - filters.created_before_days * 24 * 60 * 60 * 1000)
    query = query.lt('created_at', d.toISOString())
  }

  const { data: leads, error: leadErr, count: totalMatched } = await query
  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 })

  if (!leads || leads.length === 0) {
    return NextResponse.json({ matched: 0, imported: 0, skipped: 0, reason_counts: {} })
  }

  // ═══ Filtro "exclude_already_emailed" — pula leads que já estão em QUALQUER campanha de email da org
  let excludeLeadIds = new Set<string>()
  if (filters.exclude_already_emailed) {
    const { data: alreadyContacts } = await supabaseAdmin
      .from('email_contacts')
      .select('lead_id')
      .eq('org_id', auth.orgId)
      .not('lead_id', 'is', null)
    excludeLeadIds = new Set((alreadyContacts || []).map((c: any) => c.lead_id))
  }

  // ═══ Filtro: remove duplicados dentro desta campanha (email já cadastrado)
  const { data: existingInCampaign } = await supabaseAdmin
    .from('email_contacts')
    .select('lead_id, email')
    .eq('campaign_id', campaignId)
  const existingLeadIds = new Set((existingInCampaign || []).map((c: any) => c.lead_id).filter(Boolean))
  const existingEmails = new Set((existingInCampaign || []).map((c: any) => String(c.email).toLowerCase()))

  const reasonCounts = {
    already_in_other_campaign: 0,
    already_in_this_campaign: 0,
    invalid_email: 0,
  }

  const rowsToInsert: any[] = []
  for (const l of leads) {
    const email = String(l.email || '').trim().toLowerCase()
    if (!email || !/.+@.+\..+/.test(email)) {
      reasonCounts.invalid_email++
      continue
    }
    if (excludeLeadIds.has(l.id)) {
      reasonCounts.already_in_other_campaign++
      continue
    }
    if (existingLeadIds.has(l.id) || existingEmails.has(email)) {
      reasonCounts.already_in_this_campaign++
      continue
    }
    rowsToInsert.push({
      org_id: auth.orgId,
      campaign_id: campaignId,
      lead_id: l.id,
      email,
      first_name: l.name?.split(' ')[0] || null,
      company: l.nome_empresa || null,
      role: l.tipo_contato || null,
      city: l.city || null,
      phone: l.phone || null,
      custom_fields: l.nicho ? { nicho: l.nicho } : {},
      status: 'pending',
    })
  }

  // Se é preview, não insere — só retorna a contagem
  if (isPreview) {
    return NextResponse.json({
      matched: leads.length,
      total_matched_in_db: totalMatched || leads.length,
      would_import: rowsToInsert.length,
      would_skip: leads.length - rowsToInsert.length,
      reason_counts: reasonCounts,
      preview: true,
    })
  }

  if (rowsToInsert.length === 0) {
    return NextResponse.json({
      matched: leads.length,
      imported: 0,
      skipped: leads.length,
      reason_counts: reasonCounts,
    })
  }

  // Insert em batch
  const { error: insErr } = await supabaseAdmin
    .from('email_contacts')
    .upsert(rowsToInsert, {
      onConflict: 'campaign_id,email',
      ignoreDuplicates: true,
    })

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({
    matched: leads.length,
    imported: rowsToInsert.length,
    skipped: leads.length - rowsToInsert.length,
    reason_counts: reasonCounts,
  })
}
