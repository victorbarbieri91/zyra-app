'use client'

// MobileSheet — bottom sheet genérico (scrim + folha que sobe). Animações de
// MobileShell.jsx (dcScrimIn / dcSheetUp, injetadas em MobileApp).

import type { ReactNode } from 'react'
import { mTokens } from '../tokens'

export default function MobileSheet({
  dark,
  onClose,
  children,
}: {
  dark: boolean
  onClose: () => void
  children: ReactNode
}) {
  const t = mTokens(dark)
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(20,26,34,0.45)', animation: 'dcScrimIn .2s ease',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{
          background: t.page, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '10px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)',
          animation: 'dcSheetUp .28s cubic-bezier(.32,.72,0,1)',
          boxShadow: '0 -10px 40px -12px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 2, background: t.border, margin: '0 auto 14px' }} />
        {children}
      </div>
    </div>
  )
}
