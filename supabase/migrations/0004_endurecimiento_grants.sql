-- ============================================================================
-- JM AUTO · TANDA 3 · Endurecimiento — cierre de dos hallazgos de la verificación
-- ----------------------------------------------------------------------------
-- NO es Tanda 4. Cierra dos cosas que la puerta de verificación destapó:
--
--  A) Lint del Advisor `extension_in_public`: btree_gist quedó en `public`.
--     Se mueve al schema `extensions` (higiene de namespace). El índice GiST
--     existente sigue funcionando: referencia las opclasses por OID, no por
--     nombre de schema.
--
--  B) HALLAZGO (el Advisor NO lo marca — lo encontró la auditoría manual de
--     privilegios): por el `GRANT ALL` por defecto de Supabase, `anon` tiene
--     SELECT/INSERT/UPDATE/DELETE/TRUNCATE sobre casi todas las tablas de
--     negocio, y `authenticated` tiene además TRUNCATE/TRIGGER/REFERENCES.
--     No es explotable hoy (RLS+FORCE bloquea todo camino por PostgREST, que no
--     expone TRUNCATE, y no hay login directo del rol), PERO viola el mínimo
--     privilegio y es inconsistente (audit_log y sucursal ya estaban limpias).
--     Se retira `anon` por completo de las tablas de negocio y se le quita a
--     `authenticated` lo que NO pasa por RLS (TRUNCATE/TRIGGER/REFERENCES),
--     dejándole solo el CRUD que el RLS sí filtra por fila.
-- ============================================================================

-- A) extensión fuera de public
alter extension btree_gist set schema extensions;

-- B) mínimo privilegio, TABLA POR TABLA y ROL POR ROL (nada en bloque).
--    El `foreach` recorre una LISTA EXPLÍCITA y ENUMERADA — no es `ON ALL TABLES`
--    ni `ALTER DEFAULT PRIVILEGES`. Cada revoke nombra su tabla. Es una migración
--    APARTE, declarada y justificada, cuyo único fin es endurecer estos permisos
--    (por eso sí puede tocar tablas de tandas previas; ver la regla en
--    docs/PATRON-DE-ACCESO.md). audit_log y sucursal ya estaban limpias.
--    NOTA: la recurrencia (Supabase hace GRANT ALL por defecto al crear tablas)
--    NO se ataca con un ALTER DEFAULT PRIVILEGES sin acotar (prohibido) — se ataca
--    con el checklist: cada tabla nueva revoca `anon` explícitamente en SU migración.
do $$
declare t text;
begin
  foreach t in array array[
    'perfil','dispositivo','cuenta_demo',
    'marca','motor','modelo','catalogo_vehiculo','producto','compatibilidad','vehiculo'
  ]
  loop
    execute format('revoke all on public.%I from anon;', t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated;', t);
  end loop;
end $$;

-- registro
insert into supabase_migrations.schema_migrations (version, name) values
  ('0004', 'endurecimiento_grants')
on conflict (version) do nothing;
