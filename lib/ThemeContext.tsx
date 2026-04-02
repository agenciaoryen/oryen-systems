'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    // Lê preferência salva
    const saved = localStorage.getItem('oryen-theme') as Theme | null
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved)
      setThemeState(saved)
    }
  }, [])

  function applyTheme(t: Theme) {
    const html = document.documentElement
    html.classList.add('theme-transitioning')

    if (t === 'light') {
      html.setAttribute('data-theme', 'light')
    } else {
      html.removeAttribute('data-theme')
    }

    setTimeout(() => html.classList.remove('theme-transitioning'), 250)
  }

  function setTheme(t: Theme) {
    applyTheme(t)
    setThemeState(t)
    localStorage.setItem('oryen-theme', t)
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
