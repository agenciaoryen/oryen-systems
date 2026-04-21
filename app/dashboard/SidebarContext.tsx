'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Ctx = {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<Ctx | null>(null)

const STORAGE_KEY = 'oryen-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === '1') setCollapsedState(true)
    } catch {}
  }, [])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0') } catch {}
  }

  const toggle = () => setCollapsed(!collapsed)

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
