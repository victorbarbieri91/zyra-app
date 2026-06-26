'use client'

// MobileFullScreen — wrapper das telas full-screen (Registrar Horas / Nova Tarefa).
// - Entra/sai deslizando; BACK do celular fecha (via useDismissable).
// - Confirmar descarte: se `isDirty`, ao tentar fechar abre MobileConfirm.
// - Passa pros filhos (render-prop) `close` (fecha com guard) e `forceClose`
//   (fecha ignorando o guard — ex.: após salvar com sucesso).

import { useEffect, useState, type ReactNode } from 'react'
import { mTokens } from '../tokens'
import { useDismissable } from '../useDismissable'
import MobileConfirm from './MobileConfirm'

export const FULLSCREEN_Z = 70

export default function MobileFullScreen({
  dark,
  isDirty,
  confirmTitle,
  confirmMessage,
  onClose,
  children,
}: {
  dark: boolean
  isDirty?: boolean
  confirmTitle?: string
  confirmMessage?: string
  onClose: () => void
  children: (api: { close: () => void; forceClose: () => void }) => ReactNode
}) {
  const t = mTokens(dark)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closing, requestClose, forceClose } = useDismissable(onClose, {
    guard: () => !!isDirty,
    onBlocked: () => setConfirmOpen(true),
  })
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [])
  const open = shown && !closing
  return (
    <>
      <div
        style={{ position: 'absolute', inset: 0, zIndex: FULLSCREEN_Z, background: t.page, display: 'flex', flexDirection: 'column', transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .3s cubic-bezier(.32,.72,0,1)' }}
      >
        {children({ close: requestClose, forceClose })}
      </div>
      {confirmOpen && (
        <MobileConfirm
          dark={dark}
          title={confirmTitle || 'Descartar alterações?'}
          message={confirmMessage || 'O que você preencheu será perdido.'}
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          destructive
          onConfirm={() => { setConfirmOpen(false); forceClose() }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  )
}
