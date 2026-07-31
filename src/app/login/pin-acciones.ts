'use server'

import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseServidor } from '@/lib/supabase/server'
import { hashToken, tokenDispositivoActual } from '@/lib/dispositivo'
import { ROLES_PIN } from '@/lib/roles'

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
    .in('rol', ROLES_PIN as unknown as string[]) // nunca dueño/gerente/superadmin
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

  // CANDADO DE PRIVILEGIOS (server-side, en el endpoint que emite la sesión):
  // aunque llamen directo con el id de un Dueño/Gerente/súper-admin, se rechaza
  // ANTES de verificar el PIN. El PIN nunca abre esas cuentas.
  const { data: perfil } = await admin.from('perfil').select('rol').eq('id', userId).maybeSingle()
  if (!perfil || !ROLES_PIN.includes(perfil.rol as (typeof ROLES_PIN)[number])) {
    return { ok: false, error: 'Este usuario entra solo con contraseña, no con PIN.' }
  }

  // Verificación server-side con doble throttle (dispositivo + usuario). La RPC
  // valida el token del dispositivo contra el HASH en la base en CADA llamada
  // (no basta con que la cookie exista): busca `dispositivo` por device_hash y activo.
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
