// app/api/whatsapp/migrate-webhooks/route.ts
// Endpoint único para reconfigurar o webhook de TODAS as instâncias
// com o UAZAPI_WEBHOOK_SECRET token. Protegido por CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret, supabaseAdmin as supabase } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Proteger com CRON_SECRET (mesmo mecanismo dos crons)
    if (!validateCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = process.env.UAZAPI_WEBHOOK_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    const webhookUrl = `${baseUrl}/api/sdr/webhook${secret ? `?token=${secret}` : ''}`

    // Buscar todas as instâncias ativas
    const { data: instances, error } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, api_url, instance_token, status')

    if (error || !instances) {
      return NextResponse.json({ error: 'Failed to fetch instances', detail: error?.message }, { status: 500 })
    }

    const results: Array<{
      instance: string
      success: boolean
      error?: string
    }> = []

    for (const inst of instances) {
      const apiUrl = inst.api_url || process.env.UAZAPI_API_URL
      const token = inst.instance_token

      if (!apiUrl || !token) {
        results.push({ instance: inst.instance_name, success: false, error: 'Missing api_url or token' })
        continue
      }

      try {
        const res = await fetch(`${apiUrl}/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': token
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ['messages', 'messages_update', 'connection'],
            excludeMessages: ['wasSentByApi', 'isGroupYes']
          })
        })

        if (res.ok) {
          results.push({ instance: inst.instance_name, success: true })
        } else {
          const body = await res.text().catch(() => '')
          results.push({ instance: inst.instance_name, success: false, error: `${res.status}: ${body.slice(0, 200)}` })
        }
      } catch (err: any) {
        results.push({ instance: inst.instance_name, success: false, error: err.message })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      webhook_url: webhookUrl,
      total: instances.length,
      migrated: successCount,
      failed: instances.length - successCount,
      results
    })

  } catch (error: any) {
    console.error('[Webhook:Migrate] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
