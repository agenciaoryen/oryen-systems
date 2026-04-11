// app/api/properties/[id]/route.ts
// PUT: atualizar imóvel | DELETE: deletar imóvel (com cleanup de imagens)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/properties/constants'
import { geocodeAddress } from '@/lib/properties/geocoder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/properties/[id]
 * Retorna um imóvel pelo ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ property: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/properties/[id]
 * Body: campos parciais do imóvel
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Se título mudou, regenerar slug
    if (body.title && !body.slug) {
      const { data: current } = await supabase
        .from('properties')
        .select('org_id, title')
        .eq('id', id)
        .single()

      if (current && body.title !== current.title) {
        let slug = slugify(body.title)
        const { data: existing } = await supabase
          .from('properties')
          .select('id')
          .eq('org_id', current.org_id)
          .eq('slug', slug)
          .neq('id', id)

        if (existing && existing.length > 0) {
          slug = `${slug}-${Date.now().toString(36)}`
        }
        body.slug = slug
      }
    }

    // Se status mudou para 'active', definir published_at
    if (body.status === 'active') {
      const { data: current } = await supabase
        .from('properties')
        .select('published_at')
        .eq('id', id)
        .single()

      if (current && !current.published_at) {
        body.published_at = new Date().toISOString()
      }
    }

    body.updated_at = new Date().toISOString()

    // Re-geocodificar se endereço mudou e não tem lat/lng manual
    const addressChanged = body.address_street !== undefined ||
      body.address_neighborhood !== undefined ||
      body.address_city !== undefined ||
      body.address_state !== undefined ||
      body.address_zip !== undefined

    if (addressChanged && !body.latitude && !body.longitude) {
      // Buscar dados atuais do imóvel para montar endereço completo
      const { data: current } = await supabase
        .from('properties')
        .select('org_id, address_street, address_number, address_neighborhood, address_city, address_state, address_zip')
        .eq('id', id)
        .single()

      if (current) {
        // Mesclar campos atualizados com existentes
        const merged = {
          street: body.address_street ?? current.address_street,
          number: body.address_number ?? current.address_number,
          neighborhood: body.address_neighborhood ?? current.address_neighborhood,
          city: body.address_city ?? current.address_city,
          state: body.address_state ?? current.address_state,
          zip: body.address_zip ?? current.address_zip,
        }

        if (merged.city || merged.zip) {
          const { data: orgRow } = await supabase
            .from('orgs')
            .select('country')
            .eq('id', current.org_id)
            .single()

          const geo = await geocodeAddress({ ...merged, country: orgRow?.country || null })
          if (geo) {
            body.latitude = geo.latitude
            body.longitude = geo.longitude
            console.log(`[Properties:PUT] Re-geocoded ${id}: ${geo.latitude}, ${geo.longitude}`)
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ property: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/properties/[id]?org_id=X
 * Deleta o imóvel e limpa as imagens do Storage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orgId = request.nextUrl.searchParams.get('org_id')

    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    // Buscar imóvel para pegar imagens antes de deletar
    const { data: property } = await supabase
      .from('properties')
      .select('images')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Limpar imagens do Storage
    if (property.images && property.images.length > 0) {
      const paths = property.images
        .map((img: any) => {
          // Extrair path relativo da URL do Supabase Storage
          const match = img.url?.match(/property-images\/(.+)/)
          return match ? match[1] : null
        })
        .filter(Boolean)

      if (paths.length > 0) {
        await supabase.storage.from('property-images').remove(paths)
      }
    }

    // Deletar imóvel
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
