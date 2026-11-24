/**
 * Decisión de mapeo: una `Interaction` del editor → un `ElpxComponent`.
 *
 * Los tipos con equivalente nativo fiel se reconstruyen como su iDevice de eXe;
 * el resto se degrada a `text` conservando el contenido (ver `idevices.ts`).
 * `NATIVE_IDEVICE` documenta, para el resumen y los docs, a qué iDevice va cada
 * tipo (o 'text' si degrada).
 */
import type { Interaction } from '../../schema/course.schema'
import type { ConvertCtx, ElpxComponent } from './types'
import {
  textIdevice,
  degradeToTextHtml,
  wordSearchIdevice,
  crosswordIdevice,
  completeIdevice,
  quickQuestionsIdevice,
  relateIdevice,
  flipcardsIdevice,
  beforeAfterIdevice,
} from './idevices'

/** Tipo de interacción → nombre del iDevice destino (o 'text' si se degrada). */
export const NATIVE_IDEVICE: Record<string, string> = {
  word_search: 'word-search',
  crossword: 'crossword',
  fill_blanks: 'complete',
  single_choice: 'quick-questions',
  true_false: 'quick-questions',
  scenario_decision: 'quick-questions',
  match_pairs: 'relate',
  flip_cards: 'flipcards',
  flashcards: 'flipcards',
  before_after: 'beforeafter',
  // Degradan a `text` (contenido preservado y editable en eXe):
  accordion: 'text',
  tabs: 'text',
  timeline: 'text',
  image_cards: 'text',
  classification: 'text',
  sort_steps: 'text',
  az_quiz: 'text',
  hidden_image: 'text',
  puzzle: 'text',
  hotspots: 'text',
  case_practice: 'text',
  video: 'text',
  html_embed: 'text',
  scenario_steps: 'text',
  decision_tree: 'text',
  calculator: 'text',
}

/** Motivo legible de por qué un tipo degrada a `text` (para el resumen). */
const DEGRADE_REASON: Record<string, string> = {
  accordion: 'acordeón → secciones de texto',
  tabs: 'pestañas → secciones de texto',
  timeline: 'línea de tiempo → lista de hitos',
  image_cards: 'tarjetas de imagen → imágenes con texto',
  classification: 'clasificación → listas por categoría',
  sort_steps: 'ordenar pasos → lista ordenada (solución)',
  az_quiz: 'rosco A-Z → lista de definiciones',
  hidden_image: 'imagen oculta → imagen y preguntas',
  puzzle: 'puzle → imagen',
  hotspots: 'zonas activas → imagen y etiquetas',
  case_practice: 'caso práctico → enunciado y rúbrica',
  video: 'vídeo interactivo → vídeo y preguntas',
  html_embed: 'HTML a medida → bloque HTML',
  scenario_steps: 'caso por decisiones → decisiones con sus opciones',
  decision_tree: 'conversación ramificada → guion numerado de la conversación',
  calculator: 'reto numérico → datos y resultados con su solución',
}

/**
 * Convierte una interacción al iDevice de eXe correspondiente, anotando en el
 * contexto las reconversiones y degradaciones para el resumen.
 */
export function convertInteraction(it: Interaction, ctx: ConvertCtx): ElpxComponent {
  const id = ctx.newId(it.id)
  switch (it.type) {
    case 'word_search':
      return wordSearchIdevice(it, id)
    case 'crossword':
      return crosswordIdevice(it, id)
    case 'fill_blanks':
      return completeIdevice(it, id)
    case 'single_choice':
    case 'true_false':
    case 'scenario_decision':
      if (it.type === 'scenario_decision') ctx.note('«Decisión» → preguntas de opción (quick-questions)')
      return quickQuestionsIdevice(it, id)
    case 'match_pairs':
      return relateIdevice(it, id, ctx.resolveAsset)
    case 'flip_cards':
    case 'flashcards':
      return flipcardsIdevice(it, id)
    case 'before_after':
      return beforeAfterIdevice(it, id, ctx.resolveAsset)
    default: {
      const reason = DEGRADE_REASON[it.type]
      if (reason) ctx.note(`${reason} (iDevice «texto»)`)
      return textIdevice(id, degradeToTextHtml(it, ctx.resolveAsset))
    }
  }
}
