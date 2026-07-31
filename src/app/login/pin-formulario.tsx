'use client'

import { useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { entrarConPin, type ResultadoPin, type UsuarioPin } from './pin-acciones'

const ETIQUETA: Record<string, string> = {
  cajero: 'Cajero',
  tecnico: 'Técnico',
  asesor: 'Asesor',
  almacenista: 'Almacenista',
  gerente: 'Gerente',
  dueno: 'Dueño',
  superadmin: 'Súper-admin',
}

export function FormularioPin({ usuarios }: { usuarios: UsuarioPin[] }) {
  const [estado, accion, pendiente] = useActionState<ResultadoPin, FormData>(entrarConPin, null)

  if (usuarios.length === 0) {
    return (
      <p className="rounded-token border border-borde bg-superficie-alta px-4 py-3 text-sm text-texto-suave">
        Este dispositivo está autorizado, pero ningún usuario de esta sucursal tiene PIN asignado
        todavía. Un gerente puede asignarlo.
      </p>
    )
  }

  return (
    <form action={accion} className="space-y-4">
      <div>
        <Label htmlFor="userId">Usuario</Label>
        <select
          id="userId"
          name="userId"
          required
          className="flex h-11 w-full rounded-token border border-borde bg-superficie-elevada px-4 text-sm text-texto focus-visible:border-acento/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/25"
        >
          <option value="">Selecciona tu usuario…</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} · {ETIQUETA[u.rol] ?? u.rol}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••••"
          minLength={6}
          maxLength={12}
          required
        />
      </div>
      <Button type="submit" disabled={pendiente} className="w-full">
        <KeyRound className="h-4 w-4" />
        {pendiente ? 'Entrando…' : 'Entrar con PIN'}
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
