// app/api/messages/send/route.ts
// Envia mensagem do atendente (dashboard) via UAZAPI + seta STOP

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stopSet } from '@/lib/sdr/redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, lead_id, phone, message } = body

    if (!org_id || !phone || !message) {
      return NextResponse.json({ error: 'Missing org_id, phone, or message' }, { status: 400 })
    }

    // 1. Buscar instância conectada da org
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('api_url, instance_token, instance_name')
      .eq('org_id', org_id)
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (!instance?.api_url || !instance?.instance_token) {
      return NextResponse.json({ error: 'No connected WhatsApp instance found' }, { status: 404 })
    }

    // 2. Formatar número (apenas dígitos)
    const number = phone.replace(/[^0-9]/g, '')

    // 3. Enviar presença "digitando..."
    await fetch(`${instance.api_url}/send/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instance.instance_token },
      body: JSON.stringify({ number, state: 'composing' })
    }).catch(() => {})

    // 4. Enviar mensagem via UAZAPI
    const sendRes = await fetch(`${instance.api_url}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instance.instance_token },
      body: JSON.stringify({ number, text: message })
    })

    if (!sendRes.ok) {
      const errBody = await sendRes.text().catch(() => '')
      console.error(`[Messages:Send] UAZAPI error ${sendRes.status}: ${errBody}`)
      return NextResponse.json({ error: `UAZAPI error: ${sendRes.status}` }, { status: 502 })
    }

    // 5. Limpar presença
    await fetch(`${instance.api_url}/send/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instance.instance_token },
      body: JSON.stringify({ number, state: 'available' })
    }).catch(() => {})

    // 6. Setar STOP (atendente humano assumiu)
    await stopSet(org_id, number)

    // 7. Salvar em sdr_messages (histórico para IA)
    await supabase.from('sdr_messages').insert({
      org_id,
      lead_id: lead_id || null,
      instance_name: instance.instance_name,
      phone: number,
      role: 'assistant',
      body: message,
      type: 'attendant',
      source: 'human'
    }).then(() => {}).catch(() => {})

    console.log(`[Messages:Send] ✓ Atendente enviou para ${number}: "${message.slice(0, 50)}"`)

    return NextResponse.json({ success: true, sent: true })
  } catch (error: any) {
    console.error('[Messages:Send] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
