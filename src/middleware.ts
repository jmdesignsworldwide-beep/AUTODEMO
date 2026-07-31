import { type NextRequest } from 'next/server'
import { actualizarSesion } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return actualizarSesion(request)
}

export const config = {
  // Corre en todo menos estáticos, imágenes, íconos, fuentes y assets: así la
  // consulta de vigencia contra la base (mi_estado_vigencia) solo pega en
  // navegaciones reales, no en cada .css/.js/.woff que pide el navegador.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2|ttf|otf|eot)$).*)',
  ],
}
