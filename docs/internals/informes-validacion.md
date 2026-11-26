# Validación e informes

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`.

## Validación (`src/validation/validators.ts`)
`validateCourse(course)` recorre el curso y devuelve una lista de `Issue`
(`{ code, severity: 'error'|'warning'|'info', message, location, screenId?, unitId? }`).
Reglas por pantalla / unidad / curso, p. ej.:
- Pantalla marcada como esqueleto/`content_placeholder` → `warning`.
- **Unicidad de IDs** (`checkIds`): `ID_DUPLICATE` (`error`) si dos entidades cualesquiera
  —pantalla, interacción, módulo, unidad, test o pregunta— comparten `id`. El esquema Zod
  no comprueba unicidad, pero el runtime guarda el estado del alumno por `id`
  (`STATE.results[interaction.id]`, `STATE.visited[screen.id]`): un id repetido mezcla
  progreso y nota. El preflight del GPT (`validate_course`, contrato §11) ya lo bloqueaba;
  esto iguala la paridad en el editor.
- `type` distinto de `cover`/`summary`/`guide` **sin** `objective` → aviso (por eso el editor
  rellena `objective` aunque no se muestre como banner; ver `arquitectura-runtime.md`).
- Imagen sin `alt`, vídeo sin `transcript`, etc.
- **Documentos PDF adjuntos** (`attachments`): `ATTACHMENT_NOT_PDF` y `ATTACHMENT_TOO_BIG`
  (> 10 MB) y `ATTACHMENTS_TOO_MANY` (> 10) son `error`; `ATTACHMENT_NO_TITLE` y
  `ATTACHMENTS_HEAVY` (> 25 MB entre todos) son `warning`. Los límites viven en
  `schema/attachments.ts`, compartidos con `DocumentsEditor`, que ya los aplica al subir:
  estas reglas cubren proyectos editados a mano o generados por script.
- **Preguntas de tests** (final y de unidad): mismas exigencias que las interacciones de
  pantalla — enunciado, respuesta correcta y feedback (`checkQuizQuestions`). Las del test
  final llevan `screenId: '__final__'`; las de tests de unidad llevan `unitId`.
- **Cobertura de objetivos**: un issue `OBJ_NOT_EVALUATED` **por objetivo** no evaluado,
  enlazado (`screenId`) a la primera pantalla que lo declara. El objetivo de una
  interacción es siempre el `objective` de su propia pantalla (no tiene uno propio ni se
  valida por separado); cuentan como evaluación las interacciones `scored` de esa pantalla,
  el test final y los tests de unidad. La comparación es **normalizada**
  (`normalizeObjective` en `src/validation/objectives.ts`: sin acentos, minúsculas,
  espacios colapsados, sin puntuación final) porque la vinculación de las preguntas de
  test era texto libre y abundan pares «casi iguales»; `ObjectiveSelect` (preguntas de
  test) usa el mismo normalizador. No endurecer a comparación exacta.
- **Origen de la nota** (`score_source`): ojo a la semántica real del runtime
  (`computeScore` en `app.js`): `'unit_tests'` = **actividades evaluables** (interacciones
  de pantalla con `scored`), no `assessments.unit_tests`. Reglas: `SCORM_NO_FINAL`
  (final_test sin preguntas, `screenId '__final__'`), `SCORM_NO_ACTIVITIES` (unit_tests sin
  interacciones puntuadas), `SCORM_MIXED_EMPTY`/`SCORM_MIXED_NO_FINAL`/
  `SCORM_MIXED_NO_ACTIVITIES` (mixed sin uno u otro bloque), y
  `SCORM_UNGRADED` (info: `completion_mode: 'screens'` sin test final ni interacciones
  puntuadas — paquete sin nota, p. ej. una bienvenida; sustituye a los errores anteriores,
  que en ese caso no tienen sentido), y
  `SCORM_ACTIVITIES_IGNORED` (aviso: hay interacciones `scored` pero
  `score_source: 'final_test'` → no contarán; hace visible que «puntúa o no» se decide
  en Ajustes, no en la pantalla). El curso de ejemplo usa `score_source: 'mixed'`
  precisamente para arrancar sin este aviso.
- **Narración pendiente**: solo se activa en **cursos narrados** (`Ctx.narrated`). Manda
  el ajuste explícito **`course.narration.mode`** (`'on'`/`'off'`, editable en Ajustes →
  Narración, se guarda en el proyecto); su default `'auto'` mantiene la heurística:
  narrado si alguna pantalla tiene `audio_src` (sin locución un curso sin transcripciones
  es legítimo y no genera ruido). El campo es **opcional en `course.json`** y el GPT debe
  omitirlo (anotado en `contrato-course-json.md`). En pantallas sin `audio_src` (los
  casos con audio/vídeo sin transcripción ya son errores) y que no sean esqueleto:
  `NARR_NO_TRANSCRIPT` (`warning`) si falta transcripción y la pantalla tiene **contenido
  narrable** — mismo criterio que el botón «Generar transcripción»: `buildTranscript(s)`
  no vacío —; `NARR_NO_AUDIO` (`info`, solo pestaña Validación) si hay transcripción pero
  falta el audio. No se duplican: el info solo salta con la transcripción ya resuelta,
  creando el flujo «primero transcripciones (warnings), luego narrar (infos como lista de
  pendientes del TTS)».
- **Transcripción oculta** (`screen.transcript_hidden`, casilla «Sin transcripción para el
  alumno»): la carcasa desactiva el botón «Transcripción» en esa pantalla, así que no se
  exige (`VIDEO_NO_TRANSCRIPT`/`AUDIO_NO_TRANSCRIPT` no saltan). Con locución salta
  `TRANSCRIPT_HIDDEN_AUDIO` (`warning`): quien no pueda oírla se queda sin alternativa
  textual. Además la pantalla queda fuera de la narración automática, así que tampoco
  saltan sus avisos `NARR_*` (de pantalla ni de ítems) — ver `tts-narracion.md`.
- **Accesibilidad (UNE-EN 301 549:2022 = WCAG 2.1 A y AA)**, requisito para acreditar
  formación en modalidad virtual. `A11Y_CODES` (`src/validation/accessibility.ts`) es la
  **fuente única** de qué códigos son «de accesibilidad» y su criterio WCAG (con nivel):
  la usan el diálogo de exportación, la sección «Accesibilidad» del Informe y la
  declaración. Un código de accesibilidad nuevo se emite en `validators.ts` **y** se
  registra ahí; si no, no cuenta. Las reglas que miran la pantalla entera viven en
  `checkScreenA11y`; el análisis de markdown usa las **mismas expresiones que la
  carcasa** (`renderer.js`/`rich()`) para no avisar de algo que no se pinta.
  - Errores: `IMG_NO_ALT` (recurso visual, `image_cards`, `before_after`, `hidden_image`,
    `puzzle` y la imagen base de `hotspots`), `MD_IMG_NO_ALT` (imagen `![](assets/…)` o
    `![ |50](…)` en renglón propio sin alt, en `student_text`, transcripción y cualquier
    texto de la interacción salvo el código de `html_embed`; con URL de YouTube es un
    vídeo y el alt es su título), `HS_NO_LABEL` (zona de hotspots sin etiqueta: la
    carcasa la llamaría «Zona N»), `VIDEO_NO_TRANSCRIPT`, `AUDIO_NO_TRANSCRIPT`,
    `TRANSCRIPT_HIDDEN_VIDEO` (pantalla con vídeo y `transcript_hidden` sin
    `config.transcript` de la interacción `video`, que sí se muestra), `MEDIA_NO_SUBS`
    (recurso visual con `has_voice`, o interacción `video` con archivo y
    `config.has_voice` sin `config.tracks`) y `THEME_LOW_CONTRAST` (`shell.primary_color`
    < 4,5:1 con blanco; es la misma razón para texto blanco sobre el primario y para el
    primario como enlace sobre blanco; `accent_color` no se mide porque la carcasa no lo
    usa como color de texto; el mismo cálculo se ve en vivo en Ajustes → Interfaz).
  - Avisos: `ALT_POOR` (alt = nombre de fichero, empieza por «imagen de»/«foto de»… o
    > 250 caracteres), `LINK_TEXT_VAGUE` (texto «aquí», «pincha aquí», «enlace», «link»,
    «más», «ver»… o una URL como texto), `HEADING_SKIP` (prudente: solo un `###` antes
    del primer `##` cuando la pantalla sí usa `##`; un texto solo con `###` es estilo, y
    el interior de los bloques `:::` se ignora), `YT_CAPTIONS_CHECK` (todo vídeo de
    YouTube: recurso, interacción o en el texto), `VIDEO_AD_CHECK` (uno por pantalla con
    vídeo, WCAG 1.2.5), `EMBED_A11Y` (fijo en `html_embed`), `TRANSCRIPT_HIDDEN_AUDIO` e
    `IX_VISUAL_REQUIRED` (`puzzle`/`word_search`/`crossword` que puntúan —`scored` con
    `score_source` ≠ `final_test`— o bloquean: pantalla `required` +
    `require_interactions` y, además, navegación no libre o finalización por evaluación;
    misma regla que `interactionOk`/`screenSatisfied` de `app.js`).
  - Los avisos de comprobación (`YT_CAPTIONS_CHECK`, `VIDEO_AD_CHECK`, `EMBED_A11Y`) no
    se pueden «resolver» desde los datos: no hay mecanismo para silenciarlos por pantalla
    (decisión: no inventar campos), así que un curso con vídeo o HTML a medida queda
    siempre como «parcialmente conforme» hasta que alguien lo revise a mano. Es lo
    honesto para una autoevaluación.
  - **Exportar SCORM** (`onExportScorm`, `Toolbar.tsx`): con errores de accesibilidad se
    pide confirmación con `confirmDialog({ issues })` —«Este paquete no cumple la UNE-EN
    301 549: N errores de accesibilidad», la lista enlazada (pulsar un issue cancela y
    salta a su pantalla) y «Cancelar» / «Exportar igualmente». Con lista, el foco empieza
    en Cancelar y Enter no confirma. Los avisos no frenan.
- **Congruencia tipo ↔ recurso ↔ interacción** (complemento de las recetas de creación;
  ver `editor-pantallas.md`): avisos —nunca errores— para combinaciones que casi siempre
  son un despiste. `COVER_INTERACTION` (portada con actividad), `VIDEO_NO_MEDIA`
  (pantalla `video` sin recurso de vídeo **ni** interacción `video`), `QUIZ_NO_SCORED`
  (`unit_quiz` sin interacción `scored`), `FORUM_SCORED` (`forum_prompt` con interacción
  puntuable — el foro es actividad externa del campus), `CALLOUT_EMPTY` (un
  `::: tipo` … `:::` sin cuerpo en `student_text` — caja vacía en pantalla; los GPT a
  veces lo emiten). La filosofía: las recetas guían
  al crear, el editor permite todo, y estos avisos señalan lo incongruente sin bloquear.

Uso en UI:
- El badge `.ed-status` con el recuento `errores ⛔ · avisos ⚠` vive **dentro de la
  pestaña «Validación»** (`App.tsx`, memoizado con `useMemo(course)`) y **solo se muestra
  si hay algún error o aviso** (rojo con errores, ámbar solo con avisos); los `info` no
  cuentan. La pestaña Validación se muestra a ancho completo, sin el árbol lateral.
- `ValidationPanel` (`src/components/ValidationPanel.tsx`): issues **agrupados por
  módulo › unidad** (por ids, no parseando `location`), más grupos «Test final» y «Curso y
  SCORM». Los recuadros de severidad del resumen actúan de **filtro** (clic = ocultar/
  mostrar; clase `.is-off`).
- Botón **«Copiar informe»** (en el resumen, solo si hay issues): copia TODOS los issues
  (ignora los filtros, para que el resultado sea determinista) como markdown
  `- ⛔ [CODE] mensaje — ubicación` con cabecera de título y recuentos. Es la entrada del
  ciclo de **autocorrección por el GPT**: el usuario lo pega en ChatGPT y el GPT corrige
  cada código según `docs/gpt/tabla-autocorreccion.md`. Por eso los códigos son parte del
  contrato con el GPT: **todo validador nuevo o cambiado en `validators.ts` debe
  añadir/actualizar su fila en esa tabla** (convención también en `CLAUDE.md`). El
  informe exportado (`report.ts`) imprime igualmente `[CODE]` en riesgos y pendientes.

### Enlaces al editor (invariante de navegación)
Todo issue con destino editable **enlaza a su superficie de edición**. La resolución vive
en `src/components/IssueList.tsx` (`useIssueTarget` + `IssueItem`, compartidos por
Validación e Informe):
- `screenId` → `goToScreen(id)` del store (= `selectScreen` **+** `activeTab: 'editor'`);
  `'__final__'` abre el `FinalTestEditor`.
- `unitId` → primera pantalla de la unidad (no hay editor de unidad).
- `THEME_LOW_CONTRAST` → ventana Ajustes → Interfaz (Apariencia).
- Códigos de origen de la nota (`SCORM_NO_ACTIVITIES`, `SCORM_MIXED_*`), de historial de
  estructuras (`LAYOUT_CHANGED`, `LAYOUT_IDS_REPLACED`) y de memoria de progreso
  (`SUSPEND_NEAR_LIMIT`, `SUSPEND_OVER_LIMIT`, ver `../suspend-data.md`) → abren la
  ventana de Ajustes correspondiente; su estado (`settingsModal`) vive en el store para
  poder abrirse desde aquí.
- Sin superficie de edición en la UI (`scorm.identifier`…) → sin enlace: solo se editan
  vía JSON/GPT.

## Informe (`src/report/report.ts`, `ReportPanel`)
Pestaña «report». `buildReport(course)` devuelve el **modelo estructurado** (`ReportData`):
recuentos, matriz de trazabilidad (con columna «Ubicación» módulo › unidad y `screenId`
por fila), tabla de preguntas/respuestas (con columna «Origen» y `screenId`), checklists,
riesgos (errores) y pendientes (avisos). Incluye pantallas, **tests de unidad** y test
final; los tests de unidad enlazan a la primera pantalla de su unidad.

Incluye además `accessibility` (hallazgos de accesibilidad agrupados por criterio WCAG,
`groupByCriterion`) y `conformance` (situación calculada: «plenamente conforme» solo con
0 errores y 0 avisos de accesibilidad; si no, «parcialmente conforme» — nunca
«conforme» con errores). Es la sección 6 del informe.

**Declaración de accesibilidad** (`generateA11yStatementHtml`, botón en esa sección):
HTML autocontenido e imprimible, todo texto escapado (`escHtml`, anti-XSS). Pide
entidad, contacto y versión (prellenada con «Versión publicada n.º N» según
`scorm.layouts`); no se guardan en el proyecto. Contiene norma de referencia, situación,
contenido no accesible (errores = falta de conformidad; avisos = pendiente de
comprobación manual), medidas de la carcasa (texto fijo: revisarlo si cambia
`src/runtime/`), método («autoevaluación con el validador…») y el aviso de que no es
homologación ni acreditación.

Ese modelo alimenta **dos renderizadores** (única fuente):
- `ReportPanel` (`src/components/ReportPanel.tsx`): render **nativo React** con enlaces al
  editor en matriz, preguntas, riesgos y pendientes (reutiliza `IssueItem`), y «ver en
  Validación» en los criterios fallidos de las checklists. No usa iframe.
- `generateReportMarkdown` / `generateReportHtml`: exportaciones (descarga MD/HTML e
  Imprimir/PDF), sin enlaces. Las celdas pasan por `mdCell()` (sustituye `|` por `¦` y
  aplana saltos de línea) porque el conversor MD→HTML propio parte las filas por `|`.

## Duración estimada del curso (`src/report/estimateDuration.ts`, chip de Toolbar)
`CourseTimeIndicator` (chip «Duración estimada: ~X» junto a `SuspendSizeIndicator` en la
Toolbar, visible siempre y creciendo solo al añadir pantallas) da una cifra ORIENTATIVA de
lo que le llevaría a un alumno completar el curso ENTERO: lectura de texto + hacer cada
actividad (según su tipo y tamaño) + vídeos + audio de locución. No es una medición real
(no hay telemetría de alumnos) ni confundir con «Duración total del audio generado» del
panel de Narración (esa es solo el audio; esta es todo el curso) — son heurísticas de
diseño instruccional pensadas para hacerse una idea mientras se monta el curso, no una
cifra exacta a prometer al cliente.

- **Lectura**: `READING_WPM = 130` palabras/minuto (más lenta que la lectura de ocio
  ~200-250 ppm: heurística habitual en diseño instruccional para contenido que hay que
  retener, no solo pasar la vista). Se aplica al título, `student_text`, y al enunciado +
  instrucciones de la interacción (`inlinePlain`/`plainText`, reutilizados de
  `buildTranscript.ts` — mismo criterio de «texto legible» que la narración).
- **Por tipo de interacción** (`EVALUABLE` en `estimateDuration.ts`): tabla BASE + POR
  UNIDAD (opción/paso/palabra/zona/pregunta…) por tipo evaluable — cubre orientarse en la
  actividad más leer y manipular cada unidad (p. ej. `single_choice`: 5 s + 6 s por
  opción; `crossword`: 15 s + 16 s por palabra). Los tipos **informativos** no revelables
  (`before_after`/`case_practice`/`scenario_decision`) reutilizan `interactionPlain()` (el
  mismo texto que se narra) más un margen por tipo — `case_practice` lleva el margen más
  alto (90 s): el alumno piensa/escribe en papel antes de autoevaluarse (ver
  `interacciones.md`). Los **revelables** (accordion/tabs/flip_cards/timeline/image_cards/
  flashcards) usan `itemsOf()` para sumar el texto REAL de cada ítem (label + cuerpo, que
  `interactionPlain` deja fuera a propósito) más un pequeño margen de revelado por ítem.
  `html_embed` no es estimable por tamaño (contenido a medida): usa el tiempo que declara el
  autor en `config.est_seconds` (0-3600 s, campo «Tiempo estimado» del editor) y, sin él, un
  tiempo fijo (`HTML_EMBED_SECONDS`, 30 s). Un curso con interactivos a medida largos (simuladores,
  historias con decisiones) debe declararlo o el chip de duración se queda corto.
- **Vídeo**: de archivo (`visual_resource` o `config.src`/`config.youtube` de la
  interacción `video`), duración REAL vía sondeo de metadatos (ver más abajo); de YouTube,
  duración FIJA asumida (`YOUTUBE_DEFAULT_SECONDS`, 4 min) — el editor es una SPA sin
  backend (ver `CLAUDE.md`) y no hay forma de conocer la real sin una llamada a una API
  externa con clave. La interacción `video` suma además sus preguntas de pausa.
- **Audio de locución**: si la pantalla tiene `audio_src`, su duración REAL **sustituye**
  (no se suma a) el tiempo de lectura de esa pantalla — se escuchan a la vez que se mira,
  no una cosa detrás de otra (`Math.max(textSeconds, audioSeconds)` en `CourseTimeIndicator`,
  no al revés: si el audio es más corto que el texto, manda el texto, no se acorta la
  estimación).
- **Partido en síncrono + async**, igual patrón que el resto de agregados con archivos:
  `estimateScreensSync()` es puro (texto + heurística por tipo + YouTube fijo, sin leer
  ningún archivo); la duración real de audio/vídeo de archivo la miden `CourseTimeIndicator`
  y `TtsPanel` con el hook compartido `useDurationSum()` (`src/media/useDurationSum.ts`,
  sobre `probeDuration()` en `src/media/probeDuration.ts` — mide solo metadatos, nunca
  reproduce, con caché por ruta+tamaño y tope de 8 s por archivo). Un archivo que no se
  pueda medir se descarta de la suma (no bloquea el resto) y el tooltip del chip avisa de
  cuántos quedaron fuera.
