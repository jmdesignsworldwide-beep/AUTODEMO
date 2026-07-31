# JM AUTO — Guía de trabajo con Marien

## Cómo cerrar cada trabajo (regla permanente)

Al **concluir** cualquier tarea (una tanda, un arreglo, una verificación, un
paso de cierre), terminar SIEMPRE con un **resumen breve y reenviable** —
listo para que Marien lo copie al chat de Claude. Corto, claro, en español
dominicano: qué se hizo, qué se probó de verdad, y qué queda pendiente de su
mano. Nada de relleno.

## Principios del proyecto (no negociables)

- **Fort Knox**: seguridad de producción aunque sea un demo. "Demo" describe
  la PROFUNDIDAD, no el RIGOR.
- **Verificar de verdad, nunca asumir**: probar manejando la app / la base real
  (Playwright, RPC directo, Advisor crudo). Reportar crudo y completo, incluidos
  los falsos positivos. El auditor no puede ser el auditado.
- **Migraciones**: pegar el SQL completo a Marien para que lo LEA antes de correr.
- **Español dominicano**: RD$, ITBIS 18%, DD/MM/AAAA, cédula/RNC. Sin módulo
  fiscal (comprobante interno). Medios solo en repo o Supabase Storage (privado,
  URLs firmadas).
- **service_role**: solo Capa B y procesos de sistema. Nunca en el CRUD de módulo.

## Documentos que gobiernan el código

- `docs/PATRON-DE-ACCESO.md` — patrón de acceso a datos, las dos murallas
  (RLS principal, código refuerzo) y el **pilar 9** (toda función
  `SECURITY DEFINER` se revoca de `PUBLIC`/`anon`/`authenticated`).
