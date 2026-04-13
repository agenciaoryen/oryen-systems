// app/api/site/route.ts
// GET: buscar config do site | PUT: atualizar config do site

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/site?org_id=X  (dashboard)
 * GET /api/site?slug=X    (público)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const orgId = searchParams.get('org_id')
    const slug = searchParams.get('slug')

    if (!orgId && !slug) {
      return NextResponse.json({ error: 'org_id or slug required' }, { status: 400 })
    }

    let query = supabase.from('site_settings').select('*')

    if (slug) {
      query = query.eq('slug', slug).eq('is_published', true)
    } else {
      query = query.eq('org_id', orgId!)
    }

    const { data, error } = await query.single()

    if (error && error.code === 'PGRST116') {
      // Nenhum registro encontrado
      if (orgId) {
        return NextResponse.json({ site: null })
      }
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ site: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/site
 * Body: { org_id, ...campos }
 * Cria ou atualiza (upsert) o site_settings da org
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id } = body

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('org_id', org_id)
      .single()

    // Verificar unicidade do slug se informado
    if (body.slug) {
      const { data: slugExists } = await supabase
        .from('site_settings')
        .select('id')
        .eq('slug', body.slug)
        .neq('org_id', org_id)

      if (slugExists && slugExists.length > 0) {
        return NextResponse.json(
          { error: 'Este slug já está em uso. Escolha outro.' },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()

    if (existing) {
      // Update
      const { org_id: _, ...updateData } = body
      updateData.updated_at = now

      const { data, error } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('org_id', org_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ site: data })
    } else {
      // Insert
      if (!body.slug) {
        return NextResponse.json(
          { error: 'slug is required for new site' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('site_settings')
        .insert({
          org_id,
          slug: body.slug,
          site_name: body.site_name || null,
          tagline: body.tagline || null,
          logo_url: body.logo_url || null,
          cover_image_url: body.cover_image_url || null,
          primary_color: body.primary_color || '#4B6BFB',
          accent_color: body.accent_color || '#F0A030',
          hero_text_color: body.hero_text_color || '#FFFFFF',
          bio: body.bio || null,
          avatar_url: body.avatar_url || null,
          creci: body.creci || null,
          email: body.email || null,
          phone: body.phone || null,
          whatsapp: body.whatsapp || null,
          address: body.address || null,
          social_links: body.social_links || {},
          meta_title: body.meta_title || null,
          meta_description: body.meta_description || null,
          og_image_url: body.og_image_url || null,
          currency: body.currency || 'BRL',
          is_published: false,
          custom_domain: body.custom_domain || null,
          domain_status: null,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ site: data })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
