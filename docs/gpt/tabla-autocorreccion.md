# Tabla de autocorrección (informe de validación → corrección)

Instrucciones para la herramienta/GPT cuando el usuario pega un **informe de
validación de SCORMEditor**: líneas con la forma
`- ⛔ [CODIGO] mensaje — ubicación` (⛔ error · ⚠ aviso · ℹ informativo), que el
editor genera con el botón «Copiar informe» de la pestaña Validación o exporta en el
informe de revisión.

## Protocolo

1. **LEE este documento** con Code Interpreter (no trabajes de memoria).
2. Recorre el informe línea a línea: busca cada `[CODIGO]` en la tabla y aplica su
   **corrección canónica** sobre el `course.json` del proyecto. La `ubicación`
   (módulo › unidad › «pantalla») te dice dónde. Si no tienes el proyecto en la
   sesión, pide el `.scormproj`.
3. **Respeta la columna «Quién»**: lo marcado **Editor** es trabajo del editor humano
   en SCORMEditor — **no lo toques ni inventes contenido o rutas `assets/` para
   «resolverlo»**. En **Según**, lee el criterio de la corrección.
4. Corrige **solo lo señalado** (no reescribas nada más: Regla Nº1), reempaqueta el
   `.scormproj` (contrato §11, sin rutas rotas) y entrega el enlace.
5. Cierra con dos listas: **qué corregiste** (código → pantalla) y **qué queda para
   el editor humano**.
6. Un código que no esté en esta tabla: guíate por el mensaje del aviso y el
   contrato (`contrato-course-json.md`, que manda en caso de conflicto).

## Pantallas y contenido

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `NO_TITLE` | ⛔ | Pantalla con `title` vacío | Ponle un título corto (2-6 palabras) descriptivo del contenido | GPT |
| `ID_DUPLICATE` | ⛔ | Dos entidades (pantalla, interacción, módulo, unidad, test o pregunta) comparten `id` | Renombra una a un `id` único: el runtime guarda el progreso y la nota por `id`, y un duplicado los corrompe | GPT |
| `NO_OBJECTIVE` | ⚠ | Pantalla (no `cover`/`summary`/`guide`) sin `objective` | Copia **carácter a carácter** el objetivo declarado del curso que la pantalla desarrolla (no inventes uno nuevo) | GPT |
| `SKELETON` | ⚠ | Pantalla `content_placeholder` o `status` esqueleto | Solo si el usuario pide desarrollarla: complétala desde el texto fuente. Si es un esqueleto deliberado, no tocar | Según |
| `CALLOUT_EMPTY` | ⚠ | Emitiste `::: tipo` sin cuerpo, o con la etiqueta («Importante») como cuerpo | El cuerpo es la **frase destacada del original**; si no hay texto real para la caja, elimina el callout | GPT |
| `COVER_INTERACTION` | ⚠ | Pusiste una interacción en la portada (`cover`) | Muévela a una pantalla propia después de la portada; la portada queda solo con título/subtítulo | GPT |
| `VIDEO_NO_MEDIA` | ⚠ | Pantalla `type:"video"` sin recurso de vídeo | Añade el `visual_resource` (`video_youtube` con el ID del fuente) o, si no hay vídeo, cambia `type` a `content` | GPT |
| `QUIZ_NO_SCORED` | ⚠ | Pantalla `unit_quiz` sin interacción evaluable | Añade la interacción `scored:true` o cambia el `type` de la pantalla | GPT |
| `FORUM_SCORED` | ⚠ | `forum_prompt` con interacción puntuable | Pon `scored:false`: el foro es actividad externa del campus, no puntúa en el SCORM | GPT |

## Unidades y curso

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `UNIT_SKELETON` | ⚠ | Unidad marcada como esqueleto | Como `SKELETON`: desarrollar solo si el usuario lo pide | Según |
| `UNIT_NO_SUMMARY` | ⚠ | Unidad sin `summary` ni pantalla `summary` | Redacta el `summary` a partir del cierre del tema en el texto fuente | GPT |
| `UNIT_NO_ACTIVITY` | ⚠ | Unidad sin ninguna interacción ni test | Añade checkpoints evaluables según el ritmo de la guía (cada 4-5 pantallas) | GPT |
| `EDITOR_NOTE` | ℹ | Nota editorial — es el **canal previsto** para dejar tareas al humano | No es un defecto: no corregir. Solo actúa si el usuario aporta el material que la nota pide | Editor |
| `REVIEW_PENDING` | ⚠ | Hay pantallas marcadas «pendiente de revisión» (`screen.review.flagged`): no se incluirán en el SCORM exportado | Esperado en lo que el GPT marca a propósito (contenido que no sale de la fuente, actualizaciones, lo dudoso): **no quites la marca** para silenciar el aviso. Comprueba solo que cada marca lleva una `note` concreta de qué revisar. La desmarca el equipo tras revisar | Editor |
| `GLOSSARY_EMPTY` | ⚠ | `glossary` vacío | Extrae términos y definiciones del texto fuente (`{term, definition, source_refs}`) | GPT |
| `BIBLIO_EMPTY` | ⚠ | `bibliography` vacía | Vuelca las referencias del fuente: una entrada por referencia, formato homogéneo (`Autor/Entidad (año). Título. Fuente.`) | GPT |
| `ATTACHMENT_NOT_PDF` | ✖ | Un documento de `attachments` no apunta a un PDF del proyecto (`assets/…pdf`) | No generes `attachments`: los PDF los adjunta el autor en el editor (Materiales → Documentos) | Editor |
| `ATTACHMENT_NO_TITLE` | ⚠ | Documento adjunto sin título | Lo pone el autor en el editor | Editor |
| `ATTACHMENT_TOO_BIG` | ✖ | Documento adjunto de más de 10 MB | El autor lo reduce o lo enlaza desde `bibliography` | Editor |
| `ATTACHMENTS_TOO_MANY` | ✖ | Más de 10 documentos adjuntos | El autor quita los menos necesarios o los enlaza desde `bibliography` | Editor |
| `ATTACHMENTS_HEAVY` | ⚠ | Los documentos adjuntos suman más de 25 MB | El autor reduce los PDF o enlaza los más pesados | Editor |

## Accesibilidad y medios

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `IMG_NO_ALT` | ⛔ | Imagen sin texto alternativo (en `visual_resource`, `image_cards`, `before_after`, `hidden_image` o `puzzle`) | Si la imagen la incluiste tú: redacta un `alt` que describa lo que muestra. Si la subió el editor humano (no puedes verla): déjala y díselo — **no inventes** qué muestra | Según |
| `VIDEO_NO_TRANSCRIPT` | ⛔ | Vídeo sin `transcript` (salvo `transcript_hidden: true`) | Si el fuente da la información, redáctala; si no, deja `editor_note` pidiéndola | Según |
| `AUDIO_NO_TRANSCRIPT` | ⛔ | Pantalla con locución (`audio_src`) sin `transcript` (salvo `transcript_hidden: true`) | Duplica el contenido de la pantalla en `transcript` (Regla Nº1: el texto ya existe) | GPT |
| `TRANSCRIPT_HIDDEN_AUDIO` | ⚠ | Pantalla con locución (`audio_src`) y `transcript_hidden: true` | No pongas `transcript_hidden` (es decisión del editor humano); si ya estaba, déjalo | Editor |
| `MEDIA_NO_SUBS` | ⛔ | Medio con `has_voice:true` sin `tracks` VTT | Si no tienes el VTT no marques `has_voice:true`; el fichero de subtítulos lo aporta el editor humano (deja `editor_note`) | Según |
| `NARR_NO_TRANSCRIPT` | ⚠ | Curso narrado y pantalla sin `transcript` (salvo vídeo con voz o `transcript_hidden`) | Duplica el contenido de la pantalla en `transcript` (es la entrada del TTS) | GPT |
| `NARR_NO_AUDIO` | ℹ | Hay transcripción pero falta el audio de locución (no aplica a pantallas con vídeo con voz, `has_voice`, ni con `transcript_hidden`) | Pendiente del TTS: lo genera el editor humano en SCORMEditor. **No tocar** | Editor |
| `NARR_ITEM_NO_AUDIO` | ℹ | Curso narrado: un ítem de accordion/tabs/flip_cards/timeline/image_cards/flashcards tiene texto pero no audio propio | Estos tipos ocultan su contenido tras el revelado y se narran por ítem (no en el audio de pantalla): pendiente del TTS por ítem, lo genera el editor humano en SCORMEditor. **No tocar** | Editor |
| `NARR_TRANSCRIPT_STALE` | ℹ | Curso narrado: el contenido de la pantalla cambió después de escribir/regenerar `transcript` (huella interna del editor desincronizada) | No aplica al GPT: la huella (`transcript_content_hash`) no se redacta a mano, la gestiona SCORMEditor solo. **No tocar** | Editor |
| `NARR_AUDIO_STALE` | ℹ | Curso narrado: `transcript` cambió después de generar `audio_src` (huella interna del editor desincronizada) | No aplica al GPT: la huella (`audio_transcript_hash`) no se redacta a mano, la gestiona SCORMEditor solo. **No tocar** | Editor |

## Interacciones y preguntas

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `Q_NO_PROMPT` | ⛔ | Pregunta sin enunciado | Redáctalo a partir del contenido que evalúa | GPT |
| `Q_NO_CORRECT` | ⛔ | Ninguna opción con `correct:true` (o, en `classification`/`match_pairs`, opciones sin `group`) | Marca la correcta; en clasificación, asigna a cada `option` su `group` | GPT |
| `Q_NO_FEEDBACK` | ⛔ | `feedback.correct` e `incorrect` vacíos | Escribe ambos, pedagógicos: por qué es correcta / qué repasar. Nunca un «¡Bien!» vacío | GPT |
| `FB_NO_BLANKS` | ⛔ | `fill_blanks` sin ningún hueco en `config.text` | Marca cada respuesta correcta entre dobles corchetes `[[respuesta]]` (en `mode:"type"`, alternativas válidas con `[[a\|b]]`) | GPT |
| `TL_EMPTY` | ⛔ | `timeline` sin hitos | Añade `config.milestones` (`label`/`title`/`body`) con el contenido del fuente, o cambia el tipo | GPT |
| `CP_NO_RUBRIC` | ⚠ | `case_practice` sin rúbrica | Añade `config.rubric` con criterios de autoevaluación verificables | GPT |
| `FC_EMPTY` | ⛔ | `flashcards` sin tarjetas | Añade `config.cards` (`front`/`back`) con conceptos del tema, o elimina la interacción | GPT |
| `FC_SCORED` | ⚠ | `flashcards` con `scored:true` | Pon `scored:false`: es autoevaluación de repaso | GPT |
| `IC_EMPTY` | ⛔ | `image_cards` sin tarjetas | Añade las `cards` (`alt`, `title`, `text`); `image` vacío + `editor_note` describiendo cada imagen | GPT |
| `IC_NO_IMAGE` | ⛔ | Tarjeta de imagen sin `image` | **Esperado** si generaste el tipo: las imágenes las sube el editor humano. **No inventes rutas `assets/`** | Editor |
| `IC_NO_TITLE` | ⛔ | `image_cards` con `show_cover_image:false` y una tarjeta sin `title` | Pon un `title` breve en cada tarjeta: es lo único que se ve en su portada | GPT |

## Prácticas de varios pasos (caso por decisiones, conversación, reto numérico)

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `SS_EMPTY` | ⛔ | `scenario_steps` sin ningún paso en `config.steps` | Añade las decisiones del caso (2-5 pasos encadenados, cada uno con su situación y opciones), o cámbialo a `scenario_decision` si el caso solo tiene una decisión | GPT |
| `SS_STEP_NO_TEXT` | ⛔ | Un paso del caso sin `text` | Escribe la situación de ese momento y la pregunta («¿Qué haces?») a partir del fuente | GPT |
| `SS_STEP_FEW_OPTIONS` | ⛔ | Un paso con menos de 2 opciones | Añade opciones plausibles hasta tener 2-4, con una sola claramente mejor | GPT |
| `SS_STEP_NO_CORRECT` | ⛔ | Ningún `correct:true` en las opciones de un paso | Marca la opción que el fuente respalda como buena práctica | GPT |
| `SS_NO_FEEDBACK` | ⚠ | Opciones de un paso sin `feedback` propio | Escribe el comentario de **cada** opción (por qué es adecuada o qué consecuencia tiene): es lo que el alumno lee antes de seguir | GPT |
| `DT_EMPTY` | ⛔ | `decision_tree` sin `nodes` | Monta la conversación (4-8 momentos, 2-3 respuestas por momento, finales con `outcome`) o elimina la interacción | GPT |
| `DT_NO_TEXT` | ⛔ | Un momento con respuestas pero sin `text` (lo que dice el personaje) | Redacta la intervención del personaje en ese momento | GPT |
| `DT_CHOICE_NO_TEXT` | ⛔ | Una respuesta (`choices[]`) sin `text` | Escribe lo que diría el alumno, o elimina la respuesta | GPT |
| `DT_DANGLING` | ⛔ | Una respuesta cuyo `to` no es el `id` de ningún momento | Apunta `to` a un momento existente, o crea el momento al que debe llevar | GPT |
| `DT_START_END` | ⛔ | El primer nodo de `nodes` no tiene respuestas: la conversación acaba antes de empezar | Pon primero el momento de arranque (con `choices`); los finales, sin respuestas, van después | GPT |
| `DT_CYCLE` | ⛔ | Una respuesta vuelve a un momento anterior del mismo camino | Rompe el bucle: en vez de volver atrás, crea un momento nuevo (p. ej. «reformula») que siga hacia un final | GPT |
| `DT_NO_GOOD_END` | ⛔ | Puntúa (`scored:true`) y ningún final alcanzable tiene `outcome:"good"` | Marca `outcome:"good"` en el final que corresponde a la buena práctica (y que algún camino llegue a él), o pon `scored:false` | GPT |
| `DT_UNREACHABLE` | ⚠ | Hay momentos a los que no lleva ningún camino desde el inicio | Enlázalos desde una respuesta (`to`) o elimínalos | GPT |
| `DT_SPEAKER_MISSING` | ⚠ | Un `speaker` que no es el `id` de ningún personaje de `characters` | Corrige el `speaker` o añade el personaje (`id`, `name`, `role`) | GPT |
| `CALC_EMPTY` | ⛔ | `calculator` sin `config.results` | Añade el resultado que se pide calcular (con su `formula`), o elimina la interacción si el contenido no pide un cálculo | GPT |
| `CALC_BAD_ID` | ⛔ | Un `id` de dato o resultado no válido (tildes, ñ, espacios, empieza por número, es `round`/`min`/`max`/`abs`/`sqrt`/`floor`/`ceil`) o repetido | Renómbralo a `^[A-Za-z_][A-Za-z0-9_]*$`, único entre datos y resultados (`ano`, `dosis_kg`…), y actualiza las fórmulas que lo usan | GPT |
| `CALC_NO_VALUE` | ⛔ | Modo `challenge` con algún dato sin `value` numérico | Pon el valor del dato (del fuente o de un supuesto coherente): en el reto el curso da todos los datos. Si los datos debe meterlos el alumno, es `mode:"tool"` | GPT |
| `CALC_FORMULA` | ⛔ | Una `formula` no se puede calcular: sintaxis fuera de la gramática (`%`, coma decimal, `×`, texto), nombre desconocido o función inexistente | Reescríbela con `+ - * / ^`, paréntesis, punto decimal, los `id` existentes (y resultados anteriores) y las funciones permitidas; compruébala en Python | GPT |
| `CALC_TOOL_SCORED` | ⚠ | Calculadora libre (`mode:"tool"`) con `scored:true` | Pon `scored:false`: no hay respuesta que corregir | GPT |

## Tipos reservados al editor humano

Si aparecen estos códigos, o bien emitiste un **tipo vetado** (`hotspots`,
`before_after`, `hidden_image`, `puzzle`, `video` interactivo, `html_embed`) — y la
corrección de fondo es **reconvertirlo** a un tipo permitido (equivalencias en el
contrato §6) o dejar `editor_note` — o bien el aviso pertenece al trabajo manual del
editor.

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `EMBED_EMPTY` | ⛔ | `html_embed` sin código | Si lo emitiste tú: elimínalo y deja `editor_note` describiendo el interactivo deseado (escribir código no es tu tarea) | Editor |
| `EMBED_SCORED` | ⚠ | `html_embed` con `scored:true` | Pon `scored:false`: corre aislado en sandbox y no puede puntuar | GPT |
| `EMBED_NO_COMPLETE` | ⛔ | `html_embed` con `config.require_completion:true` pero su código no llama a `MeEmbed.complete()` | No es tu tarea escribir la llamada dentro del código: si tú activaste `require_completion` por error, quítalo (`false`/omite la clave); si no, avisa al humano de que falta añadir `MeEmbed.complete()` a su JS (contrato «MeEmbed v1», `docs/html-embed-contract.md`) | Editor |
| `EMBED_STATE_MAX` | ⛔ | `html_embed` con `config.state_max` fuera de 0–300 | Ajusta `state_max` al rango 0–300 (0 = no guarda estado) | GPT |
| `EMBED_STATE_MAX_DEFAULT` | ℹ | `html_embed` sin `config.state_max` explícito (usa 100 por defecto) | Informativo: pon `state_max: 0` si el interactivo no guarda estado, o `5 + 2·N` si guarda índices de N elementos — reduce el peor caso del medidor «Memoria» sin arriesgar nada | Según |
| `EMBED_STATE_UNUSED` | ⚠ | `html_embed` con presupuesto de estado (`state_max` > 0, por defecto 100) pero su código no llama a `MeEmbed.saveState()` | Si no vas a guardar estado, pon `state_max: 0` para no reservar memoria sin uso | GPT |
| `BA_NO_IMAGES` | ⛔ | `before_after` sin las dos imágenes | Las imágenes las elige y sube el editor humano. No inventes rutas | Editor |
| `BA_SCORED` | ⚠ | `before_after` con `scored:true` | Pon `scored:false`: es un comparador informativo | GPT |
| `HI_NO_IMAGE` | ⛔ | `hidden_image` sin imagen | La imagen la sube el editor humano | Editor |
| `HI_NO_QUESTIONS` | ⛔ | `hidden_image` sin preguntas | Las preguntas sí puedes completarlas desde el contenido (opción única, ≥2 opciones, una correcta) | Según |
| `HI_Q_NO_PROMPT` / `HI_Q_FEW_OPTIONS` / `HI_Q_NO_CORRECT` | ⛔ | Pregunta de imagen oculta incompleta | Completa enunciado / ≥2 opciones / opción correcta | GPT |
| `PZ_NO_IMAGE` | ⛔ | `puzzle` sin imagen | La imagen la sube el editor humano | Editor |
| `IV_Q_NO_PROMPT` / `IV_Q_FEW_OPTIONS` / `IV_Q_NO_CORRECT` | ⛔ | Pregunta de vídeo interactivo incompleta | Completa enunciado / ≥2 opciones / correcta, si el contenido del vídeo lo permite | Según |
| `IV_YT_BRIDGE` | ℹ | Informativo técnico: el LMS puede bloquear la comunicación con YouTube | Nada que corregir | — |

## Juegos

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `WS_EMPTY` | ⛔ | Sopa de letras sin palabras | Añade 4-10 términos clave del tema (3-12 letras útiles) | GPT |
| `WS_WORD_LONG` | ⛔ | Palabra con más de 12 letras útiles: no cabe en el tablero | Sustitúyela por otro término clave de 3-12 letras (acentos y espacios no cuentan) | GPT |
| `WS_WORD_SHORT` | ⛔ | Palabra con menos de 3 letras útiles | Ídem: otro término de 3-12 letras | GPT |
| `CW_EMPTY` | ⛔ | Crucigrama sin palabras | Añade `entries` (`word` + `clue`) con términos que **compartan letras** | GPT |
| `CW_FEW` | ⚠ | Crucigrama con una sola palabra: sin cruces | Añade más palabras que crucen con la existente | GPT |
| `CW_INCOMPLETE` | ⛔ | Entrada sin palabra o sin pista | Completa `word` y `clue` | GPT |
| `AZ_EMPTY` | ⛔ | Rosco sin definiciones | Añade `items` (`clue` + `answer`); la letra del rosco es la **inicial de la respuesta** | GPT |
| `AZ_INCOMPLETE` | ⛔ | Entrada del rosco sin definición o sin respuesta | Completa `clue` y `answer` | GPT |
| `AZ_DUP_LETTER` | ⚠ | Varias respuestas empiezan por la misma inicial | Cambia una por un sinónimo o término del tema con otra inicial | GPT |

## Test y nota (SCORM)

| Código | Sev | Causa raíz | Corrección canónica | Quién |
|---|:-:|---|---|:-:|
| `SCORM_NO_FINAL` | ⛔ | `score_source:"final_test"` sin preguntas en `assessments.final_test` | Por defecto el test va en Moodle: cambia a `score_source:"unit_tests"` (contrato §2). Solo si el usuario pidió el test dentro, genéralo (preguntas `single_choice`/`true_false` con correcta y feedback). **Nunca** como pantalla de texto | GPT |
| `SCORM_NO_ACTIVITIES` | ⛔ | `score_source:"unit_tests"` sin interacciones `scored` (con `completion_mode:"evaluation"`) | Marca `scored:true` (y `attempts:3`) en las evaluables, o pon `completion_mode:"screens"` (regla por defecto, contrato §2) | GPT |
| `SCORM_MIXED_EMPTY` | ⛔ | Nota mixta sin test final ni actividades evaluables | Genera ambos bloques | GPT |
| `SCORM_MIXED_NO_FINAL` | ⚠ | Nota mixta sin test final | Cambia `score_source` a `"unit_tests"` (el test va en Moodle, contrato §2); genera el test final solo si el usuario lo pidió dentro | GPT |
| `SCORM_MIXED_NO_ACTIVITIES` | ⚠ | Nota mixta sin actividades evaluables | Marca `scored:true` en los checkpoints (o añádelos) | GPT |
| `SCORM_ACTIVITIES_IGNORED` | ⚠ | Hay actividades `scored` pero la nota sale solo del test final: no contarán | Decisión del autor: propón `score_source:"mixed"` y aplica lo que él decida | Según |
| `SCORM_UNGRADED` | ℹ | `completion_mode:"screens"` sin test final ni actividades evaluables: se completa al llegar al final y no envía nota (sustituye a `SCORM_NO_FINAL`/`SCORM_MIXED_EMPTY`/`SCORM_NO_ACTIVITIES`) | Nada si es intencionado (bienvenida, presentación, curso cuyas actividades no puntúan porque el test está en Moodle); si el SCORM debía dar nota, marca `scored:true` en las evaluables | Según |
| `SCORM_NO_ID` | ⛔ | `scorm.identifier` vacío | Genera uno estable a partir de `course.id` (MAYÚSCULAS y guiones bajos) | GPT |
| `LAYOUT_CHANGED` | ℹ | La estructura actual (pantallas/interacciones/preguntas del test final) ya no coincide con la última versión exportada como SCORM | Informativo, no es un error de contenido: al exportar de nuevo se registra una versión más en el historial (Ajustes del curso → «Versiones publicadas»), para que los alumnos con progreso guardado no lo pierdan | Editor |
| `LAYOUT_IDS_REPLACED` | ⚠ | Menos de la mitad de los ids de la última versión publicada siguen existiendo en el curso actual | Decisión del autor: si el reordenamiento/borrado masivo fue intencionado, exporta con normalidad; si no, revisa qué se movió o eliminó sin querer antes de publicar | Editor |
| `SUSPEND_NEAR_LIMIT` | ⚠ | El peor caso de `cmi.suspend_data` (medidor «Memoria» de la barra de herramientas) llega al 75-100% del límite de 4096 caracteres | Reduce contenido con mucho detalle guardado: crucigramas grandes, rosco con muchas definiciones, o baja `state_max` de HTML a medida que no lo necesiten | Según |
| `SUSPEND_OVER_LIMIT` | ⛔ | El peor caso de `cmi.suspend_data` supera el límite de 4096 caracteres | El runtime degrada automáticamente al guardar (no se pierde progreso ya guardado), pero reduce contenido con mucho detalle guardado antes de publicar: menos palabras/definiciones en crucigrama y rosco, o menos `state_max` en HTML a medida | Según |
| `OBJ_NOT_EVALUATED` | ℹ | Objetivo declarado sin evaluación que lo mida. Causa 1 (la habitual): el `learning_objective` de una pregunta de test no está copiado **carácter a carácter** del `objective`. Causa 2: falta la evaluación (ni una interacción `scored` en una pantalla con ese `objective`, ni una pregunta de test) | Causa 1: corrige el texto para que coincida exactamente. Causa 2: añade una pregunta al test, o marca `scored` una interacción de una pantalla con ese objetivo | GPT |

> Esta tabla se deriva de los validadores de SCORMEditor (`validators.ts`) y se
> mantiene sincronizada con ellos. Si un informe trae un código que no figura aquí,
> avisa al usuario de que la tabla puede estar desactualizada y corrige guiándote
> por el mensaje y el contrato.
