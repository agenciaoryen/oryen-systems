// app/sites/[slug]/properties/[propertySlug]/page.tsx
// Detalhe do imóvel — SSR com SEO completo

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { formatPrice, formatArea, PROPERTY_TYPES, TRANSACTION_TYPES, AMENITIES } from '@/lib/properties/constants'
import ContactForm from '../../components/ContactForm'
import PropertyCard from '../../components/PropertyCard'
import PropertyGallery from './PropertyGallery'
import PropertyViewTracker from './PropertyViewTracker'
import PropertyMap from '../../components/PropertyMap'
import BackButton from './BackButton'
import { SITE_T, getSiteLang } from '../../i18n'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getData(slug: string, propertySlug: string) {
  // Site settings
  const { data: site } = await supabase
    .from('site_settings')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!site) return null

  // Imóvel — buscar por slug ou por ID
  let query = supabase
    .from('properties')
    .select('*')
    .eq('org_id', site.org_id)
    .eq('status', 'active')

  // Tenta por slug primeiro, depois por ID
  const { data: bySlug } = await query.eq('slug', propertySlug).single()
  const property = bySlug || (await supabase.from('properties').select('*').eq('id', propertySlug).eq('org_id', site.org_id).eq('status', 'active').single()).data

  if (!property) return null

  // Imóveis relacionados (mesmo tipo ou bairro, excluindo o atual)
  const { data: related } = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', site.org_id)
    .eq('status', 'active')
    .neq('id', property.id)
    .or(`property_type.eq.${property.property_type},address_neighborhood.eq.${property.address_neighborhood || '___'}`)
    .order('is_featured', { ascending: false })
    .limit(3)

  return { site, property, related: related || [] }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; propertySlug: string }> }): Promise<Metadata> {
  const { slug, propertySlug } = await params
  const data = await getData(slug, propertySlug)
  if (!data) return {}

  const { property, site } = data
  const cover = property.images?.find((img: any) => img.is_cover)?.url || property.images?.[0]?.url
  const mLang = getSiteLang(site)
  const mT = SITE_T[mLang]

  return {
    title: `${property.title} | ${site.site_name || mT.defaultSiteName}`,
    description: property.description?.slice(0, 160) || `${PROPERTY_TYPES[property.property_type]?.[mLang]} - ${formatPrice(property.price, site.currency)}`,
    openGraph: {
      title: property.title,
      description: property.description?.slice(0, 160) || '',
      images: cover ? [{ url: cover }] : [],
    },
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string; propertySlug: string }>
}) {
  const { slug, propertySlug } = await params
  const data = await getData(slug, propertySlug)
  if (!data) notFound()

  const { site, property, related } = data
  const lang = getSiteLang(site)
  const t = SITE_T[lang]
  const cover = property.images?.find((img: any) => img.is_cover)?.url || property.images?.[0]?.url

  // Amenidades com labels
  const amenityLabels = (property.amenities || [])
    .map((key: string) => AMENITIES.find(a => a.key === key)?.label?.[lang])
    .filter(Boolean)

  // Endereço formatado
  const addressParts = [property.address_neighborhood, property.address_city, property.address_state].filter(Boolean)
  const addressFull = addressParts.join(', ')

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/sites/${slug}/properties/${property.slug || property.id}`,
    image: cover,
    offers: property.price ? {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'BRL',
    } : undefined,
  }

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Tracking de view */}
      <PropertyViewTracker siteSlug={slug} propertyId={property.id} />

      <div style={{ background: 'var(--color-bg-elevated)' }}>
        {/* ═══ BOTÃO VOLTAR ═══ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <BackButton fallbackHref={`/sites/${slug}/properties`} label={t.backLabel} />
        </div>

        {/* ═══ GALERIA ═══ */}
        {property.images && property.images.length > 0 && (
          <PropertyGallery images={property.images} title={property.title} siteSlug={slug} propertyId={property.id} lang={lang} />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ═══ COLUNA PRINCIPAL ═══ */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--site-primary)', color: 'var(--color-text-on-primary)' }}
                  >
                    {TRANSACTION_TYPES[property.transaction_type]?.[lang]}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {PROPERTY_TYPES[property.property_type]?.[lang]}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {property.title}
                </h1>
                {addressFull && (
                  <p className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {addressFull}
                  </p>
                )}
              </div>

              {/* Preço + Features */}
              <div className="rounded-2xl p-6" style={{ background: 'var(--color-bg-surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)' }}>
                {property.price && (
                  <p className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPrice(property.price, site.currency)}
                    {property.transaction_type === 'rent' && <span className="text-sm font-normal" style={{ color: 'var(--color-text-secondary)' }}>{t.detailPerMonth}</span>}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {property.bedrooms > 0 && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{property.bedrooms}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{property.bedrooms === 1 ? t.detailBedroom : t.detailBedrooms}</p>
                    </div>
                  )}
                  {property.suites > 0 && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{property.suites}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{property.suites === 1 ? t.detailSuite : t.detailSuites}</p>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{property.bathrooms}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{property.bathrooms === 1 ? t.detailBathroom : t.detailBathrooms}</p>
                    </div>
                  )}
                  {property.parking_spots > 0 && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{property.parking_spots}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{property.parking_spots === 1 ? t.detailParking : t.detailParkingPlural}</p>
                    </div>
                  )}
                </div>

                {/* Áreas + Valores extras */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  {property.total_area && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatArea(property.total_area)}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t.detailTotalArea}</p>
                    </div>
                  )}
                  {property.private_area && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatArea(property.private_area)}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t.detailPrivateArea}</p>
                    </div>
                  )}
                  {property.condo_fee && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatPrice(property.condo_fee, site.currency)}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t.detailCondoFee}</p>
                    </div>
                  )}
                  {property.iptu && (
                    <div className="text-center p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatPrice(property.iptu, site.currency)}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t.detailIptu}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Descrição */}
              {property.description && (
                <div>
                  <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t.detailDescription}</h2>
                  <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{property.description}</p>
                </div>
              )}

              {/* Amenidades */}
              {amenityLabels.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t.detailFeatures}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {amenityLabels.map((label: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-2" style={{ color: 'var(--color-text-secondary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" style={{ color: 'var(--color-success)' }}>
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapa */}
              <PropertyMap
                latitude={property.latitude}
                longitude={property.longitude}
                address={[property.address_street, property.address_neighborhood, property.address_city, property.address_state].filter(Boolean).join(', ') || null}
                title={property.title}
                lang={lang}
              />

              {/* Vídeo */}
              {property.video_url && (
                <div>
                  <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t.detailVideo}</h2>
                  <a
                    href={property.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
                    style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.detailWatchVideo}
                  </a>
                </div>
              )}
            </div>

            {/* ═══ SIDEBAR — CONTATO ═══ */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-2xl p-6 shadow-sm" style={{ background: 'var(--color-bg-elevated)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)' }}>
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t.detailSidebarTitle}</h3>
                <p className="text-xs mb-5" style={{ color: 'var(--color-text-secondary)' }}>{t.detailSidebarHint}</p>
                <ContactForm
                  siteSlug={site.slug}
                  propertyId={property.id}
                  propertyTitle={property.title}
                  lang={lang}
                />
              </div>
            </div>
          </div>

          {/* ═══ IMÓVEIS RELACIONADOS ═══ */}
          {related.length > 0 && (
            <div className="mt-16 pt-10" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>{t.detailRelated}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((prop: any) => (
                  <PropertyCard key={prop.id} property={prop} slug={site.slug} currency={site.currency} lang={lang} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
