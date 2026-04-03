// app/api/whatsapp/instances/route.ts
// CRUD de instâncias WhatsApp — lista e cria instâncias para a org

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/whatsapp/instances?org_id=xxx
 * Lista instâncias da org
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id')
    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ instances: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp/instances
 * Cria nova instância na UAZAPI e registra no banco
 * Body: { org_id, agent_id?, display_name? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, agent_id, campaign_id, display_name } = body

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    // Gerar nome único para a instância
    const instanceName = `oryen_${org_id.slice(0, 8)}_${Date.now().toString(36)}`

    const uazapiUrl = process.env.UAZAPI_API_URL
    const uazapiToken = process.env.UAZAPI_ADMIN_TOKEN

    let instanceToken = null
    let apiUrl = uazapiUrl || null

    // Criar instância na UAZAPI (se configurada)
    if (uazapiUrl && uazapiToken) {
      try {
        const response = await fetch(`${uazapiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${uazapiToken}`
          },
          body: JSON.stringify({
            instanceName,
            token: uazapiToken,
            webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/sdr/webhook`,
            webhookByEvents: false,
            events: ['messages.upsert']
          })
        })

        if (response.ok) {
          const data = await response.json()
          instanceToken = data.token || data.instance?.token || uazapiToken
          apiUrl = data.apiUrl || uazapiUrl
        } else {
          console.warn('[WhatsApp] UAZAPI create instance failed:', await response.text())
        }
      } catch (err: any) {
        console.warn('[WhatsApp] UAZAPI connection failed:', err.message)
      }
    }

    // Salvar no banco
    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        org_id,
        agent_id: agent_id || null,
        campaign_id: campaign_id || null,
        instance_name: instanceName,
        instance_token: instanceToken,
        api_url: apiUrl,
        display_name: display_name || null,
        status: 'qr_pending'
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ instance })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
