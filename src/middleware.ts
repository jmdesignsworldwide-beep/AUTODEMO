import { type NextRequest } from 'next/server'
import { actualizarSesion } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await actualizarSesion(request)
  // CANARIO DEL MIDDLEWARE — si el middleware corre, esta cabecera SIEMPRE sale.
  // Si un día desaparece de las respuestas, el middleware dejó de ejecutarse
  // (por ubicación de archivo o por el matcher) y la prueba de humo lo grita.
  // Ver docs/PATRON-DE-ACCESO.md · "Canario del middleware".
  response.headers.set('x-jmauto-mw', '1')
  return response
}

export const config = {
  // Corre en todo menos estáticos, imágenes, íconos, fuentes y assets: así la
  // consulta de vigencia contra la base (mi_estado_vigencia) solo pega en
  // navegaciones reales, no en cada .css/.js/.woff que pide el navegador.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2|ttf|otf|eot)$).*)',
  ],
}
