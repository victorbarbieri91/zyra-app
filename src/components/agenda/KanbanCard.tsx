'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { Check, Scale, Users, ArrowUpRight, Flag, MapPin, Folder, Calendar, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { differenceInCalendarDays } from 'date-fns'
import { PRIORIDADE_COR } from './CalendarEventMiniCard'

// Card V4 do Kanban (apresentacional). Os wrappers (KanbanTaskCard/KanbanAgendaCard)
// cuidam do drag (@dnd-kit) e do mapeamento dos dados.

type Kind = 'tarefa' | 'audiencia' | 'compromisso'

const KB_TIPO: Record<Kind, { label: string; Icon: LucideIcon; chip: string; text: string }> = {
  tarefa: { label: 'Tarefa', Icon: Check, chip: 'bg-[#edf1f7] dark:bg-[#415a7e]/[0.20]', text: 'text-[#415a7e] dark:text-[#9bb3d4]' },
  audiencia: { label: 'Audiência', Icon: Scale, chip: 'bg-[#f9ebe6] dark:bg-[#a85a3e]/[0.20]', text: 'text-[#a85a3e] dark:text-[#e0a085]' },
  compromisso: { label: 'Compromisso', Icon: Users, chip: 'bg-[#e8f5f5] dark:bg-[#3f7376]/[0.20]', text: 'text-[#3f7376] dark:text-[#7fb8ba]' },
}
const PRIOR_LABEL: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

function prazoInfo(prazo: string) {
  const d = parseDBDate(prazo)
  const dias = differenceInCalendarDays(d, new Date())
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const tone: 'danger' | 'warning' | 'calm' = dias <= 2 ? 'danger' : dias <= 7 ? 'warning' : 'calm'
  return { data: `${dd}/${mm}/${d.getFullYear()}`, dataCurta: `${dd}/${mm}`, tone }
}

const AVATAR_CORES = ['#34495e', '#46627f', '#3f7376', '#6b9e84', '#8a6438', '#a85a3e', '#415a7e']
function avatarCor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_CORES[h % AVATAR_CORES.length]
}
function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/)
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function Meta({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-[12px] text-[#5a6775] dark:text-[#8a97a8] leading-snug min-w-0">
      <Icon className="w-3 h-3 text-[#9aa1a8] dark:text-[#5a6675] flex-shrink-0 mt-0.5" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

export interface KanbanCardProps {
  kind: Kind
  titulo: string
  done?: boolean
  prioridade?: string | null
  hora?: string | null
  prazoFatal?: string | null
  processo?: string | null
  partes?: string | null
  pasta?: string | null
  vinculoHref?: string | null
  local?: string | null
  responsaveis?: string[]
  dataLabel?: string
  onOpen?: () => void
  // drag (vindo do useDraggable no wrapper)
  dragRef?: (el: HTMLElement | null) => void
  dragStyle?: CSSProperties
  dragHandle?: Record<string, unknown>
  dragging?: boolean
}

export default function KanbanCard({
  kind,
  titulo,
  done,
  prioridade,
  hora,
  prazoFatal,
  processo,
  partes,
  pasta,
  vinculoHref,
  local,
  responsaveis = [],
  dataLabel,
  onOpen,
  dragRef,
  dragStyle,
  dragHandle,
  dragging,
}: KanbanCardProps) {
  const tipo = KB_TIPO[kind]
  const prazo = prazoFatal ? prazoInfo(prazoFatal) : null
  const stop = (e: React.PointerEvent) => e.stopPropagation()
  const open = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpen?.()
  }

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      {...dragHandle}
      className={cn(
        'group bg-white dark:bg-[#151e2b] border rounded-[12px] p-3 flex flex-col gap-2.5 cursor-grab active:cursor-grabbing select-none',
        'border-[#e6e3da] dark:border-[#253345] hover:border-[#d4cfc2] dark:hover:border-[#34465c]',
        'transition-[box-shadow,border-color,opacity] hover:shadow-[0_8px_20px_-12px_rgba(15,23,42,0.32)]',
        dragging && 'opacity-40',
      )}
    >
      {/* topo: tipo + prioridade/hora · prazo fatal + abrir */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('inline-flex items-center gap-1 h-[20px] px-2 rounded-md text-[10.5px] font-bold whitespace-nowrap', tipo.chip, tipo.text)}>
            <tipo.Icon className="w-[11px] h-[11px]" />
            {tipo.label}
          </span>
          {kind === 'tarefa' && prioridade && PRIORIDADE_COR[prioridade] && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap" style={{ color: PRIORIDADE_COR[prioridade] }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORIDADE_COR[prioridade] }} />
              {PRIOR_LABEL[prioridade] || prioridade}
            </span>
          )}
          {kind !== 'tarefa' && hora && (
            <span className="font-mono text-[11.5px] font-bold text-[#5a6775] dark:text-[#8a97a8] tracking-[-0.02em]">{hora}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {prazo && (
            <span
              title={`Prazo fatal ${prazo.data}`}
              className={cn(
                'inline-flex items-center gap-1 h-[20px] px-1.5 rounded-md text-[10.5px] font-bold whitespace-nowrap',
                prazo.tone === 'danger' && 'text-[#a85a3e] dark:text-[#e0a085] bg-[#f9ebe6] dark:bg-[#a85a3e]/[0.18]',
                prazo.tone === 'warning' && 'text-[#8a6438] dark:text-[#d4a574] bg-[#f7f0e7] dark:bg-[#8a6438]/[0.18]',
                prazo.tone === 'calm' && 'text-[#5a6775] dark:text-[#8a97a8] bg-[#f1ede2] dark:bg-[#1d2a3c]',
              )}
            >
              <Flag className="w-2.5 h-2.5" />
              {prazo.dataCurta}
            </span>
          )}
          <button
            type="button"
            onClick={open}
            onPointerDown={stop}
            title="Abrir"
            className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-[#3f7376] dark:text-[#9fc7c9] bg-[#e8f5f5] dark:bg-[#89bcbe]/[0.16] hover:bg-[#d6eded] dark:hover:bg-[#89bcbe]/[0.28] transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* título (faz parte da área de arrastar; abrir é pelo botão dedicado) */}
      <div
        className={cn(
          'text-[13.5px] font-semibold leading-[1.34] tracking-[-0.01em] [text-wrap:pretty]',
          done ? 'text-[#9aa1a8] dark:text-[#5a6675] line-through' : 'text-[#2c3e50] dark:text-[#edf1f7]',
        )}
      >
        {titulo}
      </div>

      {/* vínculo (CNJ ou pasta) + partes + local */}
      {processo ? (
        <Meta Icon={Scale}>
          {vinculoHref ? (
            <Link
              href={vinculoHref}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="font-mono text-[12px] text-[#89bcbe] font-medium hover:underline"
            >
              {processo}
            </Link>
          ) : (
            <span className="font-mono text-[12px] text-[#89bcbe] font-medium">{processo}</span>
          )}
        </Meta>
      ) : pasta ? (
        <Meta Icon={Folder}>
          {vinculoHref ? (
            <Link
              href={vinculoHref}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="hover:underline hover:text-[#3f7376] dark:hover:text-[#9fc7c9]"
            >
              {pasta}
            </Link>
          ) : (
            pasta
          )}
        </Meta>
      ) : null}
      {partes && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#9aa1a8] dark:text-[#5a6675] leading-snug min-w-0">
          <Users className="w-[11px] h-[11px] text-[#9aa1a8] dark:text-[#5a6675] flex-shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">{partes}</span>
        </div>
      )}
      {local && <Meta Icon={MapPin}>{local}</Meta>}

      {/* rodapé: responsáveis · data */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#f0ede3] dark:border-[#253345]">
        <div className="flex">
          {responsaveis.filter(Boolean).map((r, i) => (
            <span
              key={r + i}
              title={r}
              className="w-[22px] h-[22px] rounded-full text-white text-[9px] font-bold flex items-center justify-center border-[1.5px] border-white dark:border-[#151e2b]"
              style={{ background: avatarCor(r), marginLeft: i ? -7 : 0 }}
            >
              {iniciais(r)}
            </span>
          ))}
        </div>
        {dataLabel && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#9aa1a8] dark:text-[#5a6675]">
            <Calendar className="w-3 h-3" />
            {dataLabel}
          </span>
        )}
      </div>
    </div>
  )
}
