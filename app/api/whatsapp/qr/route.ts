// app/api/whatsapp/qr/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const instanceId = request.nextUrl.searchParams.get('instance_id')
    if (!instanceId) {
      return NextResponse.json({ error: 'instance_id required' }, { status: 400 })
    }

    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .single()

    if (error || !instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    const apiUrl = instance.api_url || process.env.UAZAPI_API_URL
    const token = instance.instance_token

    if (!apiUrl || !token) {
      return NextResponse.json({ status: 'not_configured', error: 'Missing api_url or instance_token' }, { status: 400 })
    }

    console.log(`[WhatsApp:QR] Connecting ${apiUrl} | token length: ${token.length}`)

    // Chamar POST /instance/connect com token no header
    const res = await fetch(`${apiUrl}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': token
      }
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[WhatsApp:QR] UAZAPI error ${res.status}: ${body}`)
      return NextResponse.json({
        status: 'error',
        error: `UAZAPI returned ${res.status}: ${body}`
      })
    }

    const connectData = await res.json()
    console.log('[WhatsApp:QR] Response:', JSON.stringify(connectData).slice(0, 500))

    // Extrair QR — UAZAPI retorna em connectData.instance.qrcode
    const qrCode = connectData.qrcode
      || connectData.instance?.qrcode
      || connectData.qr
      || connectData.base64
      || connectData.data?.qrcode
      || connectData.data?.qr
      || connectData.data?.base64
      || null

    const pairingCode = connectData.pairingCode
      || connectData.instance?.paircode
      || connectData.code
      || connectData.data?.pairingCode
      || null

    if (qrCode || pairingCode) {
      if (instance.status !== 'qr_pending') {
        await supabase.from('whatsapp_instances').update({ status: 'qr_pending' }).eq('id', instanceId)
      }
      return NextResponse.json({ status: 'qr_ready', qr_code: qrCode, pairing_code: pairingCode })
    }

    // Sem QR — pode estar conectado
    if (connectData.connected === true || connectData.status === 'connected' || connectData.state === 'connected' || connectData.instance?.status === 'connected') {
      await supabase.from('whatsapp_instances')
        .update({ status: 'connected', connected_at: new Date().toISOString() })
        .eq('id', instanceId)
      return NextResponse.json({ status: 'connected' })
    }

    return NextResponse.json({ status: 'waiting', raw: connectData })

  } catch (error: any) {
    console.error('[WhatsApp:QR] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
