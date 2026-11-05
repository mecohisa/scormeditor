/**
 * Sistema de iconos propio del editor: SVG inline minimalistas (trazo redondeado,
 * `currentColor`, caja 24×24), sin dependencias. Un único origen para TODOS los
 * iconos de la interfaz — chrome (borrar, duplicar, mover…) y catálogo de tipos
 * de pantalla/interacción (`labels.ts`, `screenRecipes.ts`, `interactionRecipes.ts`).
 *
 * No aplica al CONTENIDO del alumno: la paleta de emojis de los bloques
 * personalizados (`RichTextArea`), los iconos de los callouts (van al course.json
 * y los pinta la carcasa) y todo `src/runtime/` quedan fuera a propósito.
 *
 * Uso: `<Icon name="trash" />` (16px por defecto; `size` para otros tamaños).
 * El tamaño se hereda del texto vía CSS (`.ed-ico`), el color siempre de
 * `currentColor`. Añadir un icono = añadir una entrada a `PATHS`.
 */

const SW = 1.8 // grosor de trazo homogéneo

const PATHS = {
  // ---- Chrome básico ---------------------------------------------------------
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l5 5L19.5 6.5" />,
  dot: <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-up': <path d="M6 15l6-6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  fold: <path d="M6 17.5l6-5.5 6 5.5M6 12l6-5.5 6 5.5" />,
  'arrow-up': <path d="M12 19V5M5 12l7-7 7 7" />,
  'arrow-down': <path d="M12 5v14M5 12l7 7 7-7" />,
  'arrow-left': <path d="M19 12H5M12 5l-7 7 7 7" />,
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7" />,
  undo: <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H10" />,
  redo: <path d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H14" />,
  trash: (
    <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 7l.8 12.5a2 2 0 0 0 2 1.9h6.4a2 2 0 0 0 2-1.9L18 7M10 11.5v5.5M14 11.5v5.5" />
  ),
  pencil: <path d="M4 20l1-4L16.5 4.5a2.12 2.12 0 0 1 3 3L8 19l-4 1zM13.5 7.5l3 3" />,
  copy: (
    <>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2" />
      <path d="M5.5 15H4.5a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2H13a2 2 0 0 1 2 2v1" />
    </>
  ),
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="5.5" r="1.4" /><circle cx="15" cy="5.5" r="1.4" />
      <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18.5" r="1.4" /><circle cx="15" cy="18.5" r="1.4" />
    </g>
  ),
  // Engranaje «típico» (lóbulos redondeados), no el asterisco de radios que
  // llevaba antes — de un vistazo se lee como «ajustes» en cualquier tamaño.
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  'help-circle': (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.7 2.2-2.7 3.8" />
      <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </>
  ),
  link: (
    <path d="M10.5 13.5a4.2 4.2 0 0 0 6 0l3.2-3.2a4.24 4.24 0 1 0-6-6L12 6M13.5 10.5a4.2 4.2 0 0 0-6 0l-3.2 3.2a4.24 4.24 0 1 0 6 6L12 18" />
  ),
  cloud: (
    <path d="M7 18.5a4.3 4.3 0 0 1-.5-8.6 5.5 5.5 0 0 1 10.7-1.7A4 4 0 0 1 17 18.5H7z" />
  ),
  folder: (
    <path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v8.8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17.5z" />
  ),
  save: (
    <>
      <path d="M5 3.5h11l3.5 3.5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z" />
      <path d="M8 3.5V9h7V3.5M8 21v-6.5h8V21" />
    </>
  ),
  download: (
    <path d="M12 3.5v11.5M7.5 11 12 15.5 16.5 11M4.5 18.5h15" />
  ),
  users: (
    <>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="16.3" cy="9" r="2.4" />
      <path d="M14.7 19c.3-2.2 1.9-4 3.8-4.4" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z" />,
  refresh: <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5" />,
  play: <path d="M8 6.2v11.6L17.5 12z" />,
  volume: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
      <path d="M15.5 9.2a4.3 4.3 0 0 1 0 5.6M18.3 6.6a8 8 0 0 1 0 10.8" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 6.7A9.7 9.7 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a13 13 0 0 1-3.2 3.6M6.6 7.9A13.3 13.3 0 0 0 2.5 12S6 17.7 12 17.7c1.1 0 2.1-.15 3-.42M10 10.3a2.8 2.8 0 0 0 3.9 3.9" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </>
  ),

  // ---- Estado / avisos ---------------------------------------------------------
  'alert-triangle': (
    <path d="M10.3 4.6L2.7 17.9a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0zM12 9.5v4.5M12 17.6h.01" />
  ),
  'alert-octagon': (
    <path d="M8 2.5h8L21.5 8v8L16 21.5H8L2.5 16V8zM12 7.5V13M12 16.6h.01" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.6h.01" />
    </>
  ),
  'circle-check': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.3 12.4l2.5 2.5 5-5.3" />
    </>
  ),
  'circle-x': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="8.5" />,

  // ---- Catálogo: tipos de pantalla ----------------------------------------------
  home: <path d="M4 11l8-7 8 7M6 9.5V19a1 1 0 0 0 1 1h3.2v-5.5h3.6V20H17a1 1 0 0 0 1-1V9.5" />,
  flag: <path d="M6 21V4M6 5c1.8-1 3-1 5 0s3.2 1 5 0v7c-1.8 1-3 1-5 0s-3.2-1-5 0" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.4" />
      <circle cx="18" cy="5" r="2.4" />
      <path d="M11.5 19h4.5a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h4.5" />
    </>
  ),
  'file-text': (
    <path d="M6 2.5h7.5l4.5 4.5v13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V4a1.5 1.5 0 0 1 1.5-1.5zM13.5 2.5V7H18M9 12.5h6M9 16.5h6" />
  ),
  'clipboard-list': (
    <>
      <rect x="5" y="4" width="14" height="17.5" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6M9 18.5h3.5" />
    </>
  ),
  'clipboard-check': (
    <>
      <rect x="5" y="4" width="14" height="17.5" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M8.8 13.7l2.3 2.3 4.3-4.7" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7.5 5v14M16.5 5v14M3 9.5h4.5M3 14.5h4.5M16.5 9.5H21M16.5 14.5H21" />
    </>
  ),
  'message-dots': (
    <>
      <path d="M12 20a8 8 0 1 0-7.1-4.3L3.5 20l4.4-1A8 8 0 0 0 12 20z" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="15.4" cy="12" r="1" />
      </g>
    </>
  ),
  forum: (
    <path d="M15 10.5a1.8 1.8 0 0 1-1.8 1.8H7L3.5 15.5V5.3a1.8 1.8 0 0 1 1.8-1.8h7.9A1.8 1.8 0 0 1 15 5.3zM18.5 8.5h.2a1.8 1.8 0 0 1 1.8 1.8v10.2L17 17.5h-6.7a1.8 1.8 0 0 1-1.8-1.8v-.2" />
  ),
  placeholder: <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3.4" />,
  square: <rect x="4" y="4" width="16" height="16" rx="2" />,
  book: <path d="M4.5 19.5v-15A2.5 2.5 0 0 1 7 2h12.5v20H7a2.5 2.5 0 0 1 0-5h12.5" />,

  // ---- Catálogo: recursos y disposición -----------------------------------------
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M20.5 15.5l-4.5-4.5-9 8" />
    </>
  ),
  'image-text': (
    <>
      <rect x="14" y="5.5" width="6.5" height="8.5" rx="1" />
      <path d="M3.5 6.5h8M3.5 10.5h8M3.5 14.5h8M3.5 18.5h17" />
    </>
  ),
  gallery: (
    <>
      <rect x="4" y="7.5" width="16" height="13" rx="2" />
      <circle cx="9" cy="12" r="1.3" />
      <path d="M20 17.5l-4-4-8 7M7 3.5h10" />
    </>
  ),
  'fit-left': (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <rect x="6.2" y="8" width="5.3" height="8" rx=".6" fill="currentColor" stroke="none" />
    </>
  ),
  'fit-center': (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <rect x="9.3" y="8" width="5.3" height="8" rx=".6" fill="currentColor" stroke="none" />
    </>
  ),
  'fit-full': (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <rect x="6.2" y="8" width="11.6" height="8" rx=".6" fill="currentColor" stroke="none" />
    </>
  ),

  // ---- Catálogo: tipos de interacción --------------------------------------------
  accordion: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M3.5 14.8h17M11 6.2l1 1.1 1-1.1" />
    </>
  ),
  tabs: (
    <>
      <path d="M3.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V8.5" />
      <path d="M3.5 8.5V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 10.5 5v3.5zM10.5 8.5V6A1.5 1.5 0 0 1 12 4.5h3A1.5 1.5 0 0 1 16.5 6v2.5M3.5 8.5h17" />
    </>
  ),
  flip: (
    <>
      <rect x="3" y="6" width="7" height="12" rx="1.5" />
      <rect x="14" y="6" width="7" height="12" rx="1.5" />
      <path d="M10.8 9.8h2.4m0 0L12 8.6m1.2 1.2L12 11M13.2 14.2h-2.4m0 0l1.2-1.2m-1.2 1.2l1.2 1.2" />
    </>
  ),
  timeline: (
    <>
      <path d="M3 12h18M7 12V8M12 12v4M17 12V8" />
      <g fill="currentColor" stroke="none">
        <circle cx="7" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="17" cy="12" r="1.5" />
      </g>
    </>
  ),
  hotspot: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 7.3v1.6M12 15.1v1.6M7.3 12h1.6M15.1 12h1.6" />
    </>
  ),
  compare: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M12 5v14M9 12H5.6m0 0l1.4-1.4M5.6 12L7 13.4M15 12h3.4m0 0l-1.4-1.4m1.4 1.4L17 13.4" />
    </>
  ),
  'true-false': (
    <path d="M3.5 8.5L7 12l5.5-6M15 14.5l5 5M20 14.5l-5 5" />
  ),
  'fill-blanks': (
    <path d="M4 6h16M4 11h4.5M11 12.8h5.5M4 16.5h16" />
  ),
  branch: (
    <>
      <circle cx="6" cy="5" r="2.2" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="9" r="2.2" />
      <path d="M6 7.2v9.6M6 15.5c0-3 3-4.3 6-4.3h3.8" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12.5" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
    </>
  ),
  sort: (
    <path d="M4 6h9M4 12h6M4 18h9M18 5v13m0 0l-2.5-2.5M18 18l2.5-2.5" />
  ),
  classify: (
    <>
      <rect x="3" y="14.5" width="5.2" height="6" rx="1" />
      <rect x="9.4" y="14.5" width="5.2" height="6" rx="1" />
      <rect x="15.8" y="14.5" width="5.2" height="6" rx="1" />
      <path d="M12 3.5v7m0 0L9.5 8M12 10.5L14.5 8" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" />
    </>
  ),
  'grid-search': (
    <>
      <g fill="currentColor" stroke="none">
        <circle cx="5.5" cy="5.5" r="1.1" /><circle cx="10.5" cy="5.5" r="1.1" /><circle cx="15.5" cy="5.5" r="1.1" />
        <circle cx="5.5" cy="10.5" r="1.1" /><circle cx="10.5" cy="10.5" r="1.1" />
        <circle cx="5.5" cy="15.5" r="1.1" />
      </g>
      <circle cx="14.5" cy="14.5" r="4.5" />
      <path d="M17.9 17.9l3.3 3.3" />
    </>
  ),
  'letter-a': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 16l3-8 3 8M10 13.3h4" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="7.5" width="16" height="13" rx="2" />
      <path d="M7 3.5h10M9 13h6" />
    </>
  ),
  puzzle: (
    <path d="M10 3.8a2 2 0 0 1 4 0V5h2.8A1.7 1.7 0 0 1 18.5 6.7V10h1.2a2 2 0 0 1 0 4h-1.2v3.3a1.7 1.7 0 0 1-1.7 1.7H14v1.2a2 2 0 0 1-4 0V19H7.2a1.7 1.7 0 0 1-1.7-1.7V14H4.3a2 2 0 0 1 0-4h1.2V6.7A1.7 1.7 0 0 1 7.2 5H10z" />
  ),
  code: <path d="M8.5 8L4 12l4.5 4M15.5 8L20 12l-4.5 4M13.5 5.5l-3 13" />,
  'align-left': <path d="M4 5h16M4 10h10M4 15h16M4 20h12" />,
  'align-center': <path d="M4 5h16M7 10h10M4 15h16M6 20h12" />,
  'align-right': <path d="M4 5h16M10 10h10M4 15h16M8 20h12" />,
  // Sangría de lista: líneas a la derecha + flecha hacia dentro / hacia fuera.
  indent: <path d="M11 5h9M11 10h9M11 15h9M4 20h16M4 8.5l3.5 2.5L4 13.5" />,
  outdent: <path d="M11 5h9M11 10h9M11 15h9M4 20h16M7.5 8.5L4 11l3.5 2.5" />,
  chart: (
    <path d="M3.5 20.5h17M6.5 20v-6M12 20V5.5M17.5 20v-9.5" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  steps: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M6.6 7.4l3.8 3.2M13.6 13.4l3.8 3.2" />
    </>
  ),
  chat: (
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v5a1.5 1.5 0 0 1-1.5 1.5H9l-3 2.5V12h-.5A1.5 1.5 0 0 1 4 10.5zM18.5 9h.2A1.3 1.3 0 0 1 20 10.3v4.4a1.3 1.3 0 0 1-1.3 1.3H18v2.5L15 16h-3.7a1.3 1.3 0 0 1-1.3-1.3V14.5" />
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8.5 11.5h1M11.5 11.5h1M14.5 11.5h1M8.5 15h1M11.5 15h1M14.5 15v3M8.5 18h1M11.5 18h1" />
    </>
  ),
  columns: (
    <>
      <rect x="3.5" y="5" width="7.5" height="14" rx="1.5" />
      <rect x="13" y="5" width="7.5" height="14" rx="1.5" />
      <path d="M5.8 10h3M15.3 10h3M5.8 14.5h3M15.3 14.5h3" />
    </>
  ),
  'do-dont': (
    <path d="M4 7.5l2 2 3.5-4M4 17.5l4-4M8 17.5l-4-4M12 7.5h8M12 15.5h8" />
  ),
} as const

export type IconName = keyof typeof PATHS

/** Todos los nombres (para depurar o listar). */
export const ICON_NAMES = Object.keys(PATHS) as IconName[]

export function Icon({ name, size = 16, className, title, color }: {
  name: IconName
  size?: number
  className?: string
  /** Título accesible; sin él, el icono es decorativo (aria-hidden). */
  title?: string
  /** Color fijo (p. ej. el semántico del catálogo); por defecto, `currentColor`. */
  color?: string
}) {
  return (
    <svg
      className={className ? `ed-ico ${className}` : 'ed-ico'}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={SW}
      strokeLinecap="round" strokeLinejoin="round"
      style={color ? { color } : undefined}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  )
}
