# 🔐 JM AUTO — Patrón de acceso a datos

> **Decisión de arquitectura. No es negociable y aplica a las 22 tandas.**
> Este documento gobierna CÓMO el código habla con la base de datos.
> Si una tanda contradice esto, la tanda está mal — no el documento.

---

## ⛔ Regla permanente — `user_metadata` es campo del atacante

`user_metadata` es un campo **controlado por el usuario**. Cualquiera puede
escribir en el suyo desde la consola del navegador con `updateUser()`.

**NUNCA se lee `user_metadata`** para ninguna decisión de autorización, de
precio, de rol, de sucursal, de vigencia, ni de nada que tenga consecuencia.
Sirve únicamente para **preferencias cosméticas del propio usuario**, como el
tema oscuro o claro.

Todo lo que importa vive en **`app_metadata`** —solo escribible por el
servidor— o en la tabla **`perfil`**, protegida por RLS. El rol, la sucursal y
la vigencia se leen del **JWT** (inyectados por el auth hook desde `perfil` y
`cuenta_demo`), jamás de `user_metadata`.

> El riesgo no es hoy: es la Tanda 9 o la 14, cuando alguien lea
> `user.user_metadata.algo` para una decisión de negocio que resulte estar
> controlada por el propio usuario. Por eso la regla es permanente.

---

## La regla de las dos murallas

El acceso a datos de JM AUTO se protege con **dos murallas**, en este orden de importancia:

### 1ª muralla — RLS (la principal)

**Row Level Security es la muralla PRINCIPAL.** Toda tabla de negocio nace con
`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` y política **deny-all**
por defecto.

A partir de la Tanda 2 (cuando exista autenticación), las políticas evalúan el
**JWT del usuario real**:

- `auth.uid()` — quién es.
- su **rol** (dueño, gerente, asesor, cajero, técnico, almacenista).
- su **`sucursal_id`** — a qué sucursal pertenece.

La base de datos decide, por sí sola, qué filas puede ver y tocar cada usuario.
Si el código tuviera un bug, **la muralla RLS sigue de pie.** Esa es la garantía.

### 2ª muralla — el código del servidor

La validación en el servidor (rol, permiso, vigencia, zod) es la **segunda
muralla**, no la única. Refuerza, nunca reemplaza, a la RLS.

> La regla dura: **el RLS es la muralla, el código es el refuerzo.**
> Nunca al revés. Nunca el código como única defensa.

---

## `service_role` — uso reservado

La llave `service_role` **ATRAVIESA la RLS** (tiene `BYPASSRLS` por diseño en
Supabase). Por eso su uso está **estrictamente reservado**:

✅ **Permitido** — lo genuinamente privilegiado:
- El **súper-admin de la Capa B** (acceso demo con vigencia, invisible al cliente).
- **Tareas administrativas** de sistema (migraciones, mantenimiento).
- **Procesos de sistema** sin usuario (jobs, webhooks internos, seeds).

❌ **Prohibido**:
- El **CRUD normal de cualquier módulo**. Jamás.

> Si el proyecto entero escribiera con `service_role`, la RLS dejaría de
> proteger y se volvería **decoración**. Y el Security Advisor **no lo
> detectaría**, porque técnicamente todo estaría "bien configurado". Ese es
> exactamente el error que este documento existe para prevenir.

El CRUD normal, desde la Tanda 2 en adelante, **usa la sesión del usuario real**
(cliente Supabase con el JWT del usuario), y deja que la RLS haga su trabajo.

---

## Excepción explícita y TEMPORAL de la Tanda 0

En la **Tanda 0 no existe autenticación** todavía (llega en la Tanda 2). Por eso,
y **solo por eso**, el humo de vida (`sucursal`) escribe con `service_role` a
través de Server Actions.

Esto es una **deuda técnica consciente y acotada**, marcada en el código con:

```ts
// TEMPORAL TANDA 0 — reemplazar en Tanda 2 por sesión de usuario.
```

### Qué se hace en la Tanda 2 (cierre de esta deuda)

1. Se implementa la autenticación y los seis roles.
2. Se escriben las **políticas RLS reales** por rol y por `sucursal_id` para
   `sucursal` (y toda tabla de negocio).
3. El acceso de los módulos se **migra a la sesión del usuario** — se retira
   `service_role` del CRUD.
4. `service_role` queda **únicamente** en los usos reservados de arriba.
5. `sucursal.created_by` pasa de nullable a **FK contra `auth.users(id)`**.

> **Búsqueda de cierre:** al terminar la Tanda 2, `grep` de `service_role` y de
> `supabaseAdmin(` en el repo no debe aparecer en ningún CRUD de módulo — solo
> en Capa B y procesos de sistema. Todo `// TEMPORAL TANDA 0` debe estar resuelto.

---

## Checklist para cada tanda nueva (de la 2 en adelante)

- [ ] ¿La tabla nace con RLS + FORCE + deny-all?
- [ ] ¿Existen políticas por rol y por `sucursal_id` que evalúan el JWT real?
- [ ] ¿El CRUD del módulo usa la **sesión del usuario**, no `service_role`?
- [ ] ¿`service_role` aparece solo en Capa B / procesos de sistema?
- [ ] ¿Se probó por **URL directa** con cada rol lo que no le toca?
