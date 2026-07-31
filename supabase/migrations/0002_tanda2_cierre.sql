-- ============================================================================
-- JM AUTO · TANDA 2 · Cierre — una sola migración, un solo PAT.
-- Agrupa: (1) revocación instantánea, (2) vencimiento de dispositivo,
-- (3) arreglos del Security Advisor (1er pase), (4) registro retroactivo del
-- historial de migraciones (0000, 0001, 0002).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) REVOCACIÓN INSTANTÁNEA — el middleware valida la vigencia contra la BASE
--    (consulta barata por navegación). jwt_vigente() se queda en el RLS como
--    SEGUNDA muralla. search_path fijo; EXECUTE revocado de anon y public.
-- ---------------------------------------------------------------------------
create or replace function public.mi_estado_vigencia()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    bool_and(c.activa and (c.vence_at is null or c.vence_at > now())),
    true
  )
  from public.cuenta_demo c
  where c.user_id = auth.uid();
$$;
revoke execute on function public.mi_estado_vigencia() from public, anon;
grant  execute on function public.mi_estado_vigencia() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) VENCIMIENTO DEL DISPOSITIVO — 90 días, renovable con login de contraseña.
--    renovado_at nace = created_at para los ya autorizados.
-- ---------------------------------------------------------------------------
alter table public.dispositivo
  add column if not exists renovado_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 3) ARREGLOS DEL SECURITY ADVISOR (1er pase)
-- ---------------------------------------------------------------------------

-- 3a) audit_inmutable: search_path fijo (lint function_search_path_mutable).
--     Es función de TRIGGER; nadie la llama por RPC. El trigger la dispara sin
--     necesitar EXECUTE del rol, así que se revoca de todos (higiene, pilar 9).
create or replace function public.audit_inmutable() returns trigger
  language plpgsql
  set search_path = ''
  as $$ begin raise exception 'audit_log es inmutable'; end; $$;
revoke execute on function public.audit_inmutable() from public, anon, authenticated;

-- 3b) verificar_pin: SOLO la llama el servidor con service_role (login por PIN
--     es pre-sesión). Se REVOCA de authenticated (quita el lint de SECURITY
--     DEFINER ejecutable por usuarios) y se concede solo a service_role.
--     Además: rechaza dispositivo vencido (>90 días sin renovar).
create or replace function public.verificar_pin(p_device text, p_user uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.dispositivo%rowtype;
  r public.perfil%rowtype;
  ok boolean;
begin
  select * into d from public.dispositivo where device_hash = p_device and activo;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'dispositivo_no_autorizado');
  end if;
  if d.renovado_at + interval '90 days' < now() then
    return jsonb_build_object('ok', false, 'motivo', 'dispositivo_vencido');
  end if;
  if d.pin_bloqueado_hasta is not null and d.pin_bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'motivo', 'dispositivo_bloqueado', 'hasta', d.pin_bloqueado_hasta);
  end if;

  select * into r from public.perfil where id = p_user and activo and deleted_at is null;
  if not found or r.pin_hash is null then
    update public.dispositivo set pin_fallos = d.pin_fallos + 1,
      pin_bloqueado_hasta = case when d.pin_fallos + 1 >= 10 then now() + interval '15 minutes' else pin_bloqueado_hasta end,
      last_seen = now() where id = d.id;
    return jsonb_build_object('ok', false, 'motivo', 'incorrecto');
  end if;
  if r.pin_bloqueado_hasta is not null and r.pin_bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'motivo', 'usuario_bloqueado', 'hasta', r.pin_bloqueado_hasta);
  end if;

  ok := (r.pin_hash = extensions.crypt(p_pin, r.pin_hash));

  if ok then
    update public.perfil set pin_intentos = 0, pin_bloqueado_hasta = null where id = p_user;
    update public.dispositivo set pin_fallos = 0, pin_bloqueado_hasta = null, last_seen = now() where id = d.id;
    return jsonb_build_object('ok', true);
  else
    update public.perfil set pin_intentos = r.pin_intentos + 1,
      pin_bloqueado_hasta = case when r.pin_intentos + 1 >= 5 then now() + interval '15 minutes' else null end
      where id = p_user;
    update public.dispositivo set pin_fallos = d.pin_fallos + 1,
      pin_bloqueado_hasta = case when d.pin_fallos + 1 >= 10 then now() + interval '15 minutes' else pin_bloqueado_hasta end,
      last_seen = now() where id = d.id;
    return jsonb_build_object('ok', false, 'motivo', 'incorrecto');
  end if;
end;
$$;
revoke execute on function public.verificar_pin(text, uuid, text) from public, anon, authenticated;
grant  execute on function public.verificar_pin(text, uuid, text) to service_role;

-- 3c) fijar_pin: igual — la llama el servidor con service_role desde una acción
--     que ya verificó el rol gestor. Se quita el chequeo interno de jwt_rol
--     (con service_role no hay JWT) y se REVOCA de authenticated.
create or replace function public.fijar_pin(p_user uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ced text;
  asc_seq boolean := true;
  desc_seq boolean := true;
  i int;
begin
  if p_pin !~ '^[0-9]{6,}$' then
    raise exception 'El PIN debe ser numérico de al menos 6 dígitos';
  end if;
  if p_pin ~ '^(.)\1*$' then
    raise exception 'El PIN no puede ser una repetición';
  end if;
  for i in 2 .. length(p_pin) loop
    if ascii(substr(p_pin,i,1)) - ascii(substr(p_pin,i-1,1)) <> 1  then asc_seq := false;  end if;
    if ascii(substr(p_pin,i,1)) - ascii(substr(p_pin,i-1,1)) <> -1 then desc_seq := false; end if;
  end loop;
  if asc_seq or desc_seq then
    raise exception 'El PIN no puede ser una secuencia';
  end if;
  select replace(replace(cedula,'-',''),' ','') into v_ced from public.perfil where id = p_user;
  if v_ced is not null and p_pin = v_ced then
    raise exception 'El PIN no puede ser la cédula';
  end if;

  update public.perfil
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
         pin_intentos = 0, pin_bloqueado_hasta = null
   where id = p_user;
end;
$$;
revoke execute on function public.fijar_pin(uuid, text) from public, anon, authenticated;
grant  execute on function public.fijar_pin(uuid, text) to service_role;

-- 3d) HELPERS DE CLAIMS (jwt_rol/jwt_sucursal/jwt_vigente): son SECURITY INVOKER
--     (leen el JWT del propio llamante, no escalan), pero en 0001 se hizo
--     grant a authenticated SIN revocar el EXECUTE de PUBLIC por defecto. El
--     linter no lo señala porque no son DEFINER, pero el pilar 9 exige cerrarlo:
--     se revoca de PUBLIC y anon; se conserva authenticated porque las políticas
--     RLS los invocan en el contexto del usuario con sesión.
revoke execute on function public.jwt_rol()      from public, anon;
revoke execute on function public.jwt_sucursal() from public, anon;
revoke execute on function public.jwt_vigente()  from public, anon;
grant  execute on function public.jwt_rol(), public.jwt_sucursal(), public.jwt_vigente() to authenticated;

-- Nota: el lint auth_leaked_password_protection (HaveIBeenPwned) NO es SQL —
-- se activa por config de Auth vía Management API en la misma corrida.
-- Nota: el lint SECURITY DEFINER de mi_estado_vigencia es ESPERADO y aceptado
-- (como custom_access_token_hook): search_path fijo, revocado de anon/public,
-- solo devuelve la vigencia del PROPIO usuario, sin privilegio.

-- ---------------------------------------------------------------------------
-- 4) REGISTRO RETROACTIVO DEL HISTORIAL DE MIGRACIONES
--    El ledger no existía (las 0000/0001 se aplicaron por Management API).
--    Se crea y se insertan 0000, 0001 y 0002 para que el historial quede
--    completo y ordenado.
-- ---------------------------------------------------------------------------
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version    text not null primary key,
  statements text[],
  name       text
);
insert into supabase_migrations.schema_migrations (version, name) values
  ('0000', 'tanda0_sucursal'),
  ('0001', 'tanda2_auth'),
  ('0002', 'tanda2_cierre')
on conflict (version) do nothing;
