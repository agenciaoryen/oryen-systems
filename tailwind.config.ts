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
        "text-on-primary": "var(--color-text-on-primary)",
        "text-on-accent":  "var(--color-text-on-accent)",
        "text-inverse":    "var(--color-text-inverse)",

        // Semantic
        success:           "var(--color-success)",
        "success-hover":   "var(--color-success-hover)",
        "success-subtle":  "var(--color-success-subtle)",
        warning:           "var(--color-warning)",
        "warning-hover":   "var(--color-warning-hover)",
        "warning-subtle":  "var(--color-warning-subtle)",
        error:             "var(--color-error)",
        "error-hover":     "var(--color-error-hover)",
        "error-subtle":    "var(--color-error-subtle)",
        info:              "var(--color-info)",
        "info-hover":      "var(--color-info-hover)",
        "info-subtle":     "var(--color-info-subtle)",
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
      fontSize: {
        display:  "3rem",
        h1:       "2.25rem",
        h2:       "1.75rem",
        h3:       "1.375rem",
        h4:       "1.125rem",
        h5:       "0.9375rem",
        h6:       "0.8125rem",
        "body-lg":"1rem",
        body:     "0.875rem",
        "body-sm":"0.8125rem",
        small:    "0.75rem",
        caption:  "0.6875rem",
        mono:     "0.8125rem",
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
      lineHeight: {
        display: "var(--leading-display)",
        h1:      "var(--leading-h1)",
        h2:      "var(--leading-h2)",
        h3:      "var(--leading-h3)",
        h4:      "var(--leading-h4)",
        tight:   "var(--leading-tight)",
        snug:    "var(--leading-snug)",
        normal:  "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
        loose:   "var(--leading-loose)",
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
      animation: {
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
