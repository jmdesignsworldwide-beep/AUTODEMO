'use client'

import { useState } from 'react'
import {
  Palette,
  Wallet,
  Car,
  Timer,
  RefreshCw,
  Bell,
  MessageSquare,
  Inbox,
} from 'lucide-react'
import { AppShell } from '@/components/shell/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/ui/kpi-card'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ListaStagger, ItemStagger } from '@/components/ui/stagger'
import { useToast } from '@/components/ui/toast'
import { useGiro } from '@/components/providers/giro-provider'

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-suave">{titulo}</h2>
      {children}
    </section>
  )
}

export default function SistemaDeDiseno() {
  const [modal, setModal] = useState(false)
  const [cargando, setCargando] = useState(false)
  const { toast } = useToast()
  const { giro } = useGiro()

  const simularCarga = () => {
    setCargando(true)
    setTimeout(() => setCargando(false), 1800)
  }

  return (
    <AppShell titulo="Sistema de diseño">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Nota de la demo viva */}
        <Card className="border-acento/30">
          <CardContent className="flex items-start gap-3 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-acento/10 text-acento transition-acento">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-texto">
                Cambia el giro arriba y mira TODO mudar de color.
              </p>
              <p className="mt-1 text-sm text-texto-suave">
                Cada color es un <span className="text-acento transition-acento">token</span>. Al
                cambiar el giro se reasigna <code className="text-acento">--acento</code> en runtime
                y ningún componente se entera: todos consumen el token y responden al instante.
                Giro activo: <span className="font-semibold text-acento transition-acento">{giro.nombre}</span>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPIs con count-up */}
        <Seccion titulo="Tarjetas KPI (count-up al aparecer)">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard titulo="Ingresos hoy" valor={186400} formato="moneda" icono={Wallet} delta={12.4} pie="vs. ayer" />
            <KpiCard titulo="Vehículos activos" valor={340} icono={Car} delta={3.1} pie="en taller" />
            <KpiCard titulo="Puestos ocupados" valor={78.5} formato="porcentaje" icono={Timer} delta={-4.2} pie="ocupación" />
            <KpiCard titulo="Bahías secuestradas" valor={3} icono={Timer} urgente pie="requieren acción" />
          </div>
          <p className="text-xs text-texto-tenue">
            * Cifras de ejemplo para mostrar el primitivo. Los números reales llegan con cada módulo.
          </p>
        </Seccion>

        {/* Botones */}
        <Seccion titulo="Botones">
          <div className="flex flex-wrap gap-3">
            <Button>Primario</Button>
            <Button variant="secundario">Secundario</Button>
            <Button variant="contorno">Contorno</Button>
            <Button variant="fantasma">Fantasma</Button>
            <Button variant="peligro">Peligro</Button>
          </div>
        </Seccion>

        {/* Badges */}
        <Seccion titulo="Badges (el de urgencia late)">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tono="neutro">Neutro</Badge>
            <Badge tono="acento">Acento</Badge>
            <Badge tono="exito">Pagado</Badge>
            <Badge tono="alerta">Por cobrar</Badge>
            <Badge tono="peligro" late>
              Secuestrado
            </Badge>
          </div>
        </Seccion>

        {/* Interacciones */}
        <Seccion titulo="Modal, hoja inferior y toasts">
          <div className="flex flex-wrap gap-3">
            <Button variant="secundario" onClick={() => setModal(true)}>
              <MessageSquare className="h-4 w-4" /> Abrir modal / hoja
            </Button>
            <Button
              variant="secundario"
              onClick={() => toast({ tono: 'exito', titulo: 'Guardado', mensaje: 'Cambios guardados correctamente.' })}
            >
              <Bell className="h-4 w-4" /> Toast de éxito
            </Button>
            <Button
              variant="secundario"
              onClick={() => toast({ tono: 'peligro', titulo: 'Atención', mensaje: 'No se pudo completar la acción.' })}
            >
              <Bell className="h-4 w-4" /> Toast de error
            </Button>
          </div>
        </Seccion>

        {/* Skeletons */}
        <Seccion titulo="Skeletons de carga (nunca un spinner solo)">
          <div className="flex items-center gap-3">
            <Button variant="secundario" onClick={simularCarga}>
              <RefreshCw className="h-4 w-4" /> Simular carga
            </Button>
          </div>
          {cargando ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="space-y-3 pt-6">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-texto-tenue">Toca «Simular carga» para ver el brillo.</p>
          )}
        </Seccion>

        {/* Lista con stagger */}
        <Seccion titulo="Entrada escalonada (stagger)">
          <ListaStagger className="space-y-2">
            {['Toyota Corolla · A123456', 'Honda CR-V · G234567', 'Hyundai Elantra · L045821', 'Kia Rio · I089344'].map(
              (t) => (
                <ItemStagger key={t}>
                  <div className="flex items-center gap-3 rounded-token border border-borde bg-superficie-elevada/60 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-acento/10 text-acento transition-acento">
                      <Car className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-texto">{t}</span>
                  </div>
                </ItemStagger>
              ),
            )}
          </ListaStagger>
        </Seccion>

        {/* Estado vacío */}
        <Seccion titulo="Estado vacío con carácter de marca">
          <EmptyState
            icono={Inbox}
            titulo="Todavía no hay nada por aquí"
            descripcion="Cuando entren vehículos al taller, esta lista cobra vida. Nada de pantallas frías."
            accion={<Button size="sm">Registrar el primero</Button>}
          />
        </Seccion>
      </div>

      <Modal
        abierto={modal}
        onCambio={setModal}
        titulo="Hoja inferior en móvil, modal en escritorio"
        descripcion="En 390px sube desde abajo con asa; en escritorio se centra."
      >
        <div className="space-y-4">
          <p className="text-sm text-texto-suave">
            Este mismo componente se adapta al pulgar. Cierra con la X, con Escape o tocando afuera.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="fantasma" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setModal(false)
                toast({ tono: 'acento', mensaje: 'Listo, todo consume tokens.' })
              }}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
