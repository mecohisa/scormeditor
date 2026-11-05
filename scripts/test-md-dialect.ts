/* =============================================================================
 * test-md-dialect.ts — Batería de round-trip del dialecto markdown del editor.
 * Ejecutar:  npx tsx scripts/test-md-dialect.ts
 *
 * Garantías que comprueba (la red de seguridad del editor WYSIWYG):
 *  1) CORPUS CANÓNICO: jsonToMd(mdToJson(x)) === x, byte a byte.
 *  2) IDEMPOTENCIA: una segunda pasada no cambia nada.
 *  3) EQUIVALENCIA DE RENDER: para TODOS los strings del curso demo (sampleCourse),
 *     el mdToHtml REAL de la carcasa (evaluado desde src/runtime) produce el
 *     mismo HTML antes y después del round-trip. Si esto pasa, editar un texto
 *     con el nuevo editor no puede cambiar lo que ve el alumno.
 * ===========================================================================*/
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'
import { mdToJson, jsonToMd } from '../src/text/mdDialect'
import { sampleCourse } from '../src/schema/sample-course'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// --- mdToHtml real de la carcasa, evaluado en un sandbox -------------------
function loadRuntimeMdToHtml(): (s: string) => string {
  const windowObj: Record<string, unknown> = {}
  const ctx = vm.createContext({ window: windowObj })
  for (const f of ['interactions.js', 'renderer.js']) {
    const src = readFileSync(join(root, 'src', 'runtime', 'assets', 'js', f), 'utf8')
    vm.runInContext(src, ctx, { filename: f })
  }
  const renderer = windowObj.Renderer as { mdToHtml: (s: string) => string }
  if (!renderer?.mdToHtml) throw new Error('No se pudo cargar Renderer.mdToHtml del runtime')
  return renderer.mdToHtml
}

const roundtrip = (s: string) => jsonToMd(mdToJson(s))

let failures = 0
function fail(title: string, detail: string) {
  failures++
  console.error(`✗ ${title}\n${detail}\n`)
}

// --- 1) Corpus canónico: round-trip EXACTO ---------------------------------
const CANONICAL: string[] = [
  '',
  'Hola mundo',
  'Hola **mundo** y *cursiva*',
  '***negrita y cursiva***',
  '## Título\n### Subtítulo',
  'a\n\nb',
  'a\nb\nc',
  '- uno\n- dos\n- tres',
  '1. uno\n2. dos\n3. tres',
  '5. cinco\n6. seis',
  '3. tres\n5. cinco',
  '1. a\n1. b',
  '- lista\n\n1. numerada\n2. sigue',
  '[web](https://example.com) y [correo](mailto:a@b.com)',
  '**[enlace](https://x.example) en negrita**',
  '[**negrita** dentro](https://x.example)',
  '*a **b** c*',
  '![Foto|50](assets/img/x.png)',
  '![](assets/img/y.jpg)',
  '![externa](https://example.com/img.png)',
  '![Foto|50](assets/img/x.png "Pie de foto")',
  '![](assets/img/y.jpg "Pie con **negrita** y [enlace](https://x.example)")',
  '![video](https://youtu.be/dQw4w9WgXcQ "Fuente: **Canal** — [ver más](https://x.example)")',
  '::: tip\nUn consejo\n:::',
  '::: warn\n- item uno\n- item dos\n:::',
  '::: custom | #6DC3C0 | 🎯 | Meta\nCuerpo **fuerte**\n:::',
  '::: custom | #F4C910 |  | \nCuerpo\n:::',
  '::: important\n## Dentro\nTexto\n![img](assets/img/z.png)\n:::',
  'Párrafo antes\n::: fact\n¿Sabías?\n:::\nPárrafo después',
  '**Título en negrita**:',
  'Texto con ::: en medio',
  ':::',
  '2 + 2 = 4',
  'Precio: 10.50 EUR',
  '## Encabezado con **negrita** y [enlace](https://a.b)',
  '- item con **negrita** y [enlace](mailto:x@y.z)',
  '1. numerado con *cursiva*',
  '{center}Texto centrado',
  '{right}Texto a la derecha',
  '{center}## Título centrado',
  '{right}### Subtítulo a la derecha',
  '{center}Uno\nSin marca\n{right}Otro',
  '::: stats\n- **80 %** de los casos\n- **3 de cada 10** personas\n:::',
  '::: compare\n### Opción A\n- uno\n- dos\n### Opción B\n- tres\n:::',
  '::: dodont\nEntradilla\n### Qué hacer\n- Lavarse las manos\n### Qué evitar\n- Tocarse la cara\n:::',
  '::: compare\nSolo una columna\n### Única\n- sin pareja\n:::',
  // Sublistas: 2 espacios de sangría por nivel (forma canónica del editor).
  '- uno\n  - uno.a\n  - uno.b\n- dos',
  '1. Paso\n  - detalle\n  - otro\n2. Paso dos',
  '- a\n  - b\n    - c\n- d',
  '- a\n  1. sub uno\n  2. sub dos\n- e',
  '- a\n  - b\nPárrafo',
  '::: tip\n- a\n  - b\n:::',
]
// La cabecera del custom vacío lleva espacios finales que el corpus de arriba
// no puede expresar sin que el editor los recorte: se comprueba aparte.
for (const src of CANONICAL) {
  const rt = roundtrip(src)
  if (rt !== src) fail('round-trip exacto', `original:\n${JSON.stringify(src)}\nround-trip:\n${JSON.stringify(rt)}`)
  const rt2 = roundtrip(rt)
  if (rt2 !== rt) fail('idempotencia', `1ª pasada:\n${JSON.stringify(rt)}\n2ª pasada:\n${JSON.stringify(rt2)}`)
}

// --- 2) Casos que se NORMALIZAN (permitido): solo exigen render igual ------
const mdToHtml = loadRuntimeMdToHtml()
const NORMALIZED: string[] = [
  '* viñeta con asterisco\n• viñeta con punto\n– viñeta con guión',
  '1) paréntesis\n2) sigue',
  '::: tip texto tras el tipo\ncuerpo\n:::',
  '::: tip\nsin cierre',
  '::: custom | #F4C910 |  | ',
  '[texto **con negrita** y *cursiva*](https://x.example)',
  '- a\n    - b con 4 espacios\n- c',
  '1. a\n   - b con 3 espacios\n2. c',
  '- a\n\t- b con tabulador',
  '  - lista sangrada sin padre\n  - sigue',
]
// Sublistas: el HTML de la carcasa anida de verdad la lista dentro del <li>.
{
  const html = mdToHtml('- uno\n  - uno.a\n- dos')
  const want = '<ul><li>uno<ul><li>uno.a</li></ul></li><li>dos</li></ul>'
  if (html !== want) fail('sublista anidada en la carcasa', `esperado:\n${want}\nobtenido:\n${html}`)
}
for (const src of [...CANONICAL, ...NORMALIZED]) {
  const rt = roundtrip(src)
  const a = mdToHtml(src)
  const b = mdToHtml(rt)
  if (a !== b) fail('equivalencia de render', `original:\n${JSON.stringify(src)}\nhtml original:\n${a}\nround-trip:\n${JSON.stringify(rt)}\nhtml round-trip:\n${b}`)
  const rt2 = roundtrip(rt)
  if (rt2 !== rt) fail('idempotencia (normalizados)', `1ª:\n${JSON.stringify(rt)}\n2ª:\n${JSON.stringify(rt2)}`)
}

// --- 3) Curso demo completo: render igual para TODOS los strings ---------
// El demo es `sampleCourse` (src/schema/sample-course.ts), el que abre el
// editor; el antiguo docs/internals/demo-scormeditor.scormproj se retiró.
async function testDemo() {
  const course = sampleCourse

  let checked = 0
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') {
      checked++
      const rt = roundtrip(v)
      const a = mdToHtml(v)
      const b = mdToHtml(rt)
      if (a !== b) fail(`render distinto en demo (${path})`, `original:\n${JSON.stringify(v)}\nround-trip:\n${JSON.stringify(rt)}\nhtml original:\n${a}\nhtml round-trip:\n${b}`)
      const rt2 = roundtrip(rt)
      if (rt2 !== rt) fail(`idempotencia en demo (${path})`, `1ª:\n${JSON.stringify(rt)}\n2ª:\n${JSON.stringify(rt2)}`)
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${path}[${i}]`))
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`)
    }
  }
  walk(course, 'course')
  console.log(`Demo: ${checked} strings comprobados.`)
}

testDemo()
  .then(() => {
    if (failures) {
      console.error(`\n${failures} fallo(s).`)
      process.exit(1)
    }
    console.log(`Corpus canónico: ${CANONICAL.length} casos exactos. Normalizados: ${NORMALIZED.length}. Todo OK ✓`)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
