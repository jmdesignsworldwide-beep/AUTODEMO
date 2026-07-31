'use client'

import { useActionState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { crearSucursal, type ResultadoAccion } from './acciones'

export function FormularioSucursal() {
  const [estado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(
    crearSucursal,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (estado?.ok) {
      formRef.current?.reset()
      toast({ tono: 'exito', titulo: 'Guardada', mensaje: estado.mensaje })
    }
  }, [estado, toast])

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
        {estado && !estado.ok && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-token border border-peligro/30 bg-peligro/10 px-4 py-3 text-sm text-peligro"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {estado.error}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}
