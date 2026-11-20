# Nube y sincronización (`src/cloud/`)

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`.

## Invariante de aislamiento: sin nube configurada, cero diferencia
`isCloudConfigured()` (`src/cloud/client.ts`) mira solo si `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` existen en build-time. `@supabase/supabase-js` se carga con
`import()` dinámico (mismo patrón que `src/interop/elpx/`): sin credenciales, ni el
paquete ni una sola llamada de red entran en juego — el editor es exactamente el mismo
100% local descrito en `persistencia-scormproj.md`. Un documento vive **siempre** en uno
de los dos mundos, nunca los dos (`courseStore.cloudDocumentId` no-nulo = nube;
`linkedFileName` no-nulo = local): `setCloudLink(null, null, null)` y `setLinked(handle)`
se desvincula mutuamente entre ellos.

Un documento-nube es **el mismo ZIP** que un `.scormproj` (`buildProjectBlob`/
`loadProjectFromBlob` de `autosave.ts`, reutilizados tal cual) — solo cambia dónde vive.
Nada del formato de `course.json` sabe que existe la nube.

## Modelo de datos (Supabase, esquema `scormeditor`)
Proyecto Supabase **compartido** con el CRM de academyhub: todo SCORMEditor vive en el
esquema `scormeditor`, nunca en `public` (ese es del CRM). Esquema completo en
**`supabase/schema.sql`** — un único fichero autosuficiente con el estado actual
(tablas, funciones, triggers, RLS, Storage, Realtime), pensado para pegarlo entero en el
SQL Editor de un proyecto Supabase nuevo y recrearlo todo de una vez. No es un historial
de migraciones: para cambios de esquema, se edita ese mismo fichero (no se crean
ficheros de migración fechados sueltos) y se pega en el SQL Editor lo que corresponda —
este repo no tiene el CLI de Supabase enlazado ni ningún pipeline que lo despliegue solo,
así que un cambio en `schema.sql` no surte efecto hasta que se ejecuta a mano ahí.

- `organizations` / `memberships` (`role`: `owner`/`editor`/`viewer`) / `folders` /
  `documents` / `document_versions` / `document_locks`.
- **Versiones inmutables**: cada subida (`uploadVersion`) es un ZIP completo nuevo en
  Storage (bucket `scormeditor-projects`) + una fila en `document_versions`; nunca se
  sobrescribe ni se genera un diff. Se conservan todas — el único borrado es manual y
  en firme (`purgeDocument`, papelera aparte con `documents.deleted_at`). Esta
  inmutabilidad es la razón de que el bloqueo de edición pueda permitirse ser informal
  (ver más abajo): aunque dos personas suban «a la vez», nunca se pierde ningún
  contenido, solo quedan dos versiones en el historial.
- **Auth**: enlace mágico (`signInWithMagicLink`, `shouldCreateUser: false`) — la
  restricción real de acceso es esa (`false`): sin ella, Supabase Auth crearía la cuenta
  al vuelo. Las cuentas se dan de alta a mano desde el dashboard (Authentication → Users
  → «Invite user»), nunca desde el editor.
- **Crear organizaciones**: restringido a una lista aparte,
  `scormeditor.org_creators` (migración `20260723000001`), sin RLS que la exponga al
  cliente — se gestiona solo desde el SQL Editor (`insert`/`delete` a mano). Cualquier
  otra cuenta autenticada que llame a `create_organization()` recibe un error explícito.
- **Roles, dos niveles** (ver «Permisos por carpeta» más abajo para el detalle): el
  `OrgRole` (`owner`/`editor`/`viewer`, `src/cloud/types.ts`) rige lo que es de la
  organización entera (invitar miembros, crear carpetas, papelera); qué carpetas/
  documentos concretos puede ver o editar cada `editor`/`viewer` lo decide
  `folder_access`, una concesión aparte que el `owner` gestiona por carpeta. El `owner`
  sigue viendo/editando todo, siempre. Aplicado por RLS en cada tabla — el cliente
  (`canEdit`/`canEditFolder` en `CloudModal.tsx`, `cloudMyRole` en el store) solo oculta
  acciones que fallarían igualmente en el servidor, nunca es la barrera real.

## Guardado: un único orquestador, dos disparadores
`saveCurrentProject()` (`src/cloud/sync.ts`) es el **único** camino para subir a la
nube — lo llaman por igual Ctrl+S, el indicador `.ed-docstate` de la Toolbar, el menú
Archivo y el auto-sync. Mirar `cloudDocumentId`/`cloudOrgId` le basta para saber qué
sistema manda; si el documento está `cloudStale` (ver debajo) no sube a ciegas, abre
☁ Nube para decidir con conocimiento de causa.

- **Manual**: el de siempre — Ctrl+S o clic en la pastilla.
- **Automático con debounce de inactividad** (`src/cloud/watch.ts`,
  `AUTOSYNC_DEBOUNCE_MS = 2 min`): cada cambio en `course`/`assets` reinicia un
  temporizador; al expirar sin más cambios, sube sola. Deliberadamente por
  **inactividad**, no por intervalo fijo mientras editas sin parar: cada subida es un
  ZIP completo a Storage (no un diff), así que auto-subir en cada pulsación multiplicaría
  el consumo de Storage y llenaría el historial de versiones de ruido en vez de
  checkpoints con sentido. Se salta la subida si mientras tanto quedó `cloudStale` o se
  desvinculó el documento.
- El indicador «Subiendo…» de la Toolbar usa un flag **global** (`courseStore.cloudSyncing`,
  no local al componente) precisamente para que se refleje igual si lo dispara el propio
  auto-sync en segundo plano.

## Detectar que hay una versión más reciente (`cloudStale`)
`courseStore.cloudVersionId` guarda el id de `document_versions` que corresponde al
contenido cargado. `cloudStale` es `true` cuando la última versión en la nube no
coincide con ese id (subida por cualquiera, incluido tú mismo desde otra pestaña).
Aviso una sola vez por transición (`staleNotified`, evita repetir el modal en cada
comprobación) con un `confirmDialog` que manda a ☁ Nube → «Descargar la última versión»
(`onPullLatest`, `CloudModal.tsx`) — el único sitio, junto con la subida inicial
(`onUploadNew`) y `saveCurrentProject`, que debe llamar a `setCloudVersion(id)`. **Bug ya
sufrido**: olvidar esa llamada deja `cloudVersionId` en `null` para siempre → falso
«hay una versión más reciente» en cada recarga, sin converger nunca.

Doble vía de detección, no solo Realtime: Realtime sobre `document_versions` (evento
`INSERT`) es la vía rápida, pero el latido del bloqueo (cada 25s, ver debajo) también
repite la comprobación como respaldo por sondeo — si Realtime fallara en silencio (canal
caído, RLS que no deja pasar el evento…), cualquier cliente converge solo en ≤25s en vez
de quedarse esperando un aviso que nunca llega. Si el canal de Realtime falla de verdad
(`CHANNEL_ERROR`/`TIMED_OUT`), queda un `console.error` para poder diagnosticarlo.

## Bloqueo de edición (`document_locks`, scope `'structural'`)
Un único bloqueo por documento (no hay edición granular por pantalla todavía) con dos
capas:

1. **Blando, de servidor** (`acquireDocumentLock`/`releaseDocumentLock`/
   `getDocumentLock` en `src/cloud/locks.ts`): un latido cada 25s
   (`HEARTBEAT_MS`) con un TTL de 120s (`LOCK_TTL_SECONDS`; holgado para que un latido
   perdido no entregue el control). Una pestaña **oculta** (minimizada, tapada, otra
   delante) sigue renovando hasta `HIDDEN_GRACE_MS` (10 min); pasado ese margen se
   considera abandonada y se deja caducar sola — no hace falta liberarlo a
   mano para que se cure. `acquire_document_lock` (RPC, SECURITY INVOKER a propósito: su
   INSERT pasa por las políticas RLS de `document_locks` sin duplicarlas aquí) **nunca**
   roba un bloqueo todavía vivo de otra persona, solo renueva el tuyo o toma uno ya
   caducado. El latido solo intenta adquirir si `cloudMyRole` es `owner`/`editor` — un
   `viewer` nunca podría (RLS lo rechazaría igual), así que ni se llama: evita ensuciar
   los logs de Postgres cada 25s con un rechazo esperado.
2. **Estricto, de cliente** (`App.tsx` + `cloudLockHolderEmail` en el store): mientras
   `document_locks` diga que lo tiene otro, el árbol y el editor de pantallas quedan en
   solo lectura (cristal `position:absolute` sobre `.ed-main`, sin tocar su grid; Deshacer/
   Rehacer también bloqueados, botón y atajo). Vista estudiante/Validación/Informe se
   pueden seguir consultando con normalidad — leer no es editar. Quien puede editar ESTE
   documento (`cloudMyRole` en el store — rol EFECTIVO sobre el documento abierto, no el
   rol de organización; lo calcula `document_role()`, ver «Permisos por carpeta») puede
   **«Tomar el control»** (`forceTakeDocumentLock`, RPC `force_take_document_lock`,
   migración `20260723000003`) — esta sí roba un bloqueo vivo. El botón no se ofrece a
   quien no puede editar (`cloudMyRole`), aunque la barrera real es el RPC.

Deliberadamente **sin ceremonia de servidor** (sin «solicitar turno», sin cola): para un
equipo pequeño y de confianza, cualquiera con permiso de edición puede tomar el control
cuando quiera, con un aviso previo (`confirmDialog`) antes de actuar. Es seguro porque las
versiones son inmutables — no hay forma de perder trabajo aunque se abuse del botón.

Al desposeído se le avisa con un modal («Has perdido el control…») en el instante en que
se detecta la transición «lo tenía yo → ahora lo tiene otro» (`lockBaselineSet` distingue
esa transición real de la primera comprobación al abrir un documento ya bloqueado, que no
debe disparar el aviso) — mismo canal de Realtime que ya escuchaba `document_locks`, sin
mecanismo aparte de notificación. Se le quita el foco a cualquier campo activo para que la
solo-lectura no deje un input a medio escribir. Quien toma el control ve su propio cambio
al instante por actualización **optimista** del store (no espera a Realtime/latido).

Si el otro cierra la pestaña o deja de renovar (TTL 120s), el control vuelve solo al
siguiente latido — no hace falta pulsar nada.

## Permisos por carpeta (`folder_access`)
Pensado para un centro con varios profesores: cada uno debe ver/editar SOLO sus propios
cursos, no los de los demás — el `OrgRole` a secas no distingue eso (un `editor` de la
organización veía/editaba todo). `folder_access (folder_id, user_id, role: 'editor'|
'viewer')` añade ese segundo nivel, deny-by-default: una carpeta nueva no la ve nadie más
que el `owner` hasta que este concede acceso explícito.

- **Se combina así**: `owner` de la organización → ve/edita TODO siempre (es quien
  concede/revoca, tiene que poder llegar a todas partes). `editor`/`viewer` de
  organización → sin concesión en `folder_access`, no ve la carpeta en absoluto; con
  concesión, su rol EFECTIVO en esa carpeta es el de la concesión, **no** el de la
  organización — de ahí que un `viewer` de organización pueda ser `editor` en una carpeta
  concreta (el caso real que motivó esto), y viceversa.
- **Documento sin carpeta** (`folder_id is null`): exclusivo del `owner`. Un `editor`/
  `viewer` de organización ya no puede crear ni ver documentos sin carpeta — en la
  práctica, todo proyecto de un profesor vive dentro de una carpeta suya.
- **Concesión automática al crear una carpeta**: un trigger (`grant_creator_folder_access`)
  concede 'editor' a quien la crea (si no es ya `owner`, que no lo necesita) — si no, la
  crearía y se quedaría sin poder volver a usarla.
- **Varias personas, misma carpeta**: no es "un dueño por carpeta", es muchos-a-muchos
  (co-tutoría) — varios `editor` y/o `viewer` a la vez sobre la misma carpeta.
- **Funciones de resolución** (`folder_role`, `document_role`, y los booleanos
  `can_view_folder`/`can_edit_folder`/`can_view_document`/`can_edit_document`): mismo
  patrón SECURITY DEFINER que `org_role`/`is_org_member`/`document_org` de la migración
  inicial. Sustituyen el `org_role(org_id) in (...)` de casi todas las políticas RLS de
  `folders`/`documents`/`document_versions`/`document_locks` y las 2 políticas de Storage
  que miran el documento (la de purgar en firme sigue siendo solo `owner`, y sigue
  mirando el `org_id` del primer segmento de la ruta — purgar no es un permiso de
  carpeta). **Crear** una carpeta nueva NO cambia: sigue siendo un permiso de
  organización (`editor`+), porque no hay carpeta todavía sobre la que comprobar nada.
- **RPCs de gestión** (`list_folder_access`/`grant_folder_access`/`revoke_folder_access`,
  mismo patrón que `list_members`/`invite_member`): exclusivas del `owner` de la
  organización — conceder solo a alguien YA miembro (por email). Cliente:
  `src/cloud/folders.ts` + ventana `FolderAccessModal.tsx` (botón «Gestionar acceso»,
  icono de personas, en cada carpeta del explorador — visible solo si `isOwner`).
- **Cliente**: `myFolderRoles` (`CloudModal.tsx`, desde `listMyFolderRoles()`) son tus
  concesiones explícitas; `canEditFolder(folderId)` = `isOwner || myFolderRoles[folderId]
  === 'editor'`. Rige renombrar/borrar/mover carpetas y documentos, y qué carpetas
  ofrece el selector al subir un proyecto nuevo (`editableFolders`; sin carpetas
  editables y sin ser owner, se muestra un aviso pidiendo acceso en vez del formulario).
  Para el documento que tienes abierto AHORA MISMO no se usa esto, sino `cloudMyRole`
  del store (rol efectivo por-documento que mantiene `src/cloud/watch.ts` vía
  `document_role()`, ver más arriba) — es quien gobierna «Actualizar en la nube» y
  «Tomar el control» sobre ese documento en concreto.

**Migración de datos existentes**: los documentos/carpetas creados ANTES de esta
migración no tienen ninguna fila en `folder_access` (no existía la tabla) y su
`created_by` está a `null` (nunca se rellenaba) — tras aplicarla, solo el `owner` los ve
hasta conceder acceso a mano, carpeta por carpeta. No hay forma de inferir
automáticamente «esta carpeta es de fulano»: no quedaba rastro de quién subió qué en el
esquema anterior.

## Esquema en un único fichero (`supabase/schema.sql`)
Ya no hay una carpeta `supabase/migrations/` con un fichero por cambio: se consolidó en
un único `supabase/schema.sql` que refleja el estado **actual** (sin parches ni
historial — eso ya lo cuenta `git log`). Para cambiar el esquema, se edita ese fichero
directamente y se pega en el SQL Editor lo que corresponda; no se crean más ficheros de
migración fechados. El propio fichero explica en su cabecera cómo aplicarlo de cero en
un proyecto Supabase nuevo (pegar entero) y documenta inline el porqué de las variantes
«`_direct`» de `folder_role`/`document_role` (un bug real de RLS + `RETURNING` sobre la
propia tabla, ya corregido — ver los comentarios de la sección 3 del fichero).

## Consulta desde la terminal (`scripts/nube/nube.mjs`) y lectores globales
Herramienta de **solo lectura** para consultar la nube sin abrir el editor: listar
documentos y versiones, descargar una versión y comparar dos versiones (o una versión de la
nube con un `.scormproj` local) pantalla a pantalla, emparejando por contenido los
elementos de las listas para no confundir una inserción con muchos cambios. Sirve para ver
qué se ha cambiado a mano en la nube sobre un proyecto generado fuera.

Entra con una cuenta propia por **email + contraseña** (`NUBE_EMAIL`/`NUBE_PASSWORD` en
`.env`, sin prefijo `VITE_`), porque el enlace mágico no sirve para un proceso sin buzón.
Esa cuenta no es miembro de ninguna organización: está en `scormeditor.global_readers`, una
tabla interna que, como `org_creators`, solo se gestiona desde el SQL Editor y no aparece
en la app. Sus políticas son **solo de SELECT** (organizaciones, membresías, carpetas,
documentos, versiones y ZIP del bucket). Como las políticas permisivas se suman con OR, no
cambian lo que puede hacer ninguna otra cuenta. Se eligió así, y no la clave
`service_role`, porque esa clave abre todo el proyecto compartido con el CRM y además
permite escribir. Las descargas van a `.nube/`, que git ignora porque los cursos son
privados.
