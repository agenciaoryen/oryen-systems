// app/api/whatsapp/cloud/embedded-signup/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Embedded Signup — WhatsApp Cloud API
//
// Recebe auth_code do frontend (Facebook Login), troca por token,
// descobre WABA e phone_number_id, registra instância no banco.
//
// Fluxo:
// 1. Frontend faz FB.login() → recebe auth_code
// 2. POST aqui com auth_code + org_id
// 3. Trocar auth_code por token (Graph API /oauth/access_token)
// 4. Descobrir WABA ID via /debug_token ou /me/businesses
// 5. Listar phone numbers do WABA
// 6. Subscribir System User ao WABA
// 7. Registrar phone number
// 8. Salvar instância no banco
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GRAPH_API = `https://graph.facebook.com/${process.env.CLOUD_API_VERSION || 'v21.0'}`
const META_TOKEN = process.env.META_SYSTEM_USER_TOKEN!
const APP_ID = process.env.META_APP_ID!
const APP_SECRET = process.env.META_APP_SECRET!

export async function POST(request: NextRequest) {
  try {
    const { auth_code, org_id } = await request.json()

    if (!auth_code || !org_id) {
      return NextResponse.json({ error: 'auth_code and org_id required' }, { status: 400 })
    }

    console.log(`[EmbeddedSignup] Processing auth_code for org ${org_id}`)

    // ─── 1. Trocar auth_code por token ───
    const tokenRes = await fetch(
      `${GRAPH_API}/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${auth_code}`,
      { method: 'GET' }
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[EmbeddedSignup] Token exchange failed:', tokenData)
      return NextResponse.json({
        error: 'Token exchange failed',
        details: tokenData.error?.message || 'Unknown error'
      }, { status: 400 })
    }

    const userToken = tokenData.access_token
    console.log('[EmbeddedSignup] Token obtained successfully')

    // ─── 2. Descobrir shared WABA ID usando debug_token ───
    const debugRes = await fetch(
      `${GRAPH_API}/debug_token?input_token=${userToken}`,
      { headers: { 'Authorization': `Bearer ${META_TOKEN}` } }
    )
    const debugData = await debugRes.json()

    // Extrair WABA ID dos granular_scopes
    let wabaId: string | null = null
    const granularScopes = debugData.data?.granular_scopes || []
    for (const scope of granularScopes) {
      if (scope.scope === 'whatsapp_business_management' && scope.target_ids?.length > 0) {
        wabaId = scope.target_ids[0]
        break
      }
    }

    if (!wabaId) {
      // Fallback: tentar via shared_waba_ids do Embedded Signup response
      console.error('[EmbeddedSignup] Could not find WABA ID from debug_token:', debugData)
      return NextResponse.json({
        error: 'Could not determine WABA ID',
        details: 'No whatsapp_business_management scope found'
      }, { status: 400 })
    }

    console.log(`[EmbeddedSignup] WABA ID: ${wabaId}`)

    // ─── 3. Listar phone numbers do WABA ───
    const phonesRes = await fetch(
      `${GRAPH_API}/${wabaId}/phone_numbers`,
      { headers: { 'Authorization': `Bearer ${userToken}` } }
    )
    const phonesData = await phonesRes.json()
    const phoneNumbers = phonesData.data || []

    if (phoneNumbers.length === 0) {
      return NextResponse.json({
        error: 'No phone numbers found in WABA',
        waba_id: wabaId
      }, { status: 400 })
    }

    // Usar o primeiro phone number
    const phoneInfo = phoneNumbers[0]
    const phoneNumberId = phoneInfo.id
    const displayPhoneNumber = phoneInfo.display_phone_number
    const verifiedName = phoneInfo.verified_name || ''

    console.log(`[EmbeddedSignup] Phone: ${displayPhoneNumber} (ID: ${phoneNumberId})`)

    // ─── 4. Subscribir System User ao WABA ───
    try {
      await fetch(`${GRAPH_API}/${wabaId}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${META_TOKEN}` }
      })
      console.log(`[EmbeddedSignup] System User subscribed to WABA ${wabaId}`)
    } catch (err: any) {
      console.warn(`[EmbeddedSignup] Subscription warning: ${err.message}`)
    }

    // ─── 5. Registrar phone number (habilita Cloud API no número) ───
    try {
      await fetch(`${GRAPH_API}/${phoneNumberId}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: '123456' // PIN de 6 dígitos (obrigatório, pode ser qualquer valor)
        })
      })
      console.log(`[EmbeddedSignup] Phone ${phoneNumberId} registered`)
    } catch (err: any) {
      console.warn(`[EmbeddedSignup] Registration warning: ${err.message}`)
    }

    // ─── 6. Salvar instância no banco ───
    const instanceName = `cloud-${displayPhoneNumber.replace(/[^0-9]/g, '').slice(-8)}`

    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        org_id,
        instance_name: instanceName,
        display_name: verifiedName || displayPhoneNumber,
        phone_number: displayPhoneNumber.replace(/[^0-9]/g, ''),
        api_type: 'cloud_api',
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        status: 'connected',
        connected_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      console.error('[EmbeddedSignup] DB insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[EmbeddedSignup] Instance created: ${instance.id} (${instanceName})`)

    // ─── 7. Criar templates padrão (async, não bloqueia) ───
    createDefaultTemplates(org_id, wabaId).catch(err =>
      console.warn(`[EmbeddedSignup] Default templates error: ${err.message}`)
    )

    return NextResponse.json({
      success: true,
      instance,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      phone_number: displayPhoneNumber,
      verified_name: verifiedName,
    })

  } catch (error: any) {
    console.error('[EmbeddedSignup] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES PADRÃO
// ═══════════════════════════════════════════════════════════════════════════════

async function createDefaultTemplates(orgId: string, wabaId: string) {
  const templates = [
    {
      template_name: 'follow_up_utility_v1',
      language: 'pt_BR',
      category: 'UTILITY',
      body_text: 'Olá {{1}}! Tudo bem? Estou entrando em contato sobre seu interesse em imóveis. Posso te ajudar?',
      purpose: 'follow_up',
    },
    {
      template_name: 'appointment_reminder_v1',
      language: 'pt_BR',
      category: 'UTILITY',
      body_text: 'Olá {{1}}, lembrando da visita agendada para {{2}} no imóvel {{3}}. Confirma presença?',
      purpose: 'appointment_reminder',
    },
    {
      template_name: 'reengagement_v1',
      language: 'pt_BR',
      category: 'MARKETING',
      body_text: '{{1}}, encontramos novos imóveis na região que você buscava! Quer que envie as opções?',
      purpose: 'reengagement',
    },
  ]

  for (const t of templates) {
    // Submeter ao Meta
    const metaBody = {
      name: t.template_name,
      language: t.language,
      category: t.category,
      components: [{
        type: 'BODY',
        text: t.body_text,
        example: {
          body_text: [t.body_text.match(/\{\{\d+\}\}/g)?.map((_: any, i: number) => `exemplo_${i + 1}`) || []]
        }
      }]
    }

    try {
      const metaRes = await fetch(`${GRAPH_API}/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaBody)
      })
      const metaData = await metaRes.json()

      if (metaRes.ok) {
        await supabase.from('whatsapp_templates').insert({
          org_id: orgId,
          waba_id: wabaId,
          template_name: t.template_name,
          language: t.language,
          category: t.category,
          body_text: t.body_text,
          meta_template_id: metaData.id,
          meta_status: metaData.status || 'PENDING',
          purpose: t.purpose,
        })
        console.log(`[EmbeddedSignup] Template "${t.template_name}" submitted`)
      } else {
        console.warn(`[EmbeddedSignup] Template "${t.template_name}" failed:`, metaData.error?.message)
      }
    } catch (err: any) {
      console.warn(`[EmbeddedSignup] Template "${t.template_name}" error: ${err.message}`)
    }
  }
}
