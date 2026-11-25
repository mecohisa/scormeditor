# Ejemplo dorado de `course.json` (SCORMEditor)

Ejemplo **completo y válido** que cumple `contrato-course-json.md`. Úsalo como
plantilla de la **forma exacta** (claves, anidación, shape de cada interacción).
**No copies el contenido**, solo la estructura. El `course.json` final va dentro del
`.scormproj` (ver §11 del contrato); las imágenes referenciadas (`assets/img/…`)
deben existir como ficheros reales en el ZIP.

Fíjate en los **objetivos**: son un conjunto pequeño y su texto se repite **idéntico**
allí donde aparece (en `objective` de las pantallas que lo desarrollan y de las
actividades que lo evalúan; la interacción de una pantalla no lleva objetivo propio,
evalúa el `objective` de esa pantalla). En un curso real, varias pantallas de
desarrollo compartirán el mismo `objective`.

```json
{
  "schema_version": "1.1.0",
  "course": {
    "id": "ejemplo-u01-t01",
    "title": "Tema 1. Atención centrada en la persona",
    "subtitle": "SCO independiente del Tema 1",
    "description": "Tema introductorio. Material preparado para revisión por la entidad.",
    "authoring_entity": "MECOHISA S.L.",
    "source_document": "Curso ACP T.1.pdf",
    "estimated_hours": 0.75,
    "language": "es"
  },
  "scorm": {
    "version": "1.2",
    "identifier": "EJEMPLO_U01_T01",
    "title": "Tema 1 - ACP",
    "mastery_score": 50,
    "rules": {
      "completion_mode": "screens",
      "min_required_screens_pct": 100,
      "require_interactions": true,
      "min_score": 50,
      "attempts_allowed": 2,
      "score_source": "unit_tests",
      "navigation": "mixed",
      "allow_resume": true,
      "auto_return": true
    }
  },
  "shell": {
    "brand": "",
    "primary_color": "#0b5fff",
    "accent_color": "#6DC3C0",
    "show_sidebar": true,
    "show_progress": true,
    "language": "es"
  },
  "intro_screens": [
    {
      "id": "s00",
      "type": "cover",
      "title": "Tema 1. Atención centrada en la persona",
      "required": true,
      "status": "ok"
    }
  ],
  "modules": [
    {
      "id": "m1",
      "title": "Fundamentos de la atención centrada en la persona",
      "units": [
        {
          "id": "u1",
          "title": "Tema 1. Atención centrada en la persona",
          "summary": "Qué es la ACP, sus principios y cómo se traduce en la práctica diaria.",
          "status": "ok",
          "screens": [
            {
              "id": "s01",
              "type": "cover",
              "title": "Tema 1. Atención centrada en la persona",
              "required": true,
              "status": "ok"
            },
            {
              "id": "s02",
              "type": "objectives",
              "title": "Objetivos del tema",
              "objective": "Definir la atención centrada en la persona.",
              "student_text": "Al terminar este tema serás capaz de:\n- Definir la atención centrada en la persona (ACP).\n- Reconocer sus principios.\n- Aplicarlos a una situación cotidiana del centro.",
              "required": true,
              "status": "ok",
              "review": { "flagged": true, "note": "Objetivos redactados por la IA (el documento no los trae): comprobar que encajan con la ficha del curso." }
            },
            {
              "id": "s03",
              "type": "route",
              "title": "Recorrido del tema",
              "objective": "Definir la atención centrada en la persona.",
              "student_text": "Empezaremos por la definición de la ACP, seguiremos con los principios que la sostienen y terminaremos aplicándolos a una decisión del día a día con una persona usuaria.",
              "required": true,
              "status": "ok"
            },
            {
              "id": "s04",
              "type": "content",
              "title": "1.1. La atención centrada en la persona",
              "objective": "Definir la atención centrada en la persona.",
              "student_text": "La **atención centrada en la persona** es un enfoque que organiza los apoyos partiendo de la persona: sus preferencias, valores, historia y proyecto de vida. Frente a los modelos centrados en el servicio, en los que la rutina marca qué se hace y cuándo, la ACP ajusta cada apoyo a quien lo recibe.\n\n**La ACP adapta el apoyo a la persona, y no al revés.**",
              "source_refs": [
                { "doc": "Curso ACP T.1.pdf", "locator": "p.5" }
              ],
              "visual_resource": {
                "kind": "image",
                "src": "assets/img/u01_t01_modelo_acp.png",
                "alt": "Diagrama con la persona en el centro rodeada de sus apoyos.",
                "caption": "",
                "poster": "",
                "tracks": [],
                "has_voice": false,
                "layout": "bottom",
                "media_align": "center"
              },
              "required": true,
              "min_time_seconds": 0,
              "transcript": "La atención centrada en la persona es un enfoque que organiza los apoyos partiendo de la persona: sus preferencias, valores, historia y proyecto de vida. Frente a los modelos centrados en el servicio, en los que la rutina marca qué se hace y cuándo, la ACP ajusta cada apoyo a quien lo recibe. La ACP adapta el apoyo a la persona, y no al revés.",
              "accessibility": { "alt_text_ok": true, "keyboard_ok": true, "contrast_ok": true },
              "scorm": { "counts_for_completion": true },
              "editor_notes": [],
              "status": "ok"
            },
            {
              "id": "s05",
              "type": "content",
              "title": "Actividad: Definición de la ACP",
              "objective": "Definir la atención centrada en la persona.",
              "student_text": "Tener clara la definición ayuda a reconocer cuándo una práctica del centro pone a la persona en el centro y cuándo responde solo a la rutina. **Lee la pregunta y elige la opción que mejor resume el enfoque.**",
              "interaction": {
                "id": "s05_i01",
                "type": "single_choice",
                "prompt": "¿Qué pone la ACP en el centro de la organización de los apoyos?",
                "instructions": "",
                "options": [
                  { "id": "a", "text": "La rutina del servicio.", "correct": false, "feedback": "La rutina es del servicio, no de la persona." },
                  { "id": "b", "text": "Las preferencias y el proyecto de vida de la persona.", "correct": true, "feedback": "Correcto: ese es el eje de la ACP." }
                ],
                "config": {},
                "feedback": { "correct": "Correcto: la ACP organiza los apoyos desde la persona, no desde la rutina del servicio.", "incorrect": "Revisa la definición de ACP.", "explanation": "La ACP parte de la persona, no del servicio." },
                "scored": true,
                "points": 1,
                "attempts": 3,
                "source_refs": [ { "doc": "Curso ACP T.1.pdf", "locator": "p.5" } ]
              },
              "required": true,
              "min_time_seconds": 0,
              "accessibility": { "alt_text_ok": true, "keyboard_ok": true, "contrast_ok": true },
              "scorm": { "counts_for_completion": true },
              "status": "ok"
            },
            {
              "id": "s06",
              "type": "content",
              "title": "1.2. Principios de la ACP",
              "objective": "Reconocer los principios de la ACP.",
              "student_text": "La ACP se apoya en tres principios que orientan las decisiones de cada día en el centro. **Pulsa cada principio para leer en qué consiste.**",
              "interaction": {
                "id": "s06_i01",
                "type": "accordion",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": { "items": [
                  { "title": "Autonomía", "body": "La persona decide sobre su vida en la medida de sus capacidades, y el equipo respeta esas decisiones." },
                  { "title": "Individualización", "body": "Cada apoyo se ajusta a la persona concreta: a su historia, a sus gustos y a su manera de hacer las cosas." },
                  { "title": "Participación", "body": "La persona y su entorno participan en las decisiones que les afectan, desde el plan de apoyos hasta la rutina diaria." }
                ] },
                "feedback": { "correct": "", "incorrect": "", "explanation": "" },
                "scored": false,
                "points": 0,
                "source_refs": [ { "doc": "Curso ACP T.1.pdf", "locator": "p.7" } ]
              },
              "required": true,
              "transcript": "Los principios fundamentales de la ACP son la autonomía, la individualización y la participación. La autonomía implica que la persona decide sobre su vida en la medida de sus capacidades, y el equipo respeta esas decisiones; la individualización, ajustar cada apoyo a la persona concreta; la participación, incluir a la persona y su entorno en las decisiones que les afectan.",
              "accessibility": { "alt_text_ok": true, "keyboard_ok": true, "contrast_ok": true },
              "scorm": { "counts_for_completion": true },
              "status": "ok"
            },
            {
              "id": "s07",
              "type": "content",
              "title": "Actividad: Los principios en la práctica",
              "objective": "Reconocer los principios de la ACP.",
              "student_text": "Los principios se reconocen en gestos concretos del día a día. Algunas de estas actuaciones los respetan y otras no. **Toca cada actuación y después el grupo al que pertenece (o arrástrala); cuando termines, pulsa Comprobar.**",
              "interaction": {
                "id": "s07_i01",
                "type": "classification",
                "prompt": "¿Respeta cada actuación los principios de la ACP?",
                "instructions": "",
                "config": { "groups": [ { "id": "ok", "label": "Correcto" }, { "id": "ko", "label": "Incorrecto" } ] },
                "options": [
                  { "id": "o1", "text": "Preguntar a la persona cómo prefiere organizar su mañana.", "group": "ok" },
                  { "id": "o2", "text": "Contar con la familia al revisar el plan de apoyos.", "group": "ok" },
                  { "id": "o3", "text": "Fijar el mismo horario de aseo para todas las personas usuarias.", "group": "ko" },
                  { "id": "o4", "text": "Decidir por la persona para ir más rápido.", "group": "ko" }
                ],
                "feedback": { "correct": "Correcto: has distinguido las actuaciones que respetan la autonomía, la individualización y la participación.", "incorrect": "Revisa qué actuaciones parten de la persona y cuáles de la rutina del servicio.", "explanation": "Preguntar y contar con la familia aplican la autonomía y la participación; uniformar horarios o decidir por la persona los contradicen." },
                "scored": true,
                "points": 1,
                "attempts": 3,
                "source_refs": [ { "doc": "Curso ACP T.1.pdf", "locator": "p.7" } ]
              },
              "required": true,
              "accessibility": { "alt_text_ok": true, "keyboard_ok": true, "contrast_ok": true },
              "scorm": { "counts_for_completion": true },
              "status": "ok",
              "review": { "flagged": true, "note": "Actividad redactada por la IA: comprobar que las cuatro actuaciones son realistas en el centro." }
            },
            {
              "id": "s08",
              "type": "content",
              "title": "Actividad: El horario de la ducha",
              "objective": "Aplicar la ACP a una decisión cotidiana.",
              "student_text": "Las decisiones pequeñas son las que más dicen de un servicio. La situación es ficticia, pero habitual en cualquier centro. **Lee lo que ocurre y decide cómo actuarías.**",
              "interaction": {
                "id": "s08_i01",
                "type": "scenario_decision",
                "prompt": "¿Qué harías?",
                "instructions": "",
                "config": { "scenario": "Eres gerocultora en el turno de mañana. Una persona usuaria te dice que prefiere ducharse por la tarde, pero el horario del centro fija la ducha por la mañana." },
                "options": [
                  { "id": "a", "text": "Mantener la rutina del centro.", "correct": false, "feedback": "Eso prioriza el servicio sobre la persona." },
                  { "id": "b", "text": "Ajustar el horario del apoyo a su preferencia.", "correct": true, "feedback": "Correcto: el apoyo se adapta a la persona." }
                ],
                "feedback": { "correct": "Bien razonado.", "incorrect": "Recuerda el principio de individualización.", "explanation": "La ACP adapta el apoyo a la preferencia de la persona siempre que sea viable y seguro." },
                "scored": true,
                "points": 1,
                "source_refs": [ { "doc": "Curso ACP T.1.pdf", "locator": "p.9" } ]
              },
              "required": true,
              "transcript": "Ante un conflicto entre la rutina del servicio y la preferencia de la persona, la ACP busca soluciones que respeten la preferencia siempre que sean viables y seguras.",
              "accessibility": { "alt_text_ok": true, "keyboard_ok": true, "contrast_ok": true },
              "scorm": { "counts_for_completion": true },
              "status": "ok"
            },
            {
              "id": "s09",
              "type": "content",
              "title": "Actividad: Repaso del tema",
              "objective": "Reconocer los principios de la ACP.",
              "student_text": "Antes de cerrar el tema, conviene comprobar que las ideas principales se han asentado. **Lee cada tarjeta, piensa la respuesta y pulsa «Mostrar respuesta» para comprobarla.**",
              "interaction": {
                "id": "s09_i01",
                "type": "flashcards",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": { "cards": [
                  { "front": "¿Qué pone la ACP en el centro?", "back": "Las preferencias, valores y proyecto de vida de la persona." },
                  { "front": "Principio de autonomía", "back": "La persona decide sobre su vida en la medida de sus capacidades." },
                  { "front": "Principio de individualización", "back": "Cada apoyo se ajusta a la persona concreta." }
                ] },
                "feedback": { "correct": "", "incorrect": "", "explanation": "" },
                "scored": false,
                "points": 0,
                "source_refs": [ { "doc": "Curso ACP T.1.pdf", "locator": "p.5-9" } ]
              },
              "required": true,
              "status": "ok"
            },
            {
              "id": "s10",
              "type": "summary",
              "title": "Síntesis del tema",
              "student_text": "La ACP organiza los apoyos desde la persona y no desde la rutina del servicio. Sus principios, autonomía, individualización y participación, se aplican en las decisiones cotidianas del centro.\n\n**Cada apoyo empieza por preguntar a la persona.**",
              "required": true,
              "status": "ok"
            }
          ]
        }
      ]
    }
  ],
  "assessments": {
    "unit_tests": [],
    "final_test": null
  },
  "glossary": [
    { "term": "Atención centrada en la persona", "definition": "Enfoque que organiza los apoyos desde las preferencias y el proyecto de vida de la persona.", "source_refs": [ { "doc": "Curso ACP T.1.pdf", "locator": "p.5" } ] }
  ],
  "bibliography": [
    { "ref": "Rodríguez, P. (2013). La atención integral y centrada en la persona.", "url": "" }
  ],
  "quality_checklist": {
    "Objetivo del tema definido": true,
    "Contenido trazado a fuente": true,
    "Imágenes con texto alternativo": true,
    "Actividades con feedback": true
  }
}
```

## Notas de uso
- **`intro_screens` (s00) es la portada de TODO el paquete**, separada del
  módulo — por eso `modules[0].title` («Fundamentos de la atención centrada en
  la persona») **no repite** el título del curso/tema («Tema 1. Atención
  centrada en la persona»): esa presentación ya la hace la portada de
  `intro_screens`. Dale al módulo su propio nombre descriptivo.
- **Reglas SCORM por defecto**: el test final y los foros van en Moodle, así que
  `final_test` es `null`, `score_source` es `"unit_tests"` (la nota informativa sale de
  las actividades evaluables de las pantallas, s05, s07 y s08), `completion_mode:
  "screens"`, `min_score: 50` y `auto_return: true`. Ni la hoja de ruta (s03) ni la
  síntesis (s10) anuncian un test ni dan una duración.
- **Títulos**: las pantallas que salen de un epígrafe del documento llevan el
  epígrafe literal con su número (s04 «1.1. …», s06 «1.2. …»); las demás, nominales
  («Objetivos del tema», «Recorrido del tema»), y toda actividad, «Actividad: …»
  (s05, s07, s08, s09). El cierre es «Síntesis del tema».
- Fíjate en **s04→s05**: la teoría (con su imagen **debajo** del texto,
  `layout: "bottom"`) y la pregunta van en pantallas **separadas**, y la actividad va
  **después** de lo que evalúa. Una evaluable nunca comparte pantalla con teoría.
- **Introducción de cada actividad** (s05, s07, s08, s09): 2-3 frases de contexto y
  para qué, con la **instrucción de acción al final en negrita**. En la clasificación
  (s07) la instrucción explica también cómo se responde en el móvil, y los dos grupos
  de una clasificación «sí/no» se llaman «Correcto»/«Incorrecto».
- **`attempts: 3`** en las evaluables con Comprobar (s05, s07). `scenario_decision`
  (s08) no usa intentos. `retries` está en desuso: no lo emitas.
- **Marcas de revisión** (s02, s07): lo que no sale del documento va con `review` y
  una nota concreta. Esas pantallas se ven en la Vista estudiante pero no se exportan
  hasta que el equipo las desmarca (el editor muestra el aviso `REVIEW_PENDING`, que
  es el esperado).
- **Cierre** (s09-s10): repaso con `flashcards` (o `az_quiz`) y la «Síntesis del
  tema» con su idea-fuerza en negrita. La sopa de letras y el crucigrama solo cuando
  hay vocabulario técnico que fijar.
- Una unidad real suele tener **más pantallas de desarrollo** e interacciones
  variadas: alterna las informativas (`accordion`/`tabs`/`flip_cards`/`timeline`, solo
  para listas cortas: un apartado con párrafo o imagen propios va en su pantalla) y el
  repertorio evaluable (`single_choice`, `true_false`, `fill_blanks`,
  `classification`, `scenario_decision`, `scenario_steps`, `decision_tree`,
  `case_practice`, `calculator` si el contenido trae un cálculo y, con moderación,
  `match_pairs`) sin repetir tipo dos veces seguidas.
- **Marca (`shell.brand: ""`)**: vacía por defecto (la cabecera muestra solo el
  título). `authoring_entity` sí lleva la entidad (MECOHISA S.L.) porque es
  metadato de autoría, no la marca visible. Rellena `brand` solo si se pide.
- **No generes** `hotspots`, `before_after`, `hidden_image`, `puzzle`, `video`
  (vídeo interactivo) ni `html_embed`: los añade el editor humano desde SCORMEditor.
- Mantén **una sola interacción por pantalla**; no le añadas `learning_objective`, ese
  campo solo existe en las preguntas de test.
- Si una pantalla referencia una imagen pero no tienes el binario, pon
  `visual_resource.kind = "none"` y anótalo en `editor_notes`.
- Para las formas concretas de `classification`, `match_pairs`, `flip_cards`, `tabs`,
  `timeline`, `az_quiz`, `scenario_steps`, `decision_tree` y `calculator` (y de
  `fill_blanks` con respuesta escrita), consulta §6 del contrato; para los bloques
  `::: stats`/`::: compare`/`::: dodont`, §4.1.
