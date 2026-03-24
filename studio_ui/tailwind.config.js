/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          bg: "#000000",
          header: "#000000",
          headerInk: "#ffffff",
          headerMuted: "rgba(255, 255, 255, 0.78)",
          headerBorder: "#ffffff",
          panel: "#000000",
          surface: "#000000",
          card: "#000000",
          overlay: "rgba(0, 0, 0, 0.94)",
          code: "#000000",
          border: "#ffffff",
          ink: "#ffffff",
          muted: "rgba(255, 255, 255, 0.78)",
          accent: "#ffffff",
          sage: "#dfe7da",
          blue: "#dde7eb",
          rose: "#eadfd5",
          amber: "#ebe2c6",
          danger: "#ff4444",
        }
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
}
