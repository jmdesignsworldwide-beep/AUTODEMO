'use server'

import { cookies } from 'next/headers'
import { requireRol } from '@/lib/auth'
import { supabaseServidor } from '@/lib/supabase/server'
import { COOKIE_DISPOSITIVO, nuevoToken, hashToken } from '@/lib/dispositivo'

export type ResultadoDisp = { ok: true; mensaje: string } | { ok: false; error: string } | null

// Autoriza el dispositivo ACTUAL. Acción explícita y consciente de un gestor
// ya autenticado con contraseña — nunca automática. Guarda el hash del token
// y deja la cookie httpOnly en este dispositivo.
export async function autorizarDispositivo(_prev: ResultadoDisp, formData: FormData): Promise<ResultadoDisp> {
  const sesion = await requireRol(['superadmin', 'dueno', 'gerente'])
  const etiqueta = (String(formData.get('etiqueta') ?? '').trim() || 'Terminal').slice(0, 60)

  const token = nuevoToken()
  const supabase = await supabaseServidor()
  const { error } = await supabase.from('dispositivo').insert({
    device_hash: hashToken(token),
    etiqueta,
    sucursal_id: sesion.sucursalId,
    autorizado_por: sesion.user.id,
    last_seen: new Date().toISOString(),
  })
  if (error) return { ok: false, error: `No se pudo autorizar: ${error.message}` }

  const store = await cookies()
  store.set(COOKIE_DISPOSITIVO, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return { ok: true, mensaje: `«${etiqueta}» autorizado. Ya puede entrar con PIN.` }
}
