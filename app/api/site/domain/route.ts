// app/api/site/domain/route.ts
// Gerencia domínios customizados: adicionar, remover, verificar status
// Usa a Vercel API para registrar domínios no projeto

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || ''
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || ''
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || ''

function vercelUrl(path: string): string {
  const base = `https://api.vercel.com${path}`
  return VERCEL_TEAM_ID ? `${base}?teamId=${VERCEL_TEAM_ID}` : base
}

async function vercelFetch(path: string, options: RequestInit = {}) {
  const url = vercelUrl(path)
  const separator = url.includes('?') ? '&' : '?'

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Adicionar domínio customizado
// Body: { org_id, domain }
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { org_id, domain } = await request.json()

    if (!org_id || !domain) {
      return NextResponse.json({ error: 'org_id and domain required' }, { status: 400 })
    }

    // Normalizar domínio
    const cleanDomain = domain.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')

    if (!cleanDomain || !cleanDomain.includes('.')) {
      return NextResponse.json({ error: 'Domínio inválido' }, { status: 400 })
    }

    // Verificar se já está em uso por outra org
    const { data: existing } = await supabase
      .from('site_settings')
      .select('org_id')
      .eq('custom_domain', cleanDomain)
      .neq('org_id', org_id)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Este domínio já está em uso por outra organização' }, { status: 409 })
    }

    // Adicionar domínio no Vercel
    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      const addRes = await vercelFetch(`/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
        method: 'POST',
        body: JSON.stringify({ name: cleanDomain }),
      })

      const addData = await addRes.json()

      if (!addRes.ok && addData.error?.code !== 'domain_already_exists') {
        console.error('[Domain] Vercel add error:', addData)
        return NextResponse.json({
          error: addData.error?.message || 'Erro ao adicionar domínio no Vercel',
          vercel_error: addData.error
        }, { status: 400 })
      }
    }

    // Salvar no banco
    const { error: dbError } = await supabase
      .from('site_settings')
      .update({
        custom_domain: cleanDomain,
        domain_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', org_id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, domain: cleanDomain, status: 'pending' })
  } catch (err: any) {
    console.error('[Domain] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET — Verificar status do domínio
// ?org_id=X
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id')
    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    const { data: site } = await supabase
      .from('site_settings')
      .select('custom_domain, domain_status')
      .eq('org_id', orgId)
      .single()

    if (!site?.custom_domain) {
      return NextResponse.json({ domain: null, status: null })
    }

    // Verificar status no Vercel
    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      const vercelRes = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${site.custom_domain}`)

      if (vercelRes.ok) {
        const domainData = await vercelRes.json()
        const verified = domainData.verified === true

        // Checar configuração DNS
        const configRes = await vercelFetch(`/v6/domains/${site.custom_domain}/config`)
        const configData = configRes.ok ? await configRes.json() : {}
        const misconfigured = configData.misconfigured === true

        let status: string
        if (verified && !misconfigured) {
          status = 'active'
        } else if (misconfigured) {
          status = 'misconfigured'
        } else {
          status = 'pending'
        }

        // Atualizar status no banco se mudou
        if (status !== site.domain_status) {
          await supabase
            .from('site_settings')
            .update({ domain_status: status })
            .eq('org_id', orgId)
        }

        return NextResponse.json({
          domain: site.custom_domain,
          status,
          verified,
          misconfigured,
          dns_type: configData.cnames?.length > 0 ? 'CNAME' : 'A',
          cname_target: 'cname.vercel-dns.com',
          a_record: '76.76.21.21',
        })
      }
    }

    return NextResponse.json({
      domain: site.custom_domain,
      status: site.domain_status || 'pending',
      cname_target: 'cname.vercel-dns.com',
      a_record: '76.76.21.21',
    })
  } catch (err: any) {
    console.error('[Domain] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE — Remover domínio customizado
// Body: { org_id }
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const { org_id } = await request.json()

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    // Buscar domínio atual
    const { data: site } = await supabase
      .from('site_settings')
      .select('custom_domain')
      .eq('org_id', org_id)
      .single()

    if (!site?.custom_domain) {
      return NextResponse.json({ success: true })
    }

    // Remover do Vercel
    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${site.custom_domain}`, {
        method: 'DELETE',
      })
    }

    // Limpar no banco
    await supabase
      .from('site_settings')
      .update({
        custom_domain: null,
        domain_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', org_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Domain] DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
