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
// súper-admin de la Capa B (crear/administrar cuentas demo), tareas
// administrativas y procesos de sistema (siembra, jobs).
// NUNCA para el CRUD normal de un módulo — eso corre con la sesión del usuario
// y lo protege el RLS. Desde la Tanda 2 el CRUD ya no pasa por aquí.

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
