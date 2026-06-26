'use client'

// MobileConfirm — diálogo curto de confirmação (ex.: "Descartar lançamento?").
// Modal central simples; tocar fora / Cancelar = onCancel. Não cria entrada de
// histórico própria (é uma camada aninhada e transitória).

import { useEffect, useState } from 'react'
import { mTokens } from '../tokens'

export default function MobileConfirm({
  dark,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  onCancel,
}: {
  dark: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = mTokens(dark)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [])
  return (
    <div
      onClick={onCancel}
      style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(20,26,34,0.5)', opacity: shown ? 1 : 0, transition: 'opacity .2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 340, background: t.card, borderRadius: 20, padding: '22px 20px 16px', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.4)', transform: shown ? 'scale(1)' : 'scale(.94)', opacity: shown ? 1 : 0, transition: 'transform .2s cubic-bezier(.32,.72,0,1), opacity .2s ease' }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{title}</div>
        {message && <div style={{ fontSize: 13.5, color: t.secondary, marginTop: 6, lineHeight: 1.45 }}>{message}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{ height: 48, borderRadius: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#fff', background: destructive ? (dark ? 'linear-gradient(135deg,#a85a5a,#b56a6a)' : 'linear-gradient(135deg,#b56a6a,#9e4848)') : 'linear-gradient(135deg,#34495e,#46627f)' }}
          >{confirmLabel}</button>
          <button
            type="button"
            onClick={onCancel}
            style={{ height: 48, borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: t.primary, background: t.page, border: `1px solid ${t.border}` }}
          >{cancelLabel}</button>
        </div>
      </div>
    </div>
  )
}
