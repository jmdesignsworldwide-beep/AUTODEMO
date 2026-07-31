import { supabaseConfigurado } from '@/lib/env'
import { listarSucursales } from '@/app/sucursales/acciones'
import type { Sucursal } from '@/lib/tipos'
import { PanelVista } from './panel-vista'

export const dynamic = 'force-dynamic'

// Server component: obtiene los datos y los pasa (serializables) a la vista
// cliente. Nada de funciones/iconos cruzando la frontera server→client.
export default async function Panel() {
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

  return <PanelVista sucursales={sucursales} configurado={configurado} error={error} />
}
