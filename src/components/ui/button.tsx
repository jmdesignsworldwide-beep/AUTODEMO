import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const botonVariantes = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ambar/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primario:
          'bg-ambar text-grafito hover:bg-ambar-600 shadow-[0_4px_20px_-4px_rgba(255,138,43,0.5)]',
        secundario:
          'bg-grafito-700 text-titanio-300 border border-grafito-600 hover:bg-grafito-600',
        fantasma: 'text-titanio hover:bg-grafito-700 hover:text-titanio-300',
        peligro:
          'bg-transparent text-titanio border border-grafito-600 hover:border-red-500/60 hover:text-red-400',
      },
      size: {
        md: 'h-11 px-5',
        sm: 'h-9 px-3 text-xs',
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
