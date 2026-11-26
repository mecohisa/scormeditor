import type { Course } from '../schema/course.schema'
import { screenContainers, containerLabel } from '../schema/traverse'
import { validateCourse, type Issue, type ValidationResult } from '../validation/validators'
import { conformance, groupByCriterion, type A11yGroup, type Conformance } from '../validation/accessibility'

export interface Counts {
  modules: number
  units: number
  screens: number
  interactions: number
  questions: number
}

function counts(course: Course): Counts {
  let screens = 0, interactions = 0
  // Cada unidad genera DOS contenedores (propio y de cierre, «entre
  // unidades»): contar unidades por contenedor las duplicaría.
  const units = course.modules.reduce((a, m) => a + m.units.length, 0)
  screenContainers(course).forEach(({ screens: ss }) => {
    ss.forEach((s) => { screens++; if (s.interaction) interactions++ })
  })
  const questions =
    (course.assessments.final_test?.questions.length ?? 0) +
    course.assessments.unit_tests.reduce((a, t) => a + t.questions.length, 0)
  return { modules: course.modules.length, units, screens, interactions, questions }
}

export interface MatrixRow {
  objective: string
  /** Ubicación módulo › unidad ('—' para el test final). */
  path: string
  screen: string
  interaction: string
  evaluation: string
  /** Pantalla enlazable en el editor ('__final__' para el test final). */
  screenId?: string
}

function traceabilityMatrix(course: Course): MatrixRow[] {
  const rows: MatrixRow[] = []
  screenContainers(course).forEach((c) => {
    const path = containerLabel(c)
    c.screens.forEach((s) => {
      if (!s.objective && !s.interaction) return
      rows.push({
        objective: s.objective || '—',
        path,
        screen: `${s.title || s.id} (${s.type})`,
        interaction: s.interaction ? s.interaction.type : '—',
        evaluation: s.interaction?.scored ? `Sí (${s.interaction.points} pts)` : 'No',
        screenId: s.id,
      })
    })
    // Tests de unidad: se enlazan a la primera pantalla de su unidad. Cada
    // unidad genera DOS contenedores (propio y de cierre, «entre unidades»)
    // — el test solo se lista una vez, en el contenedor propio (`!c.closing`).
    const u = c.unit
    if (u && !c.closing) course.assessments.unit_tests.filter((t) => t.unit_id === u.id).forEach((t) =>
      t.questions.forEach((q) => rows.push({
        objective: q.learning_objective || '—',
        path,
        screen: `Test de unidad «${t.title || t.id}»`,
        interaction: q.type,
        evaluation: `Sí (${q.points} pts)`,
        screenId: u.screens[0]?.id,
      })))
  })
  course.assessments.final_test?.questions.forEach((q) => {
    rows.push({ objective: q.learning_objective || '—', path: '—', screen: 'Test final', interaction: q.type, evaluation: `Sí (${q.points} pts)`, screenId: '__final__' })
  })
  return rows
}

export interface QARow {
  question: string
  correct: string
  objective: string
  /** De dónde sale la pregunta (pantalla, test de unidad o test final). */
  origin: string
  screenId?: string
}

function qaTable(course: Course): QARow[] {
  const rows: QARow[] = []
  const collect = (prompt: string, options: { text: string; correct?: boolean }[], obj: string, origin: string, screenId?: string) => {
    const correct = options.filter((o) => o.correct).map((o) => o.text).join(', ') || '—'
    rows.push({ question: prompt, correct, objective: obj || '—', origin, screenId })
  }
  screenContainers(course).forEach(({ unit: u, screens, closing }) => {
    screens.forEach((s) => {
      const it = s.interaction
      if (it && (it.options || []).some((o) => o.correct))
        collect(it.prompt, it.options, s.objective, s.title || s.id, s.id)
    })
    // Igual que en traceabilityMatrix: el test de unidad solo se lista una
    // vez, no una por cada uno de los dos contenedores de la unidad.
    if (u && !closing) course.assessments.unit_tests.filter((t) => t.unit_id === u.id).forEach((t) =>
      t.questions.forEach((q) =>
        collect(q.prompt, q.options, q.learning_objective, `Test de unidad «${t.title || t.id}»`, u.screens[0]?.id)))
  })
  course.assessments.final_test?.questions.forEach((q) =>
    collect(q.prompt, q.options, q.learning_objective, 'Test final', '__final__'))
  return rows
}

const ACCESSIBILITY_CHECKS = [
  { code: 'IMG_NO_ALT', label: 'Todas las imágenes tienen texto alternativo' },
  { code: 'VIDEO_NO_TRANSCRIPT', label: 'Todos los vídeos tienen transcripción' },
  { code: 'MEDIA_NO_SUBS', label: 'Medios con voz tienen subtítulos VTT' },
]
const INTERACTIVITY_CHECKS = [
  { code: 'UNIT_NO_ACTIVITY', label: 'Todas las unidades tienen actividad o test' },
  { code: 'Q_NO_FEEDBACK', label: 'Todas las preguntas tienen feedback' },
  { code: 'INT_NO_OBJECTIVE', label: 'Interacciones vinculadas a un objetivo' },
]
const SCORM_CHECKS = [
  { code: 'SCORM_NO_ID', label: 'Identificador SCORM definido' },
  { code: 'SCORM_NO_FINAL', label: 'Origen de la nota coherente con el contenido' },
  { code: 'Q_NO_CORRECT', label: 'Todas las preguntas tienen respuesta correcta' },
]

export interface ChecklistItem { code: string; label: string; failed: boolean }
export interface Checklist { label: string; items: ChecklistItem[] }

function buildChecklists(issues: Issue[]): Checklist[] {
  const build = (label: string, defs: { code: string; label: string }[]): Checklist => ({
    label,
    items: defs.map((d) => ({ ...d, failed: issues.some((i) => i.code === d.code) })),
  })
  return [
    build('Accesibilidad', ACCESSIBILITY_CHECKS),
    build('Interactividad', INTERACTIVITY_CHECKS),
    build('SCORM / Moodle', SCORM_CHECKS),
  ]
}

/**
 * Modelo estructurado del informe: única fuente para el render interactivo de
 * `ReportPanel` (con enlaces al editor vía `screenId`) y para las exportaciones
 * Markdown/HTML/PDF.
 */
export interface ReportData {
  counts: Counts
  validation: ValidationResult
  matrix: MatrixRow[]
  qa: QARow[]
  checklists: Checklist[]
  /** Errores (riesgos bloqueantes). */
  risks: Issue[]
  /** Avisos (pendientes de validación por la entidad). */
  pending: Issue[]
  /** Hallazgos de accesibilidad agrupados por criterio WCAG (`A11Y_CODES`). */
  accessibility: A11yGroup[]
  /** Situación de cumplimiento UNE-EN 301 549 calculada (`conformance`). */
  conformance: { status: Conformance; errors: number; warnings: number }
}

export function buildReport(course: Course): ReportData {
  const validation = validateCourse(course)
  return {
    counts: counts(course),
    validation,
    matrix: traceabilityMatrix(course),
    qa: qaTable(course),
    checklists: buildChecklists(validation.issues),
    risks: validation.issues.filter((i) => i.severity === 'error'),
    pending: validation.issues.filter((i) => i.severity === 'warning'),
    accessibility: groupByCriterion(validation.issues),
    conformance: conformance(validation.issues),
  }
}

/** Texto de la situación de cumplimiento (Informe y declaración). */
export function conformanceLabel(c: { status: Conformance }): string {
  return c.status === 'full' ? 'Plenamente conforme' : 'Parcialmente conforme'
}

/** Neutraliza caracteres que romperían una celda de tabla Markdown. */
function mdCell(s: string): string {
  return String(s ?? '').replace(/\|/g, '¦').replace(/\s*\n\s*/g, ' ')
}

function checklistMd(list: Checklist): string {
  const rows = list.items.map((d) => `| ${d.failed ? '❌' : '✅'} | ${mdCell(d.label)} |`).join('\n')
  return `### ${list.label}\n\n| Estado | Criterio |\n|:---:|---|\n${rows}\n`
}

/** Genera el informe de revisión en Markdown. */
export function generateReportMarkdown(course: Course): string {
  const { counts: c, matrix, qa, checklists, risks, pending, accessibility, conformance: conf } = buildReport(course)

  const md: string[] = []
  md.push(`# Informe de revisión — ${course.course.title || 'Curso'}\n`)
  md.push(`> Documento de apoyo a la revisión interna. **No constituye homologación ni acreditación oficial**; queda pendiente de validación por la entidad y la administración competente.\n`)

  md.push(`## 1. Datos generales\n`)
  md.push(`- **Título:** ${course.course.title}`)
  md.push(`- **Entidad:** ${course.course.authoring_entity || '—'}`)
  md.push(`- **Fuente documental:** ${course.course.source_document || '—'}`)
  md.push(`- **Idioma:** ${course.course.language}`)
  md.push(`- **Duración estimada:** ${course.course.estimated_hours || '—'} h`)
  md.push(`- **SCORM:** ${course.scorm.version} · id \`${course.scorm.identifier}\` · nota mínima ${course.scorm.rules.min_score}%\n`)

  md.push(`## 2. Estructura\n`)
  md.push(`| Módulos | Unidades | Pantallas | Interacciones | Preguntas |`)
  md.push(`|:---:|:---:|:---:|:---:|:---:|`)
  md.push(`| ${c.modules} | ${c.units} | ${c.screens} | ${c.interactions} | ${c.questions} |\n`)

  md.push(`## 3. Matriz de trazabilidad (objetivo ↔ pantalla ↔ interacción ↔ evaluación)\n`)
  md.push(`| Objetivo | Ubicación | Pantalla | Interacción | Evaluado |`)
  md.push(`|---|---|---|---|---|`)
  matrix.forEach((r) => md.push(`| ${mdCell(r.objective)} | ${mdCell(r.path)} | ${mdCell(r.screen)} | ${mdCell(r.interaction)} | ${mdCell(r.evaluation)} |`))
  md.push('')

  md.push(`## 4. Preguntas y respuestas correctas\n`)
  md.push(`| Pregunta | Origen | Respuesta correcta | Objetivo |`)
  md.push(`|---|---|---|---|`)
  qa.forEach((r) => md.push(`| ${mdCell(r.question)} | ${mdCell(r.origin)} | ${mdCell(r.correct)} | ${mdCell(r.objective)} |`))
  md.push('')

  md.push(`## 5. Checklists\n`)
  checklists.forEach((list) => md.push(checklistMd(list)))

  md.push(`## 6. Accesibilidad (UNE-EN 301 549 / WCAG 2.1 nivel AA)\n`)
  md.push(`- **Situación (autoevaluación):** ${conformanceLabel(conf)} · ${conf.errors} error${conf.errors === 1 ? '' : 'es'} y ${conf.warnings} aviso${conf.warnings === 1 ? '' : 's'} de accesibilidad\n`)
  if (accessibility.length === 0) md.push(`_Sin hallazgos de accesibilidad._`)
  else accessibility.forEach((g) => {
    md.push(`### ${g.criterion.id} ${g.criterion.name} (nivel ${g.criterion.level})\n`)
    g.issues.forEach((i) => md.push(`- ${i.severity === 'error' ? '⛔' : '⚠'} **[${i.code}]** ${i.message} — _${i.location}_`))
    md.push('')
  })
  md.push('')

  md.push(`## 7. Riesgos detectados (errores)\n`)
  if (risks.length === 0) md.push(`_Sin errores bloqueantes._`)
  else risks.forEach((i) => md.push(`- **[${i.code}]** ${i.message} — _${i.location}_`))
  md.push('')

  md.push(`## 8. Pendientes de validación normativa / por la entidad\n`)
  if (pending.length === 0) md.push(`_Sin avisos._`)
  else pending.forEach((i) => md.push(`- **[${i.code}]** ${i.message} — _${i.location}_`))
  md.push('')
  md.push(`> **Pendiente de revisión por la entidad** y, en su caso, de alineación con criterios del SEPE o administración competente.\n`)

  return md.join('\n')
}

/** Envuelve el Markdown en un HTML imprimible/exportable a PDF (vía navegador). */
export function generateReportHtml(course: Course): string {
  const md = generateReportMarkdown(course)
  // Conversión MD→HTML mínima para tablas/encabezados/listas
  const html = mdToHtml(md)
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe — ${escape(course.course.title)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1b1f24;line-height:1.5}
  h1{border-bottom:3px solid #0b5fff;padding-bottom:.3rem}
  table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.9rem}
  th,td{border:1px solid #dce0e6;padding:.4rem .6rem;text-align:left;vertical-align:top}
  th{background:#f0f4ff}
  blockquote{background:#fff8e6;border-left:4px solid #d09a00;margin:1rem 0;padding:.5rem 1rem}
  code{background:#eef;padding:.1rem .3rem;border-radius:4px}
  @media print{body{margin:0}}
</style></head><body>${html}</body></html>`
}

// Conversor Markdown→HTML mínimo (encabezados, tablas, listas, negrita, blockquote)
function mdToHtml(md: string): string {
  const lines = md.split('\n')
  let html = '', i = 0
  const inline = (s: string) =>
    escape(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')
  while (i < lines.length) {
    const ln = lines[i]
    if (/^\|/.test(ln) && /^\|[-: |]+\|$/.test(lines[i + 1] || '')) {
      const header = ln.split('|').slice(1, -1).map((c) => `<th>${inline(c.trim())}</th>`).join('')
      i += 2
      let body = ''
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => `<td>${inline(c.trim())}</td>`).join('')
        body += `<tr>${cells}</tr>`; i++
      }
      html += `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`
      continue
    }
    const h = /^(#{1,4})\s+(.*)/.exec(ln)
    if (h) { html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; i++; continue }
    if (/^>\s?/.test(ln)) { html += `<blockquote>${inline(ln.replace(/^>\s?/, ''))}</blockquote>`; i++; continue }
    if (/^-\s+/.test(ln)) {
      let items = ''
      while (i < lines.length && /^-\s+/.test(lines[i])) { items += `<li>${inline(lines[i].replace(/^-\s+/, ''))}</li>`; i++ }
      html += `<ul>${items}</ul>`; continue
    }
    if (ln.trim()) html += `<p>${inline(ln)}</p>`
    i++
  }
  return html
}

function escape(s: string) {
  return String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
}

// --- Declaración de accesibilidad ----------------------------------------------

export interface A11yStatementInput {
  /** Entidad responsable del curso. */
  entity: string
  /** Contacto para comunicaciones sobre accesibilidad (correo, teléfono, formulario). */
  contact: string
  /** Versión del curso que se declara. */
  version: string
}

/** Escapa TODO texto que se interpola en el HTML de la declaración (anti-XSS:
 *  títulos, mensajes y campos del usuario son texto libre). */
function escHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Declaración de accesibilidad del curso: HTML autocontenido e imprimible (Imprimir →
 * Guardar como PDF), en español. La situación se CALCULA con el validador
 * (`conformance`): «plenamente conforme» solo sin errores ni avisos de accesibilidad.
 * Es una autoevaluación: no afirma homologación, acreditación ni auditoría externa.
 * Las «medidas de la plataforma» describen lo que la carcasa hace de verdad
 * (src/runtime): si cambia la carcasa, revisar este texto.
 */
export function generateA11yStatementHtml(course: Course, input: A11yStatementInput, now = new Date()): string {
  const { accessibility, conformance: conf } = buildReport(course)
  const e = escHtml
  const title = course.course.title || 'Curso'
  const entity = input.entity.trim() || '[entidad responsable]'
  const contact = input.contact.trim() || '[contacto para comunicaciones de accesibilidad]'
  const date = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const norm = 'la norma UNE-EN 301 549:2022 (requisitos de contenido web equivalentes a las WCAG 2.1, niveles A y AA)'
  const reasons = [
    conf.errors > 0 ? `${plural(conf.errors, 'incumplimiento pendiente', 'incumplimientos pendientes')} de corregir` : '',
    conf.warnings > 0 ? `${plural(conf.warnings, 'aspecto pendiente', 'aspectos pendientes')} de comprobación manual` : '',
  ].filter(Boolean).join(' y ')
  const statusText = conf.status === 'full'
    ? `El contenido de este curso es <strong>plenamente conforme</strong> con ${norm}, según la autoevaluación descrita más abajo.`
    : `El contenido de este curso es <strong>parcialmente conforme</strong> con ${norm}, debido a ${reasons}, que se enumeran a continuación.`
  const list = (sev: 'error' | 'warning') => {
    const groups = accessibility
      .map((g) => ({ g, items: g.issues.filter((i) => i.severity === sev) }))
      .filter((x) => x.items.length)
    if (!groups.length) return '<p><em>Ninguno.</em></p>'
    return groups.map(({ g, items }) =>
      `<h4>${e(g.criterion.id)} ${e(g.criterion.name)} (nivel ${e(g.criterion.level)})</h4><ul>` +
      items.map((i) => `<li>${e(i.message)} <span class="loc">— ${e(i.location)}</span></li>`).join('') +
      '</ul>').join('\n')
  }
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Declaración de accesibilidad — ${e(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;color:#1b1f24;background:#fff;line-height:1.55}
  h1{font-size:1.7rem;border-bottom:3px solid #1b1f24;padding-bottom:.3rem}
  h2{font-size:1.2rem;margin-top:2rem}
  h3{font-size:1.05rem}
  h4{font-size:.98rem;margin:1rem 0 .3rem}
  dl{display:grid;grid-template-columns:max-content 1fr;gap:.25rem 1rem}
  dt{font-weight:600}
  dd{margin:0}
  .status{border-left:4px solid #1b1f24;background:#f3f4f6;padding:.6rem 1rem}
  .loc{color:#4b5563}
  .note{font-size:.9rem;color:#374151}
  @media print{body{margin:0;max-width:none}}
</style></head><body>
<h1>Declaración de accesibilidad</h1>
<p>${e(entity)} se compromete a hacer accesible el contenido de este curso en línea, tomando como referencia la norma <strong>UNE-EN 301 549:2022</strong> «Requisitos de accesibilidad para productos y servicios TIC», cuyos requisitos para contenido web equivalen a las Pautas de Accesibilidad para el Contenido Web (<strong>WCAG 2.1, nivel AA</strong>).</p>
<p>Esta declaración se aplica al siguiente contenido:</p>
<dl>
  <dt>Curso</dt><dd>${e(title)}</dd>
  ${course.course.subtitle.trim() ? `<dt>Subtítulo</dt><dd>${e(course.course.subtitle)}</dd>` : ''}
  <dt>Versión</dt><dd>${e(input.version.trim() || '—')}</dd>
  <dt>Identificador SCORM</dt><dd>${e(course.scorm.identifier)}</dd>
  <dt>Fecha de la declaración</dt><dd>${e(date)}</dd>
</dl>

<h2>Situación de cumplimiento</h2>
<p class="status">${statusText}</p>

<h2>Contenido no accesible</h2>
<h3>Falta de conformidad (incumplimientos detectados)</h3>
${list('error')}
<h3>Aspectos pendientes de comprobación manual</h3>
<p class="note">Puntos que la herramienta no puede verificar por sí sola (por ejemplo, la calidad de los subtítulos de un vídeo externo) o que requieren criterio humano.</p>
${list('warning')}

<h2>Medidas de accesibilidad de la plataforma</h2>
<p>El curso se presenta en una carcasa de navegación común que incorpora estas medidas:</p>
<ul>
  <li><strong>Navegación por teclado</strong>: el curso puede recorrerse con el teclado, con atajos de navegación, enlace «Saltar al contenido», foco visible y gestión del foco al cambiar de pantalla y en las ventanas modales.</li>
  <li><strong>Compatibilidad con lectores de pantalla</strong>: estructura semántica de encabezados, nombres accesibles en botones y controles, y anuncio de resultados y avisos mediante regiones dinámicas (<em>aria-live</em>).</li>
  <li><strong>Tamaño de texto ajustable</strong> con los botones A− / A+ de la barra superior, además del zoom del navegador.</li>
  <li><strong>Transcripciones</strong>: botón «Transcripción» en las pantallas con locución o vídeo, como alternativa textual al contenido sonoro.</li>
  <li><strong>Subtítulos</strong>: los vídeos propios admiten pistas de subtítulos (WebVTT) seleccionables en el reproductor.</li>
  <li><strong>Respeto de «reducir movimiento»</strong>: si el sistema del alumno lo tiene activado, se desactivan las animaciones y transiciones.</li>
  <li><strong>Zoom de imágenes</strong>: las imágenes pueden ampliarse en un visor que se maneja también con el teclado.</li>
</ul>

<h2>Método de evaluación</h2>
<p>Autoevaluación con el validador de SCORMEditor y análisis automático del contenido (textos alternativos, transcripciones, subtítulos, contraste de colores, textos de enlace, estructura de encabezados y actividades), que debe completarse con la revisión manual de los aspectos señalados como pendientes de comprobación. No se trata de una auditoría externa.</p>

<h2>Comunicaciones sobre accesibilidad</h2>
<p>Si encuentra alguna barrera de accesibilidad en este curso o necesita la información en un formato alternativo, puede comunicarlo a ${e(entity)} a través de: <strong>${e(contact)}</strong>.</p>

<p class="note">Documento generado con SCORMEditor el ${e(date)}. Esta declaración refleja una autoevaluación del contenido y no constituye homologación, acreditación ni certificación oficial.</p>
</body></html>`
}
