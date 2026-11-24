/**
 * Metadatos de los bloques destacados (callouts) para el editor.
 * Iconos y etiquetas ALINEADOS con la carcasa (runtime/assets/js/renderer.js) y
 * colores con runtime/assets/css/styles.css: el bloque se ve en el editor con el
 * mismo aspecto que tendrá de verdad en el SCORM.
 */
export type CalloutMeta = { icon: string; label: string; color: string }

export const CALLOUT_META: Record<string, CalloutMeta> = {
  tip: { icon: '💡', label: 'Consejo', color: '#6dc3c0' },
  info: { icon: 'ℹ️', label: 'Información', color: '#7787bf' },
  warn: { icon: '⚠️', label: 'Atención', color: '#f4c910' },
  important: { icon: '📌', label: 'Importante', color: '#6dc3c0' },
  fact: { icon: '🧠', label: '¿Sabías que…?', color: '#6dc3c0' },
  reflect: { icon: '💭', label: 'Reflexiona', color: '#f4c910' },
  summary: { icon: '📝', label: 'Síntesis', color: '#6dc3c0' },
  case: { icon: '🧪', label: 'Caso práctico', color: '#f4c910' },
  stats: { icon: '📊', label: 'Cifras destacadas', color: '#6dc3c0' },
  compare: { icon: '⚖️', label: 'Comparativa', color: '#7787bf' },
  dodont: { icon: '✅', label: 'Qué hacer y qué evitar', color: '#1a7f37' },
}

/** Tipos que se ofrecen en los selectores del editor (orden de la barra). */
export const CALLOUT_ORDER = ['tip', 'warn', 'important', 'fact', 'reflect', 'summary', 'case', 'info'] as const

export const HEX_RE = /^#[0-9a-fA-F]{3,8}$/

/** Color efectivo de un bloque (mismo fallback que la carcasa: violeta). */
export function calloutColor(ctype: string, color: string): string {
  if (ctype === 'custom') return HEX_RE.test(color) ? color : '#7787BF'
  return CALLOUT_META[ctype]?.color ?? CALLOUT_META.info.color
}

/**
 * Bloques con estructura: el autor escribe lista/encabezados normales dentro y
 * la carcasa los presenta como tarjetas o columnas (`renderStats`/`renderColumns`
 * en renderer.js). `hint` se ve en la cabecera del bloque en el editor; `template`
 * es el contenido inicial (JSON de ProseMirror) al insertarlo desde la barra.
 */
type PMNode = { type: string; attrs?: Record<string, unknown>; content?: PMNode[]; text?: string; marks?: { type: string }[] }
const p = (...content: PMNode[]): PMNode => ({ type: 'paragraph', content })
const t = (text: string, bold = false): PMNode => ({ type: 'text', text, ...(bold ? { marks: [{ type: 'bold' }] } : {}) })
const h3 = (text: string): PMNode => ({ type: 'heading', attrs: { level: 3 }, content: [t(text)] })
const ul = (...items: PMNode[][]): PMNode => ({
  type: 'bulletList',
  content: items.map((c) => ({ type: 'listItem', content: [p(...c)] })),
})

export const STRUCTURED_BLOCKS: Record<string, { hint: string; template: () => PMNode[] }> = {
  stats: {
    hint: 'Cada punto de la lista es una tarjeta: la negrita del principio es la cifra grande.',
    template: () => [ul([t('80 %', true), t(' de los casos …')], [t('3 de cada 10', true), t(' …')], [t('24 h', true), t(' …')])],
  },
  compare: {
    hint: 'Cada encabezado (H3) abre una columna con lo que tenga debajo; con dos columnas sale «vs».',
    template: () => [h3('Opción A'), ul([t('…')], [t('…')]), h3('Opción B'), ul([t('…')], [t('…')])],
  },
  dodont: {
    hint: 'Dos encabezados (H3): la lista del primero sale con ✓ y la del segundo con ✗.',
    template: () => [h3('Qué hacer'), ul([t('…')], [t('…')]), h3('Qué evitar'), ul([t('…')], [t('…')])],
  },
}

/** Orden de los bloques con estructura en la barra y en el selector. */
export const STRUCTURED_ORDER = ['stats', 'compare', 'dodont'] as const
