'use client'

// MobileSection — seção expansível (acordeão). Portado de MobileShell.jsx.

import type { ReactNode } from 'react'
import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'

export default function MobileSection({
  title,
  summary,
  open,
  onToggle,
  dark,
  children,
}: {
  title: string
  summary?: string
  open: boolean
  onToggle: () => void
  dark: boolean
  children: ReactNode
}) {
  const t = mTokens(dark)
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', background: 'transparent',
          display: 'flex', alignItems: 'center', gap: 10, padding: '15px 16px',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em' }}>{title}</div>
          {summary && <div style={{ fontSize: 11.5, color: t.secondary, marginTop: 2 }}>{summary}</div>}
        </div>
        <span
          style={{
            color: t.muted, flexShrink: 0, display: 'flex',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s ease',
          }}
        >
          <MobileIcon name="chevronDown" size={18} />
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${t.borderSubtle}` }}>
          <div style={{ paddingTop: 14, animation: 'dcExpandIn .28s ease' }}>{children}</div>
        </div>
      )}
    </div>
  )
}
