/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          dark: '#050B14',
          DEFAULT: '#0B132B',
          light: '#142247',
        },
        slate: {
          dark: '#1C2541',
          DEFAULT: '#243054',
          light: '#314170',
        },
        softblue: {
          DEFAULT: '#3A506B',
          light: '#4E6C91',
        },
        teal: {
          DEFAULT: '#5BC0BE',
          light: '#82D2D0',
          dark: '#3CA5A3',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
