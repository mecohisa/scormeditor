import { create } from 'zustand'
import type { Issue } from '../validation/validators'

/**
 * Diálogo de confirmación promisificado. Sustituye a `window.confirm` por un modal
 * propio y bonito: `const ok = await confirmDialog({ ... })`. El modal se renderiza
 * una sola vez en `App` (`ConfirmModal`).
 */
export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Tercer botón opcional, a la izquierda de Aceptar (p. ej. «Descartar y
   *  cerrar» en un flujo de 3 vías Guardar/Descartar/Cancelar). Con esto
   *  presente, usar `confirmDialogTri` en vez de `confirmDialog` para
   *  distinguir las tres resoluciones. */
  thirdLabel?: string
  /** El tercer botón es destructivo (rojo, como «Descartar y cerrar»). Por
   *  defecto sale neutro, con el mismo aspecto que Cancelar. */
  thirdDanger?: boolean
  danger?: boolean
  /** Aviso solo-informativo: oculta el botón Cancelar (queda solo «Aceptar»). */
  hideCancel?: boolean
  /** Lista de issues del validador bajo el mensaje (p. ej. errores de
   *  accesibilidad al exportar). Cada uno enlaza a su superficie de edición:
   *  pulsarlo cierra el diálogo como «Cancelar» y salta allí. Con lista, Enter
   *  no confirma (el foco empieza en Cancelar): confirmar exige un clic. */
  issues?: Issue[]
}

/** Resolución cruda del modal: 'confirm' (Aceptar), 'cancel' (Cancelar/Esc/fuera)
 *  o 'third' (el botón opcional `thirdLabel`). `confirmDialog` la simplifica a
 *  booleano para no romper las ~10 llamadas existentes de 2 vías. */
export type ConfirmResult = 'confirm' | 'cancel' | 'third'

interface ConfirmStore {
  current: (ConfirmOptions & { id: number }) | null
  resolver: ((v: ConfirmResult) => void) | null
  request: (opts: ConfirmOptions) => Promise<ConfirmResult>
  resolve: (v: ConfirmResult) => void
}

let counter = 0

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  current: null,
  resolver: null,
  request: (opts) =>
    new Promise<ConfirmResult>((resolve) => {
      // Si hubiera otro pendiente, se cancela.
      const prev = get().resolver
      if (prev) prev('cancel')
      set({ current: { ...opts, id: ++counter }, resolver: resolve })
    }),
  resolve: (v) => {
    const r = get().resolver
    set({ current: null, resolver: null })
    if (r) r(v)
  },
}))

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(opts).then((v) => v === 'confirm')
}

/** Como `confirmDialog`, pero para flujos de 3 vías (p. ej. Guardar/Descartar/
 *  Cancelar al cerrar con cambios sin guardar): exige `thirdLabel` y devuelve
 *  la resolución cruda en vez de aplanarla a booleano. */
export function confirmDialogTri(opts: ConfirmOptions & { thirdLabel: string }): Promise<ConfirmResult> {
  return useConfirmStore.getState().request(opts)
}
