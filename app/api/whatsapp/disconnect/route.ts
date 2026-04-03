// app/api/whatsapp/disconnect/route.ts
// Desconecta uma instância WhatsApp

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/whatsapp/disconnect
 * Body: { instance_id }
 */
export async function POST(request: NextRequest) {
  try {
    const { instance_id } = await request.json()
    if (!instance_id) {
      return NextResponse.json({ error: 'instance_id required' }, { status: 400 })
    }

    // Buscar instância
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instance_id)
      .single()

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
    }

    // Desconectar na UAZAPI
    const apiUrl = instance.api_url || process.env.UAZAPI_API_URL
    const token = instance.instance_token || process.env.UAZAPI_ADMIN_TOKEN

    if (apiUrl && token) {
      try {
        await fetch(`${apiUrl}/instance/logout?instanceName=${instance.instance_name}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      } catch (err: any) {
        console.warn('[WhatsApp] Logout UAZAPI error:', err.message)
      }
    }

    // Atualizar banco
    await supabase
      .from('whatsapp_instances')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        phone_number: null
      })
      .eq('id', instance_id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
