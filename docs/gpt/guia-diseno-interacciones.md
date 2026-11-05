# Guía de diseño instruccional e interacciones (SCORMEditor)

Complemento pedagógico de `contrato-course-json.md` (la referencia estructural) y de
`ejemplo-course-json.md` (la forma exacta). Aquí va el **criterio**: cómo trocear el
contenido, qué interacción elegir y cómo evaluar. Ante conflicto, **manda el
contrato**.

## Regla nº 1: conservar el texto original (NO resumir, NI reescribir)
El error más grave es **resumir o parafrasear**: quedarse con la idea general y tirar
frases, ejemplos, datos, definiciones, matices o ítems de lista. **No se hace eso.** El
curso debe contener el texto original **prácticamente al 100%**. Lo que cambia es la
*presentación* (repartir el texto en más pantallas cortas + interacción), **no** el
texto en sí. **No reescribas «para e-learning»**: usa las palabras del documento; solo
se permiten **retoques mínimos de conexión** para que los cortes entre pantallas sean
coherentes (partir una frase larga, añadir un titular o una frase puente, resolver un
«como se vio antes») y **micro-transiciones aditivas**: 1-2 frases propias por pantalla
donde ayuden (introducir una actividad, enlazar con el apartado anterior, cerrar un
bloque), para que el curso fluya natural y no «suene a PDF». Siempre **añadidas** al
texto fuente, nunca sustituyéndolo ni parafraseándolo (por eso el ratio puede superar
1.0). Ante la duda, **más pantallas** antes que recortar.

**Método obligatorio (con Code Interpreter):**
1. **Extrae el texto CON su formato**, no en plano: el texto plano pierde negritas y
   cajas destacadas. Con PyMuPDF usa `page.get_text("dict")` y, por cada `span`, mira
   `flags` (bit `16` = negrita) y el nombre de la fuente (contiene «Bold»/«Semibold»)
   para **conservar las negritas como `**...**`**; usa tamaño/color/recuadro para
   detectar **encabezados** (→ `## `/`### `) y **cajas destacadas** (→ callouts, ver
   abajo). Trabaja sobre lo extraído, no de memoria. **Ojo al exceso**: si la
   extracción deja **párrafos enteros consecutivos** en negrita o como encabezado
   (fuentes decorativas, cajas), restáuralos a párrafo normal y conserva el énfasis
   solo en las expresiones realmente destacadas del original.
2. **Segméntalo en bloques de contenido SUSTANCIALES**, en orden, montando primero el
   **guion de pantallas** (ver sección siguiente). Una pantalla = un
   **apartado o idea con su desarrollo completo** (varios párrafos, su lista, su
   ejemplo), NO una frase suelta. Un **encabezado va SIEMPRE junto al texto que
   introduce** (título + subtítulo + cuerpo = una pantalla, no tres). Referencia de
   densidad: apunta a **pantallas de varios párrafos** (del orden de ~250-400
   caracteres de media, como mínimo); **evita micro-diapositivas** (una frase). Salen
   las pantallas que el contenido pida (típico: **1-2 por epígrafe**), no el doble.
   - **Nunca una pantalla diminuta ni vacía** (una frase, o solo un título). Si un
     encabezado o un fragmento no da para pantalla propia, **únelo** al contenido
     contiguo.
   - **Nunca partas un título/subtítulo de su contenido** en pantallas distintas.
3. Para presentar contenido **denso o estructurado** (listas, sub-apartados, bloques
   paralelos), **usa una interactividad informativa** (accordion/tabs/flip_cards): así
   la pantalla queda rica sin ser un muro de texto **y sin trocear de más**. Preferir
   esto a partir el mismo contenido en muchas pantallas pequeñas.
4. Cada pantalla lleva su trozo del texto **casi literal**, **visible** en
   `student_text` y/o dentro de una interactividad informativa, y **además duplicado
   íntegro en `transcript`**. Nada de contenido queda solo en `transcript`.

**Objetivo cuantitativo de control:** la suma del texto conservado por tema (visible +
`transcript`, sin contar el duplicado) debe **cubrir ~100%** de la prosa de origen de
ese tema (**mínimo ≥ 0.95**, ideal ≈ 1.0; puede pasar de 1.0 por las frases puente). Si
sale por debajo, **estás resumiendo**: recupera lo omitido. **Ojo**: cubrir el 100% NO
significa muchas pantallas diminutas — se logra con pantallas **sustanciales** y con
interactividades **informativas que contienen** el texto. Menos pantallas y más densas
> muchas micro-pantallas.

**Marca el control** en `quality_checklist`:
`"Contenido del documento trazado sin pérdidas": true`.

### El guion de pantallas (obligatorio ANTES de escribir ninguna pantalla)
El troceo y el reparto de interacciones **no se deciden pantalla a pantalla mientras se
escribe** (así el ritmo sale desigual y el resultado varía entre generaciones): se
**diseñan de golpe en un guion** del tema, sobre el texto ya extraído. El guion es una
tabla con **una fila por pantalla prevista**:

**Paso 0 — marcas de autoría.** Antes de aplicar la tabla de «forma del bloque fuente»
de más abajo, escanea el texto en busca de marcas `{{alias}}…{{/alias}}` que el propio
documento pueda traer (ver `marcas-autoria.md`): una `{{diapositiva}}` fija el
**contenido exacto** de una fila (ni se parte ni se fusiona con lo vecino, aunque
incumpla otras reglas de estructura); una marca de interactividad (`{{acordeon}}`,
`{{opcion_unica}}`…) fija su **tipo**, anidada o no dentro de una `{{diapositiva}}`.
La tabla de abajo solo decide las filas que quedan **sin marca**. Si el documento no
trae ninguna, este paso no cambia nada del criterio habitual.

| # | Epígrafe fuente | Forma del bloque | Caracteres | Pantalla | Interacción | ¿Evaluable? |

**«Caracteres»** es el nº de caracteres del texto que llevará la pantalla
(`student_text` + texto dentro de su interactividad informativa, si la hay):
cuéntalo en Python sobre el texto extraído, no a ojo. Sirve para ver de un vistazo
dónde quedan muros de texto.

La **forma del bloque** (lo que se ve en el fuente) decide el patrón — no hace falta
adivinar el «objetivo cognitivo»:

| Forma del bloque fuente | Patrón de pantalla |
|---|---|
| Prosa de desarrollo | `content` con texto (+ imagen si el fuente la trae; máx. una) |
| Serie de puntos, cada uno con su figura | una pantalla por punto: texto + su imagen (`visual_resource`), titulada con **su** punto |
| 5+ ítems paralelos con desarrollo | `accordion` |
| 2-4 bloques cortos paralelos | `tabs` o `flip_cards` (alterna entre ambos) |
| 3+ ejemplos paralelos con correspondencia clara (dato→interpretación, observación→ajuste, valor→objetivo) | `flip_cards` (≤4) o `accordion` |
| Proceso o secuencia de pasos | `sort_steps` (checkpoint) o `timeline` (informativa) |
| Cronología / evolución histórica | `timeline` |
| Caso o situación que admite decisión | `scenario_decision` (checkpoint) |
| Caso aplicado con varias decisiones encadenadas (qué haces primero, y después…) | `scenario_steps` (checkpoint) |
| Diálogo con un familiar, persona usuaria o compañero en el que la respuesta tiene consecuencias | `decision_tree` (checkpoint) |
| Procedimiento con cálculo (dosis, costes, ratios, tiempos, consumos) | `calculator` `challenge` (checkpoint) o `tool` (informativa) |
| Cifras o porcentajes que el fuente destaca | `::: stats` en `student_text` |
| Dos o tres enfoques, modelos u opciones contrapuestos | `::: compare` en `student_text` |
| Recomendaciones junto a errores que evitar | `::: dodont` en `student_text` |
| Ejercicio/actividad propuesta en el fuente | pantalla propia `case_practice`/`reflection` |
| Pares término→definición, concepto→ejemplo | `flip_cards` (≤4) o glosario |
| Caja destacada del fuente | callout `::: tipo` dentro de la pantalla de su texto |
| Enlace a vídeo de YouTube | pantalla con `visual_resource` `video_youtube` (ID en `src`), no enlace de texto |
| Cierre de tema | `flashcards` + una lúdica: `word_search`/`crossword`/`az_quiz` (alterna entre temas) |

**Chequeo de ritmo sobre el guion** (corrige la TABLA antes de producir: corregir el
guion es barato; regenerar pantallas, no):
- **Informativas: ~1 de cada 3-4 pantallas de desarrollo.** Regla dura: **nunca más de
  3 pantallas seguidas de «solo texto»** (sin interacción, sin imagen y sin callout).
  Si un tramo de prosa lo supera, busca su **estructura latente** (enumeraciones
  implícitas, ejemplos, contrastes, pasos) que sí admita una informativa; si de verdad
  no la hay, rompe el tramo con una imagen o un callout del propio fuente.
- **Checkpoints evaluables: uno cada 4-5 pantallas** (mínimo ⌈N/5⌉ en un tema de N
  pantallas), repartidos —no acumulados al final—, cada uno tras un bloque aplicable
  y **en pantalla propia** (fila propia del guion, sin teoría). **Alterna todo el
  repertorio** (`single_choice`, `true_false`, `fill_blanks`, `match_pairs`,
  `classification`, `sort_steps`, `scenario_decision`, `scenario_steps`,
  `decision_tree`, `case_practice`, y `calculator` si hay cálculo) sin repetir
  tipo dos veces seguidas: decidir, clasificar u ordenar engancha y enseña más que
  reconocer una opción. Ante la duda, uno **de más** (borrar en SCORMEditor es fácil).
- **Cierre de tema**: `flashcards` (repaso) **+ una lúdica** — `word_search`,
  `crossword` o `az_quiz`, **alternando entre temas** y con `scored: false`.
- **Ninguna pantalla larga sin interactividad informativa.** El nº de caracteres es
  una **alarma secundaria**, no el criterio de división: la segmentación se decide
  por **unidad de sentido**, cambio de intención pedagógica, carga visual y esfuerzo
  mental (ver «Principio rector»). Si una fila supera **~800 caracteres** y no lleva
  informativa, revísala: o vuelca parte del texto en una que lo **contenga**
  (accordion/tabs, sin resumir), o divide la pantalla **por donde cambia la idea** —
  nunca con un corte mecánico de longitud. Si lleva imagen (y por tanto no admite
  interacción, ver regla estructural), divídela.
- **Variedad**: no repitas el mismo tipo (informativo o evaluable) dos veces seguidas.
- **Filas fijadas por marca (paso 0)**: cuentan para este chequeo igual que una
  automática (una `{{acordeon}}` ya cubre el hueco de informativa de su tramo); el
  relleno automático solo entra donde, con las marcas puestas, el ritmo siga
  incumplido. Si el documento trae más marcas de las que el ritmo pediría, se
  respetan todas — el documento manda por encima del ritmo aproximado.

El guion es **interno por defecto**: no se pregunta al usuario y se adjunta al informe
final. Si la orden incluye **«enséñame el guion»**, entrega la tabla completa de la
unidad y **espera su OK o correcciones antes de producir**.

### Formato de `student_text` (cómo escribir el texto de la diapositiva)
La diapositiva es **solo el contenido**: un texto normal con su formato. **NO** añadas
por diapositiva rótulos tipo `**Idea clave:**`, `**Claves:**`, `Resumen`, `Objetivo:`
ni cajitas de «lo importante»: eso ensucia y repite. Solo el contenido.
- **Nunca truncar con «…» o «...».** El `student_text` lleva el texto **completo** del
  trozo, no una vista previa recortada. Si es largo, **más pantallas**, no puntos
  suspensivos.
- **Listas**: cada elemento en **su propia línea**, empezando por `- ` (guion +
  espacio). No pongas la lista en una sola línea (`a • b • c`) ni con viñeta `•`: el
  editor la mostraría como un párrafo corrido. Numeradas: `1. `, `2. `… Para un
  sub-elemento, la misma línea con **2 espacios** delante por nivel (`  - detalle`).
- **Encabezados**: el título de un apartado va con `## ` o `### ` en una línea con
  **solo el título** (el cuerpo, en la línea siguiente). **No** metas el título dentro
  del párrafo («TítuloTexto que sigue…»), ni el cuerpo en la misma línea del `##`
  (`### Título ¿…? El texto sigue aquí…` → saldría todo como un encabezado gigante),
  ni como una línea suelta en negrita.
- **Negrita** `**así**`, **cursiva** `*así*`. **Conserva las negritas del documento
  fuente**: si una palabra o frase va en negrita en el original, mantenla en negrita
  (`**...**`). No inventes negritas donde no las hay.
- **Enlaces externos**: detéctalos en el origen y **presérvalos** como `[texto](url)`
  (http/https o mailto). En un PDF los enlaces son **anotaciones**, no texto:
  `extract_text_markdown` (contrato §11) ya los captura (`page.get_links()`) y los
  emite como `[texto](url)` — no los elimines al segmentar. Una **URL suelta** del
  documento (`https://…`) envuélvela también como `[texto](url)`, si no, no se
  renderiza como enlace. El editor los abre **en otra pestaña** automáticamente
  (`target="_blank"`); no añadas tú ese atributo, es texto plano. **Excepción — vídeos
  de YouTube**: un enlace a YouTube no se deja como enlace de texto; su pantalla lleva
  el vídeo **embebido** con `visual_resource.kind="video_youtube"` (ID en `src`,
  contrato §5): el alumno lo ve dentro del curso sin salir del SCORM.

### El `title` de la pantalla (cabecera): corto y descriptivo
El campo `title` se muestra como cabecera (`<h1>`) de la diapositiva. Es un **rótulo
corto** (2-6 palabras) de lo que trata la pantalla: `"Qué información recoger"`,
`"Áreas clave de la historia de vida"`. **NO** un fragmento del contenido cortado a
mitad de frase (errores reales: `title = "Se va elaborando:"`, `title = "Pero para
poder diseñar apoyos realmente pers…"`, `title = "- Religión"`).
- **No dupliques el `title` en el contenido.** El `title` ya sale como cabecera; el
  `student_text` **empieza por el cuerpo**, NO por un `## `/`### ` que repita el título.
  Usa `### ` dentro del contenido **solo** para sub-secciones reales distintas del
  título (y con solo el título en su línea; el cuerpo, en la siguiente).
- **Continuación**: si un apartado/subtema se parte en **varias pantallas**, todas
  **mantienen el mismo `title`** (la diapositiva es continuación de la anterior); no
  pongas de título el primer ítem de la lista que continúa.
- **Serie de tipos/formatos/casos: título específico.** El `title` repetido es solo
  para la *continuación de una misma idea*. Cuando cada pantalla de una serie explica
  un **elemento concreto con nombre propio** (un formato, un tipo, un caso:
  «Relato narrativo», «Línea de vida», «Material gráfico»), titúlala con **ese
  elemento**, no repitas el rótulo genérico del epígrafe («Formatos de registro») en
  todas: el título informativo orienta más en el índice y en la navegación.
- **Numeración de epígrafes: todo o nada (coherencia).** Si el documento numera los
  apartados (`3.1`, `3.2`…), **decídelo una vez para toda la unidad**: o **conservas la
  numeración en TODOS** los `title` o la **quitas en TODOS**. Nunca mezcles (unos con
  `3.1` y otros sin número, o saltar de `3.1` a `3.8`). **Por defecto, quítala**: el
  `title` es un rótulo corto y limpio (`"Evaluación y ajuste"`, no `"3.8 Evaluación y
  ajuste"`); el orden ya lo da la secuencia de pantallas.
- **Nunca titules una interacción `"Checkpoint"`, `"Checkpoint de…"`, `"Actividad"` ni
  similar.** El `title` de una pantalla con interacción es **el del tema que se trabaja**
  (`"Áreas clave"`, `"Formatos de recogida"`), igual que una de contenido. La app antepone
  **automáticamente** `"Actividad: "` al título en la Vista estudiante cuando la
  interacción puntúa (además de colorear la pantalla), así que **no** hace falta
  anunciarlo en el `title` que generas.

### Imágenes: máximo UNA por pantalla, siempre como `visual_resource`
- **NUNCA incrustes imágenes con `![alt](ruta)` dentro de `student_text`**: esa
  sintaxis existe para el editor humano, no para la generación. Error real a evitar:
  una pantalla con una imagen en `visual_resource` y **dos más** incrustadas en el
  texto.
- Mismo criterio para vídeo: **NUNCA** `![alt](https://youtube.com/...)` en
  `student_text` (misma sintaxis que la imagen si la URL es de YouTube, también
  exclusiva del editor humano). Todo vídeo va como `visual_resource.kind:
  'video_youtube'` o como interacción `video`.
- **Serie de puntos ilustrados** (cada formato/ejemplo/paso del apartado con su
  figura): **una pantalla por punto**, cada una con su texto y su imagen como
  `visual_resource`, y **titulada con su punto concreto** («Relato narrativo»,
  «Línea de vida»), no con el rótulo genérico del apartado repetido. No aglutines
  las figuras de un apartado en una sola pantalla.
- El **texto interno de una infografía** (rótulos, flechas «→», etiquetas de un
  esquema) NO se vuelca como párrafos sueltos en `student_text`: la imagen ya lo
  muestra y como prosa quedan frases colgadas sin sentido. Lo esencial va en
  `alt`/`caption` y, si procede, en `transcript`.

Coloca cada imagen según su forma, para que el texto respire (SCORMEditor ya lo
soporta; al extraer del PDF conoces `width`/`height`, calcula el ratio):
- **Apaisada** (ancho > alto, ratio ≳ 1.2) → `"layout": "top"` (o `"bottom"`): encima o
  debajo del texto, a lo ancho.
- **Cuadrada o vertical** (alto ≥ ancho) → `"layout": "right"` con `"media_width": "50"`
  (o `"33"` si es muy vertical): la imagen al lado y el texto a su izquierda.

**Regla estructural (imagen + texto + interacción):** si una pantalla ya lleva **imagen
+ texto de desarrollo**, NO añadas **ninguna** interacción en ella — **tampoco
informativa** (tabs/timeline/accordion: fallos reales en «Entrevista y conversación»,
«Cuándo recoger» y «Documentación útil»). Entiende el texto y la imagen y compón **dos
pantallas** con el **mismo `title`**: (1) el texto con su recurso visual (o solo el
recurso) y (2) la interactividad, con una breve **frase introductoria** en
`student_text` si hace falta para entenderla — nada más.

### Presentar el texto de forma amena (interactividades informativas)
**Úsalas de forma habitual** para el contenido denso o estructurado: son la forma de
tener pantallas ricas sin muros de texto ni trocear de más. Meten el texto fuente en un
formato ameno (**lo contienen**, no lo resumen). Un tema suele llevar **varias**: el
ritmo del guion pide ~1 de cada 3-4 pantallas de desarrollo (en una unidad de ~80
pantallas, del orden de ~20 informativas además de los checkpoints). **No las elimines
convirtiéndolas en pantallas de texto pequeñas.** Cuándo:
- **`accordion`**: sub-apartados o lista de puntos con desarrollo → cada `item` = un
  apartado con su texto original. **Es la opción por defecto cuando hay muchos ítems**
  (5+) o textos largos: crece hacia abajo y siempre cabe.
- **`tabs`**: **solo para 2-4** bloques paralelos y **cortos** (tipos, fases, enfoques)
  → una pestaña por bloque. Con **más de 4 ítems o textos largos, NO uses tabs** (no
  caben en horizontal): usa `accordion`.
- **`flip_cards`**: pares término→definición, concepto→ejemplo → `front`/`back`.
  Igual que `tabs`, **solo con 4 o menos elementos** y textos cortos. Detecta también
  los **ejemplos paralelos con correspondencia clara** (un dato, valor u observación →
  su interpretación, objetivo o actuación): tres o más de esos pares piden tarjetas
  (o `accordion`, si son más de 4 o largos) antes que párrafos repetitivos.
- **`timeline`**: evolución histórica, fases de un proceso con fechas/etapas →
  `milestones` en orden con `label` (fecha/fase), `title` y `body`. Ideal cuando el
  fuente narra cronología o secuencia de hitos.
El texto de cada `item`/`tab`/`card`/hito es el **texto fuente** de esa parte. En
`transcript` va igualmente el trozo completo.

**Varía los tipos informativos.** No conviertas cada bloque estructurado en un
`accordion` por inercia: si el contenido lo permite (2-4 ítems cortos → `tabs` o
`flip_cards`; secuencia/fases → `timeline`), **alterna** para que la unidad no repita
siempre el mismo patrón. El `accordion` es el comodín para ítems largos o numerosos
(5+), no la única opción.

**Detrás del clic debe haber sustancia.** El sentido de un desplegable es descubrir un
desarrollo: el cuerpo de cada ítem (`body` del accordion/tab/hito, `back` de la tarjeta)
debe ser claramente **más extenso y descriptivo que el título que se clica** — varias
frases del texto fuente, nunca una frase que repite o parafrasea lo que ya dice el
rótulo (clicar para leer lo mismo frustra y resta credibilidad al curso). Si el fuente
solo da una lista de rótulos sin desarrollo (nombres, etiquetas de un esquema), **no hay
nada que desplegar**: preséntala como lista `- ` en `student_text` (o como callout) y
reserva la informativa para un bloque que sí tenga contenido detrás. Este criterio manda
sobre el ritmo del guion: mejor una pantalla de texto de más que un desplegable hueco.

**Una interacción = UNA pantalla, con TODOS sus ítems.** No la partas en varias
pantallas: un accordion «Áreas clave» con 8 apartados es **un** accordion en **una**
pantalla, no «Áreas clave (1)» / «(2)». Lo mismo con `tabs`/`flip_cards`. Dentro de un
`item`/`tab`/`card`, si hay una lista, cada elemento en **su propia línea** con `- `
(el editor la renderiza como lista dentro del bloque).

**Nunca una interacción tras varios párrafos de desarrollo — y siempre con una
introducción breve.** Vale para **toda** interacción, también las informativas:
si en la misma pantalla compiten una explicación larga (varios párrafos, apartados
o listas en `student_text`) y una interacción debajo, **sepáralas** — primero la
pantalla de explicación, después la de exploración o práctica. En la pantalla de la
interacción, el `student_text` lleva como mucho una **introducción breve y natural
(1-2 frases: qué va a hacer el alumno y para qué)**, sin repetir la explicación.
(Recuerda: una informativa que **contiene** el texto fuente es ella misma el cuerpo
de la pantalla — eso no es «texto + interacción», es la forma correcta.)

**`prompt` e `instructions`: dicen cosas distintas y, si no aportan, van vacíos.**
- `prompt` (enunciado) = **la tarea o la pregunta** para este contenido concreto
  («¿Qué hacer ante un paciente con…?»). `instructions` = **solo la mecánica** del
  componente, y solo si no es evidente («Arrastra cada pieza a su lugar y pulsa
  Comprobar»).
- **Nunca** el mismo mensaje dicho dos veces con otras palabras entre ambos campos, ni
  repetir el `title` de la pantalla o su `student_text`. Mejor **vacío** (`""`) que
  relleno: en `accordion`/`tabs`/`flip_cards`/`timeline`/`image_cards` el `prompt` va
  vacío salvo que haya una tarea real, y `instructions` se queda en una frase de
  mecánica o vacío.
- **Prohibido** en ambos campos: avisos de bloqueo o progreso («No podrás avanzar hasta
  haber leído todas», «Debes abrirlas todas»…) — la carcasa ya lo indica sola —, y
  frases vacías del tipo «Abre las pestañas para revisar cada aspecto», «Explora el
  contenido», «Lee con atención».

**Formato DENTRO de los campos de interacción (lo que renderiza la carcasa).** Los
campos de texto corto — `prompt`, `instructions`, `scenario`, textos de `options`,
`feedback.*`, `front`/`back` de tarjetas, `title`/`label` de ítems — solo renderizan
`**negrita**`, `*cursiva*` y `[enlaces](url)`: un `## `, un callout `::: tipo`, una
lista `- ` o un intento de párrafos ahí se muestran **literales**, con los símbolos a
la vista. El markdown de bloque completo (párrafos, listas, encabezados) funciona
**solo** en los cuerpos largos: `body` de `accordion`/`tabs`/hitos de `timeline` y
`text` de `image_cards`. Si al segmentar te queda un encabezado o un callout dentro
de un campo corto, sácalo a `student_text` o intégralo como frase.

**Posición respecto al texto (`interaction_layout`):** por defecto la interacción va
**debajo** del texto (`"bottom"`); pon `"interaction_layout": "top"` en la pantalla
para colocarla **encima** del texto, cuando el manual fuente presente antes la actividad
y luego el desarrollo (también ajustable en el editor).

**Toda interactividad evaluable o de pregunta directa, en pantalla propia.** No
mezcles teoría en `student_text` con una evaluable (`single_choice`, `true_false`,
`fill_blanks`, `match_pairs`, `classification`, `sort_steps`, `scenario_decision`…):
el desarrollo va en su pantalla y la pregunta en la **siguiente** (mismo `title`),
cuyo `student_text` lleva como mucho una frase de contexto — el enunciado ya va en
`prompt`/`instructions`. Lo mismo con los ejercicios prácticos: `case_practice`,
`reflection` y los callouts con tarea (`::: case`, `::: reflect` que proponen un
ejercicio al alumno) no se pegan al final de una pantalla de contenido: el ejercicio
va en la **siguiente**, con solo su enunciado/introducción. Una pantalla «lista de
errores + caso práctico debajo» son **dos** pantallas. **La solución de la actividad nunca va visible**: la
«Resolución propuesta» / «Clave de reflexión» / respuesta modelo del original se vuelca
en el `feedback.explanation` de la interacción, no en `student_text` — si el alumno la
ve junto al enunciado, la actividad pierde el sentido. El enunciado va limpio, sin
rótulos («**Actividad práctica**», «**Resolución propuesta:**»…).

### Cadencia de interactividades
El ritmo se fija en el **guion** (ver arriba), no improvisando pantalla a pantalla:
- **Informativas** (accordion/tabs/flip_cards/timeline) a razón de **~1 de cada 3-4
  pantallas de desarrollo**; nunca más de 3 seguidas de solo texto (**no las suprimas**
  en favor de micro-pantallas de texto).
- **Aplicadas y evaluables** (`scenario_decision`, `scenario_steps`, `decision_tree`,
  `classification`, `sort_steps`, `single_choice`, `case_practice`) como **checkpoints repartidos a lo largo del tema,
  uno cada 4-5 pantallas** de contenido. Es **obligatorio el reparto**: **NO las
  acumules al final**. Regla práctica: un tema de N pantallas lleva **al menos ⌈N/5⌉
  checkpoints** intercalados (un tema de 30 → ~6, hacia las pantallas 5, 10, 15, 20,
  25, 30), no dos seguidas en la 28-29. **Si con las que salen no llegas a esa
  densidad, añade más** donde el contenido se pueda aplicar/decidir (cada checkpoint,
  tras un bloque aplicable), **en pantalla propia** (sin teoría) y **alternando todo
  el repertorio evaluable** (`single_choice`, `true_false`, `fill_blanks`,
  `match_pairs`, `classification`, `sort_steps`, `scenario_decision`,
  `scenario_steps`, `decision_tree`, `case_practice`, y `calculator` si hay cálculo)
  sin repetir tipo dos veces seguidas — decidir/clasificar/ordenar
  antes que reconocer una opción. Ante la duda, genera un checkpoint **de más**: en
  SCORMEditor retocar o borrar es fácil; crear desde cero, no.
- **Una sola interacción por pantalla** (contrato): el checkpoint es su propia
  pantalla. Y si una interacción **repite conceptos** ya vistos, llévala a la
  **siguiente** pantalla o suprímela; no dupliques.

### Evitar el truncado por límite de respuesta (clave)
Un `course.json` con transcripts completos pesa mucho (cientos de KB). **No lo
generes tecleándolo entero en el chat**: ahí es donde el modelo comprime para que
quepa. En su lugar, **constrúyelo en Python por partes** (un `dict` por tema, los vas
acumulando) y **vuelca el resultado al `.scormproj`** con el builder del contrato
(§11). Si aun así es enorme, genera la unidad **tema a tema** y combina los `dict`
antes de empaquetar. El usuario solo recibe el archivo, no el JSON.

## Principio rector: una idea por pantalla (una idea, no una frase)
Cada pantalla desarrolla **una idea/apartado completo** (varios párrafos, su lista, su
ejemplo). Divide una pantalla **solo** cuando mezcle **dos ideas distintas** o el
cuerpo sea **realmente largo** (más de lo que se lee cómodo de una vez). **No** dividas
por dividir: un apartado corto pero completo es **una** pantalla, no tres frases en
tres pantallas. Si un apartado es denso o va en lista, preséntalo con una interactividad
informativa antes que trocearlo.

**Una pantalla = una sola acción mental.** Además de una sola idea, cada pantalla debe
exigir al alumno **una única acción**: comprender, explorar, practicar, decidir o
repasar. Señales de que toca **pantalla nueva** aunque el epígrafe fuente sea uno:
- **Cambia la intención pedagógica**: de definición a aplicación, de explicación a
  actividad, de errores a evaluación, de descripción general a situación especial. Caso
  típico: un apartado que explica **cómo se hace** un procedimiento y remata con una
  lista distinta de **para qué sirve / qué beneficios aporta** — esos beneficios suelen
  merecer pantalla propia tras la primera.
- **Varios subtítulos**, o **dos bloques destacados con funciones diferentes**, en la
  misma pantalla: divide, o traslada uno de los bloques a la pantalla vecina a la que
  pertenece por sentido.
- En contenidos de **observación o diagnóstico**, separa cuando el fuente lo dé:
  *cómo* observar, *qué* señales observar y *cómo interpretar* lo observado (los
  ejemplos observación→ajuste, en una informativa; ver tabla del guion).

**Pero no fragmentes en automático.** Una explicación se queda **junto al ejemplo que
la hace comprensible**; divide solo si **cada pantalla resultante** tiene un propósito
propio y un título significativo. Y el nº de caracteres es una **alarma secundaria**,
no el criterio: manda la unidad de sentido, el cambio de intención, la carga visual y
el esfuerzo mental que se pide al alumno.

**Un sub-epígrafe con texto suficiente = su propia pantalla.** No metas **dos
sub-apartados numerados** distintos (p. ej. `3.8` y `3.9`) en una misma pantalla si cada
uno tiene desarrollo propio: cada uno va en su diapositiva. Solo se agrupan si son muy
breves y comparten idea.

**No juntes texto + imagen + interacción en una misma pantalla.** Cuando un apartado
tenga contenido sustancial **con imagen** *y además* pida una interacción, **sepáralo en
dos pantallas**: (1) el desarrollo con su `visual_resource` (texto + imagen) y (2) la
interacción (misma temática, sin repetir la imagen). Una pantalla con texto largo,
imagen y actividad a la vez queda saturada y obliga al alumno a hacer scroll. La
interacción puede llevar un `prompt` breve que la contextualice. (Sí es correcto que una
interacción **informativa** —accordion/tabs/flip_cards— sea el cuerpo de la pantalla sin
imagen aparte.)

Ritmo recomendado por tema: portada → objetivos → ruta → pantallas de desarrollo
**sustanciales** (intercalando informativas y checkpoints) → casos → **repaso lúdico**
(`flashcards` + `word_search`/`crossword`/`az_quiz`) → resumen →
autoevaluación → glosario/bibliografía (en sus arrays raíz). Las pantallas las manda el
contenido, pero **densas**: como referencia, el resultado buscado tenía ~80 pantallas
en una unidad, no ~160.

## Objetivos de aprendizaje: pocos, derivados y compartidos
Define los objetivos **antes** de trocear en pantallas, a partir de tres fuentes:
(1) el **contenido real** del documento, (2) los **objetivos que el usuario indique**
en su petición y (3) la **normativa o ficha facilitada** (certificado de
profesionalidad, programa formativo…). Su número lo manda el contenido: tantos como
aprendizajes evaluables distintos haya — **ni una cuota fija ni uno por diapositiva**.

- **Redacción**: verbo de acción + contenido (definir, reconocer, aplicar, analizar…),
  formulado de modo que se pueda evaluar.
- **Reutiliza el texto EXACTO**: todas las pantallas que desarrollan un objetivo
  repiten su texto idéntico en `objective`. Cada pantalla declara **solo su objetivo
  principal** (aunque de paso toque otros). Para el editor, un texto distinto = un
  objetivo distinto.
- Pantallas `objectives`/`route`: usa el objetivo principal del tema; **no** inventes
  meta-objetivos tipo «Presentar el recorrido del tema» (nunca tendrían evaluación y
  ensucian la trazabilidad).
- **Cobertura**: cada objetivo declarado debe tener al menos una evaluación — una
  interacción `scored` en una pantalla con ese `objective` (la interacción no lleva
  `learning_objective` propio: evalúa el de su pantalla), o una pregunta del test cuyo
  `learning_objective` copie el texto literal. Si un objetivo se queda sin evaluación,
  falta una interacción evaluable o una pregunta (o sobra el objetivo).

## Detectar bloques destacados (callouts) en el documento de origen
Los documentos suelen traer ya «cajas», recuadros de color o frases con intención de
aviso, consejo, dato curioso, caso o reflexión. **Es obligatorio reconocerlas y
volcarlas como callout** en `student_text` (sintaxis `::: tipo … :::`, ver §4.1 del
contrato) en vez de perderlas como texto plano. Detéctalas por su **etiqueta**
(«Importante», «¿Sabías que?»…) y, cuando extraigas con formato (ver Regla Nº1, paso 1),
también por su **recuadro/color de fondo** aunque no lleven etiqueta. Heurística de
mapeo:

| Señal en el origen | Callout |
|---|---|
| «Consejo», «Truco», «Recomendación», «Buena práctica» | `tip` |
| «Atención», «Cuidado», «Aviso», «Importante evitar», «¡Ojo!» | `warn` |
| «Importante», «Recuerda», «Clave», «No olvides» | `important` |
| «¿Sabías que…?», «Dato», «Curiosidad» | `fact` |
| «Reflexiona», «Piensa en…», «Para reflexionar» | `reflect` |
| «Caso práctico», «Ejemplo», «Situación», «Supuesto» | `case` |
| Nota informativa general que no encaja arriba | `info` |
| Una caja recurrente del documento sin equivalente (p. ej. «Glosario», «Normativa») | `custom` con icono/color |

Pautas:
- No fuerces callouts: un párrafo normal de desarrollo va como texto, no como caja.
- **Nunca un callout vacío**: `::: fact` seguido de `:::` sin cuerpo es un error real
  observado; si no tienes el texto de la caja, no emitas la caja (el editor lo marca
  con el aviso `CALLOUT_EMPTY`).
- Si un «Caso práctico» del documento admite una decisión, valora convertirlo en
  interacción `scenario_decision` (o `scenario_steps` si encadena varias) en vez de
  (o además de) un callout `case`.
- **Bloques con estructura** (`::: stats`, `::: compare`, `::: dodont`, contrato
  §4.1): cuando el fuente ya trae cifras que destacan, enfoques contrapuestos o una
  lista de «qué hacer» frente a «qué evitar», vuélcalo en el bloque correspondiente
  en vez de en párrafos o listas sueltas: el texto es el mismo (Regla Nº1), solo se
  maqueta mejor y rompe un tramo de «solo texto». No inventes cifras ni fuerces la
  oposición si el fuente no la plantea.
- No abuses: 1–2 callouts por pantalla como mucho; si hay más, probablemente toque
  trocear la pantalla.

## Elegir la interacción adecuada
Cuando toque una interacción (no en cada pantalla; ver «Cadencia»), este es el criterio
rápido para elegir el tipo:

| Objetivo cognitivo | Interacción sugerida | Evalúa |
|---|---|---|
| Recordar/identificar | `single_choice`, `true_false` | Sí |
| Recordar terminología en contexto | `fill_blanks` (huecos `[[...]]`; `mode: "type"` para escribir sin pista) | Sí |
| Comprender relaciones | `match_pairs`, `classification` | Sí |
| Ordenar un proceso | `sort_steps` (con `explanation` por paso si el fuente da el porqué) | Sí |
| Cronología / evolución por fases | `timeline` | No |
| Aplicar a un caso / decidir | `scenario_decision`, `case_practice` | Sí / abierta |
| Aplicar a un caso con varias decisiones seguidas | `scenario_steps` | Sí (parcial) |
| Practicar una conversación difícil | `decision_tree` | Sí |
| Aplicar un cálculo del procedimiento | `calculator` (`challenge`; `tool` = calculadora sin nota) | Sí / No |
| Explorar información densa | `accordion`, `tabs`, `flip_cards` | No |
| Repasar al cierre del tema | `flashcards` + una lúdica: `word_search`/`crossword`/`az_quiz` | No |

Reglas de oro:
- **Máximo una interacción por pantalla.**
- Las informativas (`accordion`, `tabs`, `flip_cards`, `timeline`, `case_practice`),
  las `flashcards` y las lúdicas de cierre (`word_search`/`crossword`/`az_quiz`)
  llevan `scored: false`.
- Las evaluables llevan respuesta correcta + `feedback` (acierto/error) +
  `explanation`. Siempre `source_refs` (el objetivo lo pone la pantalla: la
  interacción no lleva `learning_objective` propio).
- No abuses de `single_choice`: si puedes pedir **clasificar, ordenar o decidir**,
  el aprendizaje es más profundo que reconocer una opción.
- **Tipos reservados al editor humano — NO los generes**: `hotspots`, `before_after`,
  `hidden_image`, `puzzle`, `video` (vídeo interactivo con preguntas) y `html_embed`
  (código a medida): piden elegir y ajustar a mano una imagen, un medio o un código;
  el humano los añade desde SCORMEditor si procede. Ojo a la distinción: los vídeos
  de YouTube del fuente **sí** van, pero como `visual_resource` `video_youtube`, no
  como interacción `video`.

### Prácticas de varios pasos: cuándo sí y cuándo no
`scenario_steps`, `decision_tree` y `calculator` son solo texto (sin imágenes ni
código), así que **sí los generas** — forma exacta en el contrato §6. Son los
checkpoints más ricos del repertorio, pero cuestan más de leer: úsalos donde el
contenido los pide, no por variar.
- **`scenario_steps` (caso por decisiones)**: el fuente plantea un caso aplicado
  (protocolo, actuación ante una incidencia) con **varias decisiones encadenadas**.
  2-5 pasos, cada uno con su situación y 2-4 opciones con comentario propio; puntúa
  en proporción a los aciertos. Si el caso solo tiene una decisión,
  `scenario_decision`.
- **`decision_tree` (conversación ramificada)**: el contenido trata de **comunicarse**
  con alguien (familiar, persona usuaria, compañero, superior) y la forma de responder
  cambia el desenlace (acogida, queja, conflicto, mala noticia). Pequeño y legible:
  **4-8 momentos, 2-3 respuestas por momento**, sin bucles, con al menos un final
  bueno y algún final mejorable que explique por qué. Personajes con nombre y papel
  verosímiles; las réplicas, breves y naturales.
- **`calculator` (reto numérico)**: solo si el procedimiento **ya incluye un
  cálculo** (dosis, costes, ratios, tiempos, consumos, plazos). Datos y fórmula salen
  del fuente o de un supuesto coherente con él; comprueba el resultado en Python.
  `mode: "tool"` (`scored: false`) cuando lo útil es que el alumno pruebe sus propios
  datos. **No fuerces un cálculo** donde el contenido no lo tiene.
- Cuentan como un checkpoint más para el ritmo y la alternancia (no dos seguidos del
  mismo tipo). En un tema, como mucho uno o dos de estos tres: son intensos.

## De reflexión pasiva a actividad corregible
Convierte «reflexiona sobre…» en algo accionable siempre que puedas:
- ¿Hay una respuesta razonable y defendible? → `scenario_decision` con feedback.
- ¿Es debate humano sin respuesta única? → pantalla `reflection` o `forum_prompt`,
  y nota en `editor_notes` de que el foro va como actividad Moodle externa.
- ¿Respuesta abierta con criterios? → `case_practice` con `config.rubric`.

## Diseño de la autoevaluación (`assessments.final_test`)
- Solo `single_choice` o `true_false` (el test usa selección única).
- Prioriza **comprensión y aplicación** sobre memorización: pregunta por casos,
  consecuencias y decisiones, no por definiciones literales.
- Cada pregunta: respuesta correcta, `feedback` acierto/error, `explanation`,
  `learning_objective`, `points` y `source_refs`.
- Cubre los objetivos del tema: si un objetivo no tiene pregunta que lo mida, falta
  una pregunta.
- Distractores plausibles (errores típicos reales), no opciones absurdas de relleno.
- **El test va SOLO en `assessments.final_test`.** NO crees una pantalla `unit_quiz`
  (ni otra) con el test como texto: saldría duplicado (texto + interactivo). El runtime
  añade solo la pantalla interactiva del test **y** una **pantalla de Resultados**
  (nota + APTO/NO APTO); **no** crees tú una pantalla de resultados/calificaciones.

## Accesibilidad (no negociable)
- Toda imagen con `alt` descriptivo (no «imagen» ni el nombre del fichero).
- Audio/vídeo con `transcript`; medios con voz (`has_voice:true`) con `tracks` VTT.
- No transmitas información solo por color; refuerza con texto.
- Feedback siempre textual.

## Trazabilidad y rigor
- `source_refs` en pantallas, interacciones, preguntas, glosario.
- No inventes normativa ni datos. Lo derivado del documento se marca con `transform`
  (`resumen`, `reescritura`…).
- Nada de afirmaciones de homologación SEPE: «preparado para revisión por la entidad».

## Errores frecuentes a evitar (antipatrones)
- `screens` en la raíz → SIEMPRE en `modules[].units[].screens[]`.
- Inventar claves (`metadata`, `risks`, `compliance`…) → solo las del contrato.
- `quality_checklist` como array → es **objeto** de booleanos.
- `bibliography` con `reference` → la clave es **`ref`**.
- Usar `retries` pensando en intentos del editor: el contrato usa `retries`
  (`0` = ilimitados); no mezcles con otros nombres.
- Tipos inexistentes: `match_to_category`/`classify` → `classification`;
  `decision` → `scenario_decision`; `reflection_note` → `case_practice` o pantalla
  `reflection`; `*_acknowledgement` → omitir.
- Notas internas («este SCO», «esta pantalla») dentro de `student_text`/`transcript`.
- Dejar un `visual_resource.src` apuntando a una imagen que **no** está en el ZIP.
- **Fallos de análisis estructural** (frecuentes, evítalos):
  - **Micro-diapositivas**: trocear en pantallas de una frase. Cada pantalla es un
    apartado con su desarrollo (varios párrafos); menos pantallas y más densas.
  - **Eliminar interactividades informativas** convirtiendo un accordion/tabs en varias
    pantallas de texto pequeñas: al revés, **unifica** el contenido denso EN un
    accordion/tabs.
  - Pantalla **vacía o diminuta**: solo un título, o una frase suelta.
  - **Aislar un encabezado** en su propia pantalla y el cuerpo en otra: van juntos.
  - **Partir título + subtítulo + contenido en 3 pantallas**: son **una** pantalla.
  - **`title` = fragmento del texto** (mitad de frase) o repetido como primera línea
    del `student_text`: el `title` es un rótulo corto y el cuerpo NO lo repite.
  - **Partir una interacción en dos pantallas** (un accordion/tabs «(1)»/«(2)»): una
    interacción va entera en una pantalla, con todos sus ítems.
  - **Partir una actividad/reflexión/caso** (`case_practice`, `reflection`,
    `forum_prompt`) en varias pantallas: la actividad completa (tareas + cómo
    realizarla + preguntas) es **una sola** pantalla, aunque sea larga.
  - **Titular una interacción `"Checkpoint…"`** (o `"Actividad"`): el `title` es el del
    tema; la app ya rotula el tipo de ejercicio.
  - **Numeración de epígrafes inconsistente** en los `title` (unos con `3.1`, otros sin
    número, saltos como `3.1`→`3.8`): o en todos o en ninguno (por defecto, en ninguno).
  - **Texto + imagen + interacción en la misma pantalla**: separa el desarrollo con
    imagen (una pantalla) de la interacción (otra).
  - **Dos sub-epígrafes con desarrollo (`3.8` y `3.9`) en una sola pantalla**: uno por
    pantalla.
  - **Primer bloque que el `title` no anuncia** (p. ej. una lista de errores
    frecuentes bajo el título «Revisión y ajuste»): frontera mal cortada — ese bloque
    pertenece a la pantalla anterior o pide pantalla propia.
  - **Varias imágenes en una pantalla** (una en `visual_resource` + otras `![...]`
    en el texto): máximo una por pantalla; serie ilustrada → una pantalla por punto.
  - **Desplegable hueco**: accordion/tabs/flip_cards/timeline cuyos cuerpos casi
    repiten el título que se clica. Sin desarrollo real detrás del clic, el bloque va
    como lista en `student_text`, no como interacción.
  - **Interacción tras un muro de texto**: varios párrafos, apartados o listas en
    `student_text` con la interacción debajo. Separa: explicación (una pantalla) y
    exploración/práctica (la siguiente, con 1-2 frases de introducción).
  - **Markdown no soportado en campos de interacción**: `## `, `::: tipo` o listas en
    `prompt`/`instructions`/opciones/feedback/`front`/`back` salen **literales**. Ahí
    solo negrita, cursiva y enlaces; el markdown completo, en `student_text` y en los
    `body` de accordion/tabs/timeline (y `text` de image_cards).
  - **Párrafos enteros en negrita o como encabezado** heredados de la extracción del
    PDF: restaura el párrafo normal y deja el énfasis solo en lo realmente destacado.
  - **Título genérico repetido en una serie de tipos/formatos/casos**: cada pantalla
    de la serie se titula con su elemento concreto («Relato narrativo»), no con el
    rótulo del epígrafe («Formatos») clonado; el mismo `title` solo señala la
    continuación de una misma idea.
