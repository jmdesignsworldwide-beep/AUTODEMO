import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-grafito-600 bg-grafito-800 px-4 text-sm text-titanio-300 placeholder:text-titanio/50 transition-colors focus-visible:outline-none focus-visible:border-ambar/70 focus-visible:ring-2 focus-visible:ring-ambar/30 disabled:opacity-50',
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
      className={cn('mb-1.5 block text-xs font-medium uppercase tracking-wide text-titanio', className)}
      {...props}
    />
  )
}
