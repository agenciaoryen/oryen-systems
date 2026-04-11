// app/api/properties/geocode-batch/route.ts
// Geocodifica imóveis existentes que ainda não têm lat/lng.
// Chamada manual (uma vez) ou via cron para preencher coordenadas.
// Rate limit: 1 req/s para Nominatim (adicionamos delay de 1.1s entre chamadas).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geocodeAddress } from '@/lib/properties/geocoder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const secret = body.secret || ''

    if (secret !== (process.env.SDR_PROCESS_SECRET || 'sdr-internal-token')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const limit = Math.min(body.limit || 20, 50) // máximo 50 por chamada
    const orgId = body.org_id || null // opcional: filtrar por org

    // Buscar imóveis sem coordenadas que tenham pelo menos cidade
    let query = supabase
      .from('properties')
      .select('id, org_id, address_street, address_number, address_neighborhood, address_city, address_state, address_zip')
      .is('latitude', null)
      .not('address_city', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (orgId) query = query.eq('org_id', orgId)

    const { data: properties, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({ message: 'Todos os imóveis já estão geocodificados', processed: 0 })
    }

    // Buscar países das orgs envolvidas (cache por org)
    const orgCountries: Record<string, string | null> = {}

    let geocoded = 0
    let failed = 0
    const results: any[] = []

    for (const prop of properties) {
      // Buscar país da org (com cache)
      if (!(prop.org_id in orgCountries)) {
        const { data: org } = await supabase
          .from('orgs')
          .select('country')
          .eq('id', prop.org_id)
          .single()
        orgCountries[prop.org_id] = org?.country || null
      }

      const geo = await geocodeAddress({
        street: prop.address_street,
        number: prop.address_number,
        neighborhood: prop.address_neighborhood,
        city: prop.address_city,
        state: prop.address_state,
        zip: prop.address_zip,
        country: orgCountries[prop.org_id],
      })

      if (geo) {
        await supabase
          .from('properties')
          .update({ latitude: geo.latitude, longitude: geo.longitude })
          .eq('id', prop.id)

        geocoded++
        results.push({ id: prop.id, lat: geo.latitude, lng: geo.longitude, address: `${prop.address_neighborhood}, ${prop.address_city}` })
      } else {
        failed++
        results.push({ id: prop.id, error: 'geocoding_failed', address: `${prop.address_neighborhood}, ${prop.address_city}` })
      }

      // Rate limit: Nominatim pede max 1 req/s
      await new Promise(r => setTimeout(r, 1100))
    }

    console.log(`[Geocode:Batch] Processados: ${properties.length} | Geocodificados: ${geocoded} | Falha: ${failed}`)

    return NextResponse.json({
      processed: properties.length,
      geocoded,
      failed,
      results,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
