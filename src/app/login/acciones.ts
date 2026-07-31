'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hashToken, tokenDispositivoActual } from '@/lib/dispositivo'

const esquema = z.object({
  email: z.string().trim().email('Correo inválido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export type ResultadoLogin = { ok: false; error: string } | null

export async function iniciarSesion(_prev: ResultadoLogin, formData: FormData): Promise<ResultadoLogin> {
  const parsed = esquema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const supabase = await supabaseServidor()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    // Mensaje genérico: no revela si el correo existe.
    return { ok: false, error: 'Correo o contraseña incorrectos.' }
  }

  // Un login de contraseña exitoso RENUEVA el dispositivo (90 días): mientras
  // alguien entre con contraseña completa en la tablet, el PIN sigue vivo ahí.
  // Operación de sistema (service_role): el rol que entra puede no ser gestor.
  const token = await tokenDispositivoActual()
  if (token) {
    try {
      await supabaseAdmin()
        .from('dispositivo')
        .update({ renovado_at: new Date().toISOString(), last_seen: new Date().toISOString() })
        .eq('device_hash', hashToken(token))
        .eq('activo', true)
    } catch {
      // No bloquear el login por un fallo al renovar el dispositivo.
    }
  }

  redirect('/panel')
}

export async function cerrarSesion() {
  const supabase = await supabaseServidor()
  await supabase.auth.signOut()
  redirect('/login')
}
