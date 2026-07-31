import { requireRol, ETIQUETA_ROL } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CapaBVista, type CuentaDemo, type DispositivoItem } from './vista'

export const dynamic = 'force-dynamic'

export default async function CapaBPage() {
  const sesion = await requireRol(['superadmin'])
  const admin = supabaseAdmin()

  const [{ data: cuentas }, { data: perfiles }, { data: usuarios }, { data: disp }] = await Promise.all([
    admin.from('cuenta_demo').select('id, user_id, etiqueta, vence_at, activa, created_at').order('created_at', { ascending: false }),
    admin.from('perfil').select('id, nombre, rol'),
    admin.auth.admin.listUsers(),
    admin.from('dispositivo').select('id, etiqueta, sucursal_id, activo, last_seen, created_at').order('created_at', { ascending: false }),
  ])

  const emailPorId = new Map((usuarios?.users ?? []).map((u) => [u.id, u.email ?? '']))
  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]))

  const listaCuentas: CuentaDemo[] = (cuentas ?? []).map((c) => {
    const p = perfilPorId.get(c.user_id)
    return {
      id: c.id,
      nombre: p?.nombre ?? c.etiqueta ?? '—',
      email: emailPorId.get(c.user_id) ?? '—',
      rol: p?.rol ?? '—',
      venceAt: c.vence_at,
      activa: c.activa,
    }
  })

  const listaDisp: DispositivoItem[] = (disp ?? []).map((d) => ({
    id: d.id,
    etiqueta: d.etiqueta ?? 'Terminal',
    activo: d.activo,
    lastSeen: d.last_seen,
  }))

  return (
    <CapaBVista
      usuario={{
        nombre: sesion.user.email ?? 'Súper-admin',
        rol: ETIQUETA_ROL.superadmin,
        rolId: 'superadmin',
        esSuperadmin: true,
      }}
      cuentas={listaCuentas}
      dispositivos={listaDisp}
    />
  )
}
