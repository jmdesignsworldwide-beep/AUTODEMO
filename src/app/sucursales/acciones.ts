'use server'

// ⚠️ PATRÓN DE ACCESO — ver docs/PATRON-DE-ACCESO.md
// Este módulo usa supabaseAdmin() (service_role) SOLO porque en la Tanda 0
// todavía no hay autenticación. Es CRUD de módulo, así que NO es el patrón
// definitivo: en la Tanda 2 se migra a la sesión del usuario real + RLS por
// rol y sucursal. Cada uso queda marcado con:
//   // TEMPORAL TANDA 0 — reemplazar en Tanda 2 por sesión de usuario.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Sucursal } from '@/lib/tipos'

// Fort Knox — Pilar 4: validación con zod en TODA entrada del servidor.
const esquemaSucursal = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre es demasiado largo.'),
  direccion: z.string().trim().max(240, 'La dirección es demasiado larga.').optional().or(z.literal('')),
  telefono: z
    .string()
    .trim()
    .max(20, 'El teléfono es demasiado largo.')
    // Formato dominicano flexible: 809/829/849 + dígitos, guiones opcionales.
    .regex(/^[0-9()+\-\s]*$/, 'El teléfono solo admite números, espacios y guiones.')
    .optional()
    .or(z.literal('')),
})

export type ResultadoAccion =
  | { ok: true; mensaje: string }
  | { ok: false; error: string }

/** Crea una sucursal contra Supabase usando service_role (servidor). */
export async function crearSucursal(
  _prev: ResultadoAccion | null,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = esquemaSucursal.safeParse({
    nombre: formData.get('nombre'),
    direccion: formData.get('direccion'),
    telefono: formData.get('telefono'),
  })

  if (!parsed.success) {
    const primer = parsed.error.issues[0]?.message ?? 'Datos inválidos.'
    return { ok: false, error: primer }
  }

  const { nombre, direccion, telefono } = parsed.data

  // TEMPORAL TANDA 0 — reemplazar en Tanda 2 por sesión de usuario.
  const { error } = await supabaseAdmin()
    .from('sucursal')
    .insert({
      nombre,
      direccion: direccion || null,
      telefono: telefono || null,
      // En la Tanda 0 aún no hay autenticación (llega en la Tanda 2).
      // created_by queda nulo por ahora; la columna ya existe para heredarlo luego.
      created_by: null,
    })

  if (error) {
    return { ok: false, error: `No se pudo guardar: ${error.message}` }
  }

  revalidatePath('/sucursales')
  return { ok: true, mensaje: 'Sucursal guardada en Supabase.' }
}

/** Lista las sucursales vivas (soft-delete: deleted_at IS NULL). */
export async function listarSucursales(): Promise<Sucursal[]> {
  // TEMPORAL TANDA 0 — reemplazar en Tanda 2 por sesión de usuario.
  const { data, error } = await supabaseAdmin()
    .from('sucursal')
    .select('id, nombre, direccion, telefono, activa, created_at, created_by, deleted_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Error al leer sucursales: ${error.message}`)
  }
  return (data ?? []) as Sucursal[]
}

/** Soft-delete: marca deleted_at, nunca borra físicamente. */
export async function archivarSucursal(id: string): Promise<ResultadoAccion> {
  // TEMPORAL TANDA 0 — reemplazar en Tanda 2 por sesión de usuario.
  const { error } = await supabaseAdmin()
    .from('sucursal')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    return { ok: false, error: `No se pudo archivar: ${error.message}` }
  }
  revalidatePath('/sucursales')
  return { ok: true, mensaje: 'Sucursal archivada.' }
}

/** Envoltura para usar `archivarSucursal` directo como `action` de un <form>. */
export async function archivarSucursalForm(id: string): Promise<void> {
  await archivarSucursal(id)
}
