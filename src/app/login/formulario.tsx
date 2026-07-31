'use client'

import { useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { iniciarSesion, type ResultadoLogin } from './acciones'

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState<ResultadoLogin, FormData>(iniciarSesion, null)

  return (
    <form action={accion} className="space-y-4">
      <div>
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" disabled={pendiente} className="w-full">
        <LogIn className="h-4 w-4" />
        {pendiente ? 'Entrando…' : 'Entrar'}
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
