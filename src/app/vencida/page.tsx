import { Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cerrarSesion } from '@/app/login/acciones'

export default function Vencida() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm border-alerta/30">
        <CardContent className="flex flex-col items-center pt-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-alerta/10 text-alerta">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-texto">Tu cuenta de demostración venció</h1>
          <p className="mt-2 text-sm text-texto-suave">
            El período de acceso llegó a su fin. Contacta a JM Nexus para renovarlo.
          </p>
          <form action={cerrarSesion} className="mt-6">
            <Button variant="secundario" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
