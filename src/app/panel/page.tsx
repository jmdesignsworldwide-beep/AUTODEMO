import { supabaseConfigurado } from '@/lib/env'
import { requireSesion, ETIQUETA_ROL } from '@/lib/auth'
import { listarSucursales } from '@/app/sucursales/acciones'
import type { Sucursal } from '@/lib/tipos'
import { PanelVista } from './panel-vista'

export const dynamic = 'force-dynamic'

// Server component: exige sesión, obtiene los datos y los pasa (serializables)
// a la vista cliente. Nada de funciones/iconos cruzando la frontera.
export default async function Panel() {
  const sesion = await requireSesion()
  const configurado = supabaseConfigurado()
  let sucursales: Sucursal[] = []
  let error: string | null = null

  if (configurado) {
    try {
      sucursales = await listarSucursales()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Error al leer.'
    }
  }

  return (
    <PanelVista
      sucursales={sucursales}
      configurado={configurado}
      error={error}
      usuario={{
        nombre: sesion.user.email ?? 'Usuario',
        rol: sesion.rol ? ETIQUETA_ROL[sesion.rol] : '—',
        esSuperadmin: sesion.rol === 'superadmin',
      }}
    />
  )
}
