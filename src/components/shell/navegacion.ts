import { LayoutDashboard, Building2, Palette, type LucideIcon } from 'lucide-react'

export interface ItemNav {
  href: string
  etiqueta: string
  icono: LucideIcon
}

// Navegación mínima de la Tanda 1. Crece por tanda.
export const NAV: ItemNav[] = [
  { href: '/panel', etiqueta: 'Panorama', icono: LayoutDashboard },
  { href: '/sucursales', etiqueta: 'Sucursales', icono: Building2 },
  { href: '/sistema', etiqueta: 'Sistema de diseño', icono: Palette },
]
