-- ============================================================================
-- JM AUTO · TANDA 2 · Autenticación, seis roles, Capa B, PIN, audit_log
-- ----------------------------------------------------------------------------
-- El ROL vive en `perfil` (fuente de verdad) y se inyecta al JWT por un auth
-- hook BLINDADO (jamás lanza excepción → nunca deja el sistema como ladrillo).
-- La VIGENCIA de la Capa B viaja como claim y se valida en el RLS (no solo en
-- el middleware). user_metadata NUNCA decide rol ni vigencia.
-- Orden de despliegue: correr esta migración → verificar login normal →
-- SOLO ENTONCES habilitar el hook. Reversa del hook: deshabilitar en
-- Dashboard ▸ Auth ▸ Hooks (o Management API), sin necesidad de login.
-- ============================================================================

create extension if not exists pgcrypto;      -- crypt()/gen_salt() (bcrypt) para el PIN

-- 1) Rol como enum. superadmin = Capa B (JM Nexus, invisible al cliente).
do $$ begin
  create type public.rol_usuario as enum
    ('superadmin','dueno','gerente','asesor','cajero','tecnico','almacenista');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2) perfil — FUENTE DE VERDAD del rol/sucursal. PIN hasheado + throttle x usuario.
-- ---------------------------------------------------------------------------
create table if not exists public.perfil (
  id                   uuid primary key references auth.users(id) on delete cascade,
  nombre               text not null,
  cedula               text,
  rol                  public.rol_usuario not null default 'cajero',
  sucursal_id          uuid references public.sucursal(id),
  activo               boolean not null default true,
  pin_hash             text,              -- bcrypt. NUNCA en claro, NUNCA en el JWT.
  pin_intentos         smallint not null default 0,
  pin_bloqueado_hasta  timestamptz,
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id),
  deleted_at           timestamptz
);
alter table public.perfil enable row level security;
alter table public.perfil force  row level security;

-- ---------------------------------------------------------------------------
-- 3) dispositivo — el PIN SOLO funciona en un terminal ya autorizado (que pasó
--    por login con contraseña). Guarda un HASH del token del dispositivo, más
--    un THROTTLE GLOBAL por dispositivo (mata el rociado entre usuarios).
-- ---------------------------------------------------------------------------
create table if not exists public.dispositivo (
  id                   uuid primary key default gen_random_uuid(),
  device_hash          text unique not null,   -- hash del token en cookie httpOnly
  etiqueta             text,
  sucursal_id          uuid references public.sucursal(id),
  autorizado_por       uuid references auth.users(id),
  activo               boolean not null default true,
  pin_fallos           smallint not null default 0,
  pin_bloqueado_hasta  timestamptz,
  created_at           timestamptz not null default now(),
  last_seen            timestamptz
);
alter table public.dispositivo enable row level security;
alter table public.dispositivo force  row level security;

-- ---------------------------------------------------------------------------
-- 4) Capa B — cuentas demo con vigencia (validada en RLS vía claim del JWT).
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

-- ---------------------------------------------------------------------------
-- 5) audit_log INMUTABLE — INSERT/SELECT; UPDATE/DELETE bloqueados en la base.
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
create or replace function public.audit_inmutable() returns trigger
  language plpgsql as $$ begin raise exception 'audit_log es inmutable'; end; $$;
drop trigger if exists audit_no_mod on public.audit_log;
create trigger audit_no_mod before update or delete on public.audit_log
  for each row execute function public.audit_inmutable();

-- ---------------------------------------------------------------------------
-- 6) Helpers de claims (leen del JWT; rápido, sin subconsulta en cada RLS).
-- ---------------------------------------------------------------------------
create or replace function public.jwt_rol() returns text
  language sql stable set search_path = '' as $$ select nullif(auth.jwt() ->> 'rol', '') $$;

create or replace function public.jwt_sucursal() returns uuid
  language sql stable set search_path = '' as $$
    select nullif(auth.jwt() ->> 'sucursal_id', '')::uuid $$;

-- Vigencia: true si no hay vence_at o si aún no ha vencido. Se evalúa por
-- petición contra now(): un token vivo de una cuenta ya vencida es DENEGADO.
create or replace function public.jwt_vigente() returns boolean
  language sql stable set search_path = '' as $$
    select coalesce(nullif(auth.jwt() ->> 'vence_at','')::timestamptz > now(), true) $$;

grant execute on function public.jwt_rol(), public.jwt_sucursal(), public.jwt_vigente() to authenticated;

-- ---------------------------------------------------------------------------
-- 7) AUTH HOOK — BLINDADO. Inyecta rol/sucursal/vence_at desde la base.
--    Punto 1 de Marien: si algo falla, NO lanza excepción; devuelve el evento
--    sin claims de privilegio y deja proceder el login. search_path fijo.
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims  jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  uid     uuid;
  v_rol   public.rol_usuario;
  v_suc   uuid;
  v_vence timestamptz;
begin
  uid := (event ->> 'user_id')::uuid;

  select rol, sucursal_id into v_rol, v_suc
  from public.perfil where id = uid and deleted_at is null and activo;

  if v_rol is not null then
    claims := jsonb_set(claims, '{rol}', to_jsonb(v_rol::text));
    if v_suc is not null then
      claims := jsonb_set(claims, '{sucursal_id}', to_jsonb(v_suc::text));
    end if;
  end if;

  select vence_at into v_vence
  from public.cuenta_demo where user_id = uid and activa
  order by created_at desc limit 1;

  if v_vence is not null then
    claims := jsonb_set(claims, '{vence_at}', to_jsonb(v_vence));
  end if;

  return jsonb_set(event, '{claims}', claims);
exception when others then
  -- Nunca bloquear la emisión de token: un usuario sin rol es un problema
  -- menor; un sistema donde nadie entra es un ladrillo.
  return event;
end;
$$;

-- Solo el servidor de auth ejecuta el hook. Nadie más.
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant  execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- El hook (como supabase_auth_admin) DEBE poder leer perfil y cuenta_demo,
-- que son deny-all para todos los demás. Grant + política dedicadas.
grant usage on schema public to supabase_auth_admin;
grant select on public.perfil, public.cuenta_demo to supabase_auth_admin;
create policy perfil_hook_lee on public.perfil
  for select to supabase_auth_admin using (true);
create policy demo_hook_lee on public.cuenta_demo
  for select to supabase_auth_admin using (true);

-- ---------------------------------------------------------------------------
-- 8) Políticas RLS de la app (rol authenticated). TODAS exigen jwt_vigente():
--    un usuario vencido no lee ni escribe nada, aunque su sesión siga viva.
-- ---------------------------------------------------------------------------
-- perfil: el técnico NO puede editar perfil (ni el suyo) → falla el USING.
create policy perfil_select on public.perfil for select to authenticated using (
  public.jwt_vigente() and (
    id = auth.uid()
    or public.jwt_rol() in ('superadmin','dueno')
    or (public.jwt_rol() = 'gerente' and sucursal_id = public.jwt_sucursal())
  )
);
create policy perfil_insert on public.perfil for insert to authenticated with check (
  public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente')
);
create policy perfil_update on public.perfil for update to authenticated
  using (
    public.jwt_vigente() and (
      public.jwt_rol() in ('superadmin','dueno')
      or (public.jwt_rol() = 'gerente' and sucursal_id = public.jwt_sucursal())
    )
  )
  with check (
    public.jwt_vigente() and (
      public.jwt_rol() in ('superadmin','dueno')
      or (public.jwt_rol() = 'gerente' and sucursal_id = public.jwt_sucursal())
    )
  );

-- dispositivo: gestores administran; los demás solo lo consultan de su sucursal.
grant select, insert, update on public.dispositivo to authenticated;
create policy disp_select on public.dispositivo for select to authenticated using (
  public.jwt_vigente() and (
    public.jwt_rol() in ('superadmin','dueno','gerente')
    or sucursal_id = public.jwt_sucursal()
  )
);
create policy disp_write on public.dispositivo for all to authenticated
  using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'))
  with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));

-- cuenta_demo: solo el súper-admin (y vigente).
grant select, insert, update on public.cuenta_demo to authenticated;
create policy demo_superadmin on public.cuenta_demo for all to authenticated
  using (public.jwt_vigente() and public.jwt_rol() = 'superadmin')
  with check (public.jwt_vigente() and public.jwt_rol() = 'superadmin');

-- audit_log: INSERT propio; SELECT solo gestores. Nunca update/delete.
revoke all on public.audit_log from anon, authenticated;
grant  select, insert on public.audit_log to authenticated;
create policy audit_insert on public.audit_log for insert to authenticated
  with check (actor = auth.uid());
create policy audit_select on public.audit_log for select to authenticated
  using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));

-- ---------------------------------------------------------------------------
-- 9) PIN — verificación con hash + DOBLE throttle: por usuario y GLOBAL por
--    dispositivo (punto 2). Requiere un dispositivo autorizado. Nunca en cliente.
-- ---------------------------------------------------------------------------
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
  if d.pin_bloqueado_hasta is not null and d.pin_bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'motivo', 'dispositivo_bloqueado', 'hasta', d.pin_bloqueado_hasta);
  end if;

  select * into r from public.perfil where id = p_user and activo and deleted_at is null;
  if not found or r.pin_hash is null then
    -- Cuenta el fallo a nivel de dispositivo igual (evita enumeración).
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
revoke execute on function public.verificar_pin(text, uuid, text) from public, anon;
grant  execute on function public.verificar_pin(text, uuid, text) to authenticated;

-- Fija/cambia el PIN — solo gestores. Valida formato (>=6, no secuencia, no
-- repetición, no cédula). bcrypt.
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
  if public.jwt_rol() not in ('superadmin','dueno','gerente') then
    raise exception 'no autorizado';
  end if;
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
revoke execute on function public.fijar_pin(uuid, text) from public, anon;
grant  execute on function public.fijar_pin(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) sucursal — se acaba el service_role para el CRUD: manda el RLS.
--     FK created_by → auth.users, sello auth.uid(), políticas por rol/sucursal.
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.sucursal
    add constraint sucursal_created_by_fkey foreign key (created_by) references auth.users(id);
exception when duplicate_object then null; end $$;
alter table public.sucursal alter column created_by set default auth.uid();
grant select, insert, update on public.sucursal to authenticated;

create policy sucursal_select on public.sucursal for select to authenticated using (
  public.jwt_vigente() and (
    public.jwt_rol() in ('superadmin','dueno','gerente') or id = public.jwt_sucursal()
  )
);
create policy sucursal_insert on public.sucursal for insert to authenticated
  with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));
create policy sucursal_update on public.sucursal for update to authenticated
  using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'))
  with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));
