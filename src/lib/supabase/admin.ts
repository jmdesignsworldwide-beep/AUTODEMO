import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, getServiceRoleKey } from '@/lib/env'

// Cliente administrativo de Supabase — usa service_role.
// Fort Knox: SOLO servidor. El import 'server-only' hace que el build FALLE
// si este módulo llega a un componente de cliente. La service_role nunca
// viaja al navegador.
//
// En la Tanda 0 todo el acceso a datos pasa por aquí (Server Actions), porque
// la tabla `sucursal` nace con RLS + FORCE deny-all: el rol anónimo no puede
// tocarla directamente. Esa es la prueba viva del modelo de seguridad.

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
