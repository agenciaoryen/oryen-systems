// Site público — Galeria de fotos com lightbox
'use client'

import { useState } from 'react'

interface PropertyGalleryProps {
  images: { url: string; order: number; caption?: string; is_cover?: boolean }[]
  title: string
}

export default function PropertyGallery({ images, title }: PropertyGalleryProps) {
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
  }

  const navigate = (dir: number) => {
    setActiveIndex((prev) => {
      const next = prev + dir
      if (next < 0) return sorted.length - 1
      if (next >= sorted.length) return 0
      return next
    })
  }

  return (
    <>
      {/* Grid de fotos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {sorted.length === 1 ? (
          <div
            className="rounded-2xl overflow-hidden cursor-pointer aspect-[16/7]"
            style={{ background: 'var(--color-bg-surface)' }}
            onClick={() => openLightbox(0)}
          >
            <img src={sorted[0].url} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden max-h-[500px]">
            {/* Principal */}
            <div
              className="col-span-4 sm:col-span-2 row-span-2 cursor-pointer"
              style={{ background: 'var(--color-bg-surface)' }}
              onClick={() => openLightbox(0)}
            >
              <img src={sorted[0].url} alt={title} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </div>
            {/* Secundárias */}
            {sorted.slice(1, 5).map((img, i) => (
              <div
                key={i}
                className="hidden sm:block cursor-pointer relative"
                style={{ background: 'var(--color-bg-surface)' }}
                onClick={() => openLightbox(i + 1)}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                {i === 3 && sorted.length > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--color-bg-overlay)' }}>
                    <span className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>+{sorted.length - 5}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botão ver todas */}
        {sorted.length > 1 && (
          <button
            onClick={() => openLightbox(0)}
            className="mt-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Ver todas as {sorted.length} fotos
          </button>
        )}
      </div>

      {/* ═══ LIGHTBOX ═══ */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'var(--color-bg-overlay)' }}>
          {/* Fechar */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 transition-colors z-10 hover:opacity-80"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Contador */}
          <div className="absolute top-4 left-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {activeIndex + 1} / {sorted.length}
          </div>

          {/* Navegação */}
          {sorted.length > 1 && (
            <>
              <button
                onClick={() => navigate(-1)}
                className="absolute left-4 p-3 transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navigate(1)}
                className="absolute right-4 p-3 transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Imagem */}
          <img
            src={sorted[activeIndex].url}
            alt={`${title} - ${activeIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={() => navigate(1)}
          />
        </div>
      )}
    </>
  )
}
