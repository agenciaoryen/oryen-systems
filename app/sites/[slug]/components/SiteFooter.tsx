// Site público — Footer

import Link from 'next/link'

interface SiteFooterProps {
  site: any
}

function buildSocialUrl(platform: string, value: string): string {
  if (!value) return ''
  // Se já é URL completa, retornar como está
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  // Remover @ do início se houver
  const handle = value.replace(/^@/, '')
  const bases: Record<string, string> = {
    instagram: `https://instagram.com/${handle}`,
    facebook: `https://facebook.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    youtube: `https://youtube.com/@${handle}`,
    tiktok: `https://tiktok.com/@${handle}`,
  }
  return bases[platform] || value
}

export default function SiteFooter({ site }: SiteFooterProps) {
  const social = site.social_links || {}

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Sobre */}
          <div className="sm:col-span-2">
            <h3 className="text-white font-bold text-lg mb-2">{site.site_name || 'Imóveis'}</h3>
            {site.tagline && <p className="text-sm mb-3">{site.tagline}</p>}
            {site.creci && <p className="text-xs">CRECI: {site.creci}</p>}
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Contato</h4>
            <ul className="space-y-2 text-sm">
              {site.phone && <li>{site.phone}</li>}
              {site.email && <li>{site.email}</li>}
              {site.address && <li>{site.address}</li>}
            </ul>
          </div>

          {/* Redes sociais */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Redes Sociais</h4>
            <div className="flex flex-wrap gap-3">
              {social.instagram && (
                <a href={buildSocialUrl('instagram', social.instagram)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm">
                  Instagram
                </a>
              )}
              {social.facebook && (
                <a href={buildSocialUrl('facebook', social.facebook)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm">
                  Facebook
                </a>
              )}
              {social.linkedin && (
                <a href={buildSocialUrl('linkedin', social.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm">
                  LinkedIn
                </a>
              )}
              {social.youtube && (
                <a href={buildSocialUrl('youtube', social.youtube)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm">
                  YouTube
                </a>
              )}
              {social.tiktok && (
                <a href={buildSocialUrl('tiktok', social.tiktok)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm">
                  TikTok
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} {site.site_name || 'Imóveis'}. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Feito com
            <a href="https://oryen.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Oryen
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
