// app/api/messages/send-audio/route.ts
// Envia áudio do atendente (dashboard) via UAZAPI + seta STOP

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'
import { stopSet } from '@/lib/sdr/redis'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const formData = await request.formData()
    const orgId = resolveOrgId(auth, formData.get('org_id') as string)
    const leadId = formData.get('lead_id') as string
    const phone = formData.get('phone') as string
    const audioFile = formData.get('audio') as File

    if (!phone || !audioFile) {
      return NextResponse.json({ error: 'Missing phone or audio' }, { status: 400 })
    }

    // 1. Buscar instância conectada
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('api_url, instance_token, instance_name')
      .eq('org_id', orgId)
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (!instance?.api_url || !instance?.instance_token) {
      return NextResponse.json({ error: 'No connected WhatsApp instance found' }, { status: 404 })
    }

    const number = phone.replace(/[^0-9]/g, '')

    // 2. Converter audio para base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // 3. Enviar áudio via UAZAPI /send/media com type ptt (push-to-talk)
    const sendRes = await fetch(`${instance.api_url}/send/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instance.instance_token },
      body: JSON.stringify({
        number,
        type: 'ptt',
        file: `data:audio/ogg;base64,${base64}`
      })
    })

    if (!sendRes.ok) {
      const errBody = await sendRes.text().catch(() => '')
      console.error(`[Messages:SendAudio] UAZAPI error ${sendRes.status}: ${errBody}`)
      return NextResponse.json({ error: `UAZAPI error: ${sendRes.status}` }, { status: 502 })
    }

    // 4. Setar STOP (atendente humano assumiu)
    await stopSet(orgId, number)

    // 5. Salvar em sdr_messages
    await supabase.from('sdr_messages').insert({
      org_id: orgId,
      lead_id: leadId || null,
      instance_name: instance.instance_name,
      phone: number,
      role: 'assistant',
      body: '[Áudio enviado pelo atendente]',
      type: 'audio',
      source: 'human'
    }).then(() => {}).catch(() => {})

    console.log(`[Messages:SendAudio] ✓ Áudio enviado para ${number}`)

    return NextResponse.json({ success: true, sent: true })
  } catch (error: any) {
    console.error('[Messages:SendAudio] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
