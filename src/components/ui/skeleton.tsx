import * as React from 'react'
import { cn } from '@/lib/utils'

// El skeleton es lo que hace que se sienta caro. Brillo que barre por encima,
// tokenizado (el destello usa el token de texto a baja opacidad).
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-md bg-superficie-alta', className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[brillo-carga_1.5s_infinite] bg-gradient-to-r from-transparent via-texto/10 to-transparent" />
    </div>
  )
}
