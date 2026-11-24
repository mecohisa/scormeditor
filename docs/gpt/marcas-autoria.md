# Marcas de autoría en el documento fuente

Complementa `contrato-course-json.md` (referencia normativa) y
`guia-diseno-interacciones.md` (criterio pedagógico automático). Aquí se define una
capa **opcional y aditiva**: el autor del documento (Word/PDF/página de Moodle) puede
marcar directamente en su texto qué quiere y dónde, sin tocar el criterio automático
del resto del documento. Si el documento no trae ninguna marca, el comportamiento es
**exactamente el actual**: todo se decide con el criterio automático de
`guia-diseno-interacciones.md`.

Hay **cuatro familias** de marca, con sintaxis idéntica pero función distinta:

- **Marca de corte** (`{{diapositiva}}…{{/diapositiva}}`, §2): fija el **contenido
  exacto de una pantalla**. El autor decide dónde empieza y acaba, y el GPT no puede
  ni partirla ni fusionarla con texto vecino.
- **Marcas de interactividad** (`{{acordeon}}`, `{{opcion_unica}}`… §3): fijan **qué
  tipo de interactividad** debe salir de un bloque, sin decidir por sí solas los
  límites de la pantalla que la contiene (eso lo sigue decidiendo el criterio
  automático, salvo que estén anidadas dentro de una marca de corte, §4).
- **Marcas de destacado** (`{{consejo}}`, `{{cifras}}`, `{{que_hacer}}`… §3 bis): fijan
  que un trozo de texto vaya, **literal**, en un callout o bloque con estructura
  (contrato §4.1) dentro del `student_text`. No crean interacción ni fijan límites.
- **Marca de marco** (`{{marco: rótulo}}`, §3 ter): envuelve una o varias pantallas en un
  marco de color para que se lean como una unidad.

## 1. Sintaxis común

Un bloque marcado se delimita así, con el **alias** entre llaves dobles:

```
{{alias}}
texto del bloque
{{/alias}}
```

- El cierre debe repetir el mismo alias (`{{/alias}}`). Si el alias de cierre no
  coincide, o falta el cierre, cierra el bloque en el siguiente encabezado/salto de
  sección y añade un `editor_notes` pidiendo que se revise ese punto del documento.
- Apertura con nota libre para el GPT: `{{alias: nota breve}}` (p. ej.
  `{{acordeon: agrupar por región}}`). La nota es una instrucción adicional, no
  cambia el tipo ni el comportamiento descrito aquí.
- Alias no reconocido o con typo: intenta el match más cercano (¿es `diapositiva` o es
  de la tabla de interactividad, §3?); si no hay ninguno razonable, trátalo como
  `{{interactividad}}` genérica y anota el alias original tal cual apareció en
  `editor_notes`.
- Dentro de la marca vale exactamente el mismo markdown ligero que en cualquier otro
  bloque de origen (negrita, enlaces, listas): no cambia nada de la Regla Nº1.
- Reglas de anidamiento entre familias: ver §4.

## 2. Marca de corte: `{{diapositiva}}` (contenido exacto de una pantalla)

```
{{diapositiva}}
todo este texto, tal cual, es UNA pantalla — ni se parte ni se fusiona
{{/diapositiva}}
```

- El bloque marcado se convierte en el `student_text` **íntegro** de **una sola**
  pantalla: el GPT no aplica sobre él ni el criterio de «unidad de sentido» (cambio de
  intención pedagógica), ni el de longitud (~800 caracteres), ni ningún otro criterio
  de troceo o fusión automático. Ni una coma se mueve fuera del bloque marcado, ni
  entra contenido vecino no marcado dentro de él.
- El GPT sigue redactando el `title` de esa pantalla (2-6 palabras, como siempre): la
  marca no fija el título, solo el cuerpo.
- **Diapositiva que abre un Módulo, una Unidad o un Tema** (empieza por su encabezado y
  sigue con su texto de presentación): se monta como **dos pantallas**, una **portada**
  (`cover`, solo el título, con la imagen de la diapositiva si la trae) y a continuación una
  pantalla de contenido con el mismo título y el texto. En el orden del documento: módulo →
  unidad → tema, cada una en su nivel del árbol (la del módulo, en la introducción del
  paquete si la unidad es el SCORM).
- **El documento NO tiene que estar cubierto de marcas de corte.** Puede no haber
  ninguna (comportamiento 100% automático), una suelta en medio de un tema, o varias:
  cada `{{diapositiva}}` es una isla fija; todo lo que quede **fuera** de las marcas de
  corte se sigue segmentando con el criterio automático de siempre, tanto antes como
  después de cada bloque fijo.
- **La marca manda siempre**, incluso sobre reglas de estructura normalmente estrictas
  del contrato/guía (p. ej. «una evaluable nunca comparte pantalla con teoría»,
  «texto+imagen+interacción nunca en la misma pantalla»): si el bloque marcado las
  incumple, se genera **tal cual** de todos modos — es una decisión editorial del
  autor, no un error de segmentación del GPT. Dejar constancia SIEMPRE en
  `editor_notes` de qué regla se saltó y por qué (porque el bloque venía marcado), para
  que quede documentado y revisable.
- Motivo de esta marca: evitar que el GPT trocee o recomponga a su criterio un
  contenido que el autor ya ha decidido que debe leerse de una sola vez (p. ej. una
  instrucción legal, una lista que pierde sentido partida, un texto con un formato
  interno delicado).

## 3. Marcas de interactividad: catálogo de alias → tipo interno

**Informativas** (no puntúan; `scored: false`):

| Alias | `type` |
|---|---|
| `acordeon` | `accordion` |
| `pestañas` | `tabs` |
| `tarjetas_volteables` | `flip_cards` |
| `linea_tiempo` | `timeline` |
| `tarjetas_imagen` | `image_cards` (deja `image` vacío + `editor_note`: las imágenes las aporta el autor después) |
| `calculadora` | `calculator` con `mode: "tool"` (el alumno mete sus datos y ve el resultado) |

**Evaluables** (checkpoint, `scored: true`):

| Alias | `type` |
|---|---|
| `opcion_unica` | `single_choice` |
| `verdadero_falso` | `true_false` |
| `huecos` | `fill_blanks` |
| `parejas` | `match_pairs` |
| `clasificar` | `classification` |
| `ordenar` | `sort_steps` |
| `decision` | `scenario_decision` |
| `caso_practico` | `case_practice` |
| `caso_decisiones` | `scenario_steps` |
| `conversacion` | `decision_tree` |
| `reto_numerico` | `calculator` con `mode: "challenge"` |

Una marca `ordenar`, `parejas`, `sopa_letras` o `crucigrama` se respeta porque es
decisión del autor, aunque el criterio automático de la guía evite `sort_steps` y use
poco las demás; en `parejas`/`clasificar`, la introducción explica igualmente cómo se
responde en táctil.

**Abierta** (sin puntuar, ver «De reflexión pasiva a actividad corregible» de la
guía): `reflexion` → pantalla `reflection`, o `scenario_decision`/`case_practice` si
el propio contenido marcado admite una respuesta defendible o una rúbrica.

**Lúdicas de cierre** (`scored: false` u opcional según tipo):

| Alias | `type` |
|---|---|
| `tarjetas_repaso` | `flashcards` |
| `sopa_letras` | `word_search` |
| `crucigrama` | `crossword` |
| `rosco` | `az_quiz` |

**Genéricas** (el autor fija el lugar; el GPT elige el tipo exacto dentro de la
familia según la forma del bloque, tabla de `guia-diseno-interacciones.md`):

| Alias | Familia |
|---|---|
| `interactividad` | informativa |
| `evaluacion` | evaluable |
| `cierre` | lúdica (por defecto `flashcards` o `az_quiz`) |

**Vetadas — el GPT las reconoce pero NUNCA las genera** (reservadas al editor
humano, ver contrato §6 y `guia-diseno-interacciones.md`): `puntos_calientes`
(`hotspots`), `antes_despues` (`before_after`), `imagen_oculta` (`hidden_image`),
`rompecabezas` (`puzzle`), `video_interactivo` (`video`), `codigo_incrustado`
(`html_embed`). Si el documento marca una de estas: **no generes interacción**, deja
el texto como pantalla normal (con su `visual_resource` si aplica) y añade un
`editor_notes` pidiendo que se añada a mano en SCORMEditor. No cuentan para el ritmo
del §6.

El texto marcado con cualquiera de estos alias **desaparece como prosa corrida** de
`student_text`: se transforma en la interactividad indicada. Igual que con las
interactividades automáticas, el texto que usan sus ítems va también **duplicado en
`transcript`** (nada se pierde para el cálculo de cobertura del ratio ≥0.95).

## 3 bis. Marcas de destacado: alias → callout / bloque con estructura

El texto marcado va **literal** (Regla Nº1) como cuerpo de un bloque `::: keyword` …
`:::` en el `student_text` de la pantalla donde cae, en su sitio dentro del texto. No
crea interacción, no cuenta para el ritmo de interactividades y no fija los límites de
la pantalla (salvo que esté dentro de una `{{diapositiva}}`).

| Alias | Bloque |
|---|---|
| `consejo` | `::: tip` |
| `atencion` | `::: warn` |
| `importante` | `::: important` |
| `sabias_que` | `::: fact` |
| `informacion` | `::: info` |
| `cifras` | `::: stats` (lista `- ` con la cifra en **negrita inicial**) |
| `comparativa` | `::: compare` (2-3 encabezados `### `, uno por columna) |
| `que_hacer` | `::: dodont` (dos `### `: qué hacer y qué evitar) |
| `reflexiona` | `::: reflect` (caja 💭 Reflexiona: preguntas para pensar, sin respuesta escrita) |
| `sintesis` | `::: summary` (caja 📝 Síntesis) |

- Si al bloque le falta la estructura que su tipo espera (`cifras` sin lista,
  `comparativa`/`que_hacer` sin sus `### `), dásela **sin cambiar el texto**: convierte
  los párrafos en puntos de lista o añade los encabezados mínimos («Qué hacer» / «Qué
  evitar», o el nombre de cada enfoque tal como aparece en el bloque). Si no es posible
  sin reescribir, emite el callout tal cual (se verá como caja normal) y anótalo.
- Varias marcas de destacado en la misma pantalla son válidas, pero **no dos del mismo
  tipo** (contrato §4.1): si el autor marca dos iguales seguidas, fusiónalas en un solo
  bloque; si están separadas por otro contenido, reparte en pantallas y anótalo.
- Si el bloque empieza por una línea de cabecera con emoji que repite el nombre de la caja
  («⚠️ Importante», «💭 Reflexiona», «🧠 Síntesis»), quítala: la caja ya trae icono y título.
- No confundir `{{reflexiona}}` (caja dentro del texto) con `{{reflexion}}` (§3: pantalla
  `reflection` en la que la persona escribe su respuesta). No hay caja de «caso práctico»
  (el antiguo `::: case` está retirado: no lo generes): un caso con tarea es la pantalla
  `{{caso_practico}}` (§3).

## 3 ter. Marca de marco: varias pantallas como una unidad

```
{{marco: actividad_practica}}
{{diapositiva}} … {{/diapositiva}}
{{diapositiva}} … {{/diapositiva}}
{{/marco}}
```

**Marcos predefinidos** (mismo color, icono y rótulo en todos los cursos; son también los
atajos del editor). Úsalos siempre que encajen:

| Escribe | `frame` |
|---|---|
| `{{marco: actividad_practica}}` | `{ "color": "#F4C910", "icon": "🧪", "label": "Actividad práctica" }` |
| `{{marco: sintesis}}` | `{ "color": "#6DC3C0", "icon": "📝", "label": "Síntesis" }` |
| `{{marco: reflexiona}}` | `{ "color": "#F4C910", "icon": "💭", "label": "Reflexiona" }` |

Marco a medida: `{{marco: rótulo | color | icono}}`, p. ej.
`{{marco: Caso real | #7787BF | 📋}}`.

- Pone el **marco de color** (`frame`, contrato §4) a **cada pantalla** que salga del texto
  que envuelve: la carcasa rodea todo su contenido con una caja de ese color y el rótulo
  arriba, de modo que varias pantallas seguidas se leen como una sola unidad.
- Tras los dos puntos: una **clave predefinida** de la tabla (sin distinguir mayúsculas,
  con o sin tilde ni guion bajo: «Actividad práctica» también vale) o, si no coincide con
  ninguna, `rótulo | color | icono`, los tres opcionales (`{{marco}}` a secas vale). Color
  por defecto `#F4C910`; rótulo e icono vacíos = solo el color.
- Es la única marca que **puede abarcar varias `{{diapositiva}}`** y contener marcas de
  cualquier familia. No cambia el corte, el texto ni las interacciones: solo añade el
  marco. Se abre y se cierra fuera de las diapositivas (o al principio de la primera y al
  final de la última); si queda a medias, aplícalo a las pantallas completas que cubre y
  anótalo en `editor_notes`.
- Sin marca, no pongas `frame`: es una decisión del autor.

## 4. Anidamiento entre las familias

- **`{{diapositiva}}` puede contener, anidada dentro, COMO MUCHO una marca de
  interactividad** (§3) — el esquema solo admite un `interaction` por pantalla. Esa
  interactividad se convierte en el `interaction` de la pantalla fija; cualquier texto
  del bloque de corte que quede fuera de la marca anidada va a `student_text` tal
  cual (introducción, desarrollo…), sin recortarlo ni resumirlo.
  ```
  {{diapositiva}}
  Los extintores se clasifican según el tipo de fuego para el que están indicados.

  {{acordeon}}
  ### Extintor de agua
  Fuegos de materiales sólidos (clase A): madera, papel, tejidos.

  ### Extintor de CO2
  Fuegos eléctricos y de líquidos inflamables (clase B/C) sin dejar residuo.
  {{/acordeon}}
  {{/diapositiva}}
  ```
  produce una única pantalla con el párrafo introductorio + el `accordion` como su
  interacción — el GPT no la separa en dos pantallas aunque su criterio automático
  normalmente lo haría (informativa que acompaña a un párrafo de intro extenso).
- **Dos o más marcas de interactividad anidadas dentro de la misma `{{diapositiva}}`**:
  el esquema no lo permite (una pantalla, un `interaction`). Se honra la **primera**
  como interacción de la pantalla fija; a partir de la segunda, ese contenido se saca
  y se trata como una pantalla automática normal inmediatamente después (ya no fija),
  con un `editor_notes` explicando que se dividió por el límite del esquema, no por
  criterio propio.
- **Una marca de interactividad NUNCA contiene una `{{diapositiva}}` anidada dentro**
  (una pantalla no cabe dentro de una interacción): si aparece, ignora esos
  delimitadores como texto literal dentro de la interactividad y anótalo en
  `editor_notes`.
- **`{{marco}}` (§3 ter) envuelve** una o varias `{{diapositiva}}` y lo que contengan; no
  va dentro de una diapositiva ni de una marca de interactividad.
- **`{{diapositiva}}` no se anida dentro de otra `{{diapositiva}}`**: si aparece,
  la interior se ignora como texto literal (queda dentro de la exterior) y se anota.
- **`{{diapositiva}}` puede contener varias marcas de destacado** (además de, como
  mucho, una de interactividad): todas van a su `student_text`, en su sitio.
- **Una marca de destacado NUNCA va dentro de una de interactividad** (los campos de
  interacción no admiten callouts, contrato §6): ignora sus delimitadores, deja el texto
  como parte del contenido de la interactividad y anótalo.
- Dos marcas de interactividad anidadas entre sí (fuera de un corte, `{{acordeon}}`
  con un `{{opcion_unica}}` dentro, etc.): tampoco válido: la interior gana, la
  exterior se recorta a lo que quede fuera, con `editor_notes`.

## 5. Mini-sintaxis opcional dentro de una marca de interactividad (contenido literal)

Por defecto, dentro de una marca evaluable el GPT **redacta** la pregunta/opciones/
feedback a partir del bloque marcado, igual que hace con un checkpoint automático (el
autor solo decide tipo y lugar). Si el autor **ya** escribe el contenido en un formato
reconocible, el GPT lo usa **literal** en vez de inventarlo:

- `{{acordeon}}`/`{{pestañas}}`/`{{tarjetas_imagen}}`: cada ítem abre con `### título` y
  su texto debajo es el `body`/`text`. `{{tarjetas_volteables}}`/`{{tarjetas_repaso}}`:
  `### ` = `front`, texto de debajo = `back`. `{{linea_tiempo}}`: `### etiqueta · título`
  (la parte antes de `·` es el `label`, opcional).
- `{{opcion_unica}}`/`{{decision}}`: una línea de enunciado + opciones en líneas `- `;
  la opción correcta lleva `*` delante (`- *CO2`). Sin `*`, el GPT decide la correcta
  por el contenido. Texto tras ` — ` en la línea de una opción = su `feedback`. En
  `{{decision}}`, lo que va antes del enunciado es `config.scenario`.
- `{{verdadero_falso}}`: el enunciado, y opcionalmente `(V)`/`(F)` al final para fijar
  la respuesta; si no está, el GPT la decide.
- `{{parejas}}`/`{{clasificar}}`: líneas `término → correspondencia` (una por línea);
  sin ese formato, el GPT arma las parejas/categorías del bloque.
- `{{ordenar}}`: líneas `- ` ya en el orden correcto (el orden de escritura ES la
  respuesta). Texto tras ` — ` = `explanation` de ese paso.
- `{{huecos}}`: si el autor ya marca la palabra a ocultar con `[[palabra]]` (mismo
  marcador que usa el propio `course.json` para huecos, contrato §6), el GPT respeta
  esos huecos tal cual; si no hay ninguno, elige términos clave del bloque como
  siempre. Con la nota `{{huecos: escribir}}` el hueco se escribe en vez de elegirse
  (`config.mode: "type"`), y `[[a|b]]` da varias respuestas válidas.
- `{{caso_decisiones}}`: una línea opcional `Caso: …` (= `config.scenario`) y cada
  decisión como un `{{opcion_unica}}` literal (enunciado + opciones `- `, la correcta con
  `*`), separadas por línea en blanco, en el orden del caso; el comentario de cada
  opción, tras ` — ` en su misma línea si el autor lo escribe (si falta, redáctalo: es
  obligatorio en este tipo).
- `{{reto_numerico}}`/`{{calculadora}}`: datos en líneas `Etiqueta = valor unidad` y
  lo que se pide en `¿Etiqueta (unidad)? = fórmula` si el autor ya da la operación; si
  no, el GPT plantea la fórmula a partir del procedimiento del bloque (y la comprueba).
  La fórmula del autor viene en palabras (las etiquetas, `×`, `/`, `+`, `−`): tradúcela
  a la gramática de `formula` (ids, `*`, punto decimal) — `¿Dosis total (mg)? = Peso de
  la persona × Dosis prescrita` → `"formula": "peso * dosis_kg"`, `"unit": "mg"`.
- `{{conversacion}}`: guion opcional. `Personajes: Nombre (papel), …` → `characters`.
  Cada momento `[n] Nombre: texto` → nodo (`[n] texto` sin nombre = narración, sin
  `speaker`); `[1]` es el primero de `nodes`. Debajo, respuestas `- texto → m` →
  `choices` con `to` = el nodo `[m]`. Un momento con `FINAL BUENO:` / `FINAL MALO:` /
  `FINAL NEUTRO:` + comentario es un final (`outcome` `good`/`bad`/`neutral`,
  `feedback`). Respeta textos y grafo tal cual; si el guion tiene un ciclo, un `→` a un
  número inexistente o ningún final bueno, corrige lo mínimo y anótalo. Sin guion, el
  GPT monta el árbol (contrato §6) a partir del diálogo o la situación marcada.
- `{{caso_practico}}`: líneas `- ` tras `Criterios:` → `config.rubric` (`label`).
- `{{sopa_letras}}`: una palabra por línea → `config.words`. `{{crucigrama}}`: líneas
  `PALABRA → pista` → `config.entries`. `{{rosco}}`: líneas `Respuesta → pista` →
  `config.items` (`answer`/`clue`).

Si el bloque no sigue ninguna de estas convenciones, se comporta exactamente como un
checkpoint automático: el GPT redacta todo a partir del texto marcado.

## 6. Cómo conviven las marcas con el ritmo automático (aditivo)

1. **Antes de montar el guion**, escanea el texto extraído y haz un inventario de
   marcas: cuántas hay, de qué alias (corte o interactividad), y en qué punto del
   documento (igual en espíritu al inventario de contenido de
   `flujo-factoria-unidades.md`).
2. Cada marca ocupa su **fila fija** en el guion (§ de `guia-diseno-interacciones.md`
   «El guion de pantallas», paso 0): tipo y/o límites ya decididos, no por la tabla de
   «forma del bloque fuente» — esa tabla solo decide en las filas SIN marca.
3. Con las filas fijas ya colocadas, aplica el **chequeo de ritmo de siempre** sobre
   el guion completo (marcadas + resto): informativas ~1 de cada 3-4 pantallas de
   desarrollo, evaluables al final de cada subtema. Las marcas **cuentan** para ese ritmo (una
   `{{acordeon}}` ya satisface el hueco de informativa de su tramo; una
   `{{diapositiva}}` sin interactividad anidada cuenta como pantalla de solo texto a
   efectos del «máx. 3 seguidas»). Solo se **añaden** automáticas en los tramos que,
   con las marcas puestas, sigan incumpliendo el ritmo — nunca DENTRO de una
   `{{diapositiva}}`, solo antes o después de ella.
4. **El documento manda por encima del límite aproximado**: si un tramo trae más
   marcas de las que el ritmo habitual pediría (p. ej. varias evaluables seguidas, o
   varias `{{diapositiva}}` de solo texto seguidas), respétalas todas — no se recortan
   ni se espacian marcas para «no pasarse». El límite aproximado
   (`referencia-rapida.md`) solo rige el relleno automático.
5. Las marcas de tipo **vetado** (§3) no cuentan para el ritmo: no generan
   interacción real, así que ese tramo sigue necesitando su informativa/checkpoint
   automático si corresponde.
6. Documento sin ninguna marca → el paso 1 no encuentra nada y el resto del flujo es
   idéntico al actual.

## 7. Ejemplos

**Solo corte, sin interactividad** — evita que el GPT reparta este párrafo en dos
pantallas o lo fusione con el contenido vecino:

```
{{diapositiva}}
Antes de manipular cualquier extintor, comprueba SIEMPRE que el precinto y el
manómetro están en la zona verde. Un extintor fuera de rango de presión, aunque
parezca íntegro, puede no funcionar cuando se necesite.
{{/diapositiva}}
```

**Corte con interactividad anidada** — una sola pantalla con intro + accordion +,
en la siguiente pantalla (ya no fija), un checkpoint con la respuesta literal:

```
{{diapositiva}}
Los extintores se clasifican según el tipo de fuego para el que están indicados.

{{acordeon}}
### Extintor de agua
Fuegos de materiales sólidos (clase A): madera, papel, tejidos.

### Extintor de CO2
Fuegos eléctricos y de líquidos inflamables (clase B/C) sin dejar residuo.

### Extintor de polvo ABC
Fuegos de las clases A, B y C; es el más polivalente.
{{/acordeon}}
{{/diapositiva}}

{{opcion_unica: usar el bloque anterior como contexto}}
¿Qué extintor se usa en un incendio eléctrico?
- Extintor de agua
- *Extintor de CO2
- Manguera de riego
{{/opcion_unica}}
```

Produce: una pantalla fija con el párrafo introductorio y el `accordion` de 3 ítems
como interacción (tal como el autor la delimitó, sin partirla), y la siguiente
pantalla (mismo `title`, ya automática) con el checkpoint `single_choice` cuya opción
correcta es literal («Extintor de CO2»).

## 8. Checklist

Añade a `quality_checklist`: `"Marcas de interactividad del documento respetadas":
true` cuando el documento traía alguna marca (de corte y/o de interactividad) y se
han seguido todas (límites exactos, tipo, destacados y contenido literal si lo había). Cualquier
marca que haya caído en un caso especial (vetada, sin cierre, alias no reconocido,
anidamiento no válido, regla de estructura saltada por una `{{diapositiva}}`) debe
quedar reflejada en `editor_notes`, no solo en el checklist.
