/* =============================================================================
 * CalloutNode — nodo TipTap para los bloques destacados "::: tipo … :::".
 * attrs: ctype (tip|info|warn|important|fact|reflect|summary|case|custom), color, icon,
 * title (los tres últimos solo aplican a "custom"). Contenido: bloque (párrafos,
 * listas, encabezados, imágenes — nunca otro callout, igual que la carcasa no
 * anida ::: dentro de :::).
 * ===========================================================================*/
import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { useState } from 'react'
import { Icon } from '../Icon'
import { loadPresets, savePresets, PALETTE, type CustomBlockPreset } from '../../store/customBlocks'
import { CALLOUT_META, CALLOUT_ORDER, HEX_RE, STRUCTURED_BLOCKS, STRUCTURED_ORDER, calloutColor } from './calloutMeta'
import { CustomBlockPanel } from './CustomBlockPanel'

export interface CalloutAttrs {
  ctype: string
  color: string
  icon: string
  title: string
}

function CalloutView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as CalloutAttrs
  const [editingCustom, setEditingCustom] = useState(false)
  const [draft, setDraft] = useState({ title: attrs.title, icon: attrs.icon, color: HEX_RE.test(attrs.color) ? attrs.color : PALETTE[0].value })
  const [presets, setPresets] = useState<CustomBlockPreset[]>(() => loadPresets())

  const meta = CALLOUT_META[attrs.ctype]
  const color = calloutColor(attrs.ctype, attrs.color)
  const isCustom = attrs.ctype === 'custom'
  const match = isCustom
    ? presets.find((p) => p.color.toLowerCase() === attrs.color.toLowerCase() && p.icon === attrs.icon && p.title === attrs.title)
    : null
  const selectValue = isCustom ? (match ? `preset:${match.id}` : 'custom') : attrs.ctype

  function openCustomEdit() {
    setDraft({ title: attrs.title, icon: attrs.icon, color: HEX_RE.test(attrs.color) ? attrs.color : PALETTE[0].value })
    setEditingCustom(true)
  }

  function applyDraft(save: boolean) {
    const clean = { title: draft.title.trim(), icon: draft.icon.trim(), color: draft.color }
    if (save && (clean.title || clean.icon)) {
      const next = [{ id: `c-${Date.now().toString(36)}`, ...clean }, ...presets].slice(0, 20)
      setPresets(next)
      savePresets(next)
    }
    updateAttributes({ ctype: 'custom', ...clean })
    setEditingCustom(false)
  }

  function onSelectChange(value: string) {
    if (value === 'custom') {
      openCustomEdit()
      return
    }
    if (value.startsWith('preset:')) {
      const p = presets.find((x) => x.id === value.slice('preset:'.length))
      if (!p) return
      updateAttributes({ ctype: 'custom', color: p.color, icon: p.icon, title: p.title })
      return
    }
    updateAttributes({ ctype: value, color: '', icon: '', title: '' })
  }

  // Quita el formato de bloque conservando el contenido: sube los hijos al
  // nivel del documento donde estaba el callout (equivalente a "unwrapBlock").
  function unwrap() {
    const pos = getPos()
    if (typeof pos !== 'number') return
    const { state, view } = editor
    const nodeSize = node.nodeSize
    const slice = node.content
    view.dispatch(state.tr.replaceWith(pos, pos + nodeSize, slice))
  }

  return (
    <NodeViewWrapper className="ed-callout-node" style={{ ['--cm-callout-color' as string]: color }}>
      <div className="ed-callout-head" contentEditable={false}>
        {isCustom
          ? (attrs.icon || attrs.title) && (
              <span className="ed-callout-title">
                {attrs.icon && <span aria-hidden="true">{attrs.icon}</span>} {attrs.title}
              </span>
            )
          : (
              <span className="ed-callout-title">
                <span aria-hidden="true">{meta?.icon}</span> {meta?.label}
              </span>
            )}
        <div className="ed-callout-controls">
          <select value={selectValue} onChange={(e) => onSelectChange(e.target.value)} title="Cambiar el tipo del bloque">
            <optgroup label="Estándar">
              {selectValue === 'case' && <option value="case">🧪 Caso práctico (retirado)</option>}
              {CALLOUT_ORDER.map((t) => (
                <option key={t} value={t}>{`${CALLOUT_META[t].icon} ${CALLOUT_META[t].label}`}</option>
              ))}
            </optgroup>
            <optgroup label="Con estructura">
              {STRUCTURED_ORDER.map((t) => (
                <option key={t} value={t}>{`${CALLOUT_META[t].icon} ${CALLOUT_META[t].label}`}</option>
              ))}
            </optgroup>
            {presets.length > 0 && (
              <optgroup label="Personalizados guardados">
                {presets.map((p) => (
                  <option key={p.id} value={`preset:${p.id}`}>{`${p.icon} ${p.title}`.trim() || 'Personalizado'}</option>
                ))}
              </optgroup>
            )}
            <option value="custom">＋ Personalizado a medida…</option>
          </select>
          {isCustom && (
            <button type="button" onClick={openCustomEdit} title="Editar color, icono y título">
              <Icon name="pencil" size={13} />
            </button>
          )}
          <button type="button" onClick={unwrap} title="Quitar el formato de bloque y dejar el texto plano">
            <Icon name="ban" size={13} />
          </button>
        </div>
      </div>

      {STRUCTURED_BLOCKS[attrs.ctype] && (
        <p className="ed-callout-hint" contentEditable={false}>{STRUCTURED_BLOCKS[attrs.ctype].hint}</p>
      )}

      {editingCustom && (
        <div contentEditable={false}>
          <CustomBlockPanel mode="edit" draft={draft} setDraft={setDraft}
            onCancel={() => setEditingCustom(false)} onApply={applyDraft} />
        </div>
      )}

      <NodeViewContent className="ed-callout-body" />
    </NodeViewWrapper>
  )
}

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      ctype: { default: 'tip' },
      color: { default: '' },
      icon: { default: '' },
      title: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },

  // Enter en un párrafo VACÍO que es el último hijo del bloque saca el cursor
  // fuera de él (convención habitual: doble Enter para "salir" de un bloque
  // contenedor), ya que "isolating" impide el liftEmptyBlock por defecto.
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor
        const { $from, empty } = state.selection
        if (!empty) return false
        const parent = $from.parent
        if (parent.type.name !== 'paragraph' || parent.content.size > 0) return false
        const grandParent = $from.node(-1)
        if (!grandParent || grandParent.type.name !== this.name || grandParent.childCount < 2) return false
        if ($from.index(-1) !== grandParent.childCount - 1) return false

        const paraStart = $from.before()
        const paraEnd = $from.after()
        const afterCallout = $from.after(-1)
        return this.editor
          .chain()
          .command(({ tr }) => {
            tr.delete(paraStart, paraEnd)
            const insertPos = tr.mapping.map(afterCallout)
            tr.insert(insertPos, state.schema.nodes.paragraph.create())
            tr.setSelection(TextSelection.create(tr.doc, insertPos + 1))
            return true
          })
          .run()
      },
    }
  },
})
