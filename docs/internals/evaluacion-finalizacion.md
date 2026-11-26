# Navegación, gating, evaluación y finalización (`app.js`)

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`.

## Navegación y gating
- **Modo autor** (`window.__AUTHOR_MODE__`): navegación **libre y sin gating** para
  probar sin completar cada pantalla. En modo alumno, «Siguiente» exige
  `screenSatisfied(current)` (pantalla requerida vista / interacción respondida +
  `min_time_seconds`).

## Nota (`computeScore()`)
Depende de `scorm.rules.score_source`:
- `final_test`: nota **solo** del test final (`__final__`). Las interacciones evaluables
  de contenido NO puntúan (son práctica + requisito de finalización).
- `unit_tests`: nota **solo** de las interacciones evaluables.
- `mixed`: **media ponderada** de práctica y test final por `rules.mixed_final_weight`
  (% del test final, def. 70; cada bloque se normaliza a su propio %, **no** por suma de
  puntos — el reparto proporcional a los `points` diluía el test final: con puntos por
  defecto la práctica dominaba la nota).

## Finalización (completado)
`evaluateCompletion()` calcula y persiste la nota SIEMPRE (`computeScore`, `SCORM.setScore`)
— salvo en un paquete **sin nada evaluable** (ni test final ni interacciones `scored`: una
bienvenida, un vídeo de presentación), que no envía nota para que el LMS no anote un 0 — y
luego decide el `lesson_status` según `rules.completion_mode`:
- **`evaluation`** (por defecto, comportamiento clásico): completado si se ve el
  `min_required_screens_pct` de pantallas requeridas Y (si `require_interactions`) se han
  **completado** las interacciones evaluables. Una evaluable se marca `completed` al
  **resolverse** (acertar o agotar intentos): cuenta para la finalización **responderla**,
  no acertarla (salvo intentos ilimitados, donde hay que acertar). `SCORM.setStatus`:
  `incomplete` / `passed` / `failed` / `completed` (sin contenido calificable).
- `require_interactions` tiene **dos efectos**: cuenta para completar (solo en
  `evaluation`) y es el **gating de navegación** (`interactionOk`: «Siguiente» no avanza
  hasta resolver la interacción de una pantalla `required`) en **ambos** modos. Por eso la
  casilla de Ajustes sigue activa en `screens` («…para avanzar»): sin ella, en ese modo
  el alumno podía saltarse todas las actividades.
- **`screens`**: completado con solo llegar al final (`min_required_screens_pct`),
  **ignora** a propósito `require_interactions` y `rules.min_score` para el `lesson_status`
  (`incomplete` / `completed`, nunca `passed`/`failed`). Pensado para cursos con
  actividades evaluables donde no interesa que una mala nota bloquee la finalización SCORM.
  La nota se sigue calculando y enviando al LMS (`SCORM.setScore`, por si quiere usarla),
  pero **no se muestra**: `renderResults` la sustituye por un mensaje mínimo (⚠ incompleto
  / ✔ enhorabuena) sin desglose ni Reintentar — ver «Salir y Reintentar en Resultados» más
  abajo. Si está incompleto, en vez de desglose se lista qué **pantallas requeridas** faltan
  por visitar (`STATE.visited`), con acceso directo (`wireGotoButtons`, el mismo helper que
  usan los «Ir a la actividad →» del modo `evaluation`) — normalmente no se llega aquí sin
  haberlas visto (`screenSatisfied` lo exige en Vista alumno), pero puede pasar en modo autor
  o con navegación libre. El mensaje de enhorabuena usa `COURSE.course.title` («has completado «Título»»)
  en vez de la palabra «curso»: un SCORM puede representar un curso completo, un módulo, una
  unidad o un tema (invariante de `CLAUDE.md`), y el título es lo único universal que lo
  nombra; sin título cae a «lo has completado». `finalLeave` (más abajo) tampoco retiene al
  alumno en el test final aunque suspenda con intentos restantes.

- `mastery_score`/`masteryscore` van al manifiesto (`src/scorm/manifest.ts`);
  `rules.min_score` es el umbral APTO en el runtime. **Solo en modo `evaluation`**: en
  `screens` el manifiesto **no** lleva `masteryscore`, porque Moodle, al ver un
  `masteryscore` y recibir una nota, reescribe el `lesson_status` a `passed`/`failed`
  según ella — con lo que un alumno con nota baja quedaba `failed` y no completaba aunque
  la carcasa enviara `completed`, contradiciendo «la nota no decide» de ese modo.
- **Nota mínima única**: `rules.min_score` es el ÚNICO umbral. El banner APTO/NO APTO de
  la pantalla del test también lo usa, y solo aparece con `score_source: 'final_test'`
  (con `mixed`/`unit_tests` el test muestra solo su puntuación y remite a «Resultados»,
  que es quien dicta el veredicto). `final_test.pass_score` queda en el esquema por
  compatibilidad pero **se ignora** (pintaba un APTO propio que podía contradecir al del
  curso).

## Configuración de Moodle (finalización de la actividad)
Moodle no completa un SCORM solo con «Requerir ver»: hay que activar **«Requerir estado»**
y marcar **Completado y Pasado** (dentro de ese bloque es una O: vale cualquiera de los
dos; con otras condiciones como «Requerir ver» sí se suman). Hace falta marcar los dos
porque `evaluation` con contenido calificable envía `passed`/`failed` y nunca
`completed`, y sin nota envía `completed`. Un `failed` no completa nunca en Moodle: si
la finalización debe depender solo de llegar al final, usar `completion_mode: 'screens'`.
Verificado en Moodle 5.0. Para diagnosticar, mirar `cmi.core.lesson_status` en el informe
de intentos de la actividad.

## Cierre de sesión y modos del LMS
- `finishSession()` (app.js) es **idempotente** (flag `sessionFinished`) y se engancha a
  `beforeunload` **y** `pagehide` (Safari/iOS no dispara beforeunload de forma fiable).
  Si se cierra antes de cargar `course.json`, no evalúa nada.
- Al salir **sin terminar** se setea `cmi.core.exit = "suspend"` (`SCORM.setExit`), salvo
  `rules.allow_resume: false`. Moodle reanuda igualmente, pero otros LMS **descartan** el
  intento (y el `suspend_data`) si no se marca suspend.
- **Modo repaso**: el wrapper (`scorm_api.js`) lee `cmi.core.lesson_mode` al inicializar;
  con `review`/`browse` (`SCORM.isReview()`) los setters de tracking (`setStatus`,
  `setScore`, `setLocation`, `setSuspend`, `setExit`) son **no-op**: un alumno ya
  calificado puede repasar el curso sin machacar su estado ni su nota. La guarda vive en
  el wrapper a propósito: ninguna llamada de `app.js` puede saltársela.

## Salir y Reintentar en Resultados
Con `completion_mode: 'screens'`, `renderResults()` **no** pinta nada de lo de abajo: la
nota no decide nada, así que muestra solo un mensaje (⚠ incompleto / ✔ enhorabuena, sin
puntuación) y el botón Salir — confeti si está completo, nada de desglose ni Reintentar
(ver «Finalización» arriba). El resto de esta sección es el modo `evaluation`.

`renderResults()` añade acciones al pie:
- **Salir del curso** (siempre visible; botón centrado con el color de acento) y el botón
  Cerrar de la topbar acaban en `exitCourse()`: `finishSession()` (nota/tiempo/exit
  registrados), **salida de la pantalla completa** si el alumno la había activado (quien no
  sepa restaurar la ventana, sobre todo en móvil, no se queda atrapado en la despedida) e
  intento de `window.close()`; si el navegador no deja cerrar, se muestra una **despedida
  a pantalla completa** (`.me-exit-done`) que cubre la carcasa — la sesión SCORM ya está
  cerrada (LMSFinish) y navegar detrás no persistiría nada.
  - **«Volver al curso»**: `lmsCourseUrl()` busca la página del curso en las ventanas que
    contienen la carcasa (Moodle la sirve desde su mismo dominio): primero `M.cfg`
    (`wwwroot` + `courseId`), si no, un enlace a `course/view.php?id=`. Si la encuentra, la
    despedida muestra un botón que lleva ahí la ventana superior (`top.location`); si no
    (otro LMS, otro dominio, Vista estudiante del editor), el mensaje «ya puedes cerrar
    esta pestaña». No contempla la apertura de Moodle en ventana emergente (decisión del
    usuario: no la usan).
  - **Vuelta automática** (`rules.auto_return`, casilla «Al cerrar, volver solo al curso de
    Moodle» en Ajustes del curso, apagada por defecto): cuenta atrás de 20 s (WCAG 2.2.1) con
    el foco inicial en «Quedarme aquí»; cualquier tecla o clic la detiene. La despedida es
    un diálogo (carcasa inerte) sin región viva: se anuncia una vez al aparecer, no cada
    segundo. Apagada por defecto porque a algunos alumnos los desorienta que
    la página cambie sola. Con el curso **incompleto** pide confirmación primero
  (`confirmExitIncomplete`, modal propia con clases `.me-modal`): avisa de que no habrá
  calificación y de que el progreso queda guardado para reanudar (mensaje adaptado si
  `allow_resume: false`).
- El **desglose de calificaciones** va plegado en un accordion (`foldHtml`/`wireFolds`,
  app.js — mismas clases `.me-acc-*` que las interacciones, así `setupPrint` lo expande
  al imprimir), **siempre plegado por defecto**: el veredicto ya está en la cabecera
  (nota + APTO/NO APTO/incompleto), el desglose es detalle opcional, no un paso obligatorio.
- Con **NO APTO** (no incompleto, nota por debajo de `min_score`), un párrafo
  `.me-instructions` explica por qué antes de las acciones: «No has alcanzado la nota
  mínima del X% para aprobar» (+ referencia al desglose si lo hay). Con el curso
  **incompleto** el párrafo es el ya existente («Completa todas las pantallas…»).
- **Reintentar el curso** (solo **NO APTO** y si quedan intentos): `retryCourse()` limpia
  `STATE.interactions`/`results`/`finalScore` (práctica Y test final) pero **conserva
  `visited`** (el contenido ya se estudió; lo que se repite es la evaluación), vuelve a
  la primera pantalla y marca `incomplete`. `rules.attempts_allowed` (0 = ilimitados)
  se compara con `STATE.attempts` (intentos consumidos, persistido en `suspend_data`);
  se muestra cuántos quedan o que se agotaron.

## Desglose de calificaciones (`resultsBreakdownHtml`)
La tabla del fold «Desglose de calificaciones» en `renderResults()` se construye a partir
de `progressSnapshot()` (app.js), que reutiliza `computeScore`/`requiredScreens`/
`isRequired` — no es una interacción, es parte de la pantalla de resultados.

- Una fila por **pantalla evaluable** (`interaction.scored`, excluidas test final y
  resultados) con su **estado** (Pendiente/Hecha/Correcta/Parcial/Incorrecta), **puntos**
  (`score/maxScore`, «—» si pendiente) y **peso en la nota** (redondeado, sobre los puntos
  de TODAS las evaluables del curso — no solo las ya visitadas — normalizados según
  `score_source`/`mixed_final_weight`; «—» si esa evaluable no cuenta para la nota, p. ej.
  práctica con `score_source: 'final_test'`). Fila aparte para el **test final** si aplica
  (`finalRow`, con la misma estructura). Nota al pie explicando el reparto
  práctica/test final cuando `source` es `final_test` o `mixed`.
- **Saltar a la actividad**: cada fila pendiente lleva un botón «Ir a la actividad →» (o
  «Ir al test final →») con `data-idx` = índice en `SCREENS`; su `click` llama
  `goTo(idx, false, true)` — permitido siempre porque **ir hacia atrás en `SCREENS` no
  tiene gating** (`canNavigateTo`: `target <= current` es siempre `true`, y Resultados es
  la última pantalla). El intento SCORM sigue abierto: el alumno completa la actividad y
  puede volver a Resultados (por el menú) para ver la tabla recalculada.
- `progressSnapshot()` añade `idx` (índice en `SCREENS`) a cada item y a `finalRow`
  precisamente para estos botones; no tiene otro consumidor.

## Pantallas sintéticas (no están en `course.json`)
`flatten()` añade estas pantallas justo después de todo el contenido de
`course.json` (módulos/unidades) — pero antes de `course.closing_screens`, si
las hay: el cierre del paquete SCORM va lo último de todo, después incluso de
Resultados (ver `arquitectura-runtime.md`). Añade:
- **Test final** `__final__` (si `assessments.final_test` tiene preguntas):
  `renderFinalTest()` pinta el formulario; al **Comprobar test**, feedback por pregunta
  y guarda `STATE.results.__final__`. Las **opciones de cada pregunta se barajan**
  (`Interactions.shuffle`, determinista por `q.id`; `true_false` mantiene V/F); las
  preguntas conservan su orden. Seguro para restaurar: las respuestas se guardan por id. No hay texto fijo de instrucciones: solo
  `final_test.instructions` (configurable en el editor, vacío por defecto) y el
  contador de intentos si hay límite. En paginado, al comprobar (y al volver con el
  test ya comprobado) se aterriza en la **vista de resultado** (`showSummary`, `mode:
  'questions'|'summary'` dentro de `renderFinalTest`): puntuación (APTO/NO APTO si
  `score_source: 'final_test'`), aciertos «X de N», **intentos restantes** y acciones
  «Repetir el test» (solo si quedan intentos y <100%; salta a la primera fallada) y
  «Revisar las respuestas». Desde ella «Siguiente» sale de la pantalla y «Anterior» o
  los cuadritos vuelven a las preguntas; revisando, «Siguiente» tras la última vuelve
  a la vista de resultado. Con **respuestas cambiadas sin comprobar** (flag `dirty`),
  la vista de resultado muestra en su lugar la variante «Respuestas modificadas» con
  un botón **«Comprobar test»** (misma `comprobar()` que el submit del formulario).
  En modo clásico el banner inline incluye los intentos.
  Además, `finalLeave` (puente consultado por `goRelative`, limpiado en `goTo` como
  `finalNav`) intercepta «Siguiente» al salir del test según el resultado vigente — salvo
  con `completion_mode: 'screens'`, donde nunca retiene (primera comprobación de la
  función, ver «Finalización» arriba):
  con **100% o sin intentos restantes**, sale libre; **NO APTO con intentos** (solo
  `score_source: 'final_test'`), **bloquea** — modal sin «Continuar», acciones
  «Repetir el test» (a la primera fallada) / «Seguir revisando»; en modo autor el
  bloqueo se degrada a aviso para conservar la navegación libre. **Aprobado sin 100%**
  (o sin veredicto propio) con intentos: aviso «Quedarme en el test» / «Continuar»
  (`testDialog`, clases `.me-modal`/`.me-exit-*` reutilizadas).
  Con `final_test.one_question_per_screen` (checkbox «Una pregunta por pantalla» en el
  editor del test) el formulario se pagina: todos los fieldsets siguen en el DOM (la
  corrección `paint()` y la restauración no cambian) pero solo se muestra el actual.
  No hay botones propios: los **Anterior/Siguiente de la carcasa** mueven las preguntas
  mientras el test está en pantalla (puente `finalNav`, consultado por `goRelative` y
  `refreshNavState`; `goTo` lo limpia al salir) y solo cambian de diapositiva en los
  extremos. Encima va el **navegador de preguntas** (`.me-qnav-row`: rótulo
  «PREGUNTAS:» + `.me-qnav`, en columna en ≤640px): un cuadrito numerado por pregunta,
  clicable para saltar, con estado gris = sin responder, relleno = respondida,
  verde/rojo = corregida y borde en la actual. El contador «Pregunta X de N»
  (`.me-final-prog`) es solo para lectores de pantalla (`sr-only`, aria-live).
  «Comprobar test» se ve **solo en la última pregunta** (visible en las demás confundía:
  parecía comprobar solo esa pregunta; al repetir, la variante «Respuestas modificadas»
  de la vista de resultado ofrece el suyo); Enter en una intermedia avanza en vez de
  comprobar; comprobar con preguntas sin responder salta a la primera pendiente. Con
  0–1 preguntas no se pagina.
  Al **cambiar una respuesta** (paginado o no) se retira el feedback de esa pregunta y
  el banner de nota del envío anterior (los intentos siguientes parten limpios).
- **Resultados** `__results__` (si hay algo que calificar, y **siempre** en
  `completion_mode: 'screens'`): `renderResults()` muestra nota, **APTO/NO APTO** (o
  «Curso incompleto») y desglose (test final y/o actividades); en `screens`, solo el
  «¡Enhorabuena!» con confeti o las pantallas que faltan. Que en `screens` exista aunque
  no haya test ni actividades evaluables es para que un paquete sin test (el test se hace
  fuera, en Moodle; o una bienvenida) no acabe en una diapositiva con «Fin»
  deshabilitado y sin cierre. Ese caso **no** entra en `flattenScreens` de
  `state_codec.js`: así no cambia la huella `suspend_data` de los paquetes ya publicados
  (la pantalla no es obligatoria y el codec mapea por id).
  Estilos `.me-result-*` en `styles.css`.

Ambas se excluyen del postMessage de sync con el editor y no son editables como pantalla
(el test final se edita en `FinalTestEditor`; ver `editor-pantallas.md`).

## Dónde se configura
Todo esto vive en `scorm.rules` + `mastery_score`, editables en **⚙ Ajustes → Curso
(Finalización)** y, para el GPT, en `scorm.rules` del `course.json` (contrato §2).
