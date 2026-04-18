// app/api/site-leads/route.ts
// POST: submissão pública do formulário de contato | GET: listagem no dashboard

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkPlanLimit, checkActiveLeadsLimit } from '@/lib/planLimits'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/site-leads?org_id=X&page=1&limit=20&synced=false
 * Listagem de leads do site (dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const orgId = searchParams.get('org_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const synced = searchParams.get('synced')
    const offset = (page - 1) * limit

    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    let query = supabase
      .from('site_leads')
      .select('*, properties(id, title, slug)', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (synced === 'true') query = query.eq('synced_to_crm', true)
    if (synced === 'false') query = query.eq('synced_to_crm', false)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      leads: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/site-leads
 * Body: { site_slug, name, phone, email?, message?, property_id?, utm_source?, utm_medium?, utm_campaign? }
 * Rota pública — chamada pelo formulário de contato do site
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { site_slug, name, phone } = body

    console.log('[SiteLeads] POST body:', JSON.stringify({ site_slug, name, phone: phone ? '***' : null }))

    if (!site_slug || !name || !phone) {
      console.error('[SiteLeads] Missing fields:', { site_slug: !!site_slug, name: !!name, phone: !!phone })
      return NextResponse.json(
        { error: `Missing required fields: ${!site_slug ? 'site_slug ' : ''}${!name ? 'name ' : ''}${!phone ? 'phone' : ''}`.trim() },
        { status: 400 }
      )
    }

    // Honeypot anti-spam: se o campo oculto "website" vier preenchido, é bot
    if (body.website) {
      // Retornar sucesso falso para não alertar o bot
      return NextResponse.json({ success: true })
    }

    // Buscar org_id pelo slug do site (sem filtro is_published para funcionar em preview)
    const { data: site } = await supabase
      .from('site_settings')
      .select('org_id, site_name')
      .eq('slug', site_slug)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // 1. Salvar na tabela site_leads
    const { data: siteLead, error } = await supabase
      .from('site_leads')
      .insert({
        org_id: site.org_id,
        property_id: body.property_id || null,
        name,
        email: body.email || null,
        phone,
        message: body.message || null,
        source: body.property_id ? 'site_property' : 'site',
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 2. Buscar dados do imóvel para enriquecer o lead
    let propertyData: any = null
    if (body.property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('title, transaction_type, property_type, address_city, address_neighborhood, external_code')
        .eq('id', body.property_id)
        .single()
      propertyData = prop
    }

    // Mapear transaction_type → interesse e tipo_contato
    const interesseMap: Record<string, string> = { sale: 'compra', rent: 'locacao', sale_or_rent: 'ambos' }
    const tipoContatoMap: Record<string, string> = { sale: 'comprador', rent: 'locatario', sale_or_rent: 'comprador' }
    const interesse = propertyData ? interesseMap[propertyData.transaction_type] || null : null
    const tipoContato = propertyData ? tipoContatoMap[propertyData.transaction_type] || null : null

    // 3. Determinar responsável via distribution engine (Lead Roulette v2.2)
    let assignedTo: string | null = null

    // 4. Criar/atualizar lead no CRM (tabela leads)
    let crmLeadId: string | null = null
    try {
      // Verificar se já existe lead com esse telefone na org
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('org_id', site.org_id)
        .eq('phone', phone)
        .single()

      // Verificar limite de leads do plano antes de criar novo
      const leadsLimit = await checkActiveLeadsLimit(site.org_id)

      if (existingLead) {
        crmLeadId = existingLead.id
        // Atualizar dados do lead existente com info do imóvel
        const updateData: any = {}
        if (body.email) updateData.email = body.email
        if (interesse) updateData.interesse = interesse
        if (tipoContato) updateData.tipo_contato = tipoContato
        if (propertyData?.address_city) updateData.city = propertyData.address_city
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString()
          await supabase.from('leads').update(updateData).eq('id', existingLead.id)
        }
      } else if (!leadsLimit.allowed) {
        // Limite atingido — site_lead já foi salvo, mas não sincroniza ao CRM
        console.warn(`[SiteLeads] Lead limit reached for org ${site.org_id}: ${leadsLimit.current}/${leadsLimit.limit}`)
      } else {
        // Buscar primeiro estágio do pipeline da org
        const { data: firstStage } = await supabase
          .from('pipeline_stages')
          .select('name')
          .eq('org_id', site.org_id)
          .order('position', { ascending: true })
          .limit(1)
          .single()

        // Criar novo lead no CRM com dados enriquecidos
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            org_id: site.org_id,
            name,
            phone,
            email: body.email || null,
            source: 'site',
            stage: firstStage?.name || 'new',
            interesse: interesse || null,
            tipo_contato: tipoContato || null,
            city: propertyData?.address_city || null,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        crmLeadId = newLead?.id || null

        // Atribuir lead via distribution engine (Lead Roulette v2.2)
        if (crmLeadId) {
          try {
            const { assignLead } = await import('@/lib/distribution/engine')
            const assignment = await assignLead({
              leadId: crmLeadId,
              orgId: site.org_id,
              source: 'site',
              city: propertyData?.address_city || null,
              propertyType: propertyData?.property_type || null,
              transactionType: propertyData?.transaction_type || null,
            })
            assignedTo = assignment.assignedTo
            console.log(`[SiteLeads] Lead ${crmLeadId} atribuído a ${assignedTo} (${assignment.strategy})`)
          } catch (distErr: any) {
            console.warn(`[SiteLeads] Distribution error (non-fatal): ${distErr.message}`)
          }
        }
      }

      // Atualizar site_lead com referência ao CRM
      if (crmLeadId) {
        await supabase
          .from('site_leads')
          .update({ synced_to_crm: true, lead_id: crmLeadId })
          .eq('id', siteLead.id)
      }
    } catch (e) {
      console.error('[SiteLeads] Erro ao sincronizar com CRM:', e)
    }

    // 4. Criar alerta para todos os membros da org
    try {
      const refCode = propertyData?.external_code ? ` (${propertyData.external_code})` : ''
      const propertyTitle = propertyData?.title
      const alertDescription = propertyTitle
        ? `${name} (${phone}) demonstrou interesse no imóvel "${propertyTitle}"${refCode}. ${body.message || ''}`
        : `${name} (${phone}) enviou uma mensagem pelo site. ${body.message || ''}`

      // Buscar todos os usuários da org (exceto staff)
      const { data: orgUsers } = await supabase
        .from('users')
        .select('id')
        .eq('org_id', site.org_id)
        .neq('role', 'staff')

      if (orgUsers && orgUsers.length > 0) {
        const alertRows = orgUsers.map((u: any) => ({
          user_id: u.id,
          type: 'urgent',
          title: `Novo lead do site: ${name}`,
          description: alertDescription,
          action_link: crmLeadId ? `/dashboard/crm/${crmLeadId}` : null,
          action_label: 'Ver lead',
          is_read: false,
        }))
        await supabase.from('alerts').insert(alertRows)
      }
    } catch (e) {
      console.error('[SiteLeads] Erro ao criar alerta:', e)
    }

    return NextResponse.json({ success: true, lead: siteLead })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
