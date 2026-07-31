-- ============================================================================
-- JM AUTO · TANDA 0 · Migración inicial: tabla `sucursal` (mínima)
-- Fort Knox desde la línea uno — idéntico a producción.
-- ============================================================================

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabla sucursal (mínima, según acordado en la Tanda 0).
-- NADA de giros todavía — eso es Tanda 6.
-- ---------------------------------------------------------------------------
create table if not exists public.sucursal (
  id          uuid        primary key default gen_random_uuid(),
  nombre      text        not null check (char_length(trim(nombre)) >= 2),
  direccion   text,
  telefono    text,
  activa      boolean     not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid,        -- heredará el usuario autenticado en la Tanda 2
  deleted_at  timestamptz  -- soft-delete: nunca se borra físicamente
);

comment on table public.sucursal is
  'Sucursales del negocio. Tanda 0 (mínima). Giros se agregan en la Tanda 6.';

-- ---------------------------------------------------------------------------
-- Fort Knox — Pilar 2: RLS + FORCE con deny-all por defecto.
-- ---------------------------------------------------------------------------
alter table public.sucursal enable  row level security;
alter table public.sucursal force   row level security;

-- Doble candado: se revocan los grants de PostgREST a los roles públicos.
-- El único acceso al demo es vía service_role (Server Actions del servidor),
-- que tiene BYPASSRLS por diseño en Supabase.
revoke all on public.sucursal from anon;
revoke all on public.sucursal from authenticated;

-- SIN POLÍTICAS = deny-all. Ni anon ni authenticated pueden leer/escribir.
-- Se pueden verificar por URL directa contra PostgREST: deben recibir vacío/negado.

-- ---------------------------------------------------------------------------
-- Índice para listar sucursales vivas de forma instantánea.
-- ---------------------------------------------------------------------------
create index if not exists sucursal_vivas_idx
  on public.sucursal (created_at desc)
  where deleted_at is null;
