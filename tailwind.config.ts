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
        primary:         "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-subtle":"var(--color-primary-subtle)",
        accent:          "var(--color-accent)",
        "accent-hover":  "var(--color-accent-hover)",
        surface:         "var(--color-bg-surface)",
        elevated:        "var(--color-bg-elevated)",
        "bg-base":       "var(--color-bg-base)",
        "bg-hover":      "var(--color-bg-hover)",
        "bg-selected":   "var(--color-bg-selected)",
        border:          "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        "border-strong": "var(--color-border-strong)",
        "text-primary":  "var(--color-text-primary)",
        "text-secondary":"var(--color-text-secondary)",
        "text-tertiary": "var(--color-text-tertiary)",
        "text-disabled": "var(--color-text-disabled)",
        success:         "var(--color-success)",
        warning:         "var(--color-warning)",
        error:           "var(--color-error)",
        info:            "var(--color-info)",
      },
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        "2xl":"var(--radius-2xl)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body:    ["var(--font-body)"],
        mono:    ["var(--font-mono)"],
      },
      boxShadow: {
        sm:      "var(--shadow-sm)",
        md:      "var(--shadow-md)",
        lg:      "var(--shadow-lg)",
        xl:      "var(--shadow-xl)",
        primary: "var(--shadow-primary)",
        accent:  "var(--shadow-accent)",
      },
    },
  },
  plugins: [],
};

export default config;
