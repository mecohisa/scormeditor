import type { ScreenType, InteractionType } from './course.schema'
import type { IconName } from '../components/Icon'

/**
 * Etiquetas en español para los valores internos del esquema. La UI del editor
 * nunca muestra los identificadores en crudo (`content_placeholder`,
 * `single_choice`…): siempre pasa por aquí. Los valores internos no cambian
 * (contrato de course.json).
 */
export const SCREEN_TYPE_LABELS: Record<ScreenType, string> = {
  /** Genérico: úsese `screenTypeLabel(t, { level, module, unit })` cuando se
   *  conozca el contenedor (introducción/módulo/unidad) para el rótulo real. */
  cover: 'Portada',
  objectives: 'Objetivos',
  route: 'Itinerario',
  content: 'Contenido',
  summary: 'Resumen',
  video: 'Vídeo',
  reflection: 'Reflexión',
  forum_prompt: 'Debate (foro)',
  unit_quiz: 'Test de unidad',
  content_placeholder: 'Pendiente de desarrollo',
  guide: 'Instrucciones de uso',
}

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  accordion: 'Desplegables (acordeón)',
  tabs: 'Pestañas',
  flip_cards: 'Tarjetas giratorias',
  match_pairs: 'Emparejar',
  sort_steps: 'Ordenar pasos',
  single_choice: 'Opción única',
  true_false: 'Verdadero / Falso',
  classification: 'Clasificar en categorías',
  scenario_decision: 'Escenario con decisión',
  case_practice: 'Caso práctico (reflexión + rúbrica)',
  hotspots: 'Zonas interactivas (imagen)',
  video: 'Vídeo interactivo',
  fill_blanks: 'Rellenar huecos',
  timeline: 'Línea de tiempo',
  flashcards: 'Tarjetas de repaso',
  html_embed: 'HTML a medida (código)',
  image_cards: 'Tarjetas con imagen (ventana)',
  before_after: 'Antes / después (comparador)',
  word_search: 'Sopa de letras',
  crossword: 'Crucigrama',
  hidden_image: 'Imagen oculta (preguntas)',
  az_quiz: 'Rosco A-Z (pasapalabra)',
  puzzle: 'Puzzle de imagen',
  scenario_steps: 'Caso por decisiones',
  decision_tree: 'Conversación ramificada',
  calculator: 'Reto numérico',
}

/** Icono compacto por tipo de pantalla (árbol del editor); nombres de `Icon`. */
export const SCREEN_TYPE_ICONS: Record<ScreenType, IconName> = {
  cover: 'home',
  objectives: 'target',
  route: 'route',
  content: 'file-text',
  summary: 'clipboard-list',
  video: 'film',
  reflection: 'message-dots',
  forum_prompt: 'forum',
  unit_quiz: 'clipboard-check',
  content_placeholder: 'placeholder',
  guide: 'help-circle',
}

/** Nivel de una portada (`type: 'cover'`) según el contenedor donde vive la
 *  pantalla — no hay campo propio en el esquema, se deriva en cada llamante
 *  (`m.screens`→'module', `u.screens`→'unit', `course.intro_screens`→'course').
 *  El mismo tipo cambia de rótulo y de diseño (`arquitectura-runtime.md`) solo
 *  por dónde está, así que basta con moverlo para que ambos se actualicen. */
export type CoverLevel = 'course' | 'module' | 'unit'

/** Etiqueta de un tipo de pantalla. Para `type: 'cover'`, `opts.level` decide
 *  «Portada del SCORM»/«Portada {módulo}»/«Portada {unidad}» (con el rótulo
 *  personalizado del curso, `course.module_label`/`unit_label` — por defecto
 *  los mismos); sin `level` (validators.ts, el desplegable «Tipo de pantalla»
 *  sin contexto de dónde acabaría) se queda en el nombre genérico «Portada». */
export function screenTypeLabel(t: string, opts?: { level?: CoverLevel; module?: string; unit?: string }): string {
  if (t === 'cover' && opts?.level) {
    if (opts.level === 'course') return 'Portada del SCORM'
    if (opts.level === 'module') return `Portada ${opts.module || 'Módulo'}`
    return `Portada ${opts.unit || 'Unidad'}`
  }
  return SCREEN_TYPE_LABELS[t as ScreenType] ?? t
}

export function screenTypeIcon(t: string): IconName {
  return SCREEN_TYPE_ICONS[t as ScreenType] ?? 'file-text'
}

/**
 * Color semántico por tipo de pantalla (árbol y chips del editor). Familias de
 * la paleta corporativa de teleformación, saturadas para leerse en iconos
 * pequeños: estructura=índigo, contenido=teal, práctica=ámbar,
 * evaluación=frambuesa, pendiente=gris.
 */
export const TYPE_COLORS = {
  estructura: '#5265c4',
  contenido: '#0f9490',
  practica: '#c27b06',
  evaluacion: '#c2417e',
  /** Glosario y Recursos/bibliografía (familia rosa corporativa, saturada a terracota). */
  materiales: '#bd5d52',
  otros: '#7d8694',
} as const

export const SCREEN_TYPE_COLORS: Record<ScreenType, string> = {
  cover: TYPE_COLORS.estructura,
  objectives: TYPE_COLORS.estructura,
  route: TYPE_COLORS.estructura,
  summary: TYPE_COLORS.estructura,
  content: TYPE_COLORS.contenido,
  video: TYPE_COLORS.contenido,
  reflection: TYPE_COLORS.practica,
  forum_prompt: TYPE_COLORS.practica,
  unit_quiz: TYPE_COLORS.evaluacion,
  content_placeholder: TYPE_COLORS.otros,
  guide: TYPE_COLORS.estructura,
}

export function screenTypeColor(t: string): string {
  return SCREEN_TYPE_COLORS[t as ScreenType] ?? TYPE_COLORS.contenido
}

export function interactionTypeLabel(t: string): string {
  return INTERACTION_TYPE_LABELS[t as InteractionType] ?? t
}
