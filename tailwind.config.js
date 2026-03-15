/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dofus: {
          bg: '#1a1a2e',
          surface: '#16213e',
          card: '#0f3460',
          accent: '#e94560',
          gold: '#f5a623',
          purple: '#c084fc',
          pink: '#f472b6',
          cyan: '#22d3ee',
          yellow: '#facc15',
          orange: '#fb923c',
          green: '#4ade80',
        }
      },
      fontFamily: {
        game: ['Segoe UI', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

