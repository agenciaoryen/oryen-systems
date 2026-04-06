/**
 * Tailwind Config v2 — Atualizado para Branding Book v2
 *
 * Mudancas:
 * - Adicionadas cores indigo (extended brand)
 * - Adicionados tokens de glass effect
 * - Adicionadas sombras glow
 * - Adicionados valores de letter-spacing (tracking)
 * - Adicionada transicao smooth
 *
 * Para aplicar: copiar este conteudo para tailwind.config.ts na raiz
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        primary:           "var(--color-primary)",
        "primary-hover":   "var(--color-primary-hover)",
        "primary-active":  "var(--color-primary-active)",
        "primary-subtle":  "var(--color-primary-subtle)",

        // Accent
        accent:            "var(--color-accent)",
        "accent-hover":    "var(--color-accent-hover)",
        "accent-subtle":   "var(--color-accent-subtle)",

        // Indigo (new in v2)
        indigo:            "var(--color-indigo)",
        "indigo-hover":    "var(--color-indigo-hover)",
        "indigo-subtle":   "var(--color-indigo-subtle)",

        // Backgrounds
        surface:           "var(--color-bg-surface)",
        elevated:          "var(--color-bg-elevated)",
        "bg-base":         "var(--color-bg-base)",
        "bg-hover":        "var(--color-bg-hover)",
        "bg-selected":     "var(--color-bg-selected)",

        // Borders
        border:            "var(--color-border)",
        "border-subtle":   "var(--color-border-subtle)",
        "border-strong":   "var(--color-border-strong)",

        // Text
        "text-primary":    "var(--color-text-primary)",
        "text-secondary":  "var(--color-text-secondary)",
        "text-tertiary":   "var(--color-text-tertiary)",
        "text-disabled":   "var(--color-text-disabled)",

        // Semantic
        success:           "var(--color-success)",
        warning:           "var(--color-warning)",
        error:             "var(--color-error)",
        info:              "var(--color-info)",
      },
      borderRadius: {
        sm:    "var(--radius-sm)",
        md:    "var(--radius-md)",
        lg:    "var(--radius-lg)",
        xl:    "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body:    ["var(--font-body)"],
        mono:    ["var(--font-mono)"],
      },
      letterSpacing: {
        display:   "var(--tracking-display)",
        h1:        "var(--tracking-h1)",
        h2:        "var(--tracking-h2)",
        h3:        "var(--tracking-h3)",
        h4:        "var(--tracking-h4)",
        body:      "var(--tracking-body)",
        small:     "var(--tracking-small)",
        caption:   "var(--tracking-caption)",
        uppercase: "var(--tracking-uppercase)",
      },
      boxShadow: {
        sm:      "var(--shadow-sm)",
        md:      "var(--shadow-md)",
        lg:      "var(--shadow-lg)",
        xl:      "var(--shadow-xl)",
        primary: "var(--shadow-primary)",
        accent:  "var(--shadow-accent)",
        glow:    "var(--shadow-glow)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
    },
  },
  plugins: [],
};

export default config;
