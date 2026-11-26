import { useEffect, useRef } from 'react'
import { useConfirmStore } from '../store/confirm'
import { Icon } from './Icon'
import { IssueItem } from './IssueList'

/**
 * Modal de confirmación (centrado, con Aceptar/Cancelar). Se monta una vez en
 * `App` y muestra lo que pida `confirmDialog(...)`. Enter = aceptar, Esc = cancelar.
 */
export function ConfirmModal() {
  const current = useConfirmStore((s) => s.current)
  const resolve = useConfirmStore((s) => s.resolve)
  const okRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const withIssues = !!current?.issues?.length

  useEffect(() => {
    if (!current) return
    // Con lista de issues, el foco va a Cancelar y Enter no confirma: «Exportar
    // igualmente» tiene que ser una decisión explícita, no un Enter de inercia.
    ;(withIssues && cancelRef.current ? cancelRef.current : okRef.current)?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); resolve('cancel') }
      else if (e.key === 'Enter' && !withIssues) { e.preventDefault(); resolve('confirm') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, resolve, withIssues])

  if (!current) return null

  return (
    <div className="ed-confirm-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) resolve('cancel') }}>
      <div className={`ed-confirm${withIssues ? ' ed-confirm-wide' : ''}`} role="alertdialog" aria-modal="true"
        aria-labelledby="ed-confirm-title" aria-describedby="ed-confirm-msg">
        <div className="ed-confirm-head">
          <span className={`ed-confirm-icon ${current.danger ? 'is-danger' : 'is-info'}`} aria-hidden="true">
            <Icon name={current.danger ? 'alert-triangle' : 'info'} size={24} />
          </span>
          <h2 className="ed-confirm-title" id="ed-confirm-title">{current.title || 'Confirmar'}</h2>
        </div>
        <p className="ed-confirm-msg" id="ed-confirm-msg">{current.message}</p>
        {withIssues && (
          <ul className="ed-issues ed-confirm-issues">
            {current.issues!.map((i, k) => <IssueItem key={k} issue={i} onNavigate={() => resolve('cancel')} />)}
          </ul>
        )}
        <div className="ed-confirm-actions">
          {!current.hideCancel && (
            <button type="button" ref={cancelRef} className="ed-confirm-cancel" onClick={() => resolve('cancel')}>
              {current.cancelLabel || 'Cancelar'}
            </button>
          )}
          {current.thirdLabel && (
            <button type="button" className={current.thirdDanger ? 'ed-danger' : 'ed-confirm-cancel'}
              onClick={() => resolve('third')}>
              {current.thirdLabel}
            </button>
          )}
          <button type="button" ref={okRef} className={current.danger ? 'ed-danger' : 'ed-primary'}
            onClick={() => resolve('confirm')}>
            {current.confirmLabel || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  )
}
