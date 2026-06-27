'use client'

// MobileCalendar — grade mensal simples na linguagem visual mobile (mTokens).
// Navega entre meses, destaca hoje e a data selecionada, desabilita dias antes
// de `minDate`. Tocar num dia chama onPick(date).

import { useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, isBefore, isSameDay, startOfDay, startOfMonth } from 'date-fns'
import { mTokens, type MobileTokens } from '../tokens'
import MobileIcon from '../MobileIcon'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function MobileCalendar({ dark, value, onPick, minDate }: {
  dark: boolean
  value?: Date | null
  onPick: (d: Date) => void
  minDate?: Date
}) {
  const t = mTokens(dark)
  const [cursor, setCursor] = useState<Date>(startOfMonth(value || new Date()))
  const min = minDate ? startOfDay(minDate) : null

  const first = startOfMonth(cursor)
  const days = eachDayOfInterval({ start: first, end: endOfMonth(cursor) })
  const leading = first.getDay() // 0=Dom
  const cells: (Date | null)[] = [...Array(leading).fill(null), ...days]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" onClick={() => setCursor(addMonths(cursor, -1))} style={navBtn(t)} aria-label="Mês anterior">
          <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><MobileIcon name="chevronRight" size={16} /></span>
        </button>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.primary, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{MESES[cursor.getMonth()]} {cursor.getFullYear()}</div>
        <button type="button" onClick={() => setCursor(addMonths(cursor, 1))} style={navBtn(t)} aria-label="Próximo mês">
          <MobileIcon name="chevronRight" size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
        {WEEKDAYS.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.04em' }}>{w}</div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const disabled = min ? isBefore(d, min) : false
          const selected = value ? isSameDay(d, value) : false
          const isToday = isSameDay(d, new Date())
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPick(d)}
              style={{
                height: 38, borderRadius: 10, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
                border: isToday && !selected ? `1px solid ${t.teal}` : '1px solid transparent',
                background: selected ? 'linear-gradient(135deg,#34495e,#46627f)' : 'transparent',
                color: selected ? '#fff' : disabled ? t.muted : t.primary,
                opacity: disabled ? 0.4 : 1, fontSize: 13.5, fontWeight: selected || isToday ? 700 : 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{d.getDate()}</button>
          )
        })}
      </div>
    </div>
  )
}

function navBtn(t: MobileTokens) {
  return { width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', background: t.card, border: `1px solid ${t.border}`, color: t.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const
}
