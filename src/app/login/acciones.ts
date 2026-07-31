'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/supabase/server'

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

  redirect('/panel')
}

export async function cerrarSesion() {
  const supabase = await supabaseServidor()
  await supabase.auth.signOut()
  redirect('/login')
}
