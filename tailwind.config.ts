import type { Config } from 'tailwindcss'

/**
 * JM AUTO — Tailwind mapeado a TOKENS SEMÁNTICOS.
 * No existen colores crudos (grafito/ámbar/etc.) expuestos como clases.
 * Un componente solo puede escribir: bg-superficie, text-acento, border-borde…
 * Todos resuelven a rgb(var(--token) / <alpha>), así que la opacidad funciona
 * y el color es reasignable en runtime.
 */
const tokenColor = (nombre: string) => `rgb(var(--${nombre}) / <alpha-value>)`

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        superficie: {
          DEFAULT: tokenColor('superficie'),
          elevada: tokenColor('superficie-elevada'),
          alta: tokenColor('superficie-alta'),
        },
        borde: {
          DEFAULT: tokenColor('borde'),
          suave: tokenColor('borde-suave'),
        },
        texto: {
          DEFAULT: tokenColor('texto'),
          suave: tokenColor('texto-suave'),
          tenue: tokenColor('texto-tenue'),
        },
        acento: {
          DEFAULT: tokenColor('acento'),
          texto: tokenColor('acento-texto'),
        },
        exito: tokenColor('exito'),
        alerta: tokenColor('alerta'),
        peligro: tokenColor('peligro'),
      },
      spacing: {
        '4.5': '1.125rem',
      },
      borderRadius: {
        token: 'var(--radio)',
      },
      transitionProperty: {
        acento: 'background-color, color, border-color, box-shadow, fill, stroke',
      },
      keyframes: {
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        latido: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.12)', opacity: '0.7' },
        },
        'brillo-carga': {
          '100%': { transform: 'translateX(100%)' },
        },
        entrada: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'count-up': 'count-up 0.5s ease-out both',
        latido: 'latido 1.3s ease-in-out infinite',
        entrada: 'entrada 0.4s ease-out both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
