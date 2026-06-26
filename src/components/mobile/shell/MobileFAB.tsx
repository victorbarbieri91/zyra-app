'use client'

// MobileFAB — botão flutuante "Horas". Portado de MobileShell.jsx (MobileFAB).

import MobileIcon from '../MobileIcon'

export default function MobileFAB({ onClick, bottom = 96 }: { onClick?: () => void; bottom?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute', bottom, right: 18, zIndex: 30,
        height: 52, padding: '0 22px 0 18px',
        borderRadius: 26, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,#34495e,#46627f)',
        color: '#fff', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 14px 30px -8px rgba(52,73,94,0.55), 0 4px 10px rgba(0,0,0,0.12)',
      }}
    >
      <MobileIcon name="clock" size={18} />
      Horas
    </button>
  )
}
