// app/api/site-leads/route.ts
// POST: submissão pública do formulário de contato | GET: listagem no dashboard

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // 2. Criar/atualizar lead no CRM (tabela leads)
    let crmLeadId: string | null = null
    try {
      // Verificar se já existe lead com esse telefone na org
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('org_id', site.org_id)
        .eq('phone', phone)
        .single()

      if (existingLead) {
        crmLeadId = existingLead.id
      } else {
        // Criar novo lead no CRM
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            org_id: site.org_id,
            name,
            phone,
            email: body.email || null,
            source: 'site',
            stage: 'new',
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        crmLeadId = newLead?.id || null
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

    // 3. Criar alerta para o corretor
    try {
      const propertyInfo = body.property_id
        ? await supabase.from('properties').select('title').eq('id', body.property_id).single().then(r => r.data?.title)
        : null

      await supabase.from('alerts').insert({
        org_id: site.org_id,
        lead_id: crmLeadId,
        type: 'new_site_lead',
        title: `Novo lead do site: ${name}`,
        body: propertyInfo
          ? `${name} (${phone}) demonstrou interesse no imóvel "${propertyInfo}". ${body.message || ''}`
          : `${name} (${phone}) enviou uma mensagem pelo site. ${body.message || ''}`,
        priority: 'high',
        status: 'unread',
      })
    } catch (e) {
      console.error('[SiteLeads] Erro ao criar alerta:', e)
    }

    return NextResponse.json({ success: true, lead: siteLead })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
