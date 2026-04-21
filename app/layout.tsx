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
  metadataBase: new URL('https://oryen.agency'),
  title: {
    default: "Oryen - IA para Corretores de Imóveis",
    template: "%s | Oryen"
  },
  description: "Automatize o atendimento, qualifique contatos e feche mais negócios com agentes de IA para imobiliárias.",
  keywords: ["CRM imobiliário", "corretor de imóveis", "automação WhatsApp", "inteligência artificial", "imobiliária", "agentes de IA"],
  authors: [{ name: "Oryen" }],
  creator: "Oryen",
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://oryen.agency',
    siteName: 'Oryen',
    title: 'Oryen — IA para Corretores de Imóveis',
    description: 'Automatize o atendimento, qualifique contatos e feche mais negócios com agentes de IA para imobiliárias.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oryen — IA para Corretores de Imóveis',
    description: 'Automatize o atendimento, qualifique contatos e feche mais negócios com agentes de IA para imobiliárias.',
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
    <html lang="pt-BR" translate="no" suppressHydrationWarning>
      <head>
        {/* Interceptador de auth: magic link, recovery e confirm chegam com
            #access_token=... ou ?code=... Se o user cair em qualquer rota que
            NÃO é /auth/callback ou /reset-password/update, redireciona pra
            página que sabe processar os tokens. Roda ANTES da hidratação. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var p = location.pathname;
                var h = location.hash || '';
                var s = location.search || '';
                var isAuthPath = p === '/auth/callback' || p === '/reset-password/update';
                var hasHashTokens = h.indexOf('access_token=') !== -1 || h.indexOf('error_code=') !== -1 || h.indexOf('type=recovery') !== -1 || h.indexOf('type=magiclink') !== -1 || h.indexOf('type=signup') !== -1;
                var hasCode = /[?&]code=/.test(s);
                if (!isAuthPath && (hasHashTokens || hasCode)) {
                  var isRecovery = h.indexOf('type=recovery') !== -1;
                  var target = isRecovery ? '/reset-password/update' : '/auth/callback';
                  location.replace(target + s + h);
                }
              } catch(e) {}

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
