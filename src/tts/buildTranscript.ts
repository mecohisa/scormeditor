import type { Screen, Interaction, InteractionType } from '../schema/course.schema'

/**
 * Genera la transcripción de una pantalla a partir de su contenido: el texto
 * del estudiante (markdown ligero → texto plano legible) más el contenido de
 * la interacción, tratado de forma distinta según el tipo:
 * - **Informativa** (`INFORMATIVE`): entra su contenido completo (ver más abajo
 *   el caso particular de los tipos revelables).
 * - **Evaluable** (cualquier otro tipo: single_choice, fill_blanks, hotspots,
 *   crucigrama…): solo entra el **enunciado** (`prompt`), nunca opciones,
 *   pasos a ordenar, zonas, respuestas ni feedback — leer eso en voz alta sería
 *   «caos auditivo» (listas largas, sin la pausa/interacción real del alumno)
 *   y en varios casos literalmente desvelaría la respuesta. El enunciado por
 *   sí solo evita que la pantalla quede muda sin presuponer más.
 *
 * `accordion`/`tabs`/`flip_cards`/`timeline`/`image_cards`/`flashcards`
 * OCULTAN el CUERPO de cada ítem tras un gesto de revelado (desplegar/
 * pestañear/girar): ese cuerpo NO entra aquí (se narraría en voz antes de que
 * el alumno lo vea, chafando el propio mecanismo de descubrimiento) — se narra
 * por ítem, con audio propio que suena al revelar cada uno (ver `itemsOf()`/
 * `itemsKeyOf()` y `src/tts/tts.ts::generateForItem`). El TÍTULO/etiqueta de
 * cada ítem, en cambio, **es visible sin clicar** (cabecera del accordion,
 * pestaña, anverso de la tarjeta…), así que sí entra en la transcripción
 * general junto al `prompt` — funciona como un «índice hablado» de lo que hay
 * para explorar, sin desvelar el contenido.
 *
 * `case_practice` y `scenario_decision` son informativas pero NO revelables:
 * nada de lo que narran da la respuesta (la situación de un escenario es
 * contexto, no una opción a adivinar), así que su contenido entra sin esperar
 * a ningún gesto. Excepción: la rúbrica de `case_practice` NO entra — en la
 * carcasa va plegada («Autoevalúate según la rúbrica») y el alumno la abre
 * cuando ya ha pensado su respuesta; leerla antes no tiene sentido.
 *
 * El resultado es texto plano pensado para el botón «Transcripción» de la
 * carcasa y como entrada del TTS (sin marcas ** * [], sin fences :::).
 */

/** Tipos de interacción cuyo contenido (más allá del enunciado) forma parte
 *  de la transcripción/narración. El resto (evaluables) solo aporta `prompt`
 *  — ver `buildTranscript()`. */
export const INFORMATIVE = new Set([
  'accordion', 'tabs', 'flip_cards', 'timeline', 'flashcards', 'image_cards', 'before_after',
  'case_practice', 'scenario_decision',
])

/** Tipos cuyo contenido se oculta tras un gesto de revelado y por eso se narra
 *  por ítem (audio propio) en vez de en la transcripción general. */
export const REVEALABLE_TYPES = new Set<InteractionType>([
  'accordion', 'tabs', 'flip_cards', 'timeline', 'image_cards', 'flashcards',
])

/** Clave de `config` donde vive la lista de ítems narrables por separado
 *  (`undefined` si el tipo no tiene). Única fuente de esta correspondencia:
 *  la reutilizan `itemsOf()` y `tts.ts` para localizar/parchear un ítem.
 *  `hotspots` vive aquí (audio por zona) pero OJO: NO está en
 *  `REVEALABLE_TYPES` — sus zonas no entran en el «índice hablado» de
 *  `interactionPlain()` (desvelaría las zonas antes de clicarlas, como leer
 *  las opciones de un single_choice); el audio de cada zona solo suena al
 *  clicarla (ver `interactions.js::register('hotspots', …)`). */
const ITEM_KEY: Partial<Record<InteractionType, 'items' | 'cards' | 'milestones' | 'spots'>> = {
  accordion: 'items',
  tabs: 'items',
  flip_cards: 'cards',
  flashcards: 'cards',
  image_cards: 'cards',
  timeline: 'milestones',
  hotspots: 'spots',
}

export function itemsKeyOf(type: InteractionType): 'items' | 'cards' | 'milestones' | 'spots' | undefined {
  return ITEM_KEY[type]
}

// Etiquetas habladas de los callouts (mismas que renderer.js).
const CALLOUT_LABELS: Record<string, string> = {
  tip: 'Consejo',
  info: 'Información',
  warn: 'Atención',
  important: 'Importante',
  fact: '¿Sabías que…?',
  reflect: 'Reflexiona',
  summary: 'Síntesis',
  case: 'Caso práctico',
  stats: 'Cifras destacadas',
  compare: 'Comparativa',
  dodont: 'Qué hacer y qué evitar',
}

/** Quita las marcas inline del markdown ligero (negrita, cursiva, enlaces).
 *  Exportada además de para uso interno: la reutiliza `estimateDuration.ts`
 *  para contar palabras de `title`/`prompt`/`instructions` (texto siempre
 *  corto, en una sola línea — a diferencia de `plainText`, no hace falta
 *  tratar callouts ni saltos de línea). */
export function inlinePlain(s: string): string {
  return String(s || '')
    // Imágenes ![alt](ruta): no se narran (el alt describe, no cuenta).
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}

/** Markdown ligero (student_text, cuerpos de items) → texto plano por líneas. */
export function plainText(md: string): string {
  const out: string[] = []
  const lines = String(md || '').split(/\r?\n/)
  for (const raw of lines) {
    // Cierre de callout: se omite.
    if (/^\s*:::\s*$/.test(raw)) continue
    // Apertura de callout: se habla su etiqueta (o el título del bloque custom).
    const open = /^\s*:::\s*([A-Za-z]+)\s*(.*)$/.exec(raw)
    if (open) {
      const type = open[1].toLowerCase()
      if (type === 'custom') {
        const title = (open[2] || '').split('|')[2]?.trim()
        if (title) out.push(`${inlinePlain(title)}.`)
      } else if (CALLOUT_LABELS[type]) {
        out.push(`${CALLOUT_LABELS[type]}.`)
      }
      continue
    }
    let ln = raw
    const h = /^(#{2,3})\s+(.*)$/.exec(ln)
    if (h) ln = h[2]
    else {
      const bh = /^\s*\*\*(.+?)\*\*\s*:?\s*$/.exec(ln) // línea solo-negrita = encabezado
      if (bh) ln = bh[1]
      else {
        ln = ln.replace(/^\s*[-*•·–—]\s+/, '') // viñeta
        ln = ln.replace(/^\s*(\d+)[.)]\s+/, '$1. ') // lista numerada: conserva el número
      }
    }
    const t = inlinePlain(ln)
    if (t) out.push(t)
  }
  return out.join('\n')
}

/** Contenido hablable de una interacción informativa. Exportada además de para
 *  `buildTranscript()`: la reutiliza `estimateDuration.ts` como «texto legible»
 *  de los tipos informativos NO revelables (mismo criterio: para esos tipos no
 *  hay nada oculto tras un gesto, así que el tiempo de lectura es el mismo
 *  texto que se narra). Los revelables NO la usan para estimar tiempo —esta
 *  función solo da el índice de etiquetas, no el cuerpo oculto de cada ítem—,
 *  usan `itemsOf()` para contar también lo que el alumno lee al revelar. */
export function interactionPlain(it: Interaction): string {
  const parts: string[] = []
  const push = (s?: string) => {
    const t = inlinePlain(s || '')
    if (t) parts.push(t)
  }
  push(it.prompt)
  // Revelables: el enunciado + el título/etiqueta visible de cada ítem (un
  // «índice hablado»). El cuerpo oculto de cada ítem se narra aparte (itemsOf()).
  if (REVEALABLE_TYPES.has(it.type)) {
    for (const item of itemsOf(it)) if (item.label) parts.push(`${item.label}.`)
    return parts.join('\n')
  }
  const cfg = (it.config || {}) as Record<string, any>
  if (it.type === 'before_after') {
    // Lo único textual del comparador: etiqueta + descripción (alt) de cada cara.
    const face = (label: string, def: string, alt: string) => {
      const l = inlinePlain(label || def)
      const a = inlinePlain(alt || '')
      if (a) parts.push(`${l}: ${a}`)
    }
    face(cfg.before_label, 'Antes', cfg.before_alt)
    face(cfg.after_label, 'Después', cfg.after_alt)
  } else if (it.type === 'scenario_decision') {
    // La situación es el contexto de la decisión, no una opción a adivinar.
    // Las opciones y su feedback (eso sí daría la respuesta) quedan fuera.
    const scenario = inlinePlain(cfg.scenario || '')
    if (scenario) parts.push(scenario)
  }
  return parts.join('\n')
}

export interface NarratableItem {
  /** Id estable del ítem (backfill al cargar/crear, ver `interactionRecipes`/editor). */
  id: string
  /** Título/cara/hito — visible SIN revelar el ítem; entra en la transcripción
   *  general de pantalla (ver `interactionPlain`). */
  label: string
  /** Guion hablado del audio de ítem: el propio texto visible (label + cuerpo). */
  text: string
  /** `audio_src` ya generado para este ítem, si lo hay. */
  audioSrc: string
}

/** Ítems narrables de una interacción revelable, con su guion (= texto visible,
 *  sin campo de locución aparte) y su `audio_src` si ya se generó. Devuelve
 *  `[]` para tipos no revelables. */
export function itemsOf(it: Interaction): NarratableItem[] {
  const key = ITEM_KEY[it.type]
  if (!key) return []
  const list = ((it.config || {}) as Record<string, any>)[key]
  if (!Array.isArray(list)) return []
  return list.map((raw: any, i: number) => {
    const id = typeof raw?.id === 'string' && raw.id ? raw.id : String(i)
    let label = ''
    let body = ''
    switch (it.type) {
      case 'flip_cards':
      case 'flashcards':
        label = raw?.front || ''
        body = raw?.back || ''
        break
      case 'timeline':
        label = [raw?.label, raw?.title].filter(Boolean).join(' · ')
        body = raw?.body || ''
        break
      case 'image_cards':
        label = raw?.title || ''
        body = raw?.text || ''
        break
      case 'hotspots':
        // Solo el nombre de la zona — nunca su feedback (correcto/incorrecto):
        // es una evaluable, igual que no se narran las opciones de un
        // single_choice. El audio suena al clicar, no antes (ver interactions.js).
        label = raw?.label || ''
        body = ''
        break
      default: // accordion, tabs
        label = raw?.title || ''
        body = raw?.body || ''
    }
    const head = inlinePlain(label)
    const rest = plainText(body)
    const text = [head ? `${head}.` : '', rest].filter(Boolean).join('\n')
    const audioSrc = typeof raw?.audio_src === 'string' ? raw.audio_src : ''
    return { id, label: head, text, audioSrc }
  })
}

/** Pantalla cuyo vídeo ya trae su propia voz (`has_voice`, p. ej. el vídeo demo
 *  de «Instrucciones de uso»): su `transcript` es la del vídeo, no un guion de
 *  locución, y narrarla encima sonaría a la vez que el vídeo. */
export function hasOwnVoiceVideo(s: Screen): boolean {
  const k = s.visual_resource.kind
  return (k === 'video_file' || k === 'video_youtube') && !!s.visual_resource.has_voice
}

/** Pantalla fuera de la narración automática a nivel de PANTALLA (rellenar
 *  transcripciones y generar audios en bloque, contadores y avisos NARR_*):
 *  vídeo con voz propia, o marcada «Sin transcripción para el alumno»
 *  (`transcript_hidden`). Los botones de la propia pantalla siguen funcionando. */
export function skipsScreenNarration(s: Screen): boolean {
  return s.transcript_hidden || hasOwnVoiceVideo(s)
}

/** Pantalla fuera también de la narración por ítem (audios propios de los
 *  ítems de accordion/tabs/…): solo la marcada «Sin transcripción», que el
 *  autor ha sacado entera de la narración. Un vídeo con voz no impide narrar
 *  los ítems de su interacción. */
export function skipsItemNarration(s: Screen): boolean {
  return s.transcript_hidden
}

/** Transcripción completa de la pantalla (título + texto + interacción).
 *  El título va siempre primero, como haría un narrador real anunciando la
 *  pantalla — es lo único que garantiza que una portada de módulo/unidad (solo
 *  título, sin `student_text`) tenga algo que narrar en vez de quedar muda. */
export function buildTranscript(screen: Screen): string {
  const parts: string[] = []
  const title = inlinePlain(screen.title)
  if (title) parts.push(/[.!?…]$/.test(title) ? title : title + '.')
  const body = plainText(screen.student_text)
  if (body) parts.push(body)
  if (screen.interaction) {
    if (INFORMATIVE.has(screen.interaction.type)) {
      const it = interactionPlain(screen.interaction)
      if (it) parts.push(it)
    } else {
      // Evaluable: solo el enunciado (ver cabecera del fichero) — nunca
      // opciones/pasos/zonas/respuestas/feedback.
      const prompt = inlinePlain(screen.interaction.prompt)
      if (prompt) parts.push(prompt)
    }
  }
  return parts.join('\n\n')
}

/** Huella corta y determinista (FNV-1a 32 bits, hex) de un texto — no
 *  criptográfica, solo para detectar «¿cambió este contenido desde la
 *  última vez?» sin tener que guardar una copia entera. La usan
 *  `transcript_content_hash`/`audio_transcript_hash` (ver `course.schema.ts`
 *  y `courseStore.ts::updateScreen`) para avisar cuando el contenido cambia
 *  después de escribir la transcripción, o la transcripción cambia después
 *  de generar el audio. */
export function contentHash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}
