import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-token border border-borde bg-superficie-elevada px-4 text-sm text-texto placeholder:text-texto-tenue transition-acento focus-visible:outline-none focus-visible:border-acento/70 focus-visible:ring-2 focus-visible:ring-acento/25 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-medium uppercase tracking-wide text-texto-suave', className)}
      {...props}
    />
  )
}
