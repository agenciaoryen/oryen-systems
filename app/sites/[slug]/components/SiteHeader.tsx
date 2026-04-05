// Site público — Header

import Link from 'next/link'

interface SiteHeaderProps {
  site: any
}

export default function SiteHeader({ site }: SiteHeaderProps) {
  const slug = site.slug

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Nome */}
          <Link href={`/sites/${slug}`} className="flex items-center gap-3">
            {site.logo_url ? (
              <img src={site.logo_url} alt={site.site_name || ''} className="h-8 w-auto" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'var(--site-primary)' }}
              >
                {(site.site_name || 'S')[0].toUpperCase()}
              </div>
            )}
            <span className="font-bold text-gray-900 text-lg">
              {site.site_name || 'Imóveis'}
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link
              href={`/sites/${slug}`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Início
            </Link>
            <Link
              href={`/sites/${slug}/properties`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Imóveis
            </Link>
            <Link
              href={`/sites/${slug}#contato`}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
              style={{ background: 'var(--site-primary)' }}
            >
              Contato
            </Link>
          </nav>

          {/* Mobile menu button */}
          <Link
            href={`/sites/${slug}/properties`}
            className="sm:hidden px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--site-primary)' }}
          >
            Ver Imóveis
          </Link>
        </div>
      </div>
    </header>
  )
}
