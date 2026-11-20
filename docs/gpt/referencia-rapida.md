# Referencia rápida (SCORMEditor)

Material de consulta que **complementa** las Instructions del GPT (que solo llevan los
guardarraíles). Léelo cuando trabajes: modos de respuesta, valores por defecto,
accesibilidad, normativa SEPE, evaluación y checklist de validación. Ante conflicto,
manda `contrato-course-json.md`.

## Modos de trabajo
- **Análisis** (sin petición de material): diagnóstico y dudas Moodle/SCORM/SEPE. Si
  hay ambigüedades o mejoras pedagógicas relevantes, pregunta antes de generar.
  Si piden un **análisis previo del documento** (qué contenido hay, qué volumen, cómo
  dividirlo en SCORMs), haz el inventario global con **propuesta de empaquetado** en
  `.scormproj` (Fase 0 del flujo factoría) sin generar nada.
- **Generación** («JSON», «course.json», «archivo para SCORMEditor»…): produce el
  `.scormproj` conforme al contrato. La orden habitual es **directa** («genera el
  `.scormproj` de la Unidad X / del curso / del Tema Y»): ejecuta el flujo factoría
  completo de forma **autónoma, sin preguntar entre temas** (solo paras ante
  incidencia bloqueante o falta de espacio: guarda y di «continúa»). Pregunta entre
  temas únicamente si el usuario pide trabajar **paso a paso**.

### Respuesta al recibir un documento (modo Análisis)
Estructura la respuesta en: 1) Diagnóstico 2) Preguntas necesarias 3) Propuesta de
transformación 4) Riesgos 5) Siguiente paso recomendado. Analiza: título, unidad/tema,
objetivos, conceptos clave, actividades, interacciones posibles, casos, glosario,
bibliografía, carencias, duración y pantallas estimadas.

## Estructura didáctica de un tema
Portada → objetivos → ruta → desarrollo (tantas pantallas como apartados con entidad
tenga el documento) → actividades intercaladas, cada una tras lo que evalúa → casos →
repaso → «Síntesis del tema». Todo en `modules[].units[].screens[]`; glosario y
bibliografía en sus arrays raíz. El test y los foros van en Moodle: la ruta y la
síntesis no anuncian test ni dan duración estimada.

## Valores de producción por defecto
- **Test final y foros en Moodle, fuera del SCORM** (contrato §2): `completion_mode
  "screens"`, `min_score 50` (`mastery_score 50`), `require_interactions true`,
  `auto_return true`, `score_source "unit_tests"` (= nota de las actividades
  evaluables de las pantallas, no de `assessments.unit_tests`), `final_test null`;
  **`attempts: 3`** en cada interacción evaluable. Con test dentro (solo si se pide):
  `mixed` si los checkpoints puntúan, `final_test` si van todos `scored: false`.
- SCORM `1.2`; navegación `mixed`; `attempts_allowed 2`; `allow_resume true`;
  `min_required_screens_pct 100`.
- `min_time_seconds: 0` en **todas** las pantallas: el tiempo mínimo lo fija a mano
  el editor humano en SCORMEditor; no lo estimes.
- **Marca**: `authoring_entity` = **«MECOHISA S.L.»** (metadato de autoría) salvo que
  indiquen otra entidad; **`shell.brand` vacío** por defecto (marca visible en la
  cabecera) — rellénalo solo si se pide expresamente. No los confundas: son campos
  distintos.
- Unidad completa → modo factoría → un único `.scormproj` (o un SCORM por tema si lo
  piden expresamente).
- Test de unidad en el documento: entrégalo **aparte** para el cuestionario de Moodle
  (no dentro del `course.json`), conservando las preguntas como base y reformulando
  solo si mejora la comprensión sin alterar el sentido. Evita preguntas memorísticas.
- Foro/debate en el documento: va en Moodle; sin pantalla `forum_prompt`, anota en
  `editor_notes` de la pantalla vecina qué foro proponía el fuente.

## Evaluación
Dentro del SCORM evalúan las **actividades** de las pantallas (`scored: true`, 3
intentos), cada una después de lo que evalúa; cada objetivo, con al menos una. El test
calificable es el de Moodle. Si se pide el test dentro: `assessments.final_test`
(`single_choice`/`true_false`), cada pregunta con respuesta correcta, feedback de
acierto y error, explicación, objetivo vinculado, puntuación y `source_refs`;
comprensión y aplicación antes que memoria; sin duplicar las preguntas como
checkpoints.

## Accesibilidad y trazabilidad
- `alt` en toda imagen; `transcript` y subtítulos (`tracks` VTT) en audio/vídeo;
  feedback textual; lenguaje claro; sin depender solo del color.
- `source_refs` en pantallas, interacciones, glosario y preguntas; lo derivado del
  documento se marca con `transform`. No inventes contenido normativo.

## Normativa SEPE
Nunca afirmes homologación oficial ni acreditación garantizada. Usa: «preparado para
revisión por la entidad», «pendiente de validación normativa», «compatible con Moodle
mediante SCORM», «alineado con los criterios aportados». Si falta ficha oficial,
continúa con la propuesta técnico-pedagógica e indica que queda pendiente de validación.
Cada tema es SCO independiente: indícalo solo en campos internos (`subtitle`,
`description`, `editor_notes`), nunca en la vista del estudiante.

## Checklist de validación antes de entregar
- JSON válido, sin `screens` en la raíz; tipos de pantalla e interacción permitidos;
  `id` únicos.
- Cada pantalla con `objective` (la interacción evalúa el de su propia pantalla, no
  lleva uno propio); preguntas evaluables con respuesta correcta, feedback y
  `source_refs`.
- Reglas SCORM por defecto (test en Moodle: `final_test null`, `score_source
  unit_tests`, `completion_mode screens`, `min_score 50`, `auto_return true`,
  `attempts: 3` en las evaluables); `glossary`/`bibliography` no vacíos;
  `quality_checklist` es objeto de booleanos.
- Imágenes con `alt`; audio/vídeo con `transcript` y subtítulos; `scorm.identifier` no
  vacío. **Imagen de contenido debajo del texto** (`layout "bottom"`, `media_align
  "center"` si es estrecha o cuadrada); portada arriba a todo el ancho (`top` +
  `media_full`).
- **Títulos** (contrato §4, «Títulos: criterio editorial»): los del fuente se conservan
  (también sus `¿?`); desde documento, `title` = **epígrafe literal con su número**
  («3.2. Detección de…»), repetido si ocupa varias pantallas; los que generes,
  **nominales** («Objetivos de la unidad», «Actuación ante una caída»), sin
  interrogativas indirectas dudosas («Qué vas a aprender»); pregunta directa con
  signos solo si interpela de verdad al alumno; **toda actividad, «Actividad: …»**
  (nunca «Caso:», «Comprueba:», «Reto:», «Repaso:»…); cierre **«Síntesis del tema»**;
  ítems de desplegable/pestaña **sin «a)»/«1.»**; hitos de `timeline` con `label` solo
  si es fecha, fase o plazo.
- **Estilo** (guía, «Estilo y lenguaje»): negrita en 1-3 ideas clave e idea-fuerza
  final en negrita; avisos y datos sueltos → callout tipado; «persona usuaria/
  residente», «centro» (no «residencia»), «equipo gerocultor», genéricos inclusivos,
  «e» ante i-/hi-; sin notas internas ni relleno visibles («Explora el contenido»,
  «según el documento fuente»); fuentes como `*Fuente:* [Nombre](url)` y normas
  enlazadas al BOE; actualizaciones en su sitio, sustituyendo lo desfasado.
- **Por origen** (guía, «Reglas por origen»): lo que no sale del documento, marcado
  con `review` y nota concreta; curso redactado por la IA, prosa completa (15-25
  palabras por frase); copia de Moodle, portadas limpias y reflexiones abiertas como
  callout `reflect` numerado; SCORM Captivate/Storyline, títulos sin el soporte
  («Vídeo:»). Tras una revisión humana, relectura ortotipográfica.
- **Formato**: sin rótulos por diapositiva (`Idea clave:`, `Claves:`, `Objetivo:`,
  `Resumen:`, `Actividad práctica`, `Resolución propuesta:`); sin `…`/`...` de
  truncado; listas con `- ` (un ítem por línea, **sin línea en blanco entre ítems**);
  frases partidas por la maquetación del PDF **reagrupadas** en un párrafo; espacio
  tras cerrar negrita (`**útil** y`, no `**útil**y`);
  encabezados `## `/`### ` con solo el título en su línea; sub-epígrafes hermanos con
  el **mismo nivel** de encabezado (ninguno degradado a `3. **…**`); **párrafos
  enteros en negrita o encabezado por culpa de la extracción, restaurados** a párrafo
  normal (énfasis solo en lo realmente destacado); **campos de interacción sin
  markdown de bloque** (`prompt`/`instructions`/opciones/feedback/`front`/`back`:
  solo negrita, cursiva y enlaces; `## `, `::: ` y listas solo en `student_text` y en
  `body` de accordion/tabs/timeline); ninguna pantalla
  arranca con contenido residual del epígrafe anterior (ni con un bloque que su
  `title` no anuncie); **no dos callouts del mismo
  tipo en una pantalla** (dos `::: important` juntos = dos pantallas fusionadas:
  divide); **ningún callout vacío** (`::: tipo` sin cuerpo); **bloques con
  estructura** solo si el fuente ya tiene esa forma (`::: stats` cifras con la cifra en
  negrita inicial de cada punto, `::: compare` 2-3 columnas con `### `, `::: dodont`
  dos `### `: qué hacer / qué evitar; contrato §4.1); el texto interno de una
  infografía (rótulos, flechas «→») no se vuelca como párrafos sueltos;
  **enlaces del original preservados** como `[texto](url)`
  (`extract_text_markdown` ya captura las anotaciones del PDF; sin `target`, lo pone
  el runtime); **enlace a YouTube → vídeo embebido** (`visual_resource`
  `video_youtube`, ID en `src`), nunca como enlace de texto.
- **Estructura**: `cover` solo portada, con el **número del tema visible** («Tema 1»,
  «Tema 2»… en `subtitle` o antepuesto al título) y sin párrafos de contenido; **el
  título del módulo nunca repite el título del curso/SCORM** (esa presentación va en
  la portada de `intro_screens`, ver contrato §1/§3) — dale al módulo un nombre propio;
  **mapea la granularidad real del documento sin envoltorios de más**: un módulo con
  N temas → N `unit` reales en `units[]` (no N módulos de un tema cada uno); una sola
  unidad con sub-temas → cada sub-tema su propia `unit` (no una unidad-envoltorio con
  los sub-temas metidos dentro como pantallas); **dos niveles numerados a la vez**
  (`1.`/`2.`… temas, `1.1`/`1.2`… subtemas) → N módulos reales, cada uno con sus propias
  M `unit` (nunca aplanado a un módulo con todas seguidas), y el `title` de AMBOS niveles
  conserva su número tal cual (`"1. …"` en el módulo, `"1.2 …"` en la unidad — sin él se
  pierde la referencia al documento original); un tercer nivel (`1.1.1`…) no crea
  contenedor, se funde en pantallas de la unidad de nivel 2 que le toque, sin arrastrar
  su numeración (esa sí se quita, como cualquier epígrafe de nivel 3+, contrato §3/§4 —
  el árbol solo distingue dos niveles a propósito); **cierre opcional**
  (`closing_screens` del curso y de cada módulo, contrato §1/§3): simétrico a
  `intro_screens`/`screens` pero al final de todo el paquete o del módulo — solo si el
  documento lo pide explícitamente, si no se omite la clave; **pantallas sueltas entre
  unidades** (`units[].loose`, contrato §3): un elemento más de `units[]` con
  `"loose": true` en vez de unidad de verdad, sin crear una unidad-envoltorio — solo si
  el documento lo pide explícitamente, si no se omite;
  **pantallas divididas por unidad de sentido** (una idea y una sola acción mental por
  pantalla; pantalla nueva al cambiar la intención — definición→aplicación,
  explicación→actividad, procedimiento→beneficios; los ~800 caracteres son alarma
  secundaria, no el criterio; y sin fragmentar en automático: la explicación queda
  junto a su ejemplo necesario); **toda interacción con introducción breve** (1-2
  frases: qué hacer y para qué) y **nunca tras varios párrafos** de desarrollo;
  **series de tipos/formatos/casos con título específico** por pantalla (el `title`
  repetido solo señala continuación de la misma idea);
  **máximo una imagen por pantalla y siempre como `visual_resource`** (nunca `![...]`
  en `student_text`; serie de figuras → una pantalla por punto, titulada con su
  punto);
  **pantalla con texto+imagen sin interacción** (ni informativa: la interactividad
  va en la pantalla siguiente, con solo una frase introductoria);
  **toda interactividad evaluable o de pregunta directa en pantalla propia**
  («Actividad: …», sin teoría en `student_text`: solo su introducción de 2-3 frases con
  la instrucción de acción final en negrita, nunca la genérica; **después de todas las
  pantallas que evalúa**); **sin párrafos de desarrollo dentro de desplegables,
  pestañas o tarjetas** (apartado con título propio, desarrollo o imagen propia → su
  pantalla, tras una pantalla índice; al quitar un desplegable, «Despliega cada…» →
  transición); ejercicios prácticos
  (`case_practice`/`reflection`, `::: case`/`::: reflect`) igual, en
  **pantalla propia**, no pegados tras el contenido, con la **solución en
  `feedback.explanation`** (nunca «Resolución propuesta» visible en `student_text`);
  **cierre de cada tema**: repaso con `flashcards` o `az_quiz` (`scored: false`) y
  «Síntesis del tema»; sopa de letras y crucigrama, pocas veces y solo para fijar
  vocabulario técnico; **sin `sort_steps`** (proceso → `timeline` + `scenario_steps`/
  `single_choice`); `match_pairs`/`classification` con moderación y con la instrucción
  de cómo responder también en táctil (tocar el elemento y luego su casilla);
  clasificación «sí/no» → grupos «Correcto»/«Incorrecto»; **tipos reservados al editor
  humano, nunca generados**: `hotspots`, `before_after`, `hidden_image`, `puzzle`,
  `video` (vídeo interactivo) y `html_embed`; **prácticas de varios pasos sí**, solo
  donde el contenido las pide: `scenario_steps` (caso con varias decisiones
  encadenadas, comentario en cada opción), `decision_tree` (conversación con un
  familiar/persona usuaria/compañero: 4-8 momentos, 2-3 respuestas, sin bucles, un
  final `good` si puntúa) y `calculator` (solo si el procedimiento ya trae un cálculo;
  en `challenge` todos los datos con `value`, fórmulas con la gramática del contrato
  §6 comprobadas en Python; `tool` con `scored: false`);
  bibliografía **solo** en
  `bibliography[]` (la carcasa la muestra sola; sin pantalla «Referencias»), una
  entrada por referencia con **formato homogéneo** (`Autor/Entidad (año). Título.
  Fuente.`); interacciones informativas **variadas** (no todo `accordion`;
  `tabs`/`flip_cards` solo con ≤4 ítems) y **con algo tras el clic, pero breve** (1-3
  frases por ítem, más que su título, nunca un eco del rótulo; solo rótulos sin
  desarrollo → lista en `student_text`; párrafos de desarrollo → pantallas).
- **Contenido íntegro (Regla Nº1)**: texto conservado ~100% (ratio ≥0.95);
  `quality_checklist`: `"Contenido del documento trazado sin pérdidas": true`.
- **Negritas (check automático, OBLIGATORIO)**: si el PDF fuente tiene texto en negrita
  (fuente con `Bold`/`Black`/`Semibold` o `span.flags & 16`), el `course.json` **debe**
  contener `**...**`. Cuéntalo en Python antes de entregar:
  `assert json.dumps(course).count('**') > 0`. Si sale **0**, has extraído en plano o
  redactado de memoria → **reextrae con `extract_text_markdown` (contrato §11)** y vuelca
  ese texto (que ya trae las `**`) a `student_text`; **no** reescribas el texto tú.
- **Guion de pantallas** montado antes de producir cada tema (tabla
  bloque→pantalla→interacción de la guía, con el **nº de caracteres** por pantalla;
  adjunto al informe, y aprobado por el usuario si la orden pedía «enséñame el
  guion») y su **ritmo** cumplido: informativa ~1 de cada 3-4 pantallas de desarrollo
  donde el contenido traiga listas cortas (**nunca >3 seguidas de solo texto**);
  **ninguna pantalla de >~800 caracteres sin revisar** (dividir por donde cambia la
  idea; a una informativa solo si son frases breves paralelas); checkpoint aplicado
  cada 4-5 pantallas (mín. ⌈N/5⌉, no acumulados al final), **alternando el repertorio
  evaluable** sin repetir tipo dos veces seguidas y prefiriendo decidir/clasificar a
  `single_choice`; ante la duda, un checkpoint de más (borrar en SCORMEditor es fácil;
  crear, no).
- **Marcas de autoría** (`{{alias}}…{{/alias}}`, `marcas-autoria.md`) si el documento
  las trae: `{{diapositiva}}` con su contenido EXACTO (sin partir ni fusionar, aunque
  salte otra regla de estructura — anotado en `editor_notes`); el resto, con su tipo
  y, si había, contenido literal; las de destacado, como callout/bloque con estructura
  en el `student_text`; las de tipo vetado, con su `editor_notes`;
  `quality_checklist`: `"Marcas de interactividad del documento respetadas": true`.
- **Objetivos**: conjunto reducido derivado del contenido, de la petición del usuario
  y de la normativa facilitada (no uno distinto por pantalla); texto **idéntico**
  reutilizado entre pantallas, interacciones y preguntas del test; cada objetivo con
  al menos una evaluación que lo mida.
- Notas internas fuera de los campos del estudiante; sin afirmaciones de homologación
  SEPE.
- Del `.scormproj`: `course.json` en la raíz; cada ruta `assets/…` con su fichero real;
  nombre `<course.id>.scormproj`.
- **Revisión de fidelidad final** (flujo factoría): antes de entregar, releída la
  fuente, cada epígrafe del PDF tiene su(s) pantalla(s) en el mismo orden y jerarquía,
  y el mensaje didáctico es el mismo (no solo el ratio de palabras).
