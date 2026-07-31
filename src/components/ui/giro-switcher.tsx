'use client'

import {
  Car,
  Droplets,
  CircleDot,
  Wrench,
  Sparkles,
  SunMedium,
  PaintBucket,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { useGiro } from '@/components/providers/giro-provider'
import { cn } from '@/lib/utils'

const ICONOS: Record<string, LucideIcon> = {
  Car,
  Droplets,
  CircleDot,
  Wrench,
  Sparkles,
  SunMedium,
  PaintBucket,
  Package,
}

/**
 * Conmutador de giros. Al tocar un giro, el GiroProvider reasigna --acento
 * en runtime y TODO el sistema muda de color — sin tocar ningún componente.
 * Esto es la maqueta viva de lo que en la Tanda 6 será la venta.
 */
export function GiroSwitcher({ className }: { className?: string }) {
  const { giro, giros, setGiro } = useGiro()
  return (
    <div className={cn('flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible', className)}>
      {giros.map((g) => {
        const Icono = ICONOS[g.icono] ?? Car
        const activo = g.id === giro.id
        return (
          <button
            key={g.id}
            onClick={() => setGiro(g.id)}
            aria-pressed={activo}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-acento',
              activo
                ? 'border-acento bg-acento/10 text-acento'
                : 'border-borde text-texto-suave hover:border-texto-tenue hover:text-texto',
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              {activo ? (
                <Icono className="h-4 w-4" />
              ) : (
                // Muestra el color del giro (dato del catálogo = fuente del token)
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `rgb(${g.acento})` }}
                />
              )}
            </span>
            {g.nombre}
          </button>
        )
      })}
    </div>
  )
}
