'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Tema = 'dark' | 'light'

interface ThemeCtx {
  tema: Tema
  alternar: () => void
  setTema: (t: Tema) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El script anti-parpadeo del layout ya fijó data-theme antes del paint.
  const [tema, setTemaState] = useState<Tema>('dark')

  // Sincroniza el estado con lo que el script dejó puesto.
  useEffect(() => {
    const actual = (document.documentElement.getAttribute('data-theme') as Tema) || 'dark'
    setTemaState(actual)
  }, [])

  const setTema = useCallback((t: Tema) => {
    setTemaState(t)
    document.documentElement.setAttribute('data-theme', t)
    try {
      localStorage.setItem('jm-tema', t)
    } catch {}
  }, [])

  const alternar = useCallback(() => {
    setTema(tema === 'dark' ? 'light' : 'dark')
  }, [tema, setTema])

  return <Ctx.Provider value={{ tema, alternar, setTema }}>{children}</Ctx.Provider>
}

export function useTema() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTema debe usarse dentro de <ThemeProvider>')
  return ctx
}
