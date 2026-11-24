# Ingesta: el GPT generador y los ficheros de conocimiento (`docs/gpt/`)

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`. **Ojo:** los ficheros de `docs/gpt/`
> son EXTERNOS — se suben a ChatGPT. No confundir con la doc interna de `docs/internals/`.

El contenido de los cursos **no se teclea a mano**: lo genera un **GPT de ChatGPT**
(diseñador instruccional) a partir de un PDF/Word, y SCORMEditor lo abre. Ese GPT es la
«fuente» del documento, así que su contrato de salida y el formato que abre el editor
**deben ir sincronizados**.

- **Salida del GPT = `.scormproj`** (no un `course.json` suelto): con Code Interpreter
  empaqueta el `course.json` + las imágenes extraídas del PDF en el ZIP `.scormproj`.
  Fallback (sin Code Interpreter): solo `course.json` en texto.
- **Invariante de ingesta:** las claves de las entradas `assets/…` del ZIP que produce el
  GPT deben **coincidir literalmente** con las rutas que el `course.json` referencia
  (`visual_resource.src`, `hotspots.image`, `tracks[].src`, `audio_src`). Es el mismo
  contrato que `loadProjectFromBlob()` espera (ver `persistencia-scormproj.md`). Si una
  imagen no existe, el GPT pone `kind:"none"` + nota en `editor_notes`, nunca un `src`
  roto. Los enums de presentación de `visual_resource` (`layout`, `media_width`,
  `media_align`, `media_ratio`) **toleran `""`** en el esquema (`course.schema.ts`, `z.preprocess` →
  default): los GPT a veces lo emiten y rompía la carga; aun así el contrato les ordena
  **omitir la clave** en vez de emitir `""`.
- **Arquitectura de los docs:** las Instructions llevan solo los **guardarraíles siempre
  activos**; el detalle es **material de referencia** en los ficheros de Knowledge. Las
  Instructions ordenan al GPT **leer** esos docs con Code Interpreter antes de generar
  (así el Knowledge se consulta de verdad, no solo por RAG). Motivo: el campo
  Instructions tiene un **límite duro de 8000 caracteres** (verificar con `wc -m` tras
  editar `instrucciones-gpt.md`).
- **9 ficheros de conocimiento en `docs/gpt/`** (mantenerlos al día si cambia el formato
  `.scormproj`, el esquema de `course.json`, `autosave.ts` o el `renderer.js`):
  - `instrucciones-gpt.md`: system prompt (Instructions). Solo guardarraíles. **Límite
    duro de 8000 caracteres** (verificar con un conteo de codepoints, no `wc -m`: la
    consola puede contar bytes en vez de caracteres) — casi sin margen (~8000/8000),
    cualquier adición exige recortar en otro sitio.
  - `contrato-course-json.md`: referencia normativa del `course.json`; §1 incluye la
    regla de **IDs deterministas** (secuenciales por orden: `m1/u1/s01…`, `sNN_i01`,
    `A01/Q01…`; al corregir se conservan los existentes — los IDs «inventados»
    duplicaban en cursos largos); §4.1 markdown/callouts/formato, **§11 Empaquetado
    `.scormproj`** (builder Python `build_scormproj` / `extract_pdf_images` /
    **`validate_course`**, preflight que replica en Python las reglas §9 y los
    guardas duros del esquema Zod — enums cerrados de pantalla/interacción (el GPT
    emitía `interaction.type: "reflection"`, que es tipo de pantalla) y `unit_id`
    obligatorio en `final_test`/`unit_tests`, errores que solo afloraban al abrir
    el proyecto en el editor; también replica los validadores por tipo de las
    prácticas de varios pasos (`SS_*`, `DT_*` con el mismo recorrido del grafo,
    `CALC_*` con un **evaluador de fórmulas en Python** — tercera copia de la
    gramática de `evalFormula`/`src/calc/formula.ts`: si cambia, cambiar las tres);
    `build_scormproj` lo ejecuta y aborta con ERRORes, de modo que el GPT corrige en
    origen lo que antes solo afloraba al abrir el proyecto en el editor — idea tomada
    del flujo «valida y regenera con el error» de eXeLearning). **Manda en caso de
    conflicto.**
  - `ejemplo-course-json.md`: ejemplo dorado (few-shot) de un `course.json` válido.
  - `guia-diseno-interacciones.md`: criterio pedagógico (segmentación, formato,
    interacciones, callouts, antipatrones).
  - `flujo-factoria-unidades.md`: procedimiento por fases para **unidades grandes**
    (inventario → temas parciales auditables `.scormpart` → fusión), con control de
    cobertura y helper `merge_unit`. Incluye el **prompt reforzado** recomendado para
    el usuario (en «Órdenes de trabajo típicas»): re-ancla en el mensaje las reglas
    más incumplidas como bloqueantes; probado con buen resultado. También la orden
    **«con guion previo»** («…y enséñame antes el guion de pantallas»): una sola
    parada para aprobar/corregir el guion antes de la producción autónoma.
  - `referencia-rapida.md`: modos, valores por defecto, accesibilidad, SEPE, evaluación y
    checklist de validación.
  - `tabla-autocorreccion.md`: cierra el ciclo generar→validar→corregir. Mapa **código
    del validador → causa raíz → corrección canónica → quién corrige** (GPT / editor
    humano / según caso). El usuario pega el informe que produce el botón «Copiar
    informe» de la pestaña Validación (`- ⛔ [CODE] mensaje — ubicación`) y el GPT
    corrige por código, sin que el usuario tenga que diagnosticar (ciclo probado con un
    informe real, con buen resultado). La columna «Quién»
    evita que el GPT «resuelva» inventando lo que es tarea del editor humano
    (`NARR_NO_AUDIO`, imágenes de tipos vetados, `EDITOR_NOTE`…). **Invariante de
    mantenimiento**: todo validador nuevo o cambiado en `validators.ts` añade/actualiza
    su fila en esta tabla (misma disciplina que sincronizar el contrato); y si una
    conversación con el usuario fija un criterio de corrección nuevo, se vuelca a la
    fila correspondiente al cerrar la tarea.
  - `ingesta-moodle.md` (jul 2026): fuente alternativa a PDF/Word — backup Moodle
    (`moodle2`: `moodle_backup.xml`+`activities/`+`sections/`+`files/`+`questions.xml`).
    Solo sustituye el **paso de extracción** (función Python `extract_moodle_backup`,
    estándar/sin dependencias, distinta de `extract_text_markdown` que es solo para
    PDF): el resto del contrato y del flujo de fábrica no cambian, el GPT enriquece
    igual (portada, objetivos, interactividades, cierre). Reglas propias de esta
    fuente: las páginas de Moodle son una **pista** de corte y de orden (nunca perder
    ni reordenar contenido), **no un molde 1:1** — páginas seguidas con el mismo
    `title` o fragmentos de una misma lista se fusionan en una pantalla/interactividad
    bien formada, igual que con un PDF (corregido jul 2026 tras detectar en producción
    que la versión anterior, «nunca fusionar dos páginas», producía títulos repetidos
    y contenido fragmentado — peor que con PDF); el `title` de página de Moodle
    **nunca** se copia literal (dato de gestión interna, no editorial); y las **cajas
    `caja-COLOR`** se conservan crudas (marcador `[CAJA]`) para que el GPT las
    clasifique en un callout por el rótulo de su `<h4>`, con una tabla de partida.
    **`check_moodle_titles`** (función Python, preflight mecánico igual en espíritu a
    `validate_course` §11 pero para calidad editorial): tras tres rondas donde reglas
    en prosa sobre títulos se incumplían de una forma nueva cada vez (copiar el título
    de página → copiar un `##` repetido → títulos de ítem genéricos por plantilla
    «Aspecto 1»/«Clave 2» + títulos de pantalla truncados a mitad de frase), se
    sustituyó/complementó la prosa por un chequeo mecánico obligatorio a CERO WARN
    antes de empaquetar cada `.scormproj` — detecta ítems con título de plantilla,
    títulos truncados (recorte literal del arranque del cuerpo), numeración de Moodle
    sin quitar en encabezados, negritas `**` desemparejadas y títulos duplicados.
    Distinto de la herramienta determinista `scripts/moodle-import/` (mapeo literal sin
    enriquecer, ver más abajo): son dos vías paralelas para el mismo tipo de fuente.
  - `marcas-autoria.md` (jul 2026): capa **opcional y aditiva** sobre la ingesta
    automática, con cuatro familias de marca `{{alias}}…{{/alias}}` (alias en español).
    **Marca de corte** `{{diapositiva}}`: fija el contenido EXACTO de una pantalla —
    ni se parte ni se fusiona con lo vecino, y **manda incluso sobre reglas de
    estructura** normalmente estrictas (evaluable siempre en pantalla propia,
    texto+imagen+interacción nunca juntos); si se salta alguna, queda anotado en
    `editor_notes` como decisión editorial del autor, no error de segmentación. El
    documento no tiene que estar cubierto de cortes: puede haber cero, uno o varios,
    y el resto se sigue segmentando por el criterio automático. **Marcas de
    interactividad** (p. ej. `acordeon`, `opcion_unica`, `decision`; catálogo completo
    en el doc): fijan el tipo, no el límite de pantalla — pueden ir anidadas dentro de
    una `{{diapositiva}}` (como mucho una, por el límite de un `interaction` por
    pantalla; con más de una, solo la primera cuenta y el resto se saca a una pantalla
    automática con nota) o sueltas en el texto; algunas admiten un formato literal
    (opciones con `*`, comentario tras ` — `, guion `[n] Nombre: … → m` / `FINAL BUENO:`
    de la conversación, `Dato = valor` / `¿Resultado? = operación` del cálculo). **Marcas
    de destacado** (`consejo`, `atencion`, `importante`, `sabias_que`, `informacion`,
    `cifras`, `comparativa`, `que_hacer`, `reflexiona`, `sintesis`): el texto va literal a
    un callout o bloque con estructura del `student_text`; no crean interacción ni cuentan
    para el ritmo, y caben varias dentro de una `{{diapositiva}}`. **Marca de marco**
    (`{{marco: caso_practico}}` y demás predefinidos de `schema/framePresets.ts`, o
    `{{marco: rótulo | color | icono}}`): la única que abarca varias diapositivas; pone
    `screen.frame` a cada pantalla que cubre para que se lean como una unidad (sustituye
    a la antigua idea de una «actividad práctica» de varias diapositivas, que el modelo
    no puede representar como un solo objeto). La caja `::: case` tiene su propia marca,
    `{{caso}}`, distinta de `{{caso_practico}}` (= pantalla `case_practice` con rúbrica). La versión para autores (sin
    tecnicismos, con capturas) es `docs/guia-marcas-para-autores.md` → `.docx`/`.pdf`
    con `scripts/guia-marcas/` (regenerar al cambiar marcas o el aspecto de un tipo).
    El GPT escanea todas antes de montar
    el guion de pantallas (paso 0): cada una fija su fila; el resto del guion se sigue
    rellenando con el criterio automático de siempre (**aditivo, no sustituye**:
    documento sin marcas = comportamiento idéntico al anterior). Cuentan para el
    ritmo (informativa ~1/3-4, evaluables al final de cada subtema): si ya lo cubren, no se añade nada
    automático ahí (nunca DENTRO de una `{{diapositiva}}`, solo antes o después); si
    el documento trae más marcas de las que el ritmo pediría, se respetan todas — el
    documento manda por encima del límite aproximado. Los tipos vetados al GPT
    (`hotspots`, `before_after`, `hidden_image`, `puzzle`, `video`, `html_embed`)
    **siguen vetados** aunque el documento los marque (mismo motivo que el veto
    automático: piden ajuste manual de imagen/código): no se genera interacción, solo
    un `editor_notes` pidiéndolo al editor humano. Mini-sintaxis opcional dentro de
    una marca de interactividad para contenido literal (opción correcta con `*`, V/F,
    parejas `término → correspondencia`, huecos `[[palabra]]` reutilizando el
    marcador del contrato): si el autor ya lo escribe así, el GPT lo usa literal en
    vez de inventarlo; si no, redacta la interacción a partir del bloque marcado
    igual que un checkpoint automático. Complemento **solo para autores humanos** (no
    conocimiento de GPT,
    lenguaje sin jerga JSON): `docs/guia-marcas-para-autores.md`, con el mismo
    catálogo de alias en prosa pedagógica — mantener los dos sincronizados si cambia
    un alias o se añade un tipo.
- **Títulos generados** (contrato §4, «Títulos: criterio editorial», y su línea en
  `referencia-rapida.md`): nominales y sin `¿?` por defecto, sin interrogativas
  indirectas que hagan dudar de si les faltan los signos («Qué vas a aprender» →
  «Objetivos de la unidad»); pregunta directa solo con función pedagógica real; los
  títulos del fuente se conservan, también sus `¿?`; toda actividad «Actividad: …» y
  el cierre «Síntesis del tema» (ver «Ronda de reglas del equipo editorial»).
- **Criterios de contenido acordados, viven en esos docs:** (1) **Regla Nº1** —
  conservar el texto de origen **casi al 100%** (ratio ≥0.95), sin resumir ni reescribir;
  extraer **con formato** (negritas, cajas→callouts) vía PyMuPDF `get_text("dict")`, no en
  plano. (2) **Modo factoría** para unidades: nunca en una pasada (no cabe → resume), tema
  a tema con parciales. **Autónomo por defecto**: la orden habitual del usuario es
  directa («genera el `.scormproj` de X»); el GPT encadena las fases solo, sin preguntar
  entre temas (para solo ante incidencia bloqueante o falta de espacio: guarda parciales
  y pide «continúa»). Paso a paso solo si se pide expresamente. Existe además el
  **análisis previo**: inventario global con volumen por unidad/tema y propuesta de
  empaquetado en `.scormproj` (SCOs de Moodle), sin generar nada. (3) Formato: `title`
  corto (no fragmento del texto ni repetido en el cuerpo), sin pantallas vacías/diminutas,
  listas con `- ` una por línea, encabezados solo-título, sin rótulos por diapositiva,
  negritas/enlaces del original conservados, imagen de contenido **debajo** del texto
  (`layout: "bottom"`). **Numeración de epígrafes**: desde documento, el `title` de la
  pantalla es el epígrafe literal **con** su número (es la referencia que usa el equipo
  para cotejar con el documento); los títulos de ítems de accordion/tabs, sin «1.» ni
  «a)»; en copias de Moodle la numeración de gestión se quita. **Jerarquía**: sub-epígrafes hermanos con el mismo nivel
  `###` (ninguno degradado a línea numerada en negrita) y ninguna pantalla arranca con
  contenido residual del epígrafe anterior. **Excepción, dos niveles reales**: si el
  documento numera consistentemente DOS niveles (`1.`/`2.`/`3.`… temas y `1.1`/`1.2`/
  `2.1`… subtemas dentro de cada uno), esos dos niveles **no** se aplanan a `###` — se
  reflejan en el esquema real, un `module` por punto de nivel 1 y una `unit` por punto
  de nivel 2 (contrato §3), con `module_label`/`unit_label` a juego si el documento trae
  su propio vocabulario, y el `title` de AMBOS conserva su número tal cual lo trae el
  documento (`"1. …"` en el módulo, `"1.2 …"` en la unidad). Un tercer nivel
  (`1.1.1`…) no crea contenedor —se aplana en pantallas de la unidad de nivel 2 que le
  toque, tituladas con su epígrafe— porque el árbol del editor y el menú/miga de pan
  del alumno solo distinguen dos niveles, a propósito (decisión de UI, no limitación
  del esquema). **`cover` = solo portada** (título/subtítulo;
  la intro va en la 1ª de contenido) pero **con el número del tema visible** («Tema 1»,
  «Tema 2»… en `subtitle` o antepuesto al título). **Ejercicios prácticos en pantalla
  propia**: `case_practice`/`reflection` y callouts con tarea (`::: reflect`)
  nunca pegados al final de una pantalla de contenido; el ejercicio va en la pantalla
  siguiente con solo su enunciado, y **la solución** («Resolución propuesta»/«Clave de
  reflexión») en el `feedback.explanation` de la interacción, **nunca visible** en
  `student_text`. **Limpieza de extracción** (del contraste OK/KO de dos generaciones del
  mismo PDF): reagrupar las frases partidas por la maquetación del PDF, ítems de lista
  en líneas consecutivas sin línea en blanco entre ellos, espacio tras cerrar negrita
  (`**útil** y`), y dos callouts del mismo tipo en una pantalla = dos apartados
  fusionados → dividir en dos pantallas. **`min_time_seconds: 0` siempre**: el tiempo
  mínimo por pantalla lo fija a mano el editor humano en SCORMEditor, el GPT no lo
  estima. **Bibliografía solo en `bibliography[]`** (la carcasa la muestra en el modal
  «Recursos y bibliografía», `app.js`; nunca pantalla «Referencias»), una entrada limpia
  por referencia y **todas con formato homogéneo** (`Autor/Entidad (año). Título.
  Fuente.`), normalizando aunque el original sea desordenado. **Negritas**: la extracción
  con `get_text("dict")` debe detectar la negrita por `span.flags & 16` o fuente con
  `Bold`/`Black`/`Semibold` y re-emitirla como `**...**` (helper `extract_text_markdown`
  en el contrato §11); el texto plano las pierde. **Enlaces**: en un PDF son
  anotaciones, no texto — el mismo helper cruza `page.get_links()` con los spans y
  los emite como `[texto](url)` (verificado con PyMuPDF 1.28, incluida negrita dentro
  del enlace); sin eso se perdían los enlaces cuyo texto visible no es la URL. La
  carcasa los abre **siempre** en pestaña nueva: `rich()` (`interactions.js`) emite
  `target="_blank" rel="noopener noreferrer"` y el renderer de `student_text` delega
  en esa misma función; el GPT no debe añadir HTML ni `target`. **Excepción — vídeos
  de YouTube** (jul 2026): un enlace a YouTube en el fuente no se deja como enlace de
  texto; se crea pantalla con `visual_resource.kind="video_youtube"` (ID en `src`),
  que la carcasa embebe vía `youtube-nocookie.com` (`renderer.js` `mediaBlock`) sin
  sacar al alumno del SCORM. (4) **Guion de pantallas** obligatorio
  antes de producir cada tema (jul 2026, tras calibrar el troceo con el usuario):
  tabla bloque→pantalla→interacción donde la **forma del bloque fuente** decide el
  patrón (tabla de mapeo en la guía), con el **nº de caracteres por pantalla**
  (contado en Python, no a ojo) y con **chequeo de ritmo** — informativa ~1 de
  cada 3-4 pantallas de desarrollo donde el fuente trae listas cortas (nunca >3
  seguidas de solo texto), **ninguna pantalla de >~800 caracteres sin revisar**
  (dividir por donde cambia la idea — el recuento de caracteres es alarma secundaria:
  la división la manda la unidad de sentido, ver ronda de reglas aprendidas),
  evaluables con reparto mixto (1-3 al final de cada subtema, +1 intercalada si es largo; ⌈N/5⌉ orientativo)
  prefiriendo decidir/clasificar a `single_choice`, tipos variados sin
  repetir dos seguidos. El guion es interno por
  defecto (va al informe final); la orden «enséñame el guion» añade una única parada
  de aprobación antes de producir. Motivo: decidir pantalla a pantalla mientras se
  escribe producía ritmo desigual y deriva entre generaciones. **Micro-transiciones
  aditivas** permitidas (1-2 frases puente propias por pantalla; nunca sustituyen
  texto fuente — por eso el ratio puede superar 1.0). **Toda evaluable o pregunta
  directa en pantalla propia** (jul 2026): nunca comparte pantalla con teoría; su
  `student_text` lleva solo la introducción, va titulada «Actividad: …» y después de
  todo lo que evalúa — el ejemplo dorado lo modela (s04 teoría+imagen → s05
  pregunta). **Alternar el repertorio evaluable** (choice, V/F, huecos, clasificar,
  escenario, caso; parejas con moderación; sin `sort_steps`) sin repetir tipo dos seguidos; ante
  la duda, un checkpoint de más (al usuario le es más fácil borrar/retocar en
  SCORMEditor que crear). Las **prácticas de varios pasos** (`scenario_steps` caso
  por decisiones, `decision_tree` conversación ramificada, `calculator` reto
  numérico) entran en ese repertorio: son solo texto, así que el GPT **sí** las
  genera (a diferencia de los tipos vetados), pero solo donde el contenido las pide
  — caso con varias decisiones encadenadas; diálogo con un familiar/persona
  usuaria/compañero con consecuencias (árbol pequeño: 4-8 momentos, 2-3 respuestas);
  cálculo que el procedimiento ya trae (dosis, costes, ratios, tiempos), nunca
  forzado — y como mucho uno o dos por tema. Igual de aditivos: `fill_blanks` con
  `mode: "type"` (respuesta escrita sin pista, alternativas `[[a|b]]`); y en
  `student_text`, los **bloques con
  estructura** `::: stats`/`::: compare`/`::: dodont` (contrato §4.1), solo cuando el
  fuente ya trae cifras destacadas, enfoques contrapuestos o «qué hacer/qué
  evitar» — cambian la maquetación, no el texto (Regla Nº1). **Cierre de cada tema**:
  repaso con `flashcards` o `az_quiz` y «Síntesis del tema» — ejemplo dorado s09-s10.
  **Tipos vetados al GPT** (reservados al editor humano:
  piden ajustar a mano imagen/medio/código): `hotspots`, `before_after`,
  `hidden_image`, `puzzle`, `video` (vídeo interactivo; el `visual_resource`
  `video_youtube` sí se genera) y `html_embed`. Una interacción entera en una
  pantalla (no partir accordion/actividad); **`accordion`/`tabs` solo para listas
  cortas de ítems paralelos** (rótulo + 1-3 frases), NUNCA para prosa corrida, párrafos
  de desarrollo ni texto que acompaña a una imagen (ver «corte» en la ronda del equipo
  editorial); **variar los tipos informativos** (no todo accordion; `tabs`/`flip_cards`
  solo con ≤4 ítems cortos); **algo tras el clic**: el cuerpo de cada ítem aporta más
  que su título, nunca un eco del rótulo — solo rótulos sin desarrollo → lista en
  `student_text`, no desplegable; **texto + imagen =
  UNA pantalla** (`student_text` visible + `visual_resource`), sin fragmentar cada imagen
  en su propia pantalla; **máximo UNA imagen por pantalla y siempre como
  `visual_resource`** — nunca `![...]` en `student_text` (esa sintaxis es del editor
  humano; jul 2026, del análisis de pai-u02 (9)); serie de figuras → una pantalla por
  punto, titulada con **su** punto concreto (el `title` repetido queda para la
  continuación de una misma idea); **pantalla con texto+imagen sin NINGUNA interacción**
  (tampoco informativa): la interactividad va a la pantalla siguiente con solo una
  introducción; los rótulos/flechas de una infografía no se vuelcan como
  párrafos sueltos (van en `alt`/`caption`/`transcript`); **callout
  con cuerpo real (no la etiqueta) y no dos del mismo tipo en la misma pantalla**;
  **nunca un callout vacío** (`::: tipo` sin cuerpo; el editor avisa con
  `CALLOUT_EMPTY`, `validators.ts`); si se pide test dentro del paquete, solo en
  `assessments.final_test` (no una pantalla `unit_quiz` con el test en texto). (5) **Objetivos**: conjunto reducido derivado del contenido + petición
  del usuario + normativa facilitada (NO un micro-objetivo por pantalla, sin cuota fija);
  texto **exacto** reutilizado entre las pantallas del mismo objetivo (`objective` = solo
  el principal de cada pantalla) y copiado literal en cada `learning_objective` de
  pregunta de test (la interacción no lleva ese campo: evalúa el `objective` de su
  propia pantalla); cada objetivo con al menos una evaluación; en `objectives`/
  `route` el objetivo principal del tema, no meta-objetivos («Presentar el recorrido»).
  Casa con la cobertura normalizada `OBJ_NOT_EVALUATED` del editor
  (`informes-validacion.md`). (6) **Revisión de fidelidad**: el ratio de palabras ≥0.95
  mide cantidad, no fidelidad; el flujo factoría añade en la Fase 3 una revisión final
  obligatoria contra la fuente (cada epígrafe con su pantalla, mismo orden y jerarquía,
  fronteras limpias, mismo mensaje didáctico) antes de entregar.
- **Ronda de auditoría (jul 2026)**: contraste de los docs del GPT contra el código real.
  Cambios: (a) **marca** — `authoring_entity` = MECOHISA (autoría) pero `shell.brand`
  **vacío** por defecto (cabecera visible); antes tres docs empujaban MECOHISA al `brand`
  contra el contrato. (b) **`score_source`** coherente con lo que puntúa: con
  checkpoints `scored:true`, `final_test` los ignora y el editor avisa
  `SCORM_ACTIVITIES_IGNORED` (el valor por defecto actual, `unit_tests`, sale de la
  ronda del equipo editorial). (c) **Ejemplo dorado** que pasa `validateCourse` sin
  errores y con un único aviso, el esperado (`REVIEW_PENDING` por sus dos pantallas
  marcadas a propósito). (d) **Unicidad de IDs**:
  `ID_DUPLICATE` (error) nuevo en `validators.ts` — el editor no la comprobaba aunque el
  preflight §11 sí; el runtime guarda estado por `id`. (e) **Toolkit §11 blindado**:
  `course.id` saneado para el nombre de fichero (evita traversal), rutas de asset con
  `..`/absolutas rechazadas (zip-slip), y el escaneo de rutas referenciadas restringido a
  cadenas que son ruta de fichero completa (una `editor_note` con `assets/…` ya no produce
  un falso faltante).
- **Ronda de reglas aprendidas (jul 2026)**: el usuario calibró la generación con otra IA
  (Codex) sobre las unidades 2 y 3 del curso PAI (pares generado/corregido como fixtures) y
  aprobó 13 reglas (`reglas-aprendidas.yaml`, R001–R013), integradas en los docs del GPT.
  Lo esencial: (a) **segmentación por unidad de sentido** — una idea y UNA sola acción
  mental por pantalla (comprender/explorar/practicar/decidir/repasar); pantalla nueva al
  cambiar la intención pedagógica (definición→aplicación, explicación→actividad,
  procedimiento→beneficios); varios subtítulos o dos bloques destacados con funciones
  distintas = señal de división; en contenidos de observación, separar cómo/qué/interpretar.
  El **nº de caracteres pasa a alarma secundaria** (la corrección de pai-u02 subió de 53 a
  60 pantallas sin perder cobertura). Sin fragmentar en automático: la explicación queda
  junto a su ejemplo necesario. (b) **Interacción nunca tras varios párrafos** (vale
  también para informativas) y **siempre con introducción** (2-3 frases desde R030). (c) **Series de tipos/formatos/casos con título específico** por
  pantalla — matiza la regla del `title` repetido, que queda solo para continuación de una
  misma idea. (d) **Formato en campos de interacción**: los campos cortos pasan por
  `rich()` (`interactions.js`: solo negrita/cursiva/enlaces; `##`/`:::`/listas salen
  literales), el markdown de bloque solo funciona en los cuerpos que usan `block()`
  (`body` de accordion/tabs/timeline, `text` de image_cards) — ahora es regla normativa
  del contrato §6. (e) **Negritas masivas de la extracción** (párrafos enteros en
  negrita/encabezado) se restauran a párrafo normal. (f) **3+ ejemplos paralelos con
  correspondencia** (dato→interpretación, observación→ajuste) → `flip_cards`/`accordion`.
  Las reglas nuevas solo se aprueban con OK explícito del usuario (no se «aprende» de una
  conversación suelta).
- **Ronda de reglas del equipo editorial (R014–R036)**: origen distinto a R001–R013 —
  comparar lo que entregó el generador con la versión final que deja el equipo humano
  en la nube (`scripts/nube/nube.mjs exportar` + `comparar`, primera versión del
  generador frente a la última editada), en 7 grupos de cursos. Propuesta e informes en
  `docs/curso-comun/analisis-maquetacion/` (privado, ignorado por git); el ciclo
  completo (exportar → comparar → proponer con ejemplos → OK del usuario → volcar a
  `docs/gpt/`) está en la skill `maquetar-curso`, §6. No se aprende de los errores del
  propio equipo (erratas, datos cambiados sin fuente) ni se trata como error quitar
  tests o foros (van a Moodle). Reglas aprobadas, ya integradas en guía, contrato,
  referencia rápida, instrucciones, factoría e ingesta Moodle:
  - **Forma**: R014 imagen de contenido **debajo** del texto (`layout: "bottom"`,
    `media_align: "center"` si es estrecha o cuadrada; portada `top` + `media_full`).
    R015 ítems sin «a)»/«1.». R016 toda actividad (evaluable o no) titulada
    «Actividad: …» — la carcasa (`renderer.js`) detecta el prefijo y en las evaluables
    solo añade el icono. R017 cierre «Síntesis del tema/de la unidad». R022 títulos
    nominales, sin interrogativas indirectas dudosas; `¿?` solo si interpela de verdad;
    se respetan los del fuente. R034 hitos de `timeline` con `label` solo si es fecha,
    fase o plazo.
  - **SCORM** (R018): test final y foros en Moodle → `completion_mode: "screens"`,
    `min_score`/`mastery_score` 50, `require_interactions`, `auto_return: true`,
    `attempts: 3` en las evaluables, `final_test: null`, y `score_source: "unit_tests"`.
    Ojo: `"unit_tests"` significa en `computeScore` (`app.js`) «actividades evaluables
    de las pantallas», no `assessments.unit_tests` (que la carcasa no pinta); por eso es
    el coherente sin test dentro, mientras que `mixed` sin test da
    `SCORM_MIXED_NO_FINAL`. Si nada puntúa, `screens` lo deja como `SCORM_UNGRADED`
    (info), y el preflight Python del contrato §11 replica esa excepción. Ruta y
    síntesis no anuncian test ni duración.
  - **Texto**: R019 vocabulario del sector («persona usuaria/residente», «centro», no
    «residencia», «equipo gerocultor», inclusivo) y «e» ante i-/hi- también con
    negrita. R020 negrita en 1-3 ideas clave e idea-fuerza final; avisos sueltos →
    callout tipado. R021 nada de notas internas ni relleno visibles. R024 fuentes como
    enlace con nombre, normas al BOE. R036 relectura ortotipográfica tras cada revisión
    humana.
  - **Corte** (R023, lo que más remaqueta el equipo): sin párrafos de desarrollo en
    desplegables/pestañas/tarjetas; apartado con título propio, párrafo o imagen propia
    → su pantalla tras una pantalla índice; desplegables solo para listas cortas; al
    quitar uno, «Despliega cada…» → transición. Contradice la regla anterior que
    trataba esa división como fallo de micro-pantallas: las micro-pantallas siguen
    siendo fallo solo cuando son trozos sin entidad propia. R025 cada actividad después
    de todo lo que evalúa; actualizaciones normativas en su sitio, **sustituyendo** lo
    desfasado. R026 no resumir: si se reparte, entero; desde documento, `title` =
    epígrafe literal con su número (sustituye a «quitar la numeración»).
  - **Por origen**: R027 documento → marcar con `screen.review` (nota concreta) lo que
    no sale de él (objetivos, recorridos, actividades); curso redactado por la IA →
    prosa completa de 15-25 palabras por frase. R028 copia Moodle con lecciones →
    portadas limpias, página que solo repite el título = portada, reflexiones abiertas
    → callout `reflect` numerado sin rúbricas. R029 copia con SCORM Captivate/Storyline
    → títulos sin el soporte («Vídeo:»), lo dudoso marcado con nota.
  - **Interacciones**: R030 intro de 2-3 frases con la instrucción de acción final en
    negrita, nunca la genérica. R031 sopa de letras y crucigrama, pocas y solo para
    vocabulario técnico (no en cada cierre); rosco y `flashcards` para el cierre. R032
    evitar `sort_steps` (no es intuitiva): proceso → `timeline` + `scenario_steps`/
    `single_choice`. R033 `match_pairs`/`classification` con moderación (en móvil son
    poco intuitivas) y con instrucción explícita, también táctil: el motor
    (`dragAssignFactory`) admite arrastrar o tocar el elemento y luego su casilla.
    R035 clasificación «sí/no» → grupos «Correcto»/«Incorrecto».
- El GPT también lee una copia del contrato en el `Downloads` del usuario; al tocar el de
  `docs/gpt/` hay que **sincronizarla** (`cp`). La subida al GPT se hace desde estos
  ficheros. Dentro de las Instructions, los docs se referencian por **nombre de fichero
  suelto** (así los ve el Knowledge del GPT), no por ruta: mover la carpeta en el repo no
  afecta al GPT.
- **`scripts/moodle-import/` (Node, jul 2026)**: herramienta de línea de comandos
  determinista, alternativa a `ingesta-moodle.md` para el mismo tipo de fuente (backup
  Moodle). Hace un **mapeo literal** página→pantalla y quiz→`assessments.final_test`,
  **sin** enriquecimiento pedagógico (nada de portada/objetivos/interactividades
  variadas/cierre) — pensada para cursos que solo existen en Moodle y donde no hace
  falta o no es viable pasar por el GPT (p. ej. muchos cursos a la vez, o sin acceso al
  GPT). Genera 1 `.scormproj` por sección de Moodle con lección(es)+quiz. Ver su
  `README.md` propio. **No confundir con `ingesta-moodle.md`**: mismo origen de datos,
  resultado muy distinto en riqueza pedagógica — el GPT es la vía a preferir cuando se
  quiere el mismo nivel de curso que con PDF/Word.
- **`llms.txt` en la raíz del repo**: índice de los docs de `docs/gpt/` para que un
  asistente **distinto de ChatGPT** (Claude, Gemini, un script con API…) pueda generar
  `.scormproj` válidos partiendo de ese punto de entrada. Mientras el repo sea privado
  es inerte de puertas afuera (solo sirve a agentes con acceso local); si algún día se
  publica, revisar antes que el contrato lleva datos internos (entidad por defecto,
  criterios SEPE). Mantener: solo cambia si se añade/renombra un doc de `docs/gpt/`.
