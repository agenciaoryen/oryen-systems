'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import { Toaster } from 'sonner'
import { useTheme } from '@/lib/ThemeContext'
import { useAuth } from '@/lib/AuthContext'
import { MessageCircle, Loader2 } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════
// Este layout envolve todas as páginas dentro de /dashboard/*
// Inclui a Sidebar (responsiva) e o container principal de conteúdo
// Guard: redireciona para /onboarding se plan_status é 'trial' (não pagou)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useTheme()
  const router = useRouter()
  const { user, loading, org, activePlanStatus, isStaff } = useAuth()

  // Guard: usuário com org mas sem pagamento → onboarding
  useEffect(() => {
    if (!loading && user && org && activePlanStatus === 'trial' && !isStaff) {
      router.replace('/onboarding')
    }
  }, [loading, user, org, activePlanStatus, isStaff, router])

  // Mostrar loading enquanto verifica
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    )
  }

  // Se plan_status é trial e não é staff, não renderiza o dashboard
  if (user && org && activePlanStatus === 'trial' && !isStaff) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    )
  }

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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: 'var(--color-success)', color: '#fff', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)' }}
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