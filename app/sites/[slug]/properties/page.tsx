// app/sites/[slug]/properties/page.tsx
// Listagem pública de imóveis com filtros — SSR + Client filters

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import PropertyCard from '../components/PropertyCard'
import PropertyFilters from './PropertyFilters'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SearchParams {
  type?: string
  transaction?: string
  min_price?: string
  max_price?: string
  min_bedrooms?: string
  page?: string
}

async function getData(slug: string, searchParams: SearchParams) {
  // Site settings
  const { data: site } = await supabase
    .from('site_settings')
    .select('org_id, slug, site_name, currency')
    .eq('slug', slug)
    .single()

  if (!site) return null

  const page = parseInt(searchParams.page || '1')
  const limit = 12
  const offset = (page - 1) * limit

  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .eq('org_id', site.org_id)
    .eq('status', 'active')

  if (searchParams.type) query = query.eq('property_type', searchParams.type)
  if (searchParams.transaction) query = query.eq('transaction_type', searchParams.transaction)
  if (searchParams.min_price) query = query.gte('price', parseInt(searchParams.min_price))
  if (searchParams.max_price) query = query.lte('price', parseInt(searchParams.max_price))
  if (searchParams.min_bedrooms) query = query.gte('bedrooms', parseInt(searchParams.min_bedrooms))

  query = query
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data: properties, count } = await query

  return {
    site,
    properties: properties || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

export default async function PropertiesListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const data = await getData(slug, resolvedSearchParams)
  if (!data) notFound()

  const { site, properties, total, page, totalPages } = data

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-surface)' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Imóveis</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{total} {total === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <PropertyFilters slug={site.slug} />

        {/* Grid */}
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-6">
            {properties.map((prop: any) => (
              <PropertyCard key={prop.id} property={prop} slug={site.slug} currency={site.currency} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <svg width="48" height="48" className="mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Nenhum imóvel encontrado</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Tente mudar os filtros para ver mais resultados.</p>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {page > 1 && (
              <a
                href={`/sites/${site.slug}/properties?page=${page - 1}`}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
              >
                ← Anterior
              </a>
            )}
            <span className="px-4 py-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/sites/${site.slug}/properties?page=${page + 1}`}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
              >
                Próxima →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
