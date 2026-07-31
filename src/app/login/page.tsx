import { redirect } from 'next/navigation'
import { Car } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { sesionActual } from '@/lib/auth'
import { FormularioLogin } from './formulario'

export const dynamic = 'force-dynamic'

export default async function Login() {
  // Si ya hay sesión válida, no mostrar el login.
  const s = await sesionActual()
  if (s?.vigente) redirect('/panel')

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[380px] w-[380px] rounded-full bg-acento/10 blur-[120px] transition-acento" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-acento/30 bg-superficie-elevada text-acento shadow-[0_0_40px_-8px_rgb(var(--acento)/0.5)] transition-acento">
            <Car className="h-8 w-8" strokeWidth={1.6} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-texto">
            JM <span className="text-acento transition-acento">AUTO</span>
          </h1>
          <p className="mt-1 text-sm text-texto-suave">Entra a tu sistema</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <FormularioLogin />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-texto-tenue">
          Documento interno de demostración. No válido como comprobante fiscal.
        </p>
      </div>
    </main>
  )
}
