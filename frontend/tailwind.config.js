/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#090D16',
        surface: {
          1: '#111827',
          2: '#1F2937',
          3: '#374151',
        },
        priority: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#EAB308',
          low: '#10B981',
        },
        road: {
          clear: '#10B981',
          congested: '#F59E0B',
          flooded: '#06B6D4',
          blocked: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
