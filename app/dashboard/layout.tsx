'use client'

import React from 'react'
import Sidebar from './Sidebar'
import { Toaster } from 'sonner'
import { useTheme } from '@/lib/ThemeContext'
import { MessageCircle } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════
// Este layout envolve todas as páginas dentro de /dashboard/*
// Inclui a Sidebar (responsiva) e o container principal de conteúdo

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useTheme()

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>

      {/* Sidebar - Fixa no desktop, gaveta no mobile */}
      <Sidebar />

      {/* Conteúdo Principal */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 h-full flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Container interno com padding */}
        <div className="p-4 md:p-8 w-full min-h-full">
          {children}
        </div>
      </main>

      {/* Botão flutuante de suporte */}
      <a
        href="https://wa.me/5551998388409"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-105 active:scale-95"
        title="Suporte via WhatsApp"
      >
        <MessageCircle size={24} />
      </a>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        theme={theme}
        richColors
        toastOptions={{
          style: {
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          },
        }}
      />

    </div>
  )
}