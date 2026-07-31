import { Tablet } from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireRol, ETIQUETA_ROL } from '@/lib/auth'
import { estadoDispositivo } from '@/app/login/pin-acciones'
import { FormularioDispositivo } from './formulario'

export const dynamic = 'force-dynamic'

// Solo gestores autorizan dispositivos (acción consciente).
export default async function DispositivoPage() {
  const sesion = await requireRol(['superadmin', 'dueno', 'gerente'])
  const { autorizado } = await estadoDispositivo()

  return (
    <AppShell
      titulo="Dispositivo"
      usuario={{
        nombre: sesion.user.email ?? 'Usuario',
        rol: sesion.rol ? ETIQUETA_ROL[sesion.rol] : '—',
        rolId: sesion.rol ?? undefined,
        esSuperadmin: sesion.rol === 'superadmin',
      }}
    >
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-texto">Autorizar este dispositivo</h2>
          <p className="mt-1 text-texto-suave">
            Solo un dispositivo autorizado aquí puede usar el login con PIN. En un
            navegador desconocido, el PIN no aparece — solo contraseña.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tablet className="h-5 w-5 text-acento" /> Este terminal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioDispositivo yaAutorizado={autorizado} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
