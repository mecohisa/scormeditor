import type { Interaction } from '../schema/course.schema'
import type { Issue } from './validators'

/**
 * Accesibilidad (UNE-EN 301 549:2022 = WCAG 2.1 niveles A y AA para contenido
 * web): fuente ÚNICA de qué códigos del validador son «de accesibilidad» y a qué
 * criterio WCAG corresponde cada uno. La usan el diálogo de exportación (frena con
 * los errores de esta lista), la sección «Accesibilidad» del Informe y la
 * declaración de accesibilidad. Un código nuevo de accesibilidad se añade AQUÍ
 * (y en `validators.ts`, que lo emite); si no está en `A11Y_CODES` no cuenta.
 *
 * También viven aquí los utilitarios puros que necesitan esas reglas: contraste
 * WCAG (luminancia relativa) y el análisis del markdown ligero (imágenes, enlaces,
 * encabezados) con las MISMAS expresiones que la carcasa (`renderer.js`/`rich()`),
 * para no avisar de algo que el runtime no pinta.
 */

export type WcagLevel = 'A' | 'AA'

export interface WcagCriterion {
  id: string
  name: string
  level: WcagLevel
}

/** Criterios WCAG 2.1 que cubre hoy el validador (nombre oficial en español). */
export const WCAG_CRITERIA: Record<string, WcagCriterion> = {
  '1.1.1': { id: '1.1.1', name: 'Contenido no textual', level: 'A' },
  '1.2.1': { id: '1.2.1', name: 'Solo audio y solo vídeo (grabado)', level: 'A' },
  '1.2.2': { id: '1.2.2', name: 'Subtítulos (grabado)', level: 'A' },
  '1.2.3': { id: '1.2.3', name: 'Audiodescripción o alternativa multimedia (grabado)', level: 'A' },
  '1.2.5': { id: '1.2.5', name: 'Audiodescripción (grabado)', level: 'AA' },
  '1.3.1': { id: '1.3.1', name: 'Información y relaciones', level: 'A' },
  '1.4.3': { id: '1.4.3', name: 'Contraste (mínimo)', level: 'AA' },
  '2.4.4': { id: '2.4.4', name: 'Propósito de los enlaces (en contexto)', level: 'A' },
  '4.1.2': { id: '4.1.2', name: 'Nombre, función, valor', level: 'A' },
}

/** Código del validador → criterio WCAG principal. Única definición de qué es
 *  «de accesibilidad» (ver cabecera). */
export const A11Y_CODES: Record<string, string> = {
  IMG_NO_ALT: '1.1.1',
  MD_IMG_NO_ALT: '1.1.1',
  ALT_POOR: '1.1.1',
  IX_VISUAL_REQUIRED: '1.1.1',
  AUDIO_NO_TRANSCRIPT: '1.2.1',
  TRANSCRIPT_HIDDEN_AUDIO: '1.2.1',
  MEDIA_NO_SUBS: '1.2.2',
  YT_CAPTIONS_CHECK: '1.2.2',
  VIDEO_NO_TRANSCRIPT: '1.2.3',
  TRANSCRIPT_HIDDEN_VIDEO: '1.2.3',
  VIDEO_AD_CHECK: '1.2.5',
  HEADING_SKIP: '1.3.1',
  THEME_LOW_CONTRAST: '1.4.3',
  LINK_TEXT_VAGUE: '2.4.4',
  HS_NO_LABEL: '4.1.2',
  EMBED_A11Y: '4.1.2',
}

export function isA11yCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(A11Y_CODES, code)
}

/** Hallazgos de accesibilidad (errores y avisos; los `info` no cuentan). */
export function a11yIssues(issues: Issue[]): Issue[] {
  return issues.filter((i) => i.severity !== 'info' && isA11yCode(i.code))
}

export interface A11yGroup {
  criterion: WcagCriterion
  issues: Issue[]
}

/** Agrupa hallazgos de accesibilidad por criterio WCAG, en el orden del estándar. */
export function groupByCriterion(issues: Issue[]): A11yGroup[] {
  const map = new Map<string, Issue[]>()
  a11yIssues(issues).forEach((i) => {
    const id = A11Y_CODES[i.code]
    map.set(id, [...(map.get(id) || []), i])
  })
  return Object.keys(WCAG_CRITERIA)
    .filter((id) => map.has(id))
    .map((id) => ({ criterion: WCAG_CRITERIA[id], issues: map.get(id)! }))
}

export type Conformance = 'full' | 'partial'

/** Situación de cumplimiento: «plenamente conforme» solo sin errores NI avisos de
 *  accesibilidad; en otro caso «parcialmente conforme» (nunca «conforme» con
 *  errores: es una autoevaluación automática, no una auditoría). */
export function conformance(issues: Issue[]): { status: Conformance; errors: number; warnings: number } {
  const a = a11yIssues(issues)
  const errors = a.filter((i) => i.severity === 'error').length
  const warnings = a.filter((i) => i.severity === 'warning').length
  return { status: errors === 0 && warnings === 0 ? 'full' : 'partial', errors, warnings }
}

// --- Contraste WCAG ------------------------------------------------------------

/** Contraste mínimo de texto normal (WCAG 1.4.3, nivel AA). */
export const MIN_TEXT_CONTRAST = 4.5

/** `#rgb`/`#rrggbb` → [r, g, b] (0-255); null si no es un hex de color. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
  const n = parseInt(h, 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

/** Luminancia relativa WCAG 2.1 (sRGB linealizado). */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Razón de contraste WCAG entre dos colores hex (1–21); null si alguno no es válido. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a), cb = parseHex(b)
  if (!ca || !cb) return null
  const la = relativeLuminance(ca), lb = relativeLuminance(cb)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** «4,82:1» — formato español con un decimal truncado (no redondear al alza un 4,49). */
export function fmtRatio(r: number): string {
  return `${(Math.floor(r * 100) / 100).toFixed(2).replace('.', ',')}:1`
}

// --- Markdown ligero ---------------------------------------------------------

/** Misma expresión que `renderer.js` (imagen/vídeo en renglón propio):
 *  `![alt|ancho](assets/… | http(s)://… "pie")`. */
const MD_IMAGE_LINE = /^\s*!\[([^\]|]*)(?:\|(\d{1,3}))?\]\((assets\/[^\s)]+|https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)\s*$/
/** Misma detección de YouTube que la carcasa (`youtubeId` de renderer.js). */
const YT_RE = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/
/** Mismo patrón de enlace que `rich()` (interactions.js). */
const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g

export interface MdImage { alt: string; src: string; isYoutube: boolean }

/** Imágenes (y vídeos de YouTube con la misma sintaxis) en líneas propias. */
export function mdImages(text: string): MdImage[] {
  const out: MdImage[] = []
  String(text || '').split('\n').forEach((ln) => {
    const m = MD_IMAGE_LINE.exec(ln)
    if (m) out.push({ alt: m[1].trim(), src: m[3], isYoutube: YT_RE.test(m[3]) })
  })
  return out
}

export function isYoutubeUrl(s: string): boolean {
  return YT_RE.test(String(s || ''))
}

const VAGUE_LINK_TEXTS = new Set([
  'aqui', 'pincha aqui', 'haz clic aqui', 'haz click aqui', 'clic aqui', 'click aqui', 'pulsa aqui',
  'enlace', 'este enlace', 'link', 'mas', 'ver', 'ver mas', 'leer mas', 'mas informacion', 'mas info',
])
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Textos de enlace que no dicen adónde llevan (WCAG 2.4.4): genéricos o una URL desnuda. */
export function vagueLinks(text: string): string[] {
  const out: string[] = []
  for (const m of String(text || '').matchAll(MD_LINK)) {
    // `![alt](https://…)` es una imagen, no un enlace.
    if (m.index && text[m.index - 1] === '!') continue
    const raw = m[1].replace(/\*+/g, '').trim()
    const t = fold(raw).replace(/[«»"'“”.,:;!¡?¿()…]/g, '').replace(/\s+/g, ' ').trim()
    if (VAGUE_LINK_TEXTS.has(t) || /^(https?:\/\/|www\.|mailto:)/i.test(raw)) out.push(raw)
  }
  return out
}

/** Salto real de encabezado en `student_text`: la carcasa pinta `##` como h2 y
 *  `###` como h3 bajo el h1 del título. Prudente a propósito: solo avisa si hay
 *  un `###` ANTES del primer `##` y la pantalla sí usa `##` más abajo (estructura
 *  incoherente); un texto que solo usa `###` es una decisión de estilo y no se
 *  marca. Se ignora el interior de los bloques `:::` (comparativas, qué hacer/qué
 *  evitar usan `##`/`###` como títulos de columna). */
export function headingSkip(text: string): string | null {
  let inBlock = false
  let firstH3Before: string | null = null
  let seenH2 = false
  for (const ln of String(text || '').split('\n')) {
    if (inBlock) { if (/^\s*:::\s*$/.test(ln)) inBlock = false; continue }
    if (/^\s*:::\s*[A-Za-z]+/.test(ln)) { inBlock = true; continue }
    const h = /^(?:\{(?:center|right)\}\s?)?(#{2,3})\s+(.*)$/.exec(ln)
    if (!h) continue
    if (h[1] === '##') { if (firstH3Before) return firstH3Before; seenH2 = true }
    else if (!seenH2 && !firstH3Before) firstH3Before = h[2].trim()
  }
  return null
}

/** Alt de baja calidad: nombre de fichero, «imagen de…»/«foto de…» o demasiado
 *  largo (pide descripción larga). Devuelve el motivo, o null si está bien. */
export function poorAlt(alt: string, src: string): string | null {
  const a = String(alt || '').trim()
  if (!a) return null
  const base = String(src || '').split('/').pop() || ''
  const stem = base.replace(/\.[a-z0-9]+$/i, '')
  if ((base && (fold(a) === fold(base) || fold(a) === fold(stem))) || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(a))
    return `el texto alternativo «${a}» es el nombre del archivo: describe lo que muestra la imagen`
  if (/^(imagen|foto|fotografia|ilustracion|grafico|dibujo)\s+(de|del)\b/.test(fold(a)))
    return `el texto alternativo empieza por «${a.split(/\s+/).slice(0, 2).join(' ')}»: el lector de pantalla ya anuncia que es una imagen, ve directo a lo que muestra`
  if (a.length > 250)
    return `el texto alternativo tiene ${a.length} caracteres (más de 250): resume en el alt y pon la descripción completa en el texto de la pantalla o en un pie`
  return null
}

/** Todos los textos visibles de una interacción en los que el autor puede
 *  escribir markdown (enunciado, instrucciones, feedback, opciones y cualquier
 *  cadena de `config`). En `html_embed` se omiten `html`/`css`/`js` (es código,
 *  no markdown: su accesibilidad la avisa `EMBED_A11Y`). */
export function interactionTexts(it: Interaction): string[] {
  const out: string[] = [it.prompt, it.instructions, it.feedback?.correct, it.feedback?.incorrect, it.feedback?.explanation]
    .filter((s): s is string => typeof s === 'string')
  ;(it.options || []).forEach((o) => { out.push(o.text || ''); if (o.feedback) out.push(o.feedback) })
  const skip = it.type === 'html_embed' ? new Set(['html', 'css', 'js']) : new Set<string>()
  const walk = (v: unknown, depth: number) => {
    if (depth > 6 || v == null) return
    if (typeof v === 'string') { out.push(v); return }
    if (Array.isArray(v)) { v.forEach((x) => walk(x, depth + 1)); return }
    if (typeof v === 'object') Object.entries(v as Record<string, unknown>).forEach(([k, x]) => { if (!(depth === 0 && skip.has(k))) walk(x, depth + 1) })
  }
  walk(it.config || {}, 0)
  return out.filter((s) => s.trim())
}
