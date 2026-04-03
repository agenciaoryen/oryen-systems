// app/api/whatsapp/qr/route.ts
// UAZAPI auth: token vai na URL como path segment
// URL: https://{subdomain}.uazapi.com/{token}/instance/connect

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
    const token = instance.instance_token || process.env.UAZAPI_ADMIN_TOKEN

    if (!apiUrl || !token) {
      return NextResponse.json({ status: 'not_configured', error: 'UAZAPI not configured' }, { status: 400 })
    }

    // Base URL com token no path: https://oryen.uazapi.com/{token}
    const baseUrl = `${apiUrl}/${token}`

    // ─── 1. Verificar status atual ───
    try {
      const statusRes = await fetch(`${baseUrl}/instance/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        console.log('[WhatsApp:QR] Status response:', JSON.stringify(statusData).slice(0, 300))
        const currentStatus = statusData.status || statusData.state || ''

        if (currentStatus === 'connected' || currentStatus === 'open') {
          if (instance.status !== 'connected') {
            await supabase
              .from('whatsapp_instances')
              .update({
                status: 'connected',
                connected_at: new Date().toISOString(),
                phone_number: statusData.phone || statusData.number || instance.phone_number
              })
              .eq('id', instanceId)
          }
          return NextResponse.json({
            status: 'connected',
            phone_number: statusData.phone || statusData.number || instance.phone_number
          })
        }
      }
    } catch (err: any) {
      console.warn('[WhatsApp:QR] Status check error:', err.message)
    }

    // ─── 2. Chamar /instance/connect para gerar QR ───
    // Sem body = gera QR code (com body phone = gera pairing code)
    let connectRes = await fetch(`${baseUrl}/instance/connect`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    })

    // Se POST deu 405, tentar GET
    if (connectRes.status === 405) {
      console.log('[WhatsApp:QR] POST /instance/connect deu 405, tentando GET...')
      await connectRes.text().catch(() => {})
      connectRes = await fetch(`${baseUrl}/instance/connect`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
    }

    if (!connectRes.ok) {
      const errText = await connectRes.text().catch(() => '')
      console.error(`[WhatsApp:QR] Connect failed ${connectRes.status}:`, errText)
      return NextResponse.json({ status: 'error', error: `UAZAPI ${connectRes.status}: ${errText}` })
    }

    const connectData = await connectRes.json()
    console.log('[WhatsApp:QR] Connect response:', JSON.stringify(connectData).slice(0, 500))

    // Extrair QR code
    const qrCode = connectData.qrcode
      || connectData.qr
      || connectData.base64
      || connectData.data?.qrcode
      || connectData.data?.qr
      || connectData.data?.base64
      || null

    const pairingCode = connectData.pairingCode || connectData.code || connectData.data?.pairingCode || null

    if (!qrCode && !pairingCode) {
      if (connectData.status === 'connected') {
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'connected', connected_at: new Date().toISOString() })
          .eq('id', instanceId)
        return NextResponse.json({ status: 'connected' })
      }
      return NextResponse.json({ status: 'waiting', raw: connectData })
    }

    if (instance.status !== 'qr_pending') {
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'qr_pending' })
        .eq('id', instanceId)
    }

    return NextResponse.json({
      status: 'qr_ready',
      qr_code: qrCode,
      pairing_code: pairingCode
    })

  } catch (error: any) {
    console.error('[WhatsApp:QR] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
