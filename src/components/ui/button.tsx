import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Todo por token. El hover del primario usa brightness (no un color fijo),
// así el botón muda con --acento sin conocer ningún color.
const botonVariantes = cva(
  'inline-flex items-center justify-center gap-2 rounded-token font-semibold transition-acento duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/60 focus-visible:ring-offset-2 focus-visible:ring-offset-superficie disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        primario:
          'bg-acento text-acento-texto hover:brightness-110 shadow-[0_6px_22px_-6px_rgb(var(--acento)/0.55)]',
        secundario: 'bg-superficie-alta text-texto border border-borde hover:bg-superficie-elevada',
        fantasma: 'text-texto-suave hover:bg-superficie-alta hover:text-texto',
        contorno: 'border border-borde text-texto hover:border-acento/60 hover:text-acento',
        peligro: 'border border-borde text-texto-suave hover:border-peligro/60 hover:text-peligro',
      },
      size: {
        md: 'h-11 px-5 text-sm',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primario', size: 'md' },
  },
)

export interface BotonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof botonVariantes> {}

export const Button = React.forwardRef<HTMLButtonElement, BotonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(botonVariantes({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

export { botonVariantes }
