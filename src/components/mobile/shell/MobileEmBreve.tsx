'use client'

// MobileEmBreve — placeholder elegante para módulos sem tela mobile ainda.

import { mTokens } from '../tokens'
import MobileIcon from '../MobileIcon'

export default function MobileEmBreve({
  dark,
  titulo,
  descricao,
  icon = 'sparkle',
  onBack,
}: {
  dark: boolean
  titulo: string
  descricao?: string
  icon?: string
  onBack?: () => void
}) {
  const t = mTokens(dark)
  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '40px 32px', textAlign: 'center', background: t.page,
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: t.tealSoft, color: t.teal,
        }}
      >
        <MobileIcon name={icon} size={28} />
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 600, color: t.primary, letterSpacing: '-0.01em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
          {titulo}
        </div>
        <div style={{ fontSize: 13, color: t.secondary, marginTop: 6, lineHeight: 1.45, maxWidth: 260 }}>
          {descricao || 'Esta área ainda está em desenvolvimento para o celular. Em breve por aqui.'}
        </div>
      </div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: 4, height: 44, padding: '0 22px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
            background: t.card, border: `1px solid ${t.border}`, color: t.primary, fontSize: 14, fontWeight: 600,
          }}
        >
          Voltar ao início
        </button>
      )}
    </div>
  )
}
