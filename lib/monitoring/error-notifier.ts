// lib/monitoring/error-notifier.ts
// Envia alertas de erro do SDR via WhatsApp para o admin
// Similar ao fluxo de erro que existia no n8n

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Throttle: não enviar mais que 1 alerta a cada 5 minutos por tipo de erro
const recentAlerts = new Map<string, number>()
const THROTTLE_MS = 5 * 60 * 1000

interface ErrorAlert {
  module: string       // 'SDR', 'FollowUp', 'Reports', etc
  error: string        // mensagem de erro
  context?: string     // contexto adicional (lead, phone, etc)
  severity: 'warning' | 'error' | 'critical'
}

export async function notifyError(alert: ErrorAlert): Promise<void> {
  try {
    // Throttle por tipo
    const key = `${alert.module}:${alert.error.substring(0, 50)}`
    const lastSent = recentAlerts.get(key)
    if (lastSent && Date.now() - lastSent < THROTTLE_MS) {
      return // já enviou recentemente
    }
    recentAlerts.set(key, Date.now())

    const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'error' ? '🟠' : '⚠️'
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const message = [
      `${icon} *ALERTA ORYEN AI*`,
      ``,
      `*Módulo:* ${alert.module}`,
      `*Severidade:* ${alert.severity.toUpperCase()}`,
      `*Erro:* ${alert.error}`,
      alert.context ? `*Contexto:* ${alert.context}` : '',
      `*Hora:* ${now}`,
      ``,
      `_Verifique os logs para mais detalhes._`
    ].filter(Boolean).join('\n')

    // Buscar instância e número do admin
    const adminPhone = process.env.ADMIN_ALERT_PHONE
    if (!adminPhone) {
      console.warn('[ErrorNotifier] ADMIN_ALERT_PHONE não configurado — alerta não enviado')
      return
    }

    // Buscar qualquer instância conectada para enviar
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, instance_token, api_url, status')
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (!instance) {
      console.warn('[ErrorNotifier] Nenhuma instância WhatsApp conectada — alerta não enviado')
      return
    }

    // Enviar direto via UAZAPI (sem humanização, é alerta interno)
    const apiUrl = instance.api_url || process.env.UAZAPI_API_URL
    const response = await fetch(`${apiUrl}/instance/${instance.instance_name}/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instance.instance_token}`
      },
      body: JSON.stringify({
        phone: adminPhone,
        message
      })
    })

    if (response.ok) {
      console.log(`[ErrorNotifier] Alerta enviado para +${adminPhone}: ${alert.module} - ${alert.error.substring(0, 60)}`)
    } else {
      console.warn(`[ErrorNotifier] Falha ao enviar alerta: ${response.status}`)
    }

    // Também salvar no banco para histórico
    await supabase.from('system_logs').insert({
      module: alert.module,
      level: alert.severity,
      message: alert.error,
      context: alert.context || null,
      created_at: new Date().toISOString()
    }).then(() => {}).catch(() => {}) // non-fatal

  } catch (err) {
    // Silencioso — notifier nunca deve quebrar o fluxo principal
    console.error('[ErrorNotifier] Falha interna:', err)
  }
}
