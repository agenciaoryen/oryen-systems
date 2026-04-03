// app/api/whatsapp/qr/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Tenta chamar UAZAPI testando diferentes formatos de auth.
 * Loga cada tentativa para debug.
 */
async function tryUazapi(
  baseUrl: string,
  path: string,
  token: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any
): Promise<{ res: Response; method_used: string } | null> {

  const attempts: Array<{ label: string; url: string; init: RequestInit }> = [
    // 1. Header 'token'
    {
      label: 'header token',
      url: `${baseUrl}${path}`,
      init: { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'token': token }, ...(body ? { body: JSON.stringify(body) } : {}) }
    },
    // 2. Query param ?token=
    {
      label: 'query ?token=',
      url: `${baseUrl}${path}?token=${token}`,
      init: { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }
    },
    // 3. Token no body
    {
      label: 'body token',
      url: `${baseUrl}${path}`,
      init: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ token, ...(body || {}) }) }
    },
    // 4. Token no path
    {
      label: 'path /{token}/',
      url: `${baseUrl}/${token}${path}`,
      init: { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }
    },
    // 5. Authorization Bearer
    {
      label: 'Authorization Bearer',
      url: `${baseUrl}${path}`,
      init: { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) }
    },
  ]

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, attempt.init)
      console.log(`[UAZAPI] ${attempt.label} → ${res.status}`)

      if (res.status !== 401 && res.status !== 403 && res.status !== 404 && res.status !== 405) {
        return { res, method_used: attempt.label }
      }

      // Consumir body
      await res.text().catch(() => {})
    } catch (err: any) {
      console.log(`[UAZAPI] ${attempt.label} → ERROR: ${err.message}`)
    }
  }

  return null
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
      return NextResponse.json({ status: 'not_configured' }, { status: 400 })
    }

    console.log(`[WhatsApp:QR] Testing auth for ${apiUrl} | token length: ${token.length}`)

    // ─── 1. Tentar connect (gera QR) ───
    const result = await tryUazapi(apiUrl, '/instance/connect', token, 'POST')

    if (!result) {
      return NextResponse.json({
        status: 'error',
        error: 'All UAZAPI auth methods failed. Check token and API URL.'
      })
    }

    console.log(`[WhatsApp:QR] Auth worked with: ${result.method_used}`)
    const connectData = await result.res.json()
    console.log('[WhatsApp:QR] Response:', JSON.stringify(connectData).slice(0, 500))

    // Extrair QR
    const qrCode = connectData.qrcode
      || connectData.qr
      || connectData.base64
      || connectData.data?.qrcode
      || connectData.data?.qr
      || connectData.data?.base64
      || null

    const pairingCode = connectData.pairingCode || connectData.code || connectData.data?.pairingCode || null

    if (qrCode || pairingCode) {
      if (instance.status !== 'qr_pending') {
        await supabase.from('whatsapp_instances').update({ status: 'qr_pending' }).eq('id', instanceId)
      }
      return NextResponse.json({ status: 'qr_ready', qr_code: qrCode, pairing_code: pairingCode })
    }

    // Sem QR — pode estar conectado
    if (connectData.status === 'connected' || connectData.state === 'connected') {
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
