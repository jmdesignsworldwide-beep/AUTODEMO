import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JM AUTO — Plataforma de expediente de vehículo',
  description:
    'El sistema que sabe cómo funciona tu negocio automotriz. Car wash, gomería, mecánica, repuestos y más — en una sola plataforma.',
  robots: { index: false, follow: false }, // demo privado: no se indexa
}

export const viewport: Viewport = {
  themeColor: '#12151A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-DO" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
