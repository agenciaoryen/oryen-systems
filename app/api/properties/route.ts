// app/api/properties/route.ts
// GET: listar imóveis (com filtros) | POST: criar imóvel

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/properties/constants'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/properties?org_id=X&status=active&type=apartment&transaction=sale&search=texto&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const orgId = searchParams.get('org_id')
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
    const body = await request.json()
    const { org_id, title, property_type, transaction_type } = body

    if (!org_id || !title || !property_type || !transaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, title, property_type, transaction_type' },
        { status: 400 }
      )
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
        latitude: body.latitude || null,
        longitude: body.longitude || null,
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
        external_code: body.external_code || null,
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
