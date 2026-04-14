// app/api/properties/route.ts
// GET: listar imóveis (com filtros) | POST: criar imóvel

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'
import { slugify } from '@/lib/properties/constants'
import { geocodeAddress } from '@/lib/properties/geocoder'
import { checkPlanLimit } from '@/lib/planLimits'

/**
 * GET /api/properties?org_id=X&status=active&type=apartment&transaction=sale&search=texto&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = request.nextUrl
    const orgId = resolveOrgId(auth, searchParams.get('org_id'))
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const transaction = searchParams.get('transaction')
    const search = searchParams.get('search')
    const isFeatured = searchParams.get('is_featured')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Para listagem pública (site), usa slug da org
    const siteSlug = searchParams.get('site_slug')

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })

    if (siteSlug) {
      // Busca pública: precisa encontrar o org_id pelo slug do site
      const { data: site } = await supabase
        .from('site_settings')
        .select('org_id')
        .eq('slug', siteSlug)
        .eq('is_published', true)
        .single()

      if (!site) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }

      query = query.eq('org_id', site.org_id).eq('status', 'active')
    } else if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      return NextResponse.json({ error: 'org_id or site_slug required' }, { status: 400 })
    }

    if (status && !siteSlug) query = query.eq('status', status)
    if (type) query = query.eq('property_type', type)
    if (transaction) query = query.eq('transaction_type', transaction)
    if (isFeatured === 'true') query = query.eq('is_featured', true)
    if (search) query = query.ilike('title', `%${search}%`)

    // Filtros de preço
    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    if (minPrice) query = query.gte('price', parseInt(minPrice))
    if (maxPrice) query = query.lte('price', parseInt(maxPrice))

    // Filtro de quartos
    const minBedrooms = searchParams.get('min_bedrooms')
    if (minBedrooms) query = query.gte('bedrooms', parseInt(minBedrooms))

    query = query
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      properties: data || [],
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
 * POST /api/properties
 * Body: { org_id, title, property_type, transaction_type, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { title, property_type, transaction_type } = body

    if (!title || !property_type || !transaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, property_type, transaction_type' },
        { status: 400 }
      )
    }

    // Verificar limite de imóveis do plano
    const propLimit = await checkPlanLimit(org_id, 'maxProperties', 'properties')
    if (!propLimit.allowed) {
      return NextResponse.json({
        error: 'plan_limit_reached',
        message: `Limite de ${propLimit.limit} imóveis atingido no plano ${propLimit.plan}. Faça upgrade para adicionar mais.`,
        limit: propLimit.limit,
        current: propLimit.current,
      }, { status: 403 })
    }

    // Gerar slug único
    let slug = slugify(title)
    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('org_id', org_id)
      .eq('slug', slug)

    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    // Gerar código de referência automático (REF-1001, REF-1002, ...)
    let externalCode = body.external_code
    if (!externalCode) {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org_id)
      externalCode = `REF-${1001 + (count || 0)}`
    }

    // Geocoding automático se não tem lat/lng mas tem endereço
    let latitude = body.latitude || null
    let longitude = body.longitude || null

    if (!latitude || !longitude) {
      const hasAddress = body.address_city || body.address_zip || body.address_neighborhood
      if (hasAddress) {
        // Buscar país da org para geocoding mais preciso
        const { data: orgRow } = await supabase
          .from('orgs')
          .select('country')
          .eq('id', org_id)
          .single()

        const geo = await geocodeAddress({
          street: body.address_street,
          number: body.address_number,
          neighborhood: body.address_neighborhood,
          city: body.address_city,
          state: body.address_state,
          zip: body.address_zip,
          country: orgRow?.country || null,
        })

        if (geo) {
          latitude = geo.latitude
          longitude = geo.longitude
          console.log(`[Properties:POST] Geocoded: ${geo.latitude}, ${geo.longitude} (${geo.display_name?.slice(0, 60)})`)
        }
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        org_id,
        title,
        description: body.description || null,
        slug,
        property_type,
        transaction_type,
        price: body.price || null,
        condo_fee: body.condo_fee || null,
        iptu: body.iptu || null,
        address_street: body.address_street || null,
        address_number: body.address_number || null,
        address_complement: body.address_complement || null,
        address_neighborhood: body.address_neighborhood || null,
        address_city: body.address_city || null,
        address_state: body.address_state || null,
        address_zip: body.address_zip || null,
        latitude,
        longitude,
        bedrooms: body.bedrooms || 0,
        suites: body.suites || 0,
        bathrooms: body.bathrooms || 0,
        parking_spots: body.parking_spots || 0,
        total_area: body.total_area || null,
        private_area: body.private_area || null,
        amenities: body.amenities || [],
        images: body.images || [],
        video_url: body.video_url || null,
        virtual_tour_url: body.virtual_tour_url || null,
        status: body.status || 'draft',
        is_featured: body.is_featured || false,
        external_code: externalCode,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ property: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
