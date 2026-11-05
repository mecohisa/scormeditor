/**
 * Markdown ligero (`student_text`) → HTML, para el iDevice `text` de eXeLearning.
 *
 * Es un port TypeScript del pipeline de la carcasa (`src/runtime/assets/js/
 * renderer.js` + `interactions.js`), con la MISMA invariante anti-XSS: se escapa
 * primero y se aplica después un subconjunto controlado de formato. Se replica
 * aquí (en vez de importar el runtime, que es JS global de navegador) para que el
 * exportador sea autónomo y testeable en Node.
 *
 * Los callouts (`::: tipo … :::`), que eXe no tiene como concepto, se vierten a
 * una caja HTML con filete de color y título — el contenido y su intención se
 * conservan y quedan editables en eXe.
 *
 * `resolveAsset(src)` traduce una ruta de asset del editor (`assets/img/x.png`)
 * a la referencia del `.elpx` (`{{context_path}}/x.png`); la inyecta el
 * orquestador, que además copia el binario a `content/resources/`.
 */

export type AssetResolver = (src: string) => string

const CALLOUTS: Record<string, { color: string; icon: string; label: string }> = {
  tip: { color: '#0f9490', icon: '💡', label: 'Consejo' },
  info: { color: '#5265c4', icon: 'ℹ️', label: 'Información' },
  warn: { color: '#c27b06', icon: '⚠️', label: 'Atención' },
  important: { color: '#c2417e', icon: '📌', label: 'Importante' },
  fact: { color: '#0f9490', icon: '🧠', label: '¿Sabías que…?' },
  reflect: { color: '#7787bf', icon: '💭', label: 'Reflexiona' },
  case: { color: '#c2570b', icon: '🧪', label: 'Caso práctico' },
  // Bloques con estructura de la carcasa (tarjetas/columnas): en eXe van como
  // callout con su lista y encabezados, sin la maqueta.
  stats: { color: '#0f9490', icon: '📊', label: 'Cifras destacadas' },
  compare: { color: '#5265c4', icon: '⚖️', label: 'Comparativa' },
  dodont: { color: '#1a7f37', icon: '✅', label: 'Qué hacer y qué evitar' },
}

export function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/** Texto enriquecido inline: **negrita**, *cursiva*, [texto](url). Escapa antes. */
export function rich(s: string): string {
  let out = esc(s)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, t, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${t}</a>`,
  )
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return out
}

/** Quita el marcado inline dejando texto plano (para atributos alt, títulos…). */
export function stripInline(s: string): string {
  return String(s ?? '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
}

function callout(type: string, innerHtml: string): string {
  const c = CALLOUTS[type] || CALLOUTS.info
  return (
    `<aside class="exe-block-alert" role="note" style="border-left:4px solid ${c.color};` +
    `background:color-mix(in srgb,${c.color} 12%,transparent);padding:.6em .9em;margin:1em 0;">` +
    `<p style="margin:0 0 .3em;font-weight:bold;">${c.icon} ${c.label}</p>` +
    `<div>${innerHtml}</div></aside>`
  )
}

function customCallout(params: string, innerHtml: string): string {
  const parts = String(params).split('|')
  if (parts.length && parts[0].trim() === '') parts.shift()
  const color = (parts[0] || '').trim()
  const icon = (parts[1] || '').trim()
  const title = (parts[2] || '').trim()
  const safe = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#7787BF'
  const head =
    icon || title
      ? `<p style="margin:0 0 .3em;font-weight:bold;">${icon ? esc(icon) + ' ' : ''}${esc(title)}</p>`
      : ''
  return (
    `<aside class="exe-block-alert" role="note" style="border-left:4px solid ${safe};` +
    `background:color-mix(in srgb,${safe} 12%,transparent);padding:.6em .9em;margin:1em 0;">` +
    `${head}<div>${innerHtml}</div></aside>`
  )
}

/** Convierte markdown ligero a HTML. `resolve` traduce rutas de imagen. */
export function mdToHtml(text: string, resolve: AssetResolver = (s) => s): string {
  if (!text) return ''
  return blocksToHtml(String(text).split(/\r?\n/), resolve)
}

function blocksToHtml(lines: string[], resolve: AssetResolver): string {
  let html = ''
  // Listas anidadas por sangría, misma pila que renderer.js de la carcasa:
  // cada lista abierta conserva su <li> abierto para poder anidar dentro.
  const lists: { tag: 'ul' | 'ol'; indent: number }[] = []
  const closeListsTo = (depth: number) => {
    while (lists.length > depth) html += `</li></${lists.pop()!.tag}>`
  }
  const closeLists = () => closeListsTo(0)
  const indentOf = (s: string) => /^[ \t]*/.exec(s)![0].replace(/\t/g, '  ').length
  const listItem = (tag: 'ul' | 'ol', indent: number, openAttrs: string, liOpen: string) => {
    while (lists.length && lists[lists.length - 1].indent > indent) closeListsTo(lists.length - 1)
    const top = lists[lists.length - 1]
    if (top && top.indent === indent && top.tag === tag) {
      html += '</li>'
    } else {
      if (top && top.indent === indent) closeListsTo(lists.length - 1)
      html += `<${tag}${openAttrs}>`
      lists.push({ tag, indent })
    }
    html += liOpen
  }
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    const open = /^\s*:::\s*([A-Za-z]+)\s*(.*)$/.exec(ln)
    if (open) {
      closeLists()
      const type = open[1].toLowerCase()
      const rest = open[2] || ''
      const inner: string[] = []
      for (i++; i < lines.length && !/^\s*:::\s*$/.test(lines[i]); i++) inner.push(lines[i])
      const innerHtml = blocksToHtml(inner, resolve)
      html += type === 'custom' ? customCallout(rest, innerHtml) : callout(type, innerHtml)
      continue
    }
    const h = /^(#{2,3})\s+(.*)$/.exec(ln)
    if (h) {
      closeLists()
      const lv = h[1].length
      html += `<h${lv}>${rich(h[2])}</h${lv}>`
      continue
    }
    const bh = /^\s*\*\*(.+?)\*\*\s*:?\s*$/.exec(ln)
    if (bh) {
      closeLists()
      html += `<h3>${rich(bh[1])}</h3>`
      continue
    }
    const oli = /^\s*(\d+)[.)]\s+(.*)/.exec(ln)
    if (oli) {
      listItem('ol', indentOf(ln), ` start="${oli[1]}"`, `<li value="${oli[1]}">${rich(oli[2])}`)
      continue
    }
    const im = /^\s*!\[([^\]|]*)(?:\|(\d{1,3}))?\]\((assets\/[^\s)]+|https?:\/\/[^\s)]+)\)\s*$/.exec(ln)
    if (im) {
      closeLists()
      const iw = im[2] ? Math.min(100, Math.max(10, parseInt(im[2], 10))) : 0
      html +=
        `<p><img src="${esc(resolve(im[3]))}" alt="${esc(im[1])}"` +
        (iw ? ` style="width:${iw}%"` : '') +
        '></p>'
      continue
    }
    const uli = /^\s*[-*•·–—]\s+(.*)/.exec(ln)
    if (uli) {
      listItem('ul', indentOf(ln), '', `<li>${rich(uli[1])}`)
      continue
    }
    closeLists()
    if (ln.trim() !== '') html += `<p>${rich(ln)}</p>`
  }
  closeLists()
  return html
}
