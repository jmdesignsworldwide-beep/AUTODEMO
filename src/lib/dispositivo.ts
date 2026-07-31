import 'server-only'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// El token del dispositivo vive en una cookie httpOnly; en la base solo se
// guarda su HASH (nunca el token en claro). Así, aunque se filtre la base,
// no se puede reconstruir el token del dispositivo.
export const COOKIE_DISPOSITIVO = 'jm_dispositivo'

export function nuevoToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function tokenDispositivoActual(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_DISPOSITIVO)?.value ?? null
}
