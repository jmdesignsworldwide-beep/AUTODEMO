# 📕 JM AUTO — Riesgos aceptados

> Registro de todo lo que **decidimos NO arreglar**, y por qué.
> De aquí en adelante, cualquier cosa que quede pendiente por **decisión
> consciente** se anota aquí. **Nada se queda pendiente en silencio.**
>
> El Security Advisor (u otra herramienta) puede seguir marcando algo listado
> aquí. Eso **no** se interpreta como "limpio ignorándolo" — se interpreta
> **contra este documento**.

---

## `auth_leaked_password_protection` — DESACTIVADO

**Motivo:** requiere plan **Pro**; el proyecto de demostración está en **Free**.

**Riesgo real en el demo:** bajo. Todas las cuentas son internas, mías, con
contraseñas generadas al azar. La protección contra contraseñas filtradas
(HaveIBeenPwned) no está cubriendo ningún riesgo real hoy.

**CONDICIÓN OBLIGATORIA:** se activa **antes de cualquier despliegue en
producción con usuarios reales**. Sin excepción. En producción entran
contraseñas escogidas por empleados de un taller —del tipo `Taller2026`— y ahí
la protección sí cubre un riesgo real.

**Consecuencia conocida:** el Security Advisor **seguirá marcando este lint**
mientras el proyecto esté en Free. No se interpreta como "limpio" ignorándolo —
se interpreta contra este documento.

**Cómo se activa (cuando toque):**
`PATCH /v1/projects/{ref}/config/auth` con `{"password_hibp_enabled": true}`
(o Dashboard ▸ Authentication ▸ Policies), ya en un proyecto Pro.

---

_Última revisión: 31/07/2026 · Tanda 2._
