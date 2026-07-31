import { requireRol, ETIQUETA_ROL } from '@/lib/auth'
import { SistemaVista } from './vista'

export const dynamic = 'force-dynamic'

// /sistema es una pantalla interna: SOLO súper-admin. Un cliente no puede
// tropezarse con el showcase de primitivos. La puerta la pone requireRol.
export default async function SistemaPage() {
  const sesion = await requireRol(['superadmin'])
  return (
    <SistemaVista
      usuario={{
        nombre: sesion.user.email ?? 'Súper-admin',
        rol: ETIQUETA_ROL.superadmin,
        rolId: 'superadmin',
        esSuperadmin: true,
      }}
    />
  )
}
