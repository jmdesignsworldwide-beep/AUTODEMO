'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tono = 'exito' | 'peligro' | 'alerta' | 'acento'

interface Toast {
  id: number
  mensaje: string
  titulo?: string
  tono: Tono
}

interface ToastCtx {
  toast: (t: { mensaje: string; titulo?: string; tono?: Tono }) => void
}

const Ctx = React.createContext<ToastCtx | null>(null)

const ICONO: Record<Tono, LucideIcon> = {
  exito: CheckCircle2,
  peligro: AlertCircle,
  alerta: AlertCircle,
  acento: Info,
}
const COLOR: Record<Tono, string> = {
  exito: 'text-exito',
  peligro: 'text-peligro',
  alerta: 'text-alerta',
  acento: 'text-acento',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([])
  const idRef = React.useRef(0)

  const toast = React.useCallback<ToastCtx['toast']>(({ mensaje, titulo, tono = 'acento' }) => {
    const id = ++idRef.current
    setItems((prev) => [...prev, { id, mensaje, titulo, tono }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200)
  }, [])

  const cerrar = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id))

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        <AnimatePresence>
          {items.map((t) => {
            const Icono = ICONO[t.tono]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-token border border-borde bg-superficie-elevada p-4 shadow-2xl shadow-[color:rgb(var(--sombra)/0.4)]"
              >
                <Icono className={cn('mt-0.5 h-5 w-5 shrink-0', COLOR[t.tono])} />
                <div className="min-w-0 flex-1">
                  {t.titulo && <p className="text-sm font-semibold text-texto">{t.titulo}</p>}
                  <p className="text-sm text-texto-suave">{t.mensaje}</p>
                </div>
                <button
                  onClick={() => cerrar(t.id)}
                  className="rounded p-0.5 text-texto-tenue transition-acento hover:text-texto"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cerrar</span>
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
