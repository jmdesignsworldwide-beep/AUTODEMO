import 'server-only'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type Rol = 'superadmin' | 'dueno' | 'gerente' | 'asesor' | 'cajero' | 'tecnico' | 'almacenista'

export interface Sesion {
  user: User
  rol: Rol | null
  sucursalId: string | null
  venceAt: string | null
  vigente: boolean
}

function decodificarJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64').toString())
  } catch {
    return {}
  }
}

/**
 * Sesión actual leída del servidor. El rol/sucursal/vigencia vienen del JWT
 * (inyectados por el auth hook desde `perfil` y `cuenta_demo`), no de
 * user_metadata. Devuelve null si no hay sesión válida.
 */
export async function sesionActual(): Promise<Sesion | null> {
  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const claims = session?.access_token ? decodificarJwt(session.access_token) : {}

  const venceAt = (claims.vence_at as string) ?? null
  const vigente = !venceAt || new Date(venceAt).getTime() > Date.now()

  return {
    user,
    rol: (claims.rol as Rol) ?? null,
    sucursalId: (claims.sucursal_id as string) ?? null,
    venceAt,
    vigente,
  }
}

/** Exige sesión válida y vigente; si no, redirige al login. */
export async function requireSesion(): Promise<Sesion> {
  const s = await sesionActual()
  if (!s) redirect('/login')
  if (!s.vigente) redirect('/vencida')
  return s
}

/** Exige uno de los roles indicados; si no, redirige (deniega por ruta). */
export async function requireRol(roles: Rol[]): Promise<Sesion> {
  const s = await requireSesion()
  if (!s.rol || !roles.includes(s.rol)) redirect('/sin-acceso')
  return s
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  superadmin: 'Súper-admin',
  dueno: 'Dueño',
  gerente: 'Gerente',
  asesor: 'Asesor de servicio',
  cajero: 'Cajero',
  tecnico: 'Técnico',
  almacenista: 'Almacenista',
}
