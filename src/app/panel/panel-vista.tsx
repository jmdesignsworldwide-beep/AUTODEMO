'use client'

import Link from 'next/link'
import { Building2, Palette, ArrowRight, Database } from 'lucide-react'
import { AppShell, type UsuarioShell } from '@/components/shell/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/ui/kpi-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ListaStagger, ItemStagger } from '@/components/ui/stagger'
import { fechaDominicana } from '@/lib/utils'
import type { Sucursal } from '@/lib/tipos'

// Vista cliente del panorama: recibe SOLO datos serializables desde el
// server component. Los iconos (funciones) se importan aquí, del lado cliente.
export function PanelVista({
  sucursales,
  configurado,
  error,
  usuario,
}: {
  sucursales: Sucursal[]
  configurado: boolean
  error: string | null
  usuario: UsuarioShell
}) {
  return (
    <AppShell titulo="Panorama" usuario={usuario}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-texto">Buen día 👋</h2>
          <p className="mt-1 text-texto-suave">Un vistazo rápido a tu operación.</p>
        </div>

        {(error || !configurado) && (
          <Card className="border-alerta/30">
            <CardContent className="flex items-start gap-3 pt-6 text-sm">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-alerta" />
              <p className="text-texto-suave">
                {configurado
                  ? 'No se pudo leer de Supabase en este momento.'
                  : 'Supabase aún no está configurado en este entorno.'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard titulo="Sucursales" valor={sucursales.length} icono={Building2} pie="registradas" />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-texto-suave">Sucursales</h3>
            <Link href="/sucursales" className="text-sm text-acento transition-acento hover:underline">
              Ver todas
            </Link>
          </div>

          {sucursales.length === 0 ? (
            <EmptyState
              icono={Building2}
              titulo="Todavía no hay sucursales"
              descripcion="Registra la primera para empezar a construir la operación."
              accion={
                <Link href="/sucursales">
                  <Button size="sm">
                    Ir a sucursales <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <ListaStagger className="space-y-2">
              {sucursales.map((s) => (
                <ItemStagger key={s.id}>
                  <div className="flex items-center gap-3 rounded-token border border-borde bg-superficie-elevada/60 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-acento/10 text-acento transition-acento">
                      <Building2 className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-texto">{s.nombre}</p>
                      <p className="text-xs text-texto-tenue">Creada {fechaDominicana(s.created_at)}</p>
                    </div>
                  </div>
                </ItemStagger>
              ))}
            </ListaStagger>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link href="/sucursales">
            <Card className="h-full transition-acento hover:border-acento/50">
              <CardContent className="flex items-center gap-3 pt-6">
                <Building2 className="h-5 w-5 text-acento" />
                <div>
                  <p className="font-semibold text-texto">Sucursales</p>
                  <p className="text-sm text-texto-suave">Crear y administrar</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/sistema">
            <Card className="h-full transition-acento hover:border-acento/50">
              <CardContent className="flex items-center gap-3 pt-6">
                <Palette className="h-5 w-5 text-acento" />
                <div>
                  <p className="font-semibold text-texto">Sistema de diseño</p>
                  <p className="text-sm text-texto-suave">Ver primitivos y el acento por giro</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      </div>
    </AppShell>
  )
}
