// app/sites/[slug]/page.tsx
// Homepage do site público do corretor — SSR

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PropertyCard from './components/PropertyCard'
import ContactForm from './components/ContactForm'
import HeroSearch from './components/HeroSearch'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getData(slug: string) {
  // Site settings
  const { data: site } = await supabase
    .from('site_settings')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!site) return null

  // Queries em paralelo
  const [featuredRes, latestRes, neighborhoodsRes] = await Promise.all([
    // Imóveis em destaque
    supabase
      .from('properties')
      .select('*')
      .eq('org_id', site.org_id)
      .eq('status', 'active')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(8),
    // Últimos imóveis
    supabase
      .from('properties')
      .select('*')
      .eq('org_id', site.org_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(4),
    // Bairros distintos
    supabase
      .from('properties')
      .select('address_neighborhood')
      .eq('org_id', site.org_id)
      .eq('status', 'active')
      .not('address_neighborhood', 'is', null),
  ])

  const neighborhoods = [...new Set(
    (neighborhoodsRes.data || [])
      .map((p: any) => p.address_neighborhood)
      .filter(Boolean)
  )].sort() as string[]

  return {
    site,
    featured: featuredRes.data || [],
    latest: latestRes.data || [],
    neighborhoods,
  }
}

export default async function SiteHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) notFound()

  const { site, featured, latest, neighborhoods } = data

  // Categorias para "Conforme sua necessidade"
  const categories = [
    { label: 'Apartamentos', icon: '🏢', href: `/sites/${slug}/properties?type=apartment` },
    { label: 'Casas', icon: '🏠', href: `/sites/${slug}/properties?type=house` },
    { label: 'Terrenos', icon: '🌳', href: `/sites/${slug}/properties?type=land` },
    { label: 'Comercial', icon: '🏪', href: `/sites/${slug}/properties?type=commercial` },
    { label: 'Para Alugar', icon: '🔑', href: `/sites/${slug}/properties?transaction=rent` },
    { label: 'Para Comprar', icon: '🏡', href: `/sites/${slug}/properties?transaction=sale` },
  ]

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, var(--site-primary) 0%, color-mix(in srgb, var(--site-primary) 70%, #000) 100%)` }} />
        {site.cover_image_url && (
          <div className="absolute inset-0">
            <img
              src={site.cover_image_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--color-bg-base), var(--color-bg-base)/60, var(--color-bg-base)/40)' }} />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            {site.tagline && (
              <p
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--site-accent)' }}
              >
                {site.tagline}
              </p>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4" style={{ color: site.hero_text_color || '#FFFFFF' }}>
              {site.site_name || 'Imóveis'}
            </h1>
            {site.bio && (
              <p className="text-lg mb-8 line-clamp-2" style={{ color: site.hero_text_color || '#FFFFFF', opacity: 0.75 }}>
                {site.bio}
              </p>
            )}

            {/* Barra de busca */}
            <HeroSearch slug={slug} neighborhoods={neighborhoods} />
          </div>
        </div>
      </section>

      {/* ═══ ÚLTIMOS IMÓVEIS ═══ */}
      {latest.length > 0 && (
        <section className="py-16 sm:py-20" style={{ background: 'var(--color-bg-elevated)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Últimos Imóveis</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Adicionados recentemente</p>
              </div>
              <Link
                href={`/sites/${slug}/properties`}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Ver todos
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {latest.map((prop: any) => (
                <PropertyCard key={prop.id} property={prop} slug={slug} currency={site.currency} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ IMÓVEIS EM DESTAQUE ═══ */}
      {featured.length > 0 && (
        <section className="py-16 sm:py-20" style={{ background: 'var(--color-bg-surface)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Imóveis em Destaque</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>As melhores oportunidades selecionadas</p>
              </div>
              <Link
                href={`/sites/${slug}/properties`}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Ver todos
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featured.map((prop: any) => (
                <PropertyCard key={prop.id} property={prop} slug={slug} currency={site.currency} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CONFORME SUA NECESSIDADE ═══ */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--color-bg-elevated)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Conforme sua Necessidade</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>Encontre o imóvel ideal para você</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl transition-all hover:scale-105"
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-sm font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOBRE O CORRETOR ═══ */}
      {(site.bio || site.avatar_url) && (
        <section className="py-16 sm:py-20" style={{ background: 'var(--color-bg-surface)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-8">
              {site.avatar_url && (
                <div className="shrink-0">
                  <img
                    src={site.avatar_url}
                    alt={site.site_name || 'Corretor'}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover shadow-lg"
                  />
                </div>
              )}
              <div className={site.avatar_url ? '' : 'text-center'}>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Sobre</h2>
                {site.creci && (
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                    CRECI {site.creci}
                  </p>
                )}
                <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{site.bio}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ LOCALIZAÇÃO ═══ */}
      {site.address && (
        <section className="py-16 sm:py-20" style={{ background: 'var(--color-bg-elevated)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Nossa Localização</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>{site.address}</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid var(--color-border-subtle)' }}>
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed`}
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização"
              />
            </div>
          </div>
        </section>
      )}

      {/* ═══ CONTATO ═══ */}
      <section id="contato" className="py-16 sm:py-20" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Entre em Contato</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Preencha o formulário e retornaremos em breve.</p>
            </div>

            <div className="rounded-2xl p-6 sm:p-8 shadow-sm" style={{ background: 'var(--color-bg-elevated)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)' }}>
              <ContactForm siteSlug={site.slug} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
