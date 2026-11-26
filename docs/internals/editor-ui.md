# Editor (UI): superficies, Ajustes, sync e historial

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`. Áreas con doc propio: el árbol y el
> formulario de pantalla en `editor-pantallas.md`; el editor de texto enriquecido en
> `editor-richtext.md`. Aquí queda lo **transversal** del editor.

## Superficies de edición (no todo es «pantalla»)
El panel central (`App.tsx`) muestra `ScreenEditor` salvo cuando el nodo seleccionado en
`CourseTree` es un **id sintético**:
- **`__final__`** (nodo «Evaluación → Test final») → `FinalTestEditor`: edita
  `assessments.final_test` (título, `one_question_per_screen`, preguntas/opciones/feedback
  y `learning_objective` por pregunta) vía `setFinalTest` del store.
- **`__glossary__`** y **`__bibliography__`** (sección «Materiales» del árbol) →
  `GlossaryEditor` / `BibliographyEditor` (`MaterialsEditor.tsx`): editan `course.glossary`
  (término+definición, botón «A→Z» de orden alfabético) y `course.bibliography` (cita+URL
  opcional) vía `setGlossary`/`setBibliography` (reemplazo completo, coalescido en el
  historial). Eliminar una entrada con contenido pide confirmación (`confirmDialog`). Los
  avisos `GLOSSARY_EMPTY`/`BIBLIO_EMPTY` de Validación enlazan a estos editores
  (`useIssueTarget`). En la carcasa se ven en los modales «Glosario»/«Recursos».
- **`__documents__`** (también en «Materiales») → `DocumentsEditor`: PDF adjuntos
  (`course.attachments`, ver «Documentos PDF adjuntos» en `editor-pantallas.md`); los
  avisos `ATTACHMENT*` enlazan aquí.

## Sistema de iconos propio (`Icon.tsx`)
Toda la iconografía del **editor** sale de `src/components/Icon.tsx`: SVG inline
minimalistas (caja 24×24, trazo 1.8 redondeado, `currentColor`), sin dependencias.
`<Icon name="trash" size={14} />`; añadir un icono = añadir una entrada a `PATHS`
(el tipo `IconName` se deriva de las claves). El chrome del editor no usa emojis.
- **Catálogo tipado**: `SCREEN_TYPE_ICONS` (`labels.ts`), `screenRecipes.ts` e
  `interactionRecipes.ts` guardan **nombres de icono** (`IconName`), no emojis; los
  renderizan `CourseTree`, `ScreenEditor` (chip del título y cabecera de interacción)
  y las tarjetas de los dos selectores (`.ed-recipe-ico`: chip cuadrado tintado).
- **Color semántico por familia**: `TYPE_COLORS`/`SCREEN_TYPE_COLORS`/`screenTypeColor()`
  en `labels.ts` (estructura=índigo `#5265c4`, contenido=teal `#0f9490`, práctica=ámbar
  `#c27b06`, evaluación=frambuesa `#c2417e`, materiales=terracota `#bd5d52` —Glosario y
  Recursos—, otros=gris `#7d8694`), con `RECIPE_GROUP_COLORS` (tarjetas de pantalla) e
  `INTERACTION_GROUP_COLORS` + `interactionColor()` (grupos de interacción). Son las
  familias de la paleta corporativa de teleformación (los colores de los callouts)
  **saturadas** para leerse a 12px. `<Icon color=…>` fija el color; el chip de tarjeta lo
  recibe vía la variable CSS `--ico-c`.
- **Botones**: base global con radio 8px, transición y hover con tinte primario
  (`color-mix`); `.ed-icobtn` para botones de solo-icono (fantasma, 26px, con variante
  `.ed-icobtn-danger` que enrojece en hover). Los botones con colores propios
  (`.ed-docstate`, `.ed-pill`, `.ed-danger`…) pisan el hover base con reglas
  `:hover:not(:disabled)` explícitas. Los `<details>` (folds y unidades del árbol)
  usan un **chevron CSS propio** (borde girado) en vez del marcador nativo.
- **Excepciones deliberadas** (NO migrar a SVG): la paleta de emojis de los bloques
  personalizados y los botones de callouts del `RichTextArea` (muestran el icono real
  que viaja en `course.json` y pinta la carcasa), la cabecera del `CalloutNode` de TipTap
  (icono/etiqueta = contenido, ver `editor-richtext.md`), todo `src/runtime/`, y el
  informe exportado (`report.ts`, documento autónomo). Los mensajes de estado
  transitorios usan «✓»/«Error:» tipográficos.

## ⚙ Ajustes: menú con ventanas independientes (no nodo del árbol)
**Ajustes** es un **menú desplegable ⚙**, con opciones **independientes**, cada una con
**su propia ventana** (no un modal con pestañas). Vive en `EditTools` (`Toolbar.tsx`),
junto a Deshacer/Rehacer, en la fila de **pestañas** (no en la barra superior): son
herramientas de la **edición del curso abierto**, no chrome general de la app — ver
«Pestañas y toolbar» más abajo. El estado de qué ventana está abierta vive en el store
(`settingsModal: SettingsModalKind`):
- **Curso (Finalización)** → `CourseSettingsModal` con `CourseSettingsSection`:
  `scorm.rules` + `mastery_score` (nota mínima, `score_source`, `mixed_final_weight`,
  `completion_mode`, % pantallas, `require_interactions`, intentos, navegación) vía
  `updateScorm`. Incluye dos herramientas de lote (mismo patrón: input + botón «Aplicar
  a todas…» → acción del store, un solo paso de deshacer, valor del input NO persistido
  porque no es un campo de `course.json`, sobrescribe tras `confirmDialog`):
  - **«Tiempo mínimo por pantalla»**: 0–30 s → `setAllMinTime`, sobrescribe
    `min_time_seconds` de cada pantalla.
  - **«Intentos por defecto (actividades evaluables)»**: 0 (∞) o más → `setAllAttempts`,
    sobrescribe `interaction.attempts` de toda interacción cuyo tipo respete este ajuste
    (`interactionRecipe(...).supportsAttempts`; ver `interacciones.md`).
- **Objetivos de aprendizaje** → `ObjectivesModal`, el gestor transversal de objetivos
  (ver `editor-pantallas.md`).
- **Interfaz (Apariencia)** → `AppearanceModal` con `AppearanceSection`: preferencias de
  presentación de la carcasa (`shell`) vía `updateShell` — **Marca y color**
  (`shell.brand`; `shell.primary_color`/`shell.accent_color`, cada uno con picker
  `input[type=color]` + campo hex, `.ed-color-row`; el runtime los aplica en
  `applyBranding()`, ver `arquitectura-runtime.md`) y **Animaciones** (`shell.motion`,
  none/subtle/rich/vivid, y `shell.motion_speed`, fast/normal/slow). Decisión: la apariencia NO
  va con finalización — es config de interfaz, con ventana propia.
  - **Paletas típicas**: fila de botones `.ed-palette-swatch` (`PALETTES` en
    `CourseSettingsEditor.tsx`) sobre los dos pickers — cada uno muestra dos puntos de
    color superpuestos (acción + estructura) y, con un clic, escribe ambos campos a la
    vez (`updateShell({ primary_color, accent_color })`). `.is-active` se calcula
    comparando el hex actual con cada preset (no hay un campo `theme` aparte que
    recordar): si el autor toca cualquiera de los dos pickers después, ningún swatch
    queda marcado — son un atajo sobre los mismos dos campos, no un modo distinto.
- **Narración (Audio IA)** → `NarrationModal` con `NarrationSection`: config TTS
  (localStorage) y generación masiva; ver `tts-narracion.md`. No hay botón de narración
  suelto en la toolbar: todo entra por este menú.
Las ventanas comparten el marco genérico `SettingsWindow` (`SettingsModal.tsx`): cabecera,
Escape/clic-fuera/✕, y `busy` opcional que bloquea el cierre (la narración lo reporta con
`onBusyChange` mientras genera). La generación TTS por pantalla del `ScreenEditor` sigue
existiendo y su aviso remite a «⚙ Ajustes → Narración».

## Ayuda: manual integrado y tour guiado
Menú **Ayuda** en la `Toolbar` (barra superior, junto a «Archivo ▾») con tres entradas:
- **Manual de usuario** → `HelpModal` (`settingsModal: 'help'`, reutiliza `SettingsWindow`
  en modo `wide`): índice lateral + contenido con scroll propio (`.ed-help`). El contenido
  vive como JSX en `HelpModal.tsx` (audiencia: autores con nociones de e-learning, tono
  paso a paso), con cobertura completa del editor (interacciones, narración, ajustes,
  exportación, nube — ver `nube-sincronizacion.md` para el detalle técnico que resume la
  sección «Nube y trabajo en equipo»). La sección «Interacciones» **no enumera los tipos a mano**: recorre en
  vivo `INTERACTION_RECIPES`/`INTERACTION_GROUPS` (`interactionRecipes.ts`) y
  `interactionTypeLabel` (`labels.ts`), así que un tipo nuevo aparece solo con darle su
  entrada en el catálogo — no hay que tocar el manual. Las **capturas** se cargan por
  nombre desde `src/assets/help/*.png` vía `import.meta.glob`: añadir/actualizar una =
  soltar el png; si falta, su figura no se pinta (el manual no se rompe). Para
  regenerarlas se conduce la app real con Playwright (receta en `.claude/skills/verify`)
  sobre el curso demo; ojo: para capturar un modal más alto que el viewport hay que
  agrandar el viewport, o el PNG sale con una banda
  gris sin pintar.
- **Tour guiado** → `GuidedTour.tsx`: motor propio sin dependencias. Las paradas se
  declaran en `STEPS` (selector `data-tour="…"`, pestaña que debe estar activa, título y
  texto); los atributos `data-tour` viven en `Toolbar.tsx` y `App.tsx`. El overlay es un
  **velo único** a pantalla completa con el hueco recortado con
  `clip-path: path(evenodd, …)` sobre el elemento resaltado, más contorno y tarjeta
  (debajo/encima del target según quepa; centrada en las paradas sin target). Si el
  selector no encuentra el target (p. ej. árbol plegado), la parada **se salta**.
  Teclado: Esc sale, ←/→/Enter navegan. Al terminar o salir se marca
  `localStorage['ed:tourDone']`.
- **Atajos de teclado** → `ShortcutsModal` (vive aquí, no en ⚙ Ajustes; `F1` y `Ctrl+/`
  siguen abriéndolo).
**Primer arranque**: dos avisos independientes, ambos de una sola vez (localStorage,
cualquier acción los descarta para siempre). `WelcomeGate` (`WelcomeGate.tsx`) es el
overlay a pantalla completa con las cuatro opciones de partida (empezar en blanco, ver la
demo, abrir archivo, abrir de la nube) — ver `persistencia-scormproj.md`. `WelcomeTip` (en
`GuidedTour.tsx`) es la tarjeta discreta abajo a la derecha que ofrece el tour y el
manual; solo aparece si no existen `ed:tourDone` ni `ed:welcomeDismissed`. Ambos pueden
coexistir en la misma carga (el gate ocupa el centro, el tip la esquina).

## Etiquetas en español (no exponer identificadores del esquema)
La UI del editor **nunca muestra los valores internos en crudo** (`content_placeholder`,
`single_choice`…): pasa por `src/schema/labels.ts` (`screenTypeLabel`/
`interactionTypeLabel`, con fallback al valor crudo si aparece un tipo nuevo sin
etiqueta). Los valores internos del `course.json` no cambian (contrato). Al añadir un
tipo al esquema, añade su etiqueta aquí.

## Convenciones de homogeneización
- **Textos de ayuda**: siempre clases — `.ed-hint` (base, margin 0), `.ed-hint-lead`
  (párrafo introductorio con margen inferior) y `.ed-hint-warn` (aviso inline rojo).
  Nada de estilos inline para hints.
- **Botones de borrar**: 🗑 (con `title`) en filas de lista y elementos del árbol; texto
  `ed-danger` («Eliminar test final»…) solo para bloques enteros. La ✕ queda reservada
  para **cerrar** (modales) — nunca borra filas.
- **«Correcta»**: criterio documentado, no unificado a propósito — en las
  **interacciones** es checkbox porque puede haber varias correctas (cualquiera cuenta
  como acierto; los validadores solo exigen `some(correct)`) y el `title` del checkbox lo
  aclara; en el **test final** es radio porque ahí la semántica es exactamente una.
- **`SegIcons`** (`src/components/SegIcons.tsx`): control segmentado reutilizable; admite
  `disabled` e `icon` como `ReactNode` — un `<Icon>` del sistema propio o **texto corto**
  («Sutiles», «½»…). Se usa en recurso visual, posición de la interacción, Apariencia
  (nivel y velocidad de animación) y el puzzle (columnas/filas 2–5).
- **Renombrado**: dos mecanismos que son patrones distintos a propósito — título-input de
  cabecera (`.ed-title-input`/`EditableHead`) para las superficies de edición e
  `InlineRename` (lápiz → input) para etiquetas compactas (árbol, título del curso en la
  toolbar; ver `editor-pantallas.md`). Unificarlos empeoraría uno de los dos contextos.

## Layout global y atajos
- **Árbol redimensionable**: `.ed-main` en la pestaña Editor es
  `[ancho árbol] 6px 1fr`; el ancho vive en `App.tsx` (estado `treeW`, persistido en
  `localStorage['ed:treeW']`; ojo: `Number(null) === 0`, el init trata `null` aparte).
  El separador `.ed-splitter` se arrastra (pointer capture, clamp 200–560; soltar por
  debajo de ~80 px pliega) y con **doble clic pliega/despliega**. Con el árbol plegado el
  `aside` **no se renderiza** y el grid pasa a `6px 1fr` — si siguiera en el grid (aunque
  fuera `display:none`) los ítems se recolocarían de columna.
- **Atajos**: `Alt+↓/↑` pantalla siguiente/anterior (recorrido plano de las pantallas del
  árbol; desde un nodo sintético baja al primero/sube al último), `F1` o `Ctrl+/` abren
  «Atajos de teclado». Los de siempre: `Ctrl+S`/`Ctrl+Z`/`Ctrl+Mayús+Z`/`Ctrl+Y`.

## Confirmaciones (modal propio, no `window.confirm`)
Diálogo de confirmación promisificado: `confirmDialog({ title, message, confirmLabel,
cancelLabel, danger })` (`src/store/confirm.ts`, store zustand) devuelve
`Promise<boolean>` para usar con `await` desde código imperativo. El modal
(`ConfirmModal`, montado una vez en `App`) se centra, tiene Aceptar/Cancelar,
Enter=aceptar/Esc=cancelar y variante `danger` (icono de alerta rojo, botón rojo).
Preferir esto a `window.confirm`. Con `issues` (lista de `Issue` del validador) el modal
se ensancha y muestra la lista con `IssueItem` (cada fila salta a su pantalla y cierra el
diálogo como «Cancelar»); en ese modo el foco empieza en Cancelar y Enter no confirma —
lo usa el aviso de accesibilidad al exportar SCORM (`informes-validacion.md`).

## Sincronización Editor ↔ Vista estudiante (bidireccional)
- **Editor → Vista:** al abrir la pestaña, la vista arranca en la pantalla seleccionada.
  `buildPreviewHtml(course, assets, startScreenId)` inyecta `window.__START_SCREEN_ID__`;
  `app.js` lo respeta en modo autor. El id de arranque se congela con `useRef` al montar
  (`StudentPreview.tsx`) para no recargar el iframe al navegar dentro de la vista.
- **Vista → Editor:** `app.js` emite `postMessage({type:'me-screen-change'})` en cada
  `goTo` (solo en previsualización, condicionado a `__AUTHOR_MODE__` — no al conmutador
  de modo autor —; excluye el test final `__final__` y la pantalla de resultados
  `__results__`); `StudentPreview` escucha y llama a `selectScreen(id)`. Al volver a
  Editar, se sitúa donde quedaste.
- **Conmutador de modo autor:** píldora `.me-author-toggle` anclada a `.me-body`, sobre
  la esquina superior derecha del área de contenido (`setupAuthorToggle` en app.js;
  persistente, no la afecta el re-render de las diapositivas ni el scroll) que activa o
  desactiva en vivo la variable `AUTHOR` para probar el comportamiento real (gating de
  navegación, tiempo mínimo —se reinicia `screenEnter` al desactivar—, interacciones
  obligatorias). Por defecto activado. Solo se crea si existe `__AUTHOR_MODE__`: el SCORM
  exportado nunca lo lleva. Oculto en impresión.
- **Endurecimiento de la vista previa:** el iframe `srcDoc` comparte origen con el editor
  (no lleva `sandbox` porque rompería las blob URLs de los assets), así que cualquier
  dato del curso interpolado en el HTML de `buildPreviewHtml` debe escaparse o validarse.
  `language` se valida dos veces: en el schema (`LanguageCode`, regex tipo BCP-47 con
  `catch('es')`) y de nuevo antes de interpolarlo en `lang=…`. El listener de
  `postMessage` solo acepta mensajes cuyo `e.source` sea el `contentWindow` del propio
  iframe. Ojo: la CSP desplegada (`netlify.toml`) la **hereda** el iframe `srcdoc`, por
  eso debe mantener `'unsafe-inline'` en `script-src`/`style-src` y `blob:` en
  `img/media-src`; endurecerla sin probar la Vista estudiante la deja en blanco.

## Historial deshacer/rehacer
Implementado a mano en `src/store/courseStore.ts` (sin librerías). Pilas `past`/`future`
de instantáneas `{ course, selectedScreenId }`, tope 50 pasos.
- `snapshot(coalesceKey?)` apila el estado **antes** de cada mutación e invalida
  `future`. Prácticamente toda mutación de contenido del store la invoca (más de 25 puntos
  de llamada en `courseStore.ts`): desde `updateScreen`/`addScreen`/`duplicateScreen`/
  `deleteScreen`/`moveScreen`/`setFinalTest`/`updateScorm` hasta `addModule`/`addUnit`/
  `removeUnit`/`removeModule`, los renombrados (`updateCourseInfo`/`updateModule`/
  `updateUnit`), `remapObjective` y `setGlossary`/`setBibliography` (y sus títulos). La
  lista no es exhaustiva a propósito — el criterio simple es «toda mutación de contenido
  pasa por `snapshot()`»; lo que **no** lo invoca (navegación, plegado del árbol, ajustes
  de localStorage) queda descrito explícitamente donde corresponde.
- **Coalescencia de tecleo**: ediciones seguidas en la misma pantalla (`update:<id>`)
  dentro de 400 ms se agrupan en un solo paso. → `Ctrl+Z` mientras escribes deshace todo
  el bloque de tecleo reciente, no carácter a carácter (decisión aceptada).
- El historial se **vacía** al cargar otro documento (`hydrate`, `importJson`,
  `resetSample`, `setCourse`). La navegación (`selectScreen`) **no** genera pasos.
- UI: botones ↶/↷ (icono solo) en `EditTools` (`Toolbar.tsx`), fila de pestañas; atajos en
  `App.tsx` (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Mayús+Z` o `Ctrl+Y`). El autosave persiste los
  cambios solos.

## Pestañas y toolbar
`courseStore.activeTab: Tab` (`'editor'|'preview'|'validation'|'report'`) es la fuente
única de la pestaña activa (también para que el badge de validación navegue a ella).

El chrome se reparte en **dos filas**, agrupado por a qué escala pertenece cada cosa —
no por dónde «cabía» — para que Deshacer nunca comparta caja con Ayuda general:
- **`Toolbar`** (barra superior): identidad del proyecto y chrome de la **app**. A la
  izquierda, logo + título del curso editable (`InlineRename` → `updateCourseInfo`) +
  pastilla de estado de guardado (`.ed-docstate`, ver `persistencia-scormproj.md`) — el
  grupo que responde a «¿en qué proyecto trabajo y está a salvo?». A la derecha, el chip
  de cuenta/nube (`.ed-session-chip`; sesión de usuario, no del documento) y los menús
  «Archivo ▾»/«Ayuda ▾», que no dependen del curso abierto.
- **`.ed-tabs`** (fila de pestañas): a la izquierda, el conmutador de vista
  (Editor/Vista estudiante/Validación/Informe) con el badge `.ed-status`. A la derecha,
  **`EditTools`**: Deshacer/Rehacer (icono solo, sin texto) y «⚙ Ajustes» — herramientas
  de la edición del curso, por eso comparten fila con el propio selector de vista y no la
  barra superior.

Clases del editor con prefijo `ed-`.
