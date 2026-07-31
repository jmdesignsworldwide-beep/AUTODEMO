import Link from 'next/link'
import { ArrowLeft, Database, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabaseConfigurado } from '@/lib/env'
import { listarSucursales } from './acciones'
import { FormularioSucursal } from './formulario'
import { ListaSucursales } from './lista'
import type { Sucursal } from '@/lib/tipos'

// La prueba de vida de la Tanda 0 vive aquí:
// crear una sucursal desde la interfaz → guardarla en Supabase → que siga
// ahí después de recargar. Sin auth todavía (llega en la Tanda 2); el acceso
// va por Server Actions con service_role, porque `sucursal` es RLS deny-all.

export const dynamic = 'force-dynamic'

export default async function PaginaSucursales() {
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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-titanio hover:text-ambar"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-titanio-300">Sucursales</h1>
        <p className="mt-1 text-titanio">
          Prueba de vida de la Tanda 0 — CRUD real contra Supabase.
        </p>
      </div>

      {!configurado && (
        <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ambar" />
            <div className="text-sm text-titanio-300">
              <p className="font-semibold">Supabase todavía no está configurado.</p>
              <p className="mt-1 text-titanio">
                Faltan <code className="text-ambar">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
                <code className="text-ambar">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> y la{' '}
                <code className="text-ambar">SUPABASE_SERVICE_ROLE</code> (esta última solo en el
                servidor, marcada como Sensitive). Al montarlas, esta pantalla queda viva.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {errorLectura && (
        <Card className="mb-8 border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">No se pudo leer de Supabase.</p>
              <p className="mt-1 text-titanio">{errorLectura}</p>
              <p className="mt-1 text-titanio/60">
                Probablemente falta correr la migración de la tabla <code>sucursal</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-ambar" /> Nueva sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioSucursal />
          </CardContent>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-wide text-titanio">
              Registradas ({sucursales.length})
            </h3>
          </div>
          <ListaSucursales sucursales={sucursales} />
        </div>
      </div>

      <footer className="mt-16 border-t border-grafito-700 pt-6 text-center text-xs text-titanio/40">
        Documento interno de demostración. No válido como comprobante fiscal.
      </footer>
    </main>
  )
}
