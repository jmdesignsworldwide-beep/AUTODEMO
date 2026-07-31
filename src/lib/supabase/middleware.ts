import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env'

type CookieAEscribir = { name: string; value: string; options: CookieOptions }

// Refresca la sesión en cada petición y la mantiene fresca en las cookies.
// No decide permisos aquí (eso es el RLS y la validación por ruta); solo
// mantiene viva/renovada la sesión del usuario.
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Si Supabase no está configurado, no interferir.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieAEscribir[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set({ name, value, ...options }),
        )
      },
    },
  })

  // Refresca el token si hace falta.
  await supabase.auth.getUser()

  return response
}
