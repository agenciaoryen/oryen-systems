// app/api/properties/track/route.ts
// Endpoint público e leve para registrar eventos de imóveis no site.
// Chamado via sendBeacon/fetch pelo tracker client-side.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_EVENTS = ['view', 'click', 'gallery_open', 'contact_open', 'contact_submit', 'whatsapp_click', 'share']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      site_slug,
      property_id,
      event_type,
      visitor_id,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      metadata,
    } = body

    // Validação básica
    if (!site_slug || !property_id || !event_type) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    if (!VALID_EVENTS.includes(event_type)) {
      return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
    }

    // Resolver org_id via site_slug
    const { data: site } = await supabase
      .from('site_settings')
      .select('org_id')
      .eq('slug', site_slug)
      .single()

    if (!site?.org_id) {
      return NextResponse.json({ error: 'site not found' }, { status: 404 })
    }

    // Inserir evento
    await supabase.from('property_events').insert({
      org_id: site.org_id,
      property_id,
      event_type,
      visitor_id: visitor_id || null,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      metadata: metadata || {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Silencioso — tracking não deve falhar visivelmente
  }
}
