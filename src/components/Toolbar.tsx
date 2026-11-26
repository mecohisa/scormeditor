import { useEffect, useMemo, useRef, useState } from 'react'
import { useCourseStore } from '../store/courseStore'
import { downloadScorm, type ExportProgress } from '../export/exportScorm'
import { getStateCodec } from '../scorm/stateCodec'
import { SuspendSizeIndicator } from './SuspendSizeIndicator'
import { CourseTimeIndicator } from './CourseTimeIndicator'
import { validateCourse } from '../validation/validators'
import {
  isFsSupported,
  openProject,
  openProjectFromFile,
  saveProjectAs,
  downloadProjectCopy,
  clearLocalLink,
  closeCurrentProject,
} from '../store/autosave'
import { saveCurrentProject } from '../cloud/sync'
import { CourseSettingsModal, AppearanceModal, NarrationModal } from './SettingsModal'
import { ObjectivesModal } from './ObjectivesModal'
import { ShortcutsModal } from './ShortcutsModal'
import { HelpModal } from './HelpModal'
import { CloudModal } from './CloudModal'
import { startTour } from './GuidedTour'
import { InlineRename } from './InlineRename'
import { confirmDialog, confirmDialogTri } from '../store/confirm'
import { a11yIssues } from '../validation/accessibility'
import { orphanAssetPaths } from '../schema/assetRefs'
import { isCloudConfigured } from '../cloud/client'
import { useCloudSessionStore } from '../cloud/session'
import { Icon } from './Icon'
import logoUrl from '../assets/brand/logo-horizontal.svg'

// Confirmación de descarte con el modal propio (no window.confirm), como el
// resto de confirmaciones del editor.
function confirmDiscard() {
  return confirmDialog({
    title: 'Reemplazar el curso abierto',
    message:
      'Esto reemplazará el curso que tienes abierto. Los cambios que no hayas guardado en el archivo de proyecto se perderán. ¿Continuar?',
    confirmLabel: 'Continuar',
    danger: true,
  })
}

// Cierra un menú desplegable al hacer clic fuera o pulsar Escape. Compartido
// por Toolbar (Archivo/Ayuda) y EditTools (Ajustes).
function useMenuDismiss(open: boolean, ref: React.RefObject<HTMLDivElement>, close: () => void) {
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

export function Toolbar() {
  const course = useCourseStore((s) => s.course)
  const assets = useCourseStore((s) => s.assets)
  const resetSample = useCourseStore((s) => s.resetSample)
  const resetEmpty = useCourseStore((s) => s.resetEmpty)
  const importError = useCourseStore((s) => s.importError)
  const linkedFileName = useCourseStore((s) => s.linkedFileName)
  const projectDirty = useCourseStore((s) => s.projectDirty)
  const cloudDocumentId = useCourseStore((s) => s.cloudDocumentId)
  const cloudTitle = useCourseStore((s) => s.cloudTitle)
  const cloudStale = useCourseStore((s) => s.cloudStale)
  const cloudLockHolderEmail = useCourseStore((s) => s.cloudLockHolderEmail)
  const cloudSyncing = useCourseStore((s) => s.cloudSyncing)
  const updateCourseInfo = useCourseStore((s) => s.updateCourseInfo)
  const pruneOrphanAssets = useCourseStore((s) => s.pruneOrphanAssets)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [saving, setSaving] = useState(false)
  const cloudSession = useCloudSessionStore((s) => s.session)
  // Qué ventana de ajustes está abierta. Vive en el store para que Validación
  // pueda abrirla desde sus enlaces («abrir ajustes»).
  const setSettingsModal = useCourseStore((s) => s.setSettingsModal)
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const helpMenuRef = useRef<HTMLDivElement>(null)
  const fsOk = isFsSupported()

  useMenuDismiss(menuOpen, menuRef, () => setMenuOpen(false))
  useMenuDismiss(helpMenuOpen, helpMenuRef, () => setHelpMenuOpen(false))

  // Local y nube son mutuamente excluyentes (courseStore.setCloudLink): un
  // proyecto está SIEMPRE en uno de los dos modos, nunca los dos — de ahí
  // que un único indicador/gesto de guardado baste (ver src/cloud/sync.ts).
  const isCloudMode = !!cloudDocumentId
  // Un proyecto vive en uno de TRES sitios, no dos: archivo local vinculado,
  // documento-nube, o (si no se ha elegido ninguno todavía) solo la copia de
  // recuperación en IndexedDB de este navegador — invisible y no portable.
  // El indicador tiene que decir cuál de los tres es, no solo si hay cambios
  // sin guardar: «Guardado» a secas no dice si eso significa un archivo en tu
  // equipo o solo este navegador.
  const isBrowserOnly = !isCloudMode && !linkedFileName
  const isSaved = !!linkedFileName && !projectDirty
  // «Sincronizado» significa dos cosas a la vez: nada tuyo pendiente de subir
  // Y nada ajeno pendiente de bajar (cloudStale, que viene de Realtime en
  // src/cloud/watch.ts). Si alguien más ha subido una versión, el proyecto
  // NO está sincronizado aunque projectDirty sea false — de ahí el estado
  // «isStale» aparte, con su propio aviso en vez de mentir con la pastilla verde.
  const isStale = isCloudMode && cloudStale
  const isSynced = isCloudMode && !projectDirty && !cloudStale
  // Recursos que ya no usa ninguna diapositiva (peso muerto en el .scormproj).
  const orphanCount = useMemo(() => orphanAssetPaths(course, assets).length, [course, assets])

  async function onSaveClick() {
    setSaving(true)
    try {
      await saveCurrentProject()
    } finally {
      setSaving(false)
    }
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (await confirmDiscard()) void openProjectFromFile(file)
  }

  async function onExportScorm() {
    setBusy(true)
    try {
      // Peor caso de memoria de suspend_data por encima del límite: se avisa
      // y se pide confirmación explícita antes de generar el paquete (el
      // runtime degradará detalle automáticamente al guardar, pero es mejor
      // que el autor lo sepa y decida, ver docs/suspend-data.md).
      const issues = validateCourse(course).issues
      // Accesibilidad (UNE-EN 301 549 / WCAG 2.1 AA, necesaria para acreditar la
      // formación en modalidad virtual): con errores se avisa y se pide
      // confirmación, con la lista enlazada a cada pantalla. Qué códigos cuentan
      // lo define `A11Y_CODES` (validation/accessibility.ts); los avisos no frenan.
      const a11yErrors = a11yIssues(issues).filter((i) => i.severity === 'error')
      if (a11yErrors.length > 0) {
        const n = a11yErrors.length
        const ok = await confirmDialog({
          title: 'Paquete no accesible',
          message: `Este paquete no cumple la UNE-EN 301 549: ${n} error${n === 1 ? '' : 'es'} de accesibilidad. Pulsa uno para ir a corregirlo, o exporta igualmente (por ejemplo, para una revisión interna).`,
          issues: a11yErrors,
          confirmLabel: 'Exportar igualmente',
          danger: true,
        })
        if (!ok) return
      }
      if (issues.some((i) => i.code === 'SUSPEND_OVER_LIMIT')) {
        const ok = await confirmDialog({
          title: 'Progreso SCORM por encima del límite',
          message: 'En el peor de los casos (el alumno ve y responde todo el curso), el progreso guardado superaría el límite de 4096 caracteres de cmi.suspend_data. El runtime lo degradará automáticamente al guardar para intentar que quepa, pero es mejor reducir el contenido con más detalle guardado. ¿Exportar de todas formas?',
          confirmLabel: 'Exportar de todas formas',
          danger: true,
        })
        if (!ok) return
      }
      // Registro de respuestas en el LMS (cmi.interactions): se decide en cada
      // export, con sus implicaciones a la vista. No se guarda en el proyecto.
      const choice = await confirmDialogTri({
        title: '¿Registrar las respuestas en el LMS?',
        message: [
          'Si lo activas, cada vez que un alumno pulsa «Comprobar» (y en cada envío del test final) el paquete guarda en el LMS qué respondió, si acertó y cuánto tardó (cmi.interactions de SCORM 1.2). Sirve para analizar en qué actividades se atascan o fallan los alumnos.',
          '',
          'Cómo afecta:',
          '• No ocupa la memoria de progreso del curso (suspend_data) ni cambia la reanudación ni la nota.',
          '• Aumenta los datos que guarda el LMS: una entrada por intento (máx. 10 por actividad y 300 por sesión).',
          '• Si el LMS rechaza un dato, el curso sigue funcionando con normalidad; solo se pierde ese registro.',
          '• Las respuestas quedan guardadas en el LMS: tenlo en cuenta en la información de protección de datos.',
          '',
          'Es una opción de este export; no se guarda en el proyecto.',
        ].join('\n'),
        confirmLabel: 'Exportar con registro',
        thirdLabel: 'Exportar sin registro',
      })
      if (choice === 'cancel') return
      const trackInteractions = choice === 'confirm'
      // Registra la estructura actual en el historial de layouts (para el
      // remapeo de suspend_data, ver docs/suspend-data.md) SOLO al exportar
      // el paquete real, nunca en Vista previa. Deduplica por huella.
      const entry = getStateCodec().buildLayoutEntry(course)
      const layouts = course.scorm.layouts || []
      let exportCourse = course
      if (!layouts.some((l) => l.fp === entry.fp)) {
        useCourseStore.getState().updateScorm({ layouts: [...layouts, { ...entry, exported_at: new Date().toISOString() }] })
        exportCourse = useCourseStore.getState().course
      }
      await downloadScorm({ course: exportCourse, assets, trackInteractions }, undefined, setExportProgress)
    } finally {
      setBusy(false)
      setExportProgress(null)
    }
  }

  // Exporta el curso a un paquete .elpx de eXeLearning (≥ 4.0.1). El módulo se
  // carga bajo demanda (import dinámico): su código no pesa en el bundle si no
  // se usa. Tras generar, se resume qué se convirtió y qué se reconvirtió.
  async function onExportElpx() {
    setBusy(true)
    try {
      const { downloadElpx } = await import('../interop/elpx')
      const { summary } = await downloadElpx(course, assets)
      const lines = [
        `Se ha generado el paquete .elpx para eXeLearning 4.0.1 o posterior.`,
        ``,
        `• Páginas: ${summary.pages}`,
        `• Actividades y bloques de contenido: ${summary.components}`,
      ]
      if (summary.notes.length) {
        lines.push(``, `Reconversiones y ajustes:`)
        for (const n of summary.notes) lines.push(`• ${n}`)
      }
      lines.push(
        ``,
        `Ábrelo en eXeLearning con «Importar». Se pierden la nota SCORM, el gating y los intentos (eXe los gestiona de otro modo).`,
      )
      await confirmDialog({
        title: 'Exportación a eXeLearning completada',
        message: lines.join('\n'),
        confirmLabel: 'Entendido',
        hideCancel: true,
      })
    } catch (err) {
      await confirmDialog({
        title: 'No se pudo exportar a eXeLearning',
        message: `Ha ocurrido un error al generar el .elpx:\n\n${err instanceof Error ? err.message : String(err)}`,
        confirmLabel: 'Cerrar',
        hideCancel: true,
      })
    } finally {
      setBusy(false)
    }
  }

  // Ejecuta la acción de un ítem del menú y lo cierra.
  function runMenu(action: () => void) {
    setMenuOpen(false)
    action()
  }

  async function onNewDemo() {
    if (await confirmDiscard()) { await clearLocalLink(); resetSample() }
  }
  async function onNewEmpty() {
    if (await confirmDiscard()) { await clearLocalLink(); resetEmpty() }
  }
  async function onOpen() {
    if (await confirmDiscard()) void openProject()
  }
  // Cerrar proyecto: si hay cambios sin guardar/subir, ofrece las 3 vías
  // (guardar/subir y cerrar, descartar y cerrar, cancelar) en vez del simple
  // "reemplazar" de confirmDiscard — cerrar no sustituye por otro curso, se
  // queda sin ninguno. Si el guardado se cancela (selector de archivo nativo)
  // o falla, `projectDirty` sigue en `true` y no se llega a cerrar.
  async function onCloseProject() {
    if (projectDirty) {
      const res = await confirmDialogTri({
        title: 'Cerrar proyecto',
        message: isCloudMode
          ? 'Tienes cambios sin subir a la nube. ¿Quieres subirlos antes de cerrar?'
          : 'Tienes cambios sin guardar en el archivo. ¿Quieres guardarlos antes de cerrar?',
        confirmLabel: isCloudMode ? 'Subir y cerrar' : 'Guardar y cerrar',
        thirdLabel: 'Descartar y cerrar',
        thirdDanger: true,
        cancelLabel: 'Cancelar',
      })
      if (res === 'cancel') return
      if (res === 'confirm') {
        await onSaveClick()
        if (useCourseStore.getState().projectDirty) return
      }
    }
    await closeCurrentProject()
  }
  async function onPruneOrphans() {
    if (orphanCount === 0) return
    const ok = await confirmDialog({
      title: 'Borrar recursos huérfanos',
      message: `Se eliminarán ${orphanCount} recurso(s) que ya no usa ninguna diapositiva, para reducir el tamaño del proyecto. Es irreversible (no se puede deshacer). ¿Continuar?`,
      confirmLabel: 'Borrar',
      danger: true,
    })
    if (ok) pruneOrphanAssets()
  }

  // "Guardar copia local…" en modo nube desvincula el curso de la nube (pasa
  // a trabajarse en local desde ese momento) — distinto de "Descargar copia
  // (.scormproj)", que no toca el vínculo. Fácil de confundir (las dos dicen
  // "copia"), así que se avisa antes de hacer el cambio irreversible desde
  // aquí (se puede volver a enganchar luego con «Abrir desde la nube…», pero
  // trae la versión que haya en la nube en ESE momento, no esta copia local).
  async function onSaveLocalCopy() {
    const ok = await confirmDialog({
      title: 'Desvincular de la nube',
      message: 'Vas a crear una copia local (.scormproj) y a partir de ahora trabajarás en ese archivo, no en la nube: los cambios dejarán de subirse automáticamente. Para volver a la nube más tarde, usa «Abrir desde la nube…» (trae la versión que haya en ese momento, no esta copia local). ¿Continuar?',
      confirmLabel: 'Crear copia y desvincular',
    })
    if (ok) await saveProjectAs()
  }

  return (
    <>
    <header className="ed-toolbar">
      <img className="ed-logo-img" src={logoUrl} alt="SCORMEditor" />

      {/* Identidad del proyecto: título + estado de guardado, agrupados y
          pegados al logo para que quede inequívoco en qué se trabaja y si
          está a salvo. El estado de cuenta (nube) es un concepto aparte —
          va en el bloque de la derecha, junto a los menús globales. */}
      <div className="ed-toolbar-project">
        <span className="ed-course-name" data-tour="course-name">
          <InlineRename value={course.course.title} placeholder="Curso sin título"
            title="Renombrar el curso (título principal del SCORM)"
            onChange={(title) => updateCourseInfo({ title })} />
        </span>
        <button
          className={`ed-docstate ${isCloudMode ? (isStale ? 'is-stale' : isSynced ? 'is-saved' : 'is-dirty') : isBrowserOnly ? 'is-dirty' : (isSaved ? 'is-saved' : 'is-dirty')}`}
          data-tour="docstate"
          disabled={saving || cloudSyncing}
          onClick={() => void onSaveClick()}
          title={
            isCloudMode
              ? (isStale
                ? `Hay una versión más reciente en la nube: alguien ha subido cambios después de tu última sincronización. Pulsa para abrir ☁ Nube y decidir (bajarla, o subir la tuya igualmente).`
                : isSynced
                ? `Sincronizado con la nube («${cloudTitle}»).${cloudLockHolderEmail ? ` ${cloudLockHolderEmail} lo tiene abierto también ahora mismo.` : ''} Ctrl+S para forzar una subida.`
                : `Cambios sin subir a la nube («${cloudTitle}»).${cloudLockHolderEmail ? ` ${cloudLockHolderEmail} lo tiene abierto también ahora mismo.` : ''} Pulsa para subir (Ctrl+S).`)
              : isBrowserOnly
              ? 'Sin guardar en ningún archivo: los cambios solo viven en este navegador (recuperación automática si cierras sin querer), no son portables ni tienen copia fuera de aquí. Pulsa para guardar como archivo .scormproj en tu equipo (Ctrl+S).'
              : (isSaved
                ? `Guardado en tu equipo: ${linkedFileName}. Ctrl+S para volver a guardar.`
                : `Cambios sin guardar en tu equipo (${linkedFileName}). Pulsa para guardar (Ctrl+S). Mientras tanto se conservan automáticamente en este navegador por si cierras sin guardar.`)
          }
        >
          {saving || cloudSyncing ? (
            <>{isCloudMode ? 'Subiendo…' : 'Guardando…'}</>
          ) : isCloudMode ? (
            <><Icon name={isStale ? 'refresh' : 'cloud'} size={12} /> {isStale ? 'Nueva versión' : isSynced ? 'Sincronizado' : 'Sin subir'}</>
          ) : isBrowserOnly ? (
            <><Icon name="dot" size={12} /> Solo en este navegador</>
          ) : (
            <><Icon name={isSaved ? 'folder' : 'dot'} size={12} />{' '}
              {isSaved ? `Guardado en tu equipo · ${linkedFileName}` : `Sin guardar en tu equipo · ${linkedFileName}`}</>
          )}
        </button>
      </div>

      <div className="ed-toolbar-actions">
        <SuspendSizeIndicator />
        <CourseTimeIndicator />
        {isCloudConfigured() && (
          <button
            className={`ed-session-chip ${cloudSession ? 'is-connected' : ''}`}
            data-tour="cloud-chip"
            onClick={() => setSettingsModal('cloud')}
            title={cloudSession ? `Conectado a la nube como ${cloudSession.user.email}. Pulsa para gestionar equipo y proyectos.` : 'Nube: sin conectar. Pulsa para iniciar sesión.'}
          >
            <Icon name="cloud" size={13} /> {cloudSession ? cloudSession.user.email : 'Nube: sin conectar'}
          </button>
        )}

        <input ref={fileRef} type="file" accept=".scormproj,.zip,application/zip" hidden onChange={onImportFile} />
        <div className="ed-menu" ref={menuRef} data-tour="file-menu">
          <button
            className="ed-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {busy ? 'Generando…' : <>Archivo <Icon name="chevron-down" size={12} /></>}
          </button>
          {menuOpen && (
            <div className="ed-menu-list" role="menu">
              <p className={`ed-menu-modeline ${isCloudMode ? 'is-cloud' : 'is-local'}`}>
                {isCloudMode
                  ? <><Icon name="cloud" size={13} /> Nube</>
                  : <><Icon name="folder" size={13} /> Local{linkedFileName ? ` · ${linkedFileName}` : ' · sin guardar todavía'}</>}
              </p>

              {isCloudMode ? (
                <>
                  <button role="menuitem" className="ed-menu-cloud-item" onClick={() => runMenu(() => void onSaveClick())} title="Sube una versión nueva a la nube (Ctrl+S)">
                    <Icon name="cloud" size={13} /> Actualizar en la nube
                  </button>
                  <button role="menuitem" className="ed-menu-cloud-item" onClick={() => runMenu(() => setSettingsModal('cloud'))} title="Elegir otro proyecto de la nube">
                    <Icon name="cloud" size={13} /> Abrir otro proyecto de la nube…
                  </button>
                  <button role="menuitem" className="ed-menu-cloud-item" onClick={() => runMenu(() => setSettingsModal('cloud'))} title="Ver el equipo, cambiar de organización o de rol">
                    <Icon name="cloud" size={13} /> Gestionar nube…
                  </button>
                  <hr className="ed-menu-sep" />
                  <button role="menuitem" onClick={() => runMenu(fsOk ? onOpen : () => fileRef.current?.click())} title="Reemplaza el curso abierto por uno local; deja de estar vinculado a la nube">
                    <Icon name="folder" size={13} /> Abrir proyecto local…
                  </button>
                  <button role="menuitem" onClick={() => runMenu(onNewEmpty)}
                    title="Curso mínimo desde cero: un módulo con la portada, sin recursos">
                    <Icon name="plus" size={13} /> Nuevo (vacío)
                  </button>
                  <button role="menuitem" onClick={() => runMenu(onNewDemo)}>
                    <Icon name="book" size={13} /> Nuevo (demo)
                  </button>
                  {fsOk && (
                    <button role="menuitem" onClick={() => runMenu(() => void onSaveLocalCopy())} title="Crea una copia en un archivo local y desvincula este curso de la nube">
                      <Icon name="copy" size={13} /> Guardar copia local…
                    </button>
                  )}
                  <hr className="ed-menu-sep" />
                </>
              ) : (
                <>
                  {isCloudConfigured() && (
                    <>
                      <button role="menuitem" className="ed-menu-cloud-item" onClick={() => runMenu(() => setSettingsModal('cloud'))} title="Elegir un proyecto guardado en la nube del equipo">
                        <Icon name="cloud" size={13} /> Abrir desde la nube…
                      </button>
                      <button role="menuitem" className="ed-menu-cloud-item" onClick={() => runMenu(() => setSettingsModal('cloud'))} title="Subir este curso a la nube para compartirlo con el equipo">
                        <Icon name="cloud" size={13} /> Subir a la nube…
                      </button>
                      <hr className="ed-menu-sep" />
                    </>
                  )}
                  <button role="menuitem" onClick={() => runMenu(fsOk ? onOpen : () => fileRef.current?.click())} title="Abrir un proyecto .scormproj">
                    <Icon name="folder" size={13} /> Abrir proyecto…
                  </button>
                  <button role="menuitem" onClick={() => runMenu(onNewEmpty)}
                    title="Curso mínimo desde cero: un módulo con la portada, sin recursos">
                    <Icon name="plus" size={13} /> Nuevo (vacío)
                  </button>
                  <button role="menuitem" onClick={() => runMenu(onNewDemo)}>
                    <Icon name="book" size={13} /> Nuevo (demo)
                  </button>
                  <button role="menuitem" onClick={() => runMenu(() => void onSaveClick())} title="Guardar el proyecto (Ctrl+S)">
                    <Icon name="save" size={13} /> Guardar{linkedFileName ? '' : ' proyecto…'}
                  </button>
                  {fsOk && (
                    <button role="menuitem" onClick={() => runMenu(() => void saveProjectAs())} title="Guardar una copia en un archivo nuevo">
                      <Icon name="copy" size={13} /> Guardar como…
                    </button>
                  )}
                  <hr className="ed-menu-sep" />
                </>
              )}

              {orphanCount > 0 && (
                <>
                  <button role="menuitem"
                    onClick={() => runMenu(() => void onPruneOrphans())}
                    title="Elimina del proyecto los archivos que ya no usa ninguna diapositiva, para reducir su tamaño (el SCORM exportado ya los ignora)">
                    <Icon name="trash" size={13} /> Borrar recursos huérfanos ({orphanCount})
                  </button>
                  <hr className="ed-menu-sep" />
                </>
              )}
              <button role="menuitem" className="ed-menu-primary" disabled={busy} onClick={() => runMenu(onExportScorm)}>
                <Icon name="download" size={13} /> {busy ? 'Generando…' : 'Exportar SCORM ZIP'}
              </button>
              <button role="menuitem" disabled={busy} onClick={() => runMenu(() => void onExportElpx())}
                title="Exportar el curso a un paquete .elpx para seguir editándolo en eXeLearning 4.0.1 o posterior">
                <Icon name="code" size={13} /> {busy ? 'Generando…' : 'Exportar a eXeLearning (.elpx)'}
              </button>
              {fsOk && (
                <button role="menuitem" onClick={() => runMenu(() => void downloadProjectCopy())}
                  title={isCloudMode
                    ? 'Descarga una copia de seguridad sin desvincular este curso de la nube'
                    : isBrowserOnly
                    ? 'Descarga una copia de seguridad; el proyecto sigue solo en este navegador'
                    : 'Descarga una copia de seguridad sin tocar el archivo vinculado'}>
                  <Icon name="download" size={13} /> Descargar copia (.scormproj)
                </button>
              )}
              <hr className="ed-menu-sep" />
              <button role="menuitem" className="ed-menu-danger" onClick={() => runMenu(() => void onCloseProject())}
                title="Deja el editor sin ningún proyecto abierto">
                <Icon name="x" size={13} /> Cerrar proyecto
              </button>
            </div>
          )}
        </div>

        <div className="ed-menu" ref={helpMenuRef} data-tour="help-menu">
          <button
            className="ed-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={helpMenuOpen}
            onClick={() => setHelpMenuOpen((o) => !o)}
            title="Manual, tour guiado y atajos de teclado"
          >
            <Icon name="help-circle" size={14} /> Ayuda <Icon name="chevron-down" size={12} />
          </button>
          {helpMenuOpen && (
            <div className="ed-menu-list" role="menu">
              <button role="menuitem" onClick={() => { setHelpMenuOpen(false); setSettingsModal('help') }}
                title="El manual completo de la aplicación, con capturas">
                Manual de usuario
              </button>
              <button role="menuitem" onClick={() => { setHelpMenuOpen(false); startTour() }}
                title="Recorrido interactivo por la interfaz (un minuto)">
                Tour guiado
              </button>
              <hr className="ed-menu-sep" />
              <button role="menuitem" onClick={() => { setHelpMenuOpen(false); setSettingsModal('shortcuts') }}
                title="Lista de atajos de teclado del editor (también con F1)">
                Atajos de teclado
              </button>
            </div>
          )}
        </div>
      </div>

      {importError && <div className="ed-import-error"><Icon name="alert-octagon" size={14} /> {importError}</div>}
    </header>
    {exportProgress && (
      <div className="ed-confirm-backdrop">
        <div className="ed-confirm" role="alertdialog" aria-modal="true" aria-labelledby="ed-export-progress-title">
          <div className="ed-confirm-head">
            <span className="ed-confirm-icon is-info" aria-hidden="true"><Icon name="download" size={24} /></span>
            <h2 className="ed-confirm-title" id="ed-export-progress-title">Exportando SCORM…</h2>
          </div>
          <div className="ed-tts-progress">
            <div className="ed-tts-bar">
              <div className="ed-tts-bar-fill" style={{ width: `${Math.round(exportProgress.percent)}%` }} />
            </div>
            <p>{exportProgress.label}</p>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// Las ventanas de ajustes viven aparte de <Toolbar> (que se oculta con el
// proyecto cerrado, ver App.tsx) porque `WelcomeGate` necesita poder abrir
// «Abrir de la nube» (CloudModal) sin que haga falta el resto de la toolbar.
export function SettingsModals() {
  const settingsModal = useCourseStore((s) => s.settingsModal)
  const setSettingsModal = useCourseStore((s) => s.setSettingsModal)
  return (
    <>
      {settingsModal === 'shortcuts' && <ShortcutsModal onClose={() => setSettingsModal(null)} />}
      {settingsModal === 'course' && <CourseSettingsModal onClose={() => setSettingsModal(null)} />}
      {settingsModal === 'objectives' && <ObjectivesModal onClose={() => setSettingsModal(null)} />}
      {settingsModal === 'appearance' && <AppearanceModal onClose={() => setSettingsModal(null)} />}
      {settingsModal === 'narration' && <NarrationModal onClose={() => setSettingsModal(null)} />}
      {settingsModal === 'help' && <HelpModal onClose={() => setSettingsModal(null)} />}
      {settingsModal === 'cloud' && <CloudModal onClose={() => setSettingsModal(null)} />}
    </>
  )
}

// Deshacer/Rehacer + Ajustes: herramientas ligadas a la EDICIÓN del curso
// (historial de cambios y configuración de contenido), no a la app en
// general — de ahí que vivan en la fila de pestañas (junto a «Editor»,
// «Vista estudiante»…) y no arriba, junto a Archivo/Ayuda.
export function EditTools() {
  const undo = useCourseStore((s) => s.undo)
  const redo = useCourseStore((s) => s.redo)
  const cloudLockHolderEmail = useCourseStore((s) => s.cloudLockHolderEmail)
  const canUndo = useCourseStore((s) => s.past.length > 0) && !cloudLockHolderEmail
  const canRedo = useCourseStore((s) => s.future.length > 0) && !cloudLockHolderEmail
  const setSettingsModal = useCourseStore((s) => s.setSettingsModal)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  useMenuDismiss(settingsMenuOpen, settingsMenuRef, () => setSettingsMenuOpen(false))

  return (
    <div className="ed-tabs-tools">
      <button className="ed-icon-btn" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
        <Icon name="undo" size={16} />
      </button>
      <button className="ed-icon-btn" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Mayús+Z)" aria-label="Rehacer">
        <Icon name="redo" size={16} />
      </button>

      <span className="ed-tabs-divider" aria-hidden="true" />

      <div className="ed-menu" ref={settingsMenuRef} data-tour="settings-menu">
        <button
          className="ed-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={settingsMenuOpen}
          onClick={() => setSettingsMenuOpen((o) => !o)}
          title="Ajustes del curso y de narración"
        >
          <Icon name="settings" size={14} /> Ajustes <Icon name="chevron-down" size={12} />
        </button>
        {settingsMenuOpen && (
          <div className="ed-menu-list" role="menu">
            <button role="menuitem" onClick={() => { setSettingsMenuOpen(false); setSettingsModal('course') }}
              title="Nota mínima, finalización, peso de la nota, navegación…">
              Curso (Finalización)
            </button>
            <button role="menuitem" onClick={() => { setSettingsMenuOpen(false); setSettingsModal('objectives') }}
              title="Ver, renombrar, quitar y añadir objetivos de aprendizaje del curso">
              Objetivos de aprendizaje
            </button>
            <button role="menuitem" onClick={() => { setSettingsMenuOpen(false); setSettingsModal('appearance') }}
              title="Presentación de la carcasa: animaciones…">
              Interfaz (Apariencia)
            </button>
            <button role="menuitem" onClick={() => { setSettingsMenuOpen(false); setSettingsModal('narration') }}
              title="Proveedor/clave de API, voz y generación de audio">
              Narración (Audio IA)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
