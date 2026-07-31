import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { GiroProvider } from '@/components/providers/giro-provider'
import { ToastProvider } from '@/components/ui/toast'
import { GIROS_ACENTO } from '@/lib/giros'

export const metadata: Metadata = {
  title: 'JM AUTO — Plataforma de expediente de vehículo',
  description:
    'El sistema que sabe cómo funciona tu negocio automotriz. Car wash, gomería, mecánica, repuestos y más — en una sola plataforma.',
  robots: { index: false, follow: false }, // demo privado
}

export const viewport: Viewport = {
  themeColor: '#12151A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// Script anti-parpadeo: aplica tema y acento del giro ANTES del primer paint,
// leyendo de localStorage. Sin esto, se vería un flash del tema por defecto.
const scriptAntiParpadeo = `
(function(){
  try {
    var t = localStorage.getItem('jm-tema') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var acentos = ${JSON.stringify(GIROS_ACENTO)};
    var g = localStorage.getItem('jm-giro');
    if (g && acentos[g]) {
      document.documentElement.style.setProperty('--acento', acentos[g][0]);
      document.documentElement.style.setProperty('--acento-contraste', acentos[g][1]);
    }
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-DO" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptAntiParpadeo }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <GiroProvider>
            <ToastProvider>{children}</ToastProvider>
          </GiroProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
