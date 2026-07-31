// Lectura y validación de variables de entorno.
// Fort Knox — Pilar 1 y 7: la service_role JAMÁS lleva prefijo NEXT_PUBLIC_
// y solo se lee del lado del servidor.

/** URL del proyecto Supabase — pública (segura de exponer). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/** Llave anónima — pública por diseño; protegida por RLS deny-all. */
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * Devuelve la service_role SOLO en el servidor.
 * Si por error se importa en el cliente, `process.env.SUPABASE_SERVICE_ROLE`
 * es undefined en el bundle del navegador (no lleva NEXT_PUBLIC_), así que
 * nunca se filtra. Además marcamos el módulo consumidor con 'server-only'.
 */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE no está configurada en el servidor. ' +
        'Debe montarse en Vercel marcada como Sensitive — nunca con prefijo NEXT_PUBLIC_.',
    )
  }
  return key
}

/** ¿Hay conexión a Supabase configurada? Útil para mensajes de estado en el demo. */
export function supabaseConfigurado(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}
