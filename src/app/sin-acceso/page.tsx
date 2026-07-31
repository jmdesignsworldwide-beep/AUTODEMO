import Link from 'next/link'
import { ShieldX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SinAcceso() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm border-peligro/30">
        <CardContent className="flex flex-col items-center pt-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-peligro/10 text-peligro">
            <ShieldX className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-texto">No tienes acceso a esta sección</h1>
          <p className="mt-2 text-sm text-texto-suave">
            Tu rol no puede ver esta pantalla. Si crees que es un error, avisa a tu gerente.
          </p>
          <Link href="/panel" className="mt-6">
            <Button variant="secundario">Volver al panorama</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
