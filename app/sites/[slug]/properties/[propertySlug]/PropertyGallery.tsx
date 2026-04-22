// Site público — Galeria de fotos com lightbox
'use client'

import { useEffect, useState } from 'react'
import { trackPropertyEvent } from '@/lib/properties/tracker'
import { SITE_T, type SiteLang } from '../../i18n'

interface PropertyGalleryProps {
  images: { url: string; order: number; caption?: string; is_cover?: boolean }[]
  title: string
  siteSlug?: string
  propertyId?: string
  lang?: SiteLang
}

export default function PropertyGallery({ images, title, siteSlug, propertyId, lang = 'pt' }: PropertyGalleryProps) {
  const t = SITE_T[lang]
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const sorted = [...images].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return a.order - b.order
  })

  const openLightbox = (index: number) => {
    setActiveIndex(index)
    setLightboxOpen(true)
    if (siteSlug && propertyId) {
      trackPropertyEvent(siteSlug, propertyId, 'gallery_open', { image_index: index })
    }
  }

  const navigate = (dir: number) => {
    setActiveIndex((prev) => {
      const next = prev + dir
      if (next < 0) return sorted.length - 1
      if (next >= sorted.length) return 0
      return next
    })
  }

  // Navegação por teclado + lock do scroll do body
  useEffect(() => {
    if (!lightboxOpen) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowLeft') navigate(-1)
      else if (e.key === 'ArrowRight') navigate(1)
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxOpen])

  // Estilo comum dos botões de controle do lightbox (alto contraste)
  const controlButtonStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.55)',
    color: '#fff',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  }

  return (
    <>
      {/* Grid de fotos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {sorted.length === 1 ? (
          <div
            className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[16/7]"
            style={{ background: 'var(--color-bg-surface)' }}
            onClick={() => openLightbox(0)}
          >
            <img
              src={sorted[0].url}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Ícone de expandir — canto superior direito */}
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all opacity-90 group-hover:opacity-100"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {t.detailZoom}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden max-h-[500px]">
            {/* Principal */}
            <div
              className="group col-span-4 sm:col-span-2 row-span-2 cursor-pointer relative overflow-hidden"
              style={{ background: 'var(--color-bg-surface)' }}
              onClick={() => openLightbox(0)}
            >
              <img
                src={sorted[0].url}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Badge "Ver N fotos" — sempre visível no canto */}
              <div
                className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', backdropFilter: 'blur(8px)' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t.detailSeePhotos.replace('{{count}}', String(sorted.length))}
              </div>
            </div>
            {/* Secundárias */}
            {sorted.slice(1, 5).map((img, i) => (
              <div
                key={i}
                className="group hidden sm:block cursor-pointer relative overflow-hidden"
                style={{ background: 'var(--color-bg-surface)' }}
                onClick={() => openLightbox(i + 1)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {i === 3 && sorted.length > 5 && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center transition-all"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
                  >
                    <span className="font-bold text-2xl" style={{ color: '#fff' }}>+{sorted.length - 5}</span>
                    <span className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{t.photosWord}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botão ver todas */}
        {sorted.length > 1 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => openLightbox(0)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)';
                (e.currentTarget as HTMLElement).style.color = '#fff';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(90, 122, 230, 0.25)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t.detailSeeAllPhotos.replace('{{count}}', String(sorted.length))}
            </button>
          </div>
        )}
      </div>

      {/* ═══ LIGHTBOX ═══ */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.92)' }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Fechar */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false) }}
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full z-10 transition-all hover:scale-110"
            style={controlButtonStyle}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.85)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.55)' }}
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Contador */}
          <div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {activeIndex + 1} / {sorted.length}
          </div>

          {/* Navegação */}
          {sorted.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(-1) }}
                className="absolute left-4 w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-110"
                style={controlButtonStyle}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.85)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.55)' }}
                aria-label="Anterior"
                title="Anterior (←)"
              >
                <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(1) }}
                className="absolute right-4 w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-110"
                style={controlButtonStyle}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.85)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.55)' }}
                aria-label="Próximo"
                title="Próximo (→)"
              >
                <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Imagem */}
          <img
            src={sorted[activeIndex].url}
            alt={`${title} - ${activeIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => { e.stopPropagation(); navigate(1) }}
          />
        </div>
      )}
    </>
  )
}
