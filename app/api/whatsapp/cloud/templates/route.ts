// app/api/whatsapp/cloud/templates/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// CRUD de Templates WhatsApp Cloud API
//
// GET    — Lista templates da org (do banco + sync com Meta)
// POST   — Cria template e submete ao Meta para aprovação
// PATCH  — Edita template (resubmete ao Meta)
// DELETE — Remove template do Meta e do banco
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'

const GRAPH_API = `https://graph.facebook.com/${process.env.CLOUD_API_VERSION || 'v21.0'}`
const META_TOKEN = process.env.META_SYSTEM_USER_TOKEN!

// ═══════════════════════════════════════════════════════════════════════════════
// GET — Listar templates
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = request.nextUrl
  const orgId = resolveOrgId(auth, searchParams.get('org_id'))
  const wabaId = searchParams.get('waba_id')
  const syncMeta = searchParams.get('sync') === 'true'

  // Se sync=true, sincronizar do Meta primeiro
  if (syncMeta && wabaId) {
    await syncTemplatesFromMeta(orgId, wabaId)
  }

  const { data: templates, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: templates || [] })
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Criar template e submeter ao Meta
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const org_id = resolveOrgId(auth, body.org_id)
  const { waba_id, template_name, language, category, body_text, header_text, footer_text, buttons, purpose } = body

  if (!waba_id || !template_name || !body_text) {
    return NextResponse.json({ error: 'waba_id, template_name, body_text required' }, { status: 400 })
  }

  // ─── Submeter ao Meta ───
  const metaBody: any = {
    name: template_name,
    language: language || 'pt_BR',
    category: category || 'UTILITY',
    components: []
  }

  if (header_text) {
    metaBody.components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: header_text
    })
  }

  // Body com parâmetros (ex: "Olá {{1}}, tudo bem?")
  const bodyComponent: any = {
    type: 'BODY',
    text: body_text
  }

  // Detectar parâmetros {{1}}, {{2}}, etc.
  const paramMatches = body_text.match(/\{\{\d+\}\}/g) || []
  if (paramMatches.length > 0) {
    bodyComponent.example = {
      body_text: [paramMatches.map((_: any, i: number) => `example_${i + 1}`)]
    }
  }
  metaBody.components.push(bodyComponent)

  if (footer_text) {
    metaBody.components.push({
      type: 'FOOTER',
      text: footer_text
    })
  }

  if (buttons && buttons.length > 0) {
    metaBody.components.push({
      type: 'BUTTONS',
      buttons
    })
  }

  try {
    const metaRes = await fetch(`${GRAPH_API}/${waba_id}/message_templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaBody)
    })

    const metaData = await metaRes.json()

    if (!metaRes.ok) {
      console.error('[Templates] Meta create error:', metaData)
      return NextResponse.json({
        error: 'Meta API error',
        details: metaData.error?.message || metaData
      }, { status: metaRes.status })
    }

    // ─── Salvar no banco ───
    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .insert({
        org_id,
        waba_id,
        template_name,
        language: language || 'pt_BR',
        category: category || 'UTILITY',
        header_text: header_text || null,
        body_text,
        footer_text: footer_text || null,
        buttons: buttons || null,
        meta_template_id: metaData.id,
        meta_status: metaData.status || 'PENDING',
        purpose: purpose || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[Templates] DB insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Templates] Template "${template_name}" criado e submetido ao Meta (ID: ${metaData.id})`)
    return NextResponse.json({ template, meta_response: metaData }, { status: 201 })

  } catch (err: any) {
    console.error('[Templates] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH — Editar template
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { id, body_text, header_text, footer_text, buttons } = body

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // Buscar template existente
  const { data: existing } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'template not found' }, { status: 404 })
  }

  // Editar no Meta (só permite editar templates APPROVED ou REJECTED)
  if (existing.meta_template_id && ['APPROVED', 'REJECTED'].includes(existing.meta_status)) {
    const components: any[] = []

    if (header_text !== undefined) {
      components.push({ type: 'HEADER', format: 'TEXT', text: header_text || existing.header_text })
    }

    const bodyComponent: any = {
      type: 'BODY',
      text: body_text || existing.body_text
    }
    components.push(bodyComponent)

    if (footer_text !== undefined) {
      components.push({ type: 'FOOTER', text: footer_text || existing.footer_text })
    }

    try {
      const metaRes = await fetch(`${GRAPH_API}/${existing.meta_template_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ components })
      })

      if (!metaRes.ok) {
        const metaData = await metaRes.json()
        console.error('[Templates] Meta edit error:', metaData)
        return NextResponse.json({
          error: 'Meta API error',
          details: metaData.error?.message
        }, { status: metaRes.status })
      }
    } catch (err: any) {
      console.error('[Templates] Meta edit fetch error:', err)
    }
  }

  // Atualizar no banco
  const updates: any = { updated_at: new Date().toISOString() }
  if (body_text !== undefined) updates.body_text = body_text
  if (header_text !== undefined) updates.header_text = header_text
  if (footer_text !== undefined) updates.footer_text = footer_text
  if (buttons !== undefined) updates.buttons = buttons

  // Se foi editado, volta pra PENDING
  if (body_text || header_text || footer_text) {
    updates.meta_status = 'PENDING'
  }

  const { data: updated, error } = await supabase
    .from('whatsapp_templates')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ template: updated })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE — Remover template
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  const wabaId = searchParams.get('waba_id')
  const templateName = searchParams.get('template_name')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // Deletar do Meta se temos os dados
  if (wabaId && templateName) {
    try {
      await fetch(`${GRAPH_API}/${wabaId}/message_templates?name=${templateName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${META_TOKEN}` }
      })
    } catch (err: any) {
      console.warn(`[Templates] Meta delete error (non-fatal): ${err.message}`)
    }
  }

  // Deletar do banco
  const { error } = await supabase
    .from('whatsapp_templates')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC — Sincronizar templates do Meta para o banco
// ═══════════════════════════════════════════════════════════════════════════════

async function syncTemplatesFromMeta(orgId: string, wabaId: string) {
  try {
    const res = await fetch(`${GRAPH_API}/${wabaId}/message_templates?limit=100`, {
      headers: { 'Authorization': `Bearer ${META_TOKEN}` }
    })

    if (!res.ok) {
      console.error('[Templates] Meta sync fetch error:', res.status)
      return
    }

    const data = await res.json()
    const templates = data.data || []

    for (const t of templates) {
      // Extrair textos dos componentes
      let headerText = ''
      let bodyText = ''
      let footerText = ''
      let buttons = null

      for (const comp of t.components || []) {
        if (comp.type === 'HEADER' && comp.format === 'TEXT') headerText = comp.text || ''
        if (comp.type === 'BODY') bodyText = comp.text || ''
        if (comp.type === 'FOOTER') footerText = comp.text || ''
        if (comp.type === 'BUTTONS') buttons = comp.buttons || null
      }

      // Upsert por waba_id + template_name + language
      await supabase
        .from('whatsapp_templates')
        .upsert({
          org_id: orgId,
          waba_id: wabaId,
          template_name: t.name,
          language: t.language,
          category: t.category || 'UTILITY',
          header_text: headerText || null,
          body_text: bodyText,
          footer_text: footerText || null,
          buttons,
          meta_template_id: t.id,
          meta_status: t.status || 'PENDING',
          rejection_reason: t.rejected_reason || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'waba_id,template_name,language'
        })
    }

    console.log(`[Templates] Synced ${templates.length} templates from Meta for WABA ${wabaId}`)
  } catch (err: any) {
    console.error(`[Templates] Sync error: ${err.message}`)
  }
}
