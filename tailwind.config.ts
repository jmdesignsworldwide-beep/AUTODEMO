import type { Config } from 'tailwindcss'

// Identidad visual JM AUTO — Parte III de la arquitectura.
// Base: grafito profundo + titanio + acento ámbar incandescente.
// Tema oscuro por defecto (el taller es un ambiente oscuro).
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        grafito: {
          DEFAULT: '#12151A',
          800: '#181C22',
          700: '#1F242C',
          600: '#272D37',
        },
        titanio: {
          DEFAULT: '#8B95A5',
          400: '#A7B0BD',
          300: '#C3C9D2',
        },
        ambar: {
          DEFAULT: '#FF8A2B',
          600: '#E5751B',
          400: '#FFA65C',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        latido: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.06)', opacity: '0.85' },
        },
      },
      animation: {
        'count-up': 'count-up 0.5s ease-out',
        latido: 'latido 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
