'use server'

import crypto from 'crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { sesionActual } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Capa B = súper-admin. Estas acciones usan service_role (tarea administrativa
// legítima, ver docs/PATRON-DE-ACCESO.md) pero SIEMPRE tras confirmar el rol.
async function exigirSuperadmin(): Promise<boolean> {
  const s = await sesionActual()
  return !!s && s.vigente && s.rol === 'superadmin'
}

const tempPass = () =>
  crypto.randomBytes(10).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 11) + 'A7$'

const ROLES_DEMO = ['dueno', 'gerente', 'asesor', 'cajero', 'tecnico', 'almacenista'] as const

const esquemaCuenta = z.object({
  email: z.string().trim().email('Correo inválido.'),
  nombre: z.string().trim().min(2, 'Nombre requerido.').max(80),
  rol: z.enum(ROLES_DEMO),
  vigencia: z.string(), // '7' | '15' | '30' | 'sin' | número personalizado
})

export type ResCrear =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string }
  | null

export async function crearCuentaDemo(_prev: ResCrear, formData: FormData): Promise<ResCrear> {
  if (!(await exigirSuperadmin())) return { ok: false, error: 'No autorizado.' }

  const parsed = esquemaCuenta.safeParse({
    email: formData.get('email'),
    nombre: formData.get('nombre'),
    rol: formData.get('rol'),
    vigencia: formData.get('vigencia'),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const { email, nombre, rol, vigencia } = parsed.data

  const dias = vigencia === 'sin' ? null : Number(vigencia)
  if (dias !== null && (!Number.isFinite(dias) || dias < 1 || dias > 3650)) {
    return { ok: false, error: 'Vigencia inválida.' }
  }

  const admin = supabaseAdmin()
  const { data: sucs } = await admin
    .from('sucursal')
    .select('id')
    .is('deleted_at', null)
    .order('created_at')
    .limit(1)

  const password = tempPass()
  const { data: cr, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) return { ok: false, error: `No se pudo crear: ${error.message}` }

  await admin.from('perfil').insert({
    id: cr.user.id,
    nombre,
    rol,
    sucursal_id: sucs?.[0]?.id ?? null,
  })
  const vence = dias === null ? null : new Date(Date.now() + dias * 86400000).toISOString()
  await admin.from('cuenta_demo').insert({ user_id: cr.user.id, etiqueta: nombre, vence_at: vence, activa: true })

  revalidatePath('/capa-b')
  return { ok: true, email, password }
}

export async function extenderVigencia(id: string, dias: number): Promise<void> {
  if (!(await exigirSuperadmin())) return
  const admin = supabaseAdmin()
  const { data: c } = await admin.from('cuenta_demo').select('vence_at').eq('id', id).maybeSingle()
  const base = c?.vence_at && new Date(c.vence_at) > new Date() ? new Date(c.vence_at) : new Date()
  const nuevo = new Date(base.getTime() + dias * 86400000).toISOString()
  await admin.from('cuenta_demo').update({ vence_at: nuevo, activa: true }).eq('id', id)
  revalidatePath('/capa-b')
}

export async function revocarCuentaDemo(id: string): Promise<void> {
  if (!(await exigirSuperadmin())) return
  const admin = supabaseAdmin()
  // Vence al instante (muere sola por RLS/middleware).
  await admin
    .from('cuenta_demo')
    .update({ vence_at: new Date().toISOString(), activa: false })
    .eq('id', id)
  revalidatePath('/capa-b')
}

export async function revocarDispositivo(id: string): Promise<void> {
  if (!(await exigirSuperadmin())) return
  const admin = supabaseAdmin()
  await admin.from('dispositivo').update({ activo: false }).eq('id', id)
  revalidatePath('/capa-b')
}
