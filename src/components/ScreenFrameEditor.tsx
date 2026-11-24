import { useState } from 'react'
import { PALETTE } from '../store/customBlocks'
import { IconPicker } from './tiptap/IconPicker'
import type { Screen } from '../schema/course.schema'

type Frame = NonNullable<Screen['frame']>

/** Marcos habituales: un clic deja color, icono y rótulo puestos (luego se pueden cambiar). */
const PRESETS: (Frame & { name: string })[] = [
  { name: '🧪 Actividad práctica', color: '#F4C910', icon: '🧪', label: 'Actividad práctica' },
  { name: '📝 Síntesis', color: '#6DC3C0', icon: '📝', label: 'Síntesis' },
  { name: '💭 Reflexiona', color: '#F4C910', icon: '💭', label: 'Reflexiona' },
]

/**
 * «Marco de color» de la pantalla (screen.frame): la carcasa envuelve todo el contenido
 * en una caja de ese color con un rótulo opcional. Sin color = sin marco (el campo se
 * quita del course.json para que las pantallas sin marco no cambien).
 */
export function ScreenFrameEditor({ frame, onChange }: { frame: Screen['frame']; onChange: (f: Screen['frame']) => void }) {
  const [showIcons, setShowIcons] = useState(false)
  const f: Frame = { color: '', label: '', icon: '', ...(frame || {}) }
  const set = (p: Partial<Frame>) => {
    const n = { ...f, ...p }
    onChange(n.color ? n : undefined)
  }
  return (
    <div className="ed-frame">
      <p className="ed-hint">
        Envuelve todo el contenido de la pantalla (texto, imagen e interacción) en una caja de color. Pon el
        mismo marco a varias pantallas seguidas para que se lean como una sola unidad.
      </p>
      <div className="ed-rta-swatches">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" onClick={() => onChange({ color: p.color, label: p.label, icon: p.icon })}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="ed-rta-swatches">
        {PALETTE.map((c) => (
          <button key={c.value} type="button" title={c.label}
            className={`ed-rta-swatch ${f.color.toLowerCase() === c.value.toLowerCase() ? 'is-on' : ''}`}
            style={{ background: c.value }} onClick={() => set({ color: c.value })} />
        ))}
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : '#f4c910'} aria-label="Color personalizado del marco"
          onChange={(e) => set({ color: e.target.value })} />
        {f.color && <button type="button" onClick={() => onChange(undefined)}>Quitar marco</button>}
      </div>
      {f.color && (
        <div className="ed-rta-custom-row">
          <IconPicker value={f.icon} onChange={(icon) => set({ icon })} open={showIcons} onOpenChange={setShowIcons} />
          <label className="ed-field">
            <span>Rótulo (opcional)</span>
            <input value={f.label} placeholder="p. ej. Actividad práctica" onChange={(e) => set({ label: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  )
}
