import { useState, useEffect, useMemo, useRef } from 'react'
import { useCourseStore } from '../store/courseStore'
import { validateCourse } from '../validation/validators'
import { ScreenType, InteractionType, Interaction, type Screen } from '../schema/course.schema'
import { screenTypeLabel, screenTypeIcon, screenTypeColor, interactionTypeLabel, type CoverLevel } from '../schema/labels'
import { SCREEN_TYPE_UI } from '../schema/screenTypeUI'
import { interactionRecipe, interactionColor, migrateInteractionData, interactionHasContent } from '../schema/interactionRecipes'
import { InteractionTypeModal } from './InteractionTypeModal'
import { SegIcons } from './SegIcons'
import { RichTextArea } from './RichTextArea'
import { InteractionConfigEditor } from './InteractionConfigEditor'
import { ObjectiveInput } from './ObjectiveSelect'
import { FileButton } from './FileButton'
import { generateForScreen, hasApiKey } from '../tts/tts'
import { buildTranscript, contentHash, INFORMATIVE } from '../tts/buildTranscript'
import { confirmDialog, confirmDialogTri } from '../store/confirm'
import type { AssetMap } from '../export/exportScorm'
import { Icon } from './Icon'
import { ScreenFrameEditor } from './ScreenFrameEditor'
import { ExportScreensModal } from './ExportScreensModal'

// Controles compactos con iconos (title/aria-label describen la acción) en vez de selects.
const KIND_ICONS = [
  { value: 'none', icon: <Icon name="ban" size={17} />, title: 'Sin recurso' },
  { value: 'image', icon: <Icon name="image" size={17} />, title: 'Imagen' },
  { value: 'video_youtube', icon: <Icon name="play" size={17} />, title: 'Vídeo de YouTube' },
  { value: 'video_file', icon: <Icon name="film" size={17} />, title: 'Vídeo (archivo)' },
  { value: 'audio', icon: <Icon name="volume" size={17} />, title: 'Audio' },
]
const LAYOUT_ICONS = [
  { value: 'top', icon: <Icon name="arrow-up" size={16} />, title: 'Arriba del texto' },
  { value: 'bottom', icon: <Icon name="arrow-down" size={16} />, title: 'Debajo del texto' },
  { value: 'left', icon: <Icon name="arrow-left" size={16} />, title: 'A la izquierda del texto' },
  { value: 'right', icon: <Icon name="arrow-right" size={16} />, title: 'A la derecha del texto' },
]
const WIDTH_ICONS = [
  { value: '33', icon: '⅓', title: 'Recurso 33% · texto 66%' },
  { value: '50', icon: '½', title: 'Recurso 50% · texto 50%' },
  { value: '66', icon: '⅔', title: 'Recurso 66% · texto 33%' },
]
// Ajuste del recurso en top/bottom (estados excluyentes: al estirar al 100% el
// centrado ya no aplica). Mapea a media_align + media_full.
const FIT_ICONS = [
  { value: 'left', icon: <Icon name="fit-left" size={17} />, title: 'Alineada a la izquierda' },
  { value: 'center', icon: <Icon name="fit-center" size={17} />, title: 'Centrada' },
  { value: 'full', icon: <Icon name="fit-full" size={17} />, title: 'Ancho completo (100%)' },
]
// Proporción del marco del vídeo embebido (media_ratio, solo YouTube).
const RATIO_ICONS = [
  { value: '16x9', icon: '16:9', title: 'Panorámico 16:9' },
  { value: '4x3', icon: '4:3', title: 'Clásico 4:3' },
  { value: '1x1', icon: '1:1', title: 'Cuadrado 1:1' },
  { value: '9x16', icon: '9:16', title: 'Vertical 9:16' },
]
// Posición de la interacción respecto al texto (mismos iconos que Disposición).
const IT_POS_ICONS = [
  { value: 'top', icon: <Icon name="arrow-up" size={16} />, title: 'Encima del texto' },
  { value: 'bottom', icon: <Icon name="arrow-down" size={16} />, title: 'Debajo del texto' },
]

// Defaults de feedback del esquema (única fuente de verdad): para saber si el
// autor lo ha personalizado (resumen del fold «Feedback»).
const FB_DEFAULTS = Interaction.parse({ id: '_', type: 'single_choice' }).feedback

/** Sección plegable no controlada: `defaultOpen` solo aplica al montar. Las
 *  claves externas (por pantalla/tipo) remontan la sección para re-aplicar el
 *  énfasis del tipo sin pisar lo que el autor pliegue/despliegue a mano. */
function Fold({ summary, defaultOpen = false, children }: {
  summary: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open] = useState(defaultOpen)
  return (
    <details className="ed-fold" open={open || undefined}>
      <summary>{summary}</summary>
      <div className="ed-fold-body">{children}</div>
    </details>
  )
}

// Pantallas ya avisadas (en esta sesión) de que editar su contenido deja el
// audio de locución desactualizado. Aviso único por pantalla; se re-arma al
// regenerar el audio con TTS.
const audioStaleWarned = new Set<string>()

// Crea (y libera) un object URL para un asset, para la vista previa. Normaliza el
// valor del AssetMap a Blob igual que StudentPreview (puede ser Blob/bytes/string).
function useObjectUrl(val: AssetMap[string] | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (val == null) { setUrl(null); return }
    const blob = val instanceof Blob ? val : new Blob([val as BlobPart])
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [val])
  return url
}

function MediaPreview({ vr, assets }: { vr: any; assets: AssetMap }) {
  const fileBacked = vr.kind === 'image' || vr.kind === 'video_file' || vr.kind === 'audio'
  const url = useObjectUrl(fileBacked ? assets[vr.src] : undefined)
  const posterUrl = useObjectUrl(vr.poster ? assets[vr.poster] : undefined)

  if (vr.kind === 'none') return null
  if (vr.kind === 'video_youtube') {
    if (!vr.src) return null
    // La vista previa refleja la proporción elegida (media_ratio); la vertical
    // se acota en ancho para que no crezca desmesuradamente en alto.
    const ratio = (vr.media_ratio || '16x9').replace('x', ' / ')
    return (
      <div className="ed-media-preview">
        <iframe className="ed-media-yt" src={`https://www.youtube.com/embed/${vr.src}`}
          style={{ aspectRatio: ratio, ...(vr.media_ratio === '9x16' ? { maxWidth: 200 } : null) }}
          title="Vista previa de YouTube" allowFullScreen loading="lazy" />
      </div>
    )
  }
  if (!vr.src) return null
  if (!url) return <p className="ed-media-empty">Sin archivo subido para «{vr.src}». Súbelo para ver la vista previa.</p>
  return (
    <div className="ed-media-preview">
      {vr.kind === 'image' && <img className="ed-media-img" src={url} alt={vr.alt || 'Vista previa'} />}
      {vr.kind === 'video_file' && <video className="ed-media-vid" src={url} poster={posterUrl || undefined} controls />}
      {vr.kind === 'audio' && <audio className="ed-media-aud" src={url} controls />}
    </div>
  )
}

export function ScreenEditor() {
  const id = useCourseStore((s) => s.selectedScreenId)
  const screen = useCourseStore((s) => (id ? s.getScreen(id) : null))
  const locate = useCourseStore((s) => s.locate)
  const update = useCourseStore((s) => s.updateScreen)
  const changeType = useCourseStore((s) => s.changeScreenType)
  const assets = useCourseStore((s) => s.assets)
  const removeAsset = useCourseStore((s) => s.removeAsset)
  const course = useCourseStore((s) => s.course)
  const changeItType = useCourseStore((s) => s.changeInteractionType)
  const [ttsBusy, setTtsBusy] = useState(false)
  const [ttsMsg, setTtsMsg] = useState<string | null>(null)
  // Selector visual de tipo de interacción: 'add' crea una nueva, 'change'
  // cambia el tipo de la existente (con migración/confirmación).
  const [typePicker, setTypePicker] = useState<null | 'add' | 'change'>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  // Rutas/ID por tipo de recurso y pantalla (clave `id:kind`), para que cambiar
  // de tipo no arrastre el valor de otro. Solo vive durante la sesión de edición.
  // OJO: debe declararse ANTES del return temprano de «sin pantalla» — un hook
  // tras un return condicional rompe React («Rendered fewer hooks») y dejaba la
  // app en blanco al borrar el módulo/unidad de la pantalla seleccionada.
  const vrMemory = useRef<Record<string, { src: string; poster?: string; tracks: Screen['visual_resource']['tracks'] }>>({})

  // Issues de validación de ESTA pantalla (validación en contexto, no solo en
  // la pestaña Validación).
  const screenIssues = useMemo(
    () => (id ? validateCourse(course).issues.filter((i) => i.screenId === id && i.severity !== 'info') : []),
    [course, id],
  )

  if (!id || !screen) return <div className="ed-empty">Selecciona una pantalla en el árbol para editarla.</div>

  // Nivel del contenedor de ESTA pantalla, solo para el rótulo de una portada
  // (`type: 'cover'`) — ver CoverLevel en schema/labels.ts.
  const loc = locate(id)
  const coverLevel: CoverLevel = !loc ? 'unit' : loc.mi === 'intro' ? 'course' : loc.ui == null ? 'module' : 'unit'

  async function onGenerateAudio() {
    if (!id) return
    setTtsMsg(null)
    if (!hasApiKey()) {
      setTtsMsg('Error: falta la clave de API. Configúrala en «Ajustes → Narración» de la barra superior.')
      return
    }
    setTtsBusy(true)
    try {
      await generateForScreen(id)
      audioStaleWarned.delete(id)
      setTtsMsg('✓ Audio generado desde la transcripción.')
    } catch (e) {
      setTtsMsg(`Error: ${(e as Error).message}`)
    } finally {
      setTtsBusy(false)
    }
  }

  const patch = (p: Parameters<typeof update>[1]) => update(id, p)
  const vr = screen.visual_resource
  const it = screen.interaction
  // Desactualizado: el contenido/la transcripción cambió después de tocarlos
  // por última vez (huella sellada en updateScreen ya no coincide). Sin
  // huella (transcripción de antes de este mecanismo) no se marca — no hay
  // con qué comparar. Mismo criterio que NARR_TRANSCRIPT_STALE/NARR_AUDIO_STALE.
  const transcriptStale = !!screen.transcript_content_hash && screen.transcript_content_hash !== contentHash(buildTranscript(screen))
  const audioStale = !!screen.audio_src.trim() && !!screen.audio_transcript_hash && screen.audio_transcript_hash !== contentHash(screen.transcript)
  // Receta del tipo de interacción actual (gradable/attempts/seed del catálogo).
  const itRecipe = it ? interactionRecipe(it.type) : null
  // Énfasis por tipo de pantalla (capa de UI: reordena y sugiere, no restringe).
  const uiCfg = SCREEN_TYPE_UI[screen.type] ?? {}

  // Si la pantalla tiene audio de locución, avisa (una vez por pantalla) de que
  // los cambios en el contenido no se aplican al audio ya generado: hay que
  // regenerar la transcripción y después el audio.
  function warnAudioStale(message?: string) {
    if (!id || !screen?.audio_src || audioStaleWarned.has(id)) return
    audioStaleWarned.add(id)
    void confirmDialog({
      title: 'Esta diapositiva tiene audio de locución',
      message: message ??
        'Los cambios en el contenido no se aplican al audio ya asociado: cuando termines de editar, regenera la transcripción y después el audio para que vuelvan a corresponderse.',
      confirmLabel: 'Entendido',
      hideCancel: true,
    })
  }
  const setVr = (p: Partial<typeof vr>) => patch({ visual_resource: { ...vr, ...p } })
  const setTracks = (tracks: typeof vr.tracks) => setVr({ tracks })

  // Cambia el tipo de recurso. Cada tipo conserva su propia ruta/ID: al cambiar
  // se guarda lo actual y se restaura lo que el tipo destino tuviera antes (así
  // una ruta assets/… nunca acaba como «ID de YouTube» ni viceversa). Al pasar a
  // «Sin recurso», ofrece borrar los binarios asociados de assets (irrecuperable)
  // con aviso previo.
  async function changeKind(next: string) {
    if (next === vr.kind) return
    vrMemory.current[`${id}:${vr.kind}`] = { src: vr.src, poster: vr.poster, tracks: vr.tracks }
    if (next === 'none') {
      const paths = [vr.src, vr.poster, ...vr.tracks.map((t) => t.src)]
        .filter((p): p is string => !!p && !!assets[p])
      if (paths.length) {
        const ok = await confirmDialog({
          title: 'Quitar recurso',
          message: 'Se quitará el recurso de esta diapositiva. Si el archivo no se usa en ninguna otra pantalla, se borrará de assets para no ocupar espacio (irrecuperable). ¿Deseas continuar?',
          confirmLabel: 'Quitar',
          danger: true,
        })
        if (!ok) return
      }
      // Quitamos la referencia ANTES de intentar borrar: removeAsset conserva el
      // binario si alguna otra pantalla aún lo usa (p. ej. tras duplicar).
      setVr({ kind: 'none', src: '', poster: '', tracks: [] })
      paths.forEach((p) => removeAsset(p))
      // Los binarios ya no existen: restaurar esas rutas al volver engañaría.
      Object.keys(vrMemory.current).forEach((k) => { if (k.startsWith(`${id}:`)) delete vrMemory.current[k] })
      return
    }
    const prev = vrMemory.current[`${id}:${next}`]
    setVr({ kind: next as any, src: prev?.src ?? '', poster: prev?.poster ?? '', tracks: prev?.tracks ?? [] })
  }

  // Cambia el tipo de pantalla. Al dejar de ser «Vídeo» con un vídeo como recurso
  // visual, pregunta si quitarlo (si no, la pantalla seguiría mostrándolo arriba
  // sin ser de vídeo, lo que desconcierta). Cancelar deja el tipo como estaba.
  async function onChangeScreenType(next: ScreenType) {
    if (!id || next === screen!.type) return
    const isVideoRes = vr.kind === 'video_youtube' || vr.kind === 'video_file'
    if (screen!.type === 'video' && isVideoRes && vr.src) {
      const r = await confirmDialogTri({
        title: 'Cambiar el tipo de pantalla',
        message: 'Esta pantalla tiene un vídeo como recurso visual. ¿Quieres quitarlo al dejar de ser una pantalla de Vídeo? Si lo mantienes, seguirá viéndose arriba.',
        confirmLabel: 'Quitar el vídeo',
        thirdLabel: 'Mantener el vídeo',
      })
      if (r === 'cancel') return
      changeType(id, next)
      if (r === 'confirm') await changeKind('none')
      return
    }
    changeType(id, next)
  }

  // Regenera la transcripción a partir del contenido de la pantalla. Si hay un
  // audio de locución asociado, dejará de corresponderse con el texto: se avisa
  // y se ofrece regenerarlo con TTS en el momento.
  async function onRebuildTranscript() {
    if (!screen) return
    const next = buildTranscript(screen)
    if (!next.trim()) {
      setTtsMsg('Aviso: la pantalla no tiene texto ni interacciones informativas de las que generar la transcripción.')
      return
    }
    if (screen.transcript.trim() && screen.transcript.trim() !== next.trim()) {
      const ok = await confirmDialog({
        title: 'Regenerar transcripción',
        message: 'Se sustituirá la transcripción actual por una generada a partir del texto del estudiante y las interacciones informativas de esta pantalla.',
        confirmLabel: 'Regenerar',
      })
      if (!ok) return
    }
    patch({ transcript: next })
    setTtsMsg('✓ Transcripción regenerada desde el contenido.')
    if (screen.audio_src) {
      const regen = await confirmDialog({
        title: 'Audio desactualizado',
        message: 'Esta diapositiva tiene un audio de locución que ya no se corresponde con la nueva transcripción. ¿Quieres regenerar el audio ahora con la voz IA?',
        confirmLabel: 'Regenerar audio',
        cancelLabel: 'Mantener el audio',
      })
      if (regen) await onGenerateAudio()
      else setTtsMsg('Aviso: el audio actual ya no se corresponde con la transcripción regenerada.')
    }
  }

  function setInteraction(next: Interaction | null) {
    // Solo las interacciones informativas forman parte de la narración: editar
    // (o quitar) una desincroniza el audio; las evaluables no se narran.
    if (INFORMATIVE.has(it?.type ?? '') || INFORMATIVE.has(next?.type ?? '')) warnAudioStale()
    patch({ interaction: next })
  }
  function blankInteraction(type?: InteractionType): Interaction {
    // Tipo inicial y puntuación coherentes con el tipo de pantalla (misma
    // filosofía que las recetas: práctica no puntúa de serie, evaluación sí —
    // y solo si el tipo elegido puede puntuar de verdad).
    const t = type ?? uiCfg.recommended?.[0] ?? 'single_choice'
    const rec = interactionRecipe(t)
    const scored = screen?.type === 'unit_quiz' && rec.gradable
    return Interaction.parse({
      id: `i-${Math.random().toString(36).slice(2, 7)}`,
      type: t,
      scored,
      points: scored ? 1 : 0,
      // Enunciado/instrucciones típicos del tipo (homogeneidad, menos tecleo);
      // el autor los sobrescribe si hace falta. También disponibles después
      // como «Usar texto habitual» junto a los propios campos.
      prompt: rec.defaultPrompt ?? '',
      instructions: rec.defaultInstructions ?? '',
      // Estado inicial útil del tipo (opciones precargadas, config mínima).
      ...rec.seed?.(),
    })
  }

  // Cambia el tipo de la interacción existente: solo pide confirmación si la
  // migración descartaría contenido escrito (misma familia = se conserva).
  async function onChangeInteractionType(t: InteractionType) {
    if (!id || !it || t === it.type) return
    const mig = migrateInteractionData(it, t)
    if (mig.lossy) {
      const ok = await confirmDialog({
        title: 'Cambiar el tipo de interacción',
        message: `Parte del contenido de «${interactionTypeLabel(it.type)}» no se puede conservar al pasar a «${interactionTypeLabel(t)}» y se descartará (el enunciado y el feedback se mantienen).`,
        confirmLabel: 'Cambiar tipo',
        danger: true,
      })
      if (!ok) return
    }
    // Aviso de audio desactualizado si el tipo viejo o nuevo se narra.
    if (INFORMATIVE.has(it.type) || INFORMATIVE.has(t)) warnAudioStale()
    const hadPrompt = it.prompt.trim() !== ''
    const hadInstructions = it.instructions.trim() !== ''
    changeItType(id, t)
    // Enunciado/instrucciones vacíos: rellenar con los típicos del tipo nuevo
    // (nunca se pisa texto que el autor ya haya escrito).
    if (!hadPrompt || !hadInstructions) {
      const rec = interactionRecipe(t)
      const fresh = useCourseStore.getState().getScreen(id)?.interaction
      if (fresh) {
        patch({
          interaction: {
            ...fresh,
            prompt: hadPrompt ? fresh.prompt : (rec.defaultPrompt ?? fresh.prompt),
            instructions: hadInstructions ? fresh.instructions : (rec.defaultInstructions ?? fresh.instructions),
          },
        })
      }
    }
  }

  // Elimina la interacción; confirma solo si tiene contenido escrito.
  async function onDeleteInteraction() {
    if (!it) return
    if (interactionHasContent(it)) {
      const ok = await confirmDialog({
        title: 'Eliminar interacción',
        message: `Se eliminará la interacción «${interactionTypeLabel(it.type)}» de esta pantalla con todo su contenido.`,
        confirmLabel: 'Eliminar',
        danger: true,
      })
      if (!ok) return
    }
    setInteraction(null)
  }

  // Resúmenes vivos de los folds de Evaluación y Feedback (se recalculan en
  // cada render; el estado abierto/cerrado del fold es del autor).
  const evalSummary = !it
    ? ''
    : it.scored
      ? `Evaluación — evaluable · ${it.points} ${it.points === 1 ? 'punto' : 'puntos'}` +
        (itRecipe!.supportsAttempts
          ? ` · ${it.attempts === 0 ? 'intentos ilimitados' : `${it.attempts} ${it.attempts === 1 ? 'intento' : 'intentos'}`}`
          : '')
      : 'Evaluación — no puntúa'
  const fbCustom = !!it && (
    it.feedback.correct !== FB_DEFAULTS.correct ||
    it.feedback.incorrect !== FB_DEFAULTS.incorrect ||
    it.feedback.explanation.trim() !== ''
  )

  // Sección «Recurso visual» (se coloca antes o después del texto según el
  // énfasis del tipo: en Vídeo el medio ES el contenido).
  const mediaSection = (
    <Fold key={`vr-${id}-${screen.type}`} summary="Recurso visual"
      defaultOpen={!!uiCfg.mediaFirst || vr.kind !== 'none'}>
        <div className="ed-row">
          <SegIcons label="Tipo de recurso" value={vr.kind}
            onChange={changeKind} options={KIND_ICONS} />
        </div>

        {vr.kind !== 'none' && (
          <div className="ed-media-layout">
            {/* Columna izquierda: ruta/subir, pie, alt, póster */}
            <div className="ed-media-fields">
              <div className="ed-row">
                <label className="ed-field">
                  <span>{vr.kind === 'video_youtube' ? 'ID de YouTube' : 'Ruta del archivo (assets/…)'}</span>
                  <input value={vr.src} onChange={(e) => setVr({ src: e.target.value })} />
                </label>
                {vr.kind === 'image' && (
                  <FileButton accept="image/*" label="Subir imagen…" currentPath={vr.src}
                    makePath={(ext) => `assets/img/${screen.id}.${ext}`} onUploaded={(p) => setVr({ src: p })} />
                )}
                {vr.kind === 'video_file' && (
                  <FileButton accept="video/*" label="Subir vídeo…" currentPath={vr.src}
                    makePath={(ext) => `assets/media/${screen.id}_video.${ext}`} onUploaded={(p) => setVr({ src: p })} />
                )}
                {vr.kind === 'audio' && (
                  <FileButton accept="audio/*" label="Subir audio…" currentPath={vr.src}
                    makePath={(ext) => `assets/media/${screen.id}_audio.${ext}`} onUploaded={(p) => setVr({ src: p })} />
                )}
              </div>

              {(vr.kind === 'image' || vr.kind === 'video_youtube' || vr.kind === 'video_file') && (
                <label className="ed-field"><span>Pie / leyenda (caption)</span>
                  <input value={vr.caption || ''} onChange={(e) => setVr({ caption: e.target.value })} /></label>
              )}
              {vr.kind === 'image' && (
                <label className="ed-field"><span>Texto alternativo (alt) — obligatorio</span>
                  <input value={vr.alt} onChange={(e) => setVr({ alt: e.target.value })} /></label>
              )}
              {vr.kind === 'video_file' && (
                <div className="ed-row">
                  <label className="ed-field"><span>Póster (imagen, assets/img/…)</span>
                    <input value={vr.poster || ''} onChange={(e) => setVr({ poster: e.target.value })} /></label>
                  <FileButton accept="image/*" label="Subir póster…" currentPath={vr.poster}
                    makePath={(ext) => `assets/img/${screen.id}_poster.${ext}`} onUploaded={(p) => setVr({ poster: p })} />
                </div>
              )}
            </div>

            {/* Columna derecha: vista previa + disposición/proporción debajo */}
            <div className="ed-media-side">
              <MediaPreview vr={vr} assets={assets} />
              {vr.kind !== 'audio' && (
                <div className="ed-media-controls">
                  <SegIcons label="Disposición" value={vr.layout}
                    onChange={(l) => setVr({ layout: l as any })} options={LAYOUT_ICONS} />
                  {(vr.layout === 'left' || vr.layout === 'right') && (
                    <SegIcons label="Proporción" value={vr.media_width}
                      onChange={(w) => setVr({ media_width: w as any })} options={WIDTH_ICONS} />
                  )}
                  {(vr.layout === 'top' || vr.layout === 'bottom') && (
                    <SegIcons label="Ajuste" options={FIT_ICONS}
                      value={vr.media_full ? 'full' : vr.media_align === 'center' ? 'center' : 'left'}
                      onChange={(v) => setVr(v === 'full' ? { media_full: true } : { media_full: false, media_align: v as any })} />
                  )}
                  {vr.kind === 'video_youtube' && (
                    <SegIcons label="Formato" value={vr.media_ratio}
                      onChange={(r) => setVr({ media_ratio: r as any })} options={RATIO_ICONS} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {(vr.kind === 'video_file' || vr.kind === 'audio') && (
          <>
            <label className="ed-check">
              <input type="checkbox" checked={vr.has_voice} onChange={(e) => setVr({ has_voice: e.target.checked })} />
              <span>Contiene voz (exige subtítulos VTT)</span>
            </label>
            <div className="ed-options">
              <p className="ed-options-head">Subtítulos / pistas (VTT)</p>
              {vr.tracks.map((t, i) => {
                const updateTrack = (next: typeof t) => setTracks(vr.tracks.map((x, j) => (j === i ? next : x)))
                return (
                  <div key={i} className="ed-option-row ed-config-row">
                    <div className="ed-config-fields">
                      <input style={{ maxWidth: 70 }} value={t.lang} placeholder="es" onChange={(e) => updateTrack({ ...t, lang: e.target.value })} />
                      <input value={t.label} placeholder="Etiqueta (Español)" onChange={(e) => updateTrack({ ...t, label: e.target.value })} />
                      <input value={t.src} placeholder="assets/media/….vtt" onChange={(e) => updateTrack({ ...t, src: e.target.value })} />
                      <FileButton accept=".vtt,text/vtt" label="Subir VTT…" currentPath={t.src}
                        makePath={() => `assets/media/${screen.id}_${t.lang || 'es'}.vtt`} onUploaded={(p) => updateTrack({ ...t, src: p })} />
                    </div>
                    <button type="button" className="ed-icobtn ed-icobtn-danger" onClick={() => setTracks(vr.tracks.filter((_, j) => j !== i))} title="Eliminar subtítulo" aria-label="Eliminar subtítulo"><Icon name="trash" size={13} /></button>
                  </div>
                )
              })}
              <button type="button" onClick={() => setTracks([...vr.tracks, { lang: 'es', label: 'Español', src: '', kind: 'subtitles' }])}><Icon name="plus" size={13} /> Añadir subtítulo</button>
            </div>
          </>
        )}
    </Fold>
  )

  // Sección «Audio de locución y transcripción» (plegada de serie, como antes).
  const audioSection = (
    <Fold summary="Audio de locución y transcripción">
        <div className="ed-row">
          <label className="ed-field">
            <span>Audio de la diapositiva (assets/media/…)</span>
            <input value={screen.audio_src} placeholder="assets/media/s01_narracion.mp3"
              onChange={(e) => patch({ audio_src: e.target.value })} />
          </label>
          <FileButton accept="audio/*" label="Subir audio…" currentPath={screen.audio_src}
            makePath={(ext) => `assets/media/${screen.id}_narracion.${ext}`} onUploaded={(p) => patch({ audio_src: p })} />
          {screen.audio_src && (
            <button type="button" className="ed-danger" onClick={() => patch({ audio_src: '' })}>Quitar</button>
          )}
        </div>
        <label className="ed-field">
          <span>Transcripción (se muestra SOLO con el botón «Transcripción»; alternativa textual del audio)</span>
          <textarea rows={3} value={screen.transcript}
            onChange={(e) => {
              warnAudioStale('Los cambios en la transcripción no se aplican al audio ya asociado: cuando termines de editar, regenera el audio para que vuelvan a corresponderse.')
              patch({ transcript: e.target.value })
            }} />
        </label>
        <label className="ed-check" title="Desactiva el botón «Transcripción» en esta pantalla y la deja fuera de la narración automática en bloque (rellenar transcripciones y generar audios). Los botones de aquí abajo siguen funcionando si quieres hacerlo a mano.">
          <input type="checkbox" checked={screen.transcript_hidden} onChange={(e) => patch({ transcript_hidden: e.target.checked })} />
          <span>Sin transcripción para el alumno (desactiva el botón «Transcripción» en esta pantalla)</span>
        </label>
        {transcriptStale && (
          <p className="ed-hint-warn">
            <Icon name="alert-triangle" size={13} /> El contenido de la pantalla cambió desde que se escribió/regeneró
            esta transcripción: revísala y pulsa «Regenerar» si hace falta.
          </p>
        )}
        <div className="ed-row">
          <button type="button" disabled={ttsBusy}
            onClick={() => void onRebuildTranscript()}
            title="Genera la transcripción a partir del texto del estudiante y las interacciones informativas de la pantalla">
            <Icon name="refresh" size={14} /> {screen.transcript.trim() ? 'Regenerar' : 'Generar'} transcripción desde el contenido
          </button>
          <button type="button" className="ed-primary" disabled={ttsBusy || !screen.transcript.trim()}
            onClick={onGenerateAudio}
            title={screen.transcript.trim() ? 'Genera el audio con voz a partir de la transcripción' : 'Escribe primero una transcripción'}>
            {ttsBusy ? 'Generando…' : <><Icon name="volume" size={14} /> {screen.audio_src ? 'Regenerar' : 'Generar'} audio desde la transcripción</>}
          </button>
          {ttsMsg && <span className="ed-tts-msg">{ttsMsg}</span>}
        </div>
        {audioStale && (
          <p className="ed-hint-warn">
            <Icon name="alert-triangle" size={13} /> La transcripción cambió desde que se generó este audio de locución:
            regenéralo para que vuelvan a corresponderse.
          </p>
        )}
    </Fold>
  )

  return (
    <div className="ed-form">
      {/* Cabecera: el título de la pantalla se edita aquí mismo (clic sobre el
          texto o sobre el lápiz). data-field: diana del foco al crear una
          pantalla desde una receta (AddScreenModal). */}
      <h2 className="ed-form-head">
        <input ref={titleRef} data-field="screen-title" className="ed-title-input"
          value={screen.title} placeholder="(sin título)" aria-label="Título de la pantalla"
          onChange={(e) => patch({ title: e.target.value })} />
        <button type="button" className="ed-title-pencil" title="Editar título" aria-label="Editar título"
          onClick={() => { titleRef.current?.focus(); titleRef.current?.select() }}>
          <Icon name="pencil" size={14} />
        </button>
        <span className="ed-form-type"><Icon name={screenTypeIcon(screen.type)} size={12} color={screenTypeColor(screen.type)} /> {screenTypeLabel(screen.type, { level: coverLevel, module: course.module_label, unit: course.unit_label })}</span>
        <button type="button" className="ed-icobtn ed-export-btn" title="Exportar esta pantalla (u otras) para reutilizarla en otro curso"
          aria-label="Exportar pantallas" onClick={() => setExporting(true)}>
          <Icon name="download" size={15} />
        </button>
      </h2>
      {exporting && <ExportScreensModal initialId={screen.id} onClose={() => setExporting(false)} />}

      {screenIssues.length > 0 && (
        <ul className="ed-inline-issues" aria-label="Avisos de validación de esta pantalla">
          {screenIssues.map((i, n) => (
            <li key={n} className={i.severity === 'error' ? 'is-err' : 'is-warn'}>
              <Icon name={i.severity === 'error' ? 'alert-octagon' : 'alert-triangle'} size={13} /> {i.message}
            </li>
          ))}
        </ul>
      )}

      {/* Portada y resumen están exentas de objetivo (validación): no se muestra */}
      {!uiCfg.hideObjective && (
        <label className="ed-field">
          <span>Objetivo de aprendizaje</span>
          <ObjectiveInput value={screen.objective} onChange={(v) => patch({ objective: v })} />
        </label>
      )}

      {uiCfg.mediaFirst && mediaSection}

      {/* Contenedor <div> (no <label>): un <label> reenviaría los clics de toda el
          área a su primer control —ahora el botón de la barra— disparando su acción. */}
      <div className="ed-field">
        <RichTextArea rows={16} value={screen.student_text}
          onChange={(v) => { warnAudioStale(); patch({ student_text: v }) }} />
      </div>

      {!uiCfg.mediaFirst && mediaSection}

      <Fold key={`it-${id}-${screen.type}`} summary="Interacción"
        defaultOpen={!!it || !!uiCfg.interactionOpen}>
        {!it ? (
          <button onClick={() => setTypePicker('add')}><Icon name="plus" size={13} /> Añadir interacción</button>
        ) : (
          <>
            {/* 1. Cabecera: qué es (el tipo se elige en el selector visual),
                dónde va respecto al texto, y eliminar (discreto, a la derecha). */}
            <div className="ed-it-head">
              <span className="ed-it-type-name">
                <Icon name={itRecipe!.icon} size={15} color={interactionColor(it.type)} /> {interactionTypeLabel(it.type)}
              </span>
              <button type="button" onClick={() => setTypePicker('change')}
                title="Elegir otro tipo de interacción (el contenido compatible se conserva)">
                Cambiar tipo…
              </button>
              <SegIcons label="Posición" value={screen.interaction_layout}
                onChange={(v) => patch({ interaction_layout: v as any })} options={IT_POS_ICONS} />
              <button type="button" className="ed-it-del ed-icobtn ed-icobtn-danger" title="Eliminar interacción"
                aria-label="Eliminar interacción" onClick={() => void onDeleteInteraction()}>
                <Icon name="trash" size={14} />
              </button>
            </div>

            {/* 2. Actividad: el corazón del formulario, siempre visible.
                «Usar texto habitual» rellena con la frase típica del tipo
                (mismo texto que ya trae la interacción recién creada) — para
                cuando el autor lo ha borrado o cambió de tipo sin dejarlo vacío. */}
            <label className="ed-field"><span className="ed-field-label-row">
              Enunciado
              {itRecipe!.defaultPrompt && (
                <button type="button" className="ed-field-default-btn"
                  title="Usar el enunciado habitual para este tipo de interacción"
                  onClick={() => setInteraction({ ...it, prompt: itRecipe!.defaultPrompt! })}>
                  <Icon name="refresh" size={12} /> Usar texto habitual
                </button>
              )}
            </span>
              <input value={it.prompt} onChange={(e) => setInteraction({ ...it, prompt: e.target.value })} /></label>
            <label className="ed-field"><span className="ed-field-label-row">
              Instrucciones
              {itRecipe!.defaultInstructions && (
                <button type="button" className="ed-field-default-btn"
                  title="Usar las instrucciones habituales para este tipo de interacción"
                  onClick={() => setInteraction({ ...it, instructions: itRecipe!.defaultInstructions! })}>
                  <Icon name="refresh" size={12} /> Usar texto habitual
                </button>
              )}
            </span>
              <input value={it.instructions} onChange={(e) => setInteraction({ ...it, instructions: e.target.value })} /></label>

            <InteractionConfigEditor it={it} screenId={id} onChange={setInteraction} />

            {/* 3. Evaluación: solo tipos con corrección real (o si viene puntuando
                de un curso importado, para poder desmarcarlo). Puntos se deshabilita
                mientras no puntúe; al activar Evaluable con 0 puntos se pone 1. */}
            {(itRecipe!.gradable || it.scored) && (
              <Fold key={`ev-${id}-${it.type}`} summary={evalSummary} defaultOpen={it.scored}>
                <div className="ed-row">
                  <label className="ed-check"
                    title={itRecipe!.gradable ? undefined : 'Este tipo es informativo: no tiene corrección y no debería puntuar.'}>
                    <input type="checkbox" checked={it.scored}
                      onChange={(e) => setInteraction({ ...it, scored: e.target.checked, points: e.target.checked && !it.points ? 1 : it.points })} />
                    <span>Evaluable</span>
                  </label>
                  <label className="ed-field ed-field-narrow">
                    <span>Puntos</span>
                    <input type="number" min={0} value={it.points} disabled={!it.scored}
                      title={it.scored ? undefined : 'Marca «Evaluable» para que puntúe'}
                      onChange={(e) => setInteraction({ ...it, points: Number(e.target.value) })} />
                  </label>
                  {itRecipe!.supportsAttempts && (
                    <label className="ed-field ed-field-narrow">
                      <span>Intentos (0=∞)</span>
                      <input type="number" min={0} value={it.attempts}
                        onChange={(e) => setInteraction({ ...it, attempts: Number(e.target.value) })} />
                    </label>
                  )}
                </div>
              </Fold>
            )}

            {/* 4. Feedback, plegado (resumen: personalizado / por defecto). */}
            <Fold key={`fb-${id}-${it.type}`} summary={`Feedback — ${fbCustom ? 'personalizado' : 'por defecto'}`}>
              {(itRecipe!.family === 'options' || itRecipe!.family === 'questions') && (
                <p className="ed-hint">
                  Cada opción puede llevar su propio feedback (se escribe en la propia opción);
                  estos textos son el respaldo general cuando la opción no tiene el suyo.
                </p>
              )}
              {it.type !== 'hotspots' ? (
                <>
                  <label className="ed-field"><span>Feedback acierto</span>
                    <input value={it.feedback.correct} onChange={(e) => setInteraction({ ...it, feedback: { ...it.feedback, correct: e.target.value } })} /></label>
                  <label className="ed-field"><span>Feedback error</span>
                    <input value={it.feedback.incorrect} onChange={(e) => setInteraction({ ...it, feedback: { ...it.feedback, incorrect: e.target.value } })} /></label>
                </>
              ) : (
                <p className="ed-hint">
                  En zonas interactivas el feedback de acierto/error se escribe por zona en el
                  editor visual; aquí solo queda la explicación pedagógica común.
                </p>
              )}
              <div className="ed-field"><span>Explicación pedagógica</span>
                <RichTextArea rows={2} value={it.feedback.explanation} onChange={(v) => setInteraction({ ...it, feedback: { ...it.feedback, explanation: v } })} /></div>
            </Fold>
          </>
        )}
      </Fold>

      {audioSection}

      <Fold summary={screen.frame?.color ? 'Marco de color · ' + (screen.frame.label || screen.frame.color) : 'Marco de color'}>
        <ScreenFrameEditor frame={screen.frame} onChange={(frame) => patch({ frame })} />
      </Fold>

      <Fold summary="Avanzado">
        <div className="ed-row">
          <label className="ed-field">
            <span>Tipo de pantalla</span>
            <select value={screen.type} onChange={(e) => void onChangeScreenType(e.target.value as ScreenType)}>
              {ScreenType.options.map((t) => <option key={t} value={t}>{screenTypeLabel(t, { module: course.module_label, unit: course.unit_label })}</option>)}
            </select>
          </label>
          <label className="ed-field ed-field-narrow">
            <span>Tiempo mín. (s)</span>
            <input type="number" min={0} value={screen.min_time_seconds}
              onChange={(e) => patch({ min_time_seconds: Number(e.target.value) })} />
          </label>
          <label className="ed-check">
            <input type="checkbox" checked={screen.required} onChange={(e) => patch({ required: e.target.checked })} />
            <span>Obligatoria</span>
          </label>
        </div>
      </Fold>

      {screen.source_refs.length > 0 && (
        <div className="ed-sources">
          <p>Trazabilidad (source_refs):</p>
          <ul>{screen.source_refs.map((r, i) => <li key={i}>{r.doc}{r.locator ? ` · ${r.locator}` : ''}{r.transform ? ` · ${r.transform}` : ''}</li>)}</ul>
        </div>
      )}

      <fieldset className="ed-group ed-review-group">
        <legend>Revisión</legend>
        <label className={`ed-review-toggle${screen.review.flagged ? ' is-on' : ''}`}
          title="No se incluye en el paquete SCORM exportado mientras esté marcada">
          <input type="checkbox" checked={screen.review.flagged}
            onChange={(e) => patch({ review: { ...screen.review, flagged: e.target.checked } })} />
          <Icon name="alert-triangle" size={13} /> Pendiente de revisión
        </label>
        {screen.review.flagged && (
          <div className="ed-review-box">
            <textarea className="ed-review-note" rows={2} placeholder="Nota para quien revise (opcional)…"
              aria-label="Nota de revisión"
              value={screen.review.note}
              onChange={(e) => patch({ review: { ...screen.review, note: e.target.value } })} />
            <p className="ed-hint">
              Se ve en Vista estudiante con borde rojo, pero <strong>no se incluye en el paquete SCORM
              exportado</strong> mientras esté marcada.
            </p>
          </div>
        )}
      </fieldset>

      {typePicker && (
        <InteractionTypeModal
          current={typePicker === 'change' ? it?.type : undefined}
          recommended={uiCfg.recommended}
          onPick={(t) =>
            typePicker === 'add' ? setInteraction(blankInteraction(t)) : void onChangeInteractionType(t)
          }
          onClose={() => setTypePicker(null)}
        />
      )}
    </div>
  )
}
