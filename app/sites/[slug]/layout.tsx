// app/sites/[slug]/layout.tsx
// Layout público do site do corretor — sem AuthProvider, SSR

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import WhatsAppButton from './components/WhatsAppButton'
import CookieConsent from './components/CookieConsent'
import SiteThemeLock from './components/SiteThemeLock'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSiteSettings(slug: string) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error(`[Site] Error fetching site "${slug}":`, error.message)
  } else {
    console.log(`[Site] Found site "${slug}": ${data?.site_name || 'no name'}`)
  }

  return data
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const site = await getSiteSettings(slug)
  if (!site) return {}

  return {
    title: site.meta_title || site.site_name || 'Imóveis',
    description: site.meta_description || site.tagline || '',
    openGraph: {
      title: site.meta_title || site.site_name || 'Imóveis',
      description: site.meta_description || site.tagline || '',
      images: site.og_image_url ? [{ url: site.og_image_url }] : [],
    },
  }
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const site = await getSiteSettings(slug)

  if (!site) {
    notFound()
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        '--site-primary': site.primary_color || '#4B6BFB',
        '--site-accent': site.accent_color || '#F0A030',
      } as React.CSSProperties}
    >
      <SiteThemeLock theme={site.site_theme || 'dark'} />
      <SiteHeader site={site} />
      <main className="flex-1">
        {children}
      </main>
      <SiteFooter site={site} />
      {site.whatsapp && <WhatsAppButton phone={site.whatsapp} />}
      <CookieConsent />
    </div>
  )
}
