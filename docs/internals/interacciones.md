# Motor de interacciones (`src/runtime/assets/js/interactions.js`)

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`.

Cada interacción se construye con una *factory* que devuelve un **controlador** con el
contrato `{ result(), check(), hasAnswer() }`. El orquestador (`app.js`) solo habla con
ese contrato; no conoce el tipo concreto.

## Comportamiento común
- **Restauración**: todo controlador se repinta desde `ctx.state` al volver a la pantalla
  (el progreso se guarda en `STATE` y en `suspend_data`). Es obligatorio: una interacción
  que no restaura su estado visual rompe la vuelta atrás del alumno.
- **Botón «Comprobar»**: las evaluables (`single_choice`, `true_false`, `sort_steps`,
  `match_pairs`, `classification`) muestran un botón `.me-check` que llama a `check()`.
  Al agotar intentos, `lock()` deshabilita el botón pero **siempre se puede avanzar**.
- **Comprobar con affordance**: helper `wireCheck(el, ready)` compartido por
  `choiceFactory`, `sort_steps`, `dragAssignFactory` y `fill_blanks`. El botón nace
  **desactivado**; cuando `ready()` se cumple por acción del usuario se activa **con
  pulso-glow** (en sort, «responder» = primer movimiento). El pulso se apaga al clicar y
  vuelve si se cambia la respuesta; al restaurar respuesta sin resolver se activa sin
  pulso. `move()` de sort ignora el teclado cuando la interacción está resuelta.
  **Las 6 factories con `attempts`** (`choiceFactory`, `sort_steps`, `dragAssignFactory`,
  `fill_blanks`, `crossword`, `calculator` en modo reto) restauran igual: `done = correct || (maxAtt > 0 && attempts
  >= maxAtt)`, y si no está `done`, `refreshCheck(false)` reactiva Comprobar. `sort_steps`
  y `dragAssignFactory` daban por resuelta CUALQUIER interacción con un `correct` guardado
  (aunque quedaran intentos): un fallo, salir de la pantalla y volver la dejaba bloqueada
  de por vida. Corregido para que restaurar respete `maxAtt` igual que las otras 3.
- **Marcas tras Comprobar en `match_pairs`/`classification`** (`dragAssignFactory`):
  cada pieza queda en verde ✔ (`.is-right`) o rojo ✖ (`.is-wrong`) según esté en su
  categoría; una sin colocar cuenta como mal. Mover una pieza borra solo SU marca (`place`);
  al restaurar se repintan (la asignación guardada es la de la última comprobación). Es
  **siempre así, sin opción**: se aplica también a proyectos antiguos al re-exportarlos
  (decisión del autor). Como en `crossword`, color + icono, nunca solo color.
- **Tocar y colocar**: con una pieza seleccionada, tocar OTRA pieza que está en una
  categoría distinta a la de la seleccionada cuenta como tocar esa categoría
  (`dropPicked`); si está en la misma zona, solo cambia la selección. Sin esto, tocar una
  categoría por el centro (donde suele haber una pieza) no permitía soltar. Tocar
  cualquier punto de la zona también coloca; el botón «Colocar aquí» es el objetivo
  explícito (y el único accesible por teclado).
- **Forzar completado** (`config.force_complete`, solo `match_pairs`, `classification`
  y `crossword`): con la clave **ausente o `true`** (proyectos antiguos) Comprobar solo se
  activa con todo colocado/rellenado, como siempre. Con **`false`** se activa en cuanto
  hay algo (una pieza, una letra) y lo que falte cuenta como fallo al comprobar — el
  alumno sigue teniendo que pulsar Comprobar. Las interacciones **nuevas** nacen con
  `false` (`seed` del catálogo y recetas de pantalla); las antiguas no se tocan. El
  default «ausente = forzado» es lo que garantiza la retrocompatibilidad: no invertirlo.
  `sort_steps` ya se comprueba tras el primer movimiento y el resto de juegos
  (sopa de letras, puzzle, rosco) no tienen Comprobar, así que no llevan la opción. No
  confundir con «Obligatoria» (`screen.required`), que decide si la pantalla bloquea el
  avance, no cuándo se activa Comprobar.
- **Intentos**: campo `attempts` por interacción (`attemptsOf(data)`: `null`/ausente ⇒ 1;
  `0` ⇒ ilimitados; `n` ⇒ n). `retries` quedó **DEPRECATED**, no usar. Editor: el input
  de intentos de `ScreenEditor.tsx` se muestra según `supportsAttempts` del catálogo
  `src/schema/interactionRecipes.ts` (los tipos cuyo factory pasa por `attemptsOf`:
  single_choice, true_false, sort_steps, match_pairs, classification, fill_blanks,
  crossword). Por defecto **1 intento**; `CourseSettingsEditor` tiene una herramienta de
  lote para ponerlo en todas a la vez (`setAllAttempts`, ver `editor-ui.md`).
- **Indicador de intentos** (`.me-attempts`, junto al botón Comprobar): con `attempts`
  finitos, `attemptsHint(el, maxAtt)` (helper compartido, junto a `wireCheck`) devuelve una
  función que las 5 factories con intentos llaman al pintar (fresca o restaurada) y tras
  cada `check()`: «Intentos disponibles: N.» antes del primer intento, «Te queda(n) N
  intento(s).» tras fallar con intentos de sobra, «Sin más intentos.» al agotarlos, vacío
  si acierta. Con intentos ilimitados no se muestra nada (nada que agotar). Todo el estado
  vive en el propio `.me-attempts`, sin depender de `result()`.
- `result()` de una evaluable → `{ completed, scored, correct, score: acierto?points:0,
  maxScore: points }`. `completed` (done) = **resuelta**: acierto **o** intentos agotados
  (con 1 intento, se completa al responder aunque falles; con ilimitados, solo al
  acertar). Cómo puntúa/finaliza: ver `evaluacion-finalizacion.md`.
- **Feedback marcado en la opción**: `choiceFactory` y `scenario_decision` marcan el
  elemento elegido con `.is-right`/`.is-wrong` (color + icono ✔/✖), también al restaurar;
  `replay()` reinicia las animaciones (shake/pop) entre intentos.
- **Barajado de opciones**: `shuffle(arr, seed)` es un Fisher-Yates con PRNG sembrado
  (`seededRandom`), **determinista por id**: la misma interacción baraja igual en cada
  carga (casa con `suspend_data`/reanudación) pero el orden del autor no se sirve tal
  cual, y la correcta cae en posición distinta en cada interacción. Lo usan
  `choiceFactory` (`single_choice`; **`true_false` NO se baraja**, V/F mantiene su orden
  natural), `scenario_decision`, el pool de `dragAssignFactory`
  (`match_pairs`/`classification`), `sort_steps` (con guardia: si el barajado deja por
  azar el orden correcto, rota un elemento — nunca se sirve resuelto), `fill_blanks` y
  el test final (`renderFinalTest` en `app.js`, opciones por pregunta vía
  `Interactions.shuffle` exportado; las preguntas mantienen su orden). Restaurar es
  seguro porque todo estado se guarda por **id**, no por posición. **Excepción**: las
  preguntas de `video`/`hidden_image` (`questionCard`) no se barajan — su estado guarda
  el **índice** de la opción, barajar rompería restauraciones antiguas. Ojo histórico:
  ordenar por `id+semilla` NO baraja (el prefijo decide); por eso `shuffle` usa PRNG.
- **Drag&drop** (sin dnd-kit; el runtime es plano): `sort_steps` reordena; `match_pairs`
  y `classification` usan `dragAssignFactory` (chips `.me-chip` sobre zonas `.me-dnd`).
  Layout: pool «Sin asignar» a la **izquierda** y categorías a la derecha, **apiladas en
  vertical** (grid 2 columnas al 50%; se apilan a ≤640px). No hay `<select>` por chip: la
  alternativa al arrastre es **tocar y colocar**, que sirve igual para táctil, teclado y
  ratón (clic/Intro en el chip lo selecciona, `.is-picked`/`aria-pressed`).
- **Táctil vs. ratón** (`isCoarse()` = `matchMedia('(pointer: coarse)')`, evaluado al
  pintar): el arrastre nativo HTML5 **no es fiable con el dedo** (según navegador no
  arranca, o el gesto hace scroll), así que en puntero táctil no se ofrece
  (`draggable="false"`, clase `.is-touch` en `.me-sort`/`.me-dnd`) y la instrucción
  visible (`.me-sort-hint`) **no dice «arrastra»**: guía a ▲ ▼ (ordenar) o a «toca un
  elemento y después la categoría/casilla» (colocar). Con ratón la instrucción ofrece
  ambas vías. Lo de teclado va en un `.sr-only` dentro de la misma instrucción. Un
  portátil con pantalla táctil tiene puntero principal fino: conserva el arrastre.
  En `.is-touch` se anula la lupa/menú de pulsación larga (`-webkit-touch-callout`,
  `user-select`) y el resaltado de toque; objetivos táctiles ≥ 44 px.
- **Selección visible al colocar** (`setPicked`): con una pieza seleccionada, `.me-dnd`
  lleva `.is-picking`, las zonas destino se resaltan y muestran su botón real
  **«Colocar aquí»** (`.me-dnd-drop`; en el pool, «Devolver aquí»); la zona donde ya
  está la pieza (`.is-current`) no. Aparece la barra `.me-dnd-bar` («Seleccionado: «…».
  Toca …» + **Cancelar**), `position: sticky; bottom: 0` dentro del scroll de
  `.me-content` para que se vea aunque el destino quede abajo; Esc también cancela. Los
  anuncios (`ctx.announce`) nombran la pieza.
- **Accesibilidad de las zonas**: cada zona es `role="group"` con `aria-labelledby` a su
  título (id `me-dnd-<id>-t<n>`), **no** un botón: dentro hay chips (`role=button`) y
  antes quedaban botones anidados y el `aria-label` de la zona tapaba las piezas ya
  colocadas. El destino accionable por teclado es el `<button>` «Colocar aquí» (sin
  aria-label: el destino va detrás como `.sr-only` «: «categoría»», para que el nombre
  accesible empiece por el texto visible, WCAG 2.5.3). `lockAssign` retira roles/tabindex de los chips y desactiva
  esos botones al resolverse. `match_pairs` comparte este modo con `classification`
  (solo cambian los textos: «casilla con la que se relaciona»); no impone 1:1.
- **Informativas** (`accordion`, `tabs`, `flip_cards`, `video`, `hotspots`,
  `case_practice`) **no** fijan `STATE.results`; su avance se captura al entrar (ver sync
  en `editor-ui.md`) para no bloquear «Siguiente».
- **Cuerpos de `accordion`/`tabs` en bloque**: usan `block()` (→ `Renderer.mdToHtml`, no
  `rich()`), así una lista `- ` dentro de un `item` sale como `<ul>`, no en línea. El
  resto de textos cortos (títulos, opciones, cards) siguen con `rich()` (inline).
- **Desplegables exclusivos**: en `accordion` y `timeline`, abrir un ítem cierra los
  demás de la misma interacción (el clic recorre los `heads` hermanos). No afecta a la
  impresión: `setupPrint` abre todos tocando atributos, sin disparar clics. Mismo
  criterio en `flip_cards`: girar una carta devuelve las demás a su anverso.
- **Affordance «hay que clicar»**, en `accordion`, `flip_cards`, `tabs`, `timeline`,
  `flashcards` (lengüeta «+» → «✓» verde al revelar, pulso solo con el repaso sin
  empezar, y **la carta entera es clicable** para revelar además del botón) y `hotspots`
  (marca «+» en disco blanco centrada en cada zona; el pulso va en **todas** las zonas
  —señalar solo una sesgaría la respuesta— y se apaga al primer intento) (en tabs:
  conjunto envuelto en bloque `.me-tabs-box`, check verde por pestaña — la primera nace
  vista —, pulso en la **segunda** pestaña hasta cambiar): icono «+» (rota a «×» al abrir
  en accordion; lengüeta `.me-flip-tab` en la esquina de la carta), pulso-glow
  (`.me-pulse`, keyframes `me-pulse-glow`) en el **primer** ítem/carta mientras no se
  haya abierto ninguno, y **check verde** al abrir (`.is-seen`; en la carta la lengüeta
  pasa a «✓» verde). Lo visto se persiste como `{seen: {idx: true}}` vía `ctx.save`.
- **Narración por ítem al revelar** (`accordion`/`tabs`/`flip_cards`/`timeline`/
  `image_cards`/`flashcards`): si el ítem tiene `audio_src` propio, suena **cada vez**
  que el ítem se abre/gira/activa (no solo la primera vez; `flashcards` ya narraba así
  desde siempre — «cada Mostrar respuesta es su propio revelado»). Sin control de
  «escuchar de nuevo»: si al alumno le resulta repetitivo, desactiva el audio con las
  opciones generales de la barra inferior. El marcado de `seen[i]` (check verde,
  gating de completado) sigue ocurriendo solo la primera vez, independiente de la
  reproducción. Detalle completo, generación y coordinación con el audio de pantalla
  (incluida la velocidad de reproducción) en `tts-narracion.md` («Narración por ítem» /
  «Velocidad de reproducción»).
- **Los interactivos de exploración bloquean hasta verlo todo**: `accordion`, `tabs`,
  `flip_cards`, `timeline` y `flashcards` devuelven `completed` solo cuando el alumno ha
  abierto/girado **todos** los apartados (flashcards: al terminar el repaso una vez;
  «Repetir repaso» no la des-completa, se persiste `done: true`). Con la regla
  `require_interactions` activa y la pantalla `required`, el gating de navegación
  (`interactionOk`, app.js) no deja avanzar hasta entonces. Siguen sin puntuar
  (`scored: false`). `video` **sin preguntas**, `case_practice` y `html_embed` completan
  al renderizarse (no hay señal fiable de «visto entero»); `video` **con preguntas**
  completa al responderlas todas (ver su sección).
- **Posición respecto al texto**: `screen.interaction_layout` (`top`/`bottom`, def.
  `bottom`). `render()` (renderer.js) mueve `.me-interaction` tras el `<h1>` cuando es
  `top`. Editable en `ScreenEditor`.
- No hay coletilla `TYPE_LABELS` («Actividad/Interactivo») encabezando cada interacción
  (decisión del autor): la instrucción de cada ejercicio ya la da su
  `prompt`/`instructions`. La diferenciación visual de una pantalla evaluable (tarjeta
  amarilla en título+descripción, etiqueta «Evaluable») vive un nivel por encima, en el
  renderer de pantalla — ver `arquitectura-runtime.md`.

## Notas por tipo

### `flip_cards` — volteo 3D
Ambas caras viven **siempre en el DOM** (`.me-flip-inner` gira con `rotateY`; caras
apiladas en la misma celda de grid para que la altura sea la del contenido mayor;
`backface-visibility` oculta el reverso). El lector de pantalla usa `aria-hidden`
alternado, **no** el atributo `hidden`. La impresión no las expande por JS (`setupPrint`):
`print.css` aplana el giro y muestra las dos caras. `front`/`back` se renderizan con
`block()` (markdown de bloque completo: listas, bloques personalizados…), igual que el
resto de tipos «título + detalle». La tarjeta `.me-card` es un **contenedor `<div>`, no un
botón** (el reverso puede llevar listas y enlaces, que no caben en un `<button>`): el
control es `.me-card-toggle`, un `<button>` hermano de las caras (`aria-expanded` +
`aria-controls` al reverso, nombre «Girar la tarjeta: <anverso en texto plano>» + «(vista)»)
superpuesto a toda la tarjeta con `pointer-events: none`, de modo que el clic con ratón cae
en las caras y lo recoge el contenedor (un clic en un enlace no gira). El estado girado es
la clase `.is-flipped`; la cara oculta lleva `aria-hidden` + `inert` (y `tabindex=-1` en
sus enlaces como respaldo). Al girar se anuncia el reverso en texto plano. Las caras
fuerzan `flex-direction: column` para que varios bloques se apilen en vertical (con
`overflow: hidden` en fila se recortaba todo salvo el primer párrafo).

### Accesibilidad común (Comprobar, modal de feedback, marcas)
- **Comprobar** nace con `aria-disabled="true"` (no `disabled`): sigue enfocable y, si se
  pulsa sin respuesta completa, el `check()` de cada tipo anuncia qué falta. Solo el
  `lock()` al resolverse lo deshabilita de verdad. Todo `check()` que use `wireCheck`
  debe validar la respuesta antes de puntuar.
- **Modal de feedback** (`showFeedbackModal`): `role=dialog` con `aria-labelledby` al
  mensaje y `aria-describedby` a la explicación, Tab atrapado y Esc cierra. La caja
  `.me-feedback` en línea se rellena a la vez **sin región viva** (registro releíble, no se
  anuncia dos veces). Al cerrar, si el destino del foco ya no es enfocable (Comprobar
  deshabilitado), cae a esa caja o al contenedor (`tabindex=-1`), nunca a `<body>`.
- `.me-attempts` y `.me-sort-tally` no son regiones vivas en los tipos de este fichero
  que anuncian con `ctx.announce` (el texto de intentos restantes va en el anuncio).
- Las marcas ✔/✖ por `::after` llevan su equivalente `.sr-only` (`setMarkSr`: «correcta»,
  «bien colocado», «tu elección, …»); el ✓ de visto, «(visto)»/«(vista)» (`seenMarkup`).

### `case_practice` — sin campo de texto
Decisión deliberada: el alumno piensa/escribe su respuesta **en papel** (hint
`.me-case-hint`) y se autoevalúa con la rúbrica; así la respuesta no gasta `suspend_data`
(límite 4096 en SCORM 1.2). El estado guarda solo `{rubric: [índices marcados]}` y se
restaura al volver. La rúbrica es una **card desplegable** que reutiliza las clases del
accordion (`me-acc-head`/`me-acc-body`: «+», pulso-glow hasta el primer clic y expansión
al imprimir heredados); con marcas guardadas se restaura abierta. Tampoco se escribe nada
en `cmi.interactions` (write-only en 1.2, soporte irregular); si algún día se quiere
trazabilidad, esa es la vía. Validador: `CP_NO_RUBRIC` (warning sin rúbrica).

### `hotspots` — solo imagen + glow permanente
No hay lista de botones equivalentes bajo la imagen — duplicaba las zonas para el lector
de pantalla (cada zona ya es un `<button>` con `aria-label`) y desvelaba las etiquetas.
Las zonas llevan **glow permanente** (anillo blanco + halo del primario) para que se vea
que existen; el pulso de invitación usa keyframes propios (`me-hotspot-pulse`) que
conservan el anillo blanco mientras animan. **Hay que encontrar todas las zonas
correctas** (siempre, sin casilla): las halladas quedan `.is-right` (verde, ✔) y las
erróneas pulsadas `.is-wrong` (rojo, ✖), y la actividad se completa al hallar la última
correcta (sin zonas correctas configuradas, cualquier clic completa). `result()` devuelve
`scored: !!data.scored`; `correct` (y la nota) exige además **no haber fallado ningún
clic**. No tiene botón Comprobar ni `attempts`: las zonas siguen activas y cada clic
muestra su feedback (con el avance «n de N» si hay varias correctas). Estado:
`{ found:[ids], wrong:[ids] }`; el formato antiguo `{ choice }` (un clic) se migra al
restaurar (correcta → hallada, errónea → fallada). Codec en `state_codec.js`: dos máscaras
de bits contra `spots`; el payload antiguo (índice base36, sin `:`) sigue leyéndose.
Al clicar una zona el feedback sale en una **ventana modal** (ver «Feedback en ventana
modal» abajo). Sus zonas se editan
visualmente en el editor (ver `editor-pantallas.md`). Es evaluable a efectos de narración
(solo su `prompt` entra en la transcripción general, nunca las etiquetas de zona — eso
desvelaría las opciones de la pregunta, ver `tts-narracion.md`), pero cada zona admite su
**propio** audio corto (mismo mecanismo que accordion/tabs, clave `spots` en `ITEM_KEY`)
que suena solo **al clicarla** — nunca al restaurar estado ni por adelantado.

### `fill_blanks` (evaluable)
`config.text` con huecos `[[respuesta]]` + `config.distractors` opcional. Cada hueco →
`<select>` con pool barajado (determinista, `shuffle` por id). Comprobar marca cada
select `.is-right`/`.is-wrong`; intentos y restauración como `choiceFactory`
(`{values, correct, attempts}`). Validadores: `FB_NO_BLANKS` (sin huecos) y feedback
obligatorio. Campo Intentos visible en el editor.
- **Modo escrito** (`config.mode: 'type'`; ausente = desplegables, así que los proyectos
  existentes no cambian): cada hueco es un `<input>` y vale cualquiera de las
  alternativas `[[a|b]]` comparadas con `normAnswer` (minúsculas, sin tildes, espacios
  colapsados). El «|» solo es separador en este modo; en desplegables sigue siendo texto
  literal. Sin distractores (el editor los oculta). Resuelto, el hueco fallado muestra
  «→ respuesta» (`.me-blank-sol`). El estado **no guarda el texto del alumno**: `{ok:
  [acierto por hueco], correct, attempts}`; al restaurar, el hueco acertado muestra la
  primera alternativa del autor y el fallado queda vacío (con intentos, se reescribe).
  Así no hay texto libre en `suspend_data`. En `.elpx` va al iDevice «Completa» sin
  distractores: allí `@@a|b@@` también son alternativas al escribir.

### `sort_steps` — corrección explicada
Cada paso admite `explanation` opcional. **Solo cuando la actividad queda resuelta**
(acierto o intentos agotados; antes desvelaría el orden), `markSorted()` marca cada paso
✔/✖, añade al mal colocado «Lo pusiste en la posición N; va en la M» y la explicación
del paso, y oculta asa y flechas. Se repinta al restaurar (el orden guardado basta: no
cambia el estado ni el codec). Aplica también a proyectos antiguos al re-exportar (sin
explicaciones, solo posición), mismo criterio que las marcas de `match_pairs`.

Mientras **quedan intentos**, un fallo no marca cuáles están mal pero sí muestra
`.me-sort-tally` «N de M pasos están en su sitio.» (y lo incluye en el anuncio): orienta
sin desvelar el orden. Se oculta al mover un paso (deja de valer) y se recalcula al
restaurar desde el orden guardado, que es el de la última comprobación (`ctx.save` solo
ocurre en `check()`).

### `sort_steps` — manejo
- Cada paso muestra su **posición** (`.me-sort-num`, renumerada por `renumber()` en cada
  movimiento, también durante el arrastre con ratón; con «Posición» en `.sr-only`).
- ▲ del primero y ▼ del último están **desactivados** (no hacen nada ahí). Sus
  `aria-label` nombran el paso («Subir «texto»»). Tamaño mínimo 2.25rem, **44 px** en
  táctil o ≤ 480 px; a ≤ 480 px ▲ y ▼ se apilan en vertical para no robar ancho al texto.
- Tras mover (botón, flecha o arrastre por botón/teclado) el paso se resalta un momento
  (`.is-moved`, solo color, sin movimiento) y se anuncia ««texto» ahora en la posición N
  de M.». Con botón, el foco se queda en el botón pulsado (o pasa al otro si el pulsado
  quedó desactivado en el extremo); con flechas del teclado, en el paso.
- En táctil se oculta el asa ⋮⋮ (prometía un arrastre que no se ofrece).

### `timeline` (informativa)
`config.milestones` `[{label, title, body}]` → `<ol class="me-tl">` con línea/puntos de
acento; cada hito se despliega como accordion (mismo patrón `aria-expanded`+`hidden` →
`setupPrint` los expande al imprimir y `print.css` muestra `.me-tl-body[hidden]`).
Validador: `TL_EMPTY`.

### `flashcards` (autoevaluación, no puntúa)
`config.cards` `{front, back}` (mismo shape que `flip_cards`). Flujo una carta cada vez:
«Mostrar respuesta» → «¿La sabías?» → resumen «X de N» + repetir. Estado `{idx, known[]}`
restaurable. Validadores: `FC_EMPTY` y `FC_SCORED` (warning si `scored: true`).
`completed: true` siempre (no bloquea).

### `html_embed` — HTML/CSS/JS a medida
Tipo informativo para animaciones e interactivos ad hoc que el **autor pega a mano** en
el editor (tres textareas de código + alto opcional). `config: { html, css, js,
height?, embed_assets? }`.
- **Imágenes referenciadas desde el código**: sin campo de imagen fijo (el HTML/CSS/JS
  es texto libre, la imagen puede ir en cualquier `src="…"` o `url(…)`), así que
  `InteractionConfigEditor` lleva su propia mini-lista de subida (`config.embed_assets`,
  array de rutas `assets/img/…`) en vez del `FileButton` de campo único que usan otras
  interacciones. Cada imagen subida aparece con un botón «Copiar», que inserta la ruta
  en el campo (HTML/CSS/JS) y la posición donde tenía el cursor el autor la última vez
  (un ref por textarea + `onSelect`/`onFocus` van registrando dónde), además de copiarla
  al portapapeles — el autor la deja ahí o la mueve a mano. Quitar una imagen de la
  lista no borra el binario si la ruta sigue pegada en el código (mismo
  `removeAsset`/`isAssetReferenced` de siempre — `collectAssetPaths`, en
  `schema/assetRefs.ts`, ya rastrea cualquier `assets/…` dentro de un `config` de
  interacción, así que el export no la trata como huérfana).
- **Excepción controlada a la invariante anti-XSS**: es el único tipo que guarda código
  en `course.json`, y por eso corre en un `<iframe sandbox="allow-scripts">` **sin**
  `allow-same-origin` (origen opaco): no puede tocar la API SCORM, `suspend_data` ni el
  DOM de la carcasa. Nada del autor se inyecta en nuestro DOM — el documento interno
  viaja **escapado** dentro del atributo `srcdoc` (y `</script>`/`</style>` internos se
  neutralizan para no romper el documento del iframe).
- **Alto**: fijo si `config.height` (px); si no, **auto-resize** — el doc interno reporta
  `scrollHeight` por `postMessage` (`{meEmbed: id, height}`, único canal con origen
  opaco) y la carcasa ajusta el iframe filtrando por id de interacción.
- **Tiempo estimado**: `config.est_seconds` (opcional, 0-3600 s; campo «Tiempo estimado» del
  editor) lo lee `estimateDuration.ts` para el chip de duración del curso; sin él cuenta 30 s.
  No afecta al runtime ni a la nota.
- **Contrato «MeEmbed v1»** (`config: { …, require_completion?, state_max? }`, ver
  `docs/html-embed-contract.md` para el detalle autor-facing): se inyecta
  `window.MeEmbed = {version, id, completed, state, stateMax, complete(), saveState(obj)}`
  como primer `<script>` del documento interno, antes del código del autor. `complete()`
  marca la interacción completada (idempotente); `saveState(obj)` guarda `obj` como
  `state` propio entre sesiones, rechazándolo (con `console.warn`, nunca rompe el
  interactivo) si no es serializable, si supera `stateMax` (0-300, 100 por defecto), **o
  si el JSON contiene algún carácter fuera de ASCII imprimible (0x20-0x7E) o el carácter
  `~`** — el estado debe caber en índices/booleanos/claves de una letra, nunca texto
  libre. La carcasa vuelve a comprobar tamaño Y alfabeto al recibir el `postMessage`,
  nunca se fía del propio iframe. Sin `require_completion`, `result()` es siempre
  `{completed: true, scored: false}` (como antes); con él, no completa hasta que el
  propio código llama a `MeEmbed.complete()`. Nunca puntúa (`scored` siempre `false`,
  aunque el autor marque la interacción evaluable — `EMBED_SCORED` avisa de eso). El
  presupuesto ASCII de `state_max` es lo que permite al medidor de memoria SCORM del
  editor (`estimateSuspendSize`, ver `../suspend-data.md`) acotar el peor caso sin
  factor de escape.
- Validadores: `EMBED_EMPTY` (error sin html ni js), `EMBED_SCORED` (warning si
  `scored`), `EMBED_NO_COMPLETE` (error: `require_completion` sin llamar a
  `MeEmbed.complete()`/`ME.complete()`), `EMBED_STATE_MAX` (error: `state_max` fuera de
  0-300), `EMBED_STATE_MAX_DEFAULT` (info: sin `state_max` explícito, usa el 100 por
  defecto) y `EMBED_STATE_UNUSED` (warning: hay presupuesto pero no se llama a
  `saveState()`/`ME.saveState()`). No participa en TTS (`buildTranscript` no lo lista como informativa
  narrable: es código).

### `image_cards` — tarjetas con imagen (ventana)
Tipo informativo: rejilla de tarjetas (imagen + título) que al clicarlas abren una
**modal** con el **texto a la izquierda y la imagen a la derecha** (apilado en móvil,
imagen primero). `config.cards: [{image, alt, title, text}]` (`text` es markdown de
bloque, `block()`).
- **Portada con o sin imagen**: `config.show_cover_image` (por defecto `true`; el editor
  guarda `false` o lo omite). Con `false` la tarjeta no pinta `<img>` y queda como una
  flip card (título centrado, `.me-imgcards.is-textcover`), pero la modal conserva la
  imagen: por eso `image`/`alt` siguen siendo obligatorios. No es un tipo nuevo a
  propósito: mismo `config`, mismo estado `{seen}` y mismo codec, sin tocar
  `state_codec.js` ni el exportador `.elpx`.
- Reutiliza `.me-modal`/`.me-modal-card` de la carcasa; la modal se crea al abrir y se
  destruye al cerrar (`document.body`, no dentro de `.me-screen`, para esquivar los
  `transform` de las animaciones de entrada, que romperían el `position: fixed`). Cierre
  por ✕, clic fuera y Esc; si el lightbox está abierto encima, Esc cierra solo el
  lightbox. La imagen de la modal es `.me-zoomable` (amplía a pantalla completa).
- Affordance estándar: lengüeta «+» (`.me-flip-tab`), pulso en la primera tarjeta hasta
  el primer clic, check verde y `{seen}` persistido, como accordion/flip_cards.
- **Impresión**: el texto de la modal viaja oculto en el DOM (`.me-imgcard-print[hidden]`,
  fuera del `<button>` para no anidar bloques en él) y `print.css` lo muestra bajo cada
  tarjeta — sin tocar `setupPrint`.
- Validadores: `IC_EMPTY` (sin tarjetas), `IC_NO_IMAGE` (tarjeta sin imagen),
  `IC_NO_TITLE` (con `show_cover_image:false`, tarjeta sin título: no se vería nada) e
  `IMG_NO_ALT` (imagen sin alt), errores. Sí se narra en TTS (título + texto).
- Tiene tarjeta en la modal de Añadir pantalla (receta `image-cards`, grupo Contenido).

### `before_after` — comparador antes/después
Tipo informativo (inspirado en eXeLearning): dos imágenes superpuestas y un divisor
deslizante. `config: { before_image, before_alt, after_image, after_alt, before_label?,
after_label? }` (etiquetas por defecto «Antes»/«Después»).
- **Mecánica**: la imagen «después» es la base; la de «antes» va encima recortada con
  `clip-path: inset(0 … 0 0)` gobernado por la variable CSS `--me-ba-pos`. El control es
  un **`<input type=range>` invisible a pantalla completa** sobre el comparador: arrastre
  con ratón/dedo y flechas de teclado gratis (foco visible vía
  `.me-ba:has(.me-ba-range:focus-visible)`).
- **Affordance**: tirador central «◂▸» con pulso-glow hasta el primer movimiento.
- **Completa al mover el divisor una vez** (`{moved, pos}` persistido; la posición se
  restaura al volver). Con `require_interactions`, bloquea «Siguiente» hasta moverlo. No
  puntúa (`BA_SCORED` avisa si se marca evaluable).
- **Impresión**: `.me-ba-print[hidden]` con ambas imágenes completas y su etiqueta
  (print.css lo muestra y oculta el comparador), patrón `.me-imgcard-print`.
- Validadores: `BA_NO_IMAGES` (error si falta alguna) e `IMG_NO_ALT` por cara. Se narra
  en TTS (etiqueta + alt de cada cara, lo único textual).

### `word_search` — sopa de letras
Evaluable **opcional** y **autovalidante** (inspirado en eXeLearning): sin botón
Comprobar ni `attempts` (como hotspots). `config: { words: [string] }` (3–12 letras
útiles; se filtran las demás).
- **Tablero determinista**: PRNG propio (mulberry32 sembrado con hash de `data.id`) →
  mismo tablero en cada sesión, y la restauración desde `suspend_data` (`{found}`)
  recoloca las palabras encontradas sin guardar posiciones. Normalización: mayúsculas,
  sin acentos (NFD, la Ñ se preserva), sin espacios — duplicada a propósito en
  `validators.ts` (el runtime es JS plano, no puede compartir módulo con el editor).
- **Colocación**: 4 direcciones (→ ↓ ↘ ↗), 200 reintentos por palabra, cruces
  compatibles permitidos; tamaño 8–14 autoajustado. Una palabra sin hueco tras los
  reintentos **se cae del tablero y de la lista** (nunca una palabra imposible). El
  relleno se sesga a las letras de las propias palabras.
- **UX**: tocar la primera letra (`.is-picked`) y la última; la recta (8 direcciones,
  también al revés) se compara con las pendientes. Acierto → celdas `.is-found` + palabra
  tachada con ✓ en la lista lateral + `ctx.announce` (deletreando las letras marcadas).
  Cada celda es un `<button>` con `aria-label` de fila/columna (+ «, encontrada»), la
  inicial con `aria-pressed`; el tablero es una sola parada de Tab (*roving tabindex*:
  flechas, Inicio/Fin, Ctrl+Inicio/Fin). Se queda en `role=group` + botones en vez de
  `role=grid`: las filas tendrían que ser `display:contents`, poco fiable en el árbol
  accesible. Verde del texto encontrado `#0c5a26` (≥6,5:1 sobre su fondo).
- **Puntuación proporcional**: `score = points × encontradas/total`;
  `completed`/`correct` solo con todas encontradas. Al completar se muestra el feedback
  de acierto.
- Validadores: `WS_EMPTY`, `WS_WORD_LONG` (>12 letras), `WS_WORD_SHORT` (<3 útiles). No
  se narra en TTS (es juego, como las evaluables).

### `video` con preguntas en timestamps
`config.questions: [{ time (segundos), prompt, options: [{text, correct, feedback?}] }]`
— opcional; sin preguntas el tipo se comporta como siempre. Con preguntas, el vídeo se
**pausa** en cada `time` y muestra la pregunta en un overlay sobre el vídeo
(`.me-iv-overlay`); al responder (1 intento por pregunta, sin campo `attempts`) se ve el
feedback y «Continuar» reanuda. Estado `{answered: {idx: {choice, correct}}}` persistido;
las respondidas no se re-disparan (tampoco al hacer seek). Con la pregunta abierta, el
`<video>`/iframe queda `inert` (+`tabindex=-1`) y al continuar recupera el foco; con
≤600 px de ancho (container query sobre `.me-iv-box`, respaldo `@media`) el overlay pasa
al flujo, **debajo** del vídeo (WCAG 1.4.10). Solo la primera pista `<track>` es `default`.
- **Subtítulos del vídeo propio**: `config.tracks` (mismo shape que
  `visual_resource.tracks`) y `config.has_voice` (solo del editor: la carcasa lo ignora;
  activa `MEDIA_NO_SUBS` si no hay pista). Se editan en la actividad cuando hay `src`;
  ambos son opcionales y sin ellos todo funciona como siempre.
- **video_file**: nativo (`timeupdate`/`seeked`).
- **YouTube**: puente postMessage del IFrame API (`?enablejsapi=1`, mensajes
  `listening`/`command`/`infoDelivery`) **sin cargar JS externo** — verificado
  funcionando en vivo. Si el puente no entrega tiempo en 6 s (LMS que bloquea la
  comunicación), **fallback**: las preguntas aparecen como lista visible bajo el vídeo,
  siempre respondibles (validador `IV_YT_BRIDGE`, info).
- Completa al responder **todas**; puntuación **proporcional** a los aciertos
  (`points × aciertos/total`). La tarjeta de pregunta es el helper compartido
  `questionCard()` (lo reutiliza `hidden_image`).
- Validadores: `IV_Q_NO_PROMPT`, `IV_Q_FEW_OPTIONS`, `IV_Q_NO_CORRECT`.

### Juegos didácticos (`crossword`, `hidden_image`, `az_quiz`, `puzzle`)
Cuatro tipos con **crédito parcial** (los tres primeros: `score = points ×
aciertos/total`) y helpers compartidos: `normLetters()` (mayúsculas, sin acentos, Ñ
preservada) y `seededRandom()` (mulberry32; tablero determinista por `data.id`, clave
para restaurar desde `suspend_data`). Inspirados en el catálogo de eXeLearning.
- **`crossword`** (evaluable, Comprobar + `attempts` como fill_blanks):
  `config.entries [{word, clue}]` (3–12 letras). El layout se autocalcula: la palabra más
  larga horizontal y el resto buscando **cruces** con las colocadas (sin adyacencias
  laterales ni prolongaciones); una palabra sin cruce posible **se descarta** del tablero
  y de las pistas. Casillas `<input>` de una letra con numeración y listas
  Horizontales/Verticales; al comprobar, cada palabra marca sus casillas
  `.is-right`/`.is-wrong` (una casilla de cruce solo va en verde si TODAS sus palabras
  están bien). Estado `{values: {'r,c': letra}, attempts, correct}`. Validadores:
  `CW_EMPTY`, `CW_FEW` (1 palabra), `CW_INCOMPLETE`.
  **Autoavance**: al escribir una letra, el foco salta solo a la siguiente casilla de la
  palabra activa (y Retroceso en una casilla vacía vuelve a la anterior, borrándola) — sin
  esto había que clicar cada casilla una a una. `cellDir` (por casilla, calculado tras la
  numeración) dice qué dirección(es) pasan por ella; `curDir` es la dirección activa
  (`across`/`down`, módulo del factory): por teclado (Tab) o por el propio autoavance se
  mantiene mientras la casilla la admita; en una casilla de **cruce** (admite las dos),
  clicarla dos veces seguidas (mismo `data-k` que el click anterior) **o Espacio/Intro**
  alterna la dirección, igual que en un crucigrama de periódico; las flechas mueven a la
  casilla más próxima (saltando huecos). Cada casilla se nombra por su(s) palabra(s)
  («3 vertical, letra 2 de 5; 1 horizontal, letra 4 de 7») con `aria-describedby` a la
  pista; las pistas son botones que llevan a la primera casilla de su palabra. Tras
  Comprobar, icono ✔/✖ (`.me-cw-mark`) + `aria-invalid`, nunca solo color.
- **`hidden_image`** (evaluable, autovalidante): `config {image, alt, questions}` (mismas
  preguntas que `video`). La imagen se cubre con 12 losetas; cada **acierto** destapa su
  parte (orden de revelado aleatorio determinista) y al responder todas se desvela
  entera. Una pregunta cada vez bajo la imagen (`questionCard`), 1 intento por pregunta.
  **Sin avance temporizado** (WCAG 2.2.1): tras responder, «Siguiente pregunta» recibe el
  foco y, al pulsarlo, el foco va al enunciado nuevo (`tabindex=-1`). Lo mismo en
  `az_quiz` con «Siguiente letra» (la respuesta correcta queda a la vista); ninguno
  mueve el foco en el primer pintado.
  Validadores: `HI_NO_IMAGE`, `HI_NO_QUESTIONS`, `HI_Q_*`.
- **`az_quiz`** (evaluable, autovalidante, tipo pasapalabra): `config.items [{clue,
  answer}]` — la **letra se deriva de la inicial de la respuesta** (también en el editor,
  chip `.ed-az-letter`), y con ella se ordena el rosco PINTADO. El estado se guarda por
  `origIdx` (posición en `config.items` tal como lo escribió el autor, ya filtrado pero
  SIN ordenar), nunca por la posición en el rosco pintado — si se guardara por esta
  última, editar solo el TEXTO de una respuesta (sin tocar el id/tipo de la interacción,
  así que la huella de `suspend_data` no cambia) podría reordenar el rosco entero y
  desplazar lo ya respondido de OTRAS preguntas al reanudar. `state_codec.js`
  (`azQuizItems`) usa el mismo orden de autor, sin ordenar por letra, para que sus
  posiciones coincidan con `origIdx`. Chips del rosco con estados (actual con pulso de 3
  ciclos y `aria-current` / acierto verde con ✔ / fallo rojo con ✖, y el estado en texto
  oculto «A: acertada»); respuesta escrita (Enter envía) comparada con `normLetters` y
  **Pasapalabra** deja la letra para la siguiente vuelta. Al fallar se muestra la
  respuesta correcta. El campo de respuesta lleva `maxlength` (`Math.min(120,
  Math.max(40, respuesta.length + 10))`, nunca por debajo de la propia respuesta
  correcta): es la única interacción con texto libre real sin acotar por el propio
  diseño de la interfaz, y `suspend_data` necesita una cota (ver
  `../suspend-data.md`, medidor de memoria). Lo que se **guarda** distingue acierto
  de fallo: una respuesta CORRECTA no guarda texto en absoluto (`{correct: true}` —
  nunca se reexpone al alumno, el feedback siempre usa la respuesta correcta del
  propio contenido); una INCORRECTA guarda `normLetters(dado)` recortado a
  `maxlength`, con la Ñ (lo único no-ASCII que `normLetters` puede dejar) sustituida
  por N —nunca borrada, "NIÑO" queda "NINO", no "NIO"— para que sea ASCII puro
  (`{given, correct: false}`) — así el peor caso real nunca necesita el factor de
  escape de `state_codec.js`. Un
  `suspend_data` guardado con el formato antiguo (texto tal cual, sin normalizar) se
  sigue leyendo igual; se reescribe en el nuevo formato en el siguiente guardado.
  Estado `{res: {idx: {given?, correct}, __last}}`. Validadores: `AZ_EMPTY`,
  `AZ_INCOMPLETE`, `AZ_DUP_LETTER` (warning).
- **`puzzle`** (completable; puntúa solo si el autor lo marca): `config {image, alt,
  cols?, rows?}` (2–5, def. 3×3). Piezas por `background-position`, barajadas
  deterministas (nunca nace resuelto); **tocar dos piezas las intercambia** (mismo
  criterio accesible del drag&drop). `completed` solo al resolverlo (persistido
  `{order, solved}`). Cada pieza se nombra por su identidad y su sitio («Trozo 4 de 9
  (fila 2, columna 1), en la posición 7, en su sitio»), con `aria-pressed` en la
  seleccionada y anuncio al seleccionar/intercambiar; el `alt` de la imagen va en texto
  oculto enlazado al grupo. Validador: `PZ_NO_IMAGE`.
- **Tableros pequeños** (sopa y crucigrama): casillas de 24 px a 2.1rem; si a 24 px no
  caben (p. ej. 13–14 columnas a 320 px), el tablero se desplaza en horizontal dentro de
  `.me-ws-scroll`/`.me-cw-scroll` en vez de encoger (WCAG 2.5.8 + 1.4.10). Sin
  `tabindex` propio: sus casillas son enfocables y el foco arrastra el desplazamiento.

### Prácticas de varios pasos (`scenario_steps`, `decision_tree`, `calculator`)
Tres tipos evaluables pensados para casos aplicados (inspirados en visores comerciales de
teleformación). Ninguno se narra más allá del enunciado: sus opciones/nodos desvelarían
la respuesta (`buildTranscript` los trata como evaluables). Los tres degradan a texto en
`.elpx` y tienen codec compacto propio en `state_codec.js`.
- **`scenario_steps`** — caso por decisiones. `config: { scenario?, steps: [{id, text,
  options: [{id, text, correct, feedback}]}] }`. Una decisión cada vez (puntos de progreso
  arriba), opciones barajadas por `data.id + step.id`; al elegir se marca la opción y su
  comentario sale **en línea** (no en modal: el paso siguiente necesita el contexto) con
  «Siguiente decisión». Una respuesta por paso, sin `attempts`. Al terminar, resumen común
  `summaryCard()` (anillo `conic-gradient` con `--pct`, «X/N», mensaje por tramos).
  **Crédito parcial**: `score = points × aciertos/pasos`; `correct` solo con todo acertado.
  Sin nota, «Repetir el caso» reinicia, pero `done` persiste para no volver a bloquear
  la navegación. Estado `{picks: [id|null por paso], idx (== nº pasos: resumen), done}`.
  Validadores: `SS_EMPTY`, `SS_STEP_NO_TEXT`, `SS_STEP_FEW_OPTIONS`, `SS_STEP_NO_CORRECT`
  (errores) y `SS_NO_FEEDBACK` (aviso: el comentario por opción es el sentido del tipo).
- **`decision_tree`** — conversación ramificada. `config: { characters: [{id, name,
  role}], nodes: [{id, speaker?, text, choices: [{id, text, to}], outcome?, feedback?}] }`.
  Empieza en el **primer nodo**; un nodo sin respuestas válidas (las que apuntan a un nodo
  inexistente no cuentan) es un **final** `good`/`bad`/`neutral` con su comentario.
  **Aspecto de app de mensajería** genérica (sin marcas ni logos; colores propios del chat,
  no de la paleta del curso, para que se reconozca al instante): cabecera con avatar de
  iniciales y papel; burbujas con colita (personaje en blanco a la izquierda, alumno en
  verde a la derecha con ✓✓); un momento sin personaje es narración (aviso centrado);
  finales como aviso de color; respuestas como sugerencias en la zona del teclado. Con
  varios personajes es un grupo: nombre en su color sobre cada burbuja. Al responder,
  «escribiendo…» 0,9 s antes de la réplica (no al restaurar, ni con `me-motion-none` o
  `prefers-reduced-motion`). El chat tiene altura máxima con scroll al último mensaje;
  `print.css` la quita para imprimir la conversación entera. Antes del final se
  puede **deshacer** la última respuesta; al llegar, «Volver a empezar» deja explorar otros
  caminos, pero **la nota la fija el primer final alcanzado** (`first`), como un intento
  único — sin esto, deshacer/repetir permitiría acertar por fuerza bruta. `correct` =
  `first === 'good'`. Estado `{path: [índice de respuesta por nodo], first}`; al restaurar
  se rehace el recorrido contra la config actual y se conserva el prefijo válido. **Sin
  ciclos** (`DT_CYCLE`): el peor caso de `suspend_data` es el camino más largo y el runtime
  corta igualmente a nº de nodos pasos. Editor: «Lleva a…» lista los momentos y ofrece «＋
  Un momento nuevo» (crea el nodo y lo enlaza de una vez). Validadores (`checkDecisionTree`):
  `DT_EMPTY`, `DT_NO_TEXT`, `DT_CHOICE_NO_TEXT`, `DT_DANGLING`, `DT_START_END`, `DT_CYCLE`,
  `DT_NO_GOOD_END` (solo si puntúa) — errores —; `DT_UNREACHABLE` y `DT_SPEAKER_MISSING`,
  avisos.
- **`calculator`** — reto numérico. `config: { mode: 'challenge'|'tool', variables: [{id,
  label, unit, value}], results: [{id, label, formula, unit, decimals}] }`. Fórmulas con
  un **evaluador propio de descenso recursivo** (`evalFormula`: `+ - * / ^`, paréntesis,
  identificadores, `round(x[,d]) min max abs sqrt floor ceil`) — nunca `eval`/`Function`
  (invariante anti-XSS), y solo funciones **propias** de la tabla (`hasOwnProperty`:
  `constructor(…)` no llega a `Function`). Copia deliberada en `src/calc/formula.ts` para
  el editor (vista previa «= 87 min» y `CALC_FORMULA`), y una tercera en Python en el
  preflight `validate_course` del contrato del GPT (`docs/gpt/contrato-course-json.md`
  §11): si cambia la gramática, cambiar las tres. Cada resultado puede usar los anteriores.
  - *Reto* (evaluable, Comprobar + `attempts`, feedback en modal): datos a la vista, el
    alumno escribe cada resultado. `parseUserNumber` admite coma decimal (y entonces el
    punto es de miles), espacios, € y %. Acierta si se desvía ≤ media unidad del último
    decimal pedido **o** ≤ 0,5 % (lo mayor: redondear a menos decimales no penaliza).
    Resuelto, los fallados muestran «Solución: …». Todo o nada, como el resto de tipos con
    intentos. Estado `{values, correct, attempts}` con cada valor saneado a `[0-9.,+-]`
    (máx. 16): ASCII acotado, sin factor de escape en el medidor.
  - *Calculadora* (informativa): el alumno escribe los datos (prerrellenos si el autor da
    valor) y ve los resultados al momento; completa al calcularlo todo una vez
    (`{used: true}`). `CALC_TOOL_SCORED` avisa si se marca evaluable.
  - Filas en rejilla etiqueta | caja | unidad (la celda de unidad existe siempre, vacía si
    no hay, para que las cajas queden alineadas). Validadores: `CALC_EMPTY`, `CALC_BAD_ID`
    (nombre no válido, reservado o repetido), `CALC_NO_VALUE` (reto con dato sin valor),
    `CALC_FORMULA`.

> El desglose de actividades con su estado, puntos y peso en la nota **no es una
> interacción**: es el informe de la pantalla de resultados (`renderResults` en
> `app.js`), ver `evaluacion-finalizacion.md`.

## Imagen (y vídeo de YouTube) en el markdown ligero
`![alt](assets/img/… | https://…)` en **línea propia** → `<figure class="me-md-img">` con
`.me-zoomable` (lightbox gratis). Ancho opcional en % del ancho de la diapositiva:
`![alt|50](ruta)` (clamp 10–100). Funciona en `student_text` **y** en cualquier cuerpo
que pase por `block()` (accordion, tabs, timeline). Solo bloque, no inline; solo rutas
`assets/` o http(s) (anti-inyección). Piezas relacionadas:
- Botón **🖼 Imagen** en la barra de `RichTextArea` (sube + optimiza + inserta) y **barra
  contextual «Imagen»** (alt, tamaño, sustituir, quitar): ver `editor-richtext.md`.
- `collectAssetPaths` (assetRefs.ts) extrae también rutas `assets/…` **incrustadas** en
  strings (no solo strings que empiezan por `assets/`; si no, la imagen no viajaría al
  ZIP).
- El TTS (`inlinePlain`) descarta la sintaxis de imagen (no se narra) — el bang-corchete
  `![...](...)` es genérico, así que la misma línea descarta igual un vídeo incrustado.

**Vídeo de YouTube, misma sintaxis exacta**: si la URL de `![alt|ancho](URL)` es un enlace
de YouTube reconocible (`youtubeId()` en `renderer.js`), la línea incrusta
`<div class="me-video"><iframe src="https://www.youtube-nocookie.com/embed/ID">` en vez de
una imagen — despacho por URL, no hay marca ni nodo distinto en el markdown ni en
`mdDialect.ts`. El ancho se aplica al contenedor `.me-video` (aspect-ratio 16:9 fijo,
mismo CSS que `visual_resource.kind: 'video_youtube'`, sin selector de proporción aquí).
Botón **▶ Vídeo** en la barra (pega el enlace completo — `watch?v=`, `youtu.be/`,
`embed/`, `shorts/` —, `extractYoutubeId()` en `src/media/youtube.ts` extrae el id y
valida antes de insertar). No genera asset ni entra en `collectAssetPaths` (no hay
archivo que empaquetar, igual que el `visual_resource` de YouTube).

**Pie de foto/vídeo**: cuarto grupo opcional entre comillas al final de la ruta,
`![alt|ancho](ruta "Pie")` — convención del `title` de markdown estándar, común a imagen
y vídeo (mismo `<figure class="me-md-img">` para los dos). El pie es texto plano en el
atributo (`<input>` simple en `ImageFigureNode.tsx`, sin barra de formato propia) pero el
runtime lo interpreta con `rich()` al construir el `<figcaption>`: negrita, cursiva y
enlaces escritos a mano (`**fuerte**`, `[texto](url)`) funcionan en el resultado, igual
que en el pie de un recurso visual (`visual_resource.caption`). Se serializa saneando
comillas literales (`"` → `'`) para no romper la sintaxis.

## Alineación de párrafo/encabezado
Prefijo de línea `{center}`/`{right}` (izquierda = sin marca, default implícito; nunca
`{left}`) → `style="text-align:…"` en el `<h2>`/`<h3>`/`<p>` de `renderer.js`. Se despoja
al principio de cada línea, ANTES de probar el resto de la sintaxis — así funciona igual
dentro de `student_text` y de cualquier cuerpo que pase por `block()` (accordion, tabs,
timeline). Fuera de alcance a propósito: listas y callouts (alinear texto suelto es «lo
típico», no ítems de lista ni cajas destacadas). Editor: tres botones en la barra de
`RichTextArea` vía `TextAlignExtension.ts` (ver `editor-richtext.md`).

## Roadmap (acordado, no implementado)
- **Animación secuencial** del contenido: revelar bloques en cascada. Encaja porque cada
  bloque (`<p>`, `<li>`, callout) ya sale como elemento independiente; se marcarían con
  `data-reveal` y se revelarían desde `app.js`.
- **Candado** (idea del catálogo de eXeLearning; el autor lo pospuso explícitamente):
  introducir un código que se obtiene resolviendo las actividades de la pantalla/tema. Es
  la única candidata que tocaría el gating/finalización además del catálogo (ver
  `evaluacion-finalizacion.md`); la alternativa simple es implementarlo como interacción
  puntuable normal (código correcto = completada) sin tocar el gating.

## Feedback en ventana modal
`showFeedbackModal(el, ok, data, returnFocus)` (`.me-fbmodal`) muestra el resultado en un
modal porque la caja `.me-feedback` inferior puede quedar fuera de la vista. Se cierra con
«Cerrar», clicando fuera o Esc, y devuelve el foco al control que lo provocó. Se usa en
`single_choice`, `true_false`, `scenario_decision`, `sort_steps`, `fill_blanks`,
`hotspots`, `match_pairs`, `classification` y `calculator`. Al abrirse **oculta** la caja en línea (no se
duplica el mensaje); esa caja solo se pinta al **restaurar** estado, para que al volver a
una pantalla resuelta siga viéndose el resultado (el modal nunca se reabre al restaurar).
Tras cerrar el modal en Emparejar/Clasificar quedan visibles las piezas marcadas en
rojo/verde. **No** se usa en `crossword`, `word_search` ni `puzzle` (siguen con la caja en
línea), ni en `scenario_steps`/`decision_tree`, cuyo comentario va dentro del propio paso.
