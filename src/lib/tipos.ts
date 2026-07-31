// Tipos del dominio. En la Tanda 0 solo existe `sucursal` (mínima).
// El resto de la columna vertebral (cliente, vehículo, visita…) llega en tandas siguientes.

export interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  activa: boolean
  created_at: string
  created_by: string | null
  deleted_at: string | null
}
