'use client'

import React from 'react'
import Sidebar from './Sidebar'
import { Toaster } from 'sonner'

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
  return (
    <div className="flex h-screen w-full bg-[#0A0A0A] overflow-hidden">
      
      {/* Sidebar - Fixa no desktop, gaveta no mobile */}
      <Sidebar />

      {/* Conteúdo Principal */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 h-full flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Container interno com padding */}
        <div className="p-4 md:p-8 w-full min-h-full">
          {children}
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster 
        position="bottom-right" 
        theme="dark" 
        richColors 
        toastOptions={{
          style: {
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      
    </div>
  )
}