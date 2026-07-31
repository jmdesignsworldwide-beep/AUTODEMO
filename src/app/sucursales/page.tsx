import { Database, AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabaseConfigurado } from '@/lib/env'
import { requireSesion, ETIQUETA_ROL } from '@/lib/auth'
import { listarSucursales } from './acciones'
import { FormularioSucursal } from './formulario'
import { ListaSucursales } from './lista'
import type { Sucursal } from '@/lib/tipos'

export const dynamic = 'force-dynamic'

export default async function PaginaSucursales() {
  const sesion = await requireSesion()
  const configurado = supabaseConfigurado()

  let sucursales: Sucursal[] = []
  let errorLectura: string | null = null

  if (configurado) {
    try {
      sucursales = await listarSucursales()
    } catch (e) {
      errorLectura = e instanceof Error ? e.message : 'Error desconocido al leer.'
    }
  }

  return (
    <AppShell
      titulo="Sucursales"
      usuario={{
        nombre: sesion.user.email ?? 'Usuario',
        rol: sesion.rol ? ETIQUETA_ROL[sesion.rol] : '—',
        esSuperadmin: sesion.rol === 'superadmin',
      }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-texto">Sucursales</h2>
          <p className="mt-1 text-texto-suave">CRUD real contra Supabase.</p>
        </div>

        {!configurado && (
          <Card className="mb-8 border-alerta/30">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alerta" />
              <div className="text-sm text-texto">
                <p className="font-semibold">Supabase todavía no está configurado.</p>
                <p className="mt-1 text-texto-suave">
                  Faltan <code className="text-acento">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
                  <code className="text-acento">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> y la{' '}
                  <code className="text-acento">SUPABASE_SERVICE_ROLE_KEY</code> (esta última solo en el
                  servidor, marcada como Sensitive).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {errorLectura && (
          <Card className="mb-8 border-peligro/30">
            <CardContent className="flex items-start gap-3 pt-6 text-sm text-peligro">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">No se pudo leer de Supabase.</p>
                <p className="mt-1 text-texto-suave">{errorLectura}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-acento" /> Nueva sucursal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormularioSucursal />
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
                Registradas ({sucursales.length})
              </h3>
            </div>
            <ListaSucursales sucursales={sucursales} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
