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
motor           nombre, descripcion         — 1.6L, 2.4L... / 100cc, 150cc...
                                              (designación global; se acota por modelo)
modelo          marca_id, nombre, tipo      — Corolla→automovil · CG 150→motocicleta
catalogo_vehiculo modelo_id, anio, motor_id(NOT NULL)
                                              — el (modelo,año,motor) que EXISTE
compatibilidad  producto_id, modelo_id, anios(int4range), motor_id(NULLABLE)
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

2. **El rango de años se guarda COMO RANGO** — `int4range` + índice **GiST**
   (`btree_gist` para combinar `uuid` + rango). No filas expandidas: preserva que
   la aplicación es indiferente al año y evita recargar a mano al agregar
   variantes. Es el estándar de industria (ACES trabaja con aplicaciones).

3. **Las piezas universales NO dependen de la compatibilidad.** Aceite, líquido de
   frenos, limpiador de inyectores, herramientas: se resuelven con `es_universal`
   a nivel de **`producto`** (Tanda 5). Universal = aparece siempre, para cualquier
   vehículo, sin una sola fila de compatibilidad. **El buscador debe respetar esto:**
   resultado por placa = (compatibilidad que matchea) **∪** (productos `es_universal`).

## La consulta central (el corazón del sistema)

```sql
-- desde una placa: vehiculo -> catalogo_vehiculo -> compatibilidad
select comp.producto_id
from public.vehiculo v
join public.catalogo_vehiculo cv on cv.id = v.catalogo_vehiculo_id
join public.compatibilidad comp
  on comp.modelo_id = cv.modelo_id
  and comp.anios @> cv.anio                       -- contención por rango (GiST)
  and (comp.motor_id is null or comp.motor_id = cv.motor_id)
where v.placa = :placa;
-- En Tanda 5 se le une:  UNION  productos con es_universal = true.
```

Tiene que ser **instantánea**. Con 5,000 productos la diferencia entre el índice
GiST y un recorrido secuencial es el sistema entero.

## Placa dominicana — prefijos por tipo (verificado, no inventado)

Las letras iniciales las asigna la DGII. Confirmado por el desglose de placas
exoneradas estatales (EA=Automóvil, EG=Jeep, EL=Carga, EI=Autobús), que revela la
letra base de cada tipo:

| Tipo | Prefijo | Confianza |
|---|---|---|
| Automóvil | **A** | Alta |
| Jeepeta / Jeep | **G** | Alta (EG = Estatal Jeep) |
| Autobús | **I** | Media-alta (EI = Estatal Autobús) |
| Motocicleta | **K** | Alta (programa de placas de motor DGII; reemplazó la "N" temporal) |
| Camión / carga | **L** | Alta (EL = Estatal Carga) |

Formato: letra(s) + dígitos. El `CHECK` de `vehiculo` exige forma `^[A-Z]{1,2}[0-9]{5,7}$`;
el prefijo correcto lo pone quien registra el vehículo. **Sin texto libre por
ninguna puerta:** si un vehículo no está en el catálogo, un gestor crea la entrada
de catálogo desde un formulario; el asesor nunca escribe marca/modelo a mano.

Fuentes: DGII (dgii.gov.do), Diario Libre, EHPLUS, Hoy — mapeo de iniciales de
placas RD y programa de placas de motocicletas.

## Deudas conscientes de esta tanda (ver docs/RIESGOS-ACEPTADOS.md si se aceptan)

- `compatibilidad.producto_id` va **sin FK** — `producto` se crea en la Tanda 5,
  donde se agrega `alter table ... add foreign key`. Marcado en comentario de columna.
- `vehiculo` se crea **mínima** (placa + catálogo). Dueño, sucursal y demás campos
  llegan en la Tanda 4.
- Datos sintéticos de `compatibilidad` con `producto_id` uuid fijos y documentados,
  para probar la puerta; se reemplazan por productos reales en la Tanda 5.

## Puerta de verificación (se corre contra la base con PAT)

1. Búsqueda por placa de un automóvil → solo lo compatible con ese carro.
2. Pieza con `motor_id` NULL → aparece para todos los motores del modelo/rango.
3. Pieza con motor específico → NO aparece con otro motor (probado explícito).
4. Año fuera de rango → no aparece. Borde exacto: rango `[2014,2020)` → 2013 y 2020 fuera; 2014 y 2019 dentro.
5. Búsqueda por placa de una MOTOCICLETA → piezas de moto, jamás de carro.
6. `EXPLAIN ANALYZE` de la consulta central → usa el índice GiST, no seq scan (a escala).
7. RLS + FORCE en todas las tablas nuevas, políticas por rol desde su creación.
8. `npm run smoke:mw` sigue pasando.
9. Security Advisor crudo, contra `docs/RIESGOS-ACEPTADOS.md`.
