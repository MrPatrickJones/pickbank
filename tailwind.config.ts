import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#001855",
        brand: "#326BFF",
        brandDark: "#2C61E8",
        muted: "#506392",
        line: "#E1E7F8",
        surface: "#F4F7FF",
      },
    },
  },
  plugins: [],
}

export default config
