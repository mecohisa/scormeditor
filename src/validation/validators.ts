import type { Course, InteractionOption, QuizQuestion, Screen, Unit, UnitTest } from '../schema/course.schema'
import { allScreens, screenContainers, containerLabel } from '../schema/traverse'
import { normalizeObjective } from './objectives'
import { buildTranscript, contentHash, itemsOf, skipsItemNarration, skipsScreenNarration } from '../tts/buildTranscript'
import { countFlaggedForReview } from '../schema/review'
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_TOTAL_BYTES, fmtBytes } from '../schema/attachments'
import { getStateCodec } from '../scorm/stateCodec'
import { CALC_ID_RE, CALC_RESERVED, computeResults, type CalcResult, type CalcVariable } from '../calc/formula'

export type Severity = 'error' | 'warning' | 'info'

export interface Issue {
  code: string
  severity: Severity
  message: string
  /** Ruta legible: "M1 › U1 › Pantalla 's-content'" */
  location: string
  screenId?: string
  unitId?: string
}

interface Ctx {
  course: Course
  /** El curso es narrado: activa los avisos de narración pendiente. Manda el
   *  ajuste explícito `course.narration.mode` ('on'/'off'); en 'auto' (default)
   *  se deduce de que alguna pantalla tenga `audio_src` — sin locución, un
   *  curso sin transcripciones es perfectamente legítimo y no debe generar ruido. */
  narrated: boolean
  push: (i: Issue) => void
}

/** `uTitle` null = pantalla propia del módulo (sin tramo de unidad en la ruta). */
function screenLoc(mTitle: string, uTitle: string | null, s: Screen) {
  return uTitle == null ? `${mTitle} › «${s.title || s.id}»` : `${mTitle} › ${uTitle} › «${s.title || s.id}»`
}

// --- Reglas por pantalla -----------------------------------------------------
function checkScreen(ctx: Ctx, s: Screen, loc: string) {
  const add = (code: string, severity: Severity, message: string) =>
    ctx.push({ code, severity, message, location: loc, screenId: s.id })

  if (s.type === 'content_placeholder' || s.status === 'esqueleto_pendiente_desarrollo') {
    add('SKELETON', 'warning', 'Pantalla marcada como esqueleto / pendiente de desarrollo.')
  }
  if (!s.title.trim()) add('NO_TITLE', 'error', 'Pantalla sin título.')
  if (s.type !== 'cover' && s.type !== 'summary' && s.type !== 'guide' && !s.objective.trim())
    add('NO_OBJECTIVE', 'warning', 'Pantalla sin objetivo de aprendizaje.')

  // Congruencia tipo ↔ recurso ↔ interacción: avisos (no bloquean) para
  // combinaciones que casi siempre son un despiste del autor.
  if (s.type === 'cover' && s.interaction)
    add('COVER_INTERACTION', 'warning', 'La portada lleva una actividad: se recomienda moverla a una pantalla propia.')
  if (s.type === 'video' &&
      s.visual_resource.kind !== 'video_file' && s.visual_resource.kind !== 'video_youtube' &&
      s.interaction?.type !== 'video')
    add('VIDEO_NO_MEDIA', 'warning', 'Pantalla de tipo Vídeo sin recurso de vídeo.')
  if (s.type === 'unit_quiz' && !s.interaction?.scored)
    add('QUIZ_NO_SCORED', 'warning', 'Test de unidad sin actividad evaluable: no aportará nada a la nota.')
  if (s.type === 'forum_prompt' && s.interaction?.scored)
    add('FORUM_SCORED', 'warning', 'El debate en foro es una actividad externa (campus): su interacción no debería puntuar.')

  // Callout abierto y cerrado sin cuerpo (::: tipo / :::): caja vacía en pantalla.
  if (/^[ \t]*:::[ \t]*[\wáéíóúñ-]+[^\n]*\n(?:[ \t]*\n)*[ \t]*:::[ \t]*$/im.test(s.student_text))
    add('CALLOUT_EMPTY', 'warning', 'Callout sin contenido (`::: tipo` vacío): añade el texto de la caja o elimínala.')

  const vr = s.visual_resource
  if (vr.kind === 'image' && !vr.alt.trim())
    add('IMG_NO_ALT', 'error', 'Imagen sin texto alternativo (alt).')

  const isVideo = vr.kind === 'video_file' || vr.kind === 'video_youtube' || s.type === 'video'
  // Transcripción oculta a propósito (`transcript_hidden`): no se exige; si hay
  // locución, se avisa de que el alumno se queda sin alternativa textual.
  if (isVideo && !s.transcript_hidden && !s.transcript.trim() && !(s.interaction?.config?.transcript))
    add('VIDEO_NO_TRANSCRIPT', 'error', 'Vídeo sin transcripción.')
  if (s.audio_src.trim() && !s.transcript_hidden && !s.transcript.trim())
    add('AUDIO_NO_TRANSCRIPT', 'error', 'Audio de locución sin transcripción.')
  if (s.audio_src.trim() && s.transcript_hidden)
    add('TRANSCRIPT_HIDDEN_AUDIO', 'warning', 'La pantalla tiene locución y la transcripción está oculta: quien no pueda oírla no tiene alternativa textual.')
  if ((vr.kind === 'video_file' || vr.kind === 'audio') && vr.has_voice && (vr.tracks || []).length === 0)
    add('MEDIA_NO_SUBS', 'error', 'Medio con voz sin subtítulos (VTT).')

  // Narración pendiente (solo en cursos con locución; ver Ctx.narrated). Los
  // placeholders ya cargan con SKELETON y los casos con vídeo/audio sin
  // transcripción ya son errores arriba: aquí solo el flujo de trabajo.
  const skeleton = s.type === 'content_placeholder' || s.status === 'esqueleto_pendiente_desarrollo'
  if (ctx.narrated && !skeleton && !s.audio_src.trim() && !skipsScreenNarration(s)) {
    if (!s.transcript.trim()) {
      // «Debería tenerla» = tiene contenido narrable (mismo criterio que el
      // botón «Generar transcripción desde el contenido»). El caso isVideo ya
      // es VIDEO_NO_TRANSCRIPT (error): no duplicar.
      if (!isVideo && buildTranscript(s).trim())
        add('NARR_NO_TRANSCRIPT', 'warning', 'El curso usa locución y esta pantalla no tiene transcripción (alternativa textual y entrada del TTS).')
    } else {
      add('NARR_NO_AUDIO', 'info', 'Pendiente de narrar: hay transcripción pero no audio de locución.')
    }
  }

  // Desactualizado: el contenido cambió después de escribir/regenerar la
  // transcripción, o la transcripción cambió después de generar el audio —
  // la huella (`contentHash`) ya no coincide con la que se selló al tocarlos
  // por última vez (ver `updateScreen` en courseStore.ts). Sin huella sellada
  // (proyecto/pantalla de antes de esta función, o nunca tocados desde el
  // editor) no se avisa: no hay con qué comparar.
  if (ctx.narrated && !skeleton && !skipsScreenNarration(s) && s.transcript.trim()) {
    if (s.transcript_content_hash && s.transcript_content_hash !== contentHash(buildTranscript(s)))
      add('NARR_TRANSCRIPT_STALE', 'info', 'El contenido cambió desde que se escribió/regeneró esta transcripción: revísala y regenérala si hace falta.')
    if (s.audio_src.trim() && s.audio_transcript_hash && s.audio_transcript_hash !== contentHash(s.transcript))
      add('NARR_AUDIO_STALE', 'info', 'La transcripción cambió después de generar este audio de locución: regenéralo para que vuelvan a corresponderse.')
  }

  // Interacción
  const it = s.interaction
  if (it) {
    // Narración por ítem (accordion/tabs/flip_cards/timeline/image_cards/
    // flashcards, y las zonas de hotspots): cada ítem/zona con texto se narra
    // con SU PROPIO audio — no el de pantalla, que para estos tipos no lo
    // incluye (ver docs/internals/tts-narracion.md). Mismo criterio que
    // NARR_NO_AUDIO pero a nivel de ítem; no hace falta un
    // «NARR_ITEM_NO_TRANSCRIPT» porque el guion es el propio texto visible
    // (siempre "existe" si el ítem no está vacío — ya cubierto por TL_EMPTY,
    // FC_EMPTY, etc.).
    if (ctx.narrated && !skipsItemNarration(s)) {
      itemsOf(it).forEach((item, i) => {
        if (item.text.trim() && !item.audioSrc.trim())
          add('NARR_ITEM_NO_AUDIO', 'info', `Pendiente de narrar: el ítem ${i + 1} de la interacción no tiene audio propio.`)
      })
    }
    const isQuestion = ['single_choice', 'true_false', 'classification', 'match_pairs', 'scenario_decision'].includes(it.type)
    if (isQuestion) {
      const hasCorrect =
        (it.options || []).some((o) => o.correct) ||
        (it.options || []).some((o) => o.group) // clasificación usa group
      if (!hasCorrect) add('Q_NO_CORRECT', 'error', 'Pregunta sin respuesta correcta definida.')
      if (!it.feedback.correct.trim() && !it.feedback.incorrect.trim())
        add('Q_NO_FEEDBACK', 'error', 'Pregunta sin feedback de acierto/error.')
    }
    if (it.type === 'fill_blanks') {
      const blanks = String((it.config as any)?.text || '').match(/\[\[.+?\]\]/g) || []
      if (blanks.length === 0)
        add('FB_NO_BLANKS', 'error', 'Rellenar huecos sin ningún hueco [[respuesta]] en el texto.')
      if (!it.feedback.correct.trim() && !it.feedback.incorrect.trim())
        add('Q_NO_FEEDBACK', 'error', 'Pregunta sin feedback de acierto/error.')
    }
    if (it.type === 'timeline' && ((it.config as any)?.milestones || []).length === 0)
      add('TL_EMPTY', 'error', 'Línea de tiempo sin hitos.')
    if (it.type === 'case_practice' && ((it.config as any)?.rubric || []).length === 0)
      add('CP_NO_RUBRIC', 'warning', 'Actividad práctica sin rúbrica: sin criterios de autoevaluación queda solo el enunciado.')
    if (it.type === 'html_embed') {
      const c = (it.config as any) || {}
      if (!String(c.html || '').trim() && !String(c.js || '').trim())
        add('EMBED_EMPTY', 'error', 'HTML a medida sin código: pega al menos HTML o JavaScript.')
      if (it.scored)
        add('EMBED_SCORED', 'warning', 'El HTML a medida corre aislado en un sandbox y no puede puntuar (scored: false).')
      // Contrato «MeEmbed v1» (ver interactions.js/docs/html-embed-contract.md):
      // el código del autor solo puede bloquear el avance o guardar estado
      // llamando a estas dos funciones — si pide bloquear pero nunca llama a
      // complete(), el alumno se queda atascado sin remedio. Acepta tanto
      // `MeEmbed.complete(` como `ME.complete(` — el propio contrato/plantilla
      // recomienda `var ME = window.MeEmbed || {...}` como alias corto, así
      // que exigir el nombre largo literal marcaría en falso el código que
      // sigue la propia guía.
      const embedCode = `${c.html || ''} ${c.js || ''}`
      if (c.require_completion && !/(?:MeEmbed|ME)\s*\.\s*complete\s*\(/.test(embedCode))
        add('EMBED_NO_COMPLETE', 'error', 'Exige completar la actividad para avanzar, pero el código no llama a MeEmbed.complete() (o a su alias ME.complete()): el alumno nunca podría continuar.')
      if (c.state_max !== undefined && (typeof c.state_max !== 'number' || !isFinite(c.state_max) || c.state_max < 0 || c.state_max > 300))
        add('EMBED_STATE_MAX', 'error', 'La memoria para guardar su estado debe ser un número entre 0 y 300 caracteres.')
      if (c.state_max === undefined)
        add('EMBED_STATE_MAX_DEFAULT', 'info', 'Reserva 100 caracteres por defecto. Si el interactivo no guarda estado, pon 0; si guarda índices de N elementos, basta con unos 5 + 2·N.')
      const embedStateMax = typeof c.state_max === 'number' ? c.state_max : 100
      if (embedStateMax > 0 && !/(?:MeEmbed|ME)\s*\.\s*saveState\s*\(/.test(embedCode))
        add('EMBED_STATE_UNUSED', 'warning', 'Tiene reservado presupuesto para guardar estado, pero el código no llama a MeEmbed.saveState() (o a su alias ME.saveState()): no se está usando.')
    }
    if (it.type === 'image_cards') {
      const cards = (((it.config as any)?.cards || []) as { image?: string; alt?: string; title?: string }[])
      const textCover = (it.config as any)?.show_cover_image === false
      if (cards.length === 0)
        add('IC_EMPTY', 'error', 'Tarjetas de imagen sin tarjetas.')
      cards.forEach((c, i) => {
        // Sin imagen en la portada, el título es lo único que se ve en la tarjeta.
        if (textCover && !String(c.title || '').trim())
          add('IC_NO_TITLE', 'error', `La tarjeta ${i + 1} no tiene título y la portada no muestra imagen: no se vería nada.`)
        if (!String(c.image || '').trim())
          add('IC_NO_IMAGE', 'error', `La tarjeta de imagen ${i + 1} no tiene imagen.`)
        else if (!String(c.alt || '').trim())
          add('IMG_NO_ALT', 'error', `La tarjeta de imagen ${i + 1} no tiene texto alternativo (alt).`)
      })
    }
    if (it.type === 'video') {
      const qs = (((it.config as any)?.questions || []) as { time?: number; prompt?: string; options?: { correct?: boolean }[] }[])
      qs.forEach((q, i) => {
        const tag = `La pregunta ${i + 1} del vídeo`
        if (!String(q.prompt || '').trim()) add('IV_Q_NO_PROMPT', 'error', `${tag} no tiene enunciado.`)
        if ((q.options || []).length < 2) add('IV_Q_FEW_OPTIONS', 'error', `${tag} necesita al menos 2 opciones.`)
        else if (!(q.options || []).some((o) => o.correct)) add('IV_Q_NO_CORRECT', 'error', `${tag} no tiene opción correcta.`)
      })
      if (qs.length > 0 && !(it.config as any)?.src && (it.config as any)?.youtube)
        add('IV_YT_BRIDGE', 'info', 'Preguntas sobre vídeo de YouTube: si el LMS bloquea la comunicación con el reproductor, se mostrarán como lista bajo el vídeo.')
    }
    if (it.type === 'before_after') {
      const c = (it.config as any) || {}
      if (!String(c.before_image || '').trim() || !String(c.after_image || '').trim())
        add('BA_NO_IMAGES', 'error', 'El comparador antes/después necesita las dos imágenes.')
      else {
        if (!String(c.before_alt || '').trim())
          add('IMG_NO_ALT', 'error', 'La imagen «antes» no tiene texto alternativo (alt).')
        if (!String(c.after_alt || '').trim())
          add('IMG_NO_ALT', 'error', 'La imagen «después» no tiene texto alternativo (alt).')
      }
      if (it.scored)
        add('BA_SCORED', 'warning', 'El comparador antes/después es informativo: no debería puntuar (scored: false).')
    }
    if (it.type === 'word_search') {
      const raw = (((it.config as any)?.words || []) as string[]).map((w) => String(w || '').trim()).filter(Boolean)
      // Misma normalización que la carcasa: solo letras, sin acentos ni espacios.
      const norm = (w: string) => w.toUpperCase().replace(/\u00d1/g, '\u0001').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, '\u00d1').replace(/[^A-Z\u00d1]/g, '')
      if (raw.length === 0)
        add('WS_EMPTY', 'error', 'Sopa de letras sin palabras.')
      raw.forEach((w) => {
        const n = norm(w)
        if (n.length > 12) add('WS_WORD_LONG', 'error', `«${w}» tiene más de 12 letras: no cabe en el tablero.`)
        else if (n.length < 3) add('WS_WORD_SHORT', 'error', `«${w}» se queda en menos de 3 letras útiles: demasiado corta para el tablero.`)
      })
    }
    if (it.type === 'crossword') {
      const entries = (((it.config as any)?.entries || []) as { word?: string; clue?: string }[])
      if (entries.length === 0) add('CW_EMPTY', 'error', 'Crucigrama sin palabras.')
      else if (entries.length < 2) add('CW_FEW', 'warning', 'Crucigrama con una sola palabra: no habrá cruces.')
      entries.forEach((en, i) => {
        if (!String(en.word || '').trim() || !String(en.clue || '').trim())
          add('CW_INCOMPLETE', 'error', `La entrada ${i + 1} del crucigrama necesita palabra y pista.`)
      })
    }
    if (it.type === 'hidden_image') {
      const c = (it.config as any) || {}
      if (!String(c.image || '').trim()) add('HI_NO_IMAGE', 'error', 'Imagen oculta sin imagen.')
      else if (!String(c.alt || '').trim()) add('IMG_NO_ALT', 'error', 'La imagen oculta no tiene texto alternativo (alt).')
      const qs = ((c.questions || []) as { prompt?: string; options?: { correct?: boolean }[] }[])
      if (qs.length === 0) add('HI_NO_QUESTIONS', 'error', 'Imagen oculta sin preguntas: nada la destapa.')
      qs.forEach((q, i) => {
        const tag = `La pregunta ${i + 1} de la imagen oculta`
        if (!String(q.prompt || '').trim()) add('HI_Q_NO_PROMPT', 'error', `${tag} no tiene enunciado.`)
        if ((q.options || []).length < 2) add('HI_Q_FEW_OPTIONS', 'error', `${tag} necesita al menos 2 opciones.`)
        else if (!(q.options || []).some((o) => o.correct)) add('HI_Q_NO_CORRECT', 'error', `${tag} no tiene opción correcta.`)
      })
    }
    if (it.type === 'az_quiz') {
      const azItems = (((it.config as any)?.items || []) as { clue?: string; answer?: string }[])
      if (azItems.length === 0) add('AZ_EMPTY', 'error', 'Rosco sin definiciones.')
      const seenLetters = new Map<string, number>()
      azItems.forEach((q, i) => {
        if (!String(q.clue || '').trim() || !String(q.answer || '').trim())
          add('AZ_INCOMPLETE', 'error', `La entrada ${i + 1} del rosco necesita definición y respuesta.`)
        const letter = String(q.answer || '').trim().charAt(0).toUpperCase()
        if (letter) seenLetters.set(letter, (seenLetters.get(letter) || 0) + 1)
      })
      for (const [letter, n] of seenLetters) {
        if (n > 1) add('AZ_DUP_LETTER', 'warning', `Hay ${n} respuestas que empiezan por «${letter}»: el rosco tendrá letras repetidas.`)
      }
    }
    if (it.type === 'puzzle') {
      const c = (it.config as any) || {}
      if (!String(c.image || '').trim()) add('PZ_NO_IMAGE', 'error', 'Puzzle sin imagen.')
      else if (!String(c.alt || '').trim()) add('IMG_NO_ALT', 'error', 'El puzzle no tiene texto alternativo (alt).')
    }
    if (it.type === 'scenario_steps') {
      const steps = (((it.config as any)?.steps || []) as { text?: string; options?: InteractionOption[] }[])
      if (steps.length === 0) add('SS_EMPTY', 'error', 'Caso por decisiones sin ninguna decisión.')
      steps.forEach((st, i) => {
        const tag = `La decisión ${i + 1} del caso`
        const opts = st.options || []
        if (!String(st.text || '').trim()) add('SS_STEP_NO_TEXT', 'error', `${tag} no tiene situación ni pregunta.`)
        if (opts.length < 2) add('SS_STEP_FEW_OPTIONS', 'error', `${tag} necesita al menos 2 opciones.`)
        else if (!opts.some((o) => o.correct)) add('SS_STEP_NO_CORRECT', 'error', `${tag} no tiene ninguna opción correcta.`)
        if (opts.some((o) => o.text.trim() && !String(o.feedback || '').trim()))
          add('SS_NO_FEEDBACK', 'warning', `${tag} tiene opciones sin comentario: el alumno solo verá el feedback genérico.`)
      })
    }
    if (it.type === 'decision_tree') {
      for (const issue of checkDecisionTree((it.config as any) || {}, it.scored)) add(issue.code, issue.severity, issue.message)
    }
    if (it.type === 'calculator') {
      const c = (it.config as any) || {}
      const tool = c.mode === 'tool'
      const vars = (c.variables || []) as CalcVariable[]
      const results = (c.results || []) as CalcResult[]
      if (results.length === 0) add('CALC_EMPTY', 'error', 'Reto numérico sin ningún resultado que calcular.')
      const seen = new Set<string>()
      for (const x of [...vars, ...results]) {
        const id = String(x.id || '')
        if (!CALC_ID_RE.test(id) || CALC_RESERVED.includes(id.toLowerCase()))
          add('CALC_BAD_ID', 'error', `«${id || '(vacío)'}» no sirve como nombre en las fórmulas: usa letras sin tilde, números y _ (sin empezar por número ni usar round, min, max…).`)
        else if (seen.has(id)) add('CALC_BAD_ID', 'error', `El nombre «${id}» está repetido: cada dato y resultado necesita uno distinto.`)
        seen.add(id)
      }
      if (!tool) {
        vars.forEach((v) => {
          if (typeof v.value !== 'number' || !Number.isFinite(v.value))
            add('CALC_NO_VALUE', 'error', `El dato «${v.label || v.id}» no tiene valor: en modo reto el curso da todos los datos.`)
        })
      }
      // En la calculadora libre los valores los escribe el alumno: se comprueba
      // la fórmula con valores de prueba (solo sintaxis y nombres).
      const probe = tool ? vars.map((v) => ({ ...v, value: typeof v.value === 'number' ? v.value : 1 })) : vars
      computeResults(probe, results).forEach((r, i) => {
        if (r.error && !(r.error.startsWith('Falta el valor') && !tool))
          add('CALC_FORMULA', 'error', `La fórmula de «${results[i].label || results[i].id}» no es válida: ${r.error}.`)
      })
      if (tool && it.scored) add('CALC_TOOL_SCORED', 'warning', 'La calculadora libre no tiene respuesta que corregir: no debería puntuar (scored: false).')
    }
    if (it.type === 'flashcards') {
      if (((it.config as any)?.cards || []).length === 0)
        add('FC_EMPTY', 'error', 'Tarjetas de repaso sin tarjetas.')
      if (it.scored)
        add('FC_SCORED', 'warning', 'Las tarjetas de repaso son autoevaluación: no deberían puntuar (scored: false).')
    }
  }
}

// --- Conversación ramificada (decision_tree): el grafo de momentos ---------
// Mismo criterio que el runtime: empieza en el primer nodo; una respuesta sin
// destino existente no cuenta, y un nodo sin respuestas válidas es un final.
type TreeCfg = {
  characters?: { id: string }[]
  nodes?: { id: string; speaker?: string; text?: string; choices?: { text?: string; to?: string }[]; outcome?: string }[]
}
export function checkDecisionTree(cfg: TreeCfg, scored: boolean): { code: string; severity: Severity; message: string }[] {
  const out: { code: string; severity: Severity; message: string }[] = []
  const add = (code: string, severity: Severity, message: string) => out.push({ code, severity, message })
  const nodes = cfg.nodes || []
  if (!nodes.length) {
    add('DT_EMPTY', 'error', 'Conversación sin ningún momento.')
    return out
  }
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const chars = new Set((cfg.characters || []).map((c) => c.id))
  const valid = (n: (typeof nodes)[number]) => (n.choices || []).filter((c) => c.to && index.has(c.to))
  nodes.forEach((n, i) => {
    const tag = `El momento ${i + 1} de la conversación`
    const choices = n.choices || []
    if (choices.length && !String(n.text || '').trim()) add('DT_NO_TEXT', 'error', `${tag} no tiene texto.`)
    choices.forEach((c, k) => {
      if (!String(c.text || '').trim()) add('DT_CHOICE_NO_TEXT', 'error', `${tag}: la respuesta ${k + 1} no tiene texto.`)
      if (!c.to || !index.has(c.to)) add('DT_DANGLING', 'error', `${tag}: la respuesta ${k + 1} no lleva a ningún momento.`)
    })
    if (n.speaker && !chars.has(n.speaker)) add('DT_SPEAKER_MISSING', 'warning', `${tag} lo dice un personaje que ya no existe.`)
  })
  if (!valid(nodes[0]).length) add('DT_START_END', 'error', 'El primer momento de la conversación no tiene respuestas: la conversación no puede empezar.')
  // Alcanzables desde el inicio + detección de ciclos (DFS con pila).
  const state = new Map<string, 'open' | 'done'>()
  let cycle = false
  const visit = (id: string) => {
    state.set(id, 'open')
    for (const c of valid(nodes[index.get(id)!])) {
      const st = state.get(c.to!)
      if (st === 'open') cycle = true
      else if (!st) visit(c.to!)
    }
    state.set(id, 'done')
  }
  visit(nodes[0].id)
  if (cycle) add('DT_CYCLE', 'error', 'La conversación tiene un bucle: alguna respuesta vuelve a un momento anterior del mismo camino.')
  const unreachable = nodes.map((n, i) => (state.has(n.id) ? 0 : i + 1)).filter(Boolean)
  if (unreachable.length)
    add('DT_UNREACHABLE', 'warning', `Ningún camino llega a ${unreachable.length === 1 ? 'el momento' : 'los momentos'} ${unreachable.join(', ')}.`)
  const reachableEnds = nodes.filter((n) => state.has(n.id) && !valid(n).length)
  if (scored && !reachableEnds.some((n) => n.outcome === 'good'))
    add('DT_NO_GOOD_END', 'error', 'La conversación puntúa pero ningún camino lleva a un «Buen final»: nadie podría acertar.')
  return out
}

// --- Reglas por pregunta de test (final o de unidad) -------------------------
function checkQuizQuestions(
  ctx: Ctx,
  questions: QuizQuestion[],
  locBase: string,
  link: { screenId?: string; unitId?: string },
) {
  questions.forEach((q, n) => {
    const short = q.prompt.trim() ? `«${q.prompt.trim().slice(0, 60)}${q.prompt.trim().length > 60 ? '…' : ''}»` : `pregunta ${n + 1}`
    const loc = `${locBase} › ${short}`
    const add = (code: string, severity: Severity, message: string) =>
      ctx.push({ code, severity, message, location: loc, ...link })
    if (!q.prompt.trim()) add('Q_NO_PROMPT', 'error', 'Pregunta sin enunciado.')
    if (!(q.options || []).some((o) => o.correct))
      add('Q_NO_CORRECT', 'error', 'Pregunta sin respuesta correcta definida.')
    if (!q.feedback.correct.trim() && !q.feedback.incorrect.trim())
      add('Q_NO_FEEDBACK', 'error', 'Pregunta sin feedback de acierto/error.')
  })
}

// --- Reglas por unidad -------------------------------------------------------
// No se llama para bloques sueltos «entre unidades» (`unit.loose`): no son
// unidades reales, así que no exigen resumen ni actividad — sus pantallas se
// validan como pantallas sueltas del módulo (ver `checkLooseScreens` más abajo).
function checkUnit(ctx: Ctx, u: Unit, mTitle: string) {
  const loc = `${mTitle} › ${u.title || u.id}`
  if (u.status === 'esqueleto_pendiente_desarrollo')
    ctx.push({ code: 'UNIT_SKELETON', severity: 'warning', message: 'Unidad marcada como esqueleto pendiente de desarrollo.', location: loc, unitId: u.id })
  const hasSummary = !!u.summary.trim() || u.screens.some((s) => s.type === 'summary')
  if (!hasSummary) ctx.push({ code: 'UNIT_NO_SUMMARY', severity: 'warning', message: 'Unidad sin resumen.', location: loc, unitId: u.id })

  const hasActivity = u.screens.some((s) => s.interaction) ||
    ctx.course.assessments.unit_tests.some((t) => t.unit_id === u.id)
  if (!hasActivity) ctx.push({ code: 'UNIT_NO_ACTIVITY', severity: 'warning', message: 'Unidad sin actividad ni test.', location: loc, unitId: u.id })

  // Notas editoriales como avisos
  u.screens.forEach((s) => {
    s.editor_notes.forEach((n) =>
      ctx.push({ code: 'EDITOR_NOTE', severity: 'info', message: `Nota editorial: ${n}`, location: screenLoc(mTitle, u.title || u.id, s), screenId: s.id }),
    )
  })
}

// --- Unicidad de IDs ---------------------------------------------------------
// El runtime guarda el estado del alumno por id (`STATE.results[interaction.id]`,
// `STATE.visited[screen.id]`): dos entidades con el mismo id comparten progreso y
// nota, corrompiéndolos. El esquema Zod no comprueba unicidad, así que se valida
// aquí (el toolkit del GPT ya lo hacía en su preflight §11: esto iguala la paridad).
function checkIds(ctx: Ctx) {
  const c = ctx.course
  const seen = new Map<string, string>() // id -> primera entidad que lo usó
  const check = (id: string | undefined, what: string, link: { screenId?: string; unitId?: string }) => {
    if (!id) return
    const prev = seen.get(id)
    if (prev) {
      ctx.push({
        code: 'ID_DUPLICATE', severity: 'error',
        message: `Identificador duplicado «${id}» (lo usan ${prev} y ${what}): los ids deben ser únicos en todo el curso.`,
        location: what, ...link,
      })
    } else {
      seen.set(id, what)
    }
  }
  const scan = (s: Screen, unitId?: string) => {
    check(s.id, `pantalla «${s.title || s.id}»`, { screenId: s.id, unitId })
    if (s.interaction) check(s.interaction.id, `interacción de «${s.title || s.id}»`, { screenId: s.id, unitId })
  }
  const moduleWord = (c.module_label || 'módulo').toLowerCase()
  const unitWord = (c.unit_label || 'unidad').toLowerCase()
  c.intro_screens.forEach((s) => scan(s))
  c.modules.forEach((m) => {
    check(m.id, `${moduleWord} «${m.title || m.id}»`, {})
    m.screens.forEach((s) => scan(s))
    m.units.forEach((u) => {
      // Un bloque suelto «entre unidades» (`unit.loose`) no es una unidad real:
      // sus pantallas se tratan como las del módulo (sin `unitId`), igual que en
      // `screenContainers()` (ver traverse.ts).
      if (u.loose) {
        u.screens.forEach((s) => scan(s))
        return
      }
      check(u.id, `${unitWord} «${u.title || u.id}»`, { unitId: u.id })
      u.screens.forEach((s) => scan(s, u.id))
    })
    m.closing_screens.forEach((s) => scan(s))
  })
  c.closing_screens.forEach((s) => scan(s))
  const tests = [c.assessments.final_test, ...c.assessments.unit_tests].filter(Boolean) as UnitTest[]
  tests.forEach((t) => {
    const link = t === c.assessments.final_test ? { screenId: '__final__' } : { unitId: t.unit_id }
    check(t.id, `test «${t.title || t.id}»`, link)
    t.questions.forEach((q) => check(q.id, `pregunta de «${t.title || t.id}»`, link))
  })
}

// --- Reglas SCORM / globales -------------------------------------------------
function checkGlobal(ctx: Ctx) {
  const c = ctx.course
  const flagged = countFlaggedForReview(c)
  if (flagged > 0)
    ctx.push({
      code: 'REVIEW_PENDING', severity: 'warning',
      message: `${flagged} pantalla${flagged === 1 ? '' : 's'} marcada${flagged === 1 ? '' : 's'} «pendiente de revisión»: no se incluirá${flagged === 1 ? '' : 'n'} en el paquete SCORM exportado.`,
      location: 'Curso',
    })
  if (c.glossary.length === 0)
    ctx.push({ code: 'GLOSSARY_EMPTY', severity: 'warning', message: 'Glosario vacío.', location: 'Curso' })
  if (c.bibliography.length === 0)
    ctx.push({ code: 'BIBLIO_EMPTY', severity: 'warning', message: 'Bibliografía vacía.', location: 'Curso' })

  // Documentos PDF adjuntos (límites en schema/attachments.ts; el editor ya los
  // aplica al subir, esto cubre proyectos editados a mano o generados por script).
  const docs = c.attachments
  if (docs.length > MAX_ATTACHMENTS)
    ctx.push({ code: 'ATTACHMENTS_TOO_MANY', severity: 'error', message: `Hay ${docs.length} documentos adjuntos: el máximo es ${MAX_ATTACHMENTS}.`, location: 'Documentos' })
  let docsTotal = 0
  docs.forEach((d, i) => {
    const where = `Documentos › ${d.title.trim() || `documento ${i + 1}`}`
    if (!/^assets\/.+\.pdf$/i.test(d.src))
      ctx.push({ code: 'ATTACHMENT_NOT_PDF', severity: 'error', message: `El documento no es un PDF del proyecto (${d.src || 'sin archivo'}): solo se pueden adjuntar PDF.`, location: where })
    if (!d.title.trim())
      ctx.push({ code: 'ATTACHMENT_NO_TITLE', severity: 'warning', message: 'Documento sin título: el estudiante solo vería el nombre del archivo.', location: where })
    if ((d.size ?? 0) > MAX_ATTACHMENT_BYTES)
      ctx.push({ code: 'ATTACHMENT_TOO_BIG', severity: 'error', message: `El documento pesa ${fmtBytes(d.size ?? 0)}: el máximo es ${fmtBytes(MAX_ATTACHMENT_BYTES)}.`, location: where })
    docsTotal += d.size ?? 0
  })
  if (docsTotal > MAX_ATTACHMENTS_TOTAL_BYTES)
    ctx.push({ code: 'ATTACHMENTS_HEAVY', severity: 'warning', message: `Los documentos adjuntos suman ${fmtBytes(docsTotal)} (recomendado: menos de ${fmtBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}): el paquete SCORM pesará más y tardará en subirse al LMS.`, location: 'Documentos' })

  // Origen de la nota. Ojo a la semántica real del runtime (`computeScore` en
  // app.js): 'unit_tests' significa «actividades evaluables» (interacciones de
  // pantalla con scored), NO los objetos assessments.unit_tests.
  const rules = c.scorm.rules
  const finalQuestions = c.assessments.final_test?.questions.length ?? 0
  const scoredActivities = allScreens(c).filter((s) => s.interaction?.scored).length
  // Paquete sin nada evaluable que se completa con solo llegar al final (una
  // bienvenida, un vídeo de presentación…): es legítimo, no hay nota que sacar
  // de ningún sitio. El runtime no envía nota al LMS en ese caso.
  const ungraded = (rules.completion_mode ?? 'evaluation') === 'screens' && finalQuestions === 0 && scoredActivities === 0
  if (ungraded)
    ctx.push({ code: 'SCORM_UNGRADED', severity: 'info', message: 'Sin test ni actividades evaluables: se completa al llegar al final y no envía nota al LMS.', location: 'SCORM' })
  else if (rules.score_source === 'final_test' && finalQuestions === 0)
    ctx.push({ code: 'SCORM_NO_FINAL', severity: 'error', message: 'La nota sale del test final pero no hay preguntas en el test final.', location: 'SCORM', screenId: '__final__' })
  if (rules.score_source === 'final_test' && scoredActivities > 0)
    ctx.push({
      code: 'SCORM_ACTIVITIES_IGNORED', severity: 'warning',
      message: `Hay ${scoredActivities} actividad${scoredActivities === 1 ? '' : 'es'} marcada${scoredActivities === 1 ? '' : 's'} como evaluable${scoredActivities === 1 ? '' : 's'}, pero la nota sale solo del test final: no contarán para la nota.`,
      location: 'SCORM',
    })
  if (!ungraded && rules.score_source === 'unit_tests' && scoredActivities === 0)
    ctx.push({ code: 'SCORM_NO_ACTIVITIES', severity: 'error', message: 'La nota sale de las actividades evaluables pero ninguna interacción puntúa.', location: 'SCORM' })
  if (!ungraded && rules.score_source === 'mixed') {
    if (finalQuestions === 0 && scoredActivities === 0)
      ctx.push({ code: 'SCORM_MIXED_EMPTY', severity: 'error', message: 'La nota es mixta pero no hay ni test final ni actividades evaluables.', location: 'SCORM' })
    else if (finalQuestions === 0)
      ctx.push({ code: 'SCORM_MIXED_NO_FINAL', severity: 'warning', message: 'La nota es mixta pero no hay test final: el peso del test no se aplicará.', location: 'SCORM', screenId: '__final__' })
    else if (scoredActivities === 0)
      ctx.push({ code: 'SCORM_MIXED_NO_ACTIVITIES', severity: 'warning', message: 'La nota es mixta pero no hay actividades evaluables: solo contará el test final.', location: 'SCORM' })
  }
  if (!c.scorm.identifier.trim())
    ctx.push({ code: 'SCORM_NO_ID', severity: 'error', message: 'Falta el identificador SCORM.', location: 'SCORM' })

  // Historial de estructuras publicadas (remapeo de suspend_data v2, ver
  // docs/suspend-data.md): avisa si la estructura actual ya no coincide con
  // la última versión exportada, y si el cambio es tan grande que un alumno
  // con progreso de esa versión perdería casi todo su avance por posición.
  const layouts = c.scorm.layouts || []
  if (layouts.length > 0) {
    try {
      const last = layouts[layouts.length - 1]
      const current = getStateCodec().buildLayoutEntry(c)
      if (current.fp !== last.fp) {
        ctx.push({
          code: 'LAYOUT_CHANGED', severity: 'info',
          message: 'La estructura del curso (pantallas, interacciones o preguntas del test final) cambió desde la última versión exportada: al exportar de nuevo se registrará como una versión publicada más, para que los alumnos con progreso guardado no lo pierdan.',
          location: 'SCORM',
        })
        const lastIds = new Set([...last.screens, ...last.interactions.map((i) => i.id), ...last.final_questions])
        const currentIds = new Set([...current.screens, ...current.interactions.map((i) => i.id), ...current.final_questions])
        const survivors = [...lastIds].filter((id) => currentIds.has(id)).length
        if (lastIds.size > 0 && survivors < lastIds.size / 2)
          ctx.push({
            code: 'LAYOUT_IDS_REPLACED', severity: 'warning',
            message: `Menos de la mitad de los ids de la última versión publicada siguen existiendo (${survivors} de ${lastIds.size}): los alumnos con progreso de esa versión perderán casi todo su avance por posición al reanudar (conservan los intentos y la nota).`,
            location: 'SCORM',
          })
      }
    } catch { /* state_codec.js no disponible: no bloquea el resto del informe */ }
  }

  // Memoria de progreso SCORM (peor caso de cmi.suspend_data, ver
  // docs/suspend-data.md y el medidor «Memoria» de la barra de herramientas):
  // mismo estimateSuspendSize() que alimenta ese medidor, para que el número
  // sea siempre el mismo se mire donde se mire.
  try {
    const estimate = getStateCodec().estimateSuspendSize(c)
    const pct = (estimate.worstCase / estimate.limit) * 100
    if (pct > 100)
      ctx.push({
        code: 'SUSPEND_OVER_LIMIT', severity: 'error',
        message: `El peor caso del progreso guardado (${estimate.worstCase} de ${estimate.limit} caracteres, ${Math.round(pct)}%) supera el límite de cmi.suspend_data. El runtime degradará detalle automáticamente al guardar, pero conviene reducir el contenido con más detalle (crucigramas grandes, rosco con muchas definiciones, HTML a medida con mucho estado).`,
        location: 'SCORM',
      })
    else if (pct >= 75)
      ctx.push({
        code: 'SUSPEND_NEAR_LIMIT', severity: 'warning',
        message: `El peor caso del progreso guardado (${estimate.worstCase} de ${estimate.limit} caracteres, ${Math.round(pct)}%) se acerca al límite de cmi.suspend_data. Revisa el medidor «Memoria» de la barra de herramientas si el curso sigue creciendo.`,
        location: 'SCORM',
      })
  } catch { /* state_codec.js no disponible: no bloquea el resto del informe */ }

  // Preguntas de los tests (final y por unidad): mismas exigencias que las
  // interacciones de pantalla (respuesta correcta y feedback).
  if (c.assessments.final_test)
    checkQuizQuestions(ctx, c.assessments.final_test.questions, 'Test final', { screenId: '__final__' })
  c.assessments.unit_tests.forEach((t) =>
    checkQuizQuestions(ctx, t.questions, `Test de unidad «${t.title || t.id}»`, { unitId: t.unit_id }))

  // Riesgo normativo: cobertura de objetivos sin evaluación. Un issue por
  // objetivo, enlazado a la primera pantalla que lo declara. La comparación es
  // NORMALIZADA (normalizeObjective): la vinculación histórica era texto libre
  // y abundan pares «casi iguales» que no deben contar como desvinculados.
  const declaredBy = new Map<string, { obj: string; screen: Screen; loc: string }>()
  const evaluatedObjectives = new Set<string>()
  screenContainers(c).forEach((sc) => sc.screens.forEach((s) => {
    const obj = s.objective.trim()
    const key = normalizeObjective(obj)
    if (key && !declaredBy.has(key))
      declaredBy.set(key, { obj, screen: s, loc: screenLoc(containerLabel({ module: sc.module, unit: null, closing: sc.closing }), sc.unit ? sc.unit.title || sc.unit.id : null, s) })
    if (s.interaction?.scored && key)
      evaluatedObjectives.add(key)
  }))
  c.assessments.final_test?.questions.forEach((q) => q.learning_objective && evaluatedObjectives.add(normalizeObjective(q.learning_objective)))
  c.assessments.unit_tests.forEach((t) => t.questions.forEach((q) => q.learning_objective && evaluatedObjectives.add(normalizeObjective(q.learning_objective))))
  declaredBy.forEach(({ obj, screen, loc }, key) => {
    if (!evaluatedObjectives.has(key))
      ctx.push({
        code: 'OBJ_NOT_EVALUATED', severity: 'info',
        message: `Objetivo sin evaluación asociada: «${obj}» (riesgo para revisión normativa).`,
        location: loc, screenId: screen.id,
      })
  })
}

export interface ValidationResult {
  issues: Issue[]
  errors: number
  warnings: number
  infos: number
  ok: boolean
}

/** El curso es narrado según el ajuste `narration.mode` ('auto' = si alguna
 *  pantalla tiene locución). Compartido con el panel de Narración (TtsPanel). */
export function isNarrated(course: Course): boolean {
  return course.narration.mode === 'on' ||
    (course.narration.mode === 'auto' && allScreens(course).some((s) => s.audio_src.trim()))
}

export function validateCourse(course: Course): ValidationResult {
  const issues: Issue[] = []
  const ctx: Ctx = { course, narrated: isNarrated(course), push: (i) => issues.push(i) }

  // Pantallas sueltas de introducción (antes de cualquier módulo): mismas
  // reglas por pantalla que las propias de un módulo.
  const checkLooseScreens = (screens: Screen[], loc: string) => {
    screens.forEach((s) => {
      checkScreen(ctx, s, screenLoc(loc, null, s))
      s.editor_notes.forEach((n) =>
        ctx.push({ code: 'EDITOR_NOTE', severity: 'info', message: `Nota editorial: ${n}`, location: screenLoc(loc, null, s), screenId: s.id }))
    })
  }
  checkLooseScreens(course.intro_screens, 'Introducción del paquete SCORM')
  course.modules.forEach((m) => {
    const mTitle = m.title || m.id
    // Pantallas propias del módulo: mismas reglas por pantalla que las de
    // unidad (incluidas las notas editoriales, que en unidades pone checkUnit).
    checkLooseScreens(m.screens, mTitle)
    m.units.forEach((u) => {
      // Un bloque suelto «entre unidades» (`unit.loose`) no exige resumen ni
      // actividad: sus pantallas se validan como sueltas del módulo.
      if (u.loose) {
        checkLooseScreens(u.screens, mTitle)
        return
      }
      checkUnit(ctx, u, mTitle)
      u.screens.forEach((s) => checkScreen(ctx, s, screenLoc(mTitle, u.title || u.id, s)))
    })
    // Cierre del módulo: mismas reglas que sus pantallas propias de arriba.
    checkLooseScreens(m.closing_screens, `${mTitle} (cierre)`)
  })
  checkLooseScreens(course.closing_screens, 'Cierre del paquete SCORM')
  checkIds(ctx)
  checkGlobal(ctx)

  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length
  const infos = issues.filter((i) => i.severity === 'info').length
  return { issues, errors, warnings, infos, ok: errors === 0 }
}
