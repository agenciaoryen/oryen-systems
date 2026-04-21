'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { Toaster } from 'sonner'
import { useTheme } from '@/lib/ThemeContext'
import { useAuth } from '@/lib/AuthContext'
import { Loader2 } from 'lucide-react'

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
  const pathname = usePathname()
  const isMessagesPage = pathname?.startsWith('/dashboard/messages')
  const { user, loading, org, activePlanStatus, isStaff } = useAuth()

  // Trial sem subscription = usuário ainda não fez checkout no Stripe
  // Trial COM subscription = Stripe trial_period_days válido → libera dashboard
  const needsCheckout = activePlanStatus === 'trial' && !org?.billing_subscription_id

  // Guard: não logado → login
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  // Guard: usuário com org mas sem pagamento → onboarding
  useEffect(() => {
    if (!loading && user && org && needsCheckout && !isStaff) {
      router.replace('/onboarding')
    }
  }, [loading, user, org, needsCheckout, isStaff, router])

  // Mostrar loading enquanto verifica
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    )
  }

  // Se não logado, mostrar loading enquanto redireciona
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    )
  }

  // Se precisa fazer checkout (trial sem subscription), não renderiza o dashboard
  if (user && org && needsCheckout && !isStaff) {
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

      {/* Botão flutuante de suporte — WhatsApp */}
      <a
        href="https://wa.me/5551998388409"
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isMessagesPage ? 'hidden md:flex' : ''}`}
        style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)' }}
        title="Suporte via WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
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