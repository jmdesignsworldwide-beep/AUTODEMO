-- ============================================================================
-- JM AUTO · Corrección de alcance — `producto` es GLOBAL, no por sucursal
-- ----------------------------------------------------------------------------
-- Error de especificación: `producto` nació con `sucursal_id`. Está mal. Si el
-- producto pertenece a una sucursal, la misma pastilla de freno existe N veces
-- (una por sucursal) con N ids distintos — y como `compatibilidad` apunta a
-- `producto_id`, cada fila de compatibilidad se duplica también. Con 5
-- sucursales, 5 catálogos paralelos que no comparten nada.
--
-- El catálogo (producto) es UNO. La EXISTENCIA es por sucursal, y eso vive en
-- una tabla aparte en la Tanda 5 (inventario: producto × sucursal × cantidad).
--
-- La RLS de `producto` YA es global (producto_select no filtra por sucursal),
-- así que no hay que ajustar políticas: solo se elimina la columna.
-- ============================================================================

alter table public.producto drop column if exists sucursal_id;

-- registro
insert into supabase_migrations.schema_migrations (version, name) values
  ('0005', 'producto_global')
on conflict (version) do nothing;
