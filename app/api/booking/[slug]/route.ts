// app/api/booking/[slug]/route.ts
// GET: informações públicas do link de agendamento
// POST: criar evento agendado via link público

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/api-auth'

/**
 * GET /api/booking/[slug]
 * Retorna configuração do booking (público, sem auth)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const { data, error } = await supabase
      .from('public_booking_slots')
      .select('*, users(full_name)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Link de agendamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ booking: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/booking/[slug]
 * Body: { date, time, name, phone, email?, notes? }
 * Cria um evento no calendário do usuário dono do link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()

    if (!body.date || !body.time || !body.name || !body.phone) {
      return NextResponse.json({ error: 'Campos obrigatórios: date, time, name, phone' }, { status: 400 })
    }

    // Busca o booking config
    const { data: booking, error: bookingError } = await supabase
      .from('public_booking_slots')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Link de agendamento não encontrado' }, { status: 404 })
    }

    // Verifica disponibilidade (conflitos)
    const startTime = body.time
    const endTime = addMinutes(startTime, booking.duration_minutes)

    const { data: conflicts } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('org_id', booking.org_id)
      .eq('event_date', body.date)
      .eq('assigned_to', booking.user_id)
      .eq('status', 'scheduled')
      .gte('start_time', startTime)
      .lt('start_time', endTime)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'Este horário não está mais disponível' }, { status: 409 })
    }

    // Cria o lead (ou busca existente pelo telefone)
    let leadId: string | null = null
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('org_id', booking.org_id)
      .or(`phone.eq.${body.phone},email.eq.${body.email || ''}`)
      .maybeSingle()

    if (existingLead) {
      leadId = existingLead.id
    } else {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          org_id: booking.org_id,
          name: body.name,
          phone: body.phone,
          email: body.email || null,
          source: 'booking_link',
          status: 'new',
        })
        .select('id')
        .single()

      if (newLead) leadId = newLead.id
    }

    // Cria o evento
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        org_id: booking.org_id,
        assigned_to: booking.user_id,
        lead_id: leadId,
        title: booking.title,
        description: body.notes || null,
        event_type: 'meeting',
        event_date: body.date,
        start_time: startTime,
        end_time: endTime,
        status: 'scheduled',
        created_by: 'booking_link',
        notes: body.notes || null,
      })
      .select('*, leads(id, name, phone)')
      .single()

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    return NextResponse.json({ event })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}
