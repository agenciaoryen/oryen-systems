// app/sites/[slug]/layout.tsx
// Layout público do site do corretor — sem AuthProvider, SSR

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import WhatsAppButton from './components/WhatsAppButton'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSiteSettings(slug: string) {
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getSiteSettings(params.slug)
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
  params: { slug: string }
}) {
  const site = await getSiteSettings(params.slug)

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
      <SiteHeader site={site} />
      <main className="flex-1">
        {children}
      </main>
      <SiteFooter site={site} />
      {site.whatsapp && <WhatsAppButton phone={site.whatsapp} />}
    </div>
  )
}
