// app/api/whatsapp/qr/route.ts
// Busca QR code da UAZAPI para uma instância específica
//
// UAZAPI API:
//   POST /instance/connect (sem body) → retorna QR code
//   GET  /instance/status → retorna status da conexão
//   Auth: header "token: <admin_token>"

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/whatsapp/qr?instance_id=xxx
 * Retorna QR code (base64) para conexão do WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    const instanceId = request.nextUrl.searchParams.get('instance_id')
    if (!instanceId) {
      return NextResponse.json({ error: 'instance_id required' }, { status: 400 })
    }

    // Buscar instância no banco
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
      return NextResponse.json({
        status: 'not_configured',
        error: 'UAZAPI not configured'
      }, { status: 400 })
    }

    console.log(`[WhatsApp:QR] apiUrl: ${apiUrl} | token: ${token?.slice(0, 8)}...${token?.slice(-4)} | length: ${token?.length}`)

    // ─── 1. Verificar status atual primeiro ───
    const statusRes = await fetch(`${apiUrl}/instance/status`, {
      method: 'GET',
      headers: { 'token': token, 'apikey': token }
    })

    if (statusRes.ok) {
      const statusData = await statusRes.json()
      const currentStatus = statusData.status || statusData.state || ''

      // Já conectado
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

    // ─── 2. Se não conectado, chamar /instance/connect para gerar QR ───
    // Tentar com múltiplos formatos de auth (UAZAPI varia por versão)
    let connectRes = await fetch(`${apiUrl}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({})
    })

    // Se 401 com header 'token', tentar com 'apikey'
    if (connectRes.status === 401) {
      console.log('[WhatsApp:QR] Tentando com header apikey...')
      connectRes = await fetch(`${apiUrl}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': token
        },
        body: JSON.stringify({})
      })
    }

    // Se ainda 401, tentar com Authorization Bearer
    if (connectRes.status === 401) {
      console.log('[WhatsApp:QR] Tentando com Authorization Bearer...')
      connectRes = await fetch(`${apiUrl}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })
    }

    if (!connectRes.ok) {
      const errText = await connectRes.text().catch(() => '')
      console.error(`[WhatsApp:QR] Connect failed ${connectRes.status}:`, errText)
      return NextResponse.json({
        status: 'error',
        error: `UAZAPI connect failed: ${connectRes.status}`
      })
    }

    const connectData = await connectRes.json()

    // Extrair QR code da resposta — testar vários campos possíveis
    const qrCode = connectData.qrcode
      || connectData.qr
      || connectData.base64
      || connectData.data?.qrcode
      || connectData.data?.qr
      || connectData.data?.base64
      || null

    // Se veio pairing code ao invés de QR
    const pairingCode = connectData.pairingCode || connectData.code || null

    if (!qrCode && !pairingCode) {
      // Pode ser que já está conectado ou em processo
      console.log('[WhatsApp:QR] Connect response (no QR found):', JSON.stringify(connectData).slice(0, 500))

      if (connectData.status === 'connected') {
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'connected', connected_at: new Date().toISOString() })
          .eq('id', instanceId)
        return NextResponse.json({ status: 'connected' })
      }

      return NextResponse.json({
        status: 'waiting',
        raw: connectData // incluir resposta raw para debug
      })
    }

    // Atualizar status para qr_pending
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
