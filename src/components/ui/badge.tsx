import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariantes = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-acento',
  {
    variants: {
      tono: {
        acento: 'bg-acento/15 text-acento',
        neutro: 'bg-superficie-alta text-texto-suave',
        exito: 'bg-exito/15 text-exito',
        alerta: 'bg-alerta/15 text-alerta',
        peligro: 'bg-peligro/15 text-peligro',
      },
    },
    defaultVariants: { tono: 'neutro' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariantes> {
  /** Late (pulso) cuando hay urgencia. */
  late?: boolean
}

export function Badge({ className, tono, late, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariantes({ tono }), className)} {...props}>
      {late && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-latido rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}
