import type { InteractionType, Screen, ScreenInput, ScreenType } from './course.schema'
import { Interaction } from './course.schema'
import { interactionRecipe } from './interactionRecipes'
import type { IconName } from '../components/Icon'
import guideVideoUrl from '../assets/instrucciones/instrucciones-uso.mp4?url'
import guidePosterUrl from '../assets/instrucciones/instrucciones-uso.jpg?url'
import guideVttUrl from '../assets/instrucciones/instrucciones-uso.vtt?url'
import guideTranscript from '../assets/instrucciones/transcripcion.txt?raw'

/**
 * Recetas de creación de pantallas: presets con nombre didáctico que fijan de
 * golpe tipo + recurso visual + interacción, para que el autor novel no tenga
 * que combinar a mano las tres decisiones. La receta solo decide el estado
 * inicial: tras crear, el editor permite cambiar cualquier cosa (el desplegable
 * «Tipo de pantalla» sigue disponible como ajuste avanzado).
 *
 * Criterio de agrupado: QUÉ HACE EL ALUMNO en la pantalla — leer/explorar
 * (Contenido), hacer y recibir corrección (Práctica), puntuar (Evaluación).
 * Si puntúa o no es el DEFAULT DEL GRUPO (Práctica crea con scored:false,
 * Evaluación con scored:true), nunca una promesa de la tarjeta: la decisión
 * real se toma después en la interacción y en los Ajustes (score_source).
 *
 * No tocan el esquema ni el contrato de course.json: son una capa de UI.
 * `html_embed` y Verdadero/Falso no tienen tarjeta a propósito: el primero es
 * la interacción avanzada (sandbox) y el segundo es una variante de Pregunta.
 */

/** Vídeo demo de «Instrucciones de uso» (scripts/video-instrucciones/): rutas
 *  que ocupa en el proyecto. */
const GUIDE_VIDEO = 'assets/instrucciones-uso.mp4'
const GUIDE_POSTER = 'assets/instrucciones-uso.jpg'
const GUIDE_VTT = 'assets/instrucciones-uso.vtt'

async function fetchBlob(url: string, type: string): Promise<Blob> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`No se pudo cargar ${url} (${r.status})`)
  return new Blob([await r.arrayBuffer()], { type })
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

/** Interacción completa vía `Interaction.parse`: los defaults del esquema son la única fuente de verdad. */
function makeInteraction(type: InteractionType, extra?: Partial<Interaction>): Interaction {
  return Interaction.parse({ id: newId('i'), type, ...extra })
}

/** Interacción con el estado inicial del catálogo (`seed`) y sus textos habituales:
 *  los tipos con estructura anidada (pasos, nodos, fórmulas) no son usables vacíos. */
function makeRecipeInteraction(type: InteractionType): Interaction {
  const rec = interactionRecipe(type)
  return makeInteraction(type, {
    prompt: rec.defaultPrompt ?? '',
    instructions: rec.defaultInstructions ?? '',
    ...rec.seed?.(),
  })
}

/** Índice tras la última pantalla cuyo tipo esté en `types` (0 si no hay ninguna). */
function afterLast(screens: Screen[], types: ScreenType[]): number {
  let idx = 0
  screens.forEach((s, i) => {
    if (types.includes(s.type)) idx = i + 1
  })
  return idx
}

export type RecipeGroup = 'estructura' | 'contenido' | 'practica' | 'evaluacion' | 'otros'

export const RECIPE_GROUPS: RecipeGroup[] = ['estructura', 'contenido', 'practica', 'evaluacion', 'otros']

export const RECIPE_GROUP_LABELS: Record<RecipeGroup, string> = {
  estructura: 'Estructura',
  contenido: 'Contenido',
  practica: 'Práctica',
  evaluacion: 'Evaluación',
  otros: 'Otros',
}

/** Color del chip de icono de las tarjetas, por grupo (ver `TYPE_COLORS` en labels.ts). */
export const RECIPE_GROUP_COLORS: Record<RecipeGroup, string> = {
  estructura: '#5265c4',
  contenido: '#0f9490',
  practica: '#c27b06',
  evaluacion: '#c2417e',
  otros: '#7d8694',
}

/** Subtítulo del grupo: comunica la intención y el default de puntuación. */
export const RECIPE_GROUP_HINTS: Record<RecipeGroup, string> = {
  estructura: 'El armazón de la unidad.',
  contenido: 'El alumno lee, ve o explora; no hay respuestas.',
  practica: 'El alumno hace algo y recibe corrección; de serie no puntúa.',
  evaluacion: 'Cuenta para la nota (según los Ajustes del curso).',
  otros: '',
}

export type ScreenRecipe = {
  key: string
  icon: IconName
  label: string
  /** Línea breve de la tarjeta: qué hace el alumno (sin promesas de nota). */
  description: string
  group: RecipeGroup
  /** Tipo de pantalla resultante (también decide el atenuado si es única por unidad). */
  type: ScreenType
  /** Preset adicional sobre el tipo (recurso visual, interacción…). */
  extras?: () => Partial<ScreenInput>
  /** Archivos que la receta trae consigo (ruta `assets/…` → contenido), que se
   *  añaden al proyecto antes de crear la pantalla. Asíncrono: se descargan
   *  del propio editor al usar la receta, no viajan en el bundle principal. */
  assets?: () => Promise<Record<string, Blob>>
  /** Título inicial; si falta, el del store («Nueva pantalla»). Recibe el
   *  contenedor (unidad o módulo: solo se usa su título). */
  defaultTitle?: string | ((container: { title: string }) => string)
  /** Índice de inserción en el contenedor; por defecto, al final. */
  place?: (screens: Screen[]) => number
  /** Sugerir una sola pantalla de este tipo por contenedor (atenúa la tarjeta, no bloquea). */
  uniquePerUnit?: boolean
  /** Tarjeta discreta (grupo «Otros»). */
  subtle?: boolean
  /** Restringe la tarjeta a un tipo de contenedor concreto: 'unit' (solo dentro
   *  de una unidad), 'module' (solo entre las pantallas propias del módulo,
   *  antes de sus unidades) o 'course' (solo entre las pantallas sueltas de
   *  introducción del curso, antes de cualquier módulo). Sin `scope`, la
   *  receta vale para los tres. */
  scope?: 'unit' | 'module' | 'course'
  /** Fecha ISO de publicación: muestra la etiqueta «Nueva» un tiempo (`newBadge.ts`). */
  since?: string
}

export const SCREEN_RECIPES: ScreenRecipe[] = [
  // --- Estructura -------------------------------------------------------------
  {
    key: 'scorm-cover',
    icon: 'star',
    label: 'Portada del SCORM',
    description: 'Presentación de todo el paquete: lo primero que ve el alumno. Se coloca al principio de la introducción.',
    group: 'estructura',
    type: 'cover',
    scope: 'course',
    defaultTitle: (c) => c.title,
    place: () => 0,
    uniquePerUnit: true,
  },
  {
    // Opcional (no viene en el curso de serie): la carcasa genera sola el
    // contenido con los controles reales del paquete (ver template `guide` en
    // renderer.js); el texto del autor, si lo hay, va como entradilla.
    key: 'guide',
    icon: 'help-circle',
    label: 'Instrucciones de uso',
    description: 'Vídeo demo de 1 min y resumen de los controles (navegación, audio, transcripción, imprimir…) para quien llega por primera vez. Se coloca tras la portada.',
    group: 'estructura',
    type: 'guide',
    scope: 'course',
    extras: () => ({
      visual_resource: {
        kind: 'video_file', src: GUIDE_VIDEO, poster: GUIDE_POSTER, alt: '', has_voice: true, layout: 'top',
        tracks: [{ kind: 'subtitles', src: GUIDE_VTT, lang: 'es', label: 'Español' }],
      },
      transcript: guideTranscript.trim(),
      // El vídeo ya lleva subtítulos y el resumen de controles está debajo: el
      // botón «Transcripción» no aporta nada aquí.
      transcript_hidden: true,
    }),
    assets: async () => ({
      [GUIDE_VIDEO]: await fetchBlob(guideVideoUrl, 'video/mp4'),
      [GUIDE_POSTER]: await fetchBlob(guidePosterUrl, 'image/jpeg'),
      [GUIDE_VTT]: await fetchBlob(guideVttUrl, 'text/vtt'),
    }),
    defaultTitle: 'Cómo moverte por esta unidad',
    place: (ss) => afterLast(ss, ['cover']),
    uniquePerUnit: true,
  },
  {
    key: 'cover',
    icon: 'home',
    label: 'Portada unidad',
    description: 'Presentación de la unidad. Se coloca al principio.',
    group: 'estructura',
    type: 'cover',
    scope: 'unit',
    defaultTitle: (u) => u.title,
    place: () => 0,
    uniquePerUnit: true,
  },
  {
    key: 'module-cover',
    icon: 'flag',
    label: 'Portada módulo',
    description: 'Presentación de todo el módulo: más peso visual que la portada de unidad. Se coloca al principio, antes de sus unidades.',
    group: 'estructura',
    type: 'cover',
    scope: 'module',
    defaultTitle: (m) => m.title,
    place: () => 0,
    uniquePerUnit: true,
  },
  {
    key: 'objectives',
    icon: 'target',
    label: 'Objetivos',
    description: 'Qué va a aprender el alumno en esta unidad.',
    group: 'estructura',
    type: 'objectives',
    defaultTitle: 'Objetivos',
    place: (ss) => afterLast(ss, ['cover']),
    uniquePerUnit: true,
  },
  {
    key: 'route',
    icon: 'route',
    label: 'Itinerario',
    description: 'Cómo se organiza la unidad y qué camino seguir.',
    group: 'estructura',
    type: 'route',
    defaultTitle: 'Itinerario',
    place: (ss) => afterLast(ss, ['cover', 'objectives']),
    uniquePerUnit: true,
  },
  {
    key: 'summary',
    icon: 'clipboard-list',
    label: 'Resumen',
    description: 'Ideas clave para cerrar la unidad. Se coloca al final.',
    group: 'estructura',
    type: 'summary',
    defaultTitle: 'Resumen',
    place: (ss) => {
      const qi = ss.findIndex((s) => s.type === 'unit_quiz')
      return qi >= 0 ? qi : ss.length
    },
    uniquePerUnit: true,
  },

  // --- Contenido (leer, ver, explorar) -----------------------------------------
  {
    key: 'text',
    icon: 'file-text',
    label: 'Texto',
    description: 'Texto con formato: encabezados, listas, destacados…',
    group: 'contenido',
    type: 'content',
  },
  {
    key: 'text-image',
    icon: 'image-text',
    label: 'Texto + imagen',
    description: 'Texto acompañado de una imagen a un lado.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ visual_resource: { kind: 'image', layout: 'right', media_width: '50' } }),
  },
  {
    key: 'video',
    icon: 'film',
    label: 'Vídeo',
    description: 'Vídeo de YouTube o archivo propio, con transcripción.',
    group: 'contenido',
    type: 'video',
    extras: () => ({ visual_resource: { kind: 'video_youtube', layout: 'top' } }),
  },
  {
    key: 'accordion',
    icon: 'accordion',
    label: 'Acordeón',
    description: 'Contenido troceado en secciones desplegables.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('accordion') }),
  },
  {
    key: 'tabs',
    icon: 'tabs',
    label: 'Pestañas',
    description: 'Contenido organizado en pestañas paralelas.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('tabs') }),
  },
  {
    key: 'flip-cards',
    icon: 'flip',
    label: 'Tarjetas giratorias',
    description: 'Tarjetas que se voltean para descubrir el reverso.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('flip_cards') }),
  },
  {
    key: 'timeline',
    icon: 'timeline',
    label: 'Línea de tiempo',
    description: 'Hitos ordenados cronológicamente.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('timeline') }),
  },
  {
    key: 'hotspots',
    icon: 'hotspot',
    label: 'Imagen explorable',
    description: 'Imagen con puntos interactivos que amplían información.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('hotspots') }),
  },
  {
    key: 'image-cards',
    icon: 'gallery',
    label: 'Tarjetas de imagen',
    description: 'Tarjetas con imagen que se abren en grande con su explicación.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('image_cards') }),
  },
  {
    key: 'before-after',
    icon: 'compare',
    label: 'Antes / después',
    description: 'Dos imágenes superpuestas con un divisor deslizante para compararlas.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('before_after') }),
  },
  // Bloques con estructura del texto (renderer.js): la pantalla nace con el
  // bloque de ejemplo en `student_text`; luego se edita en la caja de texto.
  {
    key: 'stats',
    icon: 'chart',
    label: 'Cifras destacadas',
    description: 'Datos clave en tarjetas, con la cifra en grande.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ student_text: '::: stats\n- **80 %** de …\n- **3 de cada 10** …\n- **24 h** …\n:::' }),
    since: '2026-10-28',
  },
  {
    key: 'compare',
    icon: 'columns',
    label: 'Comparativa',
    description: 'Dos o tres opciones en columnas, frente a frente.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ student_text: '::: compare\n### Opción A\n- …\n- …\n### Opción B\n- …\n- …\n:::' }),
    since: '2026-10-28',
  },
  {
    key: 'do-dont',
    icon: 'do-dont',
    label: 'Qué hacer y qué evitar',
    description: 'Dos columnas: buenas prácticas con ✓ y errores con ✗.',
    group: 'contenido',
    type: 'content',
    extras: () => ({ student_text: '::: dodont\n### Qué hacer\n- …\n- …\n### Qué evitar\n- …\n- …\n:::' }),
    since: '2026-10-28',
  },

  // --- Práctica (hacer y recibir corrección; scored:false de serie) ------------
  {
    key: 'single-choice',
    icon: 'circle-check',
    label: 'Pregunta de opciones',
    description: 'El alumno elige la respuesta y recibe feedback.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('single_choice') }),
  },
  {
    key: 'match-pairs',
    icon: 'link',
    label: 'Emparejar',
    description: 'Unir conceptos relacionados entre sí.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('match_pairs', { config: { force_complete: false } }) }),
  },
  {
    key: 'sort-steps',
    icon: 'sort',
    label: 'Ordenar pasos',
    description: 'Colocar los elementos en su orden correcto.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('sort_steps') }),
  },
  {
    key: 'classification',
    icon: 'classify',
    label: 'Clasificar',
    description: 'Repartir elementos en sus categorías.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('classification', { config: { force_complete: false } }) }),
  },
  {
    key: 'fill-blanks',
    icon: 'fill-blanks',
    label: 'Rellenar huecos',
    description: 'Completar un texto con las palabras que faltan.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('fill_blanks') }),
  },
  {
    key: 'scenario',
    icon: 'branch',
    label: 'Escenario con decisiones',
    description: 'Situación simulada donde cada decisión tiene consecuencias.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('scenario_decision') }),
  },
  {
    key: 'scenario-steps',
    icon: 'steps',
    label: 'Caso por decisiones',
    description: 'Un caso que avanza paso a paso: una decisión en cada uno, con comentario y resumen final.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeRecipeInteraction('scenario_steps') }),
    since: '2026-10-28',
  },
  {
    key: 'decision-tree',
    icon: 'chat',
    label: 'Conversación ramificada',
    description: 'Diálogo con personajes: cada respuesta lleva a otra situación y a un final distinto.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeRecipeInteraction('decision_tree') }),
    since: '2026-10-28',
  },
  {
    key: 'calculator',
    icon: 'calculator',
    label: 'Reto numérico',
    description: 'Calcular un resultado (dosis, costes, ratios…) a partir de unos datos.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeRecipeInteraction('calculator') }),
    since: '2026-10-28',
  },
  {
    key: 'case',
    icon: 'briefcase',
    label: 'Caso práctico',
    description: 'Situación real con tarea; la solución va en el feedback.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('case_practice') }),
  },
  {
    key: 'flashcards',
    icon: 'cards',
    label: 'Fichas de repaso',
    description: 'Tarjetas pregunta-respuesta para repasar lo aprendido.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('flashcards') }),
  },
  {
    key: 'word-search',
    icon: 'grid-search',
    label: 'Sopa de letras',
    description: 'Encontrar en el tablero las palabras clave del tema.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('word_search') }),
  },
  {
    key: 'crossword',
    icon: 'grid',
    label: 'Crucigrama',
    description: 'Rellenar el crucigrama generado a partir de palabras y pistas.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('crossword', { config: { force_complete: false } }) }),
  },
  {
    key: 'hidden-image',
    icon: 'eye',
    label: 'Imagen oculta',
    description: 'Cada respuesta correcta destapa parte de una imagen.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('hidden_image') }),
  },
  {
    key: 'az-quiz',
    icon: 'letter-a',
    label: 'Rosco A-Z',
    description: 'Tipo pasapalabra: una definición por letra, respuesta escrita.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('az_quiz') }),
  },
  {
    key: 'puzzle',
    icon: 'puzzle',
    label: 'Puzzle de imagen',
    description: 'Recomponer una imagen intercambiando sus piezas.',
    group: 'practica',
    type: 'content',
    extras: () => ({ interaction: makeInteraction('puzzle') }),
  },
  {
    key: 'reflection',
    icon: 'message-dots',
    label: 'Reflexión',
    description: 'Pregunta abierta para pensar; el enunciado va en el texto.',
    group: 'practica',
    type: 'reflection',
  },
  {
    key: 'forum',
    icon: 'forum',
    label: 'Debate en foro',
    description: 'Enunciado para debatir en el foro del campus.',
    group: 'practica',
    type: 'forum_prompt',
  },

  // --- Evaluación (scored:true de serie) ----------------------------------------
  {
    key: 'unit-quiz',
    icon: 'clipboard-check',
    label: 'Test de unidad',
    description: 'Pregunta que cierra la unidad. Se coloca al final.',
    group: 'evaluacion',
    type: 'unit_quiz',
    defaultTitle: 'Comprueba lo aprendido',
    extras: () => ({ interaction: makeInteraction('single_choice', { scored: true, points: 1 }) }),
    place: (ss) => ss.length,
    uniquePerUnit: true,
  },

  // --- Otros ---------------------------------------------------------------------
  {
    key: 'placeholder',
    icon: 'placeholder',
    label: 'Pendiente de desarrollo',
    description: 'Marcador para contenido que se desarrollará más adelante.',
    group: 'otros',
    type: 'content_placeholder',
    subtle: true,
  },
  {
    key: 'blank',
    icon: 'square',
    label: 'En blanco',
    description: 'Pantalla sin preconfigurar, para montarla a mano.',
    group: 'otros',
    type: 'content',
    subtle: true,
  },
]
