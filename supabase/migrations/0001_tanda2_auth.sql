-- ============================================================================
-- JM AUTO · TANDA 2 · Autenticación, seis roles, Capa B, PIN, audit_log
-- Fort Knox: el ROL vive en `perfil` (fuente de verdad) y se inyecta al JWT
-- por un auth hook. Las políticas RLS lo leen del JWT (sin subconsulta).
-- `user_metadata` NUNCA decide el rol.
-- ============================================================================

create extension if not exists pgcrypto;      -- crypt() / gen_salt() para el PIN

-- ---------------------------------------------------------------------------
-- 1) Rol como enum. superadmin = Capa B (JM Nexus, invisible al cliente).
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.rol_usuario as enum
    ('superadmin','dueno','gerente','asesor','cajero','tecnico','almacenista');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2) perfil — FUENTE DE VERDAD del rol y la sucursal del usuario.
-- ---------------------------------------------------------------------------
create table if not exists public.perfil (
  id                   uuid primary key references auth.users(id) on delete cascade,
  nombre               text not null,
  rol                  public.rol_usuario not null default 'cajero',
  sucursal_id          uuid references public.sucursal(id),
  activo               boolean not null default true,
  pin_hash             text,              -- PIN hasheado (bcrypt). NUNCA en claro.
  pin_intentos         smallint not null default 0,
  pin_bloqueado_hasta  timestamptz,
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id),
  deleted_at           timestamptz
);
alter table public.perfil enable  row level security;
alter table public.perfil force   row level security;

-- ---------------------------------------------------------------------------
-- 3) Helpers que leen el claim del JWT (rápidos, sin subconsulta en cada RLS).
-- ---------------------------------------------------------------------------
create or replace function public.jwt_rol() returns text
  language sql stable as $$ select nullif(auth.jwt() ->> 'rol', '') $$;

create or replace function public.jwt_sucursal() returns uuid
  language sql stable as $$ select nullif(auth.jwt() ->> 'sucursal_id', '')::uuid $$;

grant execute on function public.jwt_rol()      to authenticated;
grant execute on function public.jwt_sucursal() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) AUTH HOOK — inyecta rol y sucursal (desde `perfil`) como claims del JWT.
--    Se ejecuta como supabase_auth_admin en cada emisión de token.
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims   jsonb := event -> 'claims';
  v_rol    public.rol_usuario;
  v_suc    uuid;
begin
  select rol, sucursal_id into v_rol, v_suc
  from public.perfil
  where id = (event ->> 'user_id')::uuid and deleted_at is null and activo;

  if v_rol is not null then
    claims := jsonb_set(claims, '{rol}', to_jsonb(v_rol::text));
    claims := jsonb_set(claims, '{sucursal_id}', coalesce(to_jsonb(v_suc::text), 'null'::jsonb));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- El hook solo lo invoca el servidor de auth. Nadie más.
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant  execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
-- El hook necesita leer perfil como supabase_auth_admin:
grant usage on schema public to supabase_auth_admin;
grant select on public.perfil to supabase_auth_admin;
create policy perfil_hook_lee on public.perfil
  for select to supabase_auth_admin using (true);

-- ---------------------------------------------------------------------------
-- 5) Políticas RLS de perfil (para la app, rol authenticated).
--    El técnico NO puede editar perfil (ni el suyo): falla el USING → 0 filas.
-- ---------------------------------------------------------------------------
create policy perfil_select on public.perfil for select to authenticated using (
  id = auth.uid()
  or public.jwt_rol() in ('superadmin','dueno')
  or (public.jwt_rol() = 'gerente' and sucursal_id = public.jwt_sucursal())
);
create policy perfil_insert on public.perfil for insert to authenticated with check (
  public.jwt_rol() in ('superadmin','dueno','gerente')
);
create policy perfil_update on public.perfil for update to authenticated
  using (
    public.jwt_rol() in ('superadmin','dueno')
    or (public.jwt_rol() = 'gerente' and sucursal_id = public.jwt_sucursal())
  )
  with check (
    public.jwt_rol() in ('superadmin','dueno')
    or (public.jwt_rol() = 'gerente' and sucursal_id = public.jwt_sucursal())
  );

-- ---------------------------------------------------------------------------
-- 6) PIN — verificación con hash + rate limiting POR USUARIO en el servidor.
--    Bloqueo temporal tras 5 intentos. Nunca compara en el cliente.
-- ---------------------------------------------------------------------------
create or replace function public.verificar_pin(p_user uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r        public.perfil%rowtype;
  ok       boolean;
begin
  select * into r from public.perfil where id = p_user and activo and deleted_at is null;
  if not found or r.pin_hash is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_pin');
  end if;

  if r.pin_bloqueado_hasta is not null and r.pin_bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'hasta', r.pin_bloqueado_hasta);
  end if;

  ok := (r.pin_hash = crypt(p_pin, r.pin_hash));

  if ok then
    update public.perfil set pin_intentos = 0, pin_bloqueado_hasta = null where id = p_user;
    return jsonb_build_object('ok', true);
  else
    update public.perfil
       set pin_intentos = r.pin_intentos + 1,
           pin_bloqueado_hasta = case when r.pin_intentos + 1 >= 5 then now() + interval '15 minutes' else null end
     where id = p_user;
    return jsonb_build_object('ok', false, 'motivo', 'incorrecto');
  end if;
end;
$$;
revoke execute on function public.verificar_pin(uuid, text) from public, anon;
grant  execute on function public.verificar_pin(uuid, text) to authenticated;

-- Fija (o cambia) el PIN de un usuario — solo gestores, hash bcrypt.
create or replace function public.fijar_pin(p_user uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if public.jwt_rol() not in ('superadmin','dueno','gerente') then
    raise exception 'no autorizado';
  end if;
  update public.perfil
     set pin_hash = crypt(p_pin, gen_salt('bf')), pin_intentos = 0, pin_bloqueado_hasta = null
   where id = p_user;
end;
$$;
revoke execute on function public.fijar_pin(uuid, text) from public, anon;
grant  execute on function public.fijar_pin(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Capa B — cuentas demo con vigencia (validada en el servidor).
-- ---------------------------------------------------------------------------
create table if not exists public.cuenta_demo (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  etiqueta    text,
  vence_at    timestamptz,               -- null = sin vencimiento
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);
alter table public.cuenta_demo enable row level security;
alter table public.cuenta_demo force  row level security;
revoke all on public.cuenta_demo from anon;
grant  select, insert, update on public.cuenta_demo to authenticated;
-- Solo el súper-admin ve y administra la Capa B.
create policy demo_solo_superadmin on public.cuenta_demo for all to authenticated
  using (public.jwt_rol() = 'superadmin')
  with check (public.jwt_rol() = 'superadmin');

-- ---------------------------------------------------------------------------
-- 8) audit_log INMUTABLE — INSERT y SELECT únicamente. UPDATE/DELETE bloqueados
--    a nivel de base de datos (revoke + trigger que revienta).
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor       uuid,
  accion      text not null,
  entidad     text,
  entidad_id  text,
  datos       jsonb,
  created_at  timestamptz not null default now()
);
alter table public.audit_log enable row level security;
alter table public.audit_log force  row level security;
revoke all on public.audit_log from anon, authenticated;
grant  select, insert on public.audit_log to authenticated;   -- jamás update/delete

create policy audit_insert on public.audit_log for insert to authenticated
  with check (actor = auth.uid());
create policy audit_select on public.audit_log for select to authenticated
  using (public.jwt_rol() in ('superadmin','dueno','gerente'));

create or replace function public.audit_inmutable() returns trigger
  language plpgsql as $$ begin raise exception 'audit_log es inmutable'; end; $$;
drop trigger if exists audit_no_mod on public.audit_log;
create trigger audit_no_mod before update or delete on public.audit_log
  for each row execute function public.audit_inmutable();

-- ---------------------------------------------------------------------------
-- 9) sucursal — se acaba el service_role para el CRUD: ahora manda el RLS.
--    created_by con FK a auth.users y sello automático con auth.uid().
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.sucursal
    add constraint sucursal_created_by_fkey foreign key (created_by) references auth.users(id);
exception when duplicate_object then null; end $$;
alter table public.sucursal alter column created_by set default auth.uid();

grant select, insert, update on public.sucursal to authenticated;

-- Ver: gestores ven todo; los demás solo su sucursal.
create policy sucursal_select on public.sucursal for select to authenticated using (
  public.jwt_rol() in ('superadmin','dueno','gerente')
  or id = public.jwt_sucursal()
);
-- Crear/editar/archivar: solo gestores.
create policy sucursal_insert on public.sucursal for insert to authenticated
  with check (public.jwt_rol() in ('superadmin','dueno','gerente'));
create policy sucursal_update on public.sucursal for update to authenticated
  using (public.jwt_rol() in ('superadmin','dueno','gerente'))
  with check (public.jwt_rol() in ('superadmin','dueno','gerente'));
