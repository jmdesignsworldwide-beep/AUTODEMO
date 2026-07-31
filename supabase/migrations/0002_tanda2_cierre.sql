-- ============================================================================
-- JM AUTO · TANDA 2 · Cierre — arreglo de revocación instantánea + vencimiento
-- de dispositivo. (Los hallazgos del Security Advisor se AGREGAN a este archivo
-- antes de correrlo, para que sea UNA sola migración con un solo PAT.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) REVOCACIÓN INSTANTÁNEA — el middleware valida la vigencia contra la BASE,
--    no contra el claim del JWT (que vive hasta 1 hora). jwt_vigente() se queda
--    en el RLS como SEGUNDA muralla. Esta función es la consulta barata por
--    navegación que hace el corte instantáneo.
-- ---------------------------------------------------------------------------
create or replace function public.mi_estado_vigencia()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- true si el usuario no es cuenta demo, o si su cuenta demo sigue activa y no
  -- ha vencido. Se evalúa contra now() en cada llamada.
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
-- 2) VENCIMIENTO DEL DISPOSITIVO — 90 días, renovable con un login de contraseña.
--    Se agrega renovado_at; el vencimiento es renovado_at + 90 días. verificar_pin
--    rechaza un dispositivo vencido. (last_seen ya refleja el último uso.)
-- ---------------------------------------------------------------------------
alter table public.dispositivo
  add column if not exists renovado_at timestamptz not null default now();

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
  -- NUEVO: dispositivo vencido (>90 días sin renovar con contraseña).
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
revoke execute on function public.verificar_pin(text, uuid, text) from public, anon;
grant  execute on function public.verificar_pin(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) (SE AGREGA AQUÍ lo que salga del Security Advisor antes de correr.)
-- ---------------------------------------------------------------------------
