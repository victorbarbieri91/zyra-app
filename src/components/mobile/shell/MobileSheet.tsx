'use client'

// MobileSheet — bottom sheet canônico do mobile.
// - Entra (sobe + scrim fade-in) e SAI animado (desce + fade-out) via useDismissable.
// - Tocar fora (scrim) fecha; BACK do celular fecha; ARRASTAR pra baixo (grabber) fecha.
// - Variantes: padrão (altura automática) e `tall` (até 92% da tela, corpo rolável + footer fixo).

import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import { useDismissable } from '../useDismissable'

export const SHEET_Z = 60

type SheetChild = ReactNode | ((close: () => void) => ReactNode)

export default function MobileSheet({
  dark,
  onClose,
  children,
  footer,
  tall,
  showClose,
}: {
  dark: boolean
  onClose: () => void
  children: SheetChild
  footer?: SheetChild
  tall?: boolean
  showClose?: boolean
}) {
  const t = mTokens(dark)
  const { closing, requestClose } = useDismissable(onClose)
  const render = (x: SheetChild): ReactNode => (typeof x === 'function' ? (x as (c: () => void) => ReactNode)(requestClose) : x)

  const [shown, setShown] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [])

  // arrastar pra baixo (swipe-to-dismiss) a partir do grabber
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const startYRef = useRef(0)

  const onPointerDown = (e: ReactPointerEvent) => {
    draggingRef.current = true
    setDragging(true)
    startYRef.current = e.clientY
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current) return
    const dy = e.clientY - startYRef.current
    setDrag(dy > 0 ? dy : 0)
  }
  const endDrag = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (drag > 100) requestClose()
    else setDrag(0)
  }

  const open = shown && !closing
  const translateY = closing ? '100%' : dragging ? `${drag}px` : open ? '0px' : '100%'
  const sheetTransition = dragging ? 'none' : 'transform .28s cubic-bezier(.32,.72,0,1)'

  return (
    <div
      onClick={requestClose}
      style={{
        position: 'absolute', inset: 0, zIndex: SHEET_Z,
        background: 'rgba(20,26,34,0.45)', opacity: open ? 1 : 0,
        transition: 'opacity .24s ease',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{
          position: 'relative', background: t.page,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          transform: `translateY(${translateY})`, transition: sheetTransition,
          boxShadow: '0 -10px 40px -12px rgba(0,0,0,0.3)',
          ...(tall ? { maxHeight: '92%', display: 'flex', flexDirection: 'column' } : {}),
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ flexShrink: 0, padding: '10px 0 8px', cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 38, height: 4, borderRadius: 2, background: t.border, margin: '0 auto' }} />
        </div>

        {showClose && (
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar"
            style={{ position: 'absolute', right: 14, top: 12, width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer', background: t.card, color: t.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
          >
            <MobileIcon name="close" size={16} />
          </button>
        )}

        {tall ? (
          <>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px 16px' }}>{render(children)}</div>
            {footer != null && <div style={{ flexShrink: 0 }}>{render(footer)}</div>}
          </>
        ) : (
          <div style={{ padding: '4px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>{render(children)}</div>
        )}
      </div>
    </div>
  )
}
