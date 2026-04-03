// app/api/whatsapp/instances/route.ts
// CRUD de instâncias WhatsApp — lista, registra e exclui instâncias para a org

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PLAN_CONFIGS, type PlanName } from '@/lib/usePlan'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/whatsapp/instances?org_id=xxx
 * Lista instâncias da org + retorna limite do plano
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

    // Buscar plano da org para retornar o limite
    const { data: org } = await supabase
      .from('orgs')
      .select('plan')
      .eq('id', orgId)
      .single()

    const planName = (org?.plan || 'basic') as PlanName
    const maxInstances = PLAN_CONFIGS[planName]?.limits?.maxWhatsappNumbers ?? 1

    return NextResponse.json({
      instances: data || [],
      limit: maxInstances
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp/instances
 * Registra uma instância UAZAPI no banco (mapeia org → instância)
 * Body: { org_id, agent_id?, display_name?, instance_token, api_url? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, agent_id, campaign_id, display_name, instance_token, api_url } = body

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    if (!instance_token) {
      return NextResponse.json({ error: 'instance_token required' }, { status: 400 })
    }

    // Verificar limite do plano
    const { data: org } = await supabase
      .from('orgs')
      .select('plan')
      .eq('id', org_id)
      .single()

    const planName = (org?.plan || 'basic') as PlanName
    const maxInstances = PLAN_CONFIGS[planName]?.limits?.maxWhatsappNumbers ?? 1

    if (maxInstances !== -1) {
      const { count } = await supabase
        .from('whatsapp_instances')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org_id)

      if ((count || 0) >= maxInstances) {
        return NextResponse.json({
          error: 'plan_limit_reached',
          limit: maxInstances,
          plan: planName
        }, { status: 403 })
      }
    }

    // Gerar nome único para referência interna
    const instanceName = `oryen_${org_id.slice(0, 8)}_${Date.now().toString(36)}`

    // Salvar no banco — token e api_url vêm do input do usuário
    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        org_id,
        agent_id: agent_id || null,
        campaign_id: campaign_id || null,
        instance_name: instanceName,
        instance_token: instance_token,
        api_url: api_url || process.env.UAZAPI_API_URL || null,
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

/**
 * DELETE /api/whatsapp/instances
 * Body: { instance_id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { instance_id } = await request.json()
    if (!instance_id) {
      return NextResponse.json({ error: 'instance_id required' }, { status: 400 })
    }

    // Buscar instância para desconectar na UAZAPI antes de excluir
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('api_url, instance_token, status')
      .eq('id', instance_id)
      .single()

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    // Se estava conectada, desconectar na UAZAPI
    if (instance.status === 'connected' && instance.api_url && instance.instance_token) {
      try {
        await fetch(`${instance.api_url}/instance/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instance.instance_token
          }
        })
      } catch (err: any) {
        console.warn('[WhatsApp:Delete] Disconnect error (non-fatal):', err.message)
      }
    }

    // Excluir do banco
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', instance_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
