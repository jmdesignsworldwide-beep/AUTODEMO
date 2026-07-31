'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEsMovil } from '@/lib/hooks'

export function Modal({
  abierto,
  onCambio,
  titulo,
  descripcion,
  children,
  className,
}: {
  abierto: boolean
  onCambio: (v: boolean) => void
  titulo?: string
  descripcion?: string
  children?: React.ReactNode
  className?: string
}) {
  const movil = useEsMovil()

  return (
    <Dialog.Root open={abierto} onOpenChange={onCambio}>
      <AnimatePresence>
        {abierto && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[rgb(var(--velo)/0.6)] backdrop-blur-sm"
              />
            </Dialog.Overlay>

            {/* Contenedor que centra (escritorio) o alinea abajo (móvil) sin usar
                transform, para no pelear con la animación de Framer. */}
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  initial={{ opacity: 0, y: movil ? '100%' : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: movil ? '100%' : 14 }}
                  transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                  className={cn(
                    'pointer-events-auto w-full border border-borde bg-superficie-elevada p-6 shadow-2xl shadow-[color:rgb(var(--sombra)/0.4)]',
                    'rounded-t-2xl pb-8', // móvil: hoja inferior
                    'sm:max-w-lg sm:rounded-token sm:pb-6', // escritorio: tarjeta centrada
                    className,
                  )}
                >
                  {/* Asa de la hoja inferior (solo móvil) */}
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde sm:hidden" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {titulo && (
                        <Dialog.Title className="text-lg font-semibold text-texto">{titulo}</Dialog.Title>
                      )}
                      {descripcion && (
                        <Dialog.Description className="mt-1 text-sm text-texto-suave">
                          {descripcion}
                        </Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close className="rounded-lg p-1.5 text-texto-suave transition-acento hover:bg-superficie-alta hover:text-texto">
                      <X className="h-5 w-5" />
                      <span className="sr-only">Cerrar</span>
                    </Dialog.Close>
                  </div>

                  {children && <div className="mt-4">{children}</div>}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
