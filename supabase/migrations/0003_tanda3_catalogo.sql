-- ============================================================================
-- JM AUTO · TANDA 3 · Catálogo de vehículos y COMPATIBILIDAD estructurada
-- ----------------------------------------------------------------------------
-- LA TANDA IRREVERSIBLE. De este modelo dependen: la búsqueda por placa, el
-- cerebro de compras por parque vehicular, y el mercado de las motocicletas.
--
-- Las TRES decisiones de diseño, grabadas en el esquema (no solo en docs):
--   1) compatibilidad.motor_id es NULLABLE. NULL = "aplica a TODOS los motores
--      de ese modelo en ese rango de años" (p.ej. pastilla de freno). El
--      comentario vive en la COLUMNA (abajo), no solo en documentación.
--   2) El rango de años se guarda COMO RANGO: int4range + índice GiST sobre
--      (modelo_id, anios) usando btree_gist. Estrecha por modelo Y por rango en
--      una sola pasada; el (motor_id IS NULL OR ...) queda como filtro sobre las
--      pocas filas que sobreviven.
--   3) Las piezas universales (aceite, líquido de frenos...) NO dependen de la
--      compatibilidad: `es_universal` vive en `producto` (creado mínimo aquí).
--      Universal = aparece siempre, sin una sola fila de compatibilidad.
--
-- El vehículo real SIEMPRE tiene motor: catalogo_vehiculo.motor_id es NOT NULL.
-- La nulabilidad vive en la COMPATIBILIDAD, no en el catálogo.
--
-- Dos murallas (docs/PATRON-DE-ACCESO.md): RLS+FORCE deny-all + políticas por
-- rol desde la creación. Pilar 9: no se crea ninguna función SECURITY DEFINER.
-- ============================================================================

create extension if not exists btree_gist;   -- GiST sobre (uuid, int4range)

-- ---------------------------------------------------------------------------
-- 0) Tipo de vehículo. El tipo vive en el MODELO, no en la marca:
--    una marca (Honda, Suzuki, Yamaha) fabrica carros Y motos.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.tipo_vehiculo as enum
    ('automovil','jeepeta','motocicleta','camion','autobus','maquinaria');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 1) marca — sin tipo. Toyota, Bajaj, TVS, Honda...
-- ---------------------------------------------------------------------------
create table if not exists public.marca (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid()
);
alter table public.marca enable row level security;
alter table public.marca force  row level security;

-- ---------------------------------------------------------------------------
-- 2) motor — designación de motor (GLOBAL). Carros: 1.6L... Motos: 150cc...
--    Se referencia SIEMPRE junto con modelo_id + rango de años, que lo
--    desambiguan (un Corolla 2008 1.8 y un 2016 1.8 son motores distintos con
--    la misma etiqueta; el rango de años los separa).
--    `tipo`: filtra la captura para que la UI nunca ofrezca "150cc" a un Corolla
--    ni "2.4L" a una Bajaj. NULL = motor de familia carro (aplica a varios tipos
--    no-moto); 'motocicleta' = motor de moto. Sin código de motor (2ZR-FE): se
--    agrega barato en la Tanda que lo necesite (son ~decenas de filas aquí).
-- ---------------------------------------------------------------------------
create table if not exists public.motor (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  descripcion text,
  tipo        public.tipo_vehiculo,          -- NULL = familia carro (varios tipos)
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid()
);
comment on column public.motor.tipo is
  'Filtra la captura en la UI: al capturar una motocicleta se ofrecen solo motores '
  'tipo=motocicleta; al capturar cualquier vehículo no-moto se ofrecen solo motores '
  'tipo IS NULL (familia carro, aplica a varios tipos). Evita que entre basura al '
  'catálogo (2.4L en una Bajaj, 150cc en un Corolla). Sin código de motor todavía.';
alter table public.motor enable row level security;
alter table public.motor force  row level security;

-- ---------------------------------------------------------------------------
-- 3) modelo — marca + nombre + tipo. Corolla→automovil · CG 150→motocicleta.
-- ---------------------------------------------------------------------------
create table if not exists public.modelo (
  id            uuid primary key default gen_random_uuid(),
  marca_id      uuid not null references public.marca(id),
  nombre        text not null,
  tipo          public.tipo_vehiculo not null,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) default auth.uid(),
  unique (marca_id, nombre)
);
alter table public.modelo enable row level security;
alter table public.modelo force  row level security;

-- ---------------------------------------------------------------------------
-- 4) catalogo_vehiculo — el (modelo, año, motor) que EXISTE de verdad.
--    motor_id NOT NULL: un vehículo real siempre tiene motor.
-- ---------------------------------------------------------------------------
create table if not exists public.catalogo_vehiculo (
  id          uuid primary key default gen_random_uuid(),
  modelo_id   uuid not null references public.modelo(id),
  anio        int  not null check (anio between 1950 and 2100),
  motor_id    uuid not null references public.motor(id),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid(),
  unique (modelo_id, anio, motor_id)
);
alter table public.catalogo_vehiculo enable row level security;
alter table public.catalogo_vehiculo force  row level security;

-- ---------------------------------------------------------------------------
-- 5) producto — MÍNIMO en esta tanda, para que la FK de compatibilidad nazca
--    correcta (no pendiente) y `es_universal` viva en el esquema, no en un doc.
--    Sin costo/precio/margen/existencias — eso es Tanda 5 y entra con un ALTER.
--    (Columnas que la Tanda 5 debe AGREGAR: ver docs/MODELO-CATALOGO.md.)
-- ---------------------------------------------------------------------------
create table if not exists public.producto (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  es_universal boolean not null default false,   -- true = aparece siempre, sin compatibilidad
  sucursal_id  uuid references public.sucursal(id),
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) default auth.uid(),
  deleted_at   timestamptz
);
comment on column public.producto.es_universal is
  'true = pieza/insumo universal (aceite, líquido de frenos, herramientas): '
  'aparece SIEMPRE en la búsqueda, para cualquier vehículo, sin necesitar una '
  'fila de compatibilidad. El buscador hace: (compatibilidad que matchea) UNION '
  '(productos es_universal).';
alter table public.producto enable row level security;
alter table public.producto force  row level security;

-- ---------------------------------------------------------------------------
-- 6) compatibilidad — LA TABLA QUE DECIDE TODO. FK a producto YA correcta.
-- ---------------------------------------------------------------------------
create table if not exists public.compatibilidad (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.producto(id) on delete cascade,
  modelo_id   uuid not null references public.modelo(id),
  anios       int4range not null,          -- p.ej. '[2014,2020)' = 2014..2019
  motor_id    uuid references public.motor(id),   -- NULLABLE a propósito
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid()
);
comment on column public.compatibilidad.motor_id is
  'NULL = la pieza aplica a TODOS los motores de ese modelo en ese rango de años '
  '(p.ej. una pastilla de freno). No-NULL = aplica SOLO a ese motor '
  '(p.ej. filtro de aceite, bomba de agua). Grabado en la columna a propósito: '
  'si el motor fuera obligatorio, se cargarían filas falsas y moriría la '
  'búsqueda por placa en silencio.';
comment on column public.compatibilidad.anios is
  'Rango de años COMO RANGO (int4range), no filas expandidas: preserva que la '
  'aplicación es indiferente al año y evita recargar a mano al agregar variantes. '
  'Estándar de industria (ACES trabaja con aplicaciones, no filas).';
alter table public.compatibilidad enable row level security;
alter table public.compatibilidad force  row level security;

-- Índice GiST sobre (modelo_id, anios): estrecha por modelo Y por rango de una
-- pasada. El motor_id NO va en el índice — queda como filtro sobre las pocas
-- filas que sobreviven. (btree_gist da la clase GiST para uuid.)
create index if not exists idx_compat_gist
  on public.compatibilidad using gist (modelo_id, anios);

-- ---------------------------------------------------------------------------
-- 7) vehiculo — el carro del cliente. Apunta al CATÁLOGO por FK; NUNCA texto
--    libre. (Mínima ahora; se amplía en la Tanda 4.)
--    A/G/I=auto/jeepeta/autobús, K=motocicleta, L=carga (prefijos DGII).
-- ---------------------------------------------------------------------------
create table if not exists public.vehiculo (
  id                    uuid primary key default gen_random_uuid(),
  placa                 text not null unique,
  catalogo_vehiculo_id  uuid not null references public.catalogo_vehiculo(id),
  created_at            timestamptz not null default now(),
  created_by            uuid references auth.users(id) default auth.uid(),
  check (placa ~ '^[A-Z]{1,2}[0-9]{5,7}$')
);
alter table public.vehiculo enable row level security;
alter table public.vehiculo force  row level security;

-- ---------------------------------------------------------------------------
-- 8) RLS — políticas por rol desde la creación.
--    LECTURA del catálogo/producto: cualquier usuario vigente. ESCRITURA: solo
--    gestores. vehiculo: lectura vigente; alta/edición asesor + gestores.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.marca, public.motor, public.modelo, public.catalogo_vehiculo,
  public.producto, public.compatibilidad, public.vehiculo
  to authenticated;

-- catálogo (lectura vigente, escritura gestores)
do $$
declare t text;
begin
  foreach t in array array['marca','motor','modelo','catalogo_vehiculo','compatibilidad']
  loop
    execute format($f$
      create policy %1$s_select on public.%1$s for select to authenticated
        using (public.jwt_vigente());
      create policy %1$s_ins on public.%1$s for insert to authenticated
        with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));
      create policy %1$s_upd on public.%1$s for update to authenticated
        using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'))
        with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));
      create policy %1$s_del on public.%1$s for delete to authenticated
        using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));
    $f$, t);
  end loop;
end $$;

-- producto: lectura vigente y NO borrado (soft-delete invisible); escritura gestores.
create policy producto_select on public.producto for select to authenticated
  using (public.jwt_vigente() and deleted_at is null);
create policy producto_ins on public.producto for insert to authenticated
  with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));
create policy producto_upd on public.producto for update to authenticated
  using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'))
  with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));

-- vehiculo: lectura vigente; alta/edición asesor + gestores; borrado gestores.
create policy vehiculo_select on public.vehiculo for select to authenticated
  using (public.jwt_vigente());
create policy vehiculo_ins on public.vehiculo for insert to authenticated
  with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'));
create policy vehiculo_upd on public.vehiculo for update to authenticated
  using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'))
  with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'));
create policy vehiculo_del on public.vehiculo for delete to authenticated
  using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));

-- ============================================================================
-- 9) SIEMBRA — 40 modelos del parque dominicano REAL.
-- ============================================================================

insert into public.marca (nombre) values
  ('Toyota'),('Honda'),('Hyundai'),('Kia'),('Nissan'),('Mitsubishi'),
  ('Suzuki'),('Ford'),('Mazda'),('Jeep'),('Isuzu'),('Daihatsu'),
  ('Bajaj'),('TVS'),('Loncin'),('Haojue'),('Italika'),('Yamaha')
on conflict (nombre) do nothing;

-- motores: cc -> tipo motocicleta ; X.XL -> tipo NULL (familia carro)
insert into public.motor (nombre, descripcion, tipo) values
  ('1.6L','Gasolina 1.6 litros',null), ('1.8L','Gasolina 1.8 litros',null),
  ('2.0L','Gasolina 2.0 litros',null), ('2.4L','Gasolina 2.4 litros',null),
  ('3.5L V6','Gasolina V6 3.5 litros',null), ('2.8 diésel','Diésel 2.8 litros',null),
  ('100cc','Motocicleta 100cc','motocicleta'), ('125cc','Motocicleta 125cc','motocicleta'),
  ('150cc','Motocicleta 150cc','motocicleta'), ('160cc','Motocicleta 160cc','motocicleta'),
  ('180cc','Motocicleta 180cc','motocicleta'), ('200cc','Motocicleta 200cc','motocicleta')
on conflict (nombre) do nothing;

insert into public.modelo (marca_id, nombre, tipo)
select m.id, x.nombre, x.tipo::public.tipo_vehiculo
from (values
  ('Toyota','Corolla','automovil'), ('Toyota','Yaris','automovil'),
  ('Toyota','RAV4','jeepeta'), ('Toyota','Hilux','camion'),
  ('Toyota','4Runner','jeepeta'), ('Toyota','Prado','jeepeta'),
  ('Honda','Civic','automovil'), ('Honda','CR-V','jeepeta'),
  ('Honda','Accord','automovil'), ('Honda','Fit','automovil'),
  ('Hyundai','Elantra','automovil'), ('Hyundai','Accent','automovil'),
  ('Hyundai','Tucson','jeepeta'), ('Hyundai','Santa Fe','jeepeta'),
  ('Kia','Rio','automovil'), ('Kia','Sportage','jeepeta'),
  ('Kia','Picanto','automovil'), ('Kia','Sorento','jeepeta'),
  ('Nissan','Sentra','automovil'), ('Nissan','Frontier','camion'),
  ('Nissan','X-Trail','jeepeta'), ('Nissan','Versa','automovil'),
  ('Mitsubishi','Lancer','automovil'), ('Mitsubishi','Montero','jeepeta'),
  ('Mitsubishi','L200','camion'),
  ('Suzuki','Grand Vitara','jeepeta'),
  ('Ford','Explorer','jeepeta'), ('Ford','Ranger','camion'),
  ('Mazda','Mazda 3','automovil'), ('Mazda','CX-5','jeepeta'),
  ('Jeep','Cherokee','jeepeta'),
  ('Isuzu','D-Max','camion'),
  ('Daihatsu','Terios','jeepeta'),
  ('Bajaj','Boxer CT100','motocicleta'), ('Bajaj','Pulsar 180','motocicleta'),
  ('Bajaj','Discover','motocicleta'),
  ('TVS','Apache RTR 160','motocicleta'), ('TVS','HLX 125','motocicleta'),
  ('TVS','HLX 150','motocicleta'),
  ('Suzuki','AX 100','motocicleta'), ('Suzuki','GN 125','motocicleta'),
  ('Honda','CG 150','motocicleta'), ('Honda','Navi','motocicleta'),
  ('Loncin','CGL 125','motocicleta'),
  ('Haojue','DK 150','motocicleta'),
  ('Italika','FT 150','motocicleta'),
  ('Yamaha','YBR 125','motocicleta')
) as x(marca,nombre,tipo)
join public.marca m on m.nombre = x.marca
on conflict (marca_id, nombre) do nothing;

insert into public.catalogo_vehiculo (modelo_id, anio, motor_id)
select mo.id, y.anio, mt.id
from (values
  ('Corolla',2014,'1.8L'), ('Corolla',2017,'1.8L'), ('Corolla',2019,'2.0L'),
  ('Yaris',2015,'1.6L'), ('Yaris',2019,'1.6L'),
  ('RAV4',2016,'2.4L'), ('RAV4',2019,'2.0L'),
  ('Hilux',2015,'2.8 diésel'), ('Hilux',2020,'2.8 diésel'),
  ('4Runner',2018,'2.4L'), ('Prado',2017,'3.5L V6'),
  ('Civic',2014,'1.8L'), ('Civic',2018,'2.0L'),
  ('CR-V',2016,'2.4L'), ('CR-V',2019,'2.4L'), ('Accord',2015,'2.4L'),
  ('Fit',2016,'1.6L'),
  ('Elantra',2014,'1.8L'), ('Elantra',2018,'2.0L'), ('Accent',2015,'1.6L'),
  ('Tucson',2017,'2.0L'), ('Santa Fe',2016,'2.4L'),
  ('Rio',2015,'1.6L'), ('Rio',2019,'1.6L'), ('Sportage',2017,'2.4L'),
  ('Picanto',2018,'1.6L'), ('Sorento',2016,'3.5L V6'),
  ('Sentra',2014,'1.8L'), ('Sentra',2018,'1.8L'), ('Frontier',2016,'2.4L'),
  ('X-Trail',2017,'2.4L'), ('Versa',2019,'1.6L'),
  ('Lancer',2015,'2.0L'), ('Montero',2016,'3.5L V6'), ('L200',2018,'2.8 diésel'),
  ('Grand Vitara',2015,'2.4L'),
  ('Explorer',2017,'3.5L V6'), ('Ranger',2019,'2.8 diésel'),
  ('Mazda 3',2016,'2.0L'), ('CX-5',2018,'2.4L'),
  ('Cherokee',2016,'2.4L'), ('D-Max',2019,'2.8 diésel'), ('Terios',2015,'1.6L'),
  ('Boxer CT100',2016,'100cc'), ('Boxer CT100',2021,'100cc'),
  ('Pulsar 180',2018,'180cc'), ('Discover',2017,'125cc'),
  ('Apache RTR 160',2019,'160cc'), ('HLX 125',2018,'125cc'), ('HLX 150',2020,'150cc'),
  ('AX 100',2015,'100cc'), ('GN 125',2016,'125cc'),
  ('CG 150',2014,'150cc'), ('CG 150',2019,'150cc'), ('Navi',2020,'125cc'),
  ('CGL 125',2017,'125cc'), ('DK 150',2021,'150cc'),
  ('FT 150',2018,'150cc'), ('YBR 125',2016,'125cc')
) as y(modelo,anio,motor)
join public.modelo mo on mo.nombre = y.modelo
join public.motor  mt on mt.nombre = y.motor
on conflict (modelo_id, anio, motor_id) do nothing;

-- vehiculo — placas RD realistas (A=auto · G=jeepeta · L=carga · K=moto)
insert into public.vehiculo (placa, catalogo_vehiculo_id)
select v.placa, cv.id
from (values
  ('A123456','Corolla',2017,'1.8L'), ('A654321','Civic',2014,'1.8L'),
  ('A778812','Sentra',2018,'1.8L'), ('G445120','RAV4',2016,'2.4L'),
  ('G889077','CR-V',2019,'2.4L'), ('L221345','Hilux',2020,'2.8 diésel'),
  ('K1102345','CG 150',2019,'150cc'), ('K2204567','Apache RTR 160',2019,'160cc'),
  ('K3306781','Boxer CT100',2021,'100cc')
) as v(placa,modelo,anio,motor)
join public.modelo mo on mo.nombre = v.modelo
join public.motor  mt on mt.nombre = v.motor
join public.catalogo_vehiculo cv
     on cv.modelo_id = mo.id and cv.anio = v.anio and cv.motor_id = mt.id
on conflict (placa) do nothing;

-- productos REALES mínimos para probar la puerta (una sucursal cualquiera):
--   pastilla freno Corolla (motor NULL), filtro aceite Corolla (motor 1.8),
--   aceite universal (es_universal, SIN compatibilidad), y dos de moto.
insert into public.producto (nombre, es_universal, sucursal_id)
select p.nombre, p.univ, (select id from public.sucursal order by created_at limit 1)
from (values
  ('Pastilla de freno del. Corolla', false),
  ('Filtro de aceite Corolla 1.8',   false),
  ('Aceite 10W-40 (universal)',      true),
  ('Pastilla de freno CG 150',       false),
  ('Kit de arrastre CG 150',         false)
) as p(nombre, univ);

-- compatibilidad — FK real a producto. El aceite universal NO lleva fila.
insert into public.compatibilidad (producto_id, modelo_id, anios, motor_id)
select pr.id, mo.id, c.anios::int4range,
       case when c.motor = '' then null else mt.id end
from (values
  ('Pastilla de freno del. Corolla','Corolla','[2014,2020)',''),
  ('Filtro de aceite Corolla 1.8',  'Corolla','[2014,2020)','1.8L'),
  ('Pastilla de freno CG 150',      'CG 150','[2012,2025)',''),
  ('Kit de arrastre CG 150',        'CG 150','[2012,2025)','150cc')
) as c(prod,modelo,anios,motor)
join public.producto pr on pr.nombre = c.prod
join public.modelo   mo on mo.nombre = c.modelo
left join public.motor mt on mt.nombre = c.motor;

-- ---------------------------------------------------------------------------
-- 10) Registro de la migración en el historial.
-- ---------------------------------------------------------------------------
insert into supabase_migrations.schema_migrations (version, name) values
  ('0003', 'tanda3_catalogo')
on conflict (version) do nothing;
