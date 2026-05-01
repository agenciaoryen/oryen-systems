// app/api/cron/event-reminders/route.ts
// Cron job que processa lembretes de eventos pendentes e cria alerts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/api-auth'
import { validateCronSecret } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const secretError = validateCronSecret(request)
    if (secretError) return secretError

    const now = new Date()
    const nowISO = now.toISOString()

    // Busca eventos agendados com lembrete pendente
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*, leads(id, name, nome_empresa, phone)')
      .eq('status', 'scheduled')
      .not('reminder_minutes', 'is', null)
      .is('last_reminder_sent_at', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let sent = 0

    for (const event of events || []) {
      const reminderMin = event.reminder_minutes as number
      if (!reminderMin) continue

      // Calcula a hora do evento em Date
      const [h, m] = (event.start_time || '00:00').split(':').map(Number)
      const eventDate = new Date(event.event_date + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00')

      // Janela: agora está entre (evento - reminderMin) e (evento)
      const reminderTime = new Date(eventDate.getTime() - reminderMin * 60 * 1000)

      if (now >= reminderTime && now < eventDate) {
        // Define o destinatário: só assigned_to (created_by é text 'user'/'sdr_agent')
        if (!event.assigned_to) continue

        // Cria alerta
        const { error: alertError } = await supabase
          .from('alerts')
          .insert({
            user_id: targetUserId,
            type: 'info',
            title: `🔔 Lembrete: ${event.title}`,
            description: `${event.event_date.split('-').reverse().join('/')} às ${event.start_time}${event.leads?.name ? ` - ${event.leads.name}` : ''}${event.address ? `\n📍 ${event.address}` : ''}`,
            action_link: '/dashboard/calendar',
            action_label: 'Ver evento',
            is_read: false,
          })

        if (alertError) continue

        // Marca como enviado
        await supabase
          .from('calendar_events')
          .update({ last_reminder_sent_at: nowISO })
          .eq('id', event.id)

        sent++
      }
    }

    return NextResponse.json({ processed: events?.length || 0, sent })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
