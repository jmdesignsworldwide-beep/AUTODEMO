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

## 🧱 Pilar 9 — toda función `SECURITY DEFINER` se revoca de `PUBLIC`, `anon` y `authenticated`

Una función `SECURITY DEFINER` corre con los privilegios de **quien la creó**, no
de quien la llama. Si además conserva el `EXECUTE` que Postgres concede a
`PUBLIC` por defecto, **cualquiera con la anon key** —que es pública y viaja en
el navegador de todo el que abra el demo— puede invocarla directo por RPC contra
la API REST, **saltándose la aplicación entera**: el endpoint de servidor, el
throttle, el dispositivo autorizado, los candados de rol. Todo.

> El Security Advisor **no ve este hueco completo**: su lint
> `authenticated_security_definer_function_executable` mira **solo `authenticated`**.
> No dice nada de `anon`. Una función pre-sesión (como `verificar_pin`, que se
> llama cuando el usuario todavía es `anon`) puede salir "limpia" en el segundo
> pase con el hueco de `anon` abierto de par en par. Por eso el lint **no** es la
> prueba: la prueba es revocar de los tres y llamarla directo por RPC.

**La regla, permanente y sin excepción:**

```sql
REVOKE EXECUTE ON FUNCTION <función> FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION <función> FROM anon;
REVOKE EXECUTE ON FUNCTION <función> FROM authenticated;
-- y luego, SOLO al rol que de verdad la necesita:
GRANT  EXECUTE ON FUNCTION <función> TO <rol_mínimo>;
```

- `<rol_mínimo>` es el más bajo que la función necesita de verdad:
  `service_role` (funciones que llama el servidor pre-sesión, como `verificar_pin`,
  `fijar_pin`), `supabase_auth_admin` (el auth hook), o `authenticated` **solo**
  cuando la llama un usuario con sesión (como `mi_estado_vigencia()` desde el
  middleware — y aun así revocada de `PUBLIC` y `anon`, porque un usuario sin
  sesión no tiene nada que consultar).
- Aplica también, por higiene, a las funciones `SECURITY INVOKER` que arrastren
  el `EXECUTE` de `PUBLIC` por defecto: se revoca de `PUBLIC`/`anon` y se concede
  al rol que corresponda.

**Verificación obligatoria** (no basta el segundo pase del Advisor): con la anon
key y sin sesión, llamar la función por RPC directo → debe rebotar por permisos.
Repetir con una sesión de rol no autorizado → también debe rebotar. Se guardan
las respuestas crudas.

> El linter es una ayuda, no el auditor. El auditor eres tú, leyendo la lista de
> cada función `SECURITY DEFINER` con **quién puede ejecutarla** después de la
> migración.

---

## 🐤 Canario del middleware — la protección puede quedar MUDA sin avisar

En la Tanda 2 descubrimos que el `middleware.ts` estaba en la **raíz** del
proyecto, pero como este repo usa carpeta **`src/`**, Next.js espera el
middleware en **`src/middleware.ts`**. El de la raíz **nunca se registró** —y
no lanzó ningún error—. Durante toda la tanda la enforcement del middleware
(redirección a `/vencida`, la revocación instantánea) fue **código muerto**:
solo la RLS estaba de pie. Peor: una prueba de verificación salió en **verde**
certificando algo que **no existía**, porque el middleware apagado no deja rastro.

> **El middleware puede dejar de ejecutarse por ubicación de archivo o por
> configuración del matcher, sin lanzar ningún error.** Un falso-verde así es el
> error más caro del proyecto: no deja rastro.

**La defensa permanente — un canario:**

1. El middleware escribe una cabecera propia en **toda** respuesta:
   `x-jmauto-mw: 1` (ver `src/middleware.ts`).
2. Una prueba de humo (`npm run smoke:mw` → `scripts/smoke-middleware.mjs`)
   pide una **página protegida** y verifica que la cabecera esté presente.
3. Si no está, el middleware **no está corriendo** y la prueba **falla
   ruidosamente** (exit 1) con el diagnóstico.

Está probado en ambos sentidos: con el middleware en `src/` **pasa**; con el
middleware en la ubicación mala **revienta**. Ejecutar `smoke:mw` en cada tanda
(y en CI) cierra para siempre la posibilidad de que una protección de middleware
quede muda sin que nos enteremos.

> Regla: **ninguna verificación de una protección de middleware se da por buena
> sin que el canario esté verde.** El linter y las pruebas que "asumen" no bastan
> — hay que probar que el middleware corre de verdad.

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
- [ ] ¿Se **revocó `anon`** de la tabla nueva y se le quitó a `authenticated` lo que NO pasa por RLS (`TRUNCATE`/`TRIGGER`/`REFERENCES`)? Supabase hace `GRANT ALL` por defecto a `anon`/`authenticated`; RLS bloquea las filas, pero el privilegio de tabla se retira igual (mínimo privilegio). Ver `0004_endurecimiento_grants.sql`.
- [ ] ¿Toda función `SECURITY DEFINER` nueva se revocó de `PUBLIC`, `anon` y `authenticated`, con `GRANT` solo al rol mínimo? (Pilar 9)
- [ ] ¿Se probó por **RPC directo** con la anon key —sin sesión— que las funciones reservadas rebotan por permisos?
- [ ] ¿Se probó por **URL directa** con cada rol lo que no le toca?
