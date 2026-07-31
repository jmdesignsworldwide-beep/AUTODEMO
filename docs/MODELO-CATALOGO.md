# 🚗 JM AUTO — Modelo de catálogo y compatibilidad (Tanda 3)

> **La tanda irreversible.** De este modelo dependen la búsqueda por placa, el
> cerebro de compras por parque vehicular, y el mercado de las motocicletas.
> Si nace mal, corregirlo significa recargar a mano miles de productos.

## El modelo

```
tipo_vehiculo   automovil · jeepeta · motocicleta · camion · autobus · maquinaria
                (enum; el tipo vive en el MODELO, no en la marca)

marca           nombre                      — Toyota, Bajaj, Honda... sin tipo
                                              (una marca hace carros Y motos)
motor           nombre, descripcion, tipo   — 1.6L, 2.4L (tipo NULL) / 150cc (tipo motocicleta)
modelo          marca_id, nombre, tipo      — Corolla→automovil · CG 150→motocicleta
catalogo_vehiculo modelo_id, anio, motor_id(NOT NULL)
                                              — el (modelo,año,motor) que EXISTE
producto        nombre, es_universal, deleted_at   (MÍNIMO en T3 · GLOBAL, sin sucursal_id)
compatibilidad  producto_id(FK), modelo_id, anios(int4range), motor_id(NULLABLE)
                                              — LA TABLA QUE DECIDE TODO
vehiculo        placa, catalogo_vehiculo_id — el carro del cliente; FK al catálogo,
                                              NUNCA texto libre
```

## Las tres decisiones (grabadas en el esquema, no solo aquí)

1. **`compatibilidad.motor_id` es NULLABLE.** `NULL` = "aplica a TODOS los motores
   de ese modelo en ese rango de años" (p.ej. una pastilla de freno). No-NULL =
   solo ese motor (filtro de aceite, bomba de agua). El comentario vive en la
   **columna** de la base (`comment on column`). Si el motor fuera obligatorio, se
   cargarían filas falsas y **moriría la búsqueda por placa en silencio**.

2. **El rango de años se guarda COMO RANGO** — `int4range` + índice **GiST sobre
   `(modelo_id, anios)`** (`btree_gist` da la clase GiST para `uuid`). Estrecha por
   modelo Y por rango de años en una sola pasada; `motor_id` **no** va en el índice
   — el `(motor_id IS NULL OR motor_id = :motor)` queda como filtro sobre el puñado
   de filas que sobreviven, que es donde debe quedar. No filas expandidas (ACES).

3. **Las piezas universales NO dependen de la compatibilidad.** `es_universal` vive
   en **`producto`** (creado mínimo en esta tanda; la decisión está en la TABLA, no
   en un documento). Universal = aparece siempre, para cualquier vehículo, sin una
   sola fila de compatibilidad. El buscador hace:
   **(compatibilidad que matchea) ∪ (productos `es_universal`)**.

## 📍 Alcance de `sucursal_id` — NO es universal

`sucursal_id` **no** lo lleva toda tabla. Solo lo llevan las **tablas de
operación** — lo que ocurre en una sucursal: ventas, caja, órdenes, existencias,
movimientos, visitas.

Las tablas de **catálogo y referencia** (`marca`, `modelo`, `motor`,
`catalogo_vehiculo`, `compatibilidad`, `producto`, servicios) son **globales al
negocio**. Un Corolla 2016 no es distinto en Santiago que en La Vega.
Duplicarlas por sucursal **multiplica el catálogo, rompe la compatibilidad**
(cada `producto` duplicado duplica sus filas de `compatibilidad`) y lo hace
imposible de mantener.

> **Regla para decidir:** si dos sucursales pueden tener un valor **distinto**
> para lo mismo, lleva `sucursal_id`. Si el valor es el **mismo por definición**,
> no lo lleva.

Estado tras la revisión: de `marca · motor · modelo · catalogo_vehiculo ·
compatibilidad · producto`, solo `producto` traía `sucursal_id` (error de
especificación) — se elimina en `0005_producto_global.sql`. Las otras cinco
nacieron correctas (globales).

---

## La consulta central (el corazón del sistema)

```sql
-- desde una placa: vehiculo -> catalogo_vehiculo -> compatibilidad, ∪ universales
select comp.producto_id
from public.vehiculo v
join public.catalogo_vehiculo cv on cv.id = v.catalogo_vehiculo_id
join public.compatibilidad comp
  on comp.modelo_id = cv.modelo_id
  and comp.anios @> cv.anio                       -- contención por rango (GiST)
  and (comp.motor_id is null or comp.motor_id = cv.motor_id)
where v.placa = :placa
union
select p.id
from public.producto p
where p.es_universal and p.deleted_at is null;    -- universales: siempre
```

Tiene que ser **instantánea**. Con 5,000 productos la diferencia entre el índice
GiST y un recorrido secuencial es el sistema entero.

## `motor.tipo` — filtro de captura (no cosmético)

Evita que entre basura al catálogo: la UI nunca ofrece "150cc" al capturar un
Corolla ni "2.4L" al capturar una Bajaj.
- Motores de moto (`100cc`…`200cc`) → `tipo = 'motocicleta'`.
- Motores de carro (`1.6L`…`3.5L V6`, diésel) → `tipo = NULL` (familia carro,
  aplica a varios tipos no-moto: automóvil/jeepeta/camión/autobús).
- **UI:** al capturar una motocicleta se ofrecen solo motores `tipo='motocicleta'`;
  al capturar cualquier vehículo no-moto, solo motores `tipo IS NULL`.
- **Sin código de motor** (2ZR-FE, etc.) todavía: se agrega barato cuando se
  necesite — son ~decenas de filas en `motor`, no miles en `compatibilidad`.

## Placa dominicana — prefijos por tipo (verificado, no inventado)

Letras iniciales asignadas por la DGII. Confirmado por el desglose de placas
exoneradas estatales (EA=Automóvil, EG=Jeep, EL=Carga, EI=Autobús):

| Tipo | Prefijo | Confianza |
|---|---|---|
| Automóvil | **A** | Alta |
| Jeepeta / Jeep | **G** | Alta (EG = Estatal Jeep) |
| Autobús | **I** | Media-alta (EI = Estatal Autobús) |
| Motocicleta | **K** | Alta (programa de placas de motor DGII; reemplazó la "N" temporal) |
| Camión / carga | **L** | Alta (EL = Estatal Carga) |

Formato: letra(s) + dígitos. El `CHECK` de `vehiculo` exige forma
`^[A-Z]{1,2}[0-9]{5,7}$`; el prefijo correcto lo pone quien registra. **Sin texto
libre por ninguna puerta:** si un vehículo no está en el catálogo, un gestor crea
la entrada de catálogo desde un formulario; el asesor nunca escribe a mano.

Fuentes: DGII (dgii.gov.do), Diario Libre, EHPLUS, Hoy.

## `producto` — qué tiene HOY y qué debe AGREGAR la Tanda 5

**Hoy (mínimo):** `id, nombre, es_universal, created_at, created_by, deleted_at`
+ RLS/FORCE con políticas por rol. **GLOBAL — sin `sucursal_id`** (ver la regla de
alcance abajo; corregido en `0005_producto_global.sql`). La FK de
`compatibilidad.producto_id` ya nace correcta contra esta tabla (no pendiente).

**La Tanda 5 debe AGREGAR con `ALTER TABLE producto` (arranca sabiendo esto):**
- `costo` (numeric) — costo de compra.
- `precio` (numeric) — precio de venta; ITBIS 18% se calcula sobre este.
- `margen` — derivado o almacenado según se decida.
- **Existencias / inventario** — probablemente una tabla `inventario` (producto ×
  sucursal × cantidad), no una columna: el stock es por sucursal.
- `codigo` / SKU, `categoria`, `unidad` (unidad de venta), y lo que el módulo pida.

## Deudas conscientes de esta tanda

- `vehiculo` se crea **mínima** (placa + catálogo). Dueño, sucursal y demás campos
  llegan en la Tanda 4.
- `producto` es **mínimo** (arriba). No hay costo/precio/existencias — Tanda 5.
- ~~`producto_id` sin FK~~ → **cerrado**: la FK nace correcta en esta tanda.

## Puerta de verificación (se corre contra la base con PAT)

1. Búsqueda por placa de un automóvil → solo lo compatible con ese carro.
2. Pieza con `motor_id` NULL → aparece para todos los motores del modelo/rango.
3. Pieza con motor específico → NO aparece con otro motor (probado explícito).
4. Año fuera de rango → no aparece. Borde `[2014,2020)`: 2013 y 2020 fuera; 2014 y 2019 dentro.
5. Búsqueda por placa de una MOTOCICLETA → piezas de moto, jamás de carro.
6. `EXPLAIN ANALYZE` de la consulta central, DOS corridas crudas: catálogo real
   sembrado (chico → seq scan, correcto) y **50,000 filas sintéticas** (→ Index
   Scan GiST). Las sintéticas se botan al terminar.
7. RLS + FORCE en todas las tablas nuevas, políticas por rol desde su creación.
8. `npm run smoke:mw` sigue pasando.
9. Security Advisor crudo, contra `docs/RIESGOS-ACEPTADOS.md`.
