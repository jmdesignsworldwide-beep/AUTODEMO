'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FormularioLogin } from './formulario'
import { FormularioPin } from './pin-formulario'
import type { UsuarioPin } from './pin-acciones'

export function Acceso({
  dispositivoAutorizado,
  usuarios,
}: {
  dispositivoAutorizado: boolean
  usuarios: UsuarioPin[]
}) {
  const [tab, setTab] = useState<'pass' | 'pin'>('pass')

  // Sin dispositivo autorizado, el PIN ni existe: solo contraseña.
  if (!dispositivoAutorizado) return <FormularioLogin />

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-token border border-borde p-1">
        {(['pass', 'pin'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md py-2 text-sm font-semibold transition-acento',
              tab === t ? 'bg-acento text-acento-texto' : 'text-texto-suave hover:text-texto',
            )}
          >
            {t === 'pass' ? 'Contraseña' : 'PIN'}
          </button>
        ))}
      </div>
      {tab === 'pass' ? <FormularioLogin /> : <FormularioPin usuarios={usuarios} />}
    </div>
  )
}
