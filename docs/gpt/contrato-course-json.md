# Contrato de salida `.scormproj` (SCORMEditor)

Instrucciones para la herramienta/GPT que genera el material a partir del documento.

**La salida es un archivo `.scormproj`** (un ZIP con `course.json` + `assets/`
dentro; ver §11) generado con Code Interpreter y entregado como enlace de descarga.
El `course.json` que va dentro debe ser un **objeto JSON válido** (UTF-8, sin
comentarios, sin texto antes/después, sin ```fences```) y cumplir TODO este
contrato. Todo `id` debe ser único y estable.

> Compatibilidad: si Code Interpreter no estuviera disponible, se admite como
> fallback devolver **solo** el `course.json` en texto plano (sin fences); el
> usuario lo empaquetaría a mano. El formato preferido es siempre `.scormproj`.

---

## 1. Estructura raíz (claves EXACTAS)

```json
{
  "schema_version": "1.1.0",
  "course": { ... },
  "scorm": { ... },
  "shell": { ... },
  "intro_screens": [ ... ],
  "modules": [ ... ],
  "closing_screens": [ ... ],
  "assessments": { "unit_tests": [], "final_test": null },
  "glossary": [ ... ],
  "bibliography": [ ... ],
  "quality_checklist": { }
}
```

Reglas que NO se pueden romper:

- `schema_version` debe ser **`"1.1.0"`**.
- El contenido va en **`modules[].units[].screens[]`** (jerarquía de 3 niveles).
  **No se admite un array `screens` en la raíz** — `intro_screens` es la única
  excepción, y solo para la portada del paquete (ver más abajo y §3).
- `intro_screens` (opcional, def. `[]`): pantallas sueltas **antes de cualquier
  módulo**, sin pertenecer a ninguno — úsalo para la **portada de TODO el
  paquete** (normalmente 1 pantalla `type: "cover"`, mismo formato de §4;
  puesta aquí se presenta con el mismo peso visual que una portada de módulo,
  pero sin rótulo de nivel). Esta portada es el sitio para presentar el
  paquete completo — **no** repitas esa presentación como título de un módulo
  (ver regla siguiente).
- `closing_screens` (opcional, def. `[]`): simétrico a `intro_screens` pero al
  final de TODO — después incluso del test final, si lo hay. Pantallas sueltas
  de cierre de TODO el paquete (despedida, «gracias por completar el curso»,
  próximos pasos…), sin pertenecer a ningún módulo. Úsalo solo si el documento
  fuente pide explícitamente un cierre; si no, **omite la clave**.
- `quality_checklist` es un **objeto** `{"texto del criterio": true|false}`,
  **no** un array.
- **IDs deterministas, nunca «inventados»**: numeración secuencial por orden de
  aparición — módulos `m1, m2…`; unidades `u1, u2…` y pantallas `s01, s02…` con
  **numeración continua en TODO el curso** (las pantallas no reinician por unidad);
  interacciones `<id_pantalla>_i01`; tests `A01, A02…` y sus preguntas `Q01, Q02…`;
  opciones `a, b, c…` (o `o1/p1/z1` según el tipo, ver §6). Motivo: los IDs
  descriptivos o «aleatorios» producen duplicados en cursos largos y el editor los
  rechaza. Al **corregir o regenerar** un curso existente, **conserva los IDs que ya
  tiene** (son la referencia estable de pantallas y actividades).
- Cualquier clave extra que no esté en este contrato se ignora (no rompe, pero se
  pierde). No metas `parent_course`, `learning_design`, `generation_context`, etc.:
  su información útil debe volcarse en los campos que sí existen (ver §2).
- Existe una clave opcional `narration` (`{"mode": "auto"|"on"|"off"}`, ajuste del
  editor sobre si el curso lleva locución). **Omítela**: la gestiona el autor en el
  editor y su default (`auto`) es el correcto.

---

## 2. `course`, `scorm`, `shell`

```json
"course": {
  "id": "pai-u01-t01",
  "title": "Tema 1. Definición y propósito del Plan de Apoyos Integrado",
  "subtitle": "",
  "description": "Resumen breve del tema.",
  "authoring_entity": "Nombre de la entidad",
  "source_document": "Curso PAI T.1-4.pdf",
  "estimated_hours": 0.75,
  "language": "es"
}
```

- `module_label`/`unit_label` (opcionales, def. `"Módulo"`/`"Unidad"`): cómo se llaman
  los dos niveles de `modules[]`/`units[]` en el árbol y el menú del alumno — no cambian
  la estructura, solo el rótulo. Ponlos si el documento fuente usa su propio vocabulario
  para esos dos niveles («Tema»/«Subtema», «Unidad»/«Tema»…), sobre todo con la
  numeración de dos niveles del §3; si no hay pista clara, omítelos (quedan los
  genéricos).

```json
"scorm": {
  "version": "1.2",
  "identifier": "PAI_U01_T01",
  "title": "Tema 1 - PAI",
  "mastery_score": 70,
  "rules": {
    "min_required_screens_pct": 100,
    "require_interactions": true,
    "min_score": 70,
    "attempts_allowed": 2,
    "score_source": "final_test",
    "navigation": "mixed",
    "allow_resume": true
  }
}
```

- `score_source`: `"final_test"` | `"unit_tests"` | `"mixed"`.
- `mixed_final_weight` (opcional, def. `70`): solo con `score_source:"mixed"`, peso (%)
  del test final en la nota; la práctica pesa el resto. Cada bloque se calcula sobre su
  propio total (no por suma de puntos). También editable en «Ajustes del curso».
- `navigation`: `"free"` | `"sequential"` | `"mixed"` (usa el nombre en inglés).
- `attempts_allowed`: `0` = ilimitados.
- `auto_return` (opcional, def. `false`): **omítelo**. Es un ajuste del editor humano
  (volver solo a la página del curso en Moodle al cerrar la sesión).
- `completion_mode` (opcional, def. `"evaluation"`): `"evaluation"` = completado clásico
  (pantallas + interacciones obligatorias si `require_interactions` + nota mínima).
  `"screens"` = completa con solo llegar al final (`min_required_screens_pct`), ignorando
  interacciones obligatorias y nota mínima para el estado SCORM — la nota y el APTO/NO APTO
  se siguen calculando y mostrando en Resultados, pero de forma informativa. Usar `"screens"`
  solo si el documento fuente pide explícitamente que el curso se dé por completado con solo
  recorrerlo, aunque tenga actividades evaluables.

```json
"shell": {
  "brand": "",
  "primary_color": "#0b5fff",
  "accent_color": "#6DC3C0",
  "show_sidebar": true,
  "show_progress": true,
  "language": "es",
  "motion": "subtle",
  "motion_speed": "normal"
}
```

- `brand` (opcional; def. vacío): marca/entidad en la cabecera del curso. **Déjala
  vacía salvo que se pida expresamente**: sin marca, la cabecera muestra únicamente el
  título del curso.
- `motion` (opcional; def. `"subtle"`): animaciones de la carcasa. `"none"` (sin),
  `"subtle"` (transiciones básicas), `"rich"` (revelado progresivo del contenido
  al entrar/hacer scroll) o `"vivid"` (lo de `"rich"` con entradas variadas y
  transición direccional entre pantallas). Es una preferencia de presentación:
  déjalo en `"subtle"` salvo que se pida otra cosa.
- `motion_speed` (opcional; def. `"normal"`): velocidad de las animaciones de entrada.
  `"fast"`, `"normal"` o `"slow"`. Déjalo en `"normal"` salvo que se pida otra cosa.

---

## 3. `modules` → `units` → `screens`

```json
"modules": [
  {
    "id": "m1",
    "title": "Fundamentos del Plan de Apoyos Integrado",
    "screens": [ /* OPCIONAL: pantallas propias del módulo, ver abajo */ ],
    "units": [
      {
        "id": "u1",
        "title": "Tema 1. Definición y propósito",
        "summary": "Texto de resumen de la unidad (o incluir una pantalla type=summary).",
        "status": "ok",
        "screens": [ /* ver §4 */ ]
      },
      { "id": "u1b", "loose": true, "screens": [ /* OPCIONAL: pantallas sueltas «entre unidades», ver abajo */ ] }
    ],
    "closing_screens": [ /* OPCIONAL: pantallas de cierre del módulo, ver abajo */ ]
  }
]
```

- `status`: `"ok"` | `"esqueleto_pendiente_desarrollo"`.
- Cada unidad **debe** tener `summary` (o una pantalla `summary`) y **al menos una
  actividad o test**, o el validador avisará.
- `modules[].screens` (opcional, def. `[]`): pantallas **propias del módulo**
  (portada/presentación del bloque), con el mismo formato de §4. Se muestran
  **siempre antes** de las pantallas de sus unidades y cuelgan del título del
  módulo en el índice, sin rótulo de unidad. Úsalo solo para portada o
  presentación del módulo (normalmente 1 pantalla `cover`, ver §4 — el mismo
  tipo que la portada de unidad: puesta aquí, en `modules[].screens`, se
  presenta sola con más peso visual); el contenido didáctico va en las
  unidades. Si no hace falta, **omite la clave**.
- `modules[].closing_screens` (opcional, def. `[]`): pantallas de **cierre del
  módulo**, mismo formato de §4, simétricas a `modules[].screens` pero al
  revés — se muestran **siempre después** de TODAS las unidades del módulo
  (resumen del bloque, despedida antes de pasar al siguiente módulo…).
- **Pantallas sueltas entre unidades** (`units[].loose`): para meter diapositivas
  entre dos unidades sin que pertenezcan a ninguna de las dos, añade un elemento
  MÁS a `units[]`, en la posición donde quieras esas pantallas, con
  `"loose": true` y sus `screens` (mismo formato de §4) — omite `title`,
  `summary` y `status`, se ignoran. No es una unidad de verdad: no lleva
  resumen, no exige actividad y el alumno no la ve como una unidad más, solo
  como pantallas sueltas en su sitio. Dale igualmente un `id` propio y único
  (mismo criterio que cualquier otro id). Úsalo solo si el documento fuente
  pide explícitamente una transición o un punto y aparte entre dos unidades;
  si no, **no crees estos bloques** (no los añadas por rellenar). `modules[].
  closing_screens` (arriba) es lo equivalente a nivel de módulo, tras TODAS
  sus unidades.
- `units[].hide_menu_title` (opcional, def. `false`): preferencia puramente de
  presentación (oculta el rótulo de esa unidad en el menú del alumno, sus
  pantallas se siguen viendo) que decide el autor humano después, desde el
  editor — **nunca la pongas tú**: omite siempre esta clave.
- **El `title` de un módulo nunca repite el título del curso/SCORM**
  (`course.title`/`scorm.title`): esa presentación ya va en la portada de
  `intro_screens` (ver §1). Dale al módulo un nombre propio, específico de lo
  que trata — no un duplicado del título general del paquete ni un genérico
  «Módulo 1» si el documento fuente sugiere algo mejor.
- **No inventes un nivel de envoltorio que el documento fuente no tiene.** El
  paquete SCORM no siempre es «un curso con varios módulos» — puede
  representar directamente un módulo, o incluso una sola unidad/tema con
  varios sub-temas. Mapea la granularidad REAL del documento al nivel del
  esquema que le corresponde, sin desperdiciar un nivel en un envoltorio
  hueco:
  - Si el documento es **un módulo con N unidades/temas**: un único objeto en
    `modules[]` (con su propio título, no el del curso — regla anterior) y
    esas N unidades reales, cada una su propio objeto, en `units[]`. No las
    repartas en N módulos de una unidad cada uno, ni las metas como pantallas
    dentro de una única unidad-envoltorio.
  - Si el documento es **una sola unidad/tema con varios sub-temas**: cada
    sub-tema es su propia `unit` real en `modules[0].units[]` — en este
    contrato «tema» y `unit` son la misma cosa (de ahí `title: "Tema 1. …"`
    en el ejemplo de arriba). No crees una unidad-envoltorio que agrupe los
    sub-temas como pantallas o secciones internas: eso desperdicia el nivel
    `units[]` que el esquema ya te da para ellos.
  - **Si el documento numera DOS niveles a la vez** (p. ej. `1.`/`2.`/`3.`…
    para temas y `1.1`/`1.2`/`2.1`… para subtemas dentro de cada uno): esos
    dos niveles **sí** son dos módulos/unidades reales — cada punto de nivel 1
    es un objeto propio en `modules[]` y cada punto de nivel 2 de ESE tema es
    una `unit` real en su `units[]`, conservando el orden. N módulos, cada uno
    con sus propias M unidades — no lo aplanes a un único módulo con todas las
    unidades seguidas, perderías la agrupación real del documento.
    **Los dos niveles conservan su numeración en el `title`**, tal cual la
    trae el documento (`"1. Definición y propósito"` para el módulo,
    `"1.2 Comunicación con la familia"` para la unidad — no `title:
    "Comunicación con la familia"` a secas): sin el número delante, el árbol
    del editor y el menú del alumno pierden la referencia a qué tema/subtema
    del documento original es cada uno. Esto es la EXCEPCIÓN a «quita la
    numeración de epígrafes» de §4 — esa regla sigue aplicando tal cual a
    encabezados, ítems y cuerpo de las pantallas (nivel 3 en adelante,
    `1.1.1`… incluido: se funden en la unidad sin arrastrar su numeración,
    ver el punto siguiente); solo el `title` de módulo y de unidad de estos
    dos niveles reales es la excepción.
    - **Un tercer nivel (`1.1.1`, `2.3.1`…) NUNCA crea un tercer contenedor**
      (el esquema no lo tiene, y es deliberado: el árbol del editor y el menú
      del alumno solo distinguen dos niveles, para no complicar la navegación
      ni la miga de pan). Ese tercer nivel se funde **dentro** de las
      pantallas de la unidad de nivel 2 que le corresponde — como encabezados
      `### ` hermanos si es solo un matiz del mismo punto, o como pantallas
      sucesivas si tiene desarrollo propio (misma unidad, más pantallas).
    - Si el documento usa vocabulario propio para los dos niveles («Tema»/
      «Subtema», «Unidad»/«Tema», «Bloque»/«Apartado»…), refléjalo en
      `course.module_label`/`course.unit_label` (por defecto `"Módulo"`/
      `"Unidad"`) en vez de dejar los genéricos — así el árbol y el menú del
      alumno hablan con las mismas palabras que la fuente.

---

## 4. Pantalla (`screen`)

```json
{
  "id": "s06",
  "type": "content",
  "title": "Definición del Plan de Apoyos Integrado",
  "objective": "Definir el Plan de Apoyos Integrado.",
  "student_text": "Texto para el estudiante. Admite markdown ligero:\n- viñetas con guion\n- **negrita** y *cursiva*.",
  "source_refs": [
    { "doc": "Curso PAI T.1-4.pdf", "locator": "p.8", "transform": "resumen" }
  ],
  "visual_resource": { /* ver §5 */ },
  "interaction": null,
  "required": true,
  "min_time_seconds": 0,
  "transcript": "",
  "accessibility": { "alt_text_ok": true, "keyboard_ok": true, "contrast_ok": true },
  "scorm": { "counts_for_completion": true },
  "editor_notes": [],
  "status": "ok"
}
```

- `transcript_hidden` (opcional, por defecto `false`): **no lo pongas**. Es una decisión del
  editor humano (desactiva el botón «Transcripción» de esa pantalla y la saca de la
  narración automática).
- `type` (enum cerrado): `cover`, `objectives`, `route`, `content`,
  `summary`, `video`, `reflection`, `forum_prompt`, `unit_quiz`, `content_placeholder`,
  `guide`.
- **`guide` = instrucciones de uso** del paquete (opcional; **no la generes**: el autor la
  añade desde el editor, que le pone el vídeo demo). Si el usuario la pide expresamente:
  solo en `intro_screens`, tras la `cover`, con `visual_resource.kind: "none"` y
  `student_text` vacío o una entradilla breve — la app pinta sola el resumen de controles
  (navegación, audio, transcripción, imprimir…), **no los escribas**. Sin `objective`.
- **`cover` = portada** — de unidad o de módulo, **el mismo tipo en los dos casos**: la
  app decide sola el peso visual (banda más saturada, título mayor) según **dónde la
  coloques**, no según ningún otro campo. Dentro de `units[].screens` es la portada de
  esa unidad; dentro de `modules[].screens` presenta el **módulo entero** (úsala ahí
  solo cuando el módulo tenga varios temas y merezca una presentación propia, no como
  sustituto de la `cover` de cada unidad). En los dos casos: `title` + `subtitle` (y una
  imagen si procede), **sin contenido didáctico**. Los párrafos de introducción («En la
  unidad anterior vimos…») van en la **primera pantalla `content`** del tema, nunca en
  la `cover`. En la `cover` de unidad **sí debe figurar el número del tema** («Tema 1»,
  «Tema 2»…): ponlo en el `subtitle` o antepuesto al título («Tema 1. Herramientas…»),
  para que el alumno sepa dónde está.
- **Los ejercicios prácticos van en su propia pantalla.** `case_practice`, `reflection`
  y los callouts con tarea (`::: case`, `::: reflect` que proponen un ejercicio) **no se
  pegan al final de una pantalla de contenido** (mal: «Errores y práctica» = lista de
  errores + caso en la misma pantalla). El contenido va en su pantalla y el ejercicio en
  la **siguiente**, cuyo `student_text` es solo el enunciado/introducción del propio
  ejercicio. **La solución, NUNCA visible**: si el original trae «Resolución propuesta»,
  «Clave de reflexión» o una respuesta modelo, va en el `feedback.explanation` de la
  interacción (`case_practice`/`reflection`), no en `student_text` (el alumno la vería
  antes de hacer la tarea). Y sin rótulos de actividad («**Actividad práctica**»,
  «**Resolución propuesta:**»…): el tipo de pantalla/interacción ya lo indica.
- `objective`: texto libre (NO `objective_id`). Si tu herramienta maneja
  micro‑objetivos por id, **vuelca aquí el texto del objetivo**. Los objetivos del
  curso forman un **conjunto reducido y controlado**: derívalos del contenido real, de
  los objetivos que el usuario indique en su petición y de la normativa/ficha
  facilitada; su número lo manda el contenido (tantos como aprendizajes evaluables
  distintos haya), **no una cuota fija ni uno por pantalla**. Todas las pantallas que
  desarrollan el mismo objetivo **repiten su texto EXACTO, carácter a carácter** (cada
  pantalla declara solo su objetivo principal). La interacción de una pantalla **no
  lleva objetivo propio**: evalúa el `objective` de esa misma pantalla. Los
  `learning_objective` de las preguntas del test sí son un campo propio y se **copian
  literalmente** de ese conjunto: así el editor traza objetivo ↔ pantalla ↔ evaluación.
- `min_time_seconds`: control de permanencia mínima (no antifraude duro). **Pon
  siempre `0`**: el tiempo mínimo por pantalla lo fija a mano el editor humano en
  SCORMEditor después; el GPT no debe estimarlo ni inventarlo.
- `interaction`: un objeto (ver §6) **o `null`**. Máximo **una interacción por
  pantalla**, y **entera en una sola pantalla** (no partas un accordion/tabs ni una
  actividad en varias).
- `interaction_layout`: `"top"` | `"bottom"` (def. `"bottom"`). Posición de la
  interacción respecto al texto: encima o debajo. Las listas dentro de un `item`/`tab`
  se renderizan como lista si cada elemento va en su línea con `- `.
- `source_refs[]` (trazabilidad, recomendado en cada pantalla):
  `{ "doc": "...", "locator": "p.8" , "quote": "...", "transform": "resumen|reescritura|..." }`
  (solo `doc` es obligatorio).

### Títulos: criterio editorial
Aplica a los `title` que **generes o reformules** tú (curso, módulos, unidades,
pantallas, apartados `## `/`### `, ítems de interacciones). Si el título viene del
documento fuente y no se ha autorizado cambiarlo, **consérvalo tal cual** (Regla Nº1).
Antes de escribirlo, decide su función:
- **Presenta, describe u organiza contenido → título descriptivo, sin signos de
  interrogación** (es lo normal: se lee mejor en índice, menú y miga de pan):
  «Cómo utilizar esta unidad», «Por qué es importante comunicarse bien», «Qué es la
  escucha activa», «Estrategias para mejorar la comunicación».
- **Plantea una pregunta real** al alumno (reflexión, curiosidad, problema,
  participación) → **pregunta directa con sus signos**: «¿Qué harías ante una caída?»,
  «¿Cómo actuarías en esta situación?».
- **No conviertas títulos en preguntas solo para hacerlos atractivos**: para exponer un
  procedimiento, «Cómo prevenir las úlceras por presión», no «¿Cómo podemos prevenir
  las úlceras por presión?».
- **Varía las estructuras**: no abuses de «Cómo…», «Qué…», «Por qué…»; altérnalas con
  títulos nominales («La comunicación no verbal», «Factores de riesgo y prevención»).
- **Ortografía**: las interrogativas indirectas sin signos **conservan la tilde**
  («qué», «cómo», «cuándo», «dónde», «por qué»).
- No cambies títulos que ya sean correctos y adecuados.

### 4.1 Markdown ligero y bloques destacados (callouts) en `student_text`

`student_text` se escribe en **texto plano con markdown ligero** (NO HTML). El
editor SCORMEditor lo renderiza. Sintaxis admitida:

- `## ` y `### ` encabezados (el `#`/H1 se reserva al título de pantalla).
- `**negrita**`, `*cursiva*`, `[texto](url)` (http(s) o mailto).
- `- ` listas con viñetas; `1. ` listas numeradas. **Sublistas**: el ítem hijo va en su
  propia línea con **2 espacios** delante por cada nivel (`- Padre
  - Hijo`); se pueden
  mezclar viñetas y números entre niveles.
- Imagen `![alt](ruta)`: **el GPT NUNCA la usa**. Esa sintaxis es del editor humano.
  Toda imagen que generes va como `visual_resource` (§5), **máximo una por
  pantalla**; si un apartado trae varias figuras, una pantalla por punto (§5). Si el
  contenido pide una imagen que no tienes, deja una `editor_note` describiéndola.
- Vídeo de YouTube incrustado en texto (`![alt](https://youtube.com/watch?v=...)`,
  misma sintaxis que la imagen si la URL es de YouTube): **el GPT NUNCA la usa**, mismo
  motivo que la imagen — es una comodidad del editor humano para pegar un enlace que
  ya tiene a mano. Todo vídeo que el GPT proponga va como `visual_resource.kind:
  'video_youtube'` (§5) o como interacción `video`, nunca en `student_text`.
- Alineación de un párrafo o encabezado (`{center}`/`{right}` al principio de la línea):
  **el GPT NUNCA la usa** — es una preferencia de maquetación del editor humano, no algo
  que el contenido generado deba decidir. Escribe siempre el texto sin prefijo (izquierda,
  el default).
- **Bloques destacados (callouts)**: una línea `::: tipo`, el contenido en las
  líneas siguientes, y una línea `:::` para cerrar. **Nunca un callout vacío**
  (`::: tipo` seguido de `:::` sin cuerpo): si no hay texto para la caja, no la
  emitas — el editor lo marca con el aviso `CALLOUT_EMPTY`. Usa `\n` en el JSON:

```json
"student_text": "Texto normal.\n\n::: tip\nEste es un consejo para el alumnado.\n:::\n\nMás texto."
```

Tipos de callout disponibles (escribe el **keyword**, no el icono ni la etiqueta;
el editor pone icono y título automáticamente):

| keyword | Resultado en SCORMEditor |
|---|---|
| `tip` | 💡 Consejo |
| `warn` | ⚠️ Atención |
| `important` | 📌 Importante |
| `fact` | 🧠 ¿Sabías que…? |
| `reflect` | 💭 Reflexiona |
| `case` | 🧪 Caso práctico |
| `info` | ℹ️ Información |

- **Bloque personalizado** (cuando ninguno encaje):
  `::: custom | #color | icono | título` … `:::` (color en hex; p. ej.
  `::: custom | #7787BF | 📖 | Glosario`). Úsalo con moderación.
- **Bloques con estructura** (misma sintaxis `::: tipo` … `:::`; dentro, markdown
  normal que la carcasa maqueta como tarjetas o columnas):

  | keyword | Resultado | Estructura que espera |
  |---|---|---|
  | `stats` | Cifras destacadas (una tarjeta por punto) | Lista `- `; la **negrita inicial** de cada punto es la cifra grande (`- **80 %** de las caídas ocurren en la habitación`). Lo que no es lista, entradilla |
  | `compare` | Comparativa en columnas («vs» si son dos) | Cada encabezado `### ` abre una columna con lo que haya debajo; **2-3 columnas** |
  | `dodont` | Qué hacer / qué evitar (✓ verde / ✗ rojo) | **Dos** `### `: el primero = qué hacer, el segundo = qué evitar; debajo de cada uno, su lista |

  ```json
  "student_text": "::: dodont\n### Qué hacer\n- Hablar con calma.\n- Escuchar sin interrumpir.\n### Qué evitar\n- Elevar el tono.\n- Prometer lo que no depende de ti.\n:::"
  ```
  Úsalos **solo cuando el fuente ya trae esa forma** (cifras sueltas que destacan, dos
  o tres enfoques contrapuestos, listas de recomendaciones y errores): el texto sigue
  siendo el del fuente (Regla Nº1), solo cambia la maquetación. Sin su estructura
  (`stats` sin lista, `compare`/`dodont` con menos de dos `### `) se ven como un callout
  normal: no se pierde texto, pero tampoco luce. Cuentan como callout a efectos de «no
  dos del mismo tipo por pantalla».
- Dentro de un callout vale markdown ligero (viñetas, negrita…). **No** anides un
  callout dentro de otro.
- **El cuerpo del callout es contenido real** (la frase destacada del original), **nunca
  la etiqueta ni el keyword**: `::: important\nImportante\n:::` está **mal** (callout
  vacío; el editor ya pone el título «📌 Importante» solo).
- **No pongas dos callouts del mismo tipo en una misma pantalla.** Si un apartado tiene
  varios destacados iguales, cada uno acompaña a su párrafo → **repártelos entre las
  pantallas** correspondientes, uno por pantalla. Si al montar una pantalla te quedan
  dos cajas iguales (p. ej. dos `::: important`), es señal de que has fusionado dos
  apartados: **divide en dos pantallas**, no juntes las cajas ni suprimas ninguna.
- El contenido de un callout va **escapado** por el runtime: escribe texto plano,
  nunca HTML.

Reglas de formato (para que el editor lo renderice bien):
- **Una lista = un elemento por línea** empezando por `- ` (o `1. `). NO la pongas en
  una sola línea (`a • b • c`) ni con viñeta `•`/`*` embebida: saldría como párrafo.
  Los ítems van en **líneas consecutivas, sin línea en blanco entre ítem e ítem**
  (también dentro de callouts): la línea en blanco entre cada ítem infla la pantalla.
- **Une las frases partidas por la maquetación del PDF.** La extracción arrastra saltos
  de línea a mitad de frase («…para diseñar\n\napoyos que respeten…»): reagrúpalos en
  un solo párrafo; un párrafo solo termina donde termina la frase. Y tras cerrar una
  negrita, deja el espacio si sigue palabra (`**útil** y`, no `**útil**y`).
- **Encabezados con `## `/`### `** en una línea con SOLO el título (el cuerpo, en la
  línea siguiente); NO metas el título dentro del párrafo, ni el cuerpo en la misma
  línea del `##`, ni como línea suelta en negrita.
- **Nunca truncar con «…»/«...».** `student_text` lleva el texto completo del trozo
  (regla 9.11); si es largo, más pantallas.
- **Sin rótulos por diapositiva** (`Idea clave:`, `Claves:`, `Objetivo:`, `Resumen:`,
  `Actividad práctica`, `Resolución propuesta:`): la diapositiva es solo el contenido.
- **`title` corto y descriptivo** (2-6 palabras), NO un fragmento del contenido cortado
  a mitad de frase, y **no repetido como primera línea del `student_text`** (el `title`
  ya es la cabecera; si el original repite el epígrafe al abrir el cuerpo, elimínalo).
  Si un apartado se parte en varias pantallas, todas mantienen el mismo `title`
  (continuación).
- **Quita la numeración de epígrafes del PDF** (`1.3`, `1.3.1`, `1.4.2`…) en **todo el
  texto**, no solo en el `title`: también en encabezados `##`/`###`, en los **títulos de
  los ítems** de `accordion`/`tabs`/`flip_cards` y en la primera línea del cuerpo. Es
  rótulo de maquetación del documento, no contenido. (Criterio «todo o nada»; por
  defecto, **fuera**.)
- **Epígrafes hermanos, mismo nivel de encabezado.** Si un apartado tiene una serie de
  sub-epígrafes paralelos (p. ej. tres «momentos»: desde el ingreso / de forma
  progresiva / en el día a día), **todos** llevan el mismo marcado (`###`). No dejes
  uno como línea numerada en negrita (`3. **En el día a día**`) mientras sus hermanos
  van con `###`: rompe la jerarquía y arrastra numeración residual.
- **Cada pantalla empieza por su propio contenido.** Al segmentar por epígrafes, no
  arrastres al inicio de una pantalla la lista o los párrafos finales del epígrafe
  anterior (p. ej. una lista de «errores frecuentes» abriendo la pantalla «Evaluación
  y ajuste»). Si ese contenido tiene entidad propia, dale **su propia pantalla previa**
  con su `title`; si no, ciérralo en la pantalla a la que pertenece.
- **Pantallas sustanciales, ninguna vacía ni diminuta.** Cada pantalla = un apartado
  con su desarrollo (varios párrafos), no una frase. Un encabezado + su subtítulo + su
  cuerpo van en **una** pantalla, no en tres. **Evita micro-diapositivas** y **no
  elimines interactividades** informativas convirtiéndolas en varias pantallas de
  texto: unifica el contenido denso en un `accordion`/`tabs`.
- **Conserva las negritas del documento fuente** (`**...**`) y los **bloques marcados**
  (Importante, ¿Sabías que?, Consejo…) como callouts (§4.1). Extrae con formato, no en
  plano: el texto plano pierde negritas y cajas.
- **Enlaces externos**: presérvalos como `[texto](url)` (http/https/mailto); las URLs
  sueltas, envuélvelas igual. Ojo: los enlaces de un PDF son **anotaciones**, no texto
  — `get_text` no los devuelve; `extract_text_markdown` (§11) ya los captura cruzando
  `page.get_links()` con los spans y los emite como `[texto](url)`. **No los pierdas**:
  todo enlace del original debe llegar al curso. El runtime los abre en otra pestaña
  (`target="_blank" rel="noopener"`) automáticamente; no pongas HTML ni ese atributo.

---

## 5. `visual_resource`

```json
"visual_resource": {
  "kind": "image",
  "src": "assets/img/u01_t01_modelo_pai.png",
  "alt": "Descripción accesible de la imagen.",
  "caption": "",
  "poster": "",
  "tracks": [],
  "has_voice": false,
  "layout": "top",
  "media_width": "50"
}
```

- `kind`: `"none"` | `"image"` | `"video_youtube"` | `"video_file"` | `"audio"`.
- Si `kind="image"` → `alt` **obligatorio y no vacío**.
- **`layout` según la proporción de la imagen** (`layout`: `top`|`bottom`|`left`|
  `right`, def. `top`; `media_width`: `33`|`50`|`66`, solo aplica en `left`/`right`).
  **Nunca emitas `""` en estos enums**: si no aplica, **omite la clave** (el editor
  pone el default); `"media_width": ""` rompía la validación al cargar:
  - Imagen **apaisada** (ancho > alto, ratio ≳ 1.2) → `"layout": "top"` (o `"bottom"`):
    encima/debajo del texto, a lo ancho.
  - Imagen **cuadrada o vertical** (alto ≥ ancho) → `"layout": "right"` con
    `"media_width": "50"` (o `"33"` si es muy vertical), para que el texto quede al lado.
  - Al extraer del PDF ya conoces las dimensiones (`extract_image` da `width`/`height`);
    calcula el ratio y fija `layout` en consecuencia.
- **Texto + imagen = UNA pantalla.** Un párrafo o apartado acompañado de una figura se
  entrega como **una sola pantalla de contenido** con `student_text` visible **y** su
  `visual_resource`. **No** conviertas ese texto expositivo en un `accordion`/`tabs`, ni
  pongas cada imagen en una pantalla suelta con un pie de foto: eso fragmenta el
  contenido y lo empobrece. Reserva `accordion`/`tabs` para conjuntos de **ítems
  paralelos** (lista de herramientas, categorías…), no para prosa corrida. Si varias
  figuras ilustran sub-puntos distintos, empareja **cada figura con su texto** en su
  pantalla (mismo `title`), en vez de una ristra de imágenes sin texto.
- **Máximo UNA imagen por pantalla, siempre en `visual_resource`** (nunca `![...]`
  dentro de `student_text`, §4.1). Un apartado con varias figuras (un formato, un
  ejemplo, un paso por figura) = **una pantalla por punto**, mismo `title`.
- **Pantalla con texto + imagen → SIN interacción** (tampoco informativa:
  tabs/timeline/accordion). La interactividad va en la **pantalla siguiente** (mismo
  `title`), cuyo `student_text` lleva como mucho una **frase introductoria** para que
  se entienda.
- Si `kind="video_youtube"` → `src` = **ID de YouTube** (no la URL completa). Opcional
  `media_ratio` (`"16x9"` def. | `"4x3"` | `"1x1"` | `"9x16"`): proporción del marco del
  vídeo; omite la clave si no la conoces (nunca `""`).
- **Enlace a un vídeo de YouTube en el documento fuente → pantalla con el vídeo
  embebido**, no un enlace de texto: crea una pantalla `content` con
  `visual_resource.kind="video_youtube"`, el **ID extraído de la URL** en `src`
  (`youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`) y `caption` con el
  título/descripción que dé el fuente. El texto que acompaña al vídeo en el original va
  en el `student_text` de esa misma pantalla; añade `transcript` si el fuente da la
  información (si no, nota en `editor_notes` para que el editor humano lo complete).
  La carcasa lo reproduce embebida (`youtube-nocookie.com`), no saca al alumno del
  SCORM.
- Si `kind="video_file"`/`"audio"` y hay voz → `has_voice: true` **y** `tracks` con
  subtítulos VTT:
  ```json
  "tracks": [
    { "lang": "es", "label": "Español", "src": "assets/media/clip.es.vtt", "kind": "subtitles" }
  ]
  ```
- Todo vídeo/audio debe llevar además `transcript` en la pantalla (§4).

---

## 6. Interacción (`interaction`)

Estructura común a TODAS:

```json
{
  "id": "s05_i01",
  "type": "single_choice",
  "prompt": "Enunciado claro (la tarea/pregunta; vacío si no aporta).",
  "instructions": "Solo la mecánica del componente; vacío si es evidente. Nunca repite el enunciado.",
  "options": [],
  "config": {},
  "feedback": { "correct": "Texto de acierto.", "incorrect": "Texto de error.", "explanation": "Explicación pedagógica." },
  "scored": true,
  "points": 1,
  "retries": 2,
  "source_refs": []
}
```

- `type` (enum cerrado): `accordion`, `tabs`, `flip_cards`, `match_pairs`,
  `sort_steps`, `single_choice`, `true_false`, `classification`,
  `scenario_decision`, `case_practice`, `hotspots`, `video`, `fill_blanks`,
  `timeline`, `flashcards`, `html_embed`, `image_cards`, `before_after`,
  `word_search`, `crossword`, `hidden_image`, `az_quiz`, `puzzle`,
  `scenario_steps`, `decision_tree`, `calculator`.
  **`reflection` NO está en esta lista**: es un tipo de
  *pantalla* (§3), no de interacción. Una reflexión se modela como pantalla
  `type: "reflection"` con `interaction: null`, o —si tiene tarea con
  solución/feedback— como interacción `case_practice`.
- **Tipos que el GPT NO genera** (reservados al editor humano, que los añade desde
  SCORMEditor si procede): `hotspots`, `before_after`, `hidden_image`, `puzzle`,
  `video` (vídeo interactivo con preguntas) y `html_embed` (código a medida). Piden
  elegir y ajustar a mano una imagen, un medio o un código. El enum los admite (el
  editor los soporta), pero no los emitas. Los vídeos de YouTube del fuente **sí**
  van: como `visual_resource` `video_youtube` (§5), no como interacción `video`.
  Sigue vetados aunque el documento fuente los pida por marca de autoría (ver
  `marcas-autoria.md`).
- **Una evaluable no comparte pantalla con teoría**: la interactividad evaluable o de
  pregunta directa va en pantalla propia; su `student_text` lleva como mucho una
  frase de contexto (el enunciado va en `prompt`/`instructions`) y el desarrollo, en
  la pantalla anterior (mismo `title`). Excepción: dentro de una marca de corte
  `{{diapositiva}}` del documento fuente, que manda incluso sobre esta regla (ver
  `marcas-autoria.md`).
- **Formato dentro de los campos de interacción**: los campos de texto corto
  (`prompt`, `instructions`, `scenario`, textos de `options`, `feedback.*`,
  `front`/`back` de tarjetas, `title`/`label` de ítems) renderizan **solo**
  `**negrita**`, `*cursiva*` y `[enlaces](url)`; cualquier otro markdown (`## `,
  callouts `::: tipo`, listas `- `, saltos de párrafo) se muestra **literal** — no lo
  uses ahí. El markdown de bloque completo (párrafos, listas, encabezados) funciona
  **solo** en los cuerpos largos: `body` de `accordion`/`tabs`/hitos de `timeline` y
  `text` de `image_cards`.
- `retries`: `0` = ilimitados.
- La interacción no lleva `learning_objective`: evalúa el `objective` de su propia
  pantalla (§4). No lo añadas al JSON.
- Reglas del validador para preguntas evaluables: deben tener **respuesta
  correcta** y **feedback** (acierto/error).
- **No te preocupes del orden de las opciones**: la carcasa **baraja** al mostrar las
  opciones de `single_choice`, `scenario_decision`, `scenario_steps`,
  `match_pairs`/`classification`, `sort_steps` y las preguntas del test (no `true_false`, que mantiene V/F). Escribe
  las opciones en el orden que te resulte natural (p. ej. la correcta primero, que
  facilita revisar); no intentes «aleatorizarlas» tú.

### Forma del `config` y `options` por tipo

> Cada tipo lee campos concretos. Respétalos o la interacción no se renderiza bien.

**`single_choice` / `true_false`** — usan `options` (sin `config`):
```json
"options": [
  { "id": "a", "text": "Opción A", "correct": false, "feedback": "..." },
  { "id": "b", "text": "Opción B", "correct": true,  "feedback": "..." }
]
```
Para `true_false` usa dos opciones (Verdadero/Falso) con `correct`.

**`classification` / `match_pairs`** — asignar cada elemento a un grupo/categoría.
`config.groups` define las categorías; cada `option` lleva su `group` correcto:
```json
"config": { "groups": [ { "id": "pu", "label": "Persona usuaria" }, { "id": "ep", "label": "Equipo profesional" } ] },
"options": [
  { "id": "o1", "text": "Expresa preferencias.", "group": "pu" },
  { "id": "o2", "text": "Propone opciones y facilita apoyos.", "group": "ep" }
]
```
> Para “emparejar” en 2 columnas, modela cada elemento de la columna derecha como
> un `group` y cada elemento de la izquierda como `option` con su `group`.

**`sort_steps`** — ordenar pasos. `config.steps` con `order` (1..n) y `explanation`
opcional por paso (por qué va en ese lugar). La explicación **solo se ve al quedar
resuelta** la actividad (acierto o intentos agotados), junto a cada paso marcado ✔/✖
con su posición correcta; antes no se muestra, así que puede razonar el orden sin
desvelarlo. Ponla cuando el fuente explique el porqué de la secuencia:
```json
"config": { "steps": [
  { "id": "p1", "text": "Primer paso", "order": 1, "explanation": "Va primero porque…" },
  { "id": "p2", "text": "Segundo paso", "order": 2 }
] }
```

**`scenario_decision`** — caso con decisión. `config.scenario` (texto) + `options`
con `correct` y `feedback` por opción:
```json
"config": { "scenario": "Una persona prefiere ducharse por la tarde..." },
"options": [
  { "id": "a", "text": "Mantener la rutina del centro.", "correct": false, "feedback": "..." },
  { "id": "b", "text": "Ajustar el horario del apoyo.", "correct": true,  "feedback": "..." }
]
```

**`scenario_steps`** — caso por decisiones (evaluable). Un mismo caso con **varias
decisiones encadenadas**, una cada vez: en cada paso el alumno elige, ve en línea el
comentario de su opción y pasa a la siguiente; al final, resumen «X/N». Una respuesta
por paso (sin intentos) y **crédito parcial**: puntúa `points × aciertos/pasos`. Todo
va en `config` (`options` de la raíz vacío). Cada paso con `text` (situación +
pregunta), **≥2 opciones**, al menos una `correct: true` y **`feedback` en cada
opción** (es el sentido del tipo; sin él el validador avisa `SS_NO_FEEDBACK`).
`config.scenario` (opcional) presenta el caso. Las opciones se barajan solas:
```json
"config": {
  "scenario": "Una persona usuaria se niega a ducharse esta mañana.",
  "steps": [
    { "id": "st1", "text": "Te dice que hoy no quiere. ¿Qué haces primero?", "options": [
      { "id": "st1-a", "text": "Preguntarle con calma qué le ocurre.", "correct": true,  "feedback": "Bien: entender el motivo abre opciones." },
      { "id": "st1-b", "text": "Insistir en que es la hora de la ducha.", "correct": false, "feedback": "Insistir suele aumentar la resistencia." }
    ] },
    { "id": "st2", "text": "Prefiere hacerlo por la tarde. ¿Cómo sigues?", "options": [
      { "id": "st2-a", "text": "Ajustar el horario y anotarlo en su plan.", "correct": true,  "feedback": "Respetas su preferencia y lo dejas registrado." },
      { "id": "st2-b", "text": "Dejarlo para mañana sin decir nada.", "correct": false, "feedback": "Sin registro, el equipo no sabrá del cambio." }
    ] }
  ]
}
```

**`decision_tree`** — conversación ramificada (evaluable). Un diálogo con uno o más
personajes en el que **cada respuesta lleva a un momento distinto** y el recorrido
acaba en un final bueno, mejorable o neutro. `config.characters` (`id`, `name`,
`role`) y `config.nodes`, cada momento con `id`, `speaker` (id de un personaje;
opcional), `text` (lo que dice) y `choices` (`id`, `text`, `to` = id del momento al
que lleva). Reglas del grafo:
- **Empieza en el primer nodo** de la lista, que debe tener respuestas.
- Un nodo **sin `choices`** es un **final**: lleva `outcome` (`"good"`, `"bad"` o
  `"neutral"`) y `feedback` (comentario del final).
- **Sin ciclos**: ninguna respuesta vuelve a un momento anterior del mismo camino.
  Todo `to` apunta a un `id` existente y todo nodo debe ser alcanzable.
- Si puntúa (`scored: true`), al menos un final `good` alcanzable; `correct` = el
  **primer** final al que llega el alumno es `good` (puede deshacer antes del final y
  repetir después, pero la nota la fija el primer final).
- Tamaño manejable: **4-8 momentos, 2-3 respuestas por momento**.
```json
"config": {
  "characters": [ { "id": "p1", "name": "Carmen", "role": "hija de una persona usuaria" } ],
  "nodes": [
    { "id": "n1", "speaker": "p1", "text": "Mi madre lleva dos días sin querer comer. ¿Qué le estáis haciendo?", "choices": [
      { "id": "c1", "text": "Entiendo su preocupación. Cuénteme qué ha notado.", "to": "n2" },
      { "id": "c2", "text": "Aquí hacemos las cosas bien, no se preocupe.", "to": "n3" }
    ] },
    { "id": "n2", "speaker": "p1", "text": "Gracias por escucharme. ¿Me tendréis al tanto?", "choices": [],
      "outcome": "good", "feedback": "Validar la emoción antes de explicar baja la tensión." },
    { "id": "n3", "speaker": "p1", "text": "Pues quiero hablar con la dirección.", "choices": [],
      "outcome": "bad", "feedback": "Restar importancia a la queja la escala." }
  ]
}
```

**`calculator`** — reto numérico. Dos modos en `config.mode`:
- `"challenge"` (evaluable, con Comprobar e intentos): el curso da **todos los datos**
  (`value` numérico en cada variable) y el alumno escribe cada resultado. Admite coma
  decimal y se corrige con margen de redondeo (media unidad del último decimal
  pedido o 0,5 %).
- `"tool"` (calculadora libre, informativa, **`scored: false`**): el alumno mete sus
  propios datos (el `value` es solo valor inicial, opcional) y ve los resultados.

`config.variables` (`id`, `label`, `unit`, `value`) y `config.results` (`id`,
`label`, `formula`, `unit`, `decimals`). **Gramática de `formula`**: números con
**punto** decimal, `+ - * / ^`, paréntesis, los `id` de las variables y de los
resultados **anteriores** (se calculan en orden) y las funciones `round(x)` /
`round(x, d)`, `min`, `max`, `abs`, `sqrt`, `floor`, `ceil`. Nada más (ni `%`, ni
coma decimal, ni texto). Cada `id` cumple `^[A-Za-z_][A-Za-z0-9_]*$` (sin tildes, ñ
ni espacios), no es un nombre de función y es **único** entre variables y resultados:
```json
"config": {
  "mode": "challenge",
  "variables": [
    { "id": "peso", "label": "Peso de la persona", "unit": "kg", "value": 70 },
    { "id": "dosis_kg", "label": "Dosis prescrita", "unit": "mg/kg", "value": 15 }
  ],
  "results": [
    { "id": "dosis", "label": "Dosis total", "formula": "peso * dosis_kg", "unit": "mg", "decimals": 0 },
    { "id": "dosis_g", "label": "En gramos", "formula": "dosis / 1000", "unit": "g", "decimals": 2 }
  ]
}
```
Solo cuando el contenido **ya pide calcular** (dosis, costes, ratios, tiempos,
consumos): no fuerces un cálculo donde no lo hay. Los datos y el resultado salen del
fuente (o de un supuesto coherente con él); comprueba el resultado tú mismo en Python.

**`accordion` / `tabs`** — informativas (no evalúan; `scored: false`).
`config.items` con `title` + `body`. El `body` debe tener **desarrollo real, claramente
más extenso que su `title`** (nunca una frase que repita o parafrasee el rótulo que se
clica); si el fuente solo da rótulos sin desarrollo, el bloque va como lista en
`student_text`, no como desplegable. Lo mismo aplica al `back` de `flip_cards` respecto
a su `front` y al `body` de cada hito de `timeline`:
```json
"config": { "items": [ { "title": "Dar coherencia", "body": "Todo el equipo actúa..." } ] }
```

**`flip_cards`** — `config.cards` con `front` + `back`:
```json
"config": { "cards": [ { "front": "Concepto", "back": "Definición" } ] }
```

**`case_practice`** — reflexión guiada: el alumno piensa (o escribe en papel) su
respuesta y se autoevalúa con la rúbrica; **no hay campo de texto en pantalla** y no
puntúa. `config.rubric` opcional pero muy recomendada (sin ella solo queda el enunciado):
```json
"config": { "rubric": [ { "label": "Menciona la preferencia de la persona" } ] }, "scored": false
```

**`hotspots`** — zonas activas accesibles sobre una imagen:
```json
"config": {
  "image": "assets/img/escena.png",
  "alt": "Descripción de la escena.",
  "spots": [ { "id": "z1", "x": 30, "y": 40, "w": 10, "h": 10, "label": "Zona correcta", "correct": true, "feedback": "..." } ]
}
```
(`x,y,w,h` en % sobre la imagen.) El alumno debe encontrar **todas** las zonas con
`correct: true`; las erróneas se marcan en rojo y no bloquean.

**`fill_blanks`** — completar huecos (evaluable). `config.text` con cada respuesta
correcta entre dobles corchetes `[[...]]`; el runtime convierte cada hueco en un
desplegable cuyas opciones son todas las respuestas + `config.distractors`
(opcional). El validador exige al menos un hueco y feedback:
```json
"config": {
  "text": "El paquete SCORM se sube a [[Moodle]] en formato [[ZIP]].",
  "distractors": ["PDF", "Wordpress"]
}
```
**Respuesta escrita** (`config.mode: "type"`): el alumno **escribe** cada hueco en vez
de elegirlo. Varias respuestas válidas con `|` dentro del hueco (`[[EPI|equipo de
protección individual]]`); al corregir no cuentan mayúsculas, tildes ni espacios de
más. **Sin `distractors`** en este modo. Úsalo para términos que el alumno debe
recordar sin pista (no reconocer), con respuestas cortas e inequívocas. Sin `mode`
(lo habitual) son desplegables y ahí `|` es texto literal:
```json
"config": {
  "mode": "type",
  "text": "Antes de mover a la persona, comprueba los [[frenos]] de la [[silla|silla de ruedas]]."
}
```

**`timeline`** — línea de tiempo (informativa; `scored: false`). `config.milestones`
en orden, cada hito con `label` (fecha/fase, opcional), `title` y `body` (admite
markdown ligero). El alumno despliega cada hito:
```json
"config": { "milestones": [
  { "label": "1995", "title": "Primer estándar", "body": "Texto del hito..." },
  { "label": "2004", "title": "SCORM 2004", "body": "..." }
] }
```

**`flashcards`** — tarjetas de repaso con autoevaluación (`scored: false`
obligatorio; el validador avisa si puntúa). Mismo shape que `flip_cards`
(`config.cards` con `front`/`back`), pero el flujo es una tarjeta cada vez:
«Mostrar respuesta» → «¿La sabías?» → resumen final «X de N». Úsalo para repaso
al cierre de un tema; `flip_cards` para explorar contenido:
```json
"config": { "cards": [ { "front": "¿Qué es cmi.core.lesson_status?", "back": "El estado del alumno..." } ] }
```

**`video`** (interacción con transcripción/subtítulos y, opcionalmente, **preguntas
que pausan el vídeo** en el segundo indicado — vídeo interactivo):
```json
"config": {
  "youtube": "VIDEOID",
  "transcript": "Transcripción completa del vídeo.",
  "tracks": [ { "kind": "subtitles", "src": "assets/media/v.es.vtt", "lang": "es", "label": "Español" } ],
  "questions": [
    { "time": 45, "prompt": "¿Qué EPI se muestra?", "options": [
      { "text": "Casco", "correct": true, "feedback": "..." },
      { "text": "Guantes" }
    ] }
  ]
}
```
(usa `"src": "assets/media/v.mp4"` en vez de `youtube` si es vídeo propio.)
`questions` es opcional; con preguntas la actividad se completa al responderlas todas,
puede puntuar (`scored: true`; cada acierto suma su parte) y el alumno tiene un intento
por pregunta. Solo pon `time` en momentos que el vídeo ya haya mostrado la respuesta.

**`image_cards`** — tarjetas de imagen (informativa, no puntúa): rejilla de tarjetas
con imagen y título; al clicar una se abre una modal con el texto a la izquierda y la
imagen a la derecha. Como las imágenes las sube el autor, si generas este tipo deja
`image` vacío y descríbela en una `editor_note`; `alt` es obligatorio y `text` admite
markdown ligero:
```json
"config": { "cards": [
  { "image": "assets/img/extintor.jpg", "alt": "Extintor de CO2", "title": "Extintor de CO2", "text": "Indicado para fuegos eléctricos.\n\n- No deja residuo." }
] }, "scored": false
```
**`force_complete`** (opcional, solo en `match_pairs`, `classification` y `crossword`,
dentro de `config`): ausente o `true` = el botón Comprobar solo se activa cuando el
alumno ha colocado/rellenado todo (comportamiento clásico). `false` = se puede
comprobar con respuestas parciales. No lo pongas: lo decide el editor humano.

`config.show_cover_image` (opcional, por defecto `true`): con `false` la tarjeta solo
muestra el `title` (aspecto de tarjeta giratoria) y la imagen se ve únicamente en la
ventana. No lo pongas salvo que el autor lo pida; con `false` cada tarjeta necesita
`title` (`IC_NO_TITLE`).

**`before_after`** — comparador antes/después (informativa, no puntúa): dos
imágenes superpuestas con un divisor deslizante. Ideal para mostrar el efecto de
aplicar una norma o procedimiento (zona ordenada/desordenada, con/sin EPI…). Como
las imágenes las sube el autor, si generas este tipo deja las rutas vacías y
descríbelas en una `editor_note`; los `alt` son obligatorios y las etiquetas son
opcionales («Antes»/«Después» por defecto):
```json
"config": {
  "before_image": "assets/img/zona-desordenada.png",
  "before_alt": "Zona de trabajo con obstáculos en el suelo",
  "after_image": "assets/img/zona-ordenada.png",
  "after_alt": "La misma zona despejada y señalizada",
  "before_label": "Antes", "after_label": "Después"
}, "scored": false
```

**`word_search`** — sopa de letras (evaluable opcional). El tablero se genera solo
a partir de `config.words` (3–12 letras por palabra; acentos y espacios se ignoran
al colocarla). El alumno toca la primera y la última letra de cada palabra; no hay
botón Comprobar ni intentos. Si puntúa, cada palabra encontrada suma su parte
proporcional de `points`. Úsala para afianzar vocabulario clave del tema:
```json
"config": { "words": ["SCORM", "Moodle", "Prevención", "Extintor"] }
```

**`crossword`** — crucigrama (evaluable, con Comprobar e intentos). El tablero se
autocalcula buscando cruces entre las palabras: elige palabras que **compartan
letras**; una palabra sin cruce posible se descarta. 3–12 letras por palabra:
```json
"config": { "entries": [
  { "word": "EXTINTOR", "clue": "Equipo para sofocar un conato de incendio" },
  { "word": "RIESGO", "clue": "Probabilidad de que un peligro cause daño" }
] }
```

**`hidden_image`** — imagen oculta (evaluable): la imagen se cubre con losetas y cada
respuesta correcta destapa una parte; al responder todas se desvela entera. Preguntas
de opción única (mismo shape que las del vídeo), un intento por pregunta. Como las
imágenes las sube el autor, deja `image` vacío y descríbela en una `editor_note`:
```json
"config": {
  "image": "assets/img/senal.png", "alt": "Señal de evacuación",
  "questions": [ { "prompt": "¿Qué indica el color verde?", "options": [
    { "text": "Salvamento o socorro", "correct": true }, { "text": "Prohibición" }
  ] } ]
}
```

**`az_quiz`** — rosco A-Z tipo pasapalabra (evaluable): una definición por letra, el
alumno **escribe** la respuesta o pasa palabra (la letra vuelve en la siguiente
vuelta). La letra del rosco es la **inicial de la respuesta** (elige respuestas con
iniciales variadas); mayúsculas/acentos no cuentan al corregir:
```json
"config": { "items": [
  { "clue": "Equipo de protección individual de la cabeza", "answer": "Casco" },
  { "clue": "Documento que evalúa los riesgos del puesto", "answer": "Evaluación" }
] }
```

**`puzzle`** — puzzle de imagen (informativa por defecto): la imagen se trocea y el
alumno intercambia piezas tocándolas hasta recomponerla. `cols`/`rows` opcionales
(2–5, por defecto 3×3). Deja `image` vacío + `editor_note` (la sube el autor):
```json
"config": { "image": "assets/img/mapa-evacuacion.png", "alt": "Mapa de evacuación de la planta", "cols": 3, "rows": 3 }, "scored": false
```

**`html_embed`** — animación o interactivo a medida en HTML/CSS/JS que el **autor
humano pega a mano en el editor** (corre aislado en un iframe sandbox, no puntúa).
**NO lo generes**: existe en el enum, pero escribir código no es tarea del GPT; si un
contenido pide un interactivo que ningún otro tipo cubre, deja una pantalla `content`
con una `editor_note` describiendo el interactivo deseado y el autor lo montará.

> Tipos de tu GPT que NO existen aquí y su equivalencia:
> `match_to_category` → `classification`; `classify` → `classification`;
> `decision` → `scenario_decision`; `multi_step_case`/`case_steps` → `scenario_steps`;
> `branching_scenario`/`dialogue`/`role_play` → `decision_tree`;
> `numeric`/`calculation` → `calculator`; `accordion_with_check` → `accordion`
> (informativo) **+** una `single_choice` aparte si quieres puntuarlo;
> `reflection_note`/`open_reflection` → `case_practice` o pantalla `reflection`;
> `checklist_acknowledgement`/`completion_acknowledgement` → **omitir** (la
> compleción la gestionan las reglas SCORM, no hace falta una interacción de
> “confirmo que terminé”).

---

## 7. Evaluación (`assessments`)

El **test calificable** va aquí, NO como interacción de una pantalla.
Si `scorm.rules.score_source = "final_test"`, **debe** existir `final_test` con
preguntas.

> **NO crees una pantalla `unit_quiz`** (ni ninguna pantalla) con el test escrito como
> texto: duplicaría el test (una versión en texto + la interactiva). El test vive
> **solo** en `assessments.final_test`; el runtime ya añade automáticamente la pantalla
> interactiva del test **y una pantalla final de Resultados** (nota + APTO/NO APTO).
> Tampoco crees una pantalla de «Resultados»/«Calificaciones»: la pone la app sola.

```json
"assessments": {
  "unit_tests": [],
  "final_test": {
    "id": "A01",
    "unit_id": "u1",
    "title": "Autoevaluación del Tema 1",
    "instructions": "",
    "pass_score": 70,
    "one_question_per_screen": false,
    "questions": [
      {
        "id": "Q01",
        "prompt": "El Plan de Apoyos Integrado es principalmente:",
        "type": "single_choice",
        "options": [
          { "id": "a", "text": "Un documento administrativo.", "correct": false },
          { "id": "b", "text": "Un conjunto organizado de apoyos y decisiones.", "correct": true }
        ],
        "feedback": { "correct": "Correcto.", "incorrect": "Revisa la definición.", "explanation": "..." },
        "points": 1,
        "learning_objective": "Definir el Plan de Apoyos Integrado.",
        "source_refs": [ { "doc": "Curso PAI T.1-4.pdf", "locator": "p.8" } ]
      }
    ]
  }
}
```

- `unit_id` es **obligatorio**, también en `final_test` (el esquema del editor lo
  exige): el id de una unidad existente. Si el test abarca todo el curso, pon la
  primera unidad (p. ej. `"u1"`).
- Pregunta `type`: usa **`"single_choice"`** o **`"true_false"`**. (El renderizador
  del test usa botones de opción única; `multiple_choice` se admite en el esquema
  pero se comportaría como selección única, evítalo de momento.)
- Para `true_false`, da dos opciones (`Verdadero`/`Falso`) con `correct`.
- `one_question_per_screen` (opcional, def. `false`): el estudiante ve las preguntas
  de una en una con navegación Anterior/Siguiente en vez de todas seguidas. Es una
  decisión de presentación del editor humano: déjalo en `false` salvo que lo pidan.
- `pass_score` (heredado): el runtime lo **ignora**; la nota mínima para aprobar es
  única y es `scorm.rules.min_score` (§2). Puedes omitirlo o repetir ese valor.
- `instructions` (opcional, def. `""`): texto introductorio que se muestra antes de las
  preguntas (markdown ligero). Vacío = no se muestra nada; déjalo vacío salvo que el
  encargo pida instrucciones concretas.

---

## 8. `glossary`, `bibliography`, `quality_checklist`

```json
"glossary": [
  { "term": "Plan de Apoyos Integrado", "definition": "Conjunto organizado de apoyos...", "source_refs": [ { "doc": "Curso PAI T.1-4.pdf", "locator": "p.8" } ] }
],
"bibliography": [
  { "ref": "Ley 8/2021, sobre el apoyo en la toma de decisiones.", "url": "" }
],
"quality_checklist": {
  "Objetivo del tema definido": true,
  "Contenido trazado a fuente": true,
  "Imágenes con texto alternativo": false
}
```

- `glossary[]`: `{ term, definition, source_refs[] }` (NO uses `id`/`source_ref`).
- `bibliography[]`: `{ ref, url? }` (el campo es **`ref`**, NO `reference`).
- `attachments[]` y `attachments_title` (documentos PDF adjuntos): **no los generes**.
  Los PDF los adjunta el autor en el editor (Materiales → Documentos), porque el binario
  tiene que viajar dentro del proyecto. Si el fuente cita un PDF descargable, ponlo como
  referencia en `bibliography[]` y deja una nota editorial para que el autor lo adjunte.
- `glossary_title` y `bibliography_title` (opcionales, junto a sus arrays): rótulo
  personalizado que la carcasa usa en el botón de la barra y en el título del modal.
  Por defecto «Glosario» y «Recursos y bibliografía»; normalmente **omítelos** (el
  autor los ajusta en el editor si quiere otro nombre).
- **La bibliografía va SOLO en `bibliography[]`**: la carcasa ya la muestra al alumno
  en el modal «Recursos y bibliografía» (una entrada por línea). **NO crees una
  pantalla `content` «Referencias»** con las citas apelotonadas en un párrafo.
- **Una entrada de `bibliography[]` por referencia** (nunca varias citas en un mismo
  `ref`), con el texto limpio y los espacios correctos: nada de `«(2010):La atención»`
  sin espacio ni citas pegadas.
- **Formato homogéneo en TODAS las entradas**, mismo orden y puntuación:
  `Autor/Entidad (año). Título. Revista/Editorial, datos.` Si el original no trae el
  año, omítelo manteniendo el resto del patrón (`Entidad. Título.`). No mezcles estilos
  (unas con `(año):`, otras con el título entre comillas, otras empezando por el
  título): **normaliza todas al mismo patrón** aunque la fuente sea desordenada.
- `quality_checklist`: **objeto** `criterio → booleano`.

---

## 9. Reglas que el JSON debe cumplir para pasar el validador

1. Toda pantalla con `title` no vacío.
2. Pantallas `content`/`objectives`/`route` con `objective` (las `cover` y `summary`
   están exentas). Los objetivos son un **conjunto reducido reutilizado** entre
   pantallas (texto idéntico), no uno distinto por pantalla; en `objectives`/`route`
   usa el objetivo principal del tema (no meta-objetivos tipo «Presentar el
   recorrido»).
3. Toda imagen (`kind="image"`) con `alt`.
4. Todo vídeo con `transcript`; medios con voz (`has_voice:true`) con `tracks` VTT.
5. Toda pregunta evaluable con **respuesta correcta** y **feedback**. En las prácticas
   de varios pasos (§6): cada paso de `scenario_steps` con texto, ≥2 opciones, una
   correcta y comentario por opción; `decision_tree` sin respuestas colgantes ni
   ciclos, con el primer nodo con respuestas y, si puntúa, un final `good`
   alcanzable; `calculator` con ids válidos y únicos, fórmulas de la gramática §6,
   todos los datos con `value` en modo `challenge` y `scored: false` en modo `tool`.
6. Toda pregunta de test con `learning_objective` **copiado literalmente** de un
   `objective` declarado en pantallas (la interacción no lleva este campo: evalúa el
   `objective` de su propia pantalla); cada objetivo declarado con al menos una
   evaluación (interacción `scored` o pregunta del test) que lo mida.
7. Cada unidad con `summary` (o pantalla `summary`) y al menos una actividad/test.
8. `glossary` y `bibliography` no vacíos.
9. Si `score_source="final_test"` → `assessments.final_test` con preguntas.
10. `scorm.identifier` no vacío.
11. **Texto original conservado (~100%)**: el curso reproduce el texto de origen casi
    literal (mínimo ~0.95, ideal ≈1.0), NO un resumen ni una reescritura. Solo se
    permiten retoques mínimos de conexión para cortar entre pantallas y
    micro-transiciones **aditivas** (1-2 frases propias que introducen o enlazan, sin
    sustituir texto fuente; por eso el ratio puede superar 1.0). El texto va
    **visible** (`student_text` y/o dentro de interactividades informativas) y
    **duplicado en `transcript`**. Se reparte en pantallas **sustanciales** (no
    micro-diapositivas) e interactividades informativas; la información NO se recorta
    (ver guía).

---

## 10. Checklist final para la herramienta antes de devolver el JSON

- [ ] Es un único objeto JSON válido (sin texto extra, sin fences).
- [ ] `schema_version` = `"1.1.0"`.
- [ ] Contenido en `modules[].units[].screens[]` (no array plano).
- [ ] `type` de pantalla e interacción, y `status` de pantalla/unidad (enums
      DISTINTOS: `borrador` no existe en unidad), dentro de los enums permitidos.
- [ ] Cada interacción usa el `config`/`options` correcto de su tipo (§6).
- [ ] Test calificable en `assessments.final_test`.
- [ ] `bibliography` usa `ref`; `quality_checklist` es objeto de booleanos.
- [ ] Sin afirmaciones de homologación SEPE; nota normativa como "pendiente de
      revisión por la entidad".
- [ ] **Texto original conservado ~100%** (regla 9.11): casi literal (≥0.95), visible
      + en `transcript`, sin resumir ni reescribir.
      `quality_checklist`: `"Contenido del documento trazado sin pérdidas": true`.
- [ ] **Preflight `validate_course(course)` con CERO errores** (§11) y avisos
      corregidos (salvo imposibilidad real, que se anota en `editor_notes`).
- [ ] Empaquetado como `.scormproj` (§11): `course.json` en la raíz del ZIP +
      `assets/` con TODOS los binarios referenciados; ninguna ruta `assets/…` del
      `course.json` apunta a un fichero ausente.

---

## 11. Empaquetado `.scormproj` (entrega final)

El editor SCORMEditor abre **archivos de proyecto `.scormproj`**: un **ZIP** que
contiene `course.json` en la raíz y una carpeta `assets/` con los binarios. Modelo
mental tipo `.docx`/`.sb3`: un solo archivo que el usuario abre con doble clic o
desde *Archivo ▸ Abrir*.

### Reglas del paquete (no se pueden romper)

1. **`course.json` en la raíz** del ZIP (nombre exacto, en minúsculas). Es el
   mismo objeto JSON que define este contrato (§1–§10), serializado UTF-8 con
   sangría de 2 espacios.
2. **Carpeta `assets/`**: cada binario va bajo `assets/…`. Las **claves de las
   entradas del ZIP coinciden EXACTAMENTE** con las rutas que el `course.json`
   referencia. Es decir, si una pantalla lleva
   `"visual_resource": { "src": "assets/img/s06.png" }`, dentro del ZIP **debe
   existir** la entrada `assets/img/s06.png`. Lo mismo para `hotspots.image`,
   `tracks[].src` y `audio_src`.
3. **Sin rutas rotas**: toda ruta `assets/…` referenciada en `course.json` debe
   tener su fichero real en el ZIP. Si no hay binario para una imagen, **no la
   referencies**: pon `kind:"none"` en esa pantalla y anótalo en `editor_notes`
   (`"Imagen pendiente de subir: figura p.8"`), en vez de dejar un `src` que apunte
   a la nada.
4. **Vídeo de YouTube**: `kind:"video_youtube"` usa el **ID** en `src` y **no**
   genera ningún fichero en `assets/` (no es un binario local).
5. **Convención de nombres**: `assets/img/…` imágenes, `assets/media/…` audio/
   vídeo/subtítulos VTT. Nombres en minúsculas, sin espacios ni acentos
   (`u01_t01_modelo.png`).
6. **Nombre del archivo**: `<course.id>.scormproj`.

### Imágenes a partir del PDF de origen

Cuando el documento de origen sea un PDF, **extrae sus imágenes** e inclúyelas en
`assets/img/` con un nombre estable, referenciándolas desde la pantalla
correspondiente (usa el `source_refs[].locator` —p. ej. `p.8`— para saber de qué
página sale cada figura). Para cada imagen incluida, rellena `alt` (obligatorio) y,
si procede, `caption`. Las figuras decorativas o de baja calidad: omítelas
(`kind:"none"`) antes que ensuciar el curso.

### Builder en Code Interpreter (Python)

Construye el `course.json` como `dict`, reúne los binarios en un `dict`
`ruta → bytes` y empaqueta con esta función. **Preflight obligatorio**: antes de
empaquetar, `validate_course(course)` comprueba en Python las reglas del §9 (las
mismas que aplicará el editor al abrir el archivo). `build_scormproj` lo ejecuta y
**aborta si hay ERRORes**: corrige el `course` con los mensajes y reintenta hasta
cero errores (los AVISOs corrígelos también, salvo imposibilidad real — p. ej. no
tener el dato en la fuente). Nunca entregues con errores de preflight: el usuario
los verá igualmente al abrir el proyecto.

```python
import json, zipfile, os, re, unicodedata, math

def validate_course(course: dict) -> list:
    """Preflight de las reglas §9 sobre el course.json ANTES de empaquetar.
    Devuelve mensajes "ERROR: ..." (bloquean) y "AVISO: ..." (corregir si se
    puede). Réplica de los validadores de SCORMEditor: lo que falle aquí,
    fallará en el editor."""
    out, ids = [], {}
    err = lambda m: out.append("ERROR: " + m)
    warn = lambda m: out.append("AVISO: " + m)

    # Enums cerrados del esquema (§3 y §6): un valor fuera de lista rompe la carga.
    SCREEN_TYPES = {"cover", "objectives", "route", "content", "summary",
                    "video", "reflection", "forum_prompt", "unit_quiz", "content_placeholder",
                    "guide"}
    INTERACTION_TYPES = {"accordion", "tabs", "flip_cards", "match_pairs", "sort_steps",
                         "single_choice", "true_false", "classification",
                         "scenario_decision", "case_practice", "hotspots", "video",
                         "fill_blanks", "timeline", "flashcards", "html_embed",
                         "image_cards", "before_after", "word_search", "crossword",
                         "hidden_image", "az_quiz", "puzzle", "scenario_steps",
                         "decision_tree", "calculator"}
    # "status" tiene un enum DISTINTO por nivel — "borrador" existe solo en pantalla.
    # Confundirlos (p. ej. copiar el status de una pantalla a su unidad) pasaba
    # inadvertido aquí y solo se veía al abrir el .scormproj en el editor real
    # (detectado en producción, ingesta Moodle: unit.status="borrador" propagado
    # desde screen.status cuando toda una lección venía marcada (MODIFICAR)).
    SCREEN_STATUS = {"ok", "esqueleto_pendiente_desarrollo", "borrador"}
    UNIT_STATUS = {"ok", "esqueleto_pendiente_desarrollo"}

    def norm(t):  # misma normalización de objetivos que el editor
        t = unicodedata.normalize("NFD", str(t or "").lower())
        t = "".join(c for c in t if unicodedata.category(c) != "Mn")
        return re.sub(r"\s+", " ", t).strip().rstrip(".").strip()

    def uid(i, what):  # ids únicos y presentes (§1: IDs deterministas)
        if not i: err(f"{what} sin id")
        elif i in ids: err(f"id duplicado «{i}» ({what} y {ids[i]})")
        else: ids[i] = what

    def check_question(prompt, options, feedback, where):
        opts = options or []
        fb = feedback or {}
        if not str(prompt or "").strip(): err(f"{where}: sin enunciado")
        if not any(o.get("correct") for o in opts) and not any(o.get("group") for o in opts):
            err(f"{where}: sin respuesta correcta")
        if not str(fb.get("correct", "")).strip() and not str(fb.get("incorrect", "")).strip():
            err(f"{where}: sin feedback de acierto/error")

    def check_steps(c, w):  # scenario_steps (§6)
        steps = c.get("steps") or []
        if not steps: err(f"{w}: scenario_steps sin ninguna decisión (SS_EMPTY)")
        for k, st in enumerate(steps, 1):
            opts = st.get("options") or []
            if not str(st.get("text", "")).strip():
                err(f"{w}: decisión {k} sin situación ni pregunta (SS_STEP_NO_TEXT)")
            if len(opts) < 2: err(f"{w}: decisión {k} con menos de 2 opciones (SS_STEP_FEW_OPTIONS)")
            elif not any(o.get("correct") for o in opts):
                err(f"{w}: decisión {k} sin opción correcta (SS_STEP_NO_CORRECT)")
            if any(str(o.get("text", "")).strip() and not str(o.get("feedback", "")).strip() for o in opts):
                warn(f"{w}: decisión {k} con opciones sin feedback (SS_NO_FEEDBACK)")

    def check_tree(c, scored, w):  # decision_tree (§6): mismo criterio que el editor
        nodes = c.get("nodes") or []
        if not nodes: return err(f"{w}: decision_tree sin ningún momento (DT_EMPTY)")
        idx = {n.get("id"): n for n in nodes}
        chars = {p.get("id") for p in c.get("characters") or []}
        valid = lambda n: [x for x in n.get("choices") or [] if x.get("to") in idx]
        for k, n in enumerate(nodes, 1):
            ch = n.get("choices") or []
            if ch and not str(n.get("text", "")).strip(): err(f"{w}: momento {k} sin texto (DT_NO_TEXT)")
            for j, x in enumerate(ch, 1):
                if not str(x.get("text", "")).strip():
                    err(f"{w}: momento {k}, respuesta {j} sin texto (DT_CHOICE_NO_TEXT)")
                if x.get("to") not in idx:
                    err(f"{w}: momento {k}, respuesta {j} no lleva a ningún momento (DT_DANGLING)")
            if n.get("speaker") and n.get("speaker") not in chars:
                warn(f"{w}: momento {k} con speaker que no está en characters (DT_SPEAKER_MISSING)")
        if not valid(nodes[0]): err(f"{w}: el primer momento no tiene respuestas (DT_START_END)")
        state, cycle = {}, [False]
        def visit(i):  # alcanzables desde el inicio + detección de ciclos
            state[i] = "open"
            for x in valid(idx[i]):
                if state.get(x["to"]) == "open": cycle[0] = True
                elif x["to"] not in state: visit(x["to"])
            state[i] = "done"
        visit(nodes[0].get("id"))
        if cycle[0]: err(f"{w}: la conversación tiene un bucle (DT_CYCLE)")
        lost = [k for k, n in enumerate(nodes, 1) if n.get("id") not in state]
        if lost: warn(f"{w}: ningún camino llega a los momentos {lost} (DT_UNREACHABLE)")
        ends = [n for n in nodes if n.get("id") in state and not valid(n)]
        if scored and not any(n.get("outcome") == "good" for n in ends):
            err(f"{w}: puntúa pero ningún camino lleva a un final good (DT_NO_GOOD_END)")

    CALC_ID = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
    CALC_FN = {"round": lambda x, d=0: math.floor(x * 10 ** d + 0.5) / 10 ** d,
               "min": lambda *a: min(a), "max": lambda *a: max(a), "abs": abs,
               "sqrt": math.sqrt, "floor": math.floor, "ceil": math.ceil}

    def calc_eval(src, scope):  # misma gramática que el evaluador de la carcasa (§6)
        toks = re.findall(r"\d+\.?\d*|\.\d+|[A-Za-z_][A-Za-z0-9_]*|\S", str(src or ""))
        pos = [0]
        peek = lambda: toks[pos[0]] if pos[0] < len(toks) else ""
        def take():
            t = peek(); pos[0] += 1; return t
        def expr():
            v = term()
            while peek() in ("+", "-"):
                op, r = take(), term(); v = v + r if op == "+" else v - r
            return v
        def term():
            v = unary()
            while peek() in ("*", "/"):
                op, r = take(), unary(); v = v * r if op == "*" else v / r
            return v
        def unary():
            if peek() == "-": take(); return -unary()
            if peek() == "+": take(); return unary()
            b = atom()
            if peek() == "^": take(); return b ** unary()
            return b
        def atom():
            t = take()
            if not t: raise ValueError("fórmula incompleta")
            if re.fullmatch(r"\d+\.?\d*|\.\d+", t): return float(t)
            if CALC_ID.fullmatch(t):
                if peek() == "(":
                    if t.lower() not in CALC_FN: raise ValueError(f"función desconocida: {t}")
                    take(); args = [expr()]
                    while peek() == ",": take(); args.append(expr())
                    if take() != ")": raise ValueError("falta un paréntesis de cierre")
                    return CALC_FN[t.lower()](*args)
                if t not in scope: raise ValueError(f"nombre desconocido: {t}")
                if scope[t] is None: raise ValueError(f"falta el valor de {t}")
                return scope[t]
            if t == "(":
                v = expr()
                if take() != ")": raise ValueError("falta un paréntesis de cierre")
                return v
            raise ValueError(f"carácter inesperado: {t}")
        v = expr()
        if pos[0] < len(toks): raise ValueError(f"carácter inesperado: {peek()}")
        if not isinstance(v, (int, float)) or not math.isfinite(v):
            raise ValueError("el resultado no es un número válido")
        return v

    def check_calc(c, scored, w):  # calculator (§6)
        tool = c.get("mode") == "tool"
        variables, results = c.get("variables") or [], c.get("results") or []
        if not results: err(f"{w}: calculator sin ningún resultado (CALC_EMPTY)")
        seen = set()
        for x in variables + results:
            i = str(x.get("id") or "")
            if not CALC_ID.fullmatch(i) or i.lower() in CALC_FN:
                err(f"{w}: id «{i}» no vale en fórmulas — letras sin tilde, números y _, "
                    "sin empezar por número ni usar round/min/max… (CALC_BAD_ID)")
            elif i in seen: err(f"{w}: id «{i}» repetido entre datos y resultados (CALC_BAD_ID)")
            seen.add(i)
        scope = {}
        for v in variables:
            val = v.get("value")
            ok = isinstance(val, (int, float)) and not isinstance(val, bool) and math.isfinite(val)
            if not tool and not ok:
                err(f"{w}: dato «{v.get('label') or v.get('id')}» sin value numérico "
                    "(en modo challenge el curso da todos los datos) (CALC_NO_VALUE)")
            scope[v.get("id")] = val if ok else (1 if tool else None)
        for r in results:
            try:
                scope[r.get("id")] = calc_eval(r.get("formula"), scope)
            except Exception as e:  # ZeroDivisionError, OverflowError, ValueError…
                scope[r.get("id")] = None
                if tool or not str(e).startswith("falta el valor"):
                    err(f"{w}: fórmula de «{r.get('label') or r.get('id')}» no válida: {e} (CALC_FORMULA)")
        if tool and scored: warn(f"{w}: calculadora libre (mode tool) con scored:true (CALC_TOOL_SCORED)")

    declared, evaluated = {}, set()

    def check_screen(s):
        uid(s.get("id"), "pantalla")
        w = f"pantalla {s.get('id')}"
        if s.get("type") not in SCREEN_TYPES:
            err(f"{w}: type de pantalla «{s.get('type')}» no existe (§3)")
        if not str(s.get("title", "")).strip(): err(f"{w}: sin título")
        if "status" in s and s.get("status") not in SCREEN_STATUS:
            err(f"{w}: status «{s.get('status')}» no existe — pantalla admite "
                f"{sorted(SCREEN_STATUS)}")
        if s.get("type") not in ("cover", "summary") and not str(s.get("objective", "")).strip():
            warn(f"{w}: sin objective")
        key = norm(s.get("objective"))
        if key and key not in declared: declared[key] = s.get("objective")
        vr = s.get("visual_resource") or {}
        if vr.get("kind") == "image" and not str(vr.get("alt", "")).strip():
            err(f"{w}: imagen sin alt")
        if (vr.get("kind") in ("video_file", "video_youtube") or s.get("type") == "video") \
                and not str(s.get("transcript", "")).strip():
            err(f"{w}: vídeo sin transcript")
        if vr.get("has_voice") and not (vr.get("tracks") or []):
            err(f"{w}: medio con voz sin subtítulos VTT")
        if re.search(r"^[ \t]*:::[ \t]*[\wáéíóúñ-]+[^\n]*\n(?:[ \t]*\n)*[ \t]*:::[ \t]*$",
                     str(s.get("student_text", "")), re.M | re.I):
            warn(f"{w}: callout vacío (::: tipo sin cuerpo, §4.1)")
        it = s.get("interaction")
        if it:
            uid(it.get("id"), "interacción")
            if it.get("type") not in INTERACTION_TYPES:
                err(f"{w}: interaction.type «{it.get('type')}» no existe (§6). "
                    "Ojo: «reflection» es un tipo de PANTALLA, no de interacción — "
                    "usa pantalla type «reflection» (interaction null) o "
                    "interacción «case_practice»")
            # La interacción no lleva learning_objective propio: evalúa el
            # objective de su propia pantalla (§6).
            if it.get("scored") and key: evaluated.add(key)
            if it.get("type") in ("single_choice", "true_false", "classification",
                                  "match_pairs", "scenario_decision"):
                check_question(it.get("prompt"), it.get("options"), it.get("feedback"), w)
            if it.get("type") == "fill_blanks" and \
                    not re.findall(r"\[\[.+?\]\]", str((it.get("config") or {}).get("text", ""))):
                err(f"{w}: fill_blanks sin ningún hueco [[respuesta]]")
            cfg = it.get("config") or {}
            if it.get("type") == "scenario_steps": check_steps(cfg, w)
            if it.get("type") == "decision_tree": check_tree(cfg, it.get("scored"), w)
            if it.get("type") == "calculator": check_calc(cfg, it.get("scored"), w)

    for m in course.get("modules") or []:
        uid(m.get("id"), "módulo")
        for s in m.get("screens") or []:  # pantallas propias del módulo (§3, opcional)
            check_screen(s)
        for u in m.get("units") or []:
            uid(u.get("id"), "unidad")
            screens = u.get("screens") or []
            if "status" in u and u.get("status") not in UNIT_STATUS:
                err(f"unidad {u.get('id')}: status «{u.get('status')}» no existe — unidad "
                    f"admite {sorted(UNIT_STATUS)} (NUNCA «borrador», eso es solo de pantalla; "
                    "si la unidad tiene lecciones marcadas (MODIFICAR)/(BORRAR)/etc., el rastro "
                    "va en el status/editor_notes de CADA pantalla afectada, no en la unidad — "
                    "omite la clave 'status' en la unidad o dale 'ok')")
            if not (str(u.get("summary", "")).strip() or any(s.get("type") == "summary" for s in screens)):
                warn(f"unidad {u.get('id')}: sin summary ni pantalla summary")
            if not any(s.get("interaction") for s in screens):
                warn(f"unidad {u.get('id')}: sin actividad ni test")
            for s in screens:
                check_screen(s)

    a = course.get("assessments") or {}
    tests = ([a["final_test"]] if a.get("final_test") else []) + (a.get("unit_tests") or [])
    for t in tests:
        tw = f"test {t.get('id')}"
        uid(t.get("id"), "test")
        if not str(t.get("unit_id", "")).strip():
            err(f"{tw}: unit_id obligatorio, también en final_test (§7) — id de una "
                "unidad existente; si el test abarca todo el curso, la primera unidad")
        elif ids.get(t.get("unit_id")) != "unidad":
            err(f"{tw}: unit_id «{t.get('unit_id')}» no es el id de ninguna unidad")
        for q in t.get("questions") or []:
            uid(q.get("id"), f"pregunta de {t.get('id')}")
            check_question(q.get("prompt"), q.get("options"), q.get("feedback"),
                           f"test {t.get('id')} › {q.get('id')}")
            if norm(q.get("learning_objective")): evaluated.add(norm(q.get("learning_objective")))

    for key, txt in declared.items():
        if key not in evaluated:
            warn(f"objetivo sin evaluación que lo mida: «{txt}» — añade una interacción "
                 "scored en una pantalla con ese objective, o copia su texto EXACTO en "
                 "el learning_objective de una pregunta de test")

    rules = (course.get("scorm") or {}).get("rules") or {}
    nfinal = len((a.get("final_test") or {}).get("questions") or [])
    nact = sum(1 for m in course.get("modules") or []
               for ss in [m.get("screens") or []] + [u.get("screens") or [] for u in m.get("units") or []]
               for s in ss if (s.get("interaction") or {}).get("scored"))
    src = rules.get("score_source")
    if src == "final_test" and nfinal == 0: err("score_source final_test sin preguntas en final_test")
    if src == "unit_tests" and nact == 0: err("score_source unit_tests sin interacciones scored")
    if src == "mixed" and nfinal == 0 and nact == 0: err("score_source mixed sin test ni actividades")
    if not str((course.get("scorm") or {}).get("identifier", "")).strip(): err("scorm.identifier vacío")
    if not course.get("glossary"): warn("glossary vacío")
    if not course.get("bibliography"): warn("bibliography vacía")
    return out


def build_scormproj(course: dict, asset_files: dict, out_dir="/mnt/data"):
    """
    course      -> dict del course.json (ya conforme a §1–§10).
    asset_files -> { "assets/img/s06.png": b"...bytes...", ... }
                   Claves con prefijo "assets/" que COINCIDEN EXACTAMENTE con las
                   rutas referenciadas en course.json.
    Devuelve (ruta_del_scormproj, lista_de_huerfanos).
    """
    # Preflight §9: no se empaqueta un curso que el editor marcará en rojo.
    problems = validate_course(course)
    for p in problems: print(p)
    errores = [p for p in problems if p.startswith("ERROR")]
    if errores:
        raise ValueError(f"{len(errores)} errores de contrato (§9): corrige el course y reintenta.")

    blob = json.dumps(course, ensure_ascii=False)
    # Solo cadenas JSON que son una RUTA DE FICHERO completa (sin espacios y con
    # extensión): así una editor_note como "assets/img/p8.png: subir la figura"
    # NO se confunde con un binario que falta (produciría un falso faltante).
    referenced = set(re.findall(r'"(assets/[^"\s]+\.[A-Za-z0-9]+)"', blob))

    # Ninguna ruta puede escapar del paquete (zip-slip): sin «..», sin ruta
    # absoluta y sin unidad de disco. Un ZIP con "assets/../../x" reventaría al
    # descomprimirse fuera de destino.
    unsafe = sorted(p for p in referenced
                    if ".." in p.split("/") or p.startswith("/") or ":" in p)
    if unsafe:
        raise ValueError(
            "Rutas de asset inseguras en course.json (fuera del paquete):\n  - "
            + "\n  - ".join(unsafe)
        )

    # Toda ruta referenciada debe tener su binario (regla 3: sin rutas rotas).
    missing = sorted(referenced - set(asset_files))
    if missing:
        raise ValueError(
            "Faltan binarios para rutas referenciadas en course.json:\n  - "
            + "\n  - ".join(missing)
            + "\nIncluye el fichero o cambia la pantalla a kind:'none'."
        )

    # Assets incluidos pero NO referenciados: no rompen, pero conviene revisarlos.
    orphans = sorted(set(asset_files) - referenced)

    # El nombre del archivo sale de course.id: saneado para que no pueda escapar
    # del out_dir (course.id="../../evil" escribiría dos carpetas por encima).
    raw_id = (course.get("course") or {}).get("id") or "curso"
    course_id = re.sub(r"[^a-z0-9._-]", "-", str(raw_id).lower()).strip(".-") or "curso"
    out_path = os.path.join(out_dir, f"{course_id}.scormproj")
    # STORE (sin comprimir), igual que la app: el reempaquetado es instantáneo y
    # los media ya vienen comprimidos. (DEFLATE también lo abriría sin problema.)
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_STORED) as z:
        z.writestr("course.json", json.dumps(course, ensure_ascii=False, indent=2))
        for path, data in asset_files.items():
            z.writestr(path, data)
    return out_path, orphans


def extract_pdf_images(pdf_path):
    """Extrae las imágenes incrustadas de un PDF. Devuelve
    [(pagina_1based, ext, bytes), ...]. Requiere PyMuPDF (import fitz)."""
    import fitz
    doc = fitz.open(pdf_path)
    out = []
    for pno in range(len(doc)):
        for img in doc.get_page_images(pno):
            base = doc.extract_image(img[0])
            out.append((pno + 1, base["ext"], base["image"]))
    return out


def extract_text_markdown(pdf_path, pages=None):
    """Extrae el texto de un PDF CONSERVANDO la negrita como markdown `**...**` y
    los ENLACES como `[texto](url)`. NO uses get_text('text'): pierde la negrita.
    Aquí se usa get_text('dict'), donde cada 'span' trae 'flags' y 'font': el bit 4
    (16) de flags y/o un nombre de fuente con 'Bold'/'Black'/'Semibold' indican
    negrita. Los enlaces de un PDF son ANOTACIONES (page.get_links()), no texto:
    get_text no los devuelve, hay que cruzar el rectángulo de cada anotación con los
    spans (si no, se pierden). Devuelve texto plano con markdown ligero, listo para
    segmentar en pantallas (Regla Nº1). Requiere PyMuPDF."""
    import fitz
    doc = fitz.open(pdf_path)
    nums = range(len(doc)) if pages is None else pages
    out = []
    for pno in nums:
        page = doc[pno]
        links = [(fitz.Rect(l["from"]), l["uri"]) for l in page.get_links()
                 if str(l.get("uri", "")).startswith(("http://", "https://", "mailto:"))]

        def span_uri(span):
            b = fitz.Rect(span["bbox"])
            center = fitz.Point((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)
            for rect, uri in links:
                if rect.contains(center):
                    return uri
            return None

        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                buf, open_b, open_uri = "", False, None
                for span in line["spans"]:
                    t = span["text"]
                    bold = bool(span["flags"] & 16) or any(
                        k in span["font"] for k in ("Bold", "Black", "Semibold"))
                    uri = span_uri(span)
                    if t.strip() and uri != open_uri:  # abre/cierra [texto](url)
                        if open_b:
                            buf += "**"; open_b = False
                        if open_uri:
                            buf += "](%s)" % open_uri
                        if uri:
                            buf += "["
                        open_uri = uri
                    if t.strip() and bold != open_b:   # abre/cierra ** en la transición
                        buf += "**"
                        open_b = bold
                    buf += t
                if open_b:
                    buf += "**"
                if open_uri:                            # cierra el enlace a fin de línea
                    buf += "](%s)" % open_uri
                out.append(buf)
            out.append("")                              # línea en blanco entre bloques
    return "\n".join(out)
```

Uso típico:

```python
# 1) course = { "schema_version": "1.1.0", "course": {...}, ... }  (§1–§10)
# 2) Elegir, de las imágenes extraídas, las que se usan y asignarles ruta+alt:
asset_files = {
    "assets/img/s06.png": img_bytes_de_la_figura_pagina_8,
    # ...
}
# 3) Las rutas de asset_files deben aparecer tal cual en course.json (visual_resource.src, etc.)
path, orphans = build_scormproj(course, asset_files)
print("Generado:", path, "| huérfanos:", orphans)
```

Devuelve al usuario **el enlace de descarga del `.scormproj`** y, si los hubo,
menciona los assets huérfanos o las imágenes que dejaste como `kind:"none"`.
```
