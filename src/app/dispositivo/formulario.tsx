'use client'

import { useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, AlertCircle, Tablet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { autorizarDispositivo, type ResultadoDisp } from './acciones'

export function FormularioDispositivo({ yaAutorizado }: { yaAutorizado: boolean }) {
  const [estado, accion, pendiente] = useActionState<ResultadoDisp, FormData>(autorizarDispositivo, null)

  if (estado?.ok || yaAutorizado) {
    return (
      <div className="flex items-center gap-3 rounded-token border border-exito/30 bg-exito/10 px-4 py-3 text-sm text-exito">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        {estado?.ok ? estado.mensaje : 'Este dispositivo ya está autorizado para entrar con PIN.'}
      </div>
    )
  }

  return (
    <form action={accion} className="space-y-4">
      <div>
        <Label htmlFor="etiqueta">Nombre de este dispositivo</Label>
        <Input id="etiqueta" name="etiqueta" placeholder="Tablet recepción, Caja 1…" maxLength={60} required />
      </div>
      <Button type="submit" disabled={pendiente} className="w-full">
        <Tablet className="h-4 w-4" />
        {pendiente ? 'Autorizando…' : 'Autorizar esta tablet'}
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
