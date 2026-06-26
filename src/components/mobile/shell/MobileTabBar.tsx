'use client'

// MobileTabBar — barra inferior (Início · Agenda · Processos · Mais).
// Portado de MobileShell.jsx (MobileTabBar). Safe-area no rodapé.

import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'

export type MobileTab = 'inicio' | 'agenda' | 'processos' | 'mais'

const ITEMS: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'inicio', icon: 'dashboard', label: 'Início' },
  { id: 'agenda', icon: 'calendar', label: 'Agenda' },
  { id: 'processos', icon: 'scale', label: 'Processos' },
  { id: 'mais', icon: 'more', label: 'Mais' },
]

export default function MobileTabBar({
  active = 'inicio',
  dark,
  onNavigate,
}: {
  active?: MobileTab
  dark: boolean
  onNavigate?: (id: MobileTab) => void
}) {
  const t = mTokens(dark)
  return (
    <nav
      style={{
        flexShrink: 0,
        background: dark ? 'rgba(15,20,26,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderTop: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
        padding: '9px 8px calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      {ITEMS.map((it) => {
        const on = it.id === active
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onNavigate?.(it.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: on ? (dark ? '#e8ecf2' : '#34495e') : t.muted,
              cursor: 'pointer', minWidth: 56, background: 'transparent', border: 'none',
              fontFamily: 'inherit', padding: 0,
            }}
          >
            <MobileIcon name={it.icon} size={21} stroke={on ? 2.2 : 1.9} />
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '0.01em' }}>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
