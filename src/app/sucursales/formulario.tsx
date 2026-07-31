'use client'

import { useActionState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { crearSucursal, type ResultadoAccion } from './acciones'

export function FormularioSucursal() {
  const [estado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(
    crearSucursal,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset()
  }, [estado])

  return (
    <form ref={formRef} action={accion} className="space-y-4">
      <div>
        <Label htmlFor="nombre">Nombre de la sucursal *</Label>
        <Input id="nombre" name="nombre" placeholder="JM AUTO Santiago Centro" required maxLength={120} />
      </div>

      <div>
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          name="direccion"
          placeholder="Av. 27 de Febrero #45, Santiago"
          maxLength={240}
        />
      </div>

      <div>
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" name="telefono" placeholder="809-555-1234" maxLength={20} inputMode="tel" />
      </div>

      <Button type="submit" disabled={pendiente} className="w-full">
        <Plus className="h-4 w-4" />
        {pendiente ? 'Guardando…' : 'Crear sucursal'}
      </Button>

      <AnimatePresence>
        {estado && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={
              estado.ok
                ? 'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300'
                : 'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300'
            }
          >
            {estado.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {estado.ok ? estado.mensaje : estado.error}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}
