import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env'

type CookieAEscribir = { name: string; value: string; options: CookieOptions }

// Cliente de Supabase con la SESIÓN DEL USUARIO (cookies).
// Este es el camino normal del CRUD desde la Tanda 2 en adelante: escribe la
// sesión del usuario y el RLS decide. Ver docs/PATRON-DE-ACCESO.md.
export async function supabaseServidor() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieAEscribir[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set({ name, value, ...options }),
          )
        } catch {
          // Llamado desde un Server Component: el refresco lo hace el middleware.
        }
      },
    },
  })
}
