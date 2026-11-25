#!/usr/bin/env node
/**
 * Convierte un backup Moodle (formato moodle2, ya extraído en una carpeta —
 * no hace falta descomprimir el .mbz/.tar.gz aparte, este script lee
 * directamente las carpetas activities/sections/files/*.xml) a uno o varios
 * `.scormproj` de SCORMEditor.
 *
 * Alcance deliberado: solo actividades "lesson" (páginas de contenido simple,
 * qtype 20 — sin ramificar) y "quiz" (preguntas multichoice/truefalse desde el
 * banco de preguntas). Cualquier otra actividad (forum, label, page, resource,
 * customcert...) se ignora: no tiene equivalente 1:1 en el modelo de
 * SCORMEditor y su conversión sería más ruido que ayuda.
 *
 * Convención de salida (calcada de los .scormproj ya producidos a mano por el
 * flujo GPT+PDF para este mismo tipo de curso, ver docs/internals/ingesta-gpt.md):
 * un .scormproj por "Unidad" (sección de Moodle) = 1 SCO independiente con su
 * propio test final (`assessments.final_test`, no `unit_tests[]`); dentro,
 * una Unit del editor por cada "Tema" (lesson) de esa sección, en el ORDEN
 * REAL de Moodle (`<sequence>` de la sección — no el título).
 *
 * Uso:
 *   node scripts/moodle-import/moodle-to-scormproj.mjs <backupDir> <outDir> [--prefix xxx] [--course-name "..."]
 *
 * Limitaciones conocidas (ver informe que imprime al final):
 * - Mapeo literal, no rediseño pedagógico: no genera cover/objectives/route/
 *   summary ni varía tipos de interacción — cada página de lección es una
 *   pantalla `content` plana, cada pregunta del quiz una QuizQuestion.
 * - `objective`/`learning_objective` quedan vacíos (sin dato fuente fiable).
 * - Formato: solo negrita/cursiva/enlaces/listas/imágenes/las 9 combinaciones
 *   de caja observadas en el corpus real; cualquier HTML fuera de ese
 *   subconjunto se aplana a texto plano (ver scripts/moodle-import/html-to-md.mjs).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import {
  parseSections, parseActivitiesIndex, stripWorkMarkers, parseLessonPages,
  parseQuestionBank, parseQuizQuestions, parseFilesIndex, physicalFilePath,
  extFromMime, slugify, parseCourseInfo,
} from './moodle-parse.mjs'
import { lessonHtmlToMarkdown, htmlToInlineText } from './html-to-md.mjs'

const args = process.argv.slice(2)
const backupDir = args[0]
const outDir = args[1]
const prefix = (flagValue('--prefix') || 'curso').toLowerCase()
const courseNameOverride = flagValue('--course-name')

function flagValue(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

if (!backupDir || !outDir || !existsSync(backupDir)) {
  console.error('Uso: node moodle-to-scormproj.mjs <backupDir> <outDir> [--prefix xxx] [--course-name "..."]')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const sections = parseSections(backupDir)
const activities = parseActivitiesIndex(backupDir)
const questionBank = parseQuestionBank(backupDir)
const filesIndex = parseFilesIndex(backupDir)
const courseInfo = parseCourseInfo(backupDir)

// Agrupa moduleids por sección, separando lesson/quiz, EN EL ORDEN REAL
// (<sequence> de section.xml), ignorando cualquier otra actividad.
const bySection = sections.map((sec) => {
  const lessons = []
  const quizzes = []
  for (const moduleid of sec.sequence) {
    const a = activities.get(moduleid)
    if (!a) continue
    if (a.modulename === 'lesson') lessons.push({ moduleid, ...a })
    else if (a.modulename === 'quiz') quizzes.push({ moduleid, ...a })
  }
  return { ...sec, lessons, quizzes }
})

// Solo secciones con AL MENOS 1 lección y 1 quiz cuentan como "Unidad"
// convertible (descarta portada/intro y cierre/certificado del curso, que no
// tienen ese patrón).
const unitsSections = bySection.filter((s) => s.lessons.length > 0 && s.quizzes.length > 0)

if (unitsSections.length === 0) {
  console.error('No se encontró ninguna sección con lecciones + quiz. ¿Backup correcto?')
  process.exit(1)
}

console.log(`Detectadas ${unitsSections.length} unidades convertibles de ${sections.length} secciones totales.`)

const report = []
const skippedQuestions = []

let unitNumber = 0
for (const sec of unitsSections) {
  unitNumber += 1
  const built = buildUnitProject(sec, unitNumber)
  const zip = new JSZip()
  zip.file('course.json', JSON.stringify(built.course, null, 2))
  for (const asset of built.assets) {
    zip.file(asset.zipPath, readFileSync(asset.absPath))
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })
  const outPath = join(outDir, `${built.course.course.id}.scormproj`)
  writeFileSync(outPath, buf)
  report.push({
    file: outPath,
    unit: sec.name,
    lessons: sec.lessons.length,
    screens: built.screenCount,
    questions: built.course.assessments.final_test?.questions.length ?? 0,
    images: built.assets.length,
  })
  console.log(`✓ ${outPath}  (${built.screenCount} pantallas, ${built.assets.length} imágenes, ${built.course.assessments.final_test?.questions.length ?? 0} preguntas)`)
}

console.log('\nResumen:')
console.table(report.map((r) => ({ unidad: r.unit, lecciones: r.lessons, pantallas: r.screens, preguntas: r.questions, imágenes: r.images })))

if (skippedQuestions.length > 0) {
  console.log(`\n⚠ ${skippedQuestions.length} pregunta(s) de tipo no soportado, EXCLUIDAS (añádelas a mano en el editor):`)
  console.table(skippedQuestions.map((s) => ({ unidad: s.section, quiz: s.quiz, qtype: s.qtype, pregunta: s.name })))
}

// ----------------------------------------------------------------------------

function buildUnitProject(sec, unitNumber) {
  const { title: unitTitleRaw } = stripWorkMarkers(sec.name)
  // "Unidad N: ..." / "Unidad N. ..." -> se queda solo la parte descriptiva
  // (el número de unidad ya lo aporta `unitNumber`/`u0N`, duplicarlo en el
  // slug y en "Unidad N. Unidad N: ..." es ruido).
  const unitTitleClean = unitTitleRaw.replace(/^unidad formativa\s+[IVX\d]+\s*[-:.]\s*/i, '').replace(/^unidad\s+\d+\s*[:.]\s*/i, '').trim() || unitTitleRaw
  const unitSlug = slugify(unitTitleClean)
  const uPad = String(unitNumber).padStart(2, '0')
  const courseId = courseNameOverride ? slugify(courseNameOverride) : `${prefix}-u${uPad}-${unitSlug}`
  const scormId = courseId.toUpperCase().replace(/-/g, '_')
  const moduleId = `m${uPad}`

  const assets = []
  let screenSeq = 0
  const nextScreenId = () => { screenSeq += 1; return `s${String(screenSeq).padStart(3, '0')}` }

  const units = sec.lessons.map((lessonAct, tIdx) => buildUnit(lessonAct, tIdx))
  // Un test por lección + uno final de sección (quizzes = lecciones + 1) →
  // tests por tema en `unit_tests` (anclados a su lección) y el último, `final_test`.
  // En cualquier otro caso, el primer quiz de la sección es el `final_test`.
  const perLesson = sec.quizzes.length === sec.lessons.length + 1
  const unitTests = []
  let finalTest = null
  if (perLesson) {
    sec.lessons.forEach((_, i) => {
      const t = buildAssessment(sec, sec.quizzes[i], units[i], `T${String(i + 1).padStart(2, '0')}`)
      if (t) unitTests.push({ ...t, unit_id: units[i].id })
    })
    finalTest = buildAssessment(sec, sec.quizzes[sec.quizzes.length - 1], units[units.length - 1], 'A01')
  } else {
    finalTest = buildAssessment(sec, sec.quizzes[0], units[units.length - 1], 'A01')
    if (finalTest) finalTest.unit_id = units[0]?.id || ''
  }

  function buildUnit(lessonAct, tIdx) {
    const lessonXmlPath = join(backupDir, lessonAct.directory, 'lesson.xml')
    const pages = parseLessonPages(lessonXmlPath)
    const { title: lessonTitleClean, hadMarker } = stripWorkMarkers(lessonAct.title)
    const tPad = String(tIdx).padStart(2, '0')

    const screens = pages.map((page, pIdx) => buildScreen(page, pIdx, lessonAct, hadMarker))

    return {
      id: `u${uPad}_t${tPad}`,
      title: lessonTitleClean,
      summary: '',
      status: 'ok',
      screens,
    }
  }

  function buildScreen(page, pageIdx, lessonAct, unitHadMarker) {
    const { title: pageTitleClean, hadMarker: pageHadMarker } = stripWorkMarkers(page.title)
    const editorNotes = []
    if (unitHadMarker || pageHadMarker) {
      editorNotes.push('Origen Moodle marcado "(MODIFICAR)": revisar contenido antes de publicar.')
    }

    const resolveImage = makeImageResolver(lessonAct.moduleid, page.id, assets)
    const { markdown, images } = lessonHtmlToMarkdown(page.contents, resolveImage)

    let student_text = markdown
    let visual_resource = { kind: 'none' }
    if (images.length === 1) {
      // Única imagen de la página -> recurso visual destacado (fuera del
      // texto); con 2+ se dejan todas inline en el cuerpo (ya insertadas por
      // lessonHtmlToMarkdown como ![alt](ruta)).
      const only = images[0]
      const marker = `![${(only.alt || '').replace(/[[\]]/g, '')}](${only.path})`
      student_text = student_text.replace(marker, '').replace(/\n{3,}/g, '\n\n').trim()
      visual_resource = { kind: 'image', src: only.path, alt: only.alt || '', layout: 'top' }
    }

    const heading = extractLeadingHeading(markdown) || pageTitleClean

    return {
      id: nextScreenId(),
      type: 'content',
      title: heading || 'Sin título',
      objective: '',
      student_text,
      source_refs: [{ doc: `Moodle: ${courseSourceLabel()}`, locator: `lesson_${lessonAct.moduleid} p.${pageIdx + 1}`, transform: 'conservación' }],
      visual_resource,
      interaction: null,
      interaction_layout: 'bottom',
      required: true,
      min_time_seconds: 0,
      audio_src: '',
      transcript: '',
      editor_notes: editorNotes,
      status: unitHadMarker || pageHadMarker ? 'borrador' : 'ok',
    }
  }

  function buildAssessment(sec, quizAct, targetUnit, id) {
    if (!quizAct) return null
    const quizXmlPath = join(backupDir, quizAct.directory, 'quiz.xml')
    const { questions, skipped } = parseQuizQuestions(quizXmlPath, questionBank)
    for (const sk of skipped) skippedQuestions.push({ section: sec.name, quiz: quizAct.title, ...sk })
    // Las preguntas «relacionar» de Moodle no caben en un test del editor
    // (solo single/multiple/true_false): pantalla de práctica con `match_pairs`
    // al final de la lección asociada.
    questions.filter((q) => q.type === 'match').forEach((q, i) => targetUnit.screens.push(buildMatchScreen(q, i)))
    const { title: quizTitleClean } = stripWorkMarkers(quizAct.title)
    return {
      id,
      title: quizTitleClean || 'Autoevaluación',
      instructions: '',
      questions: questions.filter((q) => q.type !== 'match').map((q, i) => {
        const bq = buildQuestion(q, i)
        // ids únicos entre los varios tests de un mismo proyecto
        if (id !== 'A01') bq.id = `${id}_${bq.id}`, bq.options.forEach((o, j) => (o.id = `${bq.id}_o${j + 1}`))
        return bq
      }),
      pass_score: 60,
      one_question_per_screen: false,
      unit_id: targetUnit.id,
    }
  }

  function buildQuestion(q, i) {
    const qId = `Q${String(i + 1).padStart(2, '0')}`
    const prompt = htmlToInlineText(q.questiontext)
    if (q.type === 'true_false') {
      const trueAns = q.answers.find((a) => /^verdadero$/i.test(a.text.trim()))
      const isTrue = trueAns ? trueAns.fraction > 0 : q.answers[0]?.fraction > 0
      return {
        id: qId,
        prompt,
        type: 'true_false',
        options: [
          { id: `${qId}_o1`, text: 'Verdadero', correct: isTrue },
          { id: `${qId}_o2`, text: 'Falso', correct: !isTrue },
        ],
        feedback: { correct: 'Correcto.', incorrect: 'Revisa el contenido de la unidad.', explanation: '' },
        points: 1,
        learning_objective: '',
        source_refs: [{ doc: `Moodle: ${courseSourceLabel()}`, locator: `quiz Q${i + 1}`, transform: 'conservación' }],
      }
    }
    return {
      id: qId,
      prompt,
      type: 'single_choice',
      options: q.answers.map((a, j) => ({
        id: `${qId}_o${j + 1}`,
        text: htmlToInlineText(a.text),
        correct: a.fraction > 0,
      })),
      feedback: { correct: 'Correcto.', incorrect: 'Revisa el contenido de la unidad.', explanation: '' },
      points: 1,
      learning_objective: '',
      source_refs: [{ doc: `Moodle: ${courseSourceLabel()}`, locator: `quiz Q${i + 1}`, transform: 'conservación' }],
    }
  }

  function buildMatchScreen(q, i) {
    const sid = nextScreenId()
    const prompt = htmlToInlineText(q.questiontext).replace(/\s+/g, ' ').trim()
    const groups = q.pairs.map((p, j) => ({ id: `g${j + 1}`, label: htmlToInlineText(p.term).replace(/\s+/g, ' ').trim() }))
    const options = q.pairs.map((p, j) => ({ id: `o${j + 1}`, text: htmlToInlineText(p.definition).replace(/\s+/g, ' ').trim(), group: `g${j + 1}` }))
    return {
      id: sid,
      type: 'content',
      title: `Actividad: ${((t) => t.charAt(0).toUpperCase() + t.slice(1))(prompt.replace(/[:.]+$/, '') || 'relaciona')}`,
      objective: '',
      student_text: 'Relaciona cada concepto con su definición o ejemplo.',
      source_refs: [{ doc: `Moodle: ${courseSourceLabel()}`, locator: `quiz «${q.name}» (relacionar)`, transform: 'conservación' }],
      visual_resource: { kind: 'none' },
      interaction: {
        id: `${sid}_i`,
        type: 'match_pairs',
        prompt: '',
        instructions: '',
        options,
        config: { groups },
        feedback: { correct: 'Emparejado correctamente.', incorrect: 'Alguna pareja no es correcta: revísalo.', explanation: '' },
        scored: false,
        points: 1,
        attempts: 2,
        retries: 0,
        source_refs: [],
      },
      interaction_layout: 'bottom',
      required: true,
      min_time_seconds: 0,
      audio_src: '',
      transcript: '',
      editor_notes: ['Pregunta «relacionar» del cuestionario Moodle, convertida en actividad de práctica (no puntúa).'],
      status: 'ok',
    }
  }

  function courseSourceLabel() {
    return courseNameOverride || courseInfo.shortname || courseInfo.fullname || 'curso'
  }

  const screenCount = units.reduce((n, u) => n + u.screens.length, 0)

  const course = {
    schema_version: '1.0.0',
    course: {
      id: courseId,
      title: `Unidad ${unitNumber}. ${unitTitleClean}`,
      subtitle: `SCO independiente de la Unidad ${unitNumber}`,
      description: `Unidad extraída automáticamente del backup Moodle (${courseSourceLabel()}). Revisar objetivos de aprendizaje (vacíos) y contenido marcado como borrador antes de publicar.`,
      authoring_entity: '',
      source_document: `Moodle: ${courseSourceLabel()} (export automático)`,
      estimated_hours: Math.max(1, Math.round(screenCount / 12)),
      language: 'es',
    },
    scorm: {
      version: '1.2',
      identifier: scormId,
      title: `Unidad ${unitNumber} - ${unitTitleClean}`,
      mastery_score: 60,
      rules: {
        min_required_screens_pct: 100,
        require_interactions: true,
        min_score: 60,
        attempts_allowed: 0,
        score_source: perLesson ? 'mixed' : 'final_test',
        mixed_final_weight: perLesson ? 50 : 70,
        navigation: 'mixed',
        allow_resume: true,
      },
    },
    shell: {},
    narration: { mode: 'auto' },
    modules: [{ id: moduleId, title: `Unidad ${unitNumber} - ${unitTitleClean}`, screens: [], units }],
    assessments: { unit_tests: unitTests, final_test: finalTest },
    glossary: [],
    glossary_title: 'Glosario',
    bibliography: [],
    bibliography_title: 'Recursos y bibliografía',
    quality_checklist: {},
  }

  return { course, assets, screenCount }
}

/** Resuelve un "@@PLUGINFILE@@/nombre.ext" de una página de lección al asset
 *  copiado en assets/img/, registrándolo en `assets` (deduplicado por hash). */
function makeImageResolver(moduleid, pageId, assets) {
  return (rawSrc) => {
    const m = rawSrc.match(/@@PLUGINFILE@@\/([^?"']+)/)
    if (!m) return null
    const filename = decodeURIComponent(m[1])
    const ref = filesIndex.get(`mod_lesson|page_contents|${pageId}|${filename}`)
    if (!ref) return null
    const ext = extFromMime(ref.mimetype)
    const already = assets.find((a) => a.contenthash === ref.contenthash)
    if (already) return { path: already.zipPath, alt: baseNameNoExt(filename) }
    const zipPath = `assets/img/${slugify(baseNameNoExt(filename))}-${ref.contenthash.slice(0, 6)}.${ext}`
    const absPath = physicalFilePath(backupDir, ref.contenthash)
    assets.push({ contenthash: ref.contenthash, zipPath, absPath })
    return { path: zipPath, alt: baseNameNoExt(filename) }
  }
}

function baseNameNoExt(filename) {
  return filename.replace(/\.[a-zA-Z0-9]+$/, '')
}

function extractLeadingHeading(markdown) {
  const m = markdown.match(/^##\s+(.+)$/m)
  if (m && markdown.trimStart().startsWith('##')) return m[1].trim()
  return null
}
