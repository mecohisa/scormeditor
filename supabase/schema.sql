-- =============================================================================
-- SCORMEditor · esquema completo de la nube (Supabase, esquema `scormeditor`).
--
-- Fichero ÚNICO y AUTOSUFICIENTE: pégalo entero en el SQL Editor de un
-- proyecto Supabase nuevo (o vacío) y reconstruye todo desde cero — tablas,
-- funciones, triggers, políticas RLS, bucket de Storage y datos semilla.
-- Es el estado ACTUAL, no un historial de cambios: para futuros cambios de
-- esquema, edita este mismo fichero (no crear más ficheros de migración
-- sueltos) y vuelve a pegar en el SQL Editor lo que corresponda.
--
-- ESTE PROYECTO SUPABASE ES COMPARTIDO con el CRM de Mecohisa (academyhub):
-- todo lo de SCORMEditor vive en su propio esquema `scormeditor`, nunca en
-- `public` (ahí están las tablas del CRM). `auth.users` y `storage.buckets`
-- SÍ son globales al proyecto — es lo único que no se puede aislar por
-- esquema — por eso los triggers/políticas que los tocan usan nombres con
-- prefijo `scormeditor_`/`scormeditor:` para no chocar si el CRM ya tiene
-- los suyos con nombres parecidos.
--
-- Tras aplicarlo, en el dashboard: Project Settings → Data API → "Exposed
-- schemas" → añadir `scormeditor` (por defecto solo expone `public`; sin
-- este paso el cliente no puede consultar nada de aquí). Requiere pgcrypto
-- (ya viene habilitado en cualquier proyecto Supabase).
--
-- Tras la primera vez, hay que dar de alta a mano (fuera de este script,
-- solo una vez): quién puede crear organizaciones (ver `org_creators` más
-- abajo) y las cuentas de usuario (Authentication → Users → Add user, o
-- Invite user — el alta de cuentas no se puede hacer desde SQL).
-- =============================================================================

create extension if not exists pgcrypto;

create schema if not exists scormeditor;

-- -----------------------------------------------------------------------------
-- 1. Organizaciones, perfiles y membresías
-- -----------------------------------------------------------------------------

create table scormeditor.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- Espejo de auth.users con lo que necesitamos mostrar (nombre, avatar) para
-- presencia y listados de equipo. auth.users no es consultable directamente
-- desde el cliente. Si el CRM ya tiene su propia tabla de perfiles, esta es
-- independiente (vive en scormeditor, no en public) — puede haber dos filas
-- de "perfil" por usuario, una por app, sin conflicto.
create table scormeditor.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table scormeditor.memberships (
  user_id    uuid not null references auth.users (id) on delete cascade,
  org_id     uuid not null references scormeditor.organizations (id) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create index memberships_org_id_idx on scormeditor.memberships (org_id);

-- Quién puede CREAR organizaciones nuevas — deliberadamente restringido y
-- SIN política RLS que lo exponga a `authenticated` (nadie puede leerla ni
-- escribirla desde el cliente): se gestiona solo desde el SQL Editor del
-- dashboard, nunca desde la app.
--   Añadir a alguien:  insert into scormeditor.org_creators (email) values ('nuevo@mecohisa.com');
--   Quitar a alguien:  delete from scormeditor.org_creators where email = 'nuevo@mecohisa.com';
--   Ver quién está:    select * from scormeditor.org_creators;
create table scormeditor.org_creators (
  email text primary key
);
alter table scormeditor.org_creators enable row level security;
-- Sin "grant" a authenticated y sin políticas: acceso cero desde el cliente.

insert into scormeditor.org_creators (email) values ('jarruego@mecohisa.com')
on conflict (email) do nothing;

-- Lectores globales: cuentas internas (p. ej. la que usa Claude desde la
-- terminal, `scripts/nube/nube.mjs`) que LEEN todo SCORMEditor —todas las
-- organizaciones, carpetas, documentos, versiones y ZIP— sin ser miembros
-- de nada y sin poder escribir. No es un rol de la app: no aparece en
-- «Gestionar equipo» y, como `org_creators`, solo se gestiona desde el SQL
-- Editor (sin grant ni políticas: acceso cero desde el cliente). Solo
-- añade políticas de SELECT (sección 6 y 7), así que no cambia lo que
-- puede hacer ninguna otra cuenta.
--   Añadir:  insert into scormeditor.global_readers (user_id)
--              select id from auth.users where email = 'cuenta@mecohisa.com';
--   Quitar:  delete from scormeditor.global_readers
--              where user_id = (select id from auth.users where email = 'cuenta@mecohisa.com');
--   Ver:     select u.email, g.created_at from scormeditor.global_readers g
--              join auth.users u on u.id = g.user_id;
create table scormeditor.global_readers (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table scormeditor.global_readers enable row level security;
-- Sin "grant" a authenticated y sin políticas: acceso cero desde el cliente.

-- -----------------------------------------------------------------------------
-- 2. Carpetas y documentos (proyectos .scormproj)
-- -----------------------------------------------------------------------------

create table scormeditor.folders (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references scormeditor.organizations (id) on delete cascade,
  parent_folder_id  uuid references scormeditor.folders (id) on delete cascade,
  name              text not null,
  created_by        uuid references auth.users (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index folders_org_id_idx on scormeditor.folders (org_id);
create index folders_parent_idx on scormeditor.folders (parent_folder_id);

create table scormeditor.documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references scormeditor.organizations (id) on delete cascade,
  -- una carpeta que se borra "suelta" sus documentos en vez de arrastrarlos:
  folder_id    uuid references scormeditor.folders (id) on delete set null,
  -- course.course.id (slug editable por el autor); NO es la clave primaria,
  -- solo sirve para sugerir el nombre de archivo al exportar/descargar.
  course_slug  text not null,
  title        text not null,
  size_bytes   bigint not null default 0,
  created_by   uuid references auth.users (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- papelera de 30 días en vez de borrado inmediato; ver política de SELECT.
  deleted_at   timestamptz
);

create index documents_org_id_idx on scormeditor.documents (org_id);
create index documents_folder_id_idx on scormeditor.documents (folder_id);

create table scormeditor.document_versions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references scormeditor.documents (id) on delete cascade,
  version_no    int not null,
  -- ruta dentro del bucket 'scormeditor-projects': {org_id}/{document_id}/{id}.zip
  -- (el propio uuid de esta fila, generado en el cliente ANTES de insertarla:
  -- así se puede subir el blob al Storage sin depender todavía de version_no,
  -- que asigna un trigger del servidor — ver src/cloud/documents.ts)
  storage_path  text not null,
  size_bytes    bigint not null default 0,
  created_by    uuid references auth.users (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  unique (document_id, version_no)
);

create index document_versions_document_id_idx on scormeditor.document_versions (document_id);

-- Bloqueos: 'structural' (árbol completo: añadir/mover/borrar pantallas) o
-- 'screen' (exclusivo y corto, solo para operaciones destructivas dentro de
-- una pantalla). scope_ref = '' (no NULL) para bloqueos estructurales, así
-- la PK compuesta garantiza como mucho una fila activa por (documento,
-- scope, referencia).
create table scormeditor.document_locks (
  document_id uuid not null references scormeditor.documents (id) on delete cascade,
  scope       text not null check (scope in ('structural', 'screen')),
  scope_ref   text not null default '',
  holder_id   uuid not null references auth.users (id),
  acquired_at timestamptz not null default now(),
  expires_at  timestamptz not null,
  primary key (document_id, scope, scope_ref)
);

-- Concesiones de acceso POR CARPETA — segundo nivel de permisos, más fino
-- que el rol de organización (`memberships.role`): un `editor`/`viewer` de
-- organización YA NO ve automáticamente todas las carpetas, solo aquellas
-- donde tenga una fila aquí (rol 'editor' o 'viewer', independiente de su
-- rol de organización — así un 'viewer' de organización puede ser 'editor'
-- en una carpeta concreta, y viceversa). El `owner` de la organización
-- sigue viendo/editando TODO siempre, sin necesitar fila aquí. Deny-by-
-- default: una carpeta nueva no la ve nadie más que el owner hasta que este
-- concede acceso explícito. Varias personas pueden tener acceso de edición
-- a la vez sobre la misma carpeta (co-tutoría) — no es "un dueño por
-- carpeta", es una concesión muchos-a-muchos.
create table scormeditor.folder_access (
  folder_id  uuid not null references scormeditor.folders (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('editor', 'viewer')),
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (folder_id, user_id)
);

create index folder_access_user_id_idx on scormeditor.folder_access (user_id);

-- -----------------------------------------------------------------------------
-- 3. Funciones auxiliares para las políticas RLS
--
-- SECURITY DEFINER aquí es la excepción deliberada, no la norma: sin ella,
-- una política en `memberships` que consulta `memberships` para saber si el
-- usuario pertenece a la organización cae en recursión/rendimiento pobre
-- (patrón documentado por Supabase). Estas funciones son de solo lectura,
-- deterministas sobre auth.uid() y no exponen nada que el propio usuario no
-- pueda ya pedir sobre sí mismo.
--
-- `set search_path = ''` + todo cualificado con su esquema: en un proyecto
-- compartido con otra app no basta con `search_path = public`, porque en
-- este proyecto `public` es del CRM. Cualificar todo explícitamente también
-- evita el clásico ataque de secuestro de search_path en funciones
-- SECURITY DEFINER, así que es la práctica correcta aquí igualmente.
--
-- «_direct»: las políticas de SELECT/UPDATE/DELETE de `folders` y la de
-- SELECT de `documents` NO pueden usar la variante «por id» de estas
-- funciones (`folder_role(id)`/`document_role(id)`, que hacen su PROPIA
-- consulta a la tabla que están comprobando) — Postgres evalúa esa política
-- también para el `RETURNING` de su propio `INSERT` (lo que hace
-- `.insert().select()` de supabase-js), y en ese instante exacto la
-- subconsulta interna de la función NO ve todavía la fila recién insertada
-- (aunque exista a efectos del propio INSERT), dando un falso «RLS lo
-- rechaza» — confirmado paso a paso con logs reales, no es una suposición.
-- Las variantes «_direct» reciben `org_id`/`created_by`/`folder_id` ya
-- resueltos como argumentos (columnas a secas de la fila, igual que hacía
-- el `org_role(org_id)` original) en vez de volver a consultar su propia
-- tabla. El resto de sitios (document_versions, document_locks, Storage, el
-- RPC `document_role` que llama el cliente) comprueban una tabla DISTINTA a
-- la que se está insertando, así que no tienen este problema y usan las
-- variantes «por id» de siempre.
-- -----------------------------------------------------------------------------

-- ¿La sesión actual es un lector global? (ver `global_readers`, sección 1).
create or replace function scormeditor.is_global_reader()
returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (select 1 from scormeditor.global_readers where user_id = auth.uid());
$$;

create or replace function scormeditor.is_org_member(p_org_id uuid)
returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from scormeditor.memberships m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

create or replace function scormeditor.org_role(p_org_id uuid)
returns text
language sql security definer set search_path = '' stable as $$
  select role from scormeditor.memberships m
  where m.org_id = p_org_id and m.user_id = auth.uid();
$$;

create or replace function scormeditor.document_org(p_document_id uuid)
returns uuid
language sql security definer set search_path = '' stable as $$
  select org_id from scormeditor.documents where id = p_document_id;
$$;

create or replace function scormeditor.folder_org(p_folder_id uuid)
returns uuid
language sql security definer set search_path = '' stable as $$
  select org_id from scormeditor.folders where id = p_folder_id;
$$;

-- Rol efectivo de auth.uid() sobre una carpeta: 'owner' (administra la
-- organización entera), 'editor' si es quien la creó o tiene concesión de
-- editor, el rol de `folder_access` si lo hay, o null (sin acceso — ni se
-- sabe que la carpeta existe).
create or replace function scormeditor.folder_role(p_folder_id uuid)
returns text
language plpgsql security definer set search_path = '' stable as $$
declare
  v_org_id uuid;
  v_created_by uuid;
  v_role text;
begin
  select org_id, created_by into v_org_id, v_created_by
    from scormeditor.folders where id = p_folder_id;
  if v_org_id is null then return null; end if;
  if scormeditor.org_role(v_org_id) = 'owner' then return 'owner'; end if;
  if v_created_by is not null and v_created_by = auth.uid() then return 'editor'; end if;
  select role into v_role from scormeditor.folder_access
    where folder_id = p_folder_id and user_id = auth.uid();
  return v_role;
end;
$$;

-- Variante para las políticas de la propia tabla `folders` (ver nota de
-- arriba sobre el RETURNING) — mismo cálculo, sin re-consultar `folders`.
create or replace function scormeditor.folder_role_direct(p_folder_id uuid, p_org_id uuid, p_created_by uuid)
returns text
language plpgsql security definer set search_path = '' stable as $$
declare
  v_role text;
begin
  if p_org_id is null then return null; end if;
  if scormeditor.org_role(p_org_id) = 'owner' then return 'owner'; end if;
  if p_created_by is not null and p_created_by = auth.uid() then return 'editor'; end if;
  select role into v_role from scormeditor.folder_access
    where folder_id = p_folder_id and user_id = auth.uid();
  return v_role;
end;
$$;

create or replace function scormeditor.can_view_folder(p_folder_id uuid)
returns boolean
language sql stable as $$
  select scormeditor.folder_role(p_folder_id) is not null;
$$;

create or replace function scormeditor.can_edit_folder(p_folder_id uuid)
returns boolean
language sql stable as $$
  select scormeditor.folder_role(p_folder_id) in ('owner', 'editor');
$$;

-- Documento SIN carpeta (`folder_id is null`): solo el owner. Con carpeta:
-- hereda el rol de esa carpeta.
create or replace function scormeditor.document_role(p_document_id uuid)
returns text
language plpgsql security definer set search_path = '' stable as $$
declare
  v_folder_id uuid;
  v_org_id uuid;
begin
  select folder_id, org_id into v_folder_id, v_org_id from scormeditor.documents where id = p_document_id;
  if v_org_id is null then return null; end if;
  if scormeditor.org_role(v_org_id) = 'owner' then return 'owner'; end if;
  if v_folder_id is null then return null; end if;
  return scormeditor.folder_role(v_folder_id);
end;
$$;

-- Variante para la política de SELECT de la propia tabla `documents` (ver
-- nota de arriba sobre el RETURNING) — `folders` es una tabla DISTINTA
-- (ya existe de antes), así que `folder_role()` se puede seguir usando tal cual.
create or replace function scormeditor.document_role_direct(p_folder_id uuid, p_org_id uuid)
returns text
language plpgsql security definer set search_path = '' stable as $$
begin
  if p_org_id is null then return null; end if;
  if scormeditor.org_role(p_org_id) = 'owner' then return 'owner'; end if;
  if p_folder_id is null then return null; end if;
  return scormeditor.folder_role(p_folder_id);
end;
$$;

create or replace function scormeditor.can_view_document(p_document_id uuid)
returns boolean
language sql stable as $$
  select scormeditor.document_role(p_document_id) is not null;
$$;

create or replace function scormeditor.can_edit_document(p_document_id uuid)
returns boolean
language sql stable as $$
  select scormeditor.document_role(p_document_id) in ('owner', 'editor');
$$;

-- -----------------------------------------------------------------------------
-- 4. Triggers de mantenimiento
-- -----------------------------------------------------------------------------

-- Crea el perfil automáticamente al registrarse (magic link ya crea la fila
-- en auth.users antes de que exista ninguna sesión con la que insertar desde
-- el cliente). Nombre de función con prefijo `scormeditor_` a propósito: el
-- CRM puede tener su propio trigger sobre auth.users y los nombres de
-- trigger son únicos por tabla, no por esquema — sin el prefijo, si el CRM
-- ya usara literalmente "handle_new_user"/"on_auth_user_created", esta
-- migración fallaría al chocar.
create or replace function scormeditor.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into scormeditor.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists scormeditor_on_auth_user_created on auth.users;
create trigger scormeditor_on_auth_user_created
  after insert on auth.users
  for each row execute function scormeditor.handle_new_user();

-- Asigna version_no de forma atómica (bloquea la fila del documento para
-- serializar inserts concurrentes de dos dispositivos subiendo a la vez).
create or replace function scormeditor.next_version_no()
returns trigger
language plpgsql set search_path = '' as $$
begin
  perform 1 from scormeditor.documents where id = new.document_id for update;
  select coalesce(max(version_no), 0) + 1 into new.version_no
  from scormeditor.document_versions where document_id = new.document_id;
  return new;
end;
$$;

drop trigger if exists trg_next_version_no on scormeditor.document_versions;
create trigger trg_next_version_no
  before insert on scormeditor.document_versions
  for each row when (new.version_no is null)
  execute function scormeditor.next_version_no();

-- Cada versión nueva actualiza el documento (última modificación + peso),
-- igual que hoy actualizar un .scormproj en disco cambia su fecha y tamaño.
create or replace function scormeditor.touch_document_on_new_version()
returns trigger
language plpgsql set search_path = '' as $$
begin
  update scormeditor.documents
  set updated_at = new.created_at, size_bytes = new.size_bytes
  where id = new.document_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_document_on_new_version on scormeditor.document_versions;
create trigger trg_touch_document_on_new_version
  after insert on scormeditor.document_versions
  for each row execute function scormeditor.touch_document_on_new_version();

create or replace function scormeditor.touch_folder_updated_at()
returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_folder_updated_at on scormeditor.folders;
create trigger trg_touch_folder_updated_at
  before update on scormeditor.folders
  for each row execute function scormeditor.touch_folder_updated_at();

-- Concesión automática al crear una carpeta: quien la crea (si no es ya
-- owner, que no la necesita) se convierte en 'editor' de esa carpeta — si
-- no, la crearía y se quedaría sin poder volver a usarla.
create or replace function scormeditor.grant_creator_folder_access()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null and scormeditor.org_role(new.org_id) is distinct from 'owner' then
    insert into scormeditor.folder_access (folder_id, user_id, role, granted_by)
    values (new.id, new.created_by, 'editor', new.created_by)
    on conflict (folder_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists folders_grant_creator_access on scormeditor.folders;
create trigger folders_grant_creator_access
  after insert on scormeditor.folders
  for each row execute function scormeditor.grant_creator_folder_access();

-- -----------------------------------------------------------------------------
-- 5. RPCs
-- -----------------------------------------------------------------------------

-- Alta de organización: dos inserts con dependencia circular de RLS (la
-- política de `memberships` exige ya ser miembro para poder insertar en
-- `memberships`) — se resuelve con una única función SECURITY DEFINER que
-- hace ambos en la misma transacción. Restringido a `org_creators` (ver
-- tabla arriba): cualquier otra cuenta autenticada recibe un error explícito.
create or replace function scormeditor.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org_id uuid;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null or not exists (select 1 from scormeditor.org_creators where email = v_email) then
    raise exception 'No tienes permiso para crear organizaciones. Pide a quien administre SCORMEditor que te añada a la lista.';
  end if;

  insert into scormeditor.organizations (name, slug) values (p_name, p_slug)
  returning id into v_org_id;

  insert into scormeditor.memberships (user_id, org_id, role)
  values (auth.uid(), v_org_id, 'owner');

  return v_org_id;
end;
$$;

-- Bloqueos: adquirir / renovar / consultar / robar. SECURITY INVOKER en
-- acquire_document_lock (por defecto): las políticas RLS de document_locks
-- se aplican también dentro de la función, así que solo quien puede editar
-- llega a adquirir un bloqueo — no hace falta duplicar esa comprobación aquí.
-- Nunca roba un bloqueo todavía vivo de otra persona, solo renueva el tuyo o
-- toma uno ya caducado (por eso el `where` del `on conflict do update`).
create or replace function scormeditor.acquire_document_lock(
  p_document_id uuid,
  p_scope text,
  p_scope_ref text default '',
  p_ttl_seconds int default 25
)
returns boolean
language plpgsql set search_path = '' as $$
declare
  v_acquired boolean;
begin
  insert into scormeditor.document_locks (document_id, scope, scope_ref, holder_id, acquired_at, expires_at)
  values (
    p_document_id, p_scope, coalesce(p_scope_ref, ''), auth.uid(), now(),
    now() + make_interval(secs => p_ttl_seconds)
  )
  on conflict (document_id, scope, scope_ref) do update
    set holder_id = excluded.holder_id,
        acquired_at = excluded.acquired_at,
        expires_at = excluded.expires_at
    where scormeditor.document_locks.expires_at < now()
       or scormeditor.document_locks.holder_id = excluded.holder_id;

  select (holder_id = auth.uid() and expires_at > now()) into v_acquired
  from scormeditor.document_locks
  where document_id = p_document_id and scope = p_scope and scope_ref = coalesce(p_scope_ref, '');

  return coalesce(v_acquired, false);
end;
$$;

create or replace function scormeditor.release_document_lock(
  p_document_id uuid,
  p_scope text,
  p_scope_ref text default ''
)
returns void
language sql set search_path = '' as $$
  delete from scormeditor.document_locks
  where document_id = p_document_id
    and scope = p_scope
    and scope_ref = coalesce(p_scope_ref, '')
    and holder_id = auth.uid();
$$;

-- Resuelve el email de quien tiene un bloqueo activo (auth.users no es
-- consultable directamente desde el cliente — mismo motivo que list_members).
create or replace function scormeditor.get_document_lock(
  p_document_id uuid, p_scope text default 'structural', p_scope_ref text default ''
)
returns table (holder_id uuid, holder_email text, expires_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not scormeditor.can_view_document(p_document_id) then
    raise exception 'No tienes acceso a este documento.';
  end if;
  return query
    select l.holder_id, u.email::text, l.expires_at
    from scormeditor.document_locks l
    join auth.users u on u.id = l.holder_id
    where l.document_id = p_document_id
      and l.scope = p_scope
      and l.scope_ref = coalesce(p_scope_ref, '')
      and l.expires_at > now();
end;
$$;

-- «Tomar el control»: a diferencia de acquire_document_lock (que nunca roba
-- un bloqueo ajeno todavía vivo), esta SÍ lo fuerza — pensada para el botón
-- explícito de la banda de solo lectura del editor, nunca para el latido
-- silencioso. Quien lo tenía se entera solo (Realtime sobre document_locks).
-- Deliberadamente sin ceremonia (sin «solicitar turno», sin cola): para un
-- equipo pequeño y de confianza, cualquiera con permiso de edición puede
-- tomar el control cuando quiera. Es seguro porque las versiones son
-- inmutables — no hay forma de perder trabajo aunque se abuse del botón.
create or replace function scormeditor.force_take_document_lock(
  p_document_id uuid, p_scope text, p_scope_ref text default '', p_ttl_seconds int default 60
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not scormeditor.can_edit_document(p_document_id) then
    raise exception 'No tienes permiso de edición sobre este documento.';
  end if;

  insert into scormeditor.document_locks (document_id, scope, scope_ref, holder_id, acquired_at, expires_at)
  values (
    p_document_id, p_scope, coalesce(p_scope_ref, ''), auth.uid(), now(),
    now() + make_interval(secs => p_ttl_seconds)
  )
  on conflict (document_id, scope, scope_ref) do update
    set holder_id = excluded.holder_id,
        acquired_at = excluded.acquired_at,
        expires_at = excluded.expires_at;
end;
$$;

-- Gestión de equipo desde la app (panel «Miembros»). Sigue sin poder CREAR
-- cuentas de acceso (auth.users) desde el navegador — eso exige la
-- service_role key, que no tiene sitio seguro sin un backend propio; se hace
-- desde el dashboard de Supabase (Authentication → Users). Lo que SÍ se
-- puede hacer con seguridad desde la app es decidir quién de las cuentas YA
-- existentes entra a qué organización y con qué rol.
create or replace function scormeditor.list_members(p_org_id uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not scormeditor.is_org_member(p_org_id) then
    raise exception 'No perteneces a esta organización.';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from scormeditor.memberships m
    join auth.users u on u.id = m.user_id
    where m.org_id = p_org_id
    order by m.created_at;
end;
$$;

-- Añade (o cambia de rol) a alguien que YA tiene cuenta, por email. Si el
-- correo no existe todavía en auth.users, falla con un mensaje accionable en
-- vez de crear la cuenta al vuelo (eso sería la puerta de autorregistro que
-- se cerró en signInWithMagicLink con shouldCreateUser: false).
create or replace function scormeditor.invite_member(p_org_id uuid, p_email text, p_role text default 'editor')
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  if scormeditor.org_role(p_org_id) is distinct from 'owner' then
    raise exception 'Solo el owner de la organización puede añadir miembros.';
  end if;
  if p_role not in ('owner', 'editor', 'viewer') then
    raise exception 'Rol no válido: %', p_role;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception 'No existe ninguna cuenta con el correo %. Créala primero en Supabase (Authentication → Users → Add user) y vuelve a intentarlo.', p_email;
  end if;

  insert into scormeditor.memberships (user_id, org_id, role)
  values (v_user_id, p_org_id, p_role)
  on conflict (user_id, org_id) do update set role = excluded.role;
end;
$$;

-- Gestión de accesos por carpeta (mismo patrón que list_members/
-- invite_member, pero por carpeta en vez de por organización) — exclusivas
-- del owner de la organización.
create or replace function scormeditor.list_folder_access(p_folder_id uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  if scormeditor.org_role(scormeditor.folder_org(p_folder_id)) is distinct from 'owner' then
    raise exception 'Solo el propietario de la organización puede ver los accesos de esta carpeta.';
  end if;
  return query
    select fa.user_id, u.email::text, fa.role, fa.created_at
    from scormeditor.folder_access fa
    join auth.users u on u.id = fa.user_id
    where fa.folder_id = p_folder_id
    order by fa.created_at;
end;
$$;

create or replace function scormeditor.grant_folder_access(p_folder_id uuid, p_email text, p_role text default 'editor')
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org_id uuid;
  v_user_id uuid;
begin
  select org_id into v_org_id from scormeditor.folders where id = p_folder_id;
  if v_org_id is null then
    raise exception 'La carpeta no existe.';
  end if;
  if scormeditor.org_role(v_org_id) is distinct from 'owner' then
    raise exception 'Solo el propietario de la organización puede conceder acceso a esta carpeta.';
  end if;
  if p_role not in ('editor', 'viewer') then
    raise exception 'Rol no válido: %', p_role;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception 'No existe ninguna cuenta con el correo %.', p_email;
  end if;
  if not exists (select 1 from scormeditor.memberships where user_id = v_user_id and org_id = v_org_id) then
    raise exception 'Esa persona no pertenece todavía a la organización. Añádela primero desde «Gestionar equipo».';
  end if;

  insert into scormeditor.folder_access (folder_id, user_id, role, granted_by)
  values (p_folder_id, v_user_id, p_role, auth.uid())
  on conflict (folder_id, user_id) do update
    set role = excluded.role, granted_by = excluded.granted_by, created_at = now();
end;
$$;

create or replace function scormeditor.revoke_folder_access(p_folder_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if scormeditor.org_role(scormeditor.folder_org(p_folder_id)) is distinct from 'owner' then
    raise exception 'Solo el propietario de la organización puede quitar accesos de esta carpeta.';
  end if;
  delete from scormeditor.folder_access where folder_id = p_folder_id and user_id = p_user_id;
end;
$$;

-- =============================================================================
-- 6. Row Level Security
--
-- Regla de fondo: nada de acceso anónimo (todo exige auth.uid()). Dentro de
-- una organización: `owner` administra todo (miembros, borrado en firme,
-- concesiones por carpeta) y ve/edita TODO siempre, sin excepción. Un
-- `editor`/`viewer` de organización NO ve automáticamente las carpetas/
-- documentos — solo los de las carpetas donde tenga una concesión explícita
-- en `folder_access` (ver sección 2 y las funciones `folder_role`/
-- `document_role` de la sección 3). Todo esto vive en el esquema
-- `scormeditor`: no se toca ningún privilegio del esquema `public` (CRM).
-- =============================================================================

alter table scormeditor.organizations     enable row level security;
alter table scormeditor.profiles          enable row level security;
alter table scormeditor.memberships       enable row level security;
alter table scormeditor.folders           enable row level security;
alter table scormeditor.documents         enable row level security;
alter table scormeditor.document_versions enable row level security;
alter table scormeditor.document_locks    enable row level security;
alter table scormeditor.folder_access     enable row level security;

-- Ni siquiera USAGE en el esquema para anon: sin sesión, no hay ni
-- visibilidad de que este esquema existe.
grant usage on schema scormeditor to authenticated;
grant usage on schema scormeditor to service_role;

grant select, insert, update, delete on
  scormeditor.organizations, scormeditor.profiles, scormeditor.memberships, scormeditor.folders,
  scormeditor.documents, scormeditor.document_versions, scormeditor.document_locks,
  scormeditor.folder_access
  to authenticated;

grant execute on function
  scormeditor.create_organization(text, text),
  scormeditor.acquire_document_lock(uuid, text, text, int),
  scormeditor.release_document_lock(uuid, text, text),
  scormeditor.get_document_lock(uuid, text, text),
  scormeditor.force_take_document_lock(uuid, text, text, int),
  scormeditor.list_members(uuid),
  scormeditor.invite_member(uuid, text, text),
  scormeditor.list_folder_access(uuid),
  scormeditor.grant_folder_access(uuid, text, text),
  scormeditor.revoke_folder_access(uuid, uuid),
  scormeditor.document_role(uuid)
  to authenticated;

grant all on all tables in schema scormeditor to service_role;
grant all on all functions in schema scormeditor to service_role;

-- organizations ---------------------------------------------------------------
create policy "miembros ven su organización"
  on scormeditor.organizations for select
  using (scormeditor.is_org_member(id));
-- Sin política de INSERT: el alta pasa siempre por create_organization().
create policy "el owner administra la organización"
  on scormeditor.organizations for update
  using (scormeditor.org_role(id) = 'owner');
create policy "el owner borra la organización"
  on scormeditor.organizations for delete
  using (scormeditor.org_role(id) = 'owner');

-- profiles ----------------------------------------------------------------------
-- Nombre/avatar no son sensibles y hacen falta para presencia entre
-- organizaciones distintas de un mismo usuario; visibles a cualquier
-- autenticado, editables solo por su dueño.
create policy "perfiles visibles para cualquier autenticado"
  on scormeditor.profiles for select
  using (true);
create policy "cada cual edita su propio perfil"
  on scormeditor.profiles for update
  using (id = auth.uid());

-- memberships ---------------------------------------------------------------
create policy "miembros ven el resto de la organización"
  on scormeditor.memberships for select
  using (scormeditor.is_org_member(org_id));
create policy "el owner invita miembros"
  on scormeditor.memberships for insert
  with check (scormeditor.org_role(org_id) = 'owner');
create policy "el owner cambia roles"
  on scormeditor.memberships for update
  using (scormeditor.org_role(org_id) = 'owner');
create policy "el owner expulsa, cualquiera se va"
  on scormeditor.memberships for delete
  using (scormeditor.org_role(org_id) = 'owner' or user_id = auth.uid());

-- folders -----------------------------------------------------------------------
-- Crear carpetas es un permiso de ORGANIZACIÓN (editor+): no hay carpeta
-- todavía sobre la que comprobar una concesión de folder_access.
create policy "acceso concedido ve la carpeta"
  on scormeditor.folders for select
  using (scormeditor.folder_role_direct(id, org_id, created_by) is not null);
create policy "editor+ crea carpetas"
  on scormeditor.folders for insert
  with check (scormeditor.org_role(org_id) in ('owner', 'editor'));
create policy "acceso de edición renombra/mueve la carpeta"
  on scormeditor.folders for update
  using (scormeditor.folder_role_direct(id, org_id, created_by) in ('owner', 'editor'));
create policy "acceso de edición borra la carpeta"
  on scormeditor.folders for delete
  using (scormeditor.folder_role_direct(id, org_id, created_by) in ('owner', 'editor'));

-- documents ---------------------------------------------------------------------
-- Papelera (deleted_at) solo visible a quien puede editar, para no
-- confundir "borrado" con "no aparece en mi lista".
create policy "acceso concedido ve el documento, papelera solo con edición"
  on scormeditor.documents for select
  using (
    (deleted_at is null and scormeditor.document_role_direct(folder_id, org_id) is not null)
    or (deleted_at is not null and scormeditor.document_role_direct(folder_id, org_id) in ('owner', 'editor'))
  );
create policy "acceso de edición crea documentos en su carpeta"
  on scormeditor.documents for insert
  with check (
    (folder_id is not null and scormeditor.can_edit_folder(folder_id))
    or scormeditor.org_role(org_id) = 'owner'
  );
create policy "acceso de edición edita el documento"
  on scormeditor.documents for update
  using (scormeditor.can_edit_document(id))
  with check (
    (folder_id is not null and scormeditor.can_edit_folder(folder_id))
    or scormeditor.org_role(org_id) = 'owner'
  );
create policy "el owner purga documentos en firme"
  on scormeditor.documents for delete
  using (scormeditor.org_role(org_id) = 'owner');

-- document_versions -----------------------------------------------------------
-- Inmutables: sin política de UPDATE (nadie reescribe una versión ya subida).
create policy "acceso concedido ve las versiones"
  on scormeditor.document_versions for select
  using (scormeditor.can_view_document(document_id));
create policy "acceso de edición sube versiones nuevas"
  on scormeditor.document_versions for insert
  with check (scormeditor.can_edit_document(document_id));
create policy "el owner purga versiones antiguas"
  on scormeditor.document_versions for delete
  using (scormeditor.org_role(scormeditor.document_org(document_id)) = 'owner');

-- document_locks ----------------------------------------------------------------
create policy "acceso concedido ve quién tiene el bloqueo"
  on scormeditor.document_locks for select
  using (scormeditor.can_view_document(document_id));
create policy "acceso de edición adquiere bloqueos a su propio nombre"
  on scormeditor.document_locks for insert
  with check (scormeditor.can_edit_document(document_id) and holder_id = auth.uid());
-- USING se evalúa contra la fila EXISTENTE: además de renovar lo propio, debe
-- permitir tomar un bloqueo ajeno ya caducado (si no, INSERT ... ON CONFLICT
-- DO UPDATE nunca podría robar un lock expirado de otro usuario).
create policy "acceso de edición renueva su bloqueo o toma uno caducado"
  on scormeditor.document_locks for update
  using (
    scormeditor.can_edit_document(document_id)
    and (holder_id = auth.uid() or expires_at < now())
  )
  with check (holder_id = auth.uid());
create policy "el titular libera su bloqueo"
  on scormeditor.document_locks for delete
  using (holder_id = auth.uid());

-- folder_access -----------------------------------------------------------------
-- El owner de la organización gestiona todas las concesiones de sus
-- carpetas; cualquiera puede ver las suyas propias (para que el cliente
-- sepa qué carpetas puede editar sin depender de una llamada aparte de
-- administrador).
create policy "el owner gestiona las concesiones de su organización"
  on scormeditor.folder_access for all
  using (scormeditor.org_role(scormeditor.folder_org(folder_id)) = 'owner')
  with check (scormeditor.org_role(scormeditor.folder_org(folder_id)) = 'owner');
create policy "cada uno ve sus propias concesiones"
  on scormeditor.folder_access for select
  using (user_id = auth.uid());

-- lectores globales ---------------------------------------------------------------
-- Solo SELECT (las políticas permisivas se suman con OR: esto no quita ni
-- da escritura a nadie). Ver `global_readers` en la sección 1.
create policy "lector global ve las organizaciones"
  on scormeditor.organizations for select using (scormeditor.is_global_reader());
create policy "lector global ve las membresías"
  on scormeditor.memberships for select using (scormeditor.is_global_reader());
create policy "lector global ve las carpetas"
  on scormeditor.folders for select using (scormeditor.is_global_reader());
create policy "lector global ve los documentos"
  on scormeditor.documents for select using (scormeditor.is_global_reader());
create policy "lector global ve las versiones"
  on scormeditor.document_versions for select using (scormeditor.is_global_reader());

-- =============================================================================
-- 7. Storage: bucket 'scormeditor-projects' + políticas
--
-- Nombre de bucket específico (no "scormproj" a secas) para que se
-- distinga a simple vista de los buckets del CRM en el mismo panel de
-- Storage. Convención de ruta: {org_id}/{document_id}/{id-de-la-versión}.zip
-- — storage.foldername(name) devuelve la ruta partida en segmentos: [1] es
-- el org_id, [2] el document_id. storage.objects/storage.buckets son
-- globales al proyecto (no se pueden mover a `scormeditor`), pero las
-- políticas de aquí solo entran en juego cuando bucket_id = esta bucket,
-- así que no afectan a los buckets del CRM.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('scormeditor-projects', 'scormeditor-projects', false)
on conflict (id) do nothing;

create policy "scormeditor: acceso concedido descarga el ZIP"
  on storage.objects for select
  using (
    bucket_id = 'scormeditor-projects'
    and scormeditor.can_view_document(((storage.foldername(name))[2])::uuid)
  );

create policy "scormeditor: acceso de edición sube el ZIP"
  on storage.objects for insert
  with check (
    bucket_id = 'scormeditor-projects'
    and scormeditor.can_edit_document(((storage.foldername(name))[2])::uuid)
  );

create policy "scormeditor: lector global descarga el ZIP"
  on storage.objects for select
  using (bucket_id = 'scormeditor-projects' and scormeditor.is_global_reader());

-- Purgar en firme sigue siendo exclusivo del owner de la organización (no
-- es un permiso de carpeta) — sigue mirando el org_id del primer segmento.
create policy "scormeditor: el owner borra ZIP de su organización"
  on storage.objects for delete
  using (
    bucket_id = 'scormeditor-projects'
    and scormeditor.org_role(((storage.foldername(name))[1])::uuid) = 'owner'
  );

-- =============================================================================
-- 8. Realtime
--
-- Postgres Changes sobre document_versions/document_locks, para avisar casi
-- al instante de una versión nueva o un cambio de bloqueo (ver
-- src/cloud/watch.ts). REPLICA IDENTITY FULL en ambas: son tablas de bajo
-- volumen (versiones inmutables, un bloqueo por documento), así que el coste
-- extra en el WAL es insignificante. El cliente NO usa el `filter` de
-- Realtime (`document_id=eq.<uuid>`) — en este proyecto Realtime lo
-- rechazaba con «invalid column for filter» incluso con replica identity
-- completa; se filtra en el propio cliente comparando el `document_id` del
-- payload, sin depender de esa característica.
-- =============================================================================

alter publication supabase_realtime add table scormeditor.document_versions;
alter publication supabase_realtime add table scormeditor.document_locks;

alter table scormeditor.document_versions replica identity full;
alter table scormeditor.document_locks replica identity full;
