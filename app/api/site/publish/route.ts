// app/api/site/publish/route.ts
// POST: toggle publicação do site (com validação de campos mínimos)

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'

/**
 * POST /api/site/publish
 * Body: { org_id, publish: true/false }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { publish } = body

    if (typeof publish !== 'boolean') {
      return NextResponse.json(
        { error: 'publish (boolean) required' },
        { status: 400 }
      )
    }

    // Buscar config atual
    const { data: site, error: siteError } = await supabase
      .from('site_settings')
      .select('*')
      .eq('org_id', org_id)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site settings not found. Configure your site first.' },
        { status: 404 }
      )
    }

    // Se está publicando, validar campos mínimos
    if (publish) {
      const errors: string[] = []

      if (!site.slug) errors.push('Defina um slug (URL) para o site')
      if (!site.site_name) errors.push('Defina o nome do site')

      // Verificar se tem pelo menos 1 imóvel ativo
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org_id)
        .eq('status', 'active')

      if (!count || count === 0) {
        errors.push('Publique pelo menos 1 imóvel antes de ativar o site')
      }

      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Requisitos não atendidos', details: errors },
          { status: 422 }
        )
      }
    }

    // Toggle publicação
    const { data, error } = await supabase
      .from('site_settings')
      .update({
        is_published: publish,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      site: data,
      message: publish ? 'Site publicado com sucesso!' : 'Site despublicado.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
