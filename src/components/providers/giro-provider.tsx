'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { GIRO_MAESTRO, GIROS, type Giro } from '@/lib/giros'

interface GiroCtx {
  giro: Giro
  giros: Giro[]
  setGiro: (id: string) => void
}

const Ctx = createContext<GiroCtx | null>(null)

/**
 * Reescribe --acento y --acento-texto sobre :root en RUNTIME.
 * Como es un estilo inline en documentElement, gana sobre las reglas del
 * stylesheet (incluido el tema claro/oscuro): el acento del giro persiste
 * aunque se cambie de tema. Ningún componente se entera — todos consumen
 * el token bg-acento / text-acento y mudan solos.
 */
function aplicarAcento(g: Giro) {
  const root = document.documentElement
  root.style.setProperty('--acento', g.acento)
  // --acento-texto calculado por luminancia (ver giros.ts): siempre legible.
  root.style.setProperty('--acento-texto', g.acentoTexto)
}

export function GiroProvider({ children }: { children: React.ReactNode }) {
  const [giro, setGiroState] = useState<Giro>(GIRO_MAESTRO)

  useEffect(() => {
    let inicial = GIRO_MAESTRO
    try {
      const guardado = localStorage.getItem('jm-giro')
      const encontrado = guardado ? GIROS.find((g) => g.id === guardado) : undefined
      if (encontrado) inicial = encontrado
    } catch {}
    setGiroState(inicial)
    aplicarAcento(inicial)
  }, [])

  const setGiro = useCallback((id: string) => {
    const g = GIROS.find((x) => x.id === id) ?? GIRO_MAESTRO
    setGiroState(g)
    aplicarAcento(g)
    try {
      localStorage.setItem('jm-giro', g.id)
    } catch {}
  }, [])

  return <Ctx.Provider value={{ giro, giros: GIROS, setGiro }}>{children}</Ctx.Provider>
}

export function useGiro() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGiro debe usarse dentro de <GiroProvider>')
  return ctx
}
