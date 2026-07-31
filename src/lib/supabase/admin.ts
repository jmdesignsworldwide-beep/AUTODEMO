import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, getServiceRoleKey } from '@/lib/env'

// Cliente administrativo de Supabase — usa service_role.
// Fort Knox: SOLO servidor. El import 'server-only' hace que el build FALLE
// si este módulo llega a un componente de cliente. La service_role nunca
// viaja al navegador.
//
// ⚠️ PATRÓN DE ACCESO — ver docs/PATRON-DE-ACCESO.md
// service_role ATRAVIESA la RLS. Su uso está RESERVADO para lo privilegiado:
// súper-admin de la Capa B, tareas administrativas y procesos de sistema.
// NUNCA para el CRUD normal de un módulo. El CRUD de módulo (Tanda 2+) usa la
// sesión del usuario real y deja que la RLS proteja.
//
// TEMPORAL TANDA 0 — reemplazar en Tanda 2 por sesión de usuario.
// En la Tanda 0 no hay autenticación todavía, así que el humo de vida
// (`sucursal`) escribe por aquí. Es deuda técnica consciente y acotada:
// se retira cuando la Tanda 2 traiga auth + políticas RLS por rol y sucursal.

let cliente: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (cliente) return cliente
  cliente = createClient(SUPABASE_URL, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return cliente
}
