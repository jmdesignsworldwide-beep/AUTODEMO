'use client'

import * as React from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn, numeroDO, porcentajeDO } from '@/lib/utils'
import { Badge } from './badge'

type Formato = 'numero' | 'moneda' | 'porcentaje'

function formatear(valor: number, formato: Formato): string {
  // En un KPI de titular, los centavos son ruido: se muestran pesos enteros.
  if (formato === 'moneda') return `RD$${numeroDO(valor)}`
  if (formato === 'porcentaje') return porcentajeDO(valor)
  return numeroDO(valor)
}

/** Hook de count-up con easing, disparado al entrar en viewport. */
function useContador(destino: number, activo: boolean, duracion = 1100) {
  const [valor, setValor] = React.useState(0)
  React.useEffect(() => {
    if (!activo) return
    let raf = 0
    let inicio = 0
    const paso = (t: number) => {
      if (!inicio) inicio = t
      const p = Math.min((t - inicio) / duracion, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setValor(destino * ease)
      if (p < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [destino, activo, duracion])
  return valor
}

export function KpiCard({
  titulo,
  valor,
  formato = 'numero',
  icono: Icono,
  delta,
  urgente,
  pie,
  className,
}: {
  titulo: string
  valor: number
  formato?: Formato
  icono: LucideIcon
  /** Variación en % respecto al periodo anterior (opcional). */
  delta?: number
  /** Marca la tarjeta como urgente (badge que late). */
  urgente?: boolean
  pie?: string
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const enVista = useInView(ref, { once: true, margin: '-40px' })
  const reducir = useReducedMotion()
  const animado = useContador(valor, enVista && !reducir)
  // Con reduce-motion, el número salta directo al valor final (sin conteo).
  const mostrado = reducir ? valor : animado

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={enVista ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'rounded-token border border-borde bg-superficie-elevada/80 p-5 shadow-lg shadow-[color:rgb(var(--sombra)/0.2)] backdrop-blur-sm transition-acento',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-texto-suave">{titulo}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-acento/10 text-acento transition-acento">
          <Icono className="h-4.5 w-4.5" strokeWidth={1.8} />
        </div>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-2xl font-black tracking-tight text-texto tabular-nums sm:text-3xl">
          {formatear(mostrado, formato)}
        </span>
        {urgente && (
          <Badge tono="peligro" late className="mb-1.5">
            Urgente
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {typeof delta === 'number' && (
          <span
            className={cn(
              'text-xs font-semibold',
              delta >= 0 ? 'text-exito' : 'text-peligro',
            )}
          >
            {delta >= 0 ? '▲' : '▼'} {porcentajeDO(Math.abs(delta))}
          </span>
        )}
        {pie && <span className="text-xs text-texto-tenue">{pie}</span>}
      </div>
    </motion.div>
  )
}
