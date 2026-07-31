-- ============================================================================
-- JM AUTO · TANDA 4 · Clientes y EXPEDIENTE DE VEHÍCULO
-- ----------------------------------------------------------------------------
-- La columna vertebral. Regla de la tanda: la VISITA pertenece al VEHÍCULO, no
-- al cliente. El carro es la unidad económica (se daña, vuelve, cambia de
-- dueño); el cliente es solo quien paga hoy. Cuando el carro cambie de dueño,
-- su historial se queda con él (Idea 1).
--
-- Alcance de sucursal_id (regla de MODELO-CATALOGO.md): cliente y vehiculo NO
-- lo llevan (son del negocio). visita SÍ (ocurre en un lugar).
--
-- Cada tabla nueva: RLS+FORCE en ESTA migración + revoke explícito de anon +
-- authenticated solo con CRUD (sin TRUNCATE/TRIGGER/REFERENCES). Nada en bloque.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) cliente — persona o empresa. Sin sucursal_id (del negocio).
--    Documento: cédula (persona, 000-0000000-0) o RNC (empresa, 9 dígitos),
--    con validación de FORMATO por CHECK según el tipo.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.tipo_cliente as enum ('persona','empresa');
exception when duplicate_object then null; end $$;

create table if not exists public.cliente (
  id          uuid primary key default gen_random_uuid(),
  tipo        public.tipo_cliente not null default 'persona',
  documento   text,
  nombre      text not null,
  telefono    text,
  whatsapp    text,
  correo      text,
  direccion   text,
  notas       text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid(),
  deleted_at  timestamptz,
  constraint cliente_documento_formato check (
    documento is null
    or (tipo = 'persona' and documento ~ '^[0-9]{3}-[0-9]{7}-[0-9]$')          -- cédula
    or (tipo = 'empresa' and documento ~ '^[0-9]{9}$')                          -- RNC
  )
);
alter table public.cliente enable row level security;
alter table public.cliente force  row level security;
revoke all on public.cliente from anon, authenticated;
grant  select, insert, update, delete on public.cliente to authenticated;

-- ---------------------------------------------------------------------------
-- 2) vehiculo — YA existe (Tanda 3: placa + catalogo_vehiculo_id + RLS/grants,
--    anon ya revocado por 0004). Se AMPLÍA con los campos de expediente.
--    Sigue SIN sucursal_id.
-- ---------------------------------------------------------------------------
alter table public.vehiculo
  add column if not exists color      text,
  add column if not exists chasis     text,
  add column if not exists km_actual  int check (km_actual is null or km_actual >= 0),
  add column if not exists notas      text,
  add column if not exists foto_path  text;   -- ruta en Storage (bucket privado 'vehiculos')

-- ---------------------------------------------------------------------------
-- 3) vehiculo_propietario — historial de propiedad (Idea 1). Sin sucursal_id.
--    hasta NULL = dueño actual. Un solo dueño actual por vehículo.
-- ---------------------------------------------------------------------------
create table if not exists public.vehiculo_propietario (
  id          uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculo(id) on delete cascade,
  cliente_id  uuid not null references public.cliente(id),
  desde       date not null default current_date,
  hasta       date,                              -- NULL = dueño actual
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid(),
  check (hasta is null or hasta >= desde)
);
create unique index if not exists uniq_dueno_actual
  on public.vehiculo_propietario (vehiculo_id) where hasta is null;
alter table public.vehiculo_propietario enable row level security;
alter table public.vehiculo_propietario force  row level security;
revoke all on public.vehiculo_propietario from anon, authenticated;
grant  select, insert, update, delete on public.vehiculo_propietario to authenticated;

-- ---------------------------------------------------------------------------
-- 4) visita — MÍNIMA (como producto). Pertenece al VEHÍCULO. sucursal_id SÍ.
--    El kilometraje de cada visita alimenta el motor de recurrencia (Tanda 15):
--    si no nace aquí, no se reconstruye después.
--    La Tanda 8 la expande con: estado, puesto/bahía, técnico asignado, renglones
--    (servicios/piezas por visita), total, y probablemente orden_id. Anotado.
-- ---------------------------------------------------------------------------
create table if not exists public.visita (
  id          uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculo(id) on delete cascade,
  sucursal_id uuid not null references public.sucursal(id),
  fecha       date not null default current_date,
  kilometraje int check (kilometraje is null or kilometraje >= 0),
  descripcion text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid()
);
alter table public.visita enable row level security;
alter table public.visita force  row level security;
revoke all on public.visita from anon, authenticated;
grant  select, insert, update, delete on public.visita to authenticated;

-- ---------------------------------------------------------------------------
-- 5) RLS por rol
--    LECTURA: cualquier usuario vigente (buscar clientes/vehículos/expediente).
--    ESCRITURA (cliente/vehiculo/propietario/visita): asesor + gestores.
--    BORRADO: solo gestores (Técnico y Cajero NO borran clientes ni vehículos).
--    vehiculo ya tiene sus políticas de la Tanda 3 (select vigente; ins/upd
--    asesor+gestores; del gestores) — sirven tal cual, no se tocan.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['cliente','vehiculo_propietario','visita']
  loop
    execute format($f$
      create policy %1$s_select on public.%1$s for select to authenticated
        using (public.jwt_vigente());
      create policy %1$s_ins on public.%1$s for insert to authenticated
        with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'));
      create policy %1$s_upd on public.%1$s for update to authenticated
        using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'))
        with check (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'));
      create policy %1$s_del on public.%1$s for delete to authenticated
        using (public.jwt_vigente() and public.jwt_rol() in ('superadmin','dueno','gerente'));
    $f$, t);
  end loop;
end $$;

-- cliente: el select por deleted_at (soft-delete invisible) — se refina el select.
drop policy if exists cliente_select on public.cliente;
create policy cliente_select on public.cliente for select to authenticated
  using (public.jwt_vigente() and deleted_at is null);

-- ---------------------------------------------------------------------------
-- 6) STORAGE — bucket PRIVADO 'vehiculos' (fotos por URL firmada; directa rebota).
--    RLS sobre storage.objects acotada a ESE bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('vehiculos', 'vehiculos', false)
on conflict (id) do nothing;

create policy vehiculos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'vehiculos' and public.jwt_vigente());
create policy vehiculos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vehiculos' and public.jwt_vigente()
              and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'));
create policy vehiculos_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'vehiculos' and public.jwt_vigente()
         and public.jwt_rol() in ('superadmin','dueno','gerente','asesor'));
create policy vehiculos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vehiculos' and public.jwt_vigente()
         and public.jwt_rol() in ('superadmin','dueno','gerente'));

-- ============================================================================
-- 7) SIEMBRA — ~30 clientes, ~45 vehículos, propiedad (con flotilla y 2 cambios
--    de dueño), y visitas con kilometraje creciente en el tiempo.
-- ============================================================================

-- 7.1) clientes (24 personas + 6 empresas). Cédulas 000-0000000-0; RNC 9 dígitos.
insert into public.cliente (tipo, documento, nombre, telefono, whatsapp, correo, direccion) values
  ('persona','001-1234567-8','Ramón Herrera',      '809-555-1010','809-555-1010','rherrera@gmail.com','C/ Duarte 12, Santiago'),
  ('persona','002-2345678-9','María Fernández',     '809-555-1020','809-555-1020','mfernandez@gmail.com','C/ del Sol 45, Santiago'),
  ('persona','003-3456789-0','José Rodríguez',      '829-555-1030',null,'jrodriguez@hotmail.com','C/ Restauración 8, La Vega'),
  ('persona','004-4567890-1','Ana Martínez',        '849-555-1040','849-555-1040','amartinez@gmail.com','Av. 27 de Febrero 100, Santo Domingo'),
  ('persona','005-5678901-2','Luis Peña',           '809-555-1050',null,null,'C/ Mella 33, Santiago'),
  ('persona','006-6789012-3','Carmen Jiménez',      '829-555-1060','829-555-1060','cjimenez@gmail.com','C/ Sánchez 7, Moca'),
  ('persona','007-7890123-4','Pedro Gómez',         '809-555-1070',null,'pgomez@gmail.com','Av. Estrella Sadhalá 21, Santiago'),
  ('persona','008-8901234-5','Rosa Santos',         '849-555-1080','849-555-1080',null,'C/ Beller 14, Puerto Plata'),
  ('persona','009-9012345-6','Miguel Reyes',        '809-555-1090',null,'mreyes@hotmail.com','C/ 16 de Agosto 5, Santiago'),
  ('persona','010-0123456-7','Juana Díaz',          '829-555-1100','829-555-1100',null,'Av. Circunvalación 9, La Vega'),
  ('persona','011-1234567-9','Francisco Núñez',     '809-555-1110',null,'fnunez@gmail.com','C/ Cuba 18, Santiago'),
  ('persona','012-2345678-0','Yamile Cruz',         '849-555-1120','849-555-1120','ycruz@gmail.com','C/ Padre las Casas 3, Santo Domingo'),
  ('persona','013-3456789-1','Héctor Vargas',       '809-555-1130',null,null,'C/ San Luis 27, Santiago'),
  ('persona','014-4567890-2','Daniela Ureña',       '829-555-1140','829-555-1140','durena@gmail.com','Av. Bartolomé Colón 44, Santiago'),
  ('persona','015-5678901-3','Ángel Batista',       '809-555-1150',null,'abatista@hotmail.com','C/ Independencia 11, Bonao'),
  ('persona','016-6789012-4','Patricia Mejía',      '849-555-1160','849-555-1160',null,'C/ Duvergé 6, Santiago'),
  ('persona','017-7890123-5','Rafael Then',         '809-555-1170',null,'rthen@gmail.com','C/ Máximo Gómez 22, Moca'),
  ('persona','018-8901234-6','Sonia Almonte',       '829-555-1180','829-555-1180','salmonte@gmail.com','Av. Juan Pablo Duarte 90, Santiago'),
  ('persona','019-9012345-7','Julio Espinal',       '809-555-1190',null,null,'C/ El Sol 2, La Vega'),
  ('persona','020-0123456-8','Wanda Paulino',       '849-555-1200','849-555-1200','wpaulino@gmail.com','C/ Benito Monción 15, Santiago'),
  ('persona','021-1234567-0','Eduardo Tavárez',     '809-555-1210',null,'etavarez@hotmail.com','Av. Las Carreras 30, Santiago'),
  ('persona','022-2345678-1','Gladys Peralta',      '829-555-1220','829-555-1220',null,'C/ Colón 19, Puerto Plata'),
  ('persona','023-3456789-2','Osvaldo Read',        '809-555-1230',null,'oread@gmail.com','C/ Salcedo 4, Santiago'),
  ('persona','024-4567890-3','Belkis Guzmán',       '849-555-1240','849-555-1240','bguzman@gmail.com','Av. Imbert 55, Santiago'),
  ('empresa','131111111','Transporte del Cibao SRL',  '809-555-2010','809-555-2010','flota@transcibao.do','Zona Franca, Santiago'),
  ('empresa','130222222','Ferretería La Nacional SRL','809-555-2020',null,'compras@lanacional.do','Av. Monumental, Santiago'),
  ('empresa','131333333','Distribuidora Andújar SRL', '809-555-2030','809-555-2030','flota@andujar.do','Parque Industrial, La Vega'),
  ('empresa','130444444','Agroservicios del Norte SA','809-555-2040',null,'info@agronorte.do','Carretera Duarte Km 5, Santiago'),
  ('empresa','131555555','Constructora Peña & Asoc.', '809-555-2050','809-555-2050','admin@penaconstruye.do','C/ del Llano 12, Moca'),
  ('empresa','130666666','Farmacia Popular SRL',      '809-555-2060',null,'gerencia@farmapopular.do','C/ Beller 30, Santiago')
on conflict do nothing;

-- 7.2) ampliar los 9 vehículos existentes (Tanda 3) con datos de expediente
update public.vehiculo set color='Gris',   km_actual=132000, chasis='JTDBL40E1' where placa='A123456';
update public.vehiculo set color='Negro',  km_actual=178500, chasis='19XFB2F5' where placa='A654321';
update public.vehiculo set color='Blanco', km_actual=96000,  chasis='3N1AB7A5' where placa='A778812';
update public.vehiculo set color='Plata',  km_actual=88000,  chasis='JTMBFREV' where placa='G445120';
update public.vehiculo set color='Rojo',   km_actual=54000,  chasis='2HKRW2H5' where placa='G889077';
update public.vehiculo set color='Blanco', km_actual=142000, chasis='MR0FB8CD' where placa='L221345';
update public.vehiculo set color='Negro',  km_actual=41000,  chasis='9C2KC1670' where placa='K1102345';
update public.vehiculo set color='Azul',   km_actual=23000,  chasis='MD634KE40' where placa='K2204567';
update public.vehiculo set color='Rojo',   km_actual=18500,  chasis='MD2A36FZ0' where placa='K3306781';

-- 7.3) ~36 vehículos nuevos apuntando al catálogo real (incluye motos)
insert into public.vehiculo (placa, catalogo_vehiculo_id, color, km_actual, chasis)
select x.placa, cv.id, x.color, x.km, x.chasis
from (values
  ('A300101','Corolla',2014,'1.8L','Blanco',165000,'2T1BURHE1'),
  ('A300102','Corolla',2019,'2.0L','Gris',   62000,'5YFBURHE2'),
  ('A300103','Yaris',  2015,'1.6L','Rojo',   119000,'VNKKTUD31'),
  ('A300104','Yaris',  2019,'1.6L','Azul',    48000,'VNKKTUD32'),
  ('A300105','Civic',  2018,'2.0L','Negro',   71000,'2HGFC2F53'),
  ('A300106','Accord', 2015,'2.4L','Plata',  134000,'1HGCR2F84'),
  ('A300107','Fit',    2016,'1.6L','Blanco',  98000,'JHMGK5H55'),
  ('A300108','Elantra',2014,'1.8L','Gris',   151000,'5NPDH4AE6'),
  ('A300109','Elantra',2018,'2.0L','Blanco',  63000,'5NPD84LF7'),
  ('A300110','Accent', 2015,'1.6L','Rojo',   112000,'KMHCT4AE8'),
  ('A300111','Rio',    2019,'1.6L','Azul',    39000,'3KPA24AD9'),
  ('A300112','Picanto',2018,'1.6L','Verde',   57000,'KNAB2511A'),
  ('A300113','Sentra', 2014,'1.8L','Gris',   158000,'3N1AB7AP1'),
  ('A300114','Versa',  2019,'1.6L','Blanco',  44000,'3N1CN7AP2'),
  ('A300115','Lancer', 2015,'2.0L','Negro',   99000,'JA32U2FU3'),
  ('A300116','Mazda 3',2016,'2.0L','Rojo',    87000,'3MZBM1U74'),
  ('G300201','RAV4',   2019,'2.0L','Blanco',  52000,'2T3W1RFV5'),
  ('G300202','CR-V',   2016,'2.4L','Plata',  108000,'2HKRM4H36'),
  ('G300203','4Runner',2018,'2.4L','Negro',   79000,'JTEBU5JR7'),
  ('G300204','Prado',  2017,'3.5L V6','Gris', 91000,'JTEBH3FJ8'),
  ('G300205','Tucson', 2017,'2.0L','Blanco',  84000,'KM8J3CA49'),
  ('G300206','Santa Fe',2016,'2.4L','Azul',  102000,'5XYZUDLB0'),
  ('G300207','Sportage',2017,'2.4L','Rojo',   77000,'KNDPB3AC1'),
  ('G300208','Sorento',2016,'3.5L V6','Negro',119000,'5XYKT4A72'),
  ('G300209','X-Trail',2017,'2.4L','Plata',   88000,'JN8AT2MT3'),
  ('G300210','Montero',2016,'3.5L V6','Blanco',126000,'JA4JS3AW4'),
  ('G300211','Explorer',2017,'3.5L V6','Negro',95000,'1FM5K8D85'),
  ('G300212','CX-5',   2018,'2.4L','Rojo',     61000,'JM3KFBDM6'),
  ('G300213','Cherokee',2016,'2.4L','Gris',   110000,'1C4PJMDB7'),
  ('G300214','Terios', 2015,'1.6L','Verde',   123000,'J2100LGM8'),
  ('L300301','Hilux',  2015,'2.8 diésel','Blanco',171000,'8AJKB8CD9'),
  ('L300302','Frontier',2016,'2.4L','Gris',   134000,'1N6AD0EV0'),
  ('L300303','L200',   2018,'2.8 diésel','Plata',98000,'MMBJNKL11'),
  ('L300304','Ranger', 2019,'2.8 diésel','Rojo',72000,'MPBUMFF12'),
  ('L300305','D-Max',  2019,'2.8 diésel','Blanco',66000,'MPATFS8613'),
  ('K300401','Pulsar 180',2018,'180cc','Negro',31000,'MD2A21FZ14'),
  ('K300402','Discover',2017,'125cc','Rojo',   42000,'MD2A18FY15'),
  ('K300403','HLX 125',2018,'125cc','Azul',    38000,'MBLHA10A16'),
  ('K300404','HLX 150',2020,'150cc','Negro',   19000,'MBLHA15A17'),
  ('K300405','GN 125', 2016,'125cc','Rojo',    52000,'LC6PAGA118'),
  ('K300406','CGL 125',2017,'125cc','Negro',   47000,'LLCLPP2019'),
  ('K300407','FT 150', 2018,'150cc','Azul',    36000,'3LBXCJLF20'),
  ('K300408','YBR 125',2016,'125cc','Rojo',    58000,'9C6KE1500A')
) as x(placa,modelo,anio,motor,color,km,chasis)
join public.modelo mo on mo.nombre = x.modelo
join public.motor  mt on mt.nombre = x.motor
join public.catalogo_vehiculo cv
     on cv.modelo_id = mo.id and cv.anio = x.anio and cv.motor_id = mt.id
on conflict (placa) do nothing;

-- 7.4) PROPIEDAD
-- 7.4.a) Flotilla: Distribuidora Andújar SRL es dueña actual de 4 camionetas.
insert into public.vehiculo_propietario (vehiculo_id, cliente_id, desde)
select v.id, c.id, date '2021-03-01'
from public.vehiculo v
join public.cliente c on c.nombre = 'Distribuidora Andújar SRL'
where v.placa in ('L300301','L300303','L300304','L300305')
on conflict do nothing;

-- 7.4.b) DOS cambios de dueño (Idea 1): dueño anterior (cerrado) + dueño actual.
--   Vehículo A123456 (Corolla 2017): Ramón Herrera (2019–2023) -> María Fernández (actual)
insert into public.vehiculo_propietario (vehiculo_id, cliente_id, desde, hasta)
select v.id, c.id, date '2019-05-10', date '2023-08-20'
from public.vehiculo v join public.cliente c on c.nombre='Ramón Herrera' where v.placa='A123456';
insert into public.vehiculo_propietario (vehiculo_id, cliente_id, desde)
select v.id, c.id, date '2023-08-20'
from public.vehiculo v join public.cliente c on c.nombre='María Fernández' where v.placa='A123456';
--   Vehículo K1102345 (CG 150): José Rodríguez (2020–2024) -> Ángel Batista (actual)
insert into public.vehiculo_propietario (vehiculo_id, cliente_id, desde, hasta)
select v.id, c.id, date '2020-02-01', date '2024-01-15'
from public.vehiculo v join public.cliente c on c.nombre='José Rodríguez' where v.placa='K1102345';
insert into public.vehiculo_propietario (vehiculo_id, cliente_id, desde)
select v.id, c.id, date '2024-01-15'
from public.vehiculo v join public.cliente c on c.nombre='Ángel Batista' where v.placa='K1102345';

-- 7.4.c) El resto de los vehículos sin dueño aún: un dueño actual por round-robin
--   sobre los clientes (algunos clientes quedan con 2+ vehículos, natural).
insert into public.vehiculo_propietario (vehiculo_id, cliente_id, desde)
select v.id, c.id, current_date - (v.rn % 900)::int
from (select id, placa, row_number() over (order by placa) rn from public.vehiculo) v
join (select id, row_number() over (order by nombre) rn from public.cliente) c
  on c.rn = 1 + (v.rn % (select count(*) from public.cliente))
where not exists (select 1 from public.vehiculo_propietario vp where vp.vehiculo_id = v.id);

-- 7.5) VISITAS — kilometraje creciente en el tiempo. Incluye visitas del Corolla
--   A123456 ANTES y DESPUÉS del cambio de dueño (el historial se queda con el carro).
insert into public.visita (vehiculo_id, sucursal_id, fecha, kilometraje, descripcion)
select v.id, (select id from public.sucursal order by created_at limit 1), x.fecha::date, x.km, x.descr
from (values
  -- Corolla A123456 (cruza el cambio de dueño de 2023-08)
  ('A123456','2022-06-15', 98000,'Cambio de aceite y filtros'),
  ('A123456','2023-01-20',110000,'Frenos delanteros + rotación de gomas'),
  ('A123456','2023-11-05',119000,'Cambio de aceite (nuevo dueño)'),
  ('A123456','2024-07-12',132000,'Correa de tiempo y bomba de agua'),
  -- CG 150 K1102345 (cruza el cambio de dueño de 2024-01)
  ('K1102345','2022-09-10', 22000,'Ajuste de cadena y cambio de aceite'),
  ('K1102345','2023-06-01', 31000,'Pastillas de freno'),
  ('K1102345','2024-05-18', 41000,'Cambio de aceite (nuevo dueño)'),
  -- otros vehículos, historial variado
  ('A654321','2023-03-02',160000,'Embrague'),
  ('A654321','2024-02-14',178500,'Cambio de aceite + bujías'),
  ('G445120','2023-08-08', 72000,'Servicio 70k'),
  ('G445120','2024-06-20', 88000,'Amortiguadores traseros'),
  ('G889077','2024-03-30', 54000,'Cambio de aceite'),
  ('L221345','2023-05-05',120000,'Servicio mayor diésel'),
  ('L221345','2024-08-01',142000,'Inyectores + filtros'),
  ('A300102','2024-04-10', 62000,'Cambio de aceite'),
  ('A300105','2023-10-22', 60000,'Frenos + alineación'),
  ('A300108','2024-01-09',151000,'Bomba de agua'),
  ('G300201','2024-05-25', 52000,'Servicio 50k'),
  ('G300204','2023-12-12', 91000,'Cambio de aceite y diferencial'),
  ('L300301','2024-02-28',171000,'Servicio de flotilla'),
  ('L300303','2024-03-15', 98000,'Servicio de flotilla'),
  ('K300401','2024-06-05', 31000,'Cambio de aceite moto'),
  ('K300404','2024-07-20', 19000,'Primer servicio')
) as x(placa,fecha,km,descr)
join public.vehiculo v on v.placa = x.placa;

-- ---------------------------------------------------------------------------
-- 8) registro
-- ---------------------------------------------------------------------------
insert into supabase_migrations.schema_migrations (version, name) values
  ('0006', 'tanda4_clientes_expediente')
on conflict (version) do nothing;
