'use client'

// MobileScreenHeader — cabeçalho reutilizável das telas mobile (lista/detalhe).
// Título em Fraunces (serif). Safe-area no topo. Voltar opcional + ações à direita.

import type { ReactNode } from 'react'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'

export default function MobileScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  right,
  dark,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
  dark: boolean
}) {
  const t = mTokens(dark)
  return (
    <div
      style={{
        flexShrink: 0, background: t.card, borderBottom: `1px solid ${t.border}`,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel ? `Voltar para ${backLabel}` : 'Voltar'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, margin: '0 0 10px 14px',
            background: t.page, border: `1px solid ${t.border}`, borderRadius: 11,
            padding: '8px 14px 8px 10px', cursor: 'pointer', fontFamily: 'inherit',
            color: t.secondary, fontSize: 12.5, fontWeight: 600,
          }}
        >
          <span style={{ display: 'flex' }}>
            <MobileIcon name="chevronLeft" size={16} />
          </span>
          {backLabel || 'Voltar'}
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 18px 14px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 23, fontWeight: 600, color: t.primary, letterSpacing: '-0.02em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 11.5, color: t.secondary, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  )
}
