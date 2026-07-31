'use server'

// PATRÓN DE ACCESO (docs/PATRON-DE-ACCESO.md): el CRUD corre con la SESIÓN
// DEL USUARIO y el RLS decide. Ya NO se usa service_role aquí. Las políticas
// de `sucursal` (Tanda 2) permiten crear/editar solo a gestores y ver según
// rol/sucursal; created_by se sella solo con auth.uid() por defecto.

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { supabaseServidor } from '@/lib/supabase/server'
import type { Sucursal } from '@/lib/tipos'

const esquemaSucursal = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120, 'El nombre es demasiado largo.'),
  direccion: z.string().trim().max(240, 'La dirección es demasiado larga.').optional().or(z.literal('')),
  telefono: z
    .string()
    .trim()
    .max(20, 'El teléfono es demasiado largo.')
    .regex(/^[0-9()+\-\s]*$/, 'El teléfono solo admite números, espacios y guiones.')
    .optional()
    .or(z.literal('')),
})

export type ResultadoAccion = { ok: true; mensaje: string } | { ok: false; error: string }

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
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }
  const { nombre, direccion, telefono } = parsed.data

  const supabase = await supabaseServidor()
  const { error } = await supabase.from('sucursal').insert({
    nombre,
    direccion: direccion || null,
    telefono: telefono || null,
    // created_by lo sella la base con auth.uid() (default).
  })

  if (error) {
    // RLS puede negar a roles sin permiso: mensaje claro, no técnico.
    return { ok: false, error: `No se pudo guardar: ${error.message}` }
  }

  revalidatePath('/sucursales')
  return { ok: true, mensaje: 'Sucursal guardada en Supabase.' }
}

export async function listarSucursales(): Promise<Sucursal[]> {
  const supabase = await supabaseServidor()
  const { data, error } = await supabase
    .from('sucursal')
    .select('id, nombre, direccion, telefono, activa, created_at, created_by, deleted_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Error al leer sucursales: ${error.message}`)
  return (data ?? []) as Sucursal[]
}

export async function archivarSucursal(id: string): Promise<ResultadoAccion> {
  const supabase = await supabaseServidor()
  const { error } = await supabase
    .from('sucursal')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return { ok: false, error: `No se pudo archivar: ${error.message}` }
  revalidatePath('/sucursales')
  return { ok: true, mensaje: 'Sucursal archivada.' }
}

export async function archivarSucursalForm(id: string): Promise<void> {
  await archivarSucursal(id)
}
