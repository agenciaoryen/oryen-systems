'use client'

import { useEffect } from 'react'

/**
 * Força o tema dark no site público, independente da escolha do usuário no dashboard.
 * Remove data-theme="light" do <html> ao montar e restaura ao desmontar.
 */
export default function ForceDarkTheme() {
  useEffect(() => {
    const html = document.documentElement
    const savedTheme = html.getAttribute('data-theme')

    // Forçar dark (remover atributo light)
    if (savedTheme === 'light') {
      html.removeAttribute('data-theme')
    }

    return () => {
      // Restaurar tema original ao sair do site público
      if (savedTheme) {
        html.setAttribute('data-theme', savedTheme)
      }
    }
  }, [])

  return null
}
