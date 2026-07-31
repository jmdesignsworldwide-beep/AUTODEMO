import { LayoutDashboard, Building2, Palette, Tablet, ShieldCheck, type LucideIcon } from 'lucide-react'

export interface ItemNav {
  href: string
  etiqueta: string
  icono: LucideIcon
  /** Si se define, solo estos roles ven el enlace. Sin definir = todos. */
  roles?: string[]
}

// Navegación de la Tanda 2. Crece por tanda. La visibilidad por rol aquí es
// cosmética; la muralla real es requireRol en cada ruta + el RLS.
export const NAV: ItemNav[] = [
  { href: '/panel', etiqueta: 'Panorama', icono: LayoutDashboard },
  { href: '/sucursales', etiqueta: 'Sucursales', icono: Building2 },
  { href: '/dispositivo', etiqueta: 'Dispositivo', icono: Tablet, roles: ['superadmin', 'dueno', 'gerente'] },
  { href: '/capa-b', etiqueta: 'Capa B', icono: ShieldCheck, roles: ['superadmin'] },
  { href: '/sistema', etiqueta: 'Sistema de diseño', icono: Palette, roles: ['superadmin'] },
]
