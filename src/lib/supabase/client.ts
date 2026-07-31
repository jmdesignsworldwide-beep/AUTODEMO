import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env'

// Cliente de Supabase para el navegador (rol anon + sesión del usuario).
// Protegido por RLS: sin sesión válida, no ve nada.
export function supabaseNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
