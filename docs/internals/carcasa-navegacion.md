# Navegación de la carcasa (topbar, menú, barra inferior)

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`. Complementa `arquitectura-runtime.md`
> (render de contenido, animaciones, manifiesto) con el **chrome de navegación** propio:
> cabecera, menú lateral y barra inferior del runtime (`src/runtime/`).

## Cabecera (topbar)
- **Cabecera minimal**: la topbar solo lleva tres zonas: `#me-toggle-menu` (☰) a la
  izquierda, `.me-topbar-title` (marca opcional + título del curso) centrada
  (`flex:1 1 auto; text-align:center`, con ellipsis), y `.me-topbar-right` (A−, A+,
  Pantalla completa) a la derecha. El resto de herramientas está en el menú lateral
  (Glosario/Recursos, al final) y en la barra inferior: Transcripción + el reproductor de
  audio a la izquierda e Imprimir, Ayuda y Cerrar a la derecha (ver más abajo). Iconos
  vía `icons.js`: `printer` Imprimir, `help-circle` Ayuda, `log-out` Cerrar, `menu` ☰,
  `maximize`/`minimize` Pantalla completa.
- **Tamaño del texto (A− / A+)**: `#me-btn-text-smaller/-larger` (`setupTextSize`, app.js)
  recorren `TEXT_SCALES` = 100/125/150/200 % y fijan `--me-text-scale` en `<html>`, que
  `styles.css` aplica como `html { font-size: calc(100% * var(--me-text-scale, 1)) }`.
  Toda la carcasa va en `rem`/`em`, así que escala entera sin tocar nada más; **no usar
  `px` para tipografía nueva** o quedará fuera del escalado (los botones A−/A+ sí van en
  `px` a propósito, para no crecer con lo que gobiernan). Existe porque el pellizco del
  móvil es poco fiable en un app shell de altura fija (`#me-app` = `100dvh`, contenido en
  scroll interno) y el zoom del navegador no es una opción para quien ve peor. La
  elección se guarda en `localStorage` (`me-text-scale`, con try/catch como el audio):
  es una preferencia del dispositivo, no del intento, por eso **no** va en
  `suspend_data` (el LMS la guardaría por alumno/intento y engordaría el campo). Cada
  botón se desactiva en su extremo. Con 200 % en móvil el título del curso de la topbar
  puede quedar sin sitio (ellipsis); es un compromiso aceptado.
- **Cerrar el curso**: `#me-btn-close` (barra inferior, icono `log-out`, en rojo `--me-error`) llama a `requestExit()`
  (app.js) — la misma lógica que el botón «Salir del curso» de la pantalla de
  Resultados: si `evaluateCompletion()` da `incomplete`, pide confirmación
  (`confirmExitIncomplete`, progreso guardado, se puede seguir luego); si no, cierra la
  sesión SCORM directamente (`exitCourse`: sale de la pantalla completa y ofrece «Volver
  al curso» de Moodle, ver `evaluacion-finalizacion.md`). Disponible en cualquier
  pantalla, no solo en Resultados.

## Menú lateral
- **Pantallas de introducción del paquete SCORM (`course.intro_screens`) sueltas al
  principio del menú**: `flatten()` (app.js) las coloca primero en `SCREENS` (mismo
  orden que `screenContainers()` en el editor) y `buildMenu()` las lista primero
  también, en un bloque `.me-menu-module.me-menu-intro` sin rótulo de módulo (no
  pertenecen a ninguno) — mismo `menuScreenLabel()` que el resto (prefijo
  «Actividad: » si procede). Ver `editor-pantallas.md` para el lado del editor (árbol,
  recetas).
- **`.me-menu-unit`, un único envoltorio sin tarjeta propia**: el `<div>` que agrupa
  cada bloque de pantallas del índice (unidad con título, pantallas propias/de cierre
  del módulo, bloque suelto entre unidades, unidad con el título oculto) no lleva fondo
  ni padding — solo `margin: 0 0 .4rem`, igual en los cinco casos, para que una pantalla
  se vea igual de espaciada esté donde esté. El agrupamiento visual de una unidad con
  título lo dan `.me-menu-utitle`/`.me-menu-uprog` (con su propio margen), no una caja
  alrededor de sus pantallas. (Antes había `.me-menu-modscreens`/`.me-menu-notitle`
  corrigiendo caso a caso encima de una tarjeta con fondo/padding heredada de
  `.me-menu-unit` — una sola regla sin tarjeta sustituye a las tres.)
- **Cierre, en dos niveles**: cada módulo puede llevar `closing_screens` (pantallas
  sueltas después de TODAS sus unidades, mismo `.me-menu-unit` sin rótulo de unidad) y
  el curso puede llevar `course.closing_screens` (simétrico a `intro_screens`, pero lo
  último de todo en `flatten()` — después incluso del test final y de Resultados). Ver
  «Evaluación» más abajo para cómo `buildMenu()` separa ese cierre del curso del bloque
  de Evaluación.
- **Pantallas sueltas entre unidades** (`unit.loose`): un elemento de `m.units` con
  `loose: true` no es una unidad real y no tiene bloque de menú aparte — sus pantallas
  cuelgan sueltas en un `.me-menu-unit` (mismo tratamiento que las propias/de cierre del
  módulo, arriba), en su sitio en el orden entre el bloque de la unidad anterior y el de
  la siguiente, sin `data-count`/mini-barra de progreso ni título propio.
- **Título de unidad oculto en el menú** (`unit.hide_menu_title`): a diferencia de
  `unit.loose`, esta unidad SÍ es real (título, resumen, validación… todo igual, ver
  `editor-pantallas.md`) — solo cambia lo que pinta `buildMenu()`: con el flag a `true`
  sus pantallas se listan sueltas en un `.me-menu-unit`, sin `.me-menu-utitle`/
  `.me-menu-uprog`. `flatten()` no cambia nada (sigue reportando `unit: u`, no `null`):
  la miga de pan de cada pantalla y el `coverLevel` de una portada siguen contando la
  unidad real — solo el menú lateral deja de nombrarla.
- **Prefijo «Actividad: » en las pantallas evaluables**: `menuScreenLabel(sc)` (app.js,
  usada por `buildMenu()` en los tres bucles que generan `.me-menu-link`: pantallas de
  módulo, de unidad y sintéticas finales) antepone `"Actividad: "` al rótulo del
  índice con el mismo criterio que la tarjeta amarilla del título de la propia
  diapositiva (`interaction.scored` + `score_source !== 'final_test'`, ver
  `arquitectura-runtime.md`) — misma señal, dos sitios, un solo criterio para no
  desincronizarlos. Sin icono aquí (el índice ya es texto plano); el «Test final»
  agrupado bajo `.me-menu-final` no lo lleva (no es una `interaction` suya, es todo el
  test).
- **Bloques diferenciados**: cada tema/unidad (`.me-menu-unit`) lleva un fondo sutil
  (`color-mix` sobre `--me-bg`) y esquinas redondeadas — minimalista, sin bordes duros
  ni sombras. Materiales (`.me-menu-materials`) y Evaluación (`.me-menu-final`, ver
  abajo) comparten el mismo tratamiento, así todos los "bloques" del índice se leen con
  el mismo lenguaje visual. El propio módulo no lleva tarjeta (su título ya destaca en
  mayúsculas); si hay más de uno, un filete fino los separa (`.me-menu-module +
  .me-menu-module`).
- **Materiales en el menú lateral**: `buildMenu()` (app.js) añade, tras los
  módulos/unidades y las pantallas sintéticas, un bloque `.me-menu-materials` (filete
  superior, además del fondo de bloque) con hasta tres entradas `.me-menu-material` — «📖
  Glosario», «🔗 Recursos» y «📄 Documentos» (icono + rótulo, `esc(glossaryTitle())`/
  `esc(bibliographyTitle())`/`esc(attachmentsTitle())`) — que abren el modal correspondiente
  (`data-modal="glossary|resources|documents"`) en vez de navegar. El modal de Documentos
  lista los PDF de `course.attachments` (`.me-docs`: título enlazado, descripción, «PDF ·
  peso» y enlaces Abrir/Descargar); la ruta se resuelve con `Interactions.asset` (blob URL
  en Vista estudiante, ruta relativa en el paquete) y solo se aceptan rutas
  `assets/…pdf` (filtro defensivo además de los validadores). Clase propia (no
  `.me-menu-link`): así `refreshMenuChecks()` no las confunde con pantallas (no tienen
  `data-idx` ni cuentan para el progreso). `glossary_title`/`bibliography_title` de
  `course.json` (defaults «Glosario» / «Recursos y bibliografía») rotulan estas
  entradas directamente al generarlas; se editan en la cabecera de `MaterialsEditor`
  (ver `editor-pantallas.md`). Cada entrada solo se genera si su sección tiene contenido
  (`glossary`/`bibliography` no vacíos) — igual que el bloque de Evaluación, que solo
  aparece si hay test final —; el bloque `.me-menu-materials` entero se omite si ambas
  están vacías. En el editor, `GlossaryEditor`/`BibliographyEditor` (`MaterialsEditor.tsx`)
  ofrecen un botón «Vaciar…» (con confirmación) para borrar todas las entradas de golpe,
  además del borrado uno a uno.
- **Evaluación (Test final/Resultados)**: `buildMenu()` agrupa las pantallas sintéticas
  finales bajo un bloque `.me-menu-final` con rótulo propio («EVALUACIÓN», mismo estilo
  que `.me-menu-mtitle`) — antes salían sueltas, una por `.me-menu-unit`, sin
  distinguirse visualmente del resto del índice ni agruparse entre sí. El rango de este
  bloque es `[idx, evalEnd)`, no `[idx, SCREENS.length)`: `evalEnd = SCREENS.length -
  course.closing_screens.length`, para no tragarse el cierre del curso (que va lo
  último de todo en `flatten()`) dentro de «Evaluación». El cierre del curso, si lo hay,
  sale aparte justo después, en OTRO bloque `.me-menu-final` con rótulo «CIERRE» — misma
  clase, mismo tratamiento visual, solo cambia el rótulo y el rango.
- **Pestaña de plegado del índice**: asa gris plana (`#me-menu-tab`, `.me-menu-tab`)
  centrada verticalmente en el borde derecho del menú, con flecha ◂; plegado el menú,
  asoma pegada al lateral izquierdo con ▸. Es un segundo control del mismo `toggleMenu()`
  que el ☰ de la topbar; `reflectMenuUI()` (app.js) sincroniza `aria-expanded` de ambos y
  el sentido de la flecha. Solo escritorio (en móvil el slide-over se maneja con el ☰ y
  la pestaña se oculta); tampoco sale en impresión.

## Barra inferior
La estructura (`index.html`): `.me-toolbar` → `.me-toolbar-center` (960px, centrado) →
dos grupos, `.me-toolbar-audio` (Transcripción, reproductor de audio, Pantalla completa
al final) y `.me-toolbar-nav` (Anterior, progreso, Siguiente).

- **Transcripción desactivable por pantalla** (`screen.transcript_hidden`): el botón se
  desactiva (atenuado, como A−/A+ en su extremo; título «Transcripción no disponible en
  esta pantalla») en vez de esconderse, para que la barra no cambie de forma al navegar
  (`refreshTranscriptButton`, app.js, en cada `goTo`); Alt+T anuncia que no hay. En el
  editor, la casilla además saca la pantalla de la narración automática (ver
  `tts-narracion.md`).
- **Centrado clásico, no grid**: `.me-toolbar` es `display:flex; justify-content:center`
  con un único hijo flexible (`.me-toolbar-center`, `width:100%; max-width:960px`) — el
  centrado de un solo elemento dentro de un padre `justify-content:center` es exacto
  pase lo que pase, sin necesitar columnas laterales de contrapeso. Esto **solo
  funciona** porque `.me-toolbar-tools` (Imprimir/Ayuda/Cerrar) sale del flujo normal vía `position:absolute`
  (ver más abajo): si compitiera por espacio como un hermano más, habría que volver a
  columnas simétricas para no desviar el centrado (ver la lección de CSS más abajo).
  Verificado por píxeles: `.me-toolbar-center` tiene el mismo `left`/`right`/`width`
  que `.me-screen`.
- **`justify-content:space-between` dentro de `.me-toolbar-center`** (no `center`): el
  espacio sobrante se autoestira en el **hueco central**, entre `.me-toolbar-audio` y
  `.me-toolbar-nav`, que quedan pegados a los márgenes de la diapositiva en vez de
  apelotonados en medio con aire sobrante a los lados.
- **Imprimir / Ayuda / Cerrar** (`.me-toolbar-tools`): viven al final de
  `.me-toolbar-audio` en el HTML. En **escritorio** salen del flujo (`position:absolute;
  top:50%; right:.9rem`, ancla en `.me-toolbar`) y quedan pegados al borde derecho de
  toda la barra, sin competir por espacio con el centrado. Entre 1025 y 1300 px el margen
  junto a la diapositiva no basta para los tres botones: la barra lleva relleno lateral
  **simétrico** (`calc(7rem + 40px)`), así el bloque central encoge sin pisarlos y sigue
  centrado. En **móvil** la fila de audio es una rejilla `1fr auto 1fr`: transcripción +
  reproductor (`.me-toolbar-media`) a la izquierda, **«Salir» con texto** (`.me-close-label`,
  solo visible en móvil) en el centro exacto e Imprimir/Ayuda (`.me-toolbar-aux`) a la
  derecha; `.me-toolbar-tools` se disuelve con `display:contents`. Si el reproductor está
  visible (`:has(.me-audio-player:not([hidden]))`) ocupa una fila entera y «Salir» e
  Imprimir/Ayuda bajan a la siguiente, porque en 360 px no cabe todo en una.
- **Pantalla completa** (`#me-btn-fullscreen`, cabecera, junto a A−/A+): Fullscreen API sobre `documentElement` con
  fallback `webkit`; icono `maximize`/`minimize` y title/aria-label se sincronizan en
  `fullscreenchange` (cubre también la salida con Esc). Arranca `hidden` y solo se
  muestra si el entorno lo permite (`fullscreenEnabled`): en un iframe de LMS sin
  `allowfullscreen` o en iPhone no aparece. El iframe de la Vista estudiante lleva
  `allowFullScreen` (`StudentPreview.tsx`) para que funcione también en la
  previsualización.
- **Reproductor de la narración de pantalla** (`#me-audio-player`, dentro de
  `.me-toolbar-audio`): play/pause, progreso + tiempo, sonido (mute) + volumen y
  velocidad. Se oculta entero si la pantalla no tiene `audio_src`. El botón de sonido
  activo usa turquesa (`--me-accent`, no `--me-primary`) para distinguirse de
  Anterior/Siguiente (azules); el seek y el volumen (`<input type=range>`) van en gris
  neutro (`accent-color: var(--me-muted)`) y más finos, como controles secundarios que
  no compiten visualmente con el turquesa de la barra de progreso ni el azul de la
  navegación. El selector de velocidad es compacto y ligero (fondo transparente, borde
  tenue, texto `--me-muted`). Detalle de comportamiento (play/pause robusto ante audio
  roto, seek, volumen persistido) en `tts-narracion.md` → «Reproductor de la narración
  (barra inferior)».
- **Anterior/Siguiente**: `.me-btn.me-nav-btn` (doble clase, no solo `.me-nav-btn`: más
  especificidad que `.me-btn` para que su padding gane pase lo que pase con el orden de
  las reglas) — menos padding que un `.me-btn` normal e icono de flecha propio
  (`arrow-left`/`arrow-right` de `icons.js`) en vez del triángulo tipográfico `◂`/`▸`.
  `refreshNavState()` (app.js) solo toca el texto del botón Siguiente («Siguiente» ↔
  «Fin» según la pantalla) a través de `.me-nav-btn-label` — un `textContent` directo
  sobre el botón borraría el icono en cada navegación (bug real detectado y corregido).
- **Barra de progreso**: `min-width: 240px` en escritorio (hay margen de sobra en el
  hueco central autoestirado — antes 100px, se veía innecesariamente estrecha); el
  media query de móvil la recorta a 90px.
- **Barra de progreso arrastrable** (`setupProgressScrub`, app.js; `role="slider"`): pulsar
  o deslizar por la barra cambia de pantalla, y con el foco funcionan ←/→/Inicio/Fin.
  Respeta **las mismas reglas que Siguiente** (`canAdvanceTo`/`maxReachable`: atrás
  siempre; adelante solo si la pantalla actual está satisfecha y `canNavigateTo`; en modo
  autor, libre) — nunca permite saltarse una pantalla obligatoria. Al arrastrar solo se
  **previsualiza** (barra + globo `.me-progress-tip` con «n / total — título», y el aviso
  «completa esta pantalla para avanzar» si se pasa del tope); la pantalla cambia al soltar,
  sin re-renderizar en cada píxel. Si hay test final con fallos pendientes, usa el mismo
  aviso `finalLeave` que Siguiente.
- **En móvil** (≤1024px, ver punto de corte más abajo): `.me-toolbar-center` pasa a
  `flex-direction: column-reverse` — como `.me-toolbar-audio` va primero en el HTML y
  `.me-toolbar-nav` segundo, el reverse pone **navegación arriba, audio abajo**. Ambos
  grupos se estiran de lado a lado (`align-self:stretch`): la navegación para que
  `.me-progress` (ya `flex:1`) aproveche el máximo ancho, y el de audio para que
  Pantalla completa tenga sitio donde anclarse a la derecha del todo sin quedar
  centrada con el resto (ver arriba). En pantallas muy estrechas (`.me-nav-btn-label`)
  se ocultan las etiquetas de texto de Anterior/Siguiente y quedan solo los iconos (con
  `aria-label` fijo como nombre accesible), y el reproductor de audio pierde
  tiempo/volumen (icono + play/pause + seek + velocidad bastan).

⚠ **Lección de CSS aprendida en este trabajo** (aplica a cualquier grid/flex anidado,
aunque el diseño final ya no dependa de ello): un `1fr` suelto en `grid-template-columns`
equivale a `minmax(auto,1fr)` — su mínimo es el *min-content* del contenido, no `0`. Si
ese contenido no cabe, el grid no encoge y es el **contenedor** el que se desborda. Y el
problema se repite en cascada: cualquier elemento que sea a la vez grid/flex **item** (de
un padre) y grid/flex **container** (de sus hijos) trae su propio `min-width:auto` por
defecto, que ignora el `minmax(0,…)` que hayas puesto en el nivel de abajo. Por eso
`.me-toolbar` y `.me-topbar` llevan `min-width: 0` explícito **como filas del grid de
`#me-app`** — sin eso, un título de curso largo desbordaba toda la carcasa en móvil
aunque `.me-topbar-title` ya tuviera su propio `min-width:0` un nivel más abajo.

## Punto de corte de la versión móvil
`@media (max-width: 1024px)` (sección «Responsive» de `styles.css`) gobierna el cambio
de layout completo: menú lateral pasa a panel deslizante (slide-over) sobre el
contenido, topbar se compacta, y la barra inferior apila navegación/audio (ver arriba).
Es un único punto de corte para todo el chrome de navegación — no confundir con los
`@media (max-width: 640px)` sueltos de widgets concretos (drag&drop, buscaminas de
palabras, navegación de preguntas…), que son ajustes de detalle independientes de este.

## Pantalla de instrucciones de uso (`type: 'guide'`)
Pantalla opcional (receta «Instrucciones de uso», solo en la introducción del paquete, ver
`editor-pantallas.md`) para quien llega por primera vez. Título por defecto «Cómo moverte
por esta unidad»: el paquete SCORM suele ser **una unidad dentro de un curso de Moodle**
con otras actividades (cuestionarios, foros), así que los textos hablan de «la unidad» y
remiten al aula virtual, no al «curso».
- **Arriba, el vídeo demo** (~1 min, 1280×720, con subtítulos VTT, póster y transcripción)
  que la receta trae consigo como assets del proyecto (ver «Vídeo demo» abajo). Es un
  `visual_resource` normal: el autor puede quitarlo o cambiarlo.
- **Debajo, el resumen de controles, que genera la carcasa, no el autor** (template
  `guide` + `guideHtml()` en `renderer.js`): así nunca se desfasa si cambia un botón, y no
  hay que reescribirlo en cada curso. Va en **desplegables por sección** con el marcado de
  `.me-fold` (el mismo de `foldHtml`, app.js los engancha con `wireFolds` y `setupPrint`
  los abre al imprimir): plegados si hay vídeo (son un repaso), abiertos si no lo hay (son
  el contenido). El `student_text` del autor, si existe, va como entradilla. El resumen no
  entra en la transcripción ni en la locución (la transcripción de la pantalla es la del
  vídeo), y el exportador `.elpx` no lo lleva (los controles de eXe son otros). La receta
  la crea con `transcript_hidden: true`: el vídeo ya lleva subtítulos y el resumen está
  debajo, así que el botón «Transcripción» no aporta nada ahí.
- **Solo explica lo que existe en ESTE paquete**: `guideInfo()` (app.js) deduce del curso
  si hay locución (algún `audio_src` → sección del reproductor), materiales
  (glosario/recursos/documentos), actividades evaluables (y `score_source` ≠
  `final_test`), test final, tiempos mínimos y el modo de `navigation` (frase de
  navegación libre/mixta/secuencial). Llega al template por `ctx.guide`. El vídeo, en
  cambio, es fijo y enseña todos los controles (por eso dice «muchas pantallas tienen
  narración», no «todas»).
- **Cada control se dibuja como una «tecla»** (`.me-guide-key`, solo dibujo, `aria-hidden`)
  con el mismo icono de `icons.js` que el botón real. Todo en `rem` para escalar con
  A−/A+. Si cambia un botón de la topbar/barra inferior, revisar también `guideHtml()` y
  regenerar el vídeo.
- `estimateDuration.ts` le suma `GUIDE_SECONDS` (60 s sin vídeo; 15 s con él, que ya se
  mide aparte).

### Vídeo demo (`scripts/video-instrucciones/`)
Se genera con scripts, no a mano, para poder rehacerlo cuando cambie la carcasa:
1. `capturar.mjs` exporta un curso de ejemplo (`demo-course.ts`, validado con
   `parseCourse`) con `build-scorm.mjs` y captura la **carcasa real** en cada estado
   (escritorio 1280×720 a 2,25×, móvil 390×844 a 3×) más la posición de cada control.
2. `montar.mjs` sintetiza la voz con ElevenLabs (clave y voz del `.env`, frase a frase
   con el instante de cada palabra; caché en `_tmp/voz`), anima las capturas en
   `anim.html` (cámara con zoom, foco atenuando el resto, rótulo y cursor con clic,
   sincronizados con `W('palabra')`) fotograma a fotograma, y escribe en
   `src/assets/instrucciones/` el MP4 (CRF 27, ~3,6 MB), el póster, el VTT (trozos
   cortados en la puntuación, tiempos reales de la voz) y `transcripcion.txt`.
   El guion está en `guion.mjs`.
La receta importa esos ficheros con `?url`/`?raw` y, al usarse, los descarga y los añade
al proyecto (`ScreenRecipe.assets`) antes de crear la pantalla. Rutas fijas
(`assets/instrucciones-uso.*`): dos pantallas de instrucciones comparten el mismo vídeo.
