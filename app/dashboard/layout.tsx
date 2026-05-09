'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { SidebarProvider, useSidebar } from './SidebarContext'
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
  return (
    <SidebarProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </SidebarProvider>
  )
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const isMessagesPage = pathname?.startsWith('/dashboard/messages')
  const { user, loading, org, activePlanStatus, isStaff } = useAuth()
  const { collapsed } = useSidebar()

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

  // Atalho global "?" — abre WhatsApp de suporte (ignora dentro de input/textarea)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        window.open('https://wa.me/5551998388409', '_blank', 'noopener,noreferrer')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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

      {/* Conteúdo Principal — margem ajusta conforme sidebar colapsada */}
      <main
        className={`flex-1 pt-16 md:pt-0 h-full flex flex-col overflow-y-auto overflow-x-hidden transition-[margin] duration-300 ease-in-out ${
          collapsed ? 'md:ml-0' : 'md:ml-64'
        }`}
      >
        {/* Container interno com padding */}
        <div className="p-4 md:p-8 w-full min-h-full">
          {children}
        </div>
      </main>

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