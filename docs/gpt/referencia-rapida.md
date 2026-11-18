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
Portada → objetivos → ruta → desarrollo (tantas pantallas como ideas tenga el
documento) → checkpoints intercalados → casos → resumen → autoevaluación. Todo en
`modules[].units[].screens[]`; glosario y bibliografía en sus arrays raíz.

## Valores de producción por defecto
- SCORM `1.2`; navegación `mixed`; nota mínima `70`; `2` intentos; `allow_resume true`;
  `min_required_screens_pct 100`; `require_interactions true`.
- **`score_source`**: por defecto **`mixed`** (`mixed_final_weight: 70` → 70 % test
  final + 30 % actividades evaluables), coherente con que el tema lleva checkpoints
  `scored: true`. Usa `final_test` **solo** si todos los checkpoints van
  `scored: false` (si no, el editor avisa `SCORM_ACTIVITIES_IGNORED`: no puntúan).
- `min_time_seconds: 0` en **todas** las pantallas: el tiempo mínimo lo fija a mano
  el editor humano en SCORMEditor; no lo estimes.
- **Marca**: `authoring_entity` = **«MECOHISA S.L.»** (metadato de autoría) salvo que
  indiquen otra entidad; **`shell.brand` vacío** por defecto (marca visible en la
  cabecera) — rellénalo solo si se pide expresamente. No los confundas: son campos
  distintos.
- Unidad completa → modo factoría → un único `.scormproj` (o un SCORM por tema si lo
  piden expresamente).
- Test de unidad en el documento: conserva las preguntas como base, reformulando solo
  si mejora la comprensión sin alterar el sentido. Evita preguntas memorísticas.
- Foro/debate en el documento: incluye una pantalla `forum_prompt` (no calificable) y
  anota en `editor_notes` que el foro va como actividad Moodle externa si se desea
  participación trazable.

## Evaluación
Test calificable en `assessments.final_test` (`single_choice`/`true_false`). Cada
pregunta: respuesta correcta, feedback de acierto y error, explicación, objetivo
vinculado, puntuación y `source_refs`. Prioriza comprensión, aplicación y análisis de
casos sobre preguntas memorísticas. Cubre todos los objetivos del tema. Con
`score_source: "mixed"` (default), los checkpoints `scored: true` también puntúan
(su peso = `100 − mixed_final_weight`); no dupliques las preguntas del test como
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
- `final_test` presente si `score_source=final_test`; `glossary`/`bibliography` no
  vacíos; `quality_checklist` es objeto de booleanos.
- Imágenes con `alt`; audio/vídeo con `transcript` y subtítulos; `scorm.identifier` no
  vacío.
- **Títulos** (contrato §4, «Títulos: criterio editorial»): los del fuente se conservan;
  los que generes, **descriptivos sin `¿?`** («Qué es la escucha activa»); pregunta
  directa con signos solo si interpela de verdad al alumno («¿Qué harías ante una
  caída?»); varía las estructuras (no todo «Cómo…/Qué…»); tilde en «qué/cómo/por qué»
  también sin signos.
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
  **toda interactividad evaluable o de pregunta directa en pantalla propia** (sin
  teoría en `student_text`: solo una frase de contexto; el desarrollo, en la pantalla
  anterior con el mismo `title`); ejercicios prácticos
  (`case_practice`/`reflection`, `::: case`/`::: reflect`) igual, en
  **pantalla propia**, no pegados tras el contenido, con la **solución en
  `feedback.explanation`** (nunca «Resolución propuesta» visible en `student_text`);
  **cierre de cada tema**: `flashcards` + una lúdica (`word_search`/`crossword`/
  `az_quiz`, alternando entre temas, `scored: false`); **tipos reservados al editor
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
  `tabs`/`flip_cards` solo con ≤4 ítems) y **con sustancia tras el clic** (el cuerpo de
  cada ítem/tarjeta/hito claramente más extenso que su título, nunca un eco del rótulo;
  solo rótulos sin desarrollo → lista en `student_text`, no desplegable).
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
  (**nunca >3 seguidas de solo texto**); **ninguna pantalla de >~800 caracteres sin
  interactividad informativa** (repartir el texto en una que lo contenga, o dividir);
  checkpoint aplicado cada 4-5 pantallas (mín. ⌈N/5⌉, no acumulados al final),
  **alternando todo el repertorio evaluable** sin repetir tipo dos veces seguidas y
  prefiriendo decidir/clasificar/ordenar a `single_choice`; ante la duda, un
  checkpoint de más (borrar en SCORMEditor es fácil; crear, no).
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
