// app/api/whatsapp/qr/route.ts
// Busca QR code da UAZAPI para uma instância específica

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

    // Buscar instância
    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .single()

    if (error || !instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    // Se já está conectada, retornar status
    if (instance.status === 'connected') {
      return NextResponse.json({
        status: 'connected',
        phone_number: instance.phone_number,
        display_name: instance.display_name
      })
    }

    // Buscar QR code da UAZAPI
    const apiUrl = instance.api_url || process.env.UAZAPI_API_URL
    const token = instance.instance_token || process.env.UAZAPI_ADMIN_TOKEN

    if (!apiUrl || !token) {
      return NextResponse.json({
        status: 'not_configured',
        error: 'UAZAPI not configured for this instance'
      }, { status: 400 })
    }

    const qrResponse = await fetch(`${apiUrl}/instance/qrcode?instanceName=${instance.instance_name}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!qrResponse.ok) {
      const text = await qrResponse.text().catch(() => '')
      // Se retorna que já está conectado
      if (text.includes('connected') || text.includes('open')) {
        // Atualizar status no banco
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'connected', connected_at: new Date().toISOString() })
          .eq('id', instanceId)

        return NextResponse.json({ status: 'connected' })
      }
      return NextResponse.json({ status: 'error', error: `QR fetch failed: ${qrResponse.status}` })
    }

    const qrData = await qrResponse.json()

    // UAZAPI pode retornar { qrcode: "base64..." } ou { base64: "..." }
    const qrCode = qrData.qrcode || qrData.base64 || qrData.qr || null

    if (!qrCode) {
      // Pode significar que já está conectado ou aguardando
      if (qrData.status === 'open' || qrData.connected) {
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'connected', connected_at: new Date().toISOString() })
          .eq('id', instanceId)

        return NextResponse.json({ status: 'connected' })
      }

      return NextResponse.json({ status: 'waiting', message: 'QR not ready yet' })
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
      qr_code: qrCode
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
