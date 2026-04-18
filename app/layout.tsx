import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono, Orbitron } from "next/font/google"
import "./globals.css"

import { AuthProvider } from "@/lib/AuthContext"
import { ThemeProvider } from "@/lib/ThemeContext"

// ═══════════════════════════════════════════════════════════════════════════════
// FONTES
// ═══════════════════════════════════════════════════════════════════════════════

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
})

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: {
    default: "Oryen - IA para Corretores de Imóveis",
    template: "%s | Oryen"
  },
  description: "Automatize o atendimento, qualifique contatos e feche mais negócios com agentes de IA para imobiliárias.",
  keywords: ["CRM imobiliário", "corretor de imóveis", "automação WhatsApp", "inteligência artificial", "imobiliária", "agentes de IA"],
  authors: [{ name: "Oryen" }],
  creator: "Oryen",
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#06060C",
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Anti-flash: lê preferência de tema antes da hidratação.
            Em sites públicos (/sites/*), o tema é controlado pelo dono do site e não deve herdar o do dashboard. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (!location.pathname.startsWith('/sites/')) {
                  var t = localStorage.getItem('oryen-theme');
                  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
