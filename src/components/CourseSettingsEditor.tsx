import { useState } from 'react'
import { useCourseStore } from '../store/courseStore'
import { confirmDialog } from '../store/confirm'
import type { ScormConfig } from '../schema/course.schema'
import { allScreens } from '../schema/traverse'
import { SegIcons } from './SegIcons'
import { Icon } from './Icon'
import { MIN_TEXT_CONTRAST, contrastRatio, fmtRatio } from '../validation/accessibility'

// Paletas típicas seleccionables de un clic: por defecto (la corporativa de
// SCORMEditor) + 4 combinaciones habituales. `primary` es el color de ACCIÓN
// (botones, enlaces, focus) y `accent` el de ESTRUCTURA (portadas, menú, barra
// de progreso) — ver «Lenguaje visual de la carcasa» en arquitectura-runtime.md.
// No agotan las opciones: los pickers de debajo siguen abiertos a cualquier hex.
// Accesibilidad (WCAG 1.4.3, nivel AA): todo `primary` debe dar ≥ 4,5:1 con el
// blanco (texto blanco en botones y primario como texto/enlace sobre blanco; es
// la misma razón en ambos sentidos). Razones actuales: Corporativo 5,13 ·
// Mecohisa 4,82 · Bosque 5,02 · Granate 7,88 · Violeta 7,10 · Grafito 10,35.
// El Mecohisa original (#8492b6, 3,10:1) se oscureció manteniendo tono y
// saturación HSL (223°, 25 %) de luminosidad 62 % a 50 %. `accent` no se mide:
// la carcasa no lo usa como color de texto sobre blanco. Lo vigila el validador
// (THEME_LOW_CONTRAST) también para colores elegidos a mano.
const PALETTES: { name: string; primary: string; accent: string }[] = [
  { name: 'Corporativo', primary: '#0b5fff', accent: '#6dc3c0' },
  { name: 'Mecohisa', primary: '#5f71a0', accent: '#f5ca00' },
  { name: 'Bosque', primary: '#15803d', accent: '#86c9a0' },
  { name: 'Granate', primary: '#9d174d', accent: '#e8879f' },
  { name: 'Violeta', primary: '#6d28d9', accent: '#a78bfa' },
  { name: 'Grafito', primary: '#334155', accent: '#94a3b8' },
]

// Niveles de animación y velocidad como segmentados de texto corto (el detalle
// va en el title y en el hint de abajo).
const MOTION_SEGS = [
  { value: 'none', icon: 'Sin', title: 'Sin animaciones' },
  { value: 'subtle', icon: 'Mínimas', title: 'Transiciones básicas (por defecto)' },
  { value: 'rich', icon: 'Sutiles', title: 'Revelado progresivo del contenido al ir bajando' },
  { value: 'vivid', icon: 'Llamativas', title: 'Revelado con entradas variadas y transición direccional entre pantallas' },
]
const SPEED_SEGS = [
  { value: 'fast', icon: 'Rápida', title: 'Entradas más cortas' },
  { value: 'normal', icon: 'Normal', title: 'Velocidad por defecto' },
  { value: 'slow', icon: 'Lenta', title: 'Entradas más largas' },
]

/** Contraste del color de acción con el blanco (WCAG 1.4.3): mismo cálculo que
 *  el validador (THEME_LOW_CONTRAST), a la vista mientras se elige el color. */
function PrimaryContrastHint({ color }: { color: string }) {
  const ratio = contrastRatio(color, '#ffffff')
  if (ratio === null) return null
  const ok = ratio >= MIN_TEXT_CONTRAST
  return (
    <p className={`ed-hint ${ok ? 'ed-check-ok' : 'ed-check-ko'}`} role="status">
      <Icon name={ok ? 'circle-check' : 'circle-x'} size={14} /> Contraste del color de acción con el
      blanco: <strong>{fmtRatio(ratio)}</strong>{' '}
      {ok
        ? '(cumple el mínimo de 4,5:1 de la WCAG 1.4.3).'
        : '— no llega al mínimo de 4,5:1 (WCAG 1.4.3): el texto de los botones y los enlaces no se leerá bien. Elige un tono más oscuro.'}
    </p>
  )
}

/**
 * Sección «Ajustes del curso»: reglas SCORM de finalización y aprobado
 * (`scorm.rules` + `mastery_score`). Se muestra como una pestaña dentro del
 * modal unificado de Ajustes (`SettingsModal`).
 */
/**
 * Sección «Interfaz (Apariencia)»: preferencias de presentación de la carcasa
 * (`shell`), separadas de las reglas de finalización. Ventana propia en el menú
 * Ajustes.
 */
export function AppearanceSection() {
  const shell = useCourseStore((s) => s.course.shell)
  const updateShell = useCourseStore((s) => s.updateShell)
  const moduleLabel = useCourseStore((s) => s.course.module_label)
  const unitLabel = useCourseStore((s) => s.course.unit_label)
  const setModuleLabel = useCourseStore((s) => s.setModuleLabel)
  const setUnitLabel = useCourseStore((s) => s.setUnitLabel)

  return (
    <>
      <p className="ed-hint ed-hint-lead">
        Preferencias de presentación de la carcasa del curso (Vista estudiante y SCORM exportado).
      </p>

      <fieldset className="ed-group">
        <legend>Terminología</legend>
        <div className="ed-row">
          <label className="ed-field ed-field-narrow">
            <span>Nivel superior</span>
            <input value={moduleLabel} placeholder="Módulo" onChange={(e) => setModuleLabel(e.target.value)} />
          </label>
          <label className="ed-field ed-field-narrow">
            <span>Nivel inferior</span>
            <input value={unitLabel} placeholder="Unidad" onChange={(e) => setUnitLabel(e.target.value)} />
          </label>
        </div>
        <p className="ed-hint">
          Un paquete SCORM no siempre es un curso completo con módulos de verdad: puede
          representar un módulo suelto, una unidad o un tema. Si «Módulo»/«Unidad» no encaja,
          cámbialos aquí (p. ej. «Tema»/«Apartado») — se aplican en el árbol del editor y en el
          rótulo de la portada de módulo/unidad de la Vista estudiante. La estructura por debajo
          no cambia, solo cómo se llama.
        </p>
      </fieldset>

      <fieldset className="ed-group">
        <legend>Marca y color</legend>
        <label className="ed-field">
          <span>Marca (texto de la esquina superior izquierda)</span>
          <input value={shell.brand} placeholder="p. ej. Mecohisa Formación"
            onChange={(e) => updateShell({ brand: e.target.value })} />
        </label>

        <div className="ed-field">
          <span>Paleta</span>
          <div className="ed-palette-row">
            {PALETTES.map((p) => {
              const active = shell.primary_color.toLowerCase() === p.primary
                && shell.accent_color.toLowerCase() === p.accent
              return (
                <button type="button" key={p.name}
                  className={`ed-palette-swatch${active ? ' is-active' : ''}`}
                  title={`Paleta «${p.name}»: ${p.primary} (acción) + ${p.accent} (estructura)`}
                  onClick={() => updateShell({ primary_color: p.primary, accent_color: p.accent })}>
                  <span className="ed-palette-dots" aria-hidden="true">
                    <span className="ed-palette-dot" style={{ background: p.primary }} />
                    <span className="ed-palette-dot" style={{ background: p.accent }} />
                  </span>
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="ed-row">
          <label className="ed-field ed-field-narrow">
            <span>Color de acción</span>
            <div className="ed-color-row">
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(shell.primary_color) ? shell.primary_color : '#0b5fff'}
                aria-label="Elegir color de acción"
                onChange={(e) => updateShell({ primary_color: e.target.value })} />
              <input value={shell.primary_color} placeholder="#0b5fff" style={{ maxWidth: 110 }}
                aria-label="Color de acción en hexadecimal"
                onChange={(e) => updateShell({ primary_color: e.target.value })} />
            </div>
          </label>
          <label className="ed-field ed-field-narrow">
            <span>Color de estructura</span>
            <div className="ed-color-row">
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(shell.accent_color) ? shell.accent_color : '#6dc3c0'}
                aria-label="Elegir color de estructura"
                onChange={(e) => updateShell({ accent_color: e.target.value })} />
              <input value={shell.accent_color} placeholder="#6DC3C0" style={{ maxWidth: 110 }}
                aria-label="Color de estructura en hexadecimal"
                onChange={(e) => updateShell({ accent_color: e.target.value })} />
            </div>
          </label>
        </div>
        <p className="ed-hint">
          Elige una paleta típica o combina tus propios colores: el de <strong>acción</strong> tiñe
          botones, enlaces y foco; el de <strong>estructura</strong>, las portadas, el menú lateral y
          la barra de progreso. La marca aparece en la barra superior del curso; si la dejas vacía,
          la cabecera muestra únicamente el título del curso.
        </p>
        <PrimaryContrastHint color={shell.primary_color} />
      </fieldset>

      <fieldset className="ed-group">
        <legend>Animaciones</legend>
        <div className="ed-row">
          <SegIcons label="Nivel de animación" value={shell.motion} options={MOTION_SEGS}
            onChange={(v) => updateShell({ motion: v as any })} />
          <SegIcons label="Velocidad" value={shell.motion_speed} options={SPEED_SEGS}
            disabled={shell.motion === 'none'}
            onChange={(v) => updateShell({ motion_speed: v as any })} />
        </div>
        <p className="ed-hint">
          «Sutiles» y «Llamativas» revelan el contenido de cada pantalla en cascada la primera vez
          y el resto al hacer scroll (las pantallas ya vistas no se re-animan); «Llamativas» añade
          entradas variadas y una transición direccional entre
          pantallas. «Mínimas» solo aplica transiciones básicas. La velocidad alarga o acorta las
          entradas del nivel elegido. Si el alumno tiene activada la
          reducción de movimiento en su equipo, no se anima nada.
        </p>
      </fieldset>
    </>
  )
}

function fmtLayoutDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function CourseSettingsSection() {
  const scorm = useCourseStore((s) => s.course.scorm)
  const updateScorm = useCourseStore((s) => s.updateScorm)
  const hasFinal = useCourseStore((s) => !!s.course.assessments.final_test)
  const screenCount = useCourseStore((s) => allScreens(s.course).length)
  const setAllMinTime = useCourseStore((s) => s.setAllMinTime)
  const setAllAttempts = useCourseStore((s) => s.setAllAttempts)
  // Tiempo/intentos a aplicar en lote (no se persisten: son una herramienta, no un ajuste).
  const [bulkTime, setBulkTime] = useState(0)
  const [bulkAttempts, setBulkAttempts] = useState(0)

  const setRule = (p: Partial<ScormConfig['rules']>) => updateScorm({ rules: { ...scorm.rules, ...p } })
  const r = scorm.rules
  const layouts = scorm.layouts || []

  async function onDeleteLayout(fp: string) {
    const ok = await confirmDialog({
      title: 'Borrar versión publicada',
      message: 'Un alumno que reanude un intento guardado con esta estructura exacta ya no podrá recuperar su progreso por posición si el curso ha cambiado desde entonces (se le conservarán los intentos y la nota, pero no las pantallas vistas ni las respuestas). ¿Continuar?',
      confirmLabel: 'Borrar',
      danger: true,
    })
    if (!ok) return
    updateScorm({ layouts: layouts.filter((l) => l.fp !== fp) })
  }

  async function onApplyMinTime() {
    const secs = Math.max(0, Math.min(30, Math.round(bulkTime)))
    setBulkTime(secs)
    const ok = await confirmDialog({
      title: 'Aplicar tiempo mínimo a todas',
      message: `Se pondrá un tiempo mínimo de ${secs} segundo${secs === 1 ? '' : 's'} en las ${screenCount} pantallas del curso, sustituyendo el valor que tenga cada una. Puedes deshacerlo con Ctrl+Z.`,
      confirmLabel: 'Aplicar a todas',
    })
    if (ok) setAllMinTime(secs)
  }

  async function onApplyAttempts() {
    const n = Math.max(0, Math.round(bulkAttempts))
    setBulkAttempts(n)
    const ok = await confirmDialog({
      title: 'Aplicar intentos a todas',
      message: `Se pondrán ${n === 0 ? 'intentos ilimitados' : `${n} intento${n === 1 ? '' : 's'}`} en todas las interacciones evaluables del curso que respetan este ajuste, sustituyendo el valor que tenga cada una. Puedes deshacerlo con Ctrl+Z.`,
      confirmLabel: 'Aplicar a todas',
    })
    if (ok) setAllAttempts(n)
  }

  return (
    <>
      <p className="ed-hint ed-hint-lead">
        Deciden cuándo el alumno queda <strong>completado</strong> y si resulta{' '}
        <strong>APTO / NO APTO</strong>. Se aplican en la Vista estudiante y en el manifiesto SCORM.
      </p>

      <fieldset className="ed-group">
        <legend>Aprobado (nota)</legend>
        <div className="ed-row">
          <label className="ed-field ed-field-narrow"
            title={r.completion_mode === 'screens' ? 'No aplica: en modo «Por llegar al final» la nota no decide la finalización' : undefined}>
            <span>Nota mínima para aprobar (%)</span>
            <input type="number" min={0} max={100} value={r.min_score}
              disabled={r.completion_mode === 'screens'}
              onChange={(e) => setRule({ min_score: Number(e.target.value) })} />
          </label>
          <label className="ed-field ed-field-narrow"
            title={r.completion_mode === 'screens' ? 'No aplica: en modo «Por llegar al final» el paquete no declara masteryscore, para que el LMS no marque suspenso por la nota' : undefined}>
            <span>Nota de superación SCORM (masteryscore)</span>
            <input type="number" min={0} max={100} value={scorm.mastery_score}
              disabled={r.completion_mode === 'screens'}
              onChange={(e) => updateScorm({ mastery_score: Number(e.target.value) })} />
          </label>
          <label className="ed-field">
            <span>De dónde sale la nota</span>
            <select value={r.score_source} onChange={(e) => setRule({ score_source: e.target.value as any })}>
              <option value="final_test">Solo el test final</option>
              <option value="unit_tests">Solo las actividades evaluables</option>
              <option value="mixed">Mixto (actividades + test final)</option>
            </select>
          </label>
        </div>
        {r.score_source === 'final_test' && !hasFinal && (
          <p className="ed-hint-warn">
            <Icon name="alert-triangle" size={13} /> La nota sale del test final, pero no hay test final. Créalo en «Evaluación → Test final».
          </p>
        )}
        {r.score_source === 'mixed' && (
          <div className="ed-row">
            <label className="ed-field ed-field-narrow">
              <span>Peso del test final (%)</span>
              <input type="number" min={0} max={100} value={r.mixed_final_weight}
                onChange={(e) => setRule({ mixed_final_weight: Number(e.target.value) })} />
            </label>
            <p className="ed-hint" style={{ alignSelf: 'center' }}>
              Test final <strong>{r.mixed_final_weight}%</strong> · práctica <strong>{100 - r.mixed_final_weight}%</strong>.
              Cada bloque se calcula sobre su propio total y se combinan con este peso.
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="ed-group">
        <legend>Finalización (completado)</legend>
        <div className="ed-row">
          <label className="ed-field">
            <span>Modo de finalización</span>
            <select value={r.completion_mode} onChange={(e) => setRule({ completion_mode: e.target.value as any })}>
              <option value="evaluation">Por evaluación (nota e interacciones)</option>
              <option value="screens">Por llegar al final</option>
            </select>
          </label>
          <label className="ed-field ed-field-narrow">
            <span>% de pantallas que hay que ver</span>
            <input type="number" min={0} max={100} value={r.min_required_screens_pct}
              onChange={(e) => setRule({ min_required_screens_pct: Number(e.target.value) })} />
          </label>
          {/* Además de contar para completar (solo en «Por evaluación»), la regla bloquea
              «Siguiente» hasta resolver la interacción de cada pantalla obligatoria
              (interactionOk en app.js): por eso sigue activa en «Por llegar al final». */}
          <label className="ed-check" title={r.completion_mode === 'screens'
            ? 'No deja avanzar hasta resolver la actividad de cada pantalla obligatoria. En este modo no cuenta para completar el curso.'
            : 'No deja avanzar hasta resolver la actividad de cada pantalla obligatoria, y hace falta para completar el curso.'}>
            <input type="checkbox" checked={r.require_interactions}
              onChange={(e) => setRule({ require_interactions: e.target.checked })} />
            <span>Exigir completar las interacciones{r.completion_mode === 'screens' ? ' para avanzar' : ''}</span>
          </label>
          <label className="ed-check">
            <input type="checkbox" checked={r.allow_resume}
              onChange={(e) => setRule({ allow_resume: e.target.checked })} />
            <span>Permitir reanudar donde lo dejó</span>
          </label>
          <label className="ed-check" title="Tras pulsar Cerrar, la pantalla «Sesión finalizada» vuelve sola a la página del curso en Moodle a los 5 segundos (el alumno puede quedarse). Sin marcar, solo se muestra el botón «Volver al curso».">
            <input type="checkbox" checked={r.auto_return}
              onChange={(e) => setRule({ auto_return: e.target.checked })} />
            <span>Al cerrar, volver solo al curso de Moodle</span>
          </label>
        </div>
        {r.completion_mode === 'screens' && (
          <p className="ed-hint">
            El curso se completa en cuanto el alumno llega al final (según el % de pantallas de
            arriba), sin importar si acierta las actividades ni la nota del test. La pantalla de
            Resultados no muestra nota ni APTO/NO APTO: solo un mensaje de enhorabuena (o de que
            falta terminar) y salir — la nota se sigue calculando y enviando al LMS, y el test
            final ya no retiene al alumno si suspende con intentos restantes.
          </p>
        )}
      </fieldset>

      <fieldset className="ed-group">
        <legend>Tiempo mínimo por pantalla</legend>
        <div className="ed-row">
          <label className="ed-field ed-field-narrow">
            <span>Segundos (0–30)</span>
            <input type="number" min={0} max={30} value={bulkTime}
              onChange={(e) => setBulkTime(Number(e.target.value))} />
          </label>
          <button type="button" style={{ alignSelf: 'flex-end' }} onClick={() => void onApplyMinTime()}>
            Aplicar a todas las pantallas
          </button>
        </div>
        <p className="ed-hint">
          Pone el mismo «Tiempo mín. (s)» en las {screenCount} pantallas del curso (el alumno no
          puede avanzar hasta agotarlo). Sustituye el valor individual de cada pantalla; después
          puedes afinar pantallas concretas en su editor.
        </p>
      </fieldset>

      <fieldset className="ed-group">
        <legend>Intentos por defecto (actividades evaluables)</legend>
        <div className="ed-row">
          <label className="ed-field ed-field-narrow">
            <span>Intentos (0 = ∞)</span>
            <input type="number" min={0} value={bulkAttempts}
              onChange={(e) => setBulkAttempts(Number(e.target.value))} />
          </label>
          <button type="button" style={{ alignSelf: 'flex-end' }} onClick={() => void onApplyAttempts()}>
            Aplicar a todas las pantallas evaluables
          </button>
        </div>
        <p className="ed-hint">
          Pone el mismo nº de «Intentos» en todas las interacciones del curso cuyo tipo respeta
          este ajuste (opción única, V/F, huecos, ordenar pasos, emparejar, clasificar,
          crucigrama), sustituyendo el valor individual de cada una. Después puedes afinar
          actividades concretas en su editor.
        </p>
      </fieldset>

      <fieldset className="ed-group">
        <legend>Test e intentos</legend>
        <div className="ed-row">
          <label className="ed-field ed-field-narrow">
            <span>Intentos del test (0 = ∞)</span>
            <input type="number" min={0} value={r.attempts_allowed}
              onChange={(e) => setRule({ attempts_allowed: Number(e.target.value) })} />
          </label>
          <label className="ed-field">
            <span>Navegación</span>
            <select value={r.navigation} onChange={(e) => setRule({ navigation: e.target.value as any })}>
              <option value="free">Libre</option>
              <option value="sequential">Secuencial</option>
              <option value="mixed">Mixta</option>
            </select>
          </label>
        </div>
      </fieldset>

      {layouts.length > 0 && (
        <fieldset className="ed-group">
          <legend>Versiones publicadas: {layouts.length}</legend>
          <p className="ed-hint">
            Cada estructura distinta exportada como SCORM queda registrada aquí, para que un
            alumno que reanude un intento guardado con una versión antigua no pierda su progreso
            si el curso se reordena, o se añaden o quitan pantallas o interacciones después.
          </p>
          <div className="ed-layouts-list">
            {layouts.slice().reverse().map((l) => (
              <div className="ed-layouts-row" key={l.fp}>
                <div className="ed-layouts-row-info">
                  <strong>{fmtLayoutDate(l.exported_at)}</strong>
                  <span className="ed-hint">
                    {l.screens.length} pantallas · {l.interactions.length} interacciones
                    {l.final_questions.length ? ` · ${l.final_questions.length} preguntas de test final` : ''}
                    {' · huella '}{l.fp}
                  </span>
                </div>
                <button type="button" className="ed-icobtn ed-icobtn-danger" title="Borrar esta versión del historial"
                  onClick={() => void onDeleteLayout(l.fp)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    </>
  )
}
