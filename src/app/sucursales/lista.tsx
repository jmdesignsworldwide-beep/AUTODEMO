'use client'

import { motion } from 'framer-motion'
import { Building2, Phone, MapPin, Archive, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { fechaDominicana } from '@/lib/utils'
import type { Sucursal } from '@/lib/tipos'
import { archivarSucursalForm } from './acciones'

export function ListaSucursales({ sucursales }: { sucursales: Sucursal[] }) {
  if (sucursales.length === 0) {
    return (
      <EmptyState
        icono={Building2}
        titulo="Todavía no hay sucursales"
        descripcion="Crea la primera con el formulario de la izquierda."
      />
    )
  }

  return (
    <ul className="space-y-3">
      {sucursales.map((s, i) => (
        <motion.li
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
        >
          <div className="flex items-start justify-between gap-4 rounded-token border border-borde bg-superficie-elevada/60 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-acento/10 text-acento transition-acento">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <h4 className="truncate font-semibold text-texto">{s.nombre}</h4>
              </div>
              <div className="mt-2 space-y-1 pl-11 text-sm text-texto-suave">
                {s.direccion && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-texto-tenue" /> {s.direccion}
                  </p>
                )}
                {s.telefono && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-texto-tenue" /> {s.telefono}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-texto-tenue">
                  <Clock className="h-3 w-3" /> Creada {fechaDominicana(s.created_at)}
                </p>
              </div>
            </div>

            <form action={archivarSucursalForm.bind(null, s.id)}>
              <Button type="submit" variant="peligro" size="sm" title="Archivar (soft-delete)">
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </motion.li>
      ))}
    </ul>
  )
}
