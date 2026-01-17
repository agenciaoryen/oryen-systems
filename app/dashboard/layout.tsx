'use client'

import React from 'react'
import Sidebar from './Sidebar'
import { Toaster } from 'sonner' // <--- 1. Importação da Sonner

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* Mantemos h-screen e overflow-hidden no container pai para 
       que a Sidebar fique sempre "presa" na lateral esquerda.
    */
    <div className="flex h-screen w-full bg-[#0A0A0A] overflow-hidden">
      
      {/* Sidebar - Fixa na lateral */}
      <Sidebar />

      {/* Conteúdo Principal (Main) 
          Mudança: overflow-y-auto permite rolar para baixo.
          Mudança: overflow-x-hidden impede o balanço lateral.
      */}
      <main className="flex-1 ml-64 h-full flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Adicionamos um container interno com padding para que 
            o conteúdo não cole nas bordas e tenha espaço para respirar.
        */}
        <div className="p-4 md:p-8 w-full">
          {children}
        </div>
      </main>

      {/* 2. Componente Toaster:
         Fica aqui "escondido", esperando ser chamado pelo Sidebar.
         - position: onde o balão aparece.
         - theme: dark (para combinar com o Oryen).
         - richColors: para usar verde (sucesso) e vermelho (erro) bonitos.
      */}
      <Toaster position="bottom-right" theme="dark" richColors />
      
    </div>
  )
}