import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "var(--navy)", soft: "var(--navy-soft)", line: "var(--navy-line)" },
        ink: "var(--ink)",
        body: "var(--body)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: { DEFAULT: "var(--line)", soft: "var(--line-soft)" },
        surface: { DEFAULT: "var(--surface)", sunken: "var(--surface-sunken)" },
        accent: { DEFAULT: "var(--accent)", strong: "var(--accent-strong)", soft: "var(--accent-soft)" },
        gold: "var(--gold)",
        good: { DEFAULT: "var(--good)", soft: "var(--good-soft)" },
        warn: { DEFAULT: "var(--warn)", soft: "var(--warn-soft)" },
        danger: { DEFAULT: "var(--danger)", soft: "var(--danger-soft)" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 29, 51, .05)",
        lift: "0 20px 46px -28px rgba(11, 29, 58, .45)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
}

export default config
