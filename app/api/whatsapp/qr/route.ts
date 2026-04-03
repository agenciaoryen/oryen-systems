// app/api/whatsapp/qr/route.ts
// Busca QR code da UAZAPI para uma instância específica

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Tenta chamar UAZAPI com diferentes formatos de auth até funcionar.
 * A UAZAPI aceita o token de formas diferentes dependendo da versão.
 */
async function uazapiFetch(
  url: string,
  token: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any
): Promise<Response> {
  const attempts = [
    // 1. Token na URL como query param
    { url: `${url}${url.includes('?') ? '&' : '?'}token=${token}`, headers: { 'Content-Type': 'application/json' } },
    // 2. Header 'token'
    { url, headers: { 'Content-Type': 'application/json', 'token': token } },
    // 3. Header 'apikey'
    { url, headers: { 'Content-Type': 'application/json', 'apikey': token } },
    // 4. Authorization Bearer
    { url, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
    // 5. Authorization sem Bearer
    { url, headers: { 'Content-Type': 'application/json', 'Authorization': token } },
  ]

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i]
    const res = await fetch(attempt.url, {
      method,
      headers: attempt.headers,
      ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {})
    })

    if (res.status !== 401) {
      if (i > 0) console.log(`[UAZAPI] Auth method ${i + 1} worked for ${url}`)
      return res
    }

    // Consumir body para evitar leak
    await res.text().catch(() => {})
  }

  // Todos falharam — retornar último resultado
  console.error(`[UAZAPI] All auth methods failed for ${url}`)
  return new Response(JSON.stringify({ error: 'All auth methods failed' }), { status: 401 })
}

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

    // ─── 1. Verificar status atual ───
    const statusRes = await uazapiFetch(`${apiUrl}/instance/status`, token, 'GET')

    if (statusRes.ok) {
      const statusData = await statusRes.json()
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

    // ─── 2. Chamar /instance/connect para gerar QR ───
    const connectRes = await uazapiFetch(`${apiUrl}/instance/connect`, token, 'POST', {})

    if (!connectRes.ok) {
      const errText = await connectRes.text().catch(() => '')
      console.error(`[WhatsApp:QR] Connect failed ${connectRes.status}:`, errText)
      return NextResponse.json({ status: 'error', error: `UAZAPI ${connectRes.status}: ${errText}` })
    }

    const connectData = await connectRes.json()
    console.log('[WhatsApp:QR] Connect response:', JSON.stringify(connectData).slice(0, 500))

    // Extrair QR code — testar todos os campos possíveis
    const qrCode = connectData.qrcode
      || connectData.qr
      || connectData.base64
      || connectData.data?.qrcode
      || connectData.data?.qr
      || connectData.data?.base64
      || connectData.data?.code
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
