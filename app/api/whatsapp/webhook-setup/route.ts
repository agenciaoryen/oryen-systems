// app/api/whatsapp/webhook-setup/route.ts
// Configura ou verifica o webhook de uma instância na UAZAPI

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/whatsapp/webhook-setup
 * Body: { instance_id }
 * Configura o webhook na UAZAPI para esta instância
 */
export async function POST(request: NextRequest) {
  try {
    const { instance_id } = await request.json()
    if (!instance_id) {
      return NextResponse.json({ error: 'instance_id required' }, { status: 400 })
    }

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instance_id)
      .single()

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    const apiUrl = instance.api_url || process.env.UAZAPI_API_URL
    const token = instance.instance_token

    if (!apiUrl || !token) {
      return NextResponse.json({ error: 'Missing api_url or token' }, { status: 400 })
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sdr/webhook`

    // ─── 1. Verificar webhook atual ───
    let currentWebhook = null
    try {
      const getRes = await fetch(`${apiUrl}/webhook`, {
        method: 'GET',
        headers: { 'token': token }
      })
      if (getRes.ok) {
        currentWebhook = await getRes.json()
      }
    } catch {}

    console.log(`[Webhook:Setup] Current webhook for ${instance.instance_name}:`, JSON.stringify(currentWebhook).slice(0, 300))

    // ─── 2. Configurar webhook ───
    const res = await fetch(`${apiUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        events: ['messages', 'messages_update', 'connection'],
        excludeMessages: ['wasSentByApi', 'isGroupYes']
      })
    })

    const resBody = await res.text().catch(() => '')
    console.log(`[Webhook:Setup] POST /webhook ${res.status}: ${resBody.slice(0, 300)}`)

    if (res.ok) {
      return NextResponse.json({
        success: true,
        webhook_url: webhookUrl,
        previous: currentWebhook
      })
    }

    return NextResponse.json({
      error: 'Failed to configure webhook',
      status_code: res.status,
      detail: resBody
    }, { status: 502 })

  } catch (error: any) {
    console.error('[Webhook:Setup] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/whatsapp/webhook-setup?instance_id=xxx
 * Verifica o webhook atual da instância
 */
export async function GET(request: NextRequest) {
  try {
    const instanceId = request.nextUrl.searchParams.get('instance_id')
    if (!instanceId) {
      return NextResponse.json({ error: 'instance_id required' }, { status: 400 })
    }

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .single()

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    const apiUrl = instance.api_url || process.env.UAZAPI_API_URL
    const token = instance.instance_token

    if (!apiUrl || !token) {
      return NextResponse.json({ error: 'Missing api_url or token' }, { status: 400 })
    }

    const res = await fetch(`${apiUrl}/webhook`, {
      method: 'GET',
      headers: { 'token': token }
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json({ error: `UAZAPI ${res.status}: ${body}` }, { status: 502 })
    }

    const webhookData = await res.json()
    return NextResponse.json({ webhook: webhookData })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
