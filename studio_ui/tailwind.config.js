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
          bg: "#e8e1d3",
          header: "#f3ede2",
          headerInk: "#191713",
          headerMuted: "rgba(38, 33, 27, 0.68)",
          headerBorder: "#8c8578",
          panel: "#f5efe5",
          surface: "#fbf7f0",
          card: "#fffaf2",
          overlay: "rgba(255, 250, 242, 0.88)",
          code: "#f7f1e7",
          border: "#8c8578",
          ink: "#191713",
          muted: "rgba(38, 33, 27, 0.68)",
          accent: "#24211d",
          sage: "#dfe7da",
          blue: "#dde7eb",
          rose: "#eadfd5",
          amber: "#ebe2c6",
          danger: "#b04a43",
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
