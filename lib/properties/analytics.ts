// lib/properties/analytics.ts
// Funções de agregação para estatísticas de imóveis.

import { SupabaseClient } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PropertyStat {
  property_id: string
  title: string
  slug: string
  status: string
  property_type: string
  transaction_type: string
  price: number | null
  total_area: number | null
  price_per_m2: number | null
  cover_url: string | null
  address_neighborhood: string | null
  views: number
  unique_visitors: number
  clicks: number
  gallery_opens: number
  contact_opens: number
  contact_submits: number
  whatsapp_clicks: number
  leads_count: number
  conversion_rate: number
  days_on_market: number
  published_at: string | null
}

export interface PortfolioOverview {
  total_properties: number
  active_properties: number
  total_views: number
  total_leads: number
  avg_conversion_rate: number
  top_property: { title: string; views: number } | null
}

export interface DailyPoint {
  date: string
  views: number
  clicks: number
  leads: number
}

export interface PropertyDetail {
  summary: PropertyStat
  daily: DailyPoint[]
  sources: { source: string; views: number }[]
  top_events: { event_type: string; count: number }[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function daysBetween(from: string | null): number {
  if (!from) return 0
  const ms = Date.now() - new Date(from).getTime()
  return Math.max(Math.floor(ms / 86400000), 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO OVERVIEW (KPIs globais)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPortfolioOverview(
  supabase: SupabaseClient,
  orgId: string,
  days: number
): Promise<PortfolioOverview> {
  const since = daysAgo(days)

  const [propertiesRes, eventsRes, leadsRes] = await Promise.all([
    supabase
      .from('properties')
      .select('id, status')
      .eq('org_id', orgId),
    supabase
      .from('property_events')
      .select('property_id, event_type, visitor_id')
      .eq('org_id', orgId)
      .eq('event_type', 'view')
      .gte('created_at', since),
    supabase
      .from('site_leads')
      .select('property_id')
      .eq('org_id', orgId)
      .not('property_id', 'is', null)
      .gte('created_at', since),
  ])

  const properties = propertiesRes.data || []
  const events = eventsRes.data || []
  const leads = leadsRes.data || []

  const totalViews = events.length
  const totalLeads = leads.length

  // Top property by views
  const viewsByProperty: Record<string, number> = {}
  events.forEach(e => {
    viewsByProperty[e.property_id] = (viewsByProperty[e.property_id] || 0) + 1
  })

  let topProperty: PortfolioOverview['top_property'] = null
  if (Object.keys(viewsByProperty).length > 0) {
    const topId = Object.entries(viewsByProperty).sort((a, b) => b[1] - a[1])[0]
    const { data: prop } = await supabase
      .from('properties')
      .select('title')
      .eq('id', topId[0])
      .single()
    if (prop) topProperty = { title: prop.title, views: topId[1] }
  }

  const activeCount = properties.filter(p => p.status === 'active').length
  const avgConversion = totalViews > 0 ? (totalLeads / totalViews) * 100 : 0

  return {
    total_properties: properties.length,
    active_properties: activeCount,
    total_views: totalViews,
    total_leads: totalLeads,
    avg_conversion_rate: Math.round(avgConversion * 10) / 10,
    top_property: topProperty,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY STATS (todos os imóveis com métricas)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPropertyStats(
  supabase: SupabaseClient,
  orgId: string,
  days: number
): Promise<PropertyStat[]> {
  const since = daysAgo(days)

  const [propertiesRes, eventsRes, leadsRes] = await Promise.all([
    supabase
      .from('properties')
      .select('id, title, slug, status, property_type, transaction_type, price, total_area, images, address_neighborhood, published_at')
      .eq('org_id', orgId)
      .order('published_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('property_events')
      .select('property_id, event_type, visitor_id')
      .eq('org_id', orgId)
      .gte('created_at', since),
    supabase
      .from('site_leads')
      .select('property_id')
      .eq('org_id', orgId)
      .not('property_id', 'is', null)
      .gte('created_at', since),
  ])

  const properties = propertiesRes.data || []
  const events = eventsRes.data || []
  const leads = leadsRes.data || []

  // Aggregate events by property
  const eventMap: Record<string, Record<string, number>> = {}
  const visitorMap: Record<string, Set<string>> = {}

  events.forEach(e => {
    if (!eventMap[e.property_id]) eventMap[e.property_id] = {}
    eventMap[e.property_id][e.event_type] = (eventMap[e.property_id][e.event_type] || 0) + 1

    if (e.event_type === 'view' && e.visitor_id) {
      if (!visitorMap[e.property_id]) visitorMap[e.property_id] = new Set()
      visitorMap[e.property_id].add(e.visitor_id)
    }
  })

  // Leads per property
  const leadsMap: Record<string, number> = {}
  leads.forEach(l => {
    if (l.property_id) leadsMap[l.property_id] = (leadsMap[l.property_id] || 0) + 1
  })

  return properties.map(p => {
    const pe = eventMap[p.id] || {}
    const views = pe['view'] || 0
    const leadsCount = leadsMap[p.id] || 0
    const cover = p.images?.find((img: any) => img.is_cover)?.url || p.images?.[0]?.url || null

    return {
      property_id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      property_type: p.property_type,
      transaction_type: p.transaction_type,
      price: p.price,
      total_area: p.total_area,
      price_per_m2: p.price && p.total_area ? Math.round(p.price / p.total_area) : null,
      cover_url: cover,
      address_neighborhood: p.address_neighborhood,
      views,
      unique_visitors: visitorMap[p.id]?.size || 0,
      clicks: pe['click'] || 0,
      gallery_opens: pe['gallery_open'] || 0,
      contact_opens: pe['contact_open'] || 0,
      contact_submits: pe['contact_submit'] || 0,
      whatsapp_clicks: pe['whatsapp_click'] || 0,
      leads_count: leadsCount,
      conversion_rate: views > 0 ? Math.round((leadsCount / views) * 1000) / 10 : 0,
      days_on_market: daysBetween(p.published_at),
      published_at: p.published_at,
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY VIEWS (série temporal para gráfico)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getDailyViews(
  supabase: SupabaseClient,
  orgId: string,
  days: number,
  propertyId?: string
): Promise<DailyPoint[]> {
  const since = daysAgo(days)

  let eventsQuery = supabase
    .from('property_events')
    .select('event_type, created_at')
    .eq('org_id', orgId)
    .in('event_type', ['view', 'click'])
    .gte('created_at', since)

  if (propertyId) {
    eventsQuery = eventsQuery.eq('property_id', propertyId)
  }

  let leadsQuery = supabase
    .from('site_leads')
    .select('created_at, property_id')
    .eq('org_id', orgId)
    .not('property_id', 'is', null)
    .gte('created_at', since)

  if (propertyId) {
    leadsQuery = leadsQuery.eq('property_id', propertyId)
  }

  const [eventsRes, leadsRes] = await Promise.all([eventsQuery, leadsQuery])

  const events = eventsRes.data || []
  const leads = leadsRes.data || []

  // Build date map
  const map: Record<string, DailyPoint> = {}

  // Initialize all days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    map[key] = { date: key, views: 0, clicks: 0, leads: 0 }
  }

  events.forEach(e => {
    const key = e.created_at.slice(0, 10)
    if (map[key]) {
      if (e.event_type === 'view') map[key].views++
      if (e.event_type === 'click') map[key].clicks++
    }
  })

  leads.forEach(l => {
    const key = l.created_at.slice(0, 10)
    if (map[key]) map[key].leads++
  })

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
}
