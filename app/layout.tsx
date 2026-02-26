import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { AuthProvider } from "@/lib/AuthContext"

// ═══════════════════════════════════════════════════════════════════════════════
// FONTES
// ═══════════════════════════════════════════════════════════════════════════════

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: {
    default: "Oryen - Plataforma de Vendas com IA",
    template: "%s | Oryen"
  },
  description: "Gerencie leads, automatize conversas e aumente suas vendas com inteligência artificial.",
  keywords: ["CRM", "vendas", "leads", "inteligência artificial", "automação", "WhatsApp"],
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
  themeColor: "#0A0A0A",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A0A0A] text-gray-200`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}