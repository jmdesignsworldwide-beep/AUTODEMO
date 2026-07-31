'use server'

import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseServidor } from '@/lib/supabase/server'
import { hashToken, tokenDispositivoActual } from '@/lib/dispositivo'

export interface UsuarioPin {
  id: string
  nombre: string
  rol: string
}

/**
 * Estado del dispositivo actual (pre-login). Si NO está autorizado, devuelve
 * autorizado:false y la pantalla de PIN ni se muestra. La consulta va por
 * service_role (operación de sistema, pre-sesión), acotada a la sucursal del
 * dispositivo y solo a usuarios con PIN.
 */
export async function estadoDispositivo(): Promise<{ autorizado: boolean; usuarios: UsuarioPin[] }> {
  const token = await tokenDispositivoActual()
  if (!token) return { autorizado: false, usuarios: [] }

  const admin = supabaseAdmin()
  const { data: disp } = await admin
    .from('dispositivo')
    .select('id, sucursal_id, activo')
    .eq('device_hash', hashToken(token))
    .maybeSingle()

  if (!disp || !disp.activo) return { autorizado: false, usuarios: [] }

  const { data: us } = await admin
    .from('perfil')
    .select('id, nombre, rol')
    .eq('sucursal_id', disp.sucursal_id)
    .not('pin_hash', 'is', null)
    .is('deleted_at', null)
    .eq('activo', true)

  return {
    autorizado: true,
    usuarios: (us ?? []).map((u) => ({ id: u.id, nombre: u.nombre, rol: u.rol })),
  }
}

export type ResultadoPin = { ok: false; error: string } | null

export async function entrarConPin(_prev: ResultadoPin, formData: FormData): Promise<ResultadoPin> {
  const userId = String(formData.get('userId') ?? '')
  const pin = String(formData.get('pin') ?? '')

  const token = await tokenDispositivoActual()
  if (!token) return { ok: false, error: 'Este dispositivo no está autorizado.' }
  if (!userId || !/^[0-9]{4,}$/.test(pin)) return { ok: false, error: 'Selecciona tu usuario y escribe el PIN.' }

  const admin = supabaseAdmin()

  // Verificación server-side con doble throttle (dispositivo + usuario).
  const { data: r, error } = await admin.rpc('verificar_pin', {
    p_device: hashToken(token),
    p_user: userId,
    p_pin: pin,
  })
  const res = r as { ok: boolean; motivo?: string } | null
  if (error || !res?.ok) {
    const bloqueado = res?.motivo === 'dispositivo_bloqueado' || res?.motivo === 'usuario_bloqueado'
    return {
      ok: false,
      error: bloqueado ? 'Demasiados intentos. Espera unos minutos.' : 'PIN incorrecto.',
    }
  }

  // PIN correcto → emitir una SESIÓN REAL de ese usuario (magic link server-side).
  const { data: u } = await admin.auth.admin.getUserById(userId)
  const email = u.user?.email
  if (!email) return { ok: false, error: 'Usuario inválido.' }

  const { data: link, error: le } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (le || !link?.properties?.hashed_token) return { ok: false, error: 'No se pudo iniciar sesión.' }

  const supabase = await supabaseServidor()
  const { error: ve } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'email',
  })
  if (ve) return { ok: false, error: 'No se pudo iniciar sesión.' }

  redirect('/panel')
}
