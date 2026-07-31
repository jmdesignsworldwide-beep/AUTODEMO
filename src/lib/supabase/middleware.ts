import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env'

type CookieAEscribir = { name: string; value: string; options: CookieOptions }

// Rutas que NO exigen sesión vigente (para no crear un bucle de redirección).
const RUTAS_LIBRES = ['/login', '/vencida', '/sin-acceso', '/']

function decodificarVence(token: string): number | null {
  try {
    const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    return p.vence_at ? new Date(p.vence_at).getTime() : null
  } catch {
    return null
  }
}

// Refresca la sesión y, además, ENFORZA LA VIGENCIA en el borde: una cuenta
// demo vencida se manda a /vencida aquí (middleware) — la segunda muralla es
// el RLS (jwt_vigente), que la deniega a nivel de datos aunque salte esto.
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request })
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // REVOCACIÓN INSTANTÁNEA — se consulta la vigencia contra la BASE en cada
    // navegación (mi_estado_vigencia, SECURITY DEFINER, solo del propio usuario).
    // Así, revocar una cuenta en Capa B corta al instante sin esperar a que el
    // token se refresque. La 2ª muralla sigue siendo el RLS (jwt_vigente).
    let vigente: boolean | null = null
    try {
      const { data, error } = await supabase.rpc('mi_estado_vigencia')
      if (!error && typeof data === 'boolean') vigente = data
    } catch {
      vigente = null
    }

    // Si la RPC no pudo responder (hipo de red/BD), NO se brickea la navegación:
    // se cae al claim del JWT como respaldo. El RLS protege los datos igual.
    let vencida: boolean
    if (vigente !== null) {
      vencida = !vigente
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const vence = session?.access_token ? decodificarVence(session.access_token) : null
      vencida = vence !== null && vence <= Date.now()
    }

    const ruta = request.nextUrl.pathname
    const esLibre = RUTAS_LIBRES.includes(ruta)

    if (vencida && !esLibre) {
      const url = request.nextUrl.clone()
      url.pathname = '/vencida'
      const redir = NextResponse.redirect(url)
      // Conservar cookies de sesión refrescadas en la redirección.
      response.cookies.getAll().forEach((c) => redir.cookies.set(c))
      return redir
    }
  }

  return response
}
