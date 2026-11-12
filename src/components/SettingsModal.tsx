import { useEffect, useState } from 'react'
import { CourseSettingsSection, AppearanceSection } from './CourseSettingsEditor'
import { NarrationSection } from './TtsPanel'
import { Icon } from './Icon'

/**
 * Ventana (modal) genérica de ajustes: marco + cabecera + cierre (Escape / clic
 * fuera / botón ✕). Si `busy` es true (p. ej. narración generando) no se puede cerrar.
 */
export function SettingsWindow({
  title,
  onClose,
  busy = false,
  wide = false,
  headerExtra,
  children,
}: {
  title: string
  onClose: () => void
  busy?: boolean
  /** Ventana extra ancha (p. ej. el selector de recetas, con tarjetas en grid). */
  wide?: boolean
  /** Contenido opcional entre el título y el botón de cerrar (p. ej. selector de organización + acceso a Equipo en la ventana Nube). */
  headerExtra?: React.ReactNode
  children: React.ReactNode
}) {
  const close = () => { if (!busy) onClose() }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])

  return (
    <div className="ed-modal-backdrop" onMouseDown={close}>
      <div className={`ed-modal ${wide ? 'ed-modal-xl' : 'ed-modal-lg'}`} role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}>
        <header className="ed-modal-head">
          <strong>{title}</strong>
          {headerExtra}
          <button className="ed-modal-x ed-icobtn" onClick={close} disabled={busy} aria-label="Cerrar"><Icon name="x" size={16} /></button>
        </header>
        <div className="ed-modal-body">{children}</div>
      </div>
    </div>
  )
}

/** Ventana «Ajustes del curso (SCORM y finalización)». */
export function CourseSettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <SettingsWindow title="Ajustes del curso (SCORM y finalización)" onClose={onClose}>
      <CourseSettingsSection />
    </SettingsWindow>
  )
}

/** Ventana «Interfaz (Apariencia)»: presentación de la carcasa (animaciones…). */
export function AppearanceModal({ onClose }: { onClose: () => void }) {
  return (
    <SettingsWindow title="Interfaz (Apariencia)" onClose={onClose}>
      <AppearanceSection />
    </SettingsWindow>
  )
}

/** Ventana «Narración por voz (TTS)»; bloquea el cierre mientras genera. */
export function NarrationModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <SettingsWindow title="Narración por voz (TTS)" onClose={onClose} busy={busy}>
      <NarrationSection onBusyChange={setBusy} />
    </SettingsWindow>
  )
}
