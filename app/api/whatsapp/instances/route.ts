// app/api/whatsapp/instances/route.ts
// CRUD de instâncias WhatsApp — lista e registra instâncias para a org
//
// Na UAZAPI, cada subdomínio (oryen.uazapi.com) já É a instância.
// Aqui apenas registramos no banco para mapear org → instância.

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
 * Registra uma instância UAZAPI no banco (mapeia org → instância)
 * Body: { org_id, agent_id?, display_name? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, agent_id, campaign_id, display_name } = body

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    // Gerar nome único para referência interna
    const instanceName = `oryen_${org_id.slice(0, 8)}_${Date.now().toString(36)}`

    // Salvar no banco — api_url e token vêm das env vars globais
    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        org_id,
        agent_id: agent_id || null,
        campaign_id: campaign_id || null,
        instance_name: instanceName,
        instance_token: process.env.UAZAPI_ADMIN_TOKEN || null,
        api_url: process.env.UAZAPI_API_URL || null,
        display_name: display_name || null,
        status: 'disconnected'
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ instance })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
