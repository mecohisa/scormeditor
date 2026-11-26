import { useRef, useState } from 'react'
import type { Interaction, InteractionOption } from '../schema/course.schema'
import { useCourseStore } from '../store/courseStore'
import { RichTextArea } from './RichTextArea'
import { FileButton } from './FileButton'
import { HotspotZonesModal, type HotspotSpot } from './HotspotZonesModal'
import { ListEditor } from './ListEditor'
import { SegIcons } from './SegIcons'
import { Icon } from './Icon'
import { generateForItem, hasApiKey } from '../tts/tts'
import { computeResults, type CalcResult, type CalcVariable } from '../calc/formula'

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7)}`

/** Primera línea de un texto en markdown ligero, sin marcas (resúmenes de listas plegadas). */
const plainLine = (s: string) => (s || '').split('\n').find((l) => l.trim())?.replace(/[*#>]/g, '').trim() ?? ''

type StepItem = { id: string; text: string; options: { id: string; text: string; correct?: boolean; feedback?: string }[] }
type TreeNode = {
  id: string
  speaker?: string
  text: string
  choices?: { id: string; text: string; to: string }[]
  outcome?: 'good' | 'bad' | 'neutral'
  feedback?: string
}

/** Ítem narrable (accordion/tabs/flip_cards/timeline/image_cards/flashcards):
 *  botón para generar/regenerar el audio de UN ítem a partir de su propio
 *  texto visible (sin transcripción de ítem aparte). Si el ítem aún no tiene
 *  `id` estable (proyectos antiguos/importados del GPT), se lo asigna en el
 *  momento — el runtime y `tts.ts` lo necesitan para anclar el `audio_src`.
 */
function ItemAudioButton({
  screenId,
  interactionId,
  audioSrc,
  ensureId,
}: {
  screenId: string
  interactionId: string
  audioSrc?: string
  ensureId: () => string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function onClick() {
    setErr(null)
    if (!hasApiKey()) { setErr('Falta la clave de API (Ajustes → Narración).'); return }
    setBusy(true)
    try {
      await generateForItem(screenId, interactionId, ensureId())
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className="ed-row">
      <button type="button" onClick={onClick} disabled={busy}>
        {busy ? 'Generando…' : audioSrc ? '🔊 Regenerar audio' : '🔊 Generar audio'}
      </button>
      {err && <span className="ed-tts-msg">{err}</span>}
    </span>
  )
}

/** Genera de una vez los audios pendientes de todos los ítems de la
 *  interacción (los que ya tienen audio se saltan). */
function BulkItemAudioButton({
  screenId,
  interactionId,
  items,
  ensureIds,
}: {
  screenId: string
  interactionId: string
  items: { id?: string; audio_src?: string }[]
  ensureIds: () => { id: string; audio_src?: string }[]
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (!items.length) return null
  const missing = items.filter((x) => !x.audio_src).length
  async function onClick() {
    setMsg(null)
    if (!hasApiKey()) { setMsg('Falta la clave de API (Ajustes → Narración).'); return }
    setBusy(true)
    try {
      const withIds = ensureIds()
      let done = 0
      for (const x of withIds) {
        if (x.audio_src) continue
        await generateForItem(screenId, interactionId, x.id)
        done++
      }
      setMsg(done ? `✓ ${done} audio(s) generado(s).` : 'Ya estaban todos generados.')
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="ed-row">
      <button type="button" onClick={onClick} disabled={busy || missing === 0}>
        {busy ? 'Generando…' : `🔊 Generar audios de ítem pendientes (${missing})`}
      </button>
      {msg && <span className="ed-tts-msg">{msg}</span>}
    </div>
  )
}

/**
 * Editor de la parte específica (`config` / `options`) de cada tipo de
 * interacción. Se monta dentro del editor de pantalla.
 */
export function InteractionConfigEditor({
  it,
  screenId,
  onChange,
}: {
  it: Interaction
  screenId: string
  onChange: (next: Interaction) => void
}) {
  const cfg: Record<string, any> = it.config || {}
  const setConfig = (patch: Record<string, any>) => onChange({ ...it, config: { ...cfg, ...patch } })
  // «Forzar completado» (match_pairs, classification, crossword): marcada = Comprobar
  // solo se activa con todo hecho (comportamiento de siempre; también el de los
  // proyectos antiguos, donde la clave no existe); desmarcada = se puede comprobar
  // con respuestas parciales (lo que falte cuenta como fallo). Las nuevas nacen
  // desmarcadas (`force_complete: false` en el seed).
  const forceCompleteToggle = (todo: string) => (
    <label className="ed-check" title="Si la dejas desmarcada, el alumno puede pulsar Comprobar sin haber completado la actividad: lo que falte cuenta como fallo. Siempre tiene que pulsar Comprobar.">
      <input type="checkbox" checked={cfg.force_complete !== false}
        onChange={(e) => setConfig({ force_complete: e.target.checked ? undefined : false })} />
      <span>Forzar completado (Comprobar solo se activa cuando se ha {todo})</span>
    </label>
  )
  const setOptions = (options: InteractionOption[]) => onChange({ ...it, options })
  // Modal del editor visual de zonas (solo lo usa el caso `hotspots`; el hook
  // vive aquí porque dentro del switch no puede haber hooks).
  const [zonesOpen, setZonesOpen] = useState(false)
  // Imágenes subidas para el HTML a medida (solo lo usa `html_embed`, mismo
  // motivo que `zonesOpen`): refs a los tres textareas (para reenfocar y
  // mover el cursor tras insertar) y el último campo/posición donde escribió
  // el autor (para saber dónde insertar la ruta al pulsar «Copiar»).
  const embedHtmlRef = useRef<HTMLTextAreaElement>(null)
  const embedCssRef = useRef<HTMLTextAreaElement>(null)
  const embedJsRef = useRef<HTMLTextAreaElement>(null)
  const embedCursorRef = useRef<{ field: 'html' | 'css' | 'js'; pos: number }>({ field: 'html', pos: 0 })
  const removeAsset = useCourseStore((s) => s.removeAsset)

  switch (it.type) {
    // ---- Elección simple / Verdadero-Falso --------------------------------
    case 'single_choice':
    case 'true_false':
      return (
        <ListEditor
          title="Opciones de respuesta"
          items={it.options}
          onChange={(options) => setOptions(options as InteractionOption[])}
          create={() => ({ id: rid('o'), text: '', correct: false })}
          render={(o, update) => (
            <>
              <input value={o.text} placeholder="Texto de la opción" onChange={(e) => update({ ...o, text: e.target.value })} />
              <label className="ed-check" title="Puede haber varias correctas: cualquiera de ellas cuenta como acierto (en el test final, en cambio, solo hay una)"><input type="checkbox" checked={!!o.correct} onChange={(e) => update({ ...o, correct: e.target.checked })} /><span>Correcta</span></label>
              <input value={o.feedback || ''} placeholder="Feedback de esta opción (opcional)" onChange={(e) => update({ ...o, feedback: e.target.value })} />
            </>
          )}
        />
      )

    // ---- Escenario con decisión -------------------------------------------
    case 'scenario_decision':
      return (
        <>
          <div className="ed-field"><span>Escenario / caso</span>
            <RichTextArea rows={3} value={cfg.scenario || ''} onChange={(v) => setConfig({ scenario: v })} /></div>
          <ListEditor
            title="Opciones de decisión"
            items={it.options}
            onChange={(options) => setOptions(options as InteractionOption[])}
            create={() => ({ id: rid('o'), text: '', correct: false, feedback: '' })}
            render={(o, update) => (
              <>
                <input value={o.text} placeholder="Texto de la decisión" onChange={(e) => update({ ...o, text: e.target.value })} />
                <label className="ed-check" title="Puede haber varias correctas: cualquiera de ellas cuenta como acierto (en el test final, en cambio, solo hay una)"><input type="checkbox" checked={!!o.correct} onChange={(e) => update({ ...o, correct: e.target.checked })} /><span>Correcta</span></label>
                <input value={o.feedback || ''} placeholder="Feedback de esta decisión" onChange={(e) => update({ ...o, feedback: e.target.value })} />
              </>
            )}
          />
        </>
      )

    // ---- Clasificación / Emparejamiento (grupos + ítems) ------------------
    case 'classification':
    case 'match_pairs': {
      const groups: { id: string; label: string }[] = cfg.groups || []
      return (
        <>
          {forceCompleteToggle('colocado todo')}
          <ListEditor
            title="Categorías / grupos"
            items={groups}
            onChange={(g) => setConfig({ groups: g })}
            create={() => ({ id: rid('g'), label: '' })}
            render={(g, update) => (
              <input value={g.label} placeholder="Etiqueta de la categoría" onChange={(e) => update({ ...g, label: e.target.value })} />
            )}
          />
          <ListEditor
            title="Elementos a clasificar"
            items={it.options}
            onChange={(options) => setOptions(options as InteractionOption[])}
            create={() => ({ id: rid('o'), text: '', group: groups[0]?.id || '' })}
            render={(o, update) => (
              <>
                <input value={o.text} placeholder="Texto del elemento" onChange={(e) => update({ ...o, text: e.target.value })} />
                <select value={o.group || ''} onChange={(e) => update({ ...o, group: e.target.value })}>
                  <option value="">— categoría correcta —</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.label || g.id}</option>)}
                </select>
              </>
            )}
          />
        </>
      )
    }

    // ---- Ordenar pasos -----------------------------------------------------
    case 'sort_steps': {
      type SortStep = { id: string; text: string; order: number; explanation?: string }
      const steps: SortStep[] = cfg.steps || []
      // El orden correcto es la posición actual en la lista (1..n)
      const commit = (next: any[]) => setConfig({ steps: next.map((s, i) => ({ ...s, order: i + 1 })) })
      return (
        <ListEditor<SortStep>
          title="Pasos (en el ORDEN CORRECTO; se barajan en el SCORM)"
          items={steps}
          onChange={commit}
          create={() => ({ id: rid('p'), text: '', order: steps.length + 1 })}
          render={(s, update) => (
            <div className="ed-stack">
              <input value={s.text} placeholder="Texto del paso" onChange={(e) => update({ ...s, text: e.target.value })} />
              <input value={s.explanation || ''} placeholder="Por qué va en esta posición (opcional; el alumno lo ve al resolver)"
                onChange={(e) => update({ ...s, explanation: e.target.value })} />
            </div>
          )}
        />
      )
    }

    // ---- Acordeón / Pestañas (título + cuerpo) ----------------------------
    case 'accordion':
    case 'tabs': {
      const items: { title: string; body: string; id?: string; audio_src?: string }[] = cfg.items || []
      const ensureIds = () => {
        const withIds = items.map((x) => (x.id ? x : { ...x, id: rid('it') }))
        if (withIds.some((x, i) => x.id !== items[i]?.id)) setConfig({ items: withIds })
        return withIds as { id: string; audio_src?: string }[]
      }
      return (
        <>
          <ListEditor
            title={it.type === 'tabs' ? 'Pestañas' : 'Apartados del acordeón'}
            items={items}
            onChange={(next) => setConfig({ items: next })}
            summary={(item) => item.title.trim() || '(sin título)'}
            create={() => ({ id: rid('it'), title: '', body: '' })}
            render={(item, update) => (
              <div className="ed-stack">
                <input value={item.title} placeholder="Título" onChange={(e) => update({ ...item, title: e.target.value })} />
                <RichTextArea rows={2} value={item.body} onChange={(v) => update({ ...item, body: v })} />
                <ItemAudioButton
                  screenId={screenId}
                  interactionId={it.id}
                  audioSrc={item.audio_src}
                  ensureId={() => { if (item.id) return item.id; const id = rid('it'); update({ ...item, id }); return id }}
                />
              </div>
            )}
          />
          <BulkItemAudioButton screenId={screenId} interactionId={it.id} items={items} ensureIds={ensureIds} />
        </>
      )
    }

    // ---- Flip cards --------------------------------------------------------
    case 'flip_cards': {
      const cards: { front: string; back: string; id?: string; audio_src?: string }[] = cfg.cards || []
      const ensureIds = () => {
        const withIds = cards.map((x) => (x.id ? x : { ...x, id: rid('cd') }))
        if (withIds.some((x, i) => x.id !== cards[i]?.id)) setConfig({ cards: withIds })
        return withIds as { id: string; audio_src?: string }[]
      }
      return (
        <>
          <ListEditor
            title="Tarjetas"
            items={cards}
            onChange={(next) => setConfig({ cards: next })}
            create={() => ({ id: rid('cd'), front: '', back: '' })}
            render={(c, update) => (
              <div className="ed-stack">
                <RichTextArea rows={1} value={c.front} onChange={(v) => update({ ...c, front: v })} />
                <RichTextArea rows={1} value={c.back} onChange={(v) => update({ ...c, back: v })} />
                <ItemAudioButton
                  screenId={screenId}
                  interactionId={it.id}
                  audioSrc={c.audio_src}
                  ensureId={() => { if (c.id) return c.id; const id = rid('cd'); update({ ...c, id }); return id }}
                />
              </div>
            )}
          />
          <BulkItemAudioButton screenId={screenId} interactionId={it.id} items={cards} ensureIds={ensureIds} />
        </>
      )
    }

    // ---- Práctica de caso (rúbrica) ---------------------------------------
    case 'case_practice': {
      const rubric: { label: string }[] = cfg.rubric || []
      return (
        <ListEditor
          title="Rúbrica de autoevaluación (opcional)"
          items={rubric}
          onChange={(next) => setConfig({ rubric: next })}
          create={() => ({ label: '' })}
          render={(r, update) => (
            <input value={r.label} placeholder="Criterio de la rúbrica" onChange={(e) => update({ ...r, label: e.target.value })} />
          )}
        />
      )
    }

    // ---- Vídeo (con preguntas opcionales en timestamps) ---------------------
    case 'video': {
      const questions: QItem[] = cfg.questions || []
      return (
        <div className="ed-stack">
          <label className="ed-field"><span>ID de YouTube (o deja vacío y usa archivo)</span>
            <input value={cfg.youtube || ''} onChange={(e) => setConfig({ youtube: e.target.value })} /></label>
          <label className="ed-field"><span>Ruta de vídeo propio (assets/media/…)</span>
            <input value={cfg.src || ''} onChange={(e) => setConfig({ src: e.target.value })} /></label>
          <label className="ed-field"><span>Transcripción</span>
            <textarea rows={3} value={cfg.transcript || ''} onChange={(e) => setConfig({ transcript: e.target.value })} /></label>
          {String(cfg.src || '').trim() !== '' && (() => {
            // Subtítulos del vídeo propio: mismas pistas VTT que el recurso visual
            // (`config.tracks`, ya las pinta la carcasa) y la misma casilla «con voz»
            // (`config.has_voice`, solo del editor: activa MEDIA_NO_SUBS). Opcionales:
            // sin ellas el comportamiento es el de siempre.
            type Track = { lang: string; label: string; src: string; kind: 'subtitles' | 'captions' }
            const tracks: Track[] = cfg.tracks || []
            const setTracks = (next: Track[]) => setConfig({ tracks: next })
            return (
              <>
                <label className="ed-check">
                  <input type="checkbox" checked={!!cfg.has_voice} onChange={(e) => setConfig({ has_voice: e.target.checked })} />
                  <span>Contiene voz (exige subtítulos VTT)</span>
                </label>
                <div className="ed-options">
                  <p className="ed-options-head">Subtítulos / pistas (VTT)</p>
                  {tracks.map((t, i) => {
                    const updateTrack = (next: Track) => setTracks(tracks.map((x, j) => (j === i ? next : x)))
                    return (
                      <div key={i} className="ed-option-row ed-config-row">
                        <div className="ed-config-fields">
                          <input style={{ maxWidth: 70 }} value={t.lang} placeholder="es" aria-label="Idioma" onChange={(e) => updateTrack({ ...t, lang: e.target.value })} />
                          <input value={t.label} placeholder="Etiqueta (Español)" aria-label="Etiqueta" onChange={(e) => updateTrack({ ...t, label: e.target.value })} />
                          <input value={t.src} placeholder="assets/media/….vtt" aria-label="Ruta del VTT" onChange={(e) => updateTrack({ ...t, src: e.target.value })} />
                          <FileButton accept=".vtt,text/vtt" label="Subir VTT…" currentPath={t.src}
                            makePath={() => `assets/media/${it.id}_${t.lang || 'es'}.vtt`} onUploaded={(p) => updateTrack({ ...t, src: p })} />
                        </div>
                        <button type="button" className="ed-icobtn ed-icobtn-danger" onClick={() => setTracks(tracks.filter((_, j) => j !== i))} title="Eliminar subtítulo" aria-label="Eliminar subtítulo"><Icon name="trash" size={13} /></button>
                      </div>
                    )
                  })}
                  <button type="button" onClick={() => setTracks([...tracks, { lang: 'es', label: 'Español', src: '', kind: 'subtitles' }])}><Icon name="plus" size={13} /> Añadir subtítulo</button>
                </div>
              </>
            )
          })()}
          <QuestionListEditor
            title="Preguntas del vídeo (pausan la reproducción en su segundo)"
            withTime
            questions={questions}
            onChange={(next) => setConfig({ questions: next })}
          />
          {questions.length > 0 && (
            <p className="ed-hint">
              Con preguntas, la actividad se completa al responderlas todas y puede puntuar
              (cada acierto suma su parte). Una pregunta por segundo indicado; el alumno tiene
              un intento por pregunta.
            </p>
          )}
        </div>
      )
    }

    // ---- Hotspots ----------------------------------------------------------
    case 'hotspots': {
      const spots: any[] = cfg.spots || []
      return (
        <>
          <div className="ed-row">
            <label className="ed-field"><span>Imagen (assets/img/…)</span>
              <input value={cfg.image || ''} onChange={(e) => setConfig({ image: e.target.value })} /></label>
            <FileButton accept="image/*" label="Subir imagen…" currentPath={cfg.image || undefined}
              makePath={(ext) => `assets/img/${it.id}-img.${ext}`}
              onUploaded={(path) => setConfig({ image: path })} />
          </div>
          <label className="ed-field"><span>Texto alternativo de la imagen</span>
            <input value={cfg.alt || ''} onChange={(e) => setConfig({ alt: e.target.value })} /></label>
          <button className="ed-hz-open" onClick={() => setZonesOpen(true)} disabled={!cfg.image}>
            <Icon name="hotspot" size={14} /> Editar zonas sobre la imagen…
          </button>
          {!cfg.image && <p className="ed-hint">Sube o indica la imagen para poder dibujar las zonas visualmente.</p>}
          {zonesOpen && (
            <HotspotZonesModal
              image={cfg.image || ''}
              alt={cfg.alt || ''}
              initialSpots={spots as HotspotSpot[]}
              onSave={(next) => setConfig({ spots: next })}
              onClose={() => setZonesOpen(false)}
            />
          )}
          {spots.length > 0 && (
            <p className="ed-hint">
              {spots.length === 1 ? '1 zona definida' : `${spots.length} zonas definidas`}
              {spots.some((s) => s.correct) ? ` · correcta: «${spots.find((s) => s.correct)?.label || 'sin etiqueta'}»` : ' · ninguna marcada como correcta'}
            </p>
          )}
          {spots.length > 0 && (
            <div className="ed-stack">
              <p className="ed-hint">Audio por zona (suena al pulsarla en Vista estudiante, no antes):</p>
              {spots.map((s, i) => (
                <div key={s.id || i} className="ed-row">
                  <span>{s.label || `Zona ${i + 1}`}</span>
                  <ItemAudioButton
                    screenId={screenId}
                    interactionId={it.id}
                    audioSrc={s.audio_src}
                    ensureId={() => {
                      if (s.id) return s.id
                      const id = rid('sp')
                      setConfig({ spots: spots.map((x, j) => (j === i ? { ...x, id } : x)) })
                      return id
                    }}
                  />
                </div>
              ))}
              <BulkItemAudioButton
                screenId={screenId}
                interactionId={it.id}
                items={spots}
                ensureIds={() => {
                  const withIds = spots.map((x) => (x.id ? x : { ...x, id: rid('sp') }))
                  if (withIds.some((x, i) => x.id !== spots[i]?.id)) setConfig({ spots: withIds })
                  return withIds as { id: string; audio_src?: string }[]
                }}
              />
            </div>
          )}
        </>
      )
    }

    // ---- Rellenar huecos ---------------------------------------------------
    case 'fill_blanks': {
      const distractors: string[] = cfg.distractors || []
      // Preview trivial de los huecos: pares texto/hueco por split del [[...]].
      const fbText: string = cfg.text || ''
      const fbParts = fbText.split(/\[\[(.+?)\]\]/g)
      const fbBlanks = (fbParts.length - 1) / 2
      const fbTyped = cfg.mode === 'type'
      return (
        <>
          <label className="ed-field"><span>El alumno responde…</span>
            <select value={fbTyped ? 'type' : 'select'} onChange={(e) => setConfig({ mode: e.target.value === 'type' ? 'type' : undefined })}>
              <option value="select">Eligiendo en un desplegable (respuestas + distractores)</option>
              <option value="type">Escribiendo la respuesta (admite alternativas)</option>
            </select>
          </label>
          <label className="ed-field">
            <span>
              Texto con huecos — escribe la respuesta correcta entre dobles corchetes: [[respuesta]]
              {fbTyped && '. Si vale más de una, sepáralas con barras: [[Moodle|campus]]'}
            </span>
            <textarea rows={4} value={fbText}
              placeholder="El SCORM exportado se sube a [[Moodle]] como paquete [[ZIP]]."
              onChange={(e) => setConfig({ text: e.target.value })} />
          </label>
          {fbText.trim() !== '' && (
            <>
              <div className="ed-fb-preview" aria-label="Vista previa de los huecos">
                {fbParts.map((p, i) => (i % 2 ? <mark key={i}>{fbTyped ? p.split('|').map((x) => x.trim()).join(' / ') : p}</mark> : <span key={i}>{p}</span>))}
              </div>
              <p className="ed-hint">
                {fbBlanks === 1 ? '1 hueco' : `${fbBlanks} huecos`}
                {fbTyped
                  ? ' · al corregir no cuentan mayúsculas, tildes ni espacios de más'
                  : ` · ${distractors.length === 1 ? '1 distractor' : `${distractors.length} distractores`}`}
                {fbBlanks === 0 && ' — escribe al menos un [[hueco]] para que haya ejercicio.'}
              </p>
            </>
          )}
          {!fbTyped && <ListEditor
            title="Distractores (opciones falsas añadidas a los desplegables; opcional)"
            items={distractors.map((t) => ({ text: t }))}
            onChange={(next) => setConfig({ distractors: next.map((d) => d.text) })}
            create={() => ({ text: '' })}
            render={(d, update) => (
              <input value={d.text} placeholder="Opción falsa" onChange={(e) => update({ text: e.target.value })} />
            )}
          />}
        </>
      )
    }

    // ---- Línea de tiempo ---------------------------------------------------
    case 'timeline': {
      const milestones: { label: string; title: string; body: string; id?: string; audio_src?: string }[] = cfg.milestones || []
      const ensureIds = () => {
        const withIds = milestones.map((x) => (x.id ? x : { ...x, id: rid('ms') }))
        if (withIds.some((x, i) => x.id !== milestones[i]?.id)) setConfig({ milestones: withIds })
        return withIds as { id: string; audio_src?: string }[]
      }
      return (
        <>
          <ListEditor
            title="Hitos de la línea de tiempo (en orden)"
            items={milestones}
            onChange={(next) => setConfig({ milestones: next })}
            summary={(mi) => [mi.label.trim(), mi.title.trim()].filter(Boolean).join(' · ') || '(sin hito)'}
            create={() => ({ id: rid('ms'), label: '', title: '', body: '' })}
            render={(mi, update) => (
              <div className="ed-stack">
                <div className="ed-row">
                  <input style={{ maxWidth: 160 }} value={mi.label} placeholder="Fecha / fase (p. ej. 1995)"
                    onChange={(e) => update({ ...mi, label: e.target.value })} />
                  <input value={mi.title} placeholder="Título del hito" onChange={(e) => update({ ...mi, title: e.target.value })} />
                </div>
                <RichTextArea rows={2} value={mi.body} onChange={(v) => update({ ...mi, body: v })} />
                <ItemAudioButton
                  screenId={screenId}
                  interactionId={it.id}
                  audioSrc={mi.audio_src}
                  ensureId={() => { if (mi.id) return mi.id; const id = rid('ms'); update({ ...mi, id }); return id }}
                />
              </div>
            )}
          />
          <BulkItemAudioButton screenId={screenId} interactionId={it.id} items={milestones} ensureIds={ensureIds} />
        </>
      )
    }

    // ---- Tarjetas de repaso (flashcards) ------------------------------------
    case 'flashcards': {
      const cards: { front: string; back: string; id?: string; audio_src?: string }[] = cfg.cards || []
      const ensureIds = () => {
        const withIds = cards.map((x) => (x.id ? x : { ...x, id: rid('cd') }))
        if (withIds.some((x, i) => x.id !== cards[i]?.id)) setConfig({ cards: withIds })
        return withIds as { id: string; audio_src?: string }[]
      }
      return (
        <>
          <ListEditor
            title="Tarjetas de repaso (pregunta / respuesta)"
            items={cards}
            onChange={(next) => setConfig({ cards: next })}
            create={() => ({ id: rid('cd'), front: '', back: '' })}
            render={(c, update) => (
              <div className="ed-stack">
                <RichTextArea rows={1} value={c.front} onChange={(v) => update({ ...c, front: v })} />
                <RichTextArea rows={1} value={c.back} onChange={(v) => update({ ...c, back: v })} />
                <ItemAudioButton
                  screenId={screenId}
                  interactionId={it.id}
                  audioSrc={c.audio_src}
                  ensureId={() => { if (c.id) return c.id; const id = rid('cd'); update({ ...c, id }); return id }}
                />
              </div>
            )}
          />
          <BulkItemAudioButton screenId={screenId} interactionId={it.id} items={cards} ensureIds={ensureIds} />
        </>
      )
    }

    // ---- Tarjetas de imagen (modal texto + imagen) --------------------------
    case 'image_cards': {
      const cards: { image: string; alt: string; title: string; text: string; id?: string; audio_src?: string }[] = cfg.cards || []
      const ensureIds = () => {
        const withIds = cards.map((x) => (x.id ? x : { ...x, id: rid('cd') }))
        if (withIds.some((x, i) => x.id !== cards[i]?.id)) setConfig({ cards: withIds })
        return withIds as { id: string; audio_src?: string }[]
      }
      return (
        <>
          <label className="ed-check" title="Si la desmarcas, la tarjeta solo muestra el título (aspecto de tarjeta giratoria) y la imagen se ve únicamente al abrir la ventana">
            <input type="checkbox" checked={cfg.show_cover_image !== false}
              onChange={(e) => setConfig({ show_cover_image: e.target.checked ? undefined : false })} />
            <span>Mostrar la imagen en la portada de la tarjeta</span>
          </label>
          <ListEditor
            title="Tarjetas con imagen (clic → ventana con texto a la izquierda e imagen a la derecha)"
            items={cards}
            onChange={(next) => setConfig({ cards: next })}
            summary={(c) => c.title.trim() || c.alt.trim() || '(sin título)'}
            create={() => ({ id: rid('cd'), image: '', alt: '', title: '', text: '' })}
            render={(c, update) => (
              <div className="ed-stack">
                <div className="ed-row">
                  <input value={c.image} placeholder="Imagen (assets/img/…)"
                    onChange={(e) => update({ ...c, image: e.target.value })} />
                  <FileButton accept="image/*" label="Subir imagen…" currentPath={c.image || undefined}
                    makePath={(ext) => `assets/img/${it.id}-${rid('c')}.${ext}`}
                    onUploaded={(p) => update({ ...c, image: p })} />
                </div>
                <input value={c.alt} placeholder="Texto alternativo de la imagen (obligatorio)"
                  onChange={(e) => update({ ...c, alt: e.target.value })} />
                <input value={c.title} placeholder="Título de la tarjeta"
                  onChange={(e) => update({ ...c, title: e.target.value })} />
                <RichTextArea rows={3} value={c.text} onChange={(v) => update({ ...c, text: v })} />
                <ItemAudioButton
                  screenId={screenId}
                  interactionId={it.id}
                  audioSrc={c.audio_src}
                  ensureId={() => { if (c.id) return c.id; const id = rid('cd'); update({ ...c, id }); return id }}
                />
              </div>
            )}
          />
          <BulkItemAudioButton screenId={screenId} interactionId={it.id} items={cards} ensureIds={ensureIds} />
        </>
      )
    }

    // ---- Antes / después (comparador de imágenes) ----------------------------
    case 'before_after': {
      const side = (key: 'before' | 'after', title: string, defLabel: string) => (
        <div className="ed-stack">
          <p className="ed-options-head">{title}</p>
          <div className="ed-row">
            <input value={cfg[`${key}_image`] || ''} placeholder="Imagen (assets/img/…)"
              onChange={(e) => setConfig({ [`${key}_image`]: e.target.value })} />
            <FileButton accept="image/*" label="Subir imagen…" currentPath={cfg[`${key}_image`] || undefined}
              makePath={(ext) => `assets/img/${it.id}-${key}.${ext}`}
              onUploaded={(p) => setConfig({ [`${key}_image`]: p })} />
          </div>
          <input value={cfg[`${key}_alt`] || ''} placeholder="Texto alternativo (obligatorio)"
            onChange={(e) => setConfig({ [`${key}_alt`]: e.target.value })} />
          <input value={cfg[`${key}_label`] || ''} placeholder={`Etiqueta sobre la imagen (por defecto «${defLabel}»)`}
            onChange={(e) => setConfig({ [`${key}_label`]: e.target.value })} />
        </div>
      )
      return (
        <>
          <p className="ed-hint">
            Las dos imágenes se superponen y el alumno desliza el divisor para compararlas.
            Funcionan mejor si tienen las mismas dimensiones.
          </p>
          {side('before', 'Imagen «antes» (izquierda)', 'Antes')}
          {side('after', 'Imagen «después» (derecha)', 'Después')}
        </>
      )
    }

    // ---- Sopa de letras ------------------------------------------------------
    case 'word_search': {
      const words: string[] = cfg.words || []
      return (
        <>
          <ListEditor
            title="Palabras a encontrar (3–12 letras; acentos y espacios se ignoran en el tablero)"
            items={words.map((t) => ({ text: t }))}
            onChange={(next) => setConfig({ words: next.map((w) => w.text) })}
            create={() => ({ text: '' })}
            render={(w, update) => (
              <input value={w.text} placeholder="Palabra" onChange={(e) => update({ text: e.target.value })} />
            )}
          />
          <p className="ed-hint">
            El tablero se genera solo. El alumno toca la primera y la última letra de cada
            palabra; se valida al momento, sin botón Comprobar.
          </p>
        </>
      )
    }

    // ---- Crucigrama ----------------------------------------------------------
    case 'crossword': {
      const entries: { word: string; clue: string }[] = cfg.entries || []
      return (
        <>
          {forceCompleteToggle('rellenado todas las casillas')}
          <ListEditor
            title="Palabras y pistas (3–12 letras; el crucigrama se monta solo con los cruces posibles)"
            items={entries}
            onChange={(next) => setConfig({ entries: next })}
            create={() => ({ word: '', clue: '' })}
            render={(en, update) => (
              <>
                <input style={{ maxWidth: 160 }} value={en.word} placeholder="Palabra"
                  onChange={(e) => update({ ...en, word: e.target.value })} />
                <input value={en.clue} placeholder="Pista / definición"
                  onChange={(e) => update({ ...en, clue: e.target.value })} />
              </>
            )}
          />
          <p className="ed-hint">
            Una palabra que no cruce con ninguna otra se descarta del tablero. Conviene que
            compartan letras entre sí.
          </p>
        </>
      )
    }

    // ---- Imagen oculta ---------------------------------------------------------
    case 'hidden_image': {
      const hiQuestions: QItem[] = cfg.questions || []
      return (
        <>
          <div className="ed-row">
            <input value={cfg.image || ''} placeholder="Imagen a desvelar (assets/img/…)"
              onChange={(e) => setConfig({ image: e.target.value })} />
            <FileButton accept="image/*" label="Subir imagen…" currentPath={cfg.image || undefined}
              makePath={(ext) => `assets/img/${it.id}-hi.${ext}`}
              onUploaded={(p) => setConfig({ image: p })} />
          </div>
          <input value={cfg.alt || ''} placeholder="Texto alternativo de la imagen (obligatorio)"
            onChange={(e) => setConfig({ alt: e.target.value })} />
          <QuestionListEditor
            title="Preguntas (cada acierto destapa parte de la imagen; un intento por pregunta)"
            questions={hiQuestions}
            onChange={(next) => setConfig({ questions: next })}
          />
        </>
      )
    }

    // ---- Rosco A-Z (pasapalabra) ------------------------------------------------
    case 'az_quiz': {
      const azItems: { clue: string; answer: string }[] = cfg.items || []
      const letterOf = (answer: string) =>
        (answer || '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0) || '?'
      return (
        <>
          <ListEditor
            title="Definiciones del rosco (la letra es la inicial de la respuesta)"
            items={azItems}
            onChange={(next) => setConfig({ items: next })}
            summary={(q) => `${letterOf(q.answer)} · ${q.clue.trim() || '(sin pista)'}`}
            create={() => ({ clue: '', answer: '' })}
            render={(q, update) => (
              <>
                <span className="ed-az-letter">{letterOf(q.answer)}</span>
                <input value={q.clue} placeholder="Definición / pista"
                  onChange={(e) => update({ ...q, clue: e.target.value })} />
                <input style={{ maxWidth: 180 }} value={q.answer} placeholder="Respuesta"
                  onChange={(e) => update({ ...q, answer: e.target.value })} />
              </>
            )}
          />
          <p className="ed-hint">
            El alumno escribe la respuesta o pasa palabra (la letra vuelve en la siguiente
            vuelta). Mayúsculas, acentos y espacios extra no cuentan al corregir.
          </p>
        </>
      )
    }

    // ---- Caso por decisiones -------------------------------------------------------
    case 'scenario_steps': {
      const steps: StepItem[] = cfg.steps || []
      return (
        <>
          <div className="ed-field"><span>Planteamiento del caso (opcional; se ve encima de todas las decisiones)</span>
            <RichTextArea rows={3} value={cfg.scenario || ''} onChange={(v) => setConfig({ scenario: v })} /></div>
          <ListEditor
            title="Decisiones (en orden; el alumno las ve una a una y responde una vez cada una)"
            items={steps}
            onChange={(next) => setConfig({ steps: next })}
            summary={(s) => plainLine(s.text) || '(sin situación)'}
            create={(): StepItem => ({ id: rid('st'), text: '', options: [{ id: rid('o'), text: '', correct: true }, { id: rid('o'), text: '' }] })}
            clone={(s) => ({ ...s, id: rid('st'), options: s.options.map((o) => ({ ...o, id: rid('o') })) })}
            render={(s, update) => (
              <div className="ed-stack">
                <div className="ed-field"><span>Situación o pregunta de este paso</span>
                  <RichTextArea rows={2} value={s.text} onChange={(v) => update({ ...s, text: v })} /></div>
                <ListEditor<StepItem['options'][number]>
                  title="Opciones"
                  items={s.options}
                  onChange={(options) => update({ ...s, options })}
                  create={() => ({ id: rid('o'), text: '', correct: false, feedback: '' })}
                  render={(o, upd) => (
                    <>
                      <input value={o.text} placeholder="Texto de la opción" onChange={(e) => upd({ ...o, text: e.target.value })} />
                      <label className="ed-check" title="Puede haber varias correctas en un paso"><input type="checkbox" checked={!!o.correct} onChange={(e) => upd({ ...o, correct: e.target.checked })} /><span>Correcta</span></label>
                      <input value={o.feedback || ''} placeholder="Comentario al elegirla" onChange={(e) => upd({ ...o, feedback: e.target.value })} />
                    </>
                  )}
                />
              </div>
            )}
          />
          <p className="ed-hint">
            Si puntúa, la nota es proporcional a las decisiones acertadas. Sin nota, el alumno puede repetir el caso.
          </p>
        </>
      )
    }

    // ---- Conversación ramificada ---------------------------------------------------
    case 'decision_tree': {
      const chars: { id: string; name: string; role?: string }[] = cfg.characters || []
      const nodes: TreeNode[] = cfg.nodes || []
      const nodeName = (n: TreeNode, i: number) =>
        `${i + 1}. ${plainLine(n.text).slice(0, 48) || ((n.choices || []).length ? '(sin texto)' : '(final sin texto)')}`
      const OUTCOMES = { good: '✔ Buen final', bad: '✖ Final mejorable', neutral: '● Final neutro' } as const
      // «Lleva a → momento nuevo»: crea el nodo al final y apunta la respuesta a él.
      const pointToNew = (i: number, choiceId: string) => {
        const fresh: TreeNode = { id: rid('n'), speaker: chars[0]?.id || '', text: '', choices: [], outcome: 'neutral' }
        setConfig({
          nodes: [
            ...nodes.map((n, j) => (j !== i ? n : { ...n, choices: (n.choices || []).map((c) => (c.id === choiceId ? { ...c, to: fresh.id } : c)) })),
            fresh,
          ],
        })
      }
      return (
        <>
          <ListEditor
            title="Personajes"
            items={chars}
            onChange={(next) => setConfig({ characters: next })}
            create={() => ({ id: rid('p'), name: '', role: '' })}
            render={(c, update) => (
              <>
                <input value={c.name} placeholder="Nombre (p. ej. Marta)" onChange={(e) => update({ ...c, name: e.target.value })} />
                <input value={c.role || ''} placeholder="Papel (opcional, p. ej. hija del residente)" onChange={(e) => update({ ...c, role: e.target.value })} />
              </>
            )}
          />
          <ListEditor
            title="Momentos de la conversación (empieza por el primero; un momento sin respuestas es un final)"
            items={nodes}
            onChange={(next) => setConfig({ nodes: next })}
            summary={(n, i) => nodeName(n, i) + ((n.choices || []).length ? '' : ` — ${OUTCOMES[n.outcome || 'neutral']}`)}
            collapseFrom={3}
            create={(): TreeNode => ({ id: rid('n'), speaker: chars[0]?.id || '', text: '', choices: [], outcome: 'neutral' })}
            clone={(n) => ({ ...n, id: rid('n'), choices: (n.choices || []).map((c) => ({ ...c, id: rid('c') })) })}
            confirmRemove={(n) =>
              nodes.some((x) => (x.choices || []).some((c) => c.to === n.id))
                ? 'Hay respuestas que llevan a este momento y se quedarán sin destino. ¿Eliminarlo?'
                : null}
            render={(n, update, i) => (
              <div className="ed-stack">
                <div className="ed-row">
                  <select value={n.speaker || ''} onChange={(e) => update({ ...n, speaker: e.target.value })}>
                    <option value="">— Sin personaje (narración) —</option>
                    {chars.map((c) => <option key={c.id} value={c.id}>{c.name || '(personaje sin nombre)'}</option>)}
                  </select>
                </div>
                <RichTextArea rows={2} value={n.text} onChange={(v) => update({ ...n, text: v })} />
                <ListEditor
                  title="Respuestas del alumno"
                  items={n.choices || []}
                  onChange={(choices) => update({ ...n, choices })}
                  create={() => ({ id: rid('c'), text: '', to: '' })}
                  render={(c, upd) => (
                    <>
                      <input value={c.text} placeholder="Lo que responde el alumno" onChange={(e) => upd({ ...c, text: e.target.value })} />
                      <select value={c.to} onChange={(e) => (e.target.value === '__new__' ? pointToNew(i, c.id) : upd({ ...c, to: e.target.value }))}>
                        <option value="">— Lleva a… —</option>
                        {nodes.map((m, j) => j !== i && <option key={m.id} value={m.id}>{nodeName(m, j)}</option>)}
                        <option value="__new__">＋ Un momento nuevo</option>
                      </select>
                    </>
                  )}
                />
                {!(n.choices || []).length && (
                  <>
                    <label className="ed-field"><span>Este momento es un final</span>
                      <select value={n.outcome || 'neutral'} onChange={(e) => update({ ...n, outcome: e.target.value as TreeNode['outcome'] })}>
                        {Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </label>
                    <div className="ed-field"><span>Comentario del final (por qué acaba así)</span>
                      <RichTextArea rows={2} value={n.feedback || ''} onChange={(v) => update({ ...n, feedback: v })} /></div>
                  </>
                )}
              </div>
            )}
          />
          <p className="ed-hint">
            Si puntúa, acierta quien llega a un «Buen final». Cuenta el primer final alcanzado: después el alumno puede
            volver a empezar para explorar otros caminos, pero la nota no cambia. No se puede volver a un momento anterior
            (sin bucles).
          </p>
        </>
      )
    }

    // ---- Reto numérico -------------------------------------------------------------
    case 'calculator': {
      const vars: CalcVariable[] = cfg.variables || []
      const results: CalcResult[] = cfg.results || []
      const tool = cfg.mode === 'tool'
      const preview = computeResults(vars, results)
      const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')))
      return (
        <>
          <label className="ed-field"><span>Modo</span>
            <select value={tool ? 'tool' : 'challenge'} onChange={(e) => setConfig({ mode: e.target.value })}>
              <option value="challenge">Reto: el curso da los datos y el alumno calcula el resultado (puede puntuar)</option>
              <option value="tool">Calculadora: el alumno escribe los datos y ve el resultado (no puntúa)</option>
            </select>
          </label>
          <ListEditor
            title={tool ? 'Datos que escribe el alumno (el valor es opcional: sale ya relleno)' : 'Datos del enunciado'}
            items={vars}
            onChange={(next) => setConfig({ variables: next })}
            create={() => ({ id: '', label: '', unit: '' })}
            clone={(v) => ({ ...v, id: '' })}
            render={(v, update) => (
              <>
                <input className="ed-mono" style={{ maxWidth: 120 }} value={v.id} placeholder="nombre"
                  title="Nombre corto para usarlo en las fórmulas: letras sin tilde, números y _ (p. ej. peso)"
                  onChange={(e) => update({ ...v, id: e.target.value.replace(/\s+/g, '_') })} />
                <input value={v.label || ''} placeholder="Texto para el alumno (p. ej. Peso del paciente)" onChange={(e) => update({ ...v, label: e.target.value })} />
                <input style={{ maxWidth: 110 }} inputMode="decimal" value={v.value ?? ''} placeholder="Valor"
                  onChange={(e) => update({ ...v, value: num(e.target.value) })} />
                <input style={{ maxWidth: 80 }} value={v.unit || ''} placeholder="Unidad" onChange={(e) => update({ ...v, unit: e.target.value })} />
              </>
            )}
          />
          <ListEditor
            title="Resultados (en orden; cada fórmula puede usar los datos y los resultados anteriores)"
            items={results}
            onChange={(next) => setConfig({ results: next })}
            create={() => ({ id: `r${results.length + 1}`, label: '', formula: '', unit: '', decimals: 2 })}
            render={(r, update, i) => (
              <div className="ed-stack">
                <div className="ed-row-tight">
                  <input className="ed-mono ed-fixed" style={{ width: 120 }} value={r.id} placeholder="nombre"
                    onChange={(e) => update({ ...r, id: e.target.value.replace(/\s+/g, '_') })} />
                  <input value={r.label || ''} placeholder="Qué se pide (p. ej. Dosis diaria)" onChange={(e) => update({ ...r, label: e.target.value })} />
                  <input className="ed-fixed" style={{ width: 80 }} value={r.unit || ''} placeholder="Unidad" onChange={(e) => update({ ...r, unit: e.target.value })} />
                </div>
                <div className="ed-row-tight">
                  <input className="ed-mono" value={r.formula} placeholder="Fórmula, p. ej. peso * 0.5"
                    onChange={(e) => update({ ...r, formula: e.target.value })} />
                  <label className="ed-check ed-fixed" title="Decimales con los que se muestra la solución; al corregir se admite un pequeño margen de redondeo">
                    <span>Decimales</span>
                    <input type="number" min={0} max={6} style={{ width: 56 }} value={r.decimals ?? 2}
                      onChange={(e) => update({ ...r, decimals: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })} />
                  </label>
                </div>
                {preview[i]?.error
                  // En la calculadora libre los datos sin valor los pone el alumno: no es un error.
                  ? !(tool && preview[i].error!.startsWith('Falta el valor')) && <p className="ed-hint-warn">{preview[i].error}</p>
                  : preview[i] && <p className="ed-hint">= {preview[i].value!.toLocaleString('es-ES', { maximumFractionDigits: r.decimals ?? 2 })} {r.unit}</p>}
              </div>
            )}
          />
          <p className="ed-hint">
            Fórmulas: + − * / ^ y paréntesis, con punto decimal (0.5), y las funciones round(x, decimales), min, max,
            abs, sqrt, floor y ceil. El alumno puede responder con coma decimal; se acepta media unidad del último
            decimal o un 0,5 % de desviación.
          </p>
        </>
      )
    }

    // ---- Puzzle de imagen ---------------------------------------------------------
    case 'puzzle':
      return (
        <div className="ed-stack">
          <div className="ed-row">
            <input value={cfg.image || ''} placeholder="Imagen del puzzle (assets/img/…)"
              onChange={(e) => setConfig({ image: e.target.value })} />
            <FileButton accept="image/*" label="Subir imagen…" currentPath={cfg.image || undefined}
              makePath={(ext) => `assets/img/${it.id}-pz.${ext}`}
              onUploaded={(p) => setConfig({ image: p })} />
          </div>
          <input value={cfg.alt || ''} placeholder="Texto alternativo de la imagen (obligatorio)"
            onChange={(e) => setConfig({ alt: e.target.value })} />
          <div className="ed-row">
            <SegIcons label="Columnas" value={String(cfg.cols ?? 3)}
              options={[2, 3, 4, 5].map((n) => ({ value: String(n), icon: String(n), title: `${n} columnas` }))}
              onChange={(v) => setConfig({ cols: Number(v) })} />
            <SegIcons label="Filas" value={String(cfg.rows ?? 3)}
              options={[2, 3, 4, 5].map((n) => ({ value: String(n), icon: String(n), title: `${n} filas` }))}
              onChange={(v) => setConfig({ rows: Number(v) })} />
          </div>
          <p className="ed-hint">El alumno toca dos piezas para intercambiarlas hasta recomponer la imagen.</p>
        </div>
      )

    // ---- HTML a medida (iframe sandbox) ------------------------------------
    case 'html_embed': {
      const embedAssets: string[] = cfg.embed_assets || []
      const embedRefs = { html: embedHtmlRef, css: embedCssRef, js: embedJsRef }
      // Recuerda el campo y la posición del cursor en cada textarea (clic,
      // flechas, selección…) para saber dónde insertar la ruta al pulsar
      // «Copiar». `onSelect` cubre todos los casos (React lo dispara con
      // cualquier cambio de selección/cursor, no solo al seleccionar texto).
      const trackCursor = (field: 'html' | 'css' | 'js') => (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        embedCursorRef.current = { field, pos: e.currentTarget.selectionStart }
      }
      function insertEmbedAsset(path: string) {
        const { field, pos } = embedCursorRef.current
        const current = String(cfg[field] || '')
        const at = Math.min(pos, current.length)
        setConfig({ [field]: current.slice(0, at) + path + current.slice(at) })
        navigator.clipboard?.writeText(path).catch(() => {})
        const ta = embedRefs[field].current
        const newPos = at + path.length
        embedCursorRef.current = { field, pos: newPos }
        // El value del textarea aún no se ha repintado con el `setConfig` de
        // arriba (React es asíncrono) — esperar un frame antes de reenfocar y
        // mover el cursor, si no `setSelectionRange` cae fuera del texto viejo.
        requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(newPos, newPos) })
      }
      function removeEmbedAsset(path: string) {
        setConfig({ embed_assets: embedAssets.filter((p) => p !== path) })
        removeAsset(path)
      }
      return (
        <div className="ed-stack">
          <p className="ed-hint">
            Pega aquí tu animación o interactivo. El código se ejecuta <strong>aislado en un
            iframe sandbox</strong> dentro del SCORM: no puede acceder al LMS, a la API SCORM ni al
            resto de la pantalla. Debe ser autocontenido (sin cargar librerías externas por CDN si
            el curso puede verse sin conexión).
          </p>
          <div className="ed-embed-assets">
            <span className="ed-embed-assets-label">Imágenes del código:</span>
            {embedAssets.map((path) => (
              <div key={path} className="ed-embed-asset-row">
                <input value={path} readOnly onFocus={(e) => e.target.select()} />
                <button type="button" className="ed-icobtn" title="Insertar en el cursor del campo donde estabas escribiendo (y copiar la ruta)"
                  onClick={() => insertEmbedAsset(path)}><Icon name="copy" size={13} /> Copiar</button>
                <button type="button" className="ed-icobtn ed-icobtn-danger" title="Quitar imagen" aria-label={`Quitar ${path}`}
                  onClick={() => removeEmbedAsset(path)}><Icon name="trash" size={13} /></button>
              </div>
            ))}
            <FileButton accept="image/*" label="Subir imagen…"
              makePath={(ext) => `assets/img/${it.id}-${rid('emb')}.${ext}`}
              onUploaded={(path) => setConfig({ embed_assets: [...embedAssets, path] })} />
            <p className="ed-hint">
              Sube aquí las imágenes que uses dentro del HTML/CSS/JS. «Copiar» inserta la ruta en el
              campo y la posición donde tenías el cursor (además de copiarla al portapapeles) — pégala
              tú donde haga falta si prefieres moverla, por ejemplo en un <code>src="…"</code> o un
              <code>url(…)</code> de CSS.
            </p>
          </div>
          <label className="ed-field"><span>HTML</span>
            <textarea ref={embedHtmlRef} className="ed-code" rows={8} spellCheck={false} value={cfg.html || ''}
              placeholder={'<div id="demo">…</div>'}
              onChange={(e) => setConfig({ html: e.target.value })}
              onSelect={trackCursor('html')} onFocus={trackCursor('html')} /></label>
          <label className="ed-field"><span>CSS</span>
            <textarea ref={embedCssRef} className="ed-code" rows={5} spellCheck={false} value={cfg.css || ''}
              placeholder={'#demo { color: teal; }'}
              onChange={(e) => setConfig({ css: e.target.value })}
              onSelect={trackCursor('css')} onFocus={trackCursor('css')} /></label>
          <label className="ed-field"><span>JavaScript</span>
            <textarea ref={embedJsRef} className="ed-code" rows={8} spellCheck={false} value={cfg.js || ''}
              placeholder={"document.getElementById('demo').addEventListener('click', …)"}
              onChange={(e) => setConfig({ js: e.target.value })}
              onSelect={trackCursor('js')} onFocus={trackCursor('js')} /></label>
          <label className="ed-check" title="El alumno no podrá pasar de pantalla (si esta pantalla es obligatoria y el curso exige completar las interacciones) hasta que el propio código llame a MeEmbed.complete()">
            <input type="checkbox" checked={!!cfg.require_completion}
              onChange={(e) => setConfig({ require_completion: e.target.checked || undefined })} />
            <span>Exigir que el alumno la complete para avanzar</span>
          </label>
          <div className="ed-row">
            <label className="ed-field ed-field-narrow"><span>Alto fijo en px (vacío = automático)</span>
              <input type="number" min={0} value={cfg.height ?? ''}
                onChange={(e) => setConfig({ height: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
            <label className="ed-field ed-field-narrow"><span>Memoria para guardar su estado (caracteres)</span>
              <input type="number" min={0} max={300} placeholder="100" value={cfg.state_max ?? ''}
                onChange={(e) => setConfig({ state_max: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
            <label className="ed-field ed-field-narrow" title="Solo afecta a la duración estimada del curso (chip de la barra y Informe)"><span>Tiempo estimado (segundos)</span>
              <input type="number" min={0} max={3600} placeholder="30" value={cfg.est_seconds ?? ''}
                onChange={(e) => setConfig({ est_seconds: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
          </div>
          <p className="ed-hint">
            Dentro de tu JS tienes <code>window.MeEmbed</code>: llama a <code>MeEmbed.complete()</code> cuando el
            alumno termine la actividad (comprueba antes <code>MeEmbed.completed</code> para no repetirlo), y
            a <code>MeEmbed.saveState(obj)</code> para guardar un estado propio pequeño entre sesiones — se
            restaura en <code>MeEmbed.state</code>, con un presupuesto de <code>MeEmbed.stateMax</code> caracteres
            (el de arriba). Guarda solo índices, booleanos y claves de una letra (p. ej. <code>{'{"s":[0,2]}'}</code>):
            el estado debe ser ASCII imprimible, sin tildes ni emoji — <code>saveState()</code> rechaza (con
            aviso en consola) cualquier estado con caracteres fuera de ese rango. El bloqueo de avance solo
            actúa si esta pantalla es obligatoria y el curso exige completar las interacciones (⚙ Ajustes del
            curso).
          </p>
        </div>
      )
    }

    default:
      return null
  }
}

// ---- Preguntas con opciones (compartido por video e hidden_image) -----------
type QOption = { text: string; correct?: boolean; feedback?: string }
type QItem = { time?: number; prompt: string; options: QOption[] }

/** Lista de preguntas (enunciado + opciones); `withTime` añade el segundo en el
 *  que el vídeo se pausa. Sub-editor común de `video` y `hidden_image`. */
function QuestionListEditor({
  title,
  withTime = false,
  questions,
  onChange,
}: {
  title: string
  withTime?: boolean
  questions: QItem[]
  onChange: (next: QItem[]) => void
}) {
  return (
    <ListEditor
      title={title}
      items={questions}
      onChange={onChange}
      addLabel="+ Añadir pregunta"
      summary={(q) => (withTime ? `${q.time ?? 0} s · ` : '') + (q.prompt.trim() || '(sin enunciado)')}
      create={(): QItem => ({
        ...(withTime ? { time: 0 } : {}),
        prompt: '',
        options: [{ text: '', correct: true }, { text: '' }],
      })}
      render={(q, update) => (
        <div className="ed-stack">
          {withTime ? (
            <div className="ed-row">
              <label className="ed-field ed-field-narrow"><span>Segundo</span>
                <input type="number" min={0} value={q.time ?? 0}
                  onChange={(e) => update({ ...q, time: Math.max(0, Number(e.target.value)) })} /></label>
              <input value={q.prompt} placeholder="Enunciado de la pregunta"
                onChange={(e) => update({ ...q, prompt: e.target.value })} />
            </div>
          ) : (
            <input value={q.prompt} placeholder="Enunciado de la pregunta"
              onChange={(e) => update({ ...q, prompt: e.target.value })} />
          )}
          <ListEditor
            title="Opciones"
            items={q.options || []}
            onChange={(options) => update({ ...q, options })}
            create={(): QOption => ({ text: '' })}
            render={(o, uo) => (
              <>
                <input value={o.text} placeholder="Texto de la opción" onChange={(e) => uo({ ...o, text: e.target.value })} />
                <label className="ed-check" title="Puede haber varias correctas: cualquiera de ellas cuenta como acierto"><input type="checkbox" checked={!!o.correct} onChange={(e) => uo({ ...o, correct: e.target.checked })} /><span>Correcta</span></label>
                <input value={o.feedback || ''} placeholder="Feedback (opcional)" onChange={(e) => uo({ ...o, feedback: e.target.value })} />
              </>
            )}
          />
        </div>
      )}
    />
  )
}
