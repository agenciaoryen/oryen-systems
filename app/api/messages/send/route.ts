// app/api/messages/send/route.ts
// Envia mensagem do atendente (dashboard) via UAZAPI + seta STOP

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'
import { stopSet } from '@/lib/sdr/redis'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const org_id = resolveOrgId(auth, body.org_id)
    const { lead_id, phone, message } = body

    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing phone or message' }, { status: 400 })
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
