'use client'

import { useEffect, useState } from 'react'

/** ¿Estamos en viewport móvil? Pensado a 390px primero. */
export function useEsMovil(breakpoint = 640) {
  const [movil, setMovil] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const actualizar = () => setMovil(mq.matches)
    actualizar()
    mq.addEventListener('change', actualizar)
    return () => mq.removeEventListener('change', actualizar)
  }, [breakpoint])
  return movil
}
