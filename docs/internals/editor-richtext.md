# Editor de texto enriquecido (`RichTextArea` + `mdDialect`)

> Doc interno de SCORMEditor. Índice en `CLAUDE.md`. El render del markdown ligero en la
> carcasa (sintaxis, callouts, bloque personalizado) está en `arquitectura-runtime.md`.

`RichTextArea` (`src/components/RichTextArea.tsx`) es la caja de texto de `student_text`
y de otros campos (feedback, escenarios…). Es un editor **WYSIWYG real sobre
TipTap/ProseMirror**: el valor que entra y sale de `onChange` sigue siendo el **markdown
ligero en texto plano** del proyecto (la invariante no cambia — nunca se guarda HTML); el
puente entre ambos mundos es `src/text/mdDialect.ts` (`mdToJson`/`jsonToMd`), un módulo
puro sin dependencias que parsea ese markdown a un documento ProseMirror (JSON) y lo
serializa de vuelta.

## `mdDialect.ts`: el puente markdown ↔ ProseMirror
La referencia semántica es el renderizador de la carcasa (`renderer.js` `mdToHtml` +
`interactions.js` `rich`): este módulo **replica sus regex y su orden de aplicación**
(enlaces primero, luego `**negrita**`, luego `*cursiva*`) para que el editor jamás
interprete un texto de forma distinta a como lo verá el alumno. No hay AST intermedio
compartido con el runtime — son implementaciones paralelas deliberadamente alineadas, no
un import cruzado (el runtime es HTML/CSS/JS plano sin build, ver `CLAUDE.md`).

Dos garantías, verificadas por `scripts/test-md-dialect.ts` (`npx tsx
scripts/test-md-dialect.ts`):
- **Round-trip exacto**: `jsonToMd(mdToJson(x)) === x` para un corpus canónico de casos
  (negrita/cursiva anidadas, listas con numeración no consecutiva, sublistas de varios
  niveles y mezcla viñeta/número, callouts con y sin
  cierre, imágenes con/sin ancho…). Algunos casos de entrada se **normalizan** de forma
  aceptada (viñetas con `*`/`•`/`–` → `-`, `1)` → `1.`, sangría de sublista de 3–4
  espacios o tabulador → 2 espacios por nivel…): para esos solo se exige
  equivalencia de render, no igualdad byte a byte.
- **Equivalencia de render**: para todos los strings del curso demo
  (`sampleCourse`, `src/schema/sample-course.ts`), el `mdToHtml` **real** de la carcasa
  (evaluado en un sandbox `vm` de Node, cargando los `.js` del runtime tal cual) produce
  el mismo HTML antes y después del round-trip. Si esto se cumple, abrir un texto con el
  editor y guardarlo sin tocar nada no puede cambiar lo que ve el alumno.

Al tocar el dialecto (nueva marca inline, nuevo tipo de bloque) hay que mantener alineadas
tres cosas: las regex de `mdDialect.ts`, las de `renderer.js`/`interactions.js` en el
runtime, y añadir el caso nuevo al corpus del test. **Ejecutar el test es obligatorio**
tras cualquier cambio en el dialecto — es la única red de seguridad contra una regresión
silenciosa en lo que ve el alumno.

## Esquema del editor (`EXTENSIONS` en `RichTextArea.tsx`)
`StarterKit` de TipTap **recortado** a lo que el dialecto soporta: encabezados solo
`level: 2 | 3` (`##`/`###`), `link` sin autolink (se inserta siempre por el editor de
enlace, nunca detectando URLs sueltas), y **desactivados** `strike`, `code`, `codeBlock`,
`blockquote`, `horizontalRule`, `underline` — no existen en el dialecto ni los renderiza
la carcasa; dejarlos activos permitiría crear contenido que luego no se ve igual. Dos
nodos propios en `src/components/tiptap/`:
- **`CalloutNode`** (`CalloutNode.tsx`): el bloque `::: tipo … :::`. `content: 'block+'`,
  `isolating: true` (no se fusiona con el párrafo de fuera al editar en el borde) y
  `defining: true`. Su `NodeView` (React) pinta cabecera con icono/etiqueta, un `<select>`
  para cambiar de tipo (estándar, presets personalizados guardados o «Personalizado a
  medida…») y un botón «quitar formato» (`unwrap`: sustituye el nodo por su contenido en
  el documento, conservando el texto). Un `addKeyboardShortcuts` propio maneja Enter sobre
  un párrafo vacío al final del bloque para «salir» de él (ProseMirror no hace
  `liftEmptyBlock` automático en nodos `isolating`).
- **`ImageFigureNode`** (`ImageFigureNode.tsx`): `![alt|ancho](ruta "pie")` como nodo
  **atómico** de bloque propio (nunca inline, igual que en la carcasa). Su `NodeView`
  resuelve la ruta del asset a una object URL cacheada (`imgUrlCache`, con limpieza en
  `import.meta.hot` en dev) y trae su propia barra integrada: alt, `<select>` de ancho
  (Tamaño real / 25–100 %), «Sustituir…» (sube otra imagen y borra el binario anterior
  si nadie más lo usa vía `removeAsset`), **pie de foto** (`<input>` de texto plano —
  el runtime lo interpreta con `rich()` al renderizar, así que negrita/cursiva/enlaces
  funcionan en el resultado aunque aquí no haya barra de formato propia) y «Quitar».
  **Mismo nodo para vídeo de YouTube**: si `src` es un enlace de YouTube
  (`extractYoutubeId()`, `src/media/youtube.ts`), el `NodeView` incrusta un iframe
  en vez de `<img>` — sin `type` de nodo aparte, `mdDialect.ts` no distingue los dos casos
  (el pie funciona igual para ambos). La barra cambia «Sustituir…» por un `<input>` con
  el enlace (editable, para corregirlo sin borrar y reinsertar).
- **Sublistas**: el `listItem` de StarterKit (`paragraph block*`) admite listas anidadas;
  se crean con los botones **Aumentar/Reducir sangría** de la barra (iconos `indent`/
  `outdent`, comandos `sinkListItem`/`liftListItem`, deshabilitados cuando no aplican) o
  con **Tab / Mayús+Tab** (atajos nativos de TipTap). `mdDialect.ts` las lee y escribe con
  una pila por sangría (2 espacios por nivel al serializar) — misma regla que la carcasa.
  Si un ítem acabara con varios párrafos (el dialecto no tiene «párrafo dentro de ítem»),
  se unen en su línea con un espacio: el serializador nunca descarta contenido.
- **`TextAlignExtension`** (`TextAlignExtension.ts`): no es un nodo, es una `Extension`
  con `addGlobalAttributes` sobre `heading`/`paragraph` (atributo `textAlign`,
  `null`/`'center'`/`'right'`) — reimplementación propia y mínima de
  `@tiptap/extension-text-align` (sin añadirla como dependencia). Comando
  `setTextAlign`: aplica `commands.updateAttributes(tipo, …)` a los dos tipos con
  `.map().every()`, **nunca `.every()` directo sobre el `.map`** — encadenar `.every()`
  a secas corta en el primer `false` (p. ej. «heading» cuando la selección es un
  párrafo) y nunca llega a aplicar el tipo que sí corresponde (bug real ya sufrido: el
  botón se marcaba activo pero no cambiaba nada visible).

`SelectAllFix` (extensión pequeña definida en `RichTextArea.tsx`) sustituye el `Mod-a` por
defecto de ProseMirror: la `AllSelection` que crea Ctrl/Cmd+A no queda bien sincronizada al
colapsarla luego con teclado (Fin, flechas) —con clic de ratón sí— y el Intro dejaba de
partir el párrafo (confirmado con Playwright, no era flakiness del test). Se reemplaza por
una `TextSelection` que cubre todo el documento: mismo resultado visible, navegación con
teclado fiable después.

`CustomBlockPanel.tsx` es el formulario de icono/color/título del bloque «Personalizado»;
lo comparten la barra (insertar uno nuevo) y el propio `CalloutNode` (editar el que ya
existe) para no duplicar el marcado. `IconPicker.tsx` es el popover de emoji curados (no
un selector de emoji del sistema). Los presets guardados (`customBlocks.ts`, localStorage)
son independientes del documento — es una lista de atajos, no se serializa en el markdown.

## Sincronización controlada
El componente sigue siendo **controlado** (`value`/`onChange`, misma interfaz que antes de
TipTap): al montar, `content: mdToJson(value)`; cada `onUpdate` serializa con `jsonToMd` y
llama `onChange`. Para no reaplicar por sync externo (deshacer global, carga de proyecto)
el mismo cambio que el editor acaba de emitir —lo que rompería el cursor—, se guarda en un
ref (`lastEmittedRef`) el último markdown que **este** editor produjo; el `useEffect` que
escucha `value` solo llama a `editor.commands.setContent(..., { emitUpdate: false })`
cuando el valor entrante difiere de ese ref.

## Barra de formato y edición contextual
El estado de la barra (qué botones están «encendidos») es reactivo vía `useEditorState`
(selector con `editor.isActive(...)`): solo re-renderiza cuando cambia algo de eso, no en
cada pulsación. El botón de enlace es contextual: si el cursor está dentro de un enlace
(`getMarkRange`) pasa a «Editar enlace» y precarga texto/URL; si no, «Insertar enlace»
abre el mismo panel vacío. El editor de enlace y el panel de bloque personalizado son
paneles inline bajo la barra (no flotantes); **Esc** los cierra (`handleEscClose` en el
`onKeyDown` del contenedor). Los tres botones de alineación (`align-left`/`-center`/
`-right`) van justo tras H2/H3; «izquierda» aparece activo por defecto (`!alignCenter &&
!alignRight`, ver `TextAlignExtension`) ya que es el estado sin marca, no uno propio.

### Botones de bloque destacado y presets (`RichTextArea.tsx`)
Tras el separador de la barra hay un botón por cada callout **estándar** — `CALLOUT_TYPES`
(6 fijos: 💡 Consejo, ⚠️ Atención, 📌 Importante, 🧠 ¿Sabías que…?, 💭 Reflexiona, 🧪 Caso
práctico) — que inserta el bloque con la selección actual como contenido inicial
(`insertCallout`). El séptimo tipo del catálogo (`info`, «ℹ️ Información») no tiene botón
rápido por espacio en la barra, pero sigue siendo alcanzable desde el `<select>` de
cabecera de cualquier callout ya insertado (`CALLOUT_ORDER` en `calloutMeta.ts`, que sí lo
incluye) — así un callout `info` de un proyecto importado se puede recrear o reasignar sin
tocar el markdown a mano. Tras los botones estándar, «＋ Personalizado» abre
`CustomBlockPanel` en modo insertar (icono/color/título libres) y, a su derecha, un chip
por cada **preset guardado** (`customBlocks.ts`, localStorage) con su icono y una ✕ para
borrarlo (`deletePreset`) — los presets son atajos de autor, no se serializan en el
documento.

### Bloques con estructura (`STRUCTURED_BLOCKS` en `calloutMeta.ts`)
Tras los callouts estándar, tres botones insertan `stats`/`compare`/`dodont` (render en
`arquitectura-runtime.md`). Son el mismo `CalloutNode` (`content: 'block+'`, admite
listas y H3 dentro), con dos añadidos: nacen con una **plantilla** de ejemplo (JSON de
ProseMirror en `template()`, en vez de la selección como párrafo) y su cabecera muestra
una **pista** de cómo rellenarlos (`.ed-callout-hint`). En el `<select>` de cabecera van
en su propio grupo «Con estructura». El editor los muestra como un callout con su
contenido tal cual (lista, encabezados), no maquetados: la maqueta se ve en Vista
estudiante. El corpus de `test-md-dialect.ts` incluye los tres (y uno sin estructura).

## Imágenes y vídeo de YouTube en el texto
Botón **🖼 Imagen** en la barra: `<label>` con `<input type="file">` oculto vestido de
botón (`.ed-rta-imgbtn`); sube con `optimizeImage`, guarda el asset
(`assets/img/txt-<ts>.<ext>`) e inserta un nodo `imageFigure` en la posición del cursor.
Comparte camino con el botón «Sustituir…» del propio nodo. El render final y sus
invariantes de seguridad: `interacciones.md` / `arquitectura-runtime.md`.

Botón **▶ Vídeo**: abre una barra inline (mismo patrón que «Enlace») pidiendo el enlace
completo de YouTube (`watch?v=`, `youtu.be/`, `embed/`, `shorts/` — el autor pega tal cual,
no hace falta teclear el id desnudo). `extractYoutubeId()` valida al insertar («No parece
un enlace de YouTube» si no cuadra) e inserta el **mismo** nodo `imageFigure` con `src` =
la URL completa; el `NodeView` decide cómo pintarlo (ver arriba). Sin diálogo de archivo:
a diferencia de la imagen, aquí no hay nada que subir ni que viaje en el ZIP.

## Integración en formularios (avisos importantes)
- `RichTextArea` **no debe envolverse en un `<label>`**: un `<label>` asocia su primer
  control etiquetable y le reenvía clic/`:hover`. Usar `<div className="ed-field">`.
- El documento ProseMirror vive solo en memoria del editor; `course.json` únicamente
  contiene el markdown ligero que produce `jsonToMd` — nunca el JSON del documento ni HTML.
