/* =============================================================================
 * mdDialect.ts — Parser y serializador del MARKDOWN LIGERO del proyecto.
 *
 * Es el puente entre el almacenamiento (texto plano en course.json, la
 * invariante del proyecto: nunca HTML) y el editor WYSIWYG (TipTap/ProseMirror):
 *   - mdToJson(md)  -> documento ProseMirror en JSON (tipos de TipTap)
 *   - jsonToMd(doc) -> el markdown ligero de vuelta
 *
 * La REFERENCIA SEMÁNTICA es el renderizador de la carcasa
 * (src/runtime/assets/js/renderer.js `mdToHtml` + interactions.js `rich`):
 * este módulo replica sus regex y su orden de aplicación (enlaces primero,
 * luego **negrita**, luego *cursiva* — la cursiva puede abarcar tramos ya en
 * negrita, como hace el runtime al operar sobre la cadena ya sustituida).
 *
 * Invariante verificada por scripts/test-md-dialect.ts:
 *   - round-trip EXACTO (jsonToMd(mdToJson(x)) === x) para el corpus canónico;
 *   - equivalencia de RENDER (mdToHtml del runtime idéntico antes y después
 *     del round-trip) para todos los textos del proyecto demo.
 * Sin dependencias: módulo puro, usable también desde Node (tests).
 * ===========================================================================*/

export type JsonMark = { type: string; attrs?: Record<string, unknown> }
export interface JsonNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  marks?: JsonMark[]
  text?: string
}

// --- Regex del dialecto (copiadas de renderer.js; mantener alineadas) -------
const RE_CALLOUT_OPEN = /^\s*:::\s*([A-Za-z]+)\s*(.*)$/
const RE_CALLOUT_CLOSE = /^\s*:::\s*$/
const RE_HEADING = /^(#{2,3})\s+(.*)$/
// Alineación de párrafo/encabezado: prefijo de línea `{center}`/`{right}`;
// «izquierda» es el default implícito, sin marca (nunca `{left}`).
const RE_ALIGN = /^\{(center|right)\}\s?/
const RE_OL_ITEM = /^\s*(\d+)[.)]\s+(.*)$/
const RE_UL_ITEM = /^\s*[-*•·–—]\s+(.*)$/
// Grupo 4: pie opcional entre comillas (`![alt](ruta "Pie")`, convención del
// `title` de markdown estándar) — plano, sin marcas propias: el runtime lo
// interpreta con `rich()` al renderizar (negrita/cursiva/enlaces funcionan,
// igual que el pie de un recurso visual).
export const RE_IMG_LINE =
  /^\s*!\[([^\]|]*)(?:\|(\d{1,3}))?\]\((assets\/[^\s)]+|https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)\s*$/
const RE_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g
const RE_STRONG = /\*\*([^*]+)\*\*/g
const RE_EM = /\*([^*]+)\*/g

/** Tipos de callout predefinidos que renderiza la carcasa. */
export const CALLOUT_TYPES = ['tip', 'info', 'warn', 'important', 'fact', 'reflect', 'case']

// =============================================================================
// PARSER inline: texto -> nodos text con marcas (bold/italic/link)
// =============================================================================
// Se trabaja con una lista de tokens; cada pasada de marca construye la cadena
// "visible" (los tokens ya agrupados cuentan como un carácter opaco no-asterisco,
// igual que las etiquetas HTML en el runtime) y aplica la regex sobre ella.

type Tok =
  | { kind: 'text'; text: string }
  | { kind: 'group'; marks: JsonMark[]; toks: Tok[] }

function linkPass(s: string): Tok[] {
  const out: Tok[] = []
  let last = 0
  RE_LINK.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_LINK.exec(s))) {
    if (m.index > last) out.push({ kind: 'text', text: s.slice(last, m.index) })
    // El texto del enlace admite **negrita**/*cursiva* dentro (sin más enlaces).
    out.push({
      kind: 'group',
      marks: [{ type: 'link', attrs: { href: m[2] } }],
      toks: emPass(strongPass([{ kind: 'text', text: m[1] }])),
    })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ kind: 'text', text: s.slice(last) })
  return out
}

/** Aplica una regex de marca sobre la lista de tokens (grupos = opacos). */
function markPass(toks: Tok[], re: RegExp, markerLen: number, mark: JsonMark): Tok[] {
  // Cadena visible + mapa de cada carácter a su token de origen.
  let str = ''
  const map: { tok: number; off: number }[] = []
  toks.forEach((t, ti) => {
    if (t.kind === 'text') {
      for (let k = 0; k < t.text.length; k++) {
        str += t.text[k]
        map.push({ tok: ti, off: k })
      }
    } else {
      str += ' ' // opaco: nunca es '*'
      map.push({ tok: ti, off: -1 })
    }
  })
  re.lastIndex = 0
  const spans: { s: number; cs: number; ce: number; e: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(str))) {
    spans.push({
      s: m.index,
      cs: m.index + markerLen,
      ce: m.index + m[0].length - markerLen,
      e: m.index + m[0].length,
    })
  }
  if (!spans.length) return toks

  const out: Tok[] = []
  let target = out
  let group: Tok[] | null = null
  let acc = ''
  let span = 0
  const flush = () => {
    if (acc) {
      target.push({ kind: 'text', text: acc })
      acc = ''
    }
  }
  for (let i = 0; i < str.length; i++) {
    const sp = spans[span]
    if (sp && i === sp.s) {
      flush()
      group = []
      target = group
    }
    const inMarker = sp && ((i >= sp.s && i < sp.cs) || (i >= sp.ce && i < sp.e))
    if (!inMarker) {
      const mp = map[i]
      if (mp.off < 0) {
        flush()
        target.push(toks[mp.tok])
      } else {
        acc += str[i]
      }
    }
    if (sp && i === sp.e - 1) {
      flush()
      target = out
      target.push({ kind: 'group', marks: [mark], toks: group! })
      group = null
      span++
    }
  }
  flush()
  return out
}

function strongPass(toks: Tok[]): Tok[] {
  return markPass(toks, RE_STRONG, 2, { type: 'bold' })
}
function emPass(toks: Tok[]): Tok[] {
  return markPass(toks, RE_EM, 1, { type: 'italic' })
}

function flattenToks(toks: Tok[], active: JsonMark[], out: JsonNode[]): void {
  for (const t of toks) {
    if (t.kind === 'text') {
      if (!t.text) continue
      const prev = out[out.length - 1]
      // Fusiona textos adyacentes con las mismas marcas (documento más limpio).
      if (prev && prev.type === 'text' && sameMarks(prev.marks ?? [], active)) {
        prev.text = (prev.text ?? '') + t.text
      } else {
        out.push({ type: 'text', text: t.text, ...(active.length ? { marks: active.map(cloneMark) } : {}) })
      }
    } else {
      flattenToks(t.toks, [...active, ...t.marks], out)
    }
  }
}

function cloneMark(m: JsonMark): JsonMark {
  return m.attrs ? { type: m.type, attrs: { ...m.attrs } } : { type: m.type }
}
function sameMarks(a: JsonMark[], b: JsonMark[]): boolean {
  if (a.length !== b.length) return false
  return a.every((m, i) => m.type === b[i].type && hrefOf(m) === hrefOf(b[i]))
}
function hrefOf(m: JsonMark): string {
  return m.type === 'link' ? String(m.attrs?.href ?? '') : ''
}

/** Parsea el texto de una línea a nodos inline de ProseMirror. */
export function parseInline(s: string): JsonNode[] {
  const out: JsonNode[] = []
  flattenToks(emPass(strongPass(linkPass(s))), [], out)
  return out
}

// =============================================================================
// PARSER de bloques: líneas -> nodos de bloque
// =============================================================================

function paragraph(text: string, align?: string | null): JsonNode {
  const content = text ? parseInline(text) : []
  const node: JsonNode = content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
  if (align) node.attrs = { textAlign: align }
  return node
}

/** Sangría de una línea en espacios (un tabulador cuenta 2, como en renderer.js). */
function indentOf(s: string): number {
  return /^[ \t]*/.exec(s)![0].replace(/\t/g, '  ').length
}

function parseBlocks(lines: string[]): JsonNode[] {
  const out: JsonNode[] = []
  // Listas abiertas, de fuera hacia dentro, con su sangría (misma pila que
  // renderer.js): un ítem más sangrado que el anterior abre una sublista dentro
  // del último listItem; uno menos sangrado vuelve al nivel que le corresponde.
  let lists: { node: JsonNode; indent: number; lastNum: number }[] = []
  const closeList = () => {
    lists = []
  }
  const addItem = (type: 'bulletList' | 'orderedList', indent: number, text: string, num = 0) => {
    const item: JsonNode = { type: 'listItem', content: [paragraph(text)] }
    while (lists.length && lists[lists.length - 1].indent > indent) lists.pop()
    const top = lists[lists.length - 1]
    // Solo se agrupan números CONSECUTIVOS: así "3. / 5." o "1. / 1." se
    // conservan tal cual al serializar (la carcasa honra el número escrito).
    if (top && top.indent === indent && top.node.type === type && (type === 'bulletList' || num === top.lastNum + 1)) {
      top.node.content!.push(item)
      top.lastNum = num
      return
    }
    if (top && top.indent === indent) lists.pop() // mismo nivel: lista hermana nueva
    const node: JsonNode =
      type === 'orderedList' ? { type, attrs: { start: num }, content: [item] } : { type, content: [item] }
    const parent = lists[lists.length - 1]
    if (parent) {
      const items = parent.node.content!
      items[items.length - 1].content!.push(node)
    } else {
      out.push(node)
    }
    lists.push({ node, indent, lastNum: num })
  }
  for (let i = 0; i < lines.length; i++) {
    let ln = lines[i]
    // Alineación: se despoja al principio, como en renderer.js — solo se aplica
    // a encabezado/párrafo (listas y callouts la ignoran, fuera de alcance).
    const am = RE_ALIGN.exec(ln)
    const align = am ? am[1] : null
    if (am) ln = ln.slice(am[0].length)

    // Bloque destacado ::: tipo … ::: (el cierre puede faltar: hasta el final).
    const open = RE_CALLOUT_OPEN.exec(ln)
    if (open && !RE_CALLOUT_CLOSE.test(ln)) {
      closeList()
      const ctype = open[1].toLowerCase()
      const rest = open[2] || ''
      const inner: string[] = []
      for (i++; i < lines.length && !RE_CALLOUT_CLOSE.test(lines[i]); i++) inner.push(lines[i])
      let attrs: Record<string, unknown>
      if (ctype === 'custom') {
        const parts = rest.split('|').map((x) => x.trim())
        if (parts.length && parts[0] === '') parts.shift()
        attrs = { ctype, color: parts[0] || '', icon: parts[1] || '', title: parts[2] || '' }
      } else {
        attrs = { ctype, color: '', icon: '', title: '' }
      }
      const content = parseBlocks(inner)
      out.push({ type: 'callout', attrs, content: content.length ? content : [{ type: 'paragraph' }] })
      continue
    }

    const h = RE_HEADING.exec(ln)
    if (h) {
      closeList()
      out.push({
        type: 'heading',
        attrs: { level: h[1].length, ...(align ? { textAlign: align } : {}) },
        content: parseInline(h[2]),
      })
      continue
    }

    const ol = RE_OL_ITEM.exec(ln)
    if (ol) {
      addItem('orderedList', indentOf(ln), ol[2], parseInt(ol[1], 10))
      continue
    }

    const im = RE_IMG_LINE.exec(ln)
    if (im) {
      closeList()
      out.push({
        type: 'imageFigure',
        attrs: { src: im[3], alt: im[1], width: im[2] ? parseInt(im[2], 10) : null, caption: im[4] || '' },
      })
      continue
    }

    const ul = RE_UL_ITEM.exec(ln)
    if (ul) {
      addItem('bulletList', indentOf(ln), ul[1])
      continue
    }

    closeList()
    // Cualquier otra línea es un párrafo; las VACÍAS también (párrafo vacío),
    // para que las líneas en blanco del original sobrevivan al round-trip.
    out.push(paragraph(ln, align))
  }
  return out
}

/** Markdown ligero -> documento ProseMirror (JSON con los tipos de TipTap). */
export function mdToJson(md: string): JsonNode {
  const text = String(md ?? '')
  const blocks = text === '' ? [] : parseBlocks(text.split(/\r?\n/))
  return { type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] }
}

// =============================================================================
// SERIALIZADOR: documento ProseMirror -> markdown ligero
// =============================================================================

function markKey(m: JsonMark): string {
  return m.type === 'link' ? `link:${hrefOf(m)}` : m.type
}
function nodeHasMark(n: JsonNode, key: string): boolean {
  return (n.marks ?? []).some((m) => markKey(m) === key)
}
function stripMark(n: JsonNode, key: string): JsonNode {
  const marks = (n.marks ?? []).filter((m) => markKey(m) !== key)
  return { ...n, marks: marks.length ? marks : undefined }
}

/**
 * Serializa nodos inline. En cada punto se abre la marca cuyo tramo contiguo es
 * más largo (con prioridad negrita > cursiva > enlace en empate): así
 * `*a **b** c*` — cursiva que abarca una negrita — se reconstruye tal cual.
 */
function serializeInline(nodes: JsonNode[]): string {
  let out = ''
  let i = 0
  while (i < nodes.length) {
    const n = nodes[i]
    if (n.type !== 'text') {
      i++ // solo hay texto a nivel inline en este esquema
      continue
    }
    const marks = n.marks ?? []
    if (!marks.length) {
      out += n.text ?? ''
      i++
      continue
    }
    const order = ['bold', 'italic', 'link']
    const keys = marks
      .map((m) => ({ key: markKey(m), mark: m }))
      .sort((a, b) => order.indexOf(a.mark.type) - order.indexOf(b.mark.type))
    let best = keys[0]
    let bestLen = 0
    for (const k of keys) {
      let j = i
      while (j < nodes.length && nodes[j].type === 'text' && nodeHasMark(nodes[j], k.key)) j++
      if (j - i > bestLen) {
        bestLen = j - i
        best = k
      }
    }
    const run = nodes.slice(i, i + bestLen).map((x) => stripMark(x, best.key))
    const inner = serializeInline(run)
    if (best.mark.type === 'bold') out += `**${inner}**`
    else if (best.mark.type === 'italic') out += `*${inner}*`
    else out += `[${inner}](${hrefOf(best.mark)})`
    i += bestLen
  }
  return out
}

function calloutHeader(attrs: Record<string, unknown> | undefined): string {
  const ctype = String(attrs?.ctype ?? 'info')
  if (ctype !== 'custom') return `::: ${ctype}`
  // Mismo formato que produce el editor desde siempre (incluidos vacíos).
  return `::: custom | ${String(attrs?.color ?? '')} | ${String(attrs?.icon ?? '')} | ${String(attrs?.title ?? '')}`
}

/** Prefijo `{center}`/`{right}` según `attrs.textAlign` («izquierda» = sin marca). */
function alignPrefix(attrs: Record<string, unknown> | undefined): string {
  const a = attrs?.textAlign
  return a === 'center' || a === 'right' ? `{${a}}` : ''
}

function serializeBlock(n: JsonNode): string {
  switch (n.type) {
    case 'paragraph':
      return alignPrefix(n.attrs) + serializeInline(n.content ?? [])
    case 'heading': {
      const level = Number(n.attrs?.level) === 3 ? 3 : 2
      return alignPrefix(n.attrs) + '#'.repeat(level) + ' ' + serializeInline(n.content ?? [])
    }
    case 'bulletList':
    case 'orderedList':
      return serializeList(n, '')
    case 'imageFigure': {
      const alt = String(n.attrs?.alt ?? '').replace(/[\]|]/g, '')
      const w = n.attrs?.width
      const width = w == null || w === '' ? null : Number(w)
      const caption = String(n.attrs?.caption ?? '').replace(/"/g, "'").trim()
      const src = String(n.attrs?.src ?? '')
      return `![${alt}${width ? `|${width}` : ''}](${src}${caption ? ` "${caption}"` : ''})`
    }
    case 'callout': {
      const inner = (n.content ?? []).map(serializeBlock).join('\n')
      return `${calloutHeader(n.attrs)}\n${inner}\n:::`
    }
    default:
      // Tipo desconocido: se conserva su texto plano para no perder contenido.
      return serializeInline(n.content ?? [])
  }
}

const isList = (n: JsonNode) => n.type === 'bulletList' || n.type === 'orderedList'

/**
 * Lista (y sus sublistas) -> líneas de ítem; cada nivel de anidamiento suma 2
 * espacios de sangría. Un listItem lleva su párrafo y, opcionalmente, sublistas.
 * Si el editor dejara varios párrafos en un ítem (el dialecto no tiene «párrafo
 * dentro de ítem»), se unen con un espacio en la línea del ítem: nunca se pierde
 * texto (antes las sublistas se descartaban aquí al guardar).
 */
function serializeList(list: JsonNode, indent: string): string {
  const ordered = list.type === 'orderedList'
  const start = Number(list.attrs?.start ?? 1) || 1
  return (list.content ?? [])
    .map((item, k) => {
      const kids = item.content ?? []
      const text = kids
        .filter((c) => !isList(c))
        .map((p) => serializeInline(p.content ?? []))
        .join(' ')
      const subs = kids
        .filter(isList)
        .map((sub) => '\n' + serializeList(sub, indent + '  '))
        .join('')
      return `${indent}${ordered ? `${start + k}.` : '-'} ${text}${subs}`
    })
    .join('\n')
}

/** Documento ProseMirror (JSON) -> markdown ligero del proyecto. */
export function jsonToMd(doc: JsonNode): string {
  const blocks = (doc.content ?? []).map(serializeBlock)
  // Un único párrafo vacío es el documento "vacío" del editor: cadena vacía.
  return blocks.join('\n')
}
