# Árbol y edición de pantallas (`CourseTree`, `ScreenEditor`, `FinalTestEditor`)

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`. Lo transversal del editor
> (⚙ Ajustes, iconos, sync, historial…) está en `editor-ui.md`; el editor de texto
> enriquecido en `editor-richtext.md`.

## El árbol (`CourseTree.tsx`)
Introducción del paquete SCORM → módulos (pantallas propias → unidades, con bloques de
pantallas sueltas intercalables entre ellas → más pantallas al final del módulo) →
cierre del paquete SCORM → secciones «Evaluación» (test final) y «Materiales»
(glosario/bibliografía). Añadir pantalla por unidad, suelta entre unidades, por módulo,
al final de un módulo, suelta antes de todo (introducción) o suelta después de todo
(cierre del SCORM) — cada botón «Añadir pantalla…» deja siempre claro el nivel
(SCORM/módulo/unidad) en su texto y en el título del propio selector de recetas
(`AddScreenModal`, «Nueva pantalla · {nivel}»); duplicar/eliminar por pantalla (eliminar
pide confirmación con `confirmDialog`, nombrando la pantalla).

**Zonas por nivel, con color propio**: SCORM (azul, `--c-level-scorm`), módulo (verde,
`--c-level-module`) y unidad (ámbar, `--c-level-unit`) — variables en `editor.css`. Cada
caja del árbol (`.ed-module` para SCORM/Evaluación/Materiales, `details.ed-tree-module`
para un módulo real, `details.ed-tree-unit` para una unidad) lleva el borde y el fondo
tintados con el acento de su nivel, y los botones «Añadir pantalla…»/«Añadir
módulo»/«Añadir unidad» (`ed-add-course`/`ed-add-module`/`ed-add-unit`) se colorean
igual — así se distingue de un vistazo a qué zona pertenece algo sin leer el texto.

Dos niveles con el mismo patrón «propias + cierre» (curso y módulo) — pantallas sueltas
que no pertenecen al contenido real de ningún contenedor, solo sirven para presentar o
cerrar el suyo:

- **Introducción y cierre del paquete SCORM** (`course.intro_screens`/
  `closing_screens`): dos bloques fijos `.ed-intro-block` — introducción al principio
  del árbol (antes del primer módulo) y cierre al final (después del último módulo,
  antes de «Evaluación»/«Materiales») — con pantallas sueltas que no pertenecen a
  ningún módulo ni unidad (portada del curso, bienvenida… / despedida, «gracias por
  completar el curso»… lo que el profesor quiera poner antes o después de todo el
  contenido). Sin renombrado ni controles de mover/eliminar el propio bloque
  (contenedores únicos, siempre en su extremo; las pantallas de dentro sí se
  reordenan/eliminan como cualquier otra). Ids reservados `INTRO_CONTAINER_ID`/
  `OUTRO_CONTAINER_ID` (`src/schema/traverse.ts`) para `addScreen`/`moveScreen`/
  `AddScreenModal` — nunca coinciden con un id real de módulo/unidad. Aparecen también
  en el menú lateral del alumno, sueltas (`buildMenu()` en app.js, bloques
  `.me-menu-intro`/«CIERRE» sin rótulo de módulo — ver `carcasa-navegacion.md`); para
  todo lo demás (progreso, finalización, validación) cuentan como cualquier pantalla.
  El cierre del SCORM va lo último de todo en la navegación del alumno (`flatten()` en
  app.js): después incluso del test final y de la pantalla de Resultados, si los hay.
- **Pantallas propias del módulo y más pantallas al final** (`module.screens`/
  `closing_screens`, portada/presentación al principio, más contenido DESPUÉS de todas
  sus unidades): en el árbol, `screens` se lista bajo el título del módulo
  (`.ed-module-screens`, mismo `ScreenItem` con puntos de inserción) con su botón
  «Añadir pantalla al módulo…»; `closing_screens` se lista tras las unidades, con el
  botón siempre a mano «Añadir pantalla al final del módulo…» — sin ningún divisor ni
  rótulo de «cierre» aparte: ya no hace falta distinguirlo como una zona propia ahora
  que lo suelto «entre unidades» tiene su propio mecanismo (`unit.loose`, abajo); sigue
  siendo el mismo contenedor de siempre por debajo (mismo `AddScreenModal`; las recetas
  evalúan `uniquePerUnit` y `defaultTitle` contra el módulo en ambos casos). Id de
  contenedor derivado `moduleClosingContainerId(moduleId)` (formato `"{id}:closing"` —
  nunca choca con un id real, que nunca lleva `:`).
- **Pantallas sueltas entre unidades** (`unit.loose`): un elemento de `m.units[]` cuyo
  flag `loose` vale `true` NO es una unidad real — sin título, sin resumen, sin
  `<details>` plegable, sin miga de pan de unidad ni exigencia de resumen/actividad;
  vive en `units[]` (mismo array, misma posición) solo por reutilizar toda la
  infraestructura de orden/movimiento/id, no por representar contenido. Se ve en el
  árbol como un bloque desnudo entre el `<details>` de la unidad anterior y el de la
  siguiente: sus pantallas, botón «Añadir pantalla…» y punto de inserción, sin cabecera
  ni controles propios — para quitarlo basta con borrar sus pantallas (la última se
  lleva el bloque, ver `pruneIfEmptyLoose` más abajo). Se crea desde `UnitInsertPoint`,
  un divisor «+» (sin texto, mismo lenguaje visual que `InsertPoint`) que aparece ANTES
  de la primera unidad y DESPUÉS de cada una (incluida la última) de cada módulo:
  al pulsarlo, `courseStore.addLooseUnit(moduleId, atIndex)` inserta el bloque vacío y
  se abre `AddScreenModal` sobre él; si se cierra sin añadir nada, el bloque —todavía
  vacío— se retira. Mientras se arrastra una pantalla, ese mismo divisor se sustituye
  por una zona de drop amplia (`useDroppable`, mismo patrón de montaje que
  `EmptyDropZone`: aparece con su tamaño real ya puesto en vez de crecer un elemento
  existente) — soltar ahí crea el bloque y mueve la pantalla arrastrada dentro
  (`onDragEnd`, rama `data.unitInsert`), así se puede sacar una pantalla «entre
  unidades» aunque todavía no exista ningún bloque suelto en ese módulo. Sus pantallas
  se tratan exactamente como las propias del módulo para cualquier propósito transversal
  (miga de pan, nivel de portada, agrupación de menú): en `screenContainers()`
  (`traverse.ts`) se reportan con `unit: null`, igual que `module.screens`.
- **Ocultar el título de una unidad en el menú del alumno** (`unit.hide_menu_title`): a
  diferencia de `unit.loose`, esta SÍ es una unidad real en todo lo demás — título,
  resumen, exigencia de actividad, validación, árbol del editor, todo igual. Solo cambia
  qué pinta `buildMenu()` en la carcasa (ver `carcasa-navegacion.md`): con el flag a
  `true` desaparecen el rótulo de la unidad y su mini-barra de progreso del menú lateral,
  pero sus pantallas se siguen listando ahí, sueltas en el mismo `.me-menu-unit` sin
  tarjeta propia que usan también `unit.loose`/`module.screens` (ver
  `carcasa-navegacion.md`) — la miga de pan de cada pantalla sigue nombrando la unidad,
  solo el menú deja de hacerlo. Se activa con
  el botón ojo/ojo-tachado a la derecha del lápiz de `InlineRename`
  (`.ed-visibility-toggle`, icono `eye`/`eye-off`) en el `<summary>` de la unidad —
  siempre visible en rojo cuando está activo, para no perderlo de vista; ausente en un
  bloque `unit.loose` (no tiene título que ocultar).

El recorrido canónico introducción→módulo→(pantallas de módulo)→unidad o bloque
suelto→…→(cierre de módulo)→cierre del curso vive en `src/schema/traverse.ts`
(`screenContainers`/`allScreens`/`containerLabel`, `module`/`unit` null en los
contenedores sin ese nivel — incluidos los bloques `unit.loose`, `closing: true` en los
de cierre) — cualquier código nuevo que recorra pantallas debe usarlo, no el doble
bucle. En el store, `addScreen`/`moveScreen` aceptan como contenedor el id de una
unidad (real o bloque suelto, ambos son un `Unit` con id propio), de un módulo, de su
cierre (`moduleClosingContainerId`), `INTRO_CONTAINER_ID` u `OUTRO_CONTAINER_ID`;
`Located` tiene `mi` (módulo, o `'intro'`/`'outro'`), `ui` (índice de unidad, o `null`
si es del propio módulo) y `part: 'main' | 'closing'` (solo relevante a nivel de
módulo/curso, que sí tienen los dos contenedores).

- **Módulos y unidades plegables, colapsados por defecto**: ambos son `<details>`
  (`ed-tree-module`/`ed-tree-unit`) con chevron rotatorio (`::before` en
  `.ed-module-name`/`.ed-unit-name`) y, la unidad, contador de pantallas (con filtro
  activo, «visibles/total»). La `key` incluye el estado del filtro para remontarse
  abierto al (des)activarlo. El estado plegado/desplegado se guarda por id en
  `useTreeFold` (store zustand de UI local a `CourseTree.tsx`, mapa `collapsed`): así
  sobrevive al cambio de pestaña (App desmonta el aside fuera de la pestaña Editor). Sin
  entrada en `collapsed` (nunca tocado) el `<details>` nace **cerrado** — el mapa
  guarda «se ha abierto explícitamente» (`collapsed[id] === false`), no «está
  plegado»: invertirlo (`open={collapsed[id] === false}` en vez de `open={!collapsed[id]}`)
  fue lo que cambió el default de abierto a cerrado sin tocar `onToggle`. No entra en el
  historial de deshacer ni en el proyecto; con filtro activo se fuerza abierto sin tocar
  lo guardado.
- **Módulos y unidades se pliegan de forma independiente** (puede haber varios abiertos a
  la vez): hace falta para arrastrar pantallas entre módulos sin que el destino se pliegue.
- **CRÍTICO — un `<details>` cerrado necesita `display:none` explícito en sus hijos**:
  cualquier regla de autor que fije `display` en un descendiente (`.ed-screens{display:
  grid}`, `.ed-add{...}`) gana SIEMPRE al valor por defecto del user-agent para
  `details:not([open]) > *`, con independencia de la especificidad — el origen «autor»
  pesa más que «user-agent» en la cascada. Sin la regla explícita
  `details.ed-tree-module:not([open]) > :not(summary), details.ed-tree-unit:not([open])
  > :not(summary) { display: none }` (`editor.css`), un módulo o unidad «cerrados»
  seguían renderizando su contenido a tamaño real, desbordado fuera de la caja del
  `<details>` (colapsada a la altura del resumen) y solapado con lo que hubiera debajo:
  invisible a la vista (lo tapa el contenido que pinta después) pero perfectamente
  «tocable» para `pointerWithin` de dnd-kit, que ignora el orden de pintado — al
  arrastrar cerca de otro módulo/unidad el puntero podía coincidir geométricamente con
  pantallas de un contenedor cerrado bastante alejado y el drop se colaba ahí (síntoma:
  soltar «se iba» varias pantallas arriba/abajo, en otro módulo, sin relación aparente
  con la posición real del cursor). Verificado midiendo `getBoundingClientRect` con y sin
  la regla.
- **Filtro** (`.ed-tree-filter`): por título o etiqueta de tipo; oculta módulos/unidades
  sin coincidencias y las secciones Evaluación/añadir mientras está activo. El dnd sigue
  funcionando (mueve por id, no por índice visible).
- **Feedback visual del arrastre y precisión en los bordes**: con `closestCenter` a
  secas (colisión por defecto de dnd-kit) el objetivo del drop se calculaba por
  distancia de centros entre **todas** las pantallas del árbol, sin respetar fronteras
  de unidad/módulo — cerca del borde de un tema el centro más próximo podía ser el de
  una pantalla de otro módulo bastante alejada en la estructura, y el arrastre «se iba a
  otro sitio» sin avisar. La detección de colisión ahora es un híbrido
  (`collisionDetection` en `CourseTree.tsx`): primero `pointerWithin` (el puntero tiene
  que estar literalmente dentro del rectángulo de la pantalla candidata) y solo si no
  hay ninguna pantalla bajo el puntero (huecos entre contenedores) cae a `closestCenter`
  como respaldo. Sobre esa base, tres señales durante el arrastre:
  - Mientras `dragging` (estado local, `onDragStart`/`onDragEnd`/`onDragCancel`) los
    puntos de inserción (`.ed-insert`, el «+» entre pantallas) parpadean y se ven más
    grandes (`is-dragging` en `editor.css`) como aviso general de zonas donde se puede
    soltar.
  - La pantalla que recibiría el drop ahora mismo se ilumina de forma sólida (`isOver`
    de `useSortable`, clase `.ed-screen.is-drop-target`) como confirmación inequívoca de
    «diana» antes de soltar, con una línea gruesa arriba o abajo (`is-drop-before`/
    `is-drop-after`, estado compartido `useDropSide` actualizado en `onDragOver`
    comparando el centro vertical de la pantalla arrastrada con el del objetivo) que
    marca el lado exacto de inserción — antes no había forma de saber si, al soltar
    sobre un contenedor con una única pantalla, iba a quedar encima o debajo (`onDragEnd`
    solo insertaba «antes» al cruzar de contenedor). Al reordenar dentro del mismo
    contenedor esa dirección ya la decide el propio dnd-kit (mismo convenio que
    `arrayMove`: origen antes del destino → después; origen después del destino →
    antes), así que el ajuste de `onDragEnd` solo aplica al cruzar a un contenedor
    distinto.
  - Un contenedor **sin pantallas** (módulo, unidad o introducción vacíos) no tenía
    ningún `ScreenItem` dentro que registrara un droppable — arrastrar ahí no hacía
    nada. `EmptyDropZone` (visible solo mientras se arrastra) registra el propio
    `containerId` como droppable con `data.empty`, que `onDragEnd` reconoce e inserta
    siempre en la primera posición.
  - **CRÍTICO — nunca cambiar tamaño/posición reales mientras se arrastra**: dnd-kit
    (`MeasuringStrategy.WhileDragging`, el valor por defecto) mide los rectángulos
    droppable **una sola vez** al empezar el arrastre, y solo vuelve a medir un elemento
    si un `ResizeObserver` detecta que ESE MISMO elemento cambia de tamaño — el cambio de
    tamaño de un HERMANO (que empuja al resto hacia abajo por flujo normal) no dispara
    ninguna remedición. Se probaron dos efectos que violaban esto y ambos causaban el
    mismo síntoma (arrastrar varias pantallas de más para acertar, porque dnd-kit seguía
    creyendo que estaban en su posición de antes): (1) agrandar `.ed-insert` con
    `height`/`margin` reales (con o sin `transition`) al iniciar el arrastre — todas las
    pantallas siguientes quedaban con su posición «real» más abajo de la que dnd-kit
    creía; (2) un hueco simulado con altura real (`ed-drop-gap`) al cruzar de contenedor.
    Los dos se sustituyeron por `transform`/`opacity` (solo pintado, nunca de layout): el
    agrandado de `.ed-insert` usa `transform: scaleY()`, y el cruce de contenedor se
    conforma con la línea de diana (`is-drop-before`/`is-drop-after`) sin abrir hueco de
    verdad. Verificado midiendo `getBoundingClientRect` de `.ed-insert` antes y durante un
    arrastre simulado: con `transform`/`opacity` el rectángulo no cambia.
- **Pantallas también con Subir/Bajar** (`ScreenItem`, además del arrastre dnd-kit):
  botones que llaman a `moveScreen(id, containerId, index±1)` — mismo contenedor, sin
  cruzar a uno adyacente (a diferencia de `moveUnit`/`moveModule`). Reciben `index`/
  `count` **reales** (sin filtrar) del contenedor; con el filtro activo llegan
  `undefined` y los botones no se muestran (los índices de la lista filtrada no se
  corresponden con el contenedor).
- **Iconos por tipo** en cada pantalla (`screenTypeIcon` en `labels.ts`) + marca de
  interacción: muestra el **icono del tipo de interacción real** (con su color y
  `title`), no un puzzle genérico; si `interaction.scored`, marca «⭐ evaluable»
  (`.ed-eval`, en ámbar); si `screen.review.flagged`, marca aparte en rojo
  (`.ed-flag-review`, ver «Revisión pendiente» más abajo).
- **Validación en contexto**: el árbol calcula `validateCourse` (memoizado por curso) y
  muestra badge ⛔/⚠ por pantalla (`IssueBadge`); el `ScreenEditor` muestra la lista de
  issues de la pantalla abierta (`.ed-inline-issues`) encima del formulario. Los `info`
  no se muestran en contexto (solo en la pestaña Validación).
- **Auto-scroll y auto-apertura del contenedor**: al seleccionarse una pantalla (recién
  creada, vía enlaces de Validación/Informe, o al volver de Vista estudiante tras navegar
  ahí — `me-screen-change` por postMessage → `selectScreen`), su `<li>` se centra en el
  árbol (`scrollTreeTo`, `scrollIntoView({ block: 'center' })` solo si no está ya del todo
  a la vista; diferido dos `requestAnimationFrame` porque en el montaje el layout aún no
  es definitivo). Si el módulo/unidad contenedor está plegado, el `<li>` existe en el DOM
  pero oculto — `scrollIntoView` no puede llevarlo a la vista mientras siga oculto —, así
  que `useScrollWhenSelected` (`CourseTree.tsx`) abre primero el módulo (sin cerrar los
  demás) y la unidad, y solo entonces programa el scroll.

### Estructura desde el árbol y «Nuevo (vacío)»
Sin esto, borrar la estructura demo era un callejón sin salida (no había forma de crear
módulos/unidades):
- **Store**: `addModule()` (módulo al final con una unidad dentro) y `addUnit(moduleId)`
  dan a cada contenedor nuevo **su propia portada** (`blankScreen({type:'cover', title})`
  con el mismo título que el contenedor) — así se ve el título en grande antes de entrar
  en materia, en vez de saltar directo al primer contenido; sin esto la portada de
  módulo (`.me-module-cover`, con diseño propio a propósito — `arquitectura-runtime.md`)
  casi nunca llegaba a usarse. `removeUnit(id)` y `removeModule(id)` limpian
  `selectedScreenId` si la pantalla seleccionada estaba dentro. `resetEmpty()` (curso
  mínimo vía `Course.parse`: un módulo/unidad con una única portada compartida, no dos)
  **vacía también los assets**, a diferencia de `resetSample`, para no arrastrar
  binarios del proyecto anterior.
- **Árbol**: «+ Añadir unidad» al pie de cada módulo, «+ Añadir módulo» tras el último
  (`.ed-add-module`), y junto al nombre de módulo/unidad las herramientas discretas
  `.ed-struct-tools`: **▲/▼ para reordenar** — módulos dentro del curso; unidades dentro
  de su módulo y, desde el extremo, **cruzando al módulo adyacente** (al final del
  anterior subiendo, al principio del siguiente bajando — `moveUnit` del store; los
  botones solo se deshabilitan en los extremos globales y el `title` avisa del cruce) —
  y papelera para eliminar. Cada módulo se presenta como **card suave** (`.ed-module`:
  borde y fondo muy leves) para delimitarlo del siguiente; Evaluación y Materiales
  comparten esa presentación. Todas las herramientas cortan el clic
  (`preventDefault`+`stopPropagation`) para no plegar el `details` ni disparar el rename;
  el borrado pide `confirmDialog` **solo si contienen pantallas** (deshacer siempre
  disponible). Se eligió ▲/▼ y no drag&drop para no anidar sortables con el arrastre de
  pantallas (uso ocasional; teclado de serie). Sin módulos, CTA «+ Crear el primer
  módulo» (`.ed-tree-empty`). Todo oculto con el filtro activo, como el resto de
  acciones de creación.
- **Toolbar → Archivo**: «Nuevo (vacío)» sobre «Nuevo (demo)», con la misma confirmación
  de descarte.

### Renombrado inline de títulos estructurales (`InlineRename`)
Los títulos que no son de pantalla se editan **in situ** con `InlineRename`
(`src/components/InlineRename.tsx`): lápiz ✏ → input; Enter/blur confirma, Escape
restaura. Se usa en el **título del curso** (`.ed-course-name` de la `Toolbar` →
`updateCourseInfo({title})`), en **módulos** (`updateModule`) y en **unidades**
(`updateUnit`); las tres acciones coalescen el tecleo en el historial (claves
`courseinfo`/`module:<id>`/`unit:<id>`). El componente detiene la propagación de los
clics para poder vivir dentro del `<summary>` de la unidad sin plegarla.

### Recetas de creación de pantallas (`AddScreenModal` + `screenRecipes.ts`)
«+ Añadir pantalla…» abre un modal (`AddScreenModal`, reutiliza `SettingsWindow`) con
**tarjetas agrupadas por lo que hace el alumno** — Estructura (armazón) / Contenido
(leer, ver, explorar: incluye las interacciones informativas
acordeón/pestañas/tarjetas/línea de tiempo/hotspots) / Práctica (hacer y recibir
corrección: pregunta, emparejar, ordenar, clasificar, huecos, escenario, caso, fichas,
reflexión, foro) / Evaluación (test de unidad) / Otros (placeholder y en blanco,
discretas). El catálogo vive en `src/schema/screenRecipes.ts` (`SCREEN_RECIPES`): cada
receta fija de golpe `type` + recurso visual + interacción + título inicial, para que el
autor novel no combine a mano las tres decisiones. Es una **capa de UI**: no toca el
esquema ni el contrato de `course.json`, y tras crear todo sigue siendo editable (el
desplegable «Tipo de pantalla» queda como ajuste avanzado). Decisiones:
- **Puntuar es el default del grupo, no una promesa de la tarjeta**: Práctica crea con
  `scored: false`, Evaluación con `scored: true`; el subtítulo del grupo
  (`RECIPE_GROUP_HINTS`) lo comunica y las descripciones no mencionan la nota (la
  decisión real vive en la interacción + `score_source` de Ajustes; el aviso
  `SCORM_ACTIVITIES_IGNORED` de `validators.ts` cierra el círculo). Una línea fija al pie
  del modal (`.ed-recipes-note`) aclara que la receta solo preconfigura.
- **Sin tarjeta a propósito**: `html_embed` (interacción avanzada, sandbox) y
  Verdadero/Falso (variante de Pregunta). Glosario y bibliografía tampoco: son materiales
  únicos a nivel de curso (sección «Materiales» del árbol), no pantallas.
- Las interacciones de las recetas se construyen con `Interaction.parse(...)` — los
  defaults del esquema son la única fuente de verdad (no hay literales duplicados). Los
  tipos con estructura anidada (`scenario_steps`, `decision_tree`, `calculator`) usan
  `makeRecipeInteraction`, que añade el `seed()` y los textos habituales del catálogo de
  interacciones: vacíos no serían usables (un caso sin pasos, una conversación sin nodos).
- **Etiqueta «Nueva»** (`.ed-new-badge`): una receta de pantalla o de interacción con
  `since: 'AAAA-MM-DD'` la muestra junto al nombre durante `NEW_BADGE_DAYS` (30) días y
  luego desaparece sola (`isNewSince`, `src/schema/newBadge.ts`). Sale en «Añadir
  pantalla» y en el selector de tipo de interacción. Solo UI, no toca `course.json`.
- `place?: (screens) => number` coloca la pantalla (portada al principio, objetivos tras
  la portada, resumen antes del test, test al final); para ello `addScreen` acepta un
  cuarto parámetro `atIndex` (si falta: tras `afterId` o al final).
- `uniquePerUnit` **atenúa** la tarjeta si la unidad ya tiene ese tipo (tooltip «Ya
  existe…») pero **no bloquea** — aviso blando.
- `scope?: 'unit' | 'module' | 'course'` **sí filtra** (la tarjeta no aparece, a
  diferencia de `uniquePerUnit`): `AddScreenModal` calcula `scope` del contenedor
  (`'course'` si `containerId` es `INTRO_CONTAINER_ID` u `OUTRO_CONTAINER_ID`, `'module'`
  si es un módulo o su cierre, `'unit'` en el resto) y lo compara con el de cada receta
  antes de listar el grupo — el cierre de un módulo o del curso comparte el `scope` de
  su contraparte de introducción, mismo nivel jerárquico. Uso hoy: las tres
  portadas — recetas `scorm-cover` (`scope: 'course'`), `cover` (`scope: 'unit'`) y
  `module-cover` (`scope: 'module'`) — **comparten el mismo tipo** `cover` (una sola
  plantilla en `renderer.js`, ver «Portada unificada» en `arquitectura-runtime.md`): son
  tres recetas por comodidad de autoría (cada una con su tarjeta, icono y
  `defaultTitle` propios en el sitio donde tiene sentido crearla), no tres tipos de
  pantalla. El **rótulo mostrado** (`screenTypeLabel(r.type, { level: r.scope, … })` en
  `recipeLabel()`, `AddScreenModal.tsx`) sale del `scope` de la receta, no del `type`
  —por eso hace falta ese parámetro y no basta con `screenTypeLabel(r.type)`—.
  Ninguna de las tres lleva rótulo textual de nivel en la Vista estudiante (ver «Portada
  unificada» en `arquitectura-runtime.md`) — el `scope` solo decide la etiqueta de la
  receta en el editor, no nada visible para el alumno. El resto de recetas sin `scope`
  (Contenido, Objetivos…)
  también valen para la introducción del curso — solo las portadas de módulo/unidad
  quedan fuera de ahí porque su hero anuncia un nivel concreto que la introducción no
  tiene (la de `scope: 'course'` sí vale ahí, es la suya).

- **Instrucciones de uso** (receta `guide`, `scope: 'course'`, tipo propio `guide`): opcional,
  no viene en el curso de serie; se coloca tras la portada del SCORM. Es la única receta
  con **`assets`**: trae el vídeo demo (MP4 + póster + VTT, empaquetados en el editor) y su
  transcripción; `AddScreenModal.create` los añade al proyecto antes de crear la pantalla.
  El resumen de controles no lo escribe el autor: lo genera la carcasa (ver «Pantalla de
  instrucciones de uso» en `carcasa-navegacion.md`); su `student_text` es solo una
  entradilla opcional. Sin objetivo (`hideObjective`, exenta de `NO_OBJECTIVE`). El curso
  demo la incluye sin vídeo (no tiene `AssetMap`).
- **Grupo «Reutilizar»** (al final, fuera de `SCREEN_RECIPES`): tarjeta «Importar
  pantallas…» que inserta en el contenedor (y en `atIndex`, si lo hay) las pantallas de un
  paquete `.scormscreen`; su contraparte es el botón de exportar de la cabecera del
  `ScreenEditor` (formato y reglas en «Paquete de pantallas reutilizables» de
  `persistencia-scormproj.md`).
- Las recetas **no** rellenan `student_text` (acabaría exportado) ni `min_time_seconds`
  (ya hay ajuste masivo en Ajustes).
- Tras crear, el foco salta al input de Título (`data-field="screen-title"` en
  `ScreenEditor`). «En blanco» (tarjeta discreta, borde discontinuo) es la vía de escape
  sin preconfigurar.
- `addScreen(containerId, afterId?, preset?, atIndex?)` tipa el preset como
  `Partial<ScreenInput>` (`z.input` del esquema: los campos con default son opcionales).
- **Puntos de inserción** (`InsertPoint`, `.ed-insert`): entre cada par de pantallas del
  árbol hay una zona fina que al pasar el ratón (o enfocar con Tab) revela un divisor con
  «+»; abre el mismo modal con `atIndex`, que **manda sobre** la colocación automática de
  la receta (`place`). Con el filtro activo no se muestran (los índices de la lista
  filtrada no se corresponden con la unidad).

### Terminología «módulo»/«unidad» personalizable
Un paquete SCORM exportado por el editor puede representar cosas muy distintas según el
centro/curso: un curso completo con varios módulos, un módulo suelto, una única unidad o
un tema aislado — «Módulo»/«Unidad» no siempre encaja. `course.module_label`/
`course.unit_label` (`course.schema.ts`, default «Módulo»/«Unidad», mismo patrón que
`glossary_title`/`bibliography_title`) renombran esas palabras **sin tocar la estructura
real** (sigue siendo módulo→unidad→pantalla por debajo, solo cambia cómo se llama en la
UI). Editable en ⚙ Ajustes → Interfaz (Apariencia), fieldset «Terminología»
(`setModuleLabel`/`setUnitLabel` en el store).
- **Alcance de la sustitución** (deliberadamente no exhaustivo): botones del árbol
  (Añadir/Renombrar/Subir/Bajar/Eliminar + diálogos de confirmación, `CourseTree.tsx`),
  las dos portadas en `screenTypeLabel()` («Portada módulo»/«Portada unidad», con
  `opts?: {level, module, unit}` opcional — ver `labels.ts`, solo texto del editor: la
  portada en la Vista estudiante no lleva rótulo de nivel, ver «Portada unificada» en
  `arquitectura-runtime.md`) y su tarjeta en «+ Añadir pantalla» (`recipeLabel()` en
  `AddScreenModal.tsx`, con `level: r.scope` — **no** vía `screenTypeLabel(r.type)` a
  secas: varias recetas comparten `type` con `label` propio distinto, p. ej. varias de
  tipo `content`), y las ubicaciones «módulo «X»»/«unidad «X»» de `ID_DUPLICATE` en
  `validators.ts`. **No** cubierto a propósito: textos largos de
  ayuda (`HelpModal.tsx`, tour guiado) y las descripciones de las recetas que no son
  portada — quedarían con concordancia de género rota para un rótulo arbitrario («la
  unidad» → «la Tema»); solo la etiqueta corta se sustituye. `pluralize()` en
  `CourseTree.tsx` es una aproximación (vocal final → +s, consonante → +es) para plurales
  en confirmaciones («2 bloques»), no cubre toda la morfología del español.

### Subir de nivel: unidad → módulo
Botón `.ed-struct-btn` con icono `arrow-left`, primero en `.ed-struct-tools` de cada
unidad (`promoteUnit(unitId)` en el store). La unidad **se convierte** en un módulo
propio, colocado justo después del módulo que la contenía — no queda envuelta como una
unidad dentro de ese módulo nuevo: sus pantallas pasan a ser directamente las pantallas
propias del módulo (`module.screens`), como hijas suyas, sin nivel intermedio. Detalles:
- **No hace falta retipar ninguna portada**: `cover` es un único tipo cuyo diseño lo
  decide el contenedor donde vive la pantalla en cada momento, no un campo fijo — una
  portada que viajaba en `unit.screens` sigue siendo `type: 'cover'` en
  `module.screens` y el siguiente render ya la pinta como portada de módulo sola, sin
  ningún paso explícito aquí (ver «Portada unificada» en `arquitectura-runtime.md`).
- **Pérdida asumida, sin aviso**: `summary`/`status` de la unidad no tienen equivalente en
  `Module` (se descartan); un test de unidad (`assessments.unit_tests[].unit_id`) que
  referenciara esa unidad queda huérfano — mismo riesgo, sin aviso, que ya asume
  `removeUnit` hoy al borrar una unidad con test asociado (no es una regresión nueva).
- **Sin operación inversa** (demote módulo→unidad): un módulo puede tener pantallas
  propias y varias unidades a la vez, así que no hay una unidad única e inequívoca a la
  que "bajarlo" — no se ha pedido y no está claro qué haría con lo demás.
- **Confirmación previa** (`onPromoteUnit`, `confirmDialog`): describe el cambio
  (unidad→módulo, pantallas como hijas directas) antes de aplicarlo. El mensaje dice
  «puedes deshacerlo con Ctrl+Z» (no «es irreversible»): como cualquier cambio del
  store pasa por `snapshot()`, sí es deshacible — la confirmación es por ser un cambio
  estructural notable, no porque no tenga vuelta atrás.

## `ScreenEditor`: layout y jerarquía
El formulario (`.ed-form`) tiene **ancho máximo legible de 960 px, centrado** (al 100 %
en monitores anchos las líneas se hacían kilométricas). Lo primario va siempre visible:
título, objetivo y la **caja de texto principal** (`RichTextArea` de `student_text` a
`rows={16}`, por ser el contenido principal). Las secciones secundarias — **Recurso
visual**, **Audio de locución y transcripción** e **Interacción** — son
`<details className="ed-fold">`: **Recurso visual** va `open`, los otros dos colapsados
por defecto. Se despliegan al pulsarlos (nativo, sin JS ni estado). No usar la
`<fieldset className="ed-group">` para estas tres (esa sigue en Ajustes/Test final/TTS).

Dentro de **Recurso visual**: Tipo de recurso / Disposición / Proporción / Formato van
juntos como **controles segmentados de iconos** (`SegIcons` → `.ed-seg`, `role="group"`),
con `title`+`aria-label` que describen cada opción (no `<select>`); Disposición/Proporción
solo aparecen cuando aplican (recurso visual no-audio; proporción solo con layout
left/right; **Formato** — `media_ratio` 16:9/4:3/1:1/9:16 — solo con YouTube). Al
**cambiar el tipo de recurso**, cada tipo conserva su propia ruta/ID (memoria por
`id:kind` en `vrMemory`, solo de sesión): así una ruta `assets/…` nunca se arrastra como
«ID de YouTube» ni viceversa. Debajo, una **vista previa** del recurso (`MediaPreview`):
imagen/vídeo-archivo/audio se resuelven a object URL desde `assets` (hook
`useObjectUrl`, que libera con `revokeObjectURL`); YouTube se incrusta por ID
(`/embed/`) con la proporción elegida. Si la ruta aún no tiene binario subido, muestra
un aviso en vez de romper.

## Revisión pendiente (`screen.review`)
Fieldset «Revisión» **al final del formulario**, tras Avanzado — deliberado: es un
aviso editorial ocasional, no algo que se toque a diario como el título o el texto; no
debe competir por atención con lo primario. Checkbox `Pendiente de revisión`
(`.ed-review-toggle`) + `<textarea>` de nota opcional, solo visible cuando está marcada.
Sin marcar por defecto (`review: { flagged: false, note: '' }`, default del esquema).

- **Distinto de `status`**: `status` (`ok`/`esqueleto_pendiente_desarrollo`/`borrador`)
  describe el **contenido**; `review.flagged` es un aviso de que alguien debe **repasarlo**,
  independiente de si el contenido está terminado — se pueden combinar.
- **Badge en el árbol**: `.ed-flag-review` (rojo, icono `alert-octagon`) junto al de
  «pendiente de desarrollo» (`.ed-flag`, ámbar) en `ScreenItem` — distinguibles por color
  e icono, no se confunden aunque coincidan en la misma pantalla.
- **Excepción deliberada a «Vista estudiante = export»** (ver `CLAUDE.md`): la pantalla
  se ve en Vista estudiante con borde rojo grueso (`.me-screen-review`) y un banner
  arriba con la nota (`.me-review-banner`, `render()` en `renderer.js`) — pero
  `stripFlaggedForReview` (`src/schema/review.ts`) la quita de `course.json` **antes**
  de generar cualquier paquete exportado (`buildScormZip` y `buildElpx`, antes incluso de
  `collectAssetPaths`, así sus assets exclusivos tampoco viajan). Es la misma carcasa
  (mismo `.js`/`.css`) la que recibe menos datos al exportar, no una rama de
  comportamiento por entorno.
- **Aviso de validación**: `REVIEW_PENDING` (warning, `checkGlobal` en `validators.ts`,
  `countFlaggedForReview`) recuerda cuántas pantallas no se exportarán — para que no
  sorprenda al exportar de verdad.

## Editor sensible al tipo (`screenTypeUI.ts`)
El `ScreenEditor` adapta el formulario al tipo de pantalla según
`src/schema/screenTypeUI.ts` (`SCREEN_TYPE_UI`). Igual que las recetas, es **solo
presentación** (reordena, pliega y sugiere; nunca restringe — lo incongruente lo señalan
los avisos de `validators.ts`):
- **Orden y plegado**: título → objetivo → texto → recurso visual → interacción → audio →
  «Avanzado». En `video` (`mediaFirst`) el recurso va **antes** del texto; la sección de
  recurso se abre si hay recurso (`kind !== 'none'`) y la de interacción si hay
  interacción o el tipo lo pide (`interactionOpen`, p. ej. `unit_quiz`).
- **Título en la cabecera**: no hay campo «Título» aparte ni rótulo «Editar pantalla»; el
  `h2` del formulario (`.ed-form-head`) es un input con aspecto de encabezado
  (`.ed-title-input`, borde solo al pasar/enfocar) que edita `screen.title` directamente,
  con un lápiz al lado que enfoca+selecciona. Conserva `data-field="screen-title"` como
  diana del foco al crear desde receta. El `FinalTestEditor` usa el mismo patrón (chip
  «📝 Test final» en vez del tipo), y `MaterialsEditor` también (helper `EditableHead`):
  ahí el título edita `glossary_title`/`bibliography_title` del curso (campos del
  contrato, con default «Glosario»/«Recursos y bibliografía»), que la carcasa usa como
  rótulo del botón de la barra y título del modal (con el default, el botón conserva el
  corto «Recursos»). El árbol refleja el título personalizado en las filas de Materiales.
- **Documentos PDF adjuntos** (`DocumentsEditor`, Materiales → Documentos): el autor
  adjunta PDF que el alumno abre o descarga desde el menú lateral de la carcasa.
  `course.attachments[]` = `{ title, description, src, size? }` con el binario en el
  `AssetMap` bajo `assets/docs/<nombre>.pdf` (`uniqueAttachmentPath`, sin acentos ni
  espacios); `attachments_title` (default «Documentos») rotula entrada y modal. **Límites
  de sentido común** (`schema/attachments.ts`, compartidos con los validadores): solo PDF,
  comprobado por la firma `%PDF-` y no por la extensión; máximo **10 MB** por documento
  (bloquea la subida), aviso desde 5 MB, máximo **10 documentos** y aviso del validador si
  entre todos pasan de **25 MB** — un PDF más pesado suele ser un escaneado o un libro
  entero, mejor enlazado desde Recursos. Quitar un documento de la lista **no** borra el
  binario (así Deshacer lo recupera): queda huérfano, no viaja en el SCORM exportado
  (`collectAssetPaths` solo recoge rutas referenciadas) y se purga desde el informe. El
  exportador `.elpx` no los incluye.
- Las secciones usan el helper `Fold` (details **no controlado**: `defaultOpen` solo
  aplica al montar; la `key` por `id`+`type` remonta la sección al cambiar de pantalla o
  de tipo para re-aplicar el énfasis sin pisar lo que el autor pliegue a mano).
- **«Marco de color»** (plegado; el resumen muestra el rótulo o el color si lo hay):
  `ScreenFrameEditor` edita `screen.frame` (atajos «🧪 Actividad práctica», «📝 Síntesis»,
  «💭 Reflexiona», paleta corporativa, color libre, icono y rótulo). Sin color se quita el
  campo. El árbol marca esas pantallas con un punto de su color (`.ed-frame-dot`).
- **«Avanzado»** (plegado): tipo de pantalla, tiempo mínimo y obligatoria. El tipo se
  muestra como chip de solo lectura junto al título del formulario (`.ed-form-type`). El
  selector usa `changeScreenType` del store, que al pasar a `video` sin recurso precarga
  `video_youtube` (congruencia mínima).
- **Objetivo oculto** en `cover`/`summary` (`hideObjective`): son los tipos exentos en
  validación.
- **Interacciones recomendadas** (`recommended`): el selector de tipo de interacción
  destaca «Recomendadas para esta pantalla» (`unit_quiz` → tipos de pregunta; `video` →
  vídeo interactivo). La primera recomendada es además el tipo inicial de «+ Añadir
  interacción» (`blankInteraction`, vía `Interaction.parse`), y su puntuación sigue la
  filosofía de las recetas: `scored: true` solo en `unit_quiz`.

## Sección Interacción

### Catálogo declarativo (`interactionRecipes.ts`)
`src/schema/interactionRecipes.ts` es el catálogo de los tipos de interacción, hermano
de `screenRecipes.ts`: icono, descripción «qué hace el alumno», grupo didáctico
(`presentar`/`preguntar`/`manipular`/`juegos`/`media`/`avanzado`), `gradable` (tiene
corrección real → puede puntuar), `supportsAttempts` (el factory del runtime pasa por
`attemptsOf`), `family` (shapes compatibles para migrar contenido al cambiar de tipo) y
`seed()` (estado inicial útil) y `defaultPrompt`/`defaultInstructions` (frase típica del
tipo para Enunciado/Instrucciones). Las **etiquetas** siguen viviendo solo en `labels.ts`
(no se duplican). Es capa de UI: no toca el contrato. Consumo en `ScreenEditor`:
- **«Intentos»** se muestra según `supportsAttempts` (no hay lista hardcodeada).
- **«Evaluable»/«Puntos»** solo se muestran si el tipo es `gradable` — o si viene
  `scored: true` de un curso importado, para poder desmarcarlo (el checkbox lleva un
  `title` explicando que el tipo es informativo). «Puntos» se **deshabilita** mientras
  `!scored` (estilo global `input:disabled` en `editor.css`); al activar «Evaluable» con
  0 puntos se pone `points: 1` para que puntuar tenga efecto.
- `blankInteraction()` aplica el `seed()` del tipo inicial (p. ej. `true_false` nace con
  «Verdadero» correcta / «Falso»; `single_choice` con 2 opciones, la 1ª correcta).
Al añadir un tipo nuevo al esquema hay que darle también su entrada en el catálogo
(además de la etiqueta en `labels.ts`); `interactionRecipe()` tiene un fallback permisivo
para tipos sin entrada.

### Jerarquía del bloque Interacción (4 partes)
El bloque cuenta una historia en 4 partes (no una pila plana de campos al mismo nivel):
1. **Cabecera** (`.ed-it-head`, con filete inferior): icono + nombre del tipo, «Cambiar
   tipo…» (abre el selector visual), **posición** top/bottom como `SegIcons` de 2
   opciones, y **eliminar** como icono discreto a la derecha (`.ed-it-del`) que confirma
   con `confirmDialog` solo si `interactionHasContent`.
2. **Actividad** (siempre visible): Enunciado, Instrucciones y el
   `InteractionConfigEditor` del tipo. Enunciado/Instrucciones nacen con la frase típica
   del tipo (`defaultPrompt`/`defaultInstructions` del catálogo, homogeneidad y menos
   tecleo); el autor los sobrescribe libremente. Un enlace **«Usar texto habitual»** junto
   a cada campo (visible solo si el tipo tiene frase por defecto; no la tiene
   `html_embed`, contenido a medida). **Criterio de los textos por defecto**: Enunciado e
   Instrucciones nunca se parecen — el enunciado es la tarea/pregunta (en informativas y
   preguntas simples va **vacío**: lo escribe el autor o lo dice la propia pantalla) y las
   instrucciones solo la mecánica del componente; mejor vacío que repetir permite recuperarlo en cualquier momento sin perder
   el resto de la interacción. Al **cambiar de tipo** (`onChangeInteractionType`) se
   aplica lo mismo pero solo al campo que esté vacío — nunca se pisa texto ya escrito.
3. **Fold «Evaluación»** (solo si el tipo es `gradable` — o `scored` importado):
   Evaluable, Puntos e Intentos. `defaultOpen={it.scored}` y **resumen vivo** en el
   `<summary>`: «Evaluación — evaluable · 2 puntos · 1 intento» / «Evaluación — no puntúa»
   (se recalcula en cada render; el estado abierto/cerrado sigue siendo del autor). No hay
   objetivo propio de la interacción: es siempre el `objective` de su pantalla (ver
   «Objetivos de aprendizaje» más abajo); la cobertura `OBJ_NOT_EVALUATED` solo cuenta
   `scored`.
4. **Fold «Feedback»** (plegado; resumen «personalizado»/«por defecto» — comparado contra
   los defaults del esquema, `FB_DEFAULTS` vía `Interaction.parse`): acierto, error y
   explicación pedagógica, con hint «respaldo general» cuando el tipo tiene además
   feedback por opción (familias `options`/`questions`). La excepción `hotspots`
   (feedback por zona en su modal) se conserva dentro del fold.
Los folds anidados llevan `key` por `id`+`it.type` (misma técnica de remontaje que la
sección).

### Selector visual de tipo (`InteractionTypeModal`) y cambio de tipo
El tipo de interacción no se elige en un `<select>` de 24 entradas sino en
`InteractionTypeModal` (`src/components/InteractionTypeModal.tsx`), calco estructural de
`AddScreenModal`: tarjetas `ed-recipe` con icono + descripción del catálogo, agrupadas
por grupo didáctico, con navegación por flechas, marca ⭐ en las que pueden puntuar y
sección «Recomendadas para esta pantalla» arriba si `SCREEN_TYPE_UI` define `recommended`
(las recomendadas aparecen además en su grupo, duplicación deliberada). La tarjeta del
tipo actual se marca (`.ed-recipe.is-current`). Lo abren dos caminos del `ScreenEditor`
(estado local `typePicker: 'add' | 'change'`):
- **«+ Añadir interacción»** → modo `add`: crea con `blankInteraction(tipo)` (seed del
  catálogo; `scored: true` solo en `unit_quiz` **y** si el tipo es `gradable`).
- **«Cambiar tipo…»** (junto al nombre del tipo actual, `.ed-it-type`) → modo `change`:
  llama a `changeInteractionType` del store.

**`changeInteractionType(screenId, type)`** (`courseStore.ts`): conserva siempre lo común
(id, enunciado, instrucciones, feedback, intentos, objetivo, source_refs;
`scored`/`points` solo si el tipo nuevo es `gradable`) y para options/config aplica
`migrateInteractionData` (`interactionRecipes.ts`):
- **Misma `family`** → migra el contenido compartido (el resto de claves se descarta):
  - `options` (single_choice ↔ true_false ↔ scenario_decision) y `assign`
    (match_pairs ↔ classification): mismo shape en `options`, migran tal cual.
  - `titled-content` (accordion ↔ tabs ↔ flip_cards ↔ flashcards ↔ timeline ↔
    image_cards): patrón «título + detalle» con un shape distinto por tipo
    (`items {title, body}`, `cards {front, back}`, `milestones {label, title,
    body}`, `cards {image, alt, title, text}`); la migración pasa por el ítem
    canónico `{title, body, label, image, alt}` vía `TITLED_ADAPTERS`, y los
    campos que el destino no conserva (label de timeline, image/alt de
    image_cards) se descartan marcando `lossy`. El campo «detalle» de estos
    tipos (`body`/`front`+`back`/`text`) siempre se edita con `RichTextArea`
    completo (negrita, cursiva, listas, bloques personalizados…), porque el
    runtime los renderiza con `block()` (markdown de bloque completo, el mismo
    que el cuerpo del acordeón) — **no** con `rich()` (solo inline). El
    título/etiqueta (`title`/`label`) es un `<input>` plano a propósito en
    todos ellos (encabezado corto, se renderiza con `rich()`, sin formato de
    bloque). En `flip_cards` las dos caras conviven superpuestas dentro de un
    único `<button>` (truco del volteo 3D); `.me-card-front`/`.me-card-back`
    son `flex-direction: column` para que varios bloques (párrafo + lista +
    callout) se apilen en vertical en vez de quedar en fila y recortarse por
    el `overflow: hidden` de la carta.
  - `questions` (video ↔ hidden_image): `config.questions`.
- **Sin familia común** → `options`/`config` parten del `seed()` del tipo nuevo.
  Quedan fuera a propósito: az_quiz/crossword (sus «respuestas» exigen una
  palabra corta — migrar texto libre daría contenido inválido) y
  sort_steps/single_choice (comparten `options` pero la semántica cambia: el
  orden es la respuesta vs. la marca `correct`).
- En ambos casos **nunca quedan claves huérfanas** del tipo anterior en `config` (un
  `{...it, type}` ingenuo acumularía basura exportable).
- Devuelve `lossy`: la UI (`onChangeInteractionType` en `ScreenEditor`) pide
  `confirmDialog` **solo** si se descartaría contenido escrito (`hasText` profundo);
  cambiar entre tipos compatibles o sin contenido es instantáneo. El paso de historial
  usa `snapshot()` sin clave (no se coalesce con el tecleo).

### Vista previa de configuración
- **`fill_blanks`**: bajo el textarea, preview trivial (`.ed-fb-preview`) que pinta los
  `[[huecos]]` como chips `<mark>` + contador «N huecos · M distractores».
- **Descartado por decisión del autor**: la mini-preview de pantalla con el runtime real
  (`ScreenMiniPreview`, curso sintético + iframe) se retiró por redundante con la pestaña
  «Vista estudiante»; y la preview sandbox en vivo de `html_embed` (`EmbedPreview`) se
  retiró por no necesitarse. Si algún día vuelven, el criterio sigue siendo runtime real
  vía `buildPreviewHtml` (nunca un segundo renderizador). Los textareas de `html_embed`
  siguen siendo textareas: CodeMirror exigiría `@codemirror/lang-html/css/javascript`
  (deps nuevas, descartado).

### `ListEditor` unificado
El editor genérico de listas vive en `src/components/ListEditor.tsx`; **todas** las
listas de config de interacciones lo usan con el mismo comportamiento:
- **Reordenar siempre** (▲/▼, deshabilitados en los extremos); no es un privilegio de
  algunos tipos (el renumerado de `sort_steps`/`timeline` sigue viviendo en su
  `onChange`).
- **Duplicar** (⧉): clon profundo; si el ítem tiene `id` de primer nivel se regenera (no
  duplicar identidades: estado del runtime, grupos de radios). Ajustable con la prop
  `clone`.
- **Plegado por ítem**: la prop `summary(item, i)` lo activa — fila plegada = nº +
  resumen pulsable (`.ed-config-sum`), botón ⤒ para plegar; al montar nacen abiertos los
  primeros `collapseFrom` (def. 4) y los añadidos/duplicados nacen abiertos. El estado de
  plegado vive por posición y las mutaciones lo reajustan. Tienen resumen las listas
  «gordas»: accordion/tabs (título), timeline (fecha · título), image_cards (título/alt),
  az_quiz (letra · pista) y las preguntas de vídeo/imagen oculta.
- `confirmRemove(item)` opcional: mensaje → `confirmDialog` antes de borrar la fila.
- **`QuestionListEditor`** (en `InteractionConfigEditor.tsx`): sub-editor común de
  «pregunta + opciones» que unifica los cases de `video` (con campo Segundo, `withTime`)
  y `hidden_image` — evita dos copias casi idénticas anidando ListEditor a mano.
- **Audio por ítem** (accordion/tabs/flip_cards/timeline/image_cards/flashcards):
  `ItemAudioButton`/`BulkItemAudioButton` (`InteractionConfigEditor.tsx`) generan el audio
  de narración de un ítem o de todos los pendientes de la interacción; si el ítem no
  tiene `id` aún se lo asignan en el momento. Detalle del mecanismo (guion, runtime,
  validación) en `tts-narracion.md`.

### Editor visual de zonas de hotspots (`HotspotZonesModal`)
Definir las zonas de `hotspots` a base de números (x/y/w/h en %) era inviable a mano, así
que el case `hotspots` de `InteractionConfigEditor` abre un **editor visual en modal**
(`src/components/HotspotZonesModal.tsx`, reutiliza `SettingsWindow` en modo `wide`):
- La imagen se muestra a tamaño grande (object URL del asset, o la URL http directa) y
  las zonas son rectángulos superpuestos numerados: **arrastrar en vacío dibuja** una
  zona nueva, arrastrar una zona la **mueve** y el tirador de la esquina la
  **redimensiona** (pointer events con `setPointerCapture` sobre el «stage»; un arrastre
  menor del 2 % se descarta como clic). Teclado: flechas mueven la zona con foco (con
  Mayús redimensionan), Supr la elimina.
- Panel lateral: lista de zonas (selección) y, para la seleccionada, etiqueta accesible,
  check «correcta», feedback y borrado. Verde = correcta, rojo = incorrecta.
- Trabaja sobre una **copia local** y solo llama a `setConfig({ spots })` al pulsar
  «Guardar zonas» → una única entrada en el historial; Cancelar/Esc descarta.
- Las coordenadas se redondean a 1 decimal y son el mismo contrato que consume el runtime
  (`spots: [{id,x,y,w,h,label,correct,feedback}]`). El modal es la **única** superficie
  de edición de zonas (bajo el botón queda solo un resumen «N zonas definidas ·
  correcta: …»). El campo imagen tiene su `FileButton` de subida.
- Para `hotspots` el `ScreenEditor` **oculta** «Feedback acierto/error»: el feedback se
  escribe por zona en el modal y los genéricos quedan solo como respaldo interno (el
  runtime hace `s.feedback || data.feedback.correct`, y conservan su texto por defecto
  «Correcto.»/«Revisa tu respuesta.»). «Explicación pedagógica» sí se muestra (es común a
  todos los tipos).

## Objetivos de aprendizaje

### Las interacciones no tienen objetivo propio
El objetivo de aprendizaje de una interacción **es siempre el de su pantalla**
(`screen.objective`): no existe un campo `learning_objective` en la interacción, no hay
selector propio en el `ScreenEditor` y no se valida por separado. Simplifica el modelo (un
objetivo por pantalla, no dos textos que pueden desincronizarse) y es la semántica real:
una interacción evalúa el contenido de la pantalla donde vive.
Las **preguntas de test** (final y de unidad) sí llevan su propio `learning_objective`
—no están ancladas a una pantalla concreta— y su campo «Objetivo vinculado» en
`FinalTestEditor` es `ObjectiveSelect` (`src/components/ObjectiveSelect.tsx`): un
`<select>` con los objetivos **declarados en las pantallas** del curso. Motivo: la
cobertura `OBJ_NOT_EVALUATED` (ver `informes-validacion.md`) casa por **texto exacto**, y
el texto libre producía objetivos «casi iguales» que nunca casaban. Si el valor guardado
no coincide con ningún objetivo declarado (curso importado), se conserva como opción
extra marcada «(no declarado en pantallas)». El casado valor↔objetivo declarado es
**tolerante** (`normalizeObjective`, ver `informes-validacion.md`): un valor «casi igual»
se muestra como el objetivo declarado y, al elegir en el desplegable, se guarda el texto
canónico. No volver a texto libre.
En cambio, el campo **«Objetivo de aprendizaje» de la pantalla** (donde *nacen* los
objetivos, incluidas las pantallas sin interacción) no puede ser un desplegable cerrado:
es `ObjectiveInput` (mismo fichero), un input **con `datalist`** que sugiere los
objetivos ya declarados pero admite escribir uno nuevo. Ambos comparten
`useDeclaredObjectives()`.
**Prerrelleno** de preguntas del test final: la nueva se prerrellena con el **primer
objetivo aún sin evaluación** (`uncoveredObjectives()` en `src/validation/objectives.ts`)
— así «+ Añadir pregunta» va recorriendo solo los objetivos pendientes. Es un valor
inicial editable, no un vínculo automático: el desplegable sigue mandando.

### Gestor de objetivos (⚙ Ajustes › Objetivos de aprendizaje)
Los objetivos **no son una entidad** del `course.json`: viven como texto repetido en
`screen.objective` y `question.learning_objective` (las interacciones no tienen uno
propio: heredan el de su pantalla). El gestor (`src/components/ObjectivesModal.tsx`,
`settingsModal: 'objectives'`) los reúne
con `collectObjectives()` (`src/validation/objectives.ts`): por clave normalizada, con
las pantallas que lo declaran y las evaluaciones vinculadas (chips que navegan al editor
vía `goToScreen`, incluido `__final__`). Acciones sobre **todos los usos a la vez** para
no dejar la vinculación rota a medias (`remapObjective` en el store): **renombrar**
(`renameObjective`, se confirma al salir del campo — no tecla a tecla — para no fusionar
por accidente con otro objetivo que normalice igual; renombrar a un texto ya existente
**fusiona** ambos, es deliberado) y **quitar** (`removeObjective`, vacía el campo en
todos los usos, con `confirmDialog`). **Añadir** = declarar el texto en una pantalla
elegida (`updateScreen`), porque un objetivo solo existe si una pantalla lo declara. Los
objetivos vinculados desde evaluaciones pero no declarados en ninguna pantalla (cursos
importados) se listan al final con la marca «no declarado en ninguna pantalla».

## `FinalTestEditor` compacto
Construido sobre `ListEditor` (no una página kilométrica de `fieldset.ed-group` todos
expandidos):
- **Preguntas plegadas por defecto** (`collapseFrom: 1`: la primera abierta al montar)
  con resumen = enunciado, prefijado con «⛔ sin opción correcta ·» si ninguna opción
  está marcada. Reordenar y **duplicar pregunta** de serie; `cloneQuestion` regenera el
  id de la pregunta **y de cada opción** (el grupo de radios usa `correct-${q.id}` y el
  runtime guarda por id de opción — duplicar identidades los rompería). Eliminar con
  contenido pide confirmación (`confirmRemove`).
- **Opciones también con ListEditor** (reordenar/duplicar/eliminar): el radio «correcta»
  exclusivo se mantiene; el `clone` de opción pone `correct: false` para no acabar con
  dos correctas.
- Cabecera con contador vivo «N preguntas · M puntos» junto a la nota mínima.
- `blankQuestion`/prerrelleno de objetivo (`uncoveredObjectives`) sin cambios respecto a
  lo descrito arriba.
- **«Eliminar test final»** (borra todo `assessments.final_test`, `setFinalTest(null)`)
  pide `confirmDialog` antes de vaciarlo, igual que el resto de borrados destructivos del
  árbol — no se ejecuta directo al pulsar. Simétrico con Glosario/Recursos
  (`MaterialsEditor`, ver `carcasa-navegacion.md`): ambos tienen un botón «Vaciar…» con
  confirmación para borrar todo el contenido de golpe, y la carcasa oculta su entrada del
  menú lateral mientras esté vacío.

### Cambiar el tipo de una pantalla de Vídeo
`ScreenEditor.onChangeScreenType`: si la pantalla es `video` y su recurso visual es un
vídeo (`video_youtube`/`video_file`) con fuente, al elegir otro tipo se pregunta
(`confirmDialogTri`) si quitar el vídeo («Quitar el vídeo» reutiliza `changeKind('none')`,
con su propio aviso de borrado de binarios) o mantenerlo; cancelar deja el tipo como estaba.
Sin esta pregunta la pantalla dejaba de ser «Vídeo» pero seguía mostrándolo arriba.
