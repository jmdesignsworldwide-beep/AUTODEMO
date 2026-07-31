'use client'

import { useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, ShieldCheck, Clock, Tablet, Trash2, AlertCircle, Copy } from 'lucide-react'
import { AppShell, type UsuarioShell } from '@/components/shell/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { fechaDominicana } from '@/lib/utils'
import {
  crearCuentaDemo,
  extenderVigencia,
  revocarCuentaDemo,
  revocarDispositivo,
  type ResCrear,
} from './acciones'

export interface CuentaDemo {
  id: string
  nombre: string
  email: string
  rol: string
  venceAt: string | null
  activa: boolean
}
export interface DispositivoItem {
  id: string
  etiqueta: string
  activo: boolean
  lastSeen: string | null
  renovadoAt: string | null
}

const DIAS_VIGENCIA_DISPOSITIVO = 90

function vencimientoDispositivo(renovadoAt: string | null): { txt: string; tono: 'exito' | 'alerta' | 'peligro' | 'neutro' } {
  if (!renovadoAt) return { txt: 'Sin datos', tono: 'neutro' }
  const venceMs = new Date(renovadoAt).getTime() + DIAS_VIGENCIA_DISPOSITIVO * 86400000
  const restanMs = venceMs - Date.now()
  if (restanMs <= 0) return { txt: 'Vencido — re-autorizar', tono: 'peligro' }
  const dias = Math.ceil(restanMs / 86400000)
  return { txt: `Vence en ${dias} día${dias === 1 ? '' : 's'}`, tono: dias <= 10 ? 'alerta' : 'exito' }
}

const ETIQUETA_ROL: Record<string, string> = {
  dueno: 'Dueño',
  gerente: 'Gerente',
  asesor: 'Asesor',
  cajero: 'Cajero',
  tecnico: 'Técnico',
  almacenista: 'Almacenista',
}

function vigenciaTexto(venceAt: string | null): { txt: string; tono: 'exito' | 'alerta' | 'peligro' | 'neutro' } {
  if (!venceAt) return { txt: 'Sin vencimiento', tono: 'neutro' }
  const ms = new Date(venceAt).getTime() - Date.now()
  if (ms <= 0) return { txt: 'Vencida', tono: 'peligro' }
  const dias = Math.ceil(ms / 86400000)
  return { txt: `${dias} día${dias === 1 ? '' : 's'}`, tono: dias <= 5 ? 'alerta' : 'exito' }
}

export function CapaBVista({
  usuario,
  cuentas,
  dispositivos,
}: {
  usuario: UsuarioShell
  cuentas: CuentaDemo[]
  dispositivos: DispositivoItem[]
}) {
  const [estado, accion, pendiente] = useActionState<ResCrear, FormData>(crearCuentaDemo, null)

  return (
    <AppShell titulo="Capa B — Acceso demo" usuario={usuario}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-texto">
            <ShieldCheck className="h-6 w-6 text-acento" /> Acceso de demostración
          </h2>
          <p className="mt-1 text-texto-suave">
            Cuentas con vigencia y dispositivos autorizados. Invisible para todo rol que no sea súper-admin.
          </p>
        </div>

        {/* Crear cuenta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-acento" /> Nueva cuenta demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={accion} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" placeholder="Cliente Demo" required maxLength={80} />
              </div>
              <div>
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" placeholder="demo@cliente.do" required />
              </div>
              <div>
                <Label htmlFor="rol">Rol</Label>
                <select
                  id="rol"
                  name="rol"
                  required
                  className="flex h-11 w-full rounded-token border border-borde bg-superficie-elevada px-4 text-sm text-texto focus-visible:border-acento/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/25"
                >
                  {Object.entries(ETIQUETA_ROL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="vigencia">Vigencia</Label>
                <select
                  id="vigencia"
                  name="vigencia"
                  defaultValue="30"
                  className="flex h-11 w-full rounded-token border border-borde bg-superficie-elevada px-4 text-sm text-texto focus-visible:border-acento/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento/25"
                >
                  <option value="7">7 días</option>
                  <option value="15">15 días</option>
                  <option value="30">30 días</option>
                  <option value="90">90 días</option>
                  <option value="sin">Sin vencimiento</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pendiente} className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4" />
                  {pendiente ? 'Creando…' : 'Crear cuenta demo'}
                </Button>
              </div>
            </form>

            <AnimatePresence>
              {estado?.ok && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-token border border-exito/30 bg-exito/10 p-4 text-sm"
                >
                  <p className="flex items-center gap-2 font-semibold text-exito">
                    <Copy className="h-4 w-4" /> Cuenta creada — copia y comparte estas credenciales:
                  </p>
                  <p className="mt-2 font-mono text-texto">{estado.email}</p>
                  <p className="font-mono text-texto">{estado.password}</p>
                  <p className="mt-1 text-xs text-texto-tenue">Esta contraseña no se vuelve a mostrar.</p>
                </motion.div>
              )}
              {estado && !estado.ok && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-2 rounded-token border border-peligro/30 bg-peligro/10 px-4 py-3 text-sm text-peligro"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {estado.error}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Cuentas */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-texto-suave">
            Cuentas demo ({cuentas.length})
          </h3>
          {cuentas.length === 0 ? (
            <EmptyState icono={ShieldCheck} titulo="Sin cuentas demo" descripcion="Crea la primera arriba." />
          ) : (
            <ul className="space-y-2">
              {cuentas.map((c) => {
                const v = vigenciaTexto(c.venceAt)
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-token border border-borde bg-superficie-elevada/60 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-texto">
                        {c.nombre} <span className="text-texto-tenue">· {ETIQUETA_ROL[c.rol] ?? c.rol}</span>
                      </p>
                      <p className="truncate text-xs text-texto-tenue">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tono={v.tono}>
                        <Clock className="h-3 w-3" /> {v.txt}
                      </Badge>
                      <form action={extenderVigencia.bind(null, c.id, 30)}>
                        <Button type="submit" variant="secundario" size="sm">
                          +30 días
                        </Button>
                      </form>
                      <form action={revocarCuentaDemo.bind(null, c.id)}>
                        <Button type="submit" variant="peligro" size="sm" title="Revocar (vence ya)">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Dispositivos */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-texto-suave">
            Dispositivos autorizados ({dispositivos.filter((d) => d.activo).length})
          </h3>
          {dispositivos.length === 0 ? (
            <EmptyState icono={Tablet} titulo="Sin dispositivos autorizados" descripcion="Un gerente autoriza cada tablet desde su terminal." />
          ) : (
            <ul className="space-y-2">
              {dispositivos.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-token border border-borde bg-superficie-elevada/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Tablet className={d.activo ? 'h-5 w-5 text-acento' : 'h-5 w-5 text-texto-tenue'} />
                    <div>
                      <p className="font-semibold text-texto">{d.etiqueta}</p>
                      <p className="text-xs text-texto-tenue">
                        {d.activo ? 'Activo' : 'Revocado'}
                        {d.lastSeen ? ` · visto ${fechaDominicana(d.lastSeen)}` : ' · nunca usado'}
                      </p>
                    </div>
                  </div>
                  {d.activo && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const v = vencimientoDispositivo(d.renovadoAt)
                        return (
                          <Badge tono={v.tono}>
                            <Clock className="h-3 w-3" /> {v.txt}
                          </Badge>
                        )
                      })()}
                      <form action={revocarDispositivo.bind(null, d.id)}>
                        <Button type="submit" variant="peligro" size="sm">
                          Revocar
                        </Button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  )
}
