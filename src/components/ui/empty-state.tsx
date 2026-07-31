import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Estados vacíos con carácter de marca — nunca un frío "No hay datos".
export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icono: LucideIcon
  titulo: string
  descripcion?: string
  accion?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-token border border-dashed border-borde px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-acento/10 text-acento transition-acento">
        <Icono className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <p className="font-semibold text-texto">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-xs text-sm text-texto-suave">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}
