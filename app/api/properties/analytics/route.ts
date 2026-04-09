// app/api/properties/analytics/route.ts
// Endpoint autenticado para buscar métricas agregadas de imóveis.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPortfolioOverview, getPropertyStats, getDailyViews } from '@/lib/properties/analytics'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id')
    const days = parseInt(searchParams.get('days') || '30', 10)
    const propertyId = searchParams.get('property_id')

    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    const validDays = [7, 15, 30, 90].includes(days) ? days : 30

    if (propertyId) {
      // Detalhe de 1 imóvel
      const [stats, daily] = await Promise.all([
        getPropertyStats(supabase, orgId, validDays),
        getDailyViews(supabase, orgId, validDays, propertyId),
      ])

      const summary = stats.find(s => s.property_id === propertyId)
      if (!summary) {
        return NextResponse.json({ error: 'property not found' }, { status: 404 })
      }

      return NextResponse.json({ summary, daily })
    }

    // Listagem geral
    const [overview, stats, daily] = await Promise.all([
      getPortfolioOverview(supabase, orgId, validDays),
      getPropertyStats(supabase, orgId, validDays),
      getDailyViews(supabase, orgId, validDays),
    ])

    return NextResponse.json({ overview, stats, daily })
  } catch (err: any) {
    console.error('[PropertyAnalytics] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
