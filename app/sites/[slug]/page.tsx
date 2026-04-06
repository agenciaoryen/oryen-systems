// app/sites/[slug]/page.tsx
// Homepage do site público do corretor — SSR

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PropertyCard from './components/PropertyCard'
import ContactForm from './components/ContactForm'

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

  // Imóveis em destaque (featured first, then recent active)
  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', site.org_id)
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8)

  return { site, properties: properties || [] }
}

export default async function SiteHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) notFound()

  const { site, properties } = data

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0" style={{ background: 'var(--gradient-brand)' }} />
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            {site.tagline && (
              <p
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--site-accent)' }}
              >
                {site.tagline}
              </p>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: 'var(--color-text-primary)' }}>
              {site.site_name || 'Imóveis'}
            </h1>
            {site.bio && (
              <p className="text-lg mb-8 line-clamp-3" style={{ color: 'var(--color-text-tertiary)' }}>
                {site.bio}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/sites/${site.slug}/properties`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 shadow-lg"
                style={{ background: 'var(--site-primary)', color: 'var(--color-text-primary)' }}
              >
                Ver Todos os Imóveis
              </Link>
              <a
                href="#contato"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold backdrop-blur-sm transition-all"
                style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg-hover)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border-subtle)' }}
              >
                Fale Comigo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ IMÓVEIS EM DESTAQUE ═══ */}
      {properties.length > 0 && (
        <section className="py-16 sm:py-20" style={{ background: 'var(--color-bg-surface)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Imóveis em Destaque</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Confira as melhores oportunidades</p>
              </div>
              <Link
                href={`/sites/${site.slug}/properties`}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: 'var(--site-primary)' }}
              >
                Ver todos
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {properties.map((prop: any) => (
                <PropertyCard key={prop.id} property={prop} slug={site.slug} currency={site.currency} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href={`/sites/${site.slug}/properties`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--site-primary)', color: 'var(--color-text-primary)' }}
              >
                Ver Todos os Imóveis
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SOBRE O CORRETOR ═══ */}
      {(site.bio || site.avatar_url) && (
        <section className="py-16 sm:py-20" style={{ background: 'var(--color-bg-elevated)' }}>
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

      {/* ═══ CONTATO ═══ */}
      <section id="contato" className="py-16 sm:py-20" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Entre em Contato</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Preencha o formulário e retornaremos em breve.</p>
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
