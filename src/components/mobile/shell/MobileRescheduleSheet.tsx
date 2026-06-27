'use client'

// MobileRescheduleSheet — folha de reagendamento compartilhada (Home + Agenda).
// 5 atalhos do desktop (Hoje/Amanhã/Daqui a 2 dias/Próxima segunda/Daqui a 7 dias)
// + "Escolher data…" que abre o MobileCalendar (no design mobile).

import { useState } from 'react'
import { addDays, nextMonday } from 'date-fns'
import { mTokens, type MobileTokens } from '../tokens'
import MobileIcon from '../MobileIcon'
import MobileSheet from './MobileSheet'
import MobileCalendar from './MobileCalendar'

export default function MobileRescheduleSheet({ dark, title, subtitle, onClose, onReagendar }: {
  dark: boolean
  title: string
  subtitle?: string
  onClose: () => void
  onReagendar: (d: Date) => void
}) {
  return (
    <MobileSheet dark={dark} onClose={onClose}>
      {(close) => <Body dark={dark} title={title} subtitle={subtitle} onReagendar={onReagendar} close={close} />}
    </MobileSheet>
  )
}

function Body({ dark, title, subtitle, onReagendar, close }: {
  dark: boolean
  title: string
  subtitle?: string
  onReagendar: (d: Date) => void
  close: () => void
}) {
  const t = mTokens(dark)
  const [mode, setMode] = useState<'quick' | 'cal'>('quick')
  const hoje = new Date()
  const opts: { label: string; date: Date }[] = [
    { label: 'Hoje', date: hoje },
    { label: 'Amanhã', date: addDays(hoje, 1) },
    { label: 'Daqui a 2 dias', date: addDays(hoje, 2) },
    { label: 'Próxima segunda', date: nextMonday(hoje) },
    { label: 'Daqui a 7 dias', date: addDays(hoje, 7) },
  ]
  const escolher = (d: Date) => { onReagendar(d); close() }

  if (mode === 'cal') {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button type="button" onClick={() => setMode('quick')} aria-label="Voltar" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '7px 12px 7px 9px', cursor: 'pointer', fontFamily: 'inherit', color: t.secondary, fontSize: 12, fontWeight: 600 }}>
            <span style={{ display: 'flex' }}><MobileIcon name="chevronLeft" size={15} /></span> Voltar
          </button>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: t.primary }}>Escolher data</div>
        </div>
        <MobileCalendar dark={dark} value={null} minDate={hoje} onPick={escolher} />
      </>
    )
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Reagendar</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: t.primary, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: t.secondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {opts.map((o) => (
          <button key={o.label} type="button" onClick={() => escolher(o.date)} style={optBtn(t)}>
            <span style={{ color: t.teal }}><MobileIcon name="calendar" size={17} /></span>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: t.primary }}>{o.label}</span>
            <MobileIcon name="chevronRight" size={15} style={{ color: t.muted }} />
          </button>
        ))}
        <button type="button" onClick={() => setMode('cal')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: `1.5px dashed ${t.border}`, borderRadius: 14, padding: '14px 16px', textAlign: 'left' }}>
          <span style={{ color: t.secondary }}><MobileIcon name="calendar" size={17} /></span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.secondary }}>Escolher data…</span>
          <MobileIcon name="chevronRight" size={15} style={{ color: t.muted }} />
        </button>
      </div>
      <button type="button" onClick={close} style={{ width: '100%', marginTop: 14, height: 50, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, color: t.primary, fontSize: 14.5, fontWeight: 600 }}>Cancelar</button>
    </>
  )
}

function optBtn(t: MobileTokens) {
  return { width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 16px', textAlign: 'left' } as const
}
