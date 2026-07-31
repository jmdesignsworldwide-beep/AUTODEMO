'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Car, Menu, X, LogOut, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV } from './navegacion'
import { GiroSwitcher } from '@/components/ui/giro-switcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cerrarSesion } from '@/app/login/acciones'

export interface UsuarioShell {
  nombre: string
  rol: string
  rolId?: string
  esSuperadmin?: boolean
}

function Marca({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-token border border-acento/30 bg-superficie-alta text-acento transition-acento">
        <Car className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="text-lg font-black tracking-tight text-texto">
        JM <span className="text-acento transition-acento">AUTO</span>
      </span>
    </Link>
  )
}

function Enlaces({ items, onNavegar }: { items: typeof NAV; onNavegar?: () => void }) {
  const ruta = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const activo = ruta === item.href || ruta.startsWith(item.href + '/')
        const Icono = item.icono
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavegar}
            className={cn(
              'group relative flex items-center gap-3 rounded-token px-3 py-2.5 text-sm font-medium transition-acento',
              activo
                ? 'bg-acento/10 text-acento'
                : 'text-texto-suave hover:bg-superficie-alta hover:text-texto',
            )}
          >
            {activo && (
              <motion.span
                layoutId="nav-activo"
                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-acento"
              />
            )}
            <Icono className="h-5 w-5 shrink-0" strokeWidth={activo ? 2 : 1.7} />
            {item.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({
  titulo,
  usuario,
  children,
}: {
  titulo: string
  usuario?: UsuarioShell
  children: React.ReactNode
}) {
  const [drawer, setDrawer] = React.useState(false)
  // Enlaces restringidos por rol se ocultan a quien no corresponde (la muralla
  // real es requireRol en cada ruta; esto es solo el menú).
  const items = NAV.filter((i) => !i.roles || (usuario?.rolId ? i.roles.includes(usuario.rolId) : false))

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-borde bg-superficie-elevada/50 p-5 lg:flex">
        <Marca />
        <div className="mt-8 flex-1">
          <Enlaces items={items} />
        </div>
        <div className="border-t border-borde pt-4 text-xs text-texto-tenue">
          Tanda 1 · Sistema de diseño
        </div>
      </aside>

      {/* Drawer móvil */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-40 bg-[rgb(var(--velo)/0.6)] backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-borde bg-superficie-elevada p-5 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Marca onClick={() => setDrawer(false)} />
                <button
                  onClick={() => setDrawer(false)}
                  className="rounded-lg p-1.5 text-texto-suave hover:bg-superficie-alta hover:text-texto"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Cerrar menú</span>
                </button>
              </div>
              <div className="mt-8 flex-1">
                <Enlaces items={items} onNavegar={() => setDrawer(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Columna principal */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-borde bg-superficie/80 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={() => setDrawer(true)}
              className="rounded-token border border-borde p-2 text-texto-suave hover:text-acento lg:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menú</span>
            </button>
            <h1 className="flex-1 truncate text-lg font-bold text-texto">{titulo}</h1>
            {usuario && (
              <div className="hidden items-center gap-2 rounded-token border border-borde px-3 py-1.5 sm:flex">
                <UserRound className="h-4 w-4 text-acento" />
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-texto">{usuario.nombre}</p>
                  <p className="text-[10px] uppercase tracking-wide text-texto-tenue">{usuario.rol}</p>
                </div>
              </div>
            )}
            <ThemeToggle />
            {usuario && (
              <form action={cerrarSesion}>
                <button
                  type="submit"
                  title="Cerrar sesión"
                  className="flex h-10 w-10 items-center justify-center rounded-token border border-borde text-texto-suave transition-acento hover:border-peligro/60 hover:text-peligro"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Cerrar sesión</span>
                </button>
              </form>
            )}
          </div>
          {/* Conmutador de giros — siempre a la vista para la demo */}
          <div className="border-t border-borde/60 px-4 py-2.5 sm:px-6">
            <GiroSwitcher />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

        <footer className="border-t border-borde px-6 py-4 text-center text-xs text-texto-tenue">
          Documento interno de demostración. No válido como comprobante fiscal.
        </footer>
      </div>
    </div>
  )
}
