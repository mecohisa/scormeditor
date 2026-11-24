import { z } from 'zod'

/**
 * Schema versionado de course.json.
 *
 * Regla de evolución: cualquier cambio incompatible incrementa SCHEMA_VERSION
 * y añade una entrada en src/schema/migrations.ts. El import siempre pasa por
 * migrate() antes de validar contra el schema actual.
 */
export const SCHEMA_VERSION = '1.1.0'

// ----------------------------------------------------------------------------
// Tipos enumerados
// ----------------------------------------------------------------------------

export const ScreenType = z.enum([
  'cover',
  'objectives',
  'route',
  'content',
  'summary',
  'video',
  'reflection',
  'forum_prompt',
  'unit_quiz',
  'content_placeholder',
  'guide',
])
export type ScreenType = z.infer<typeof ScreenType>

export const InteractionType = z.enum([
  'accordion',
  'tabs',
  'flip_cards',
  'match_pairs',
  'sort_steps',
  'single_choice',
  'true_false',
  'classification',
  'scenario_decision',
  'case_practice',
  'hotspots',
  'video',
  'fill_blanks',
  'timeline',
  'flashcards',
  'html_embed',
  'image_cards',
  'before_after',
  'word_search',
  'crossword',
  'hidden_image',
  'az_quiz',
  'puzzle',
  'scenario_steps',
  'decision_tree',
  'calculator',
])
export type InteractionType = z.infer<typeof InteractionType>

export const LessonStatus = z.enum([
  'not attempted',
  'incomplete',
  'completed',
  'passed',
  'failed',
])

export const NavigationMode = z.enum(['free', 'sequential', 'mixed'])

// ----------------------------------------------------------------------------
// Bloques reutilizables
// ----------------------------------------------------------------------------

/** Referencia a la fuente documental original (trazabilidad). */
export const SourceRef = z.object({
  doc: z.string().describe('Identificador del documento fuente (PDF/Word/vídeo)'),
  locator: z.string().optional().describe('Página, sección, timestamp, etc.'),
  quote: z.string().optional().describe('Cita literal preservada'),
  transform: z
    .string()
    .optional()
    .describe('Cómo se transformó el original (resumen, reescritura, ...)'),
})
export type SourceRef = z.infer<typeof SourceRef>

export const AltMedia = z.object({
  alt: z.string().default('').describe('Texto alternativo (obligatorio para imágenes)'),
  caption: z.string().optional(),
})

export const VisualResource = z.object({
  kind: z.enum(['none', 'image', 'video_youtube', 'video_file', 'audio']).default('none'),
  src: z.string().default(''),
  alt: z.string().default(''),
  caption: z.string().optional(),
  poster: z.string().optional(),
  // Subtítulos VTT (uno por idioma) + transcripción asociada al recurso
  tracks: z
    .array(
      z.object({
        lang: z.string().default('es'),
        label: z.string().default('Español'),
        src: z.string(),
        kind: z.enum(['subtitles', 'captions']).default('subtitles'),
      }),
    )
    .default([]),
  has_voice: z.boolean().default(false).describe('Si el medio contiene voz (exige subtítulos)'),
  // Los enums de presentación toleran '' (los GPT a veces lo emiten) → cae al default
  layout: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .enum(['top', 'bottom', 'left', 'right'])
      .default('top')
      .describe('Posición del recurso respecto al texto en pantallas de contenido'),
  ),
  media_width: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .enum(['33', '50', '66'])
      .default('50')
      .describe('Ancho del recurso (% ) en disposiciones laterales left/right'),
  ),
  media_align: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .enum(['left', 'center'])
      .default('left')
      .describe('Alineación horizontal del recurso en disposiciones top/bottom'),
  ),
  media_full: z
    .boolean()
    .default(false)
    .describe('Estira el recurso al 100% del ancho en disposiciones top/bottom'),
  media_ratio: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .enum(['16x9', '4x3', '1x1', '9x16'])
      .default('16x9')
      .describe('Proporción del marco del vídeo de YouTube'),
  ),
})
export type VisualResource = z.infer<typeof VisualResource>

export const Accessibility = z.object({
  alt_text_ok: z.boolean().default(false),
  keyboard_ok: z.boolean().default(true),
  contrast_ok: z.boolean().default(true),
  notes: z.string().optional(),
})

// ----------------------------------------------------------------------------
// Interacciones
// ----------------------------------------------------------------------------

const Feedback = z.object({
  correct: z.string().default('Correcto.'),
  incorrect: z.string().default('Revisa tu respuesta.'),
  explanation: z.string().default('').describe('Explicación pedagógica'),
})

export const InteractionOption = z.object({
  id: z.string(),
  text: z.string(),
  correct: z.boolean().optional(),
  group: z.string().optional().describe('Para clasificación / match pairs'),
  feedback: z.string().optional(),
})
export type InteractionOption = z.infer<typeof InteractionOption>

export const Interaction = z.object({
  id: z.string(),
  type: InteractionType,
  prompt: z.string().default('').describe('Enunciado'),
  instructions: z.string().default(''),
  options: z.array(InteractionOption).default([]),
  // Estructuras específicas (libres por tipo, validadas en runtime por el motor)
  config: z.record(z.any()).default({}),
  feedback: Feedback.default({}),
  scored: z.boolean().default(false),
  points: z.number().default(0),
  attempts: z
    .number()
    .int()
    .min(0)
    .default(1)
    .describe('Intentos permitidos para comprobar la respuesta. 1 por defecto, 0 = ilimitados'),
  retries: z.number().int().min(0).default(0).describe('DEPRECADO: usar attempts'),
  source_refs: z.array(SourceRef).default([]),
})
export type Interaction = z.infer<typeof Interaction>

// ----------------------------------------------------------------------------
// Pantalla
// ----------------------------------------------------------------------------

export const Screen = z.object({
  id: z.string(),
  type: ScreenType,
  title: z.string().default(''),
  objective: z.string().default(''),
  student_text: z.string().default('').describe('Texto para el estudiante (HTML limitado/markdown)'),
  source_refs: z.array(SourceRef).default([]),
  visual_resource: VisualResource.default({}),
  interaction: Interaction.nullable().default(null),
  interaction_layout: z
    .enum(['top', 'bottom'])
    .default('bottom')
    .describe('Posición de la interacción respecto al texto: encima (top) o debajo (bottom)'),
  required: z.boolean().default(true),
  min_time_seconds: z.number().int().min(0).default(0),
  audio_src: z
    .string()
    .default('')
    .describe('Audio de locución/narración de la diapositiva (ruta en assets/media)'),
  transcript: z
    .string()
    .default('')
    .describe('Transcripción de la diapositiva: se muestra SOLO en el botón «Transcripción» y sirve de alternativa textual del audio/vídeo'),
  transcript_hidden: z
    .boolean()
    .default(false)
    .describe('Pantalla sin transcripción para el alumno: el botón «Transcripción» queda desactivado y la pantalla queda fuera de la narración automática en bloque (rellenar transcripciones, generar audios de pantalla y de ítems, avisos NARR_*). El texto de `transcript`, si lo hay, se conserva.'),
  transcript_content_hash: z
    .string()
    .optional()
    .describe('Metadato interno del editor (no autorado): huella del contenido hablable cuando se escribió/regeneró transcript por última vez. Si no coincide con el contenido actual, avisa de que la transcripción puede estar desactualizada. Omitir al redactar course.json a mano.'),
  audio_transcript_hash: z
    .string()
    .optional()
    .describe('Metadato interno del editor (no autorado): huella de transcript cuando se generó audio_src por última vez. Si no coincide con transcript actual, avisa de que el audio puede estar desactualizado. Omitir al redactar course.json a mano.'),
  /** Marco de color: la carcasa envuelve TODO el contenido de la pantalla en una caja de
   *  ese color, con un rótulo opcional (icono + texto) arriba. Pantallas seguidas con el
   *  mismo marco se leen como una unidad («🧪 Caso práctico»). Opcional: las
   *  pantallas sin marco no llevan el campo (los .scormproj anteriores no cambian). */
  frame: z
    .object({
      color: z.string().default('').describe('Color hex del marco (#RRGGBB); vacío = sin marco'),
      label: z.string().default('').describe('Rótulo opcional sobre el contenido'),
      icon: z.string().default('').describe('Emoji opcional delante del rótulo'),
    })
    .optional(),
  accessibility: Accessibility.default({}),
  scorm: z
    .object({
      counts_for_completion: z.boolean().default(true),
    })
    .default({}),
  editor_notes: z.array(z.string()).default([]).describe('Notas/avisos editoriales'),
  status: z
    .enum(['ok', 'esqueleto_pendiente_desarrollo', 'borrador'])
    .default('ok'),
  /** Marca de revisión pendiente: distinta de `status` (que es sobre el estado del
   *  CONTENIDO) — esta es un aviso editorial de que alguien debe repasar la pantalla,
   *  independiente de si el contenido ya está terminado. Una pantalla marcada:
   *  - se destaca en Vista estudiante con borde rojo + nota (excepción deliberada a la
   *    invariante «Vista estudiante = export», ver CLAUDE.md);
   *  - **no se incluye en el paquete SCORM exportado** (`stripFlaggedForReview` en
   *    `schema/review.ts`) — por eso solo se ve en el visor, nunca en el ZIP real. */
  review: z
    .object({
      flagged: z.boolean().default(false),
      note: z.string().default(''),
    })
    .default({}),
})
export type Screen = z.infer<typeof Screen>
/** Forma de entrada del esquema: los campos con default son opcionales (presets/recetas). */
export type ScreenInput = z.input<typeof Screen>

export const Unit = z.object({
  id: z.string(),
  title: z.string().default(''),
  summary: z.string().default(''),
  screens: z.array(Screen).default([]),
  status: z.enum(['ok', 'esqueleto_pendiente_desarrollo']).default('ok'),
  /** `true` = este elemento de `units[]` NO es una unidad real: es un bloque
   *  anónimo de pantallas sueltas «entre unidades» — el sitio para poner
   *  diapositivas sueltas entre dos unidades sin que pertenezcan a ninguna de
   *  las dos, ni a nivel visual (el árbol no le pinta título/resumen/miga de
   *  pan) ni de editor (sin resumen, sin exigencia de actividad, no aparece
   *  como entrada propia en el menú del alumno). `title`/`summary`/`status`
   *  se ignoran cuando es `true` — sigue siendo un `Unit` por reutilizar toda
   *  la infraestructura de `units[]` (orden, mover, `id` propio y estable),
   *  no por representar contenido real. Default `false` = unidad normal,
   *  compatible con proyectos previos. */
  loose: z.boolean().default(false),
  /** `true` = esta unidad SÍ es real (título, resumen, exigencia de actividad,
   *  validación… todo igual) pero su título NO aparece en el menú lateral de
   *  Vista estudiante ni del SCORM exportado — solo se oculta ahí ese rótulo
   *  de nivel 2 y la mini-barra de progreso de la unidad; sus pantallas
   *  siguen listadas en el menú, sueltas (mismo tratamiento visual que
   *  `module.screens`/`unit.loose`), y la miga de pan de cada pantalla sigue
   *  nombrando la unidad. No afecta al árbol del editor (ahí la unidad se ve
   *  igual que siempre) ni a `screenContainers()`/validación: es un ajuste
   *  puramente de qué pinta `buildMenu()` en la carcasa. Default `false` =
   *  visible, compatible con proyectos previos. */
  hide_menu_title: z.boolean().default(false),
})
export type Unit = z.infer<typeof Unit>

export const Module = z.object({
  id: z.string(),
  title: z.string().default(''),
  /** Pantallas propias del módulo (portada/presentación): se muestran SIEMPRE
   *  antes de las de sus unidades. Default [] = compatible con proyectos previos. */
  screens: z.array(Screen).default([]),
  units: z.array(Unit).default([]),
  /** Pantallas de cierre del módulo: se muestran SIEMPRE después de sus
   *  unidades (resumen/despedida antes de pasar al siguiente módulo). Mismo
   *  formato que `screens`; contenedor propio (no una unidad más) porque no
   *  tiene sentido en la miga de pan ni en `units[]` (no es contenido, es
   *  cierre). Default [] = compatible con proyectos previos. */
  closing_screens: z.array(Screen).default([]),
})
export type Module = z.infer<typeof Module>

// ----------------------------------------------------------------------------
// Evaluación, glosario, bibliografía
// ----------------------------------------------------------------------------

export const QuizQuestion = z.object({
  id: z.string(),
  prompt: z.string(),
  type: z.enum(['single_choice', 'true_false', 'multiple_choice']).default('single_choice'),
  options: z.array(InteractionOption).default([]),
  feedback: Feedback.default({}),
  points: z.number().default(1),
  learning_objective: z.string().default(''),
  source_refs: z.array(SourceRef).default([]),
})

export type QuizQuestion = z.infer<typeof QuizQuestion>

export const UnitTest = z.object({
  id: z.string(),
  unit_id: z.string(),
  title: z.string().default('Test de unidad'),
  instructions: z
    .string()
    .default('')
    .describe('Texto introductorio opcional antes de las preguntas (markdown ligero); vacío = no se muestra nada'),
  questions: z.array(QuizQuestion).default([]),
  pass_score: z
    .number()
    .min(0)
    .max(100)
    .default(60)
    .describe('Heredado, sin efecto: la nota mínima única del curso es scorm.rules.min_score'),
  one_question_per_screen: z
    .boolean()
    .default(false)
    .describe('Presentar el test paginado: una pregunta cada vez, con navegación Anterior/Siguiente'),
})
export type UnitTest = z.infer<typeof UnitTest>

export const GlossaryTerm = z.object({
  term: z.string(),
  definition: z.string(),
  source_refs: z.array(SourceRef).default([]),
})
export type GlossaryTerm = z.infer<typeof GlossaryTerm>

export const BibliographyEntry = z.object({
  ref: z.string(),
  url: z.string().optional(),
})
export type BibliographyEntry = z.infer<typeof BibliographyEntry>

/** Documento PDF adjunto al curso (Materiales → Documentos). El binario vive en el
 *  `AssetMap` bajo `src` (`assets/docs/…pdf`) y viaja en el ZIP como cualquier asset.
 *  Límites de tamaño y número en `schema/attachments.ts` (los comprueban el editor
 *  al subir y `validators.ts`). */
export const Attachment = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  src: z.string(),
  /** Peso en bytes, informativo (lo rellena el editor al subir; la carcasa lo muestra). */
  size: z.number().int().nonnegative().optional(),
})
export type Attachment = z.infer<typeof Attachment>

// ----------------------------------------------------------------------------
// Configuración SCORM y carcasa
// ----------------------------------------------------------------------------

// Estructura del curso en el momento de un export SCORM (huella de posiciones
// de suspend_data v2, ver docs/suspend-data.md). Se añade una entrada nueva
// por cada estructura distinta publicada, para que el runtime pueda remapear
// el progreso de un alumno tras reordenar/añadir/quitar contenido.
export const CourseLayout = z.object({
  fp: z.string(),
  screens: z.array(z.string()),
  interactions: z.array(z.object({ id: z.string(), type: InteractionType })),
  final_questions: z.array(z.string()),
  exported_at: z.string(),
})
export type CourseLayout = z.infer<typeof CourseLayout>

export const ScormConfig = z.object({
  version: z.literal('1.2').default('1.2'),
  identifier: z.string().default('SCORMEDITOR-COURSE'),
  title: z.string().default(''),
  mastery_score: z.number().min(0).max(100).default(60),
  rules: z.object({
    completion_mode: z.enum(['evaluation', 'screens']).default('evaluation')
      .describe('evaluation: completado clásico (pantallas + interacciones obligatorias si aplica + nota mínima). screens: completado con solo llegar al final (min_required_screens_pct); la nota y el APTO/NO APTO se siguen calculando y mostrando, pero no bloquean ni cambian el lesson_status'),
    min_required_screens_pct: z.number().min(0).max(100).default(100),
    require_interactions: z.boolean().default(true),
    min_score: z.number().min(0).max(100).default(60),
    attempts_allowed: z.number().int().min(0).default(0).describe('0 = ilimitados'),
    score_source: z.enum(['final_test', 'unit_tests', 'mixed']).default('mixed'),
    mixed_final_weight: z
      .number()
      .min(0)
      .max(100)
      .default(70)
      .describe('En score_source="mixed", peso (%) del test final; la práctica pesa el resto'),
    navigation: NavigationMode.default('mixed'),
    allow_resume: z.boolean().default(true),
    auto_return: z
      .boolean()
      .default(false)
      .describe('Al cerrar la sesión, volver solo a la página del curso en el LMS (Moodle) tras una cuenta atrás de 5 s'),
  }).default({}),
  layouts: z.array(CourseLayout).default([]).describe('Historial de estructuras publicadas (suspend_data v2)'),
})
export type ScormConfig = z.infer<typeof ScormConfig>

// Código de idioma tipo BCP-47 («es», «es-ES», «en»). Se valida porque se
// interpola en atributos HTML (lang=…) de la carcasa y la previsualización;
// un valor inválido (proyecto antiguo o manipulado) cae a «es» sin romper la carga.
const LanguageCode = z.string()
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/)
  .default('es')
  .catch('es')

export const ShellConfig = z.object({
  brand: z
    .string()
    .default('')
    .describe('Marca de la cabecera; vacía, la cabecera muestra solo el título del curso'),
  logo: z.string().optional(),
  primary_color: z.string().default('#0b5fff'),
  accent_color: z.string().default('#6DC3C0'),
  show_sidebar: z.boolean().default(true),
  show_progress: z.boolean().default(true),
  language: LanguageCode,
  motion: z
    .enum(['none', 'subtle', 'rich', 'vivid'])
    .default('subtle')
    .describe('Animaciones de la carcasa: none (sin), subtle (básicas), rich (revelado progresivo), vivid (revelado con entradas variadas y transición direccional entre pantallas)'),
  motion_speed: z
    .enum(['fast', 'normal', 'slow'])
    .default('normal')
    .describe('Velocidad de las animaciones de entrada (multiplica la duración del nivel elegido)'),
}).default({})
export type ShellConfig = z.infer<typeof ShellConfig>

// ----------------------------------------------------------------------------
// Curso completo
// ----------------------------------------------------------------------------

export const Course = z.object({
  schema_version: z.string().default(SCHEMA_VERSION),
  course: z.object({
    id: z.string().default('curso-1'),
    title: z.string().default(''),
    subtitle: z.string().default(''),
    description: z.string().default(''),
    authoring_entity: z.string().default(''),
    source_document: z.string().default('').describe('Documento origen (PDF/Word)'),
    estimated_hours: z.number().default(0),
    language: LanguageCode,
  }).default({}),
  scorm: ScormConfig.default({}),
  shell: ShellConfig,
  /** Pantallas sueltas de introducción, antes de cualquier módulo (portada del
   *  paquete SCORM, bienvenida, objetivos generales…): no pertenecen a ningún
   *  módulo ni unidad, sueltas en el menú lateral del alumno (sin agrupar bajo
   *  un título de módulo, porque no pertenecen a ninguno). Default [] =
   *  compatible con proyectos previos. */
  intro_screens: z.array(Screen).default([]),
  /** Pantallas sueltas de cierre, después de TODO lo demás (incluido el test
   *  final y la pantalla de resultados, si los hay) — simétricas a
   *  `intro_screens`, con el mismo tratamiento: no pertenecen a ningún módulo
   *  ni unidad, sueltas en el menú lateral, sin agrupar. Default [] =
   *  compatible con proyectos previos. */
  closing_screens: z.array(Screen).default([]),
  narration: z.object({
    mode: z
      .enum(['auto', 'on', 'off'])
      .default('auto')
      .describe('Curso narrado: activa los avisos de transcripción/audio pendientes. auto = según haya locución en alguna pantalla'),
    /** Config de voz TTS compartida por el proyecto (proveedor, modelo, voz,
     *  formato, velocidad, tono/«Vibe») — así todo el equipo locuta con la
     *  misma voz al abrir el `.scormproj`. La CLAVE de API queda fuera a
     *  propósito: nunca se guarda aquí ni en el ZIP, solo en el `localStorage`
     *  del navegador de cada autor (ver `src/tts/tts.ts`). */
    tts: z.object({
      provider: z.enum(['openai', 'gemini', 'elevenlabs']).default('openai'),
      baseUrl: z.string().default('https://api.openai.com/v1'),
      model: z.string().default('gpt-4o-mini-tts'),
      voice: z.string().default('marin'),
      format: z.enum(['mp3', 'wav', 'opus', 'aac', 'flac']).default('mp3'),
      speed: z.number().default(1),
      // Vibe por defecto (narración educativa) — mismo texto que
      // `DEFAULT_VIBE` en `src/tts/tts.ts`; duplicado a propósito (zod no
      // puede importar de ese módulo sin acoplar el esquema a él), mantener
      // los dos en sync. En inglés deliberadamente: es el propio contenido
      // que se envía tal cual a la API como instrucciones de estilo, no
      // texto de interfaz.
      instructions: z.string().default(
        'Voice Affect: Educative, clear, engaging. Articulate and structured, instilling focus and curiosity.\n\n'
        + 'Tone: Pedagogical, friendly, and professional. Conversational and approachable, avoiding monotonous delivery.\n\n'
        + 'Pacing: Moderate to measured. Balanced rhythm for taking notes and processing complex concepts. Slower for new definitions; normal for everyday examples.\n\n'
        + 'Emotions: Enthusiasm for learning, patience, and encouraging clarity.\n\n'
        + 'Pronunciation: Flawless, precise, neutral Spanish accent. Perfect articulation of consonants so diverse audiences understand. Emphasis on key technical words.\n\n'
        + 'Pauses: Short, natural pauses at sentences and commas. Longer, deliberate pauses after a question or definition, giving the student a moment to process the information.',
      ),
    }).default({}),
    /** Recompresión del audio de locución en Vista estudiante y en el ZIP
     *  exportado (nunca en el `.scormproj`: el audio fuente generado por TTS
     *  se conserva siempre a su calidad original — ver `tts-narracion.md`,
     *  «Compresión de audio de locución»). Pensada para voz hablada, no para
     *  audio de contenido general. */
    compressAudio: z.object({
      enabled: z.boolean().default(true),
      /** Bitrate de salida en kbps, mono. 64 = equilibrado (recomendado). */
      kbps: z.number().default(64),
    }).default({}),
  }).default({}),
  /** Rótulo por el que la UI del editor llama a `modules` (árbol, formularios…):
   *  un paquete SCORM puede representar un curso completo, un módulo, una unidad
   *  o un tema suelto según el contenido, así que «Módulo» no siempre encaja — el
   *  autor puede renombrarlo (p. ej. a «Tema», «Bloque»). No cambia la estructura
   *  real (sigue siendo módulo→unidad→pantalla por debajo) ni se muestra al
   *  alumno (la portada no lleva rótulo de nivel, ver `renderer.js`). */
  module_label: z.string().default('Módulo'),
  /** Igual que `module_label`, para `units` (árbol, formularios…). */
  unit_label: z.string().default('Unidad'),
  modules: z.array(Module).default([]),
  assessments: z.object({
    unit_tests: z.array(UnitTest).default([]),
    final_test: UnitTest.nullable().default(null),
  }).default({}),
  glossary: z.array(GlossaryTerm).default([]),
  glossary_title: z
    .string()
    .default('Glosario')
    .describe('Rótulo del glosario en la carcasa (botón de la barra y título del modal)'),
  bibliography: z.array(BibliographyEntry).default([]),
  bibliography_title: z
    .string()
    .default('Recursos y bibliografía')
    .describe('Rótulo de recursos/bibliografía en la carcasa (título del modal; el botón lo abrevia si es el valor por defecto)'),
  attachments: z.array(Attachment).default([]),
  attachments_title: z
    .string()
    .default('Documentos')
    .describe('Rótulo de los documentos adjuntos (PDF) en la carcasa (entrada del menú lateral y título del modal)'),
  quality_checklist: z.record(z.boolean()).default({}),
})
export type Course = z.infer<typeof Course>

/**
 * Parsea y normaliza (rellena defaults) un objeto course.json.
 * Lanza ZodError con detalle si la estructura es inválida.
 */
export function parseCourse(input: unknown): Course {
  return Course.parse(input)
}

export function safeParseCourse(input: unknown) {
  return Course.safeParse(input)
}
