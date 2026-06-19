'use client'

import { useState, useEffect, type ReactNode } from 'react'
import {
  Scale, Users, Check, Calendar, CalendarClock, CalendarDays, FileText,
  RotateCcw, Flag, type LucideIcon,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { parseDBDate, formatBrazilTime } from '@/lib/timezone'
import { addDays, nextMonday, differenceInCalendarDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AgendaItem } from '@/hooks/useAgendaConsolidada'

// Linha da timeline (variante C do design "Lista da Agenda"): gutter cronológico
// com trilho + nó (cor = prioridade nas tarefas / tipo nos eventos) + horário, e um
// card de UMA linha: [check] [chip + título] / [vínculo · partes] ········· [prazo] [resp] | [ações]

// ───────────────────────── tipo do item ─────────────────────────
type Kind = 'tarefa' | 'audiencia' | 'compromisso'
function kindOf(item: AgendaItem): Kind {
  if (item.tipo_entidade === 'tarefa') return 'tarefa'
  if (item.tipo_entidade === 'audiencia') return 'audiencia'
  return 'compromisso'
}

// ───────────────────────── tokens (paleta quente V4) ─────────────────────────
const PD_TIPO: Record<Kind, { label: string; Icon: LucideIcon; c: string; chip: string; chipText: string }> = {
  audiencia:   { label: 'Audiência',   Icon: Scale, c: '#a85a3e', chip: 'bg-[#f9ebe6] dark:bg-[#a85a3e]/[0.20]', chipText: 'text-[#a85a3e] dark:text-[#e0a085]' },
  compromisso: { label: 'Compromisso', Icon: Users, c: '#3f7376', chip: 'bg-[#e8f5f5] dark:bg-[#3f7376]/[0.20]', chipText: 'text-[#3f7376] dark:text-[#7fb8ba]' },
  tarefa:      { label: 'Tarefa',      Icon: Check, c: '#415a7e', chip: 'bg-[#edf1f7] dark:bg-[#415a7e]/[0.20]', chipText: 'text-[#415a7e] dark:text-[#9bb3d4]' },
}
// cor do nó por prioridade (tarefas) — paleta quente, igual ao Painel do Dia
const PRIOR_COR: Record<string, string> = { alta: '#a85a3e', media: '#8a6438', baixa: '#3f7376' }

const COMPLETED = ['concluida', 'concluido', 'realizada', 'realizado']
const CANCELLED = ['cancelada', 'cancelado']

// ───────────────────────── helpers ─────────────────────────
function prazoInfo(prazo?: string | null): { data: string; tone: 'danger' | 'warning' | 'calm' } | null {
  if (!prazo) return null
  const alvo = parseDBDate(prazo)
  const dias = differenceInCalendarDays(alvo, new Date())
  const data = `${String(alvo.getDate()).padStart(2, '0')}/${String(alvo.getMonth() + 1).padStart(2, '0')}/${alvo.getFullYear()}`
  const tone: 'danger' | 'warning' | 'calm' = dias <= 2 ? 'danger' : dias <= 7 ? 'warning' : 'calm'
  return { data, tone }
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

// ───────────────────────── átomos ─────────────────────────
function Check_({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={done ? 'Reabrir' : 'Concluir'}
      className={cn(
        'group/chk mt-px w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 border transition-all',
        done
          ? 'bg-[#3f6a54] border-[#3f6a54]'
          : 'border-[#dcd8cc] dark:border-[#2c3a4d] hover:border-[#3f6a54] hover:bg-[#eef6f1] dark:hover:bg-[#3f6a54]/20',
      )}
    >
      {done
        ? <Check className="w-3 h-3 text-white" strokeWidth={3} />
        : <Check className="w-2.5 h-2.5 text-[#3f6a54] opacity-0 group-hover/chk:opacity-100" strokeWidth={2.5} />}
    </button>
  )
}

// avatares dos responsáveis (sobrepostos), sem nomes — igual ao design
function Resp({ nomes, size = 22 }: { nomes: string; size?: number }) {
  const lista = nomes.split(',').map(n => n.trim()).filter(Boolean)
  if (lista.length === 0) return null
  return (
    <div className="flex flex-shrink-0">
      {lista.map((n, i) => (
        <span
          key={n + i}
          title={n}
          className="rounded-full text-white font-bold flex items-center justify-center border-2 border-white dark:border-[#151e2b]"
          style={{ width: size, height: size, fontSize: size * 0.38, background: avatarCor(n), marginLeft: i ? -size * 0.34 : 0, zIndex: lista.length - i }}
        >
          {iniciais(n)}
        </span>
      ))}
    </div>
  )
}

type Variant = 'success' | 'slate' | 'tealTint'
const VAR: Record<Variant, string> = {
  success: 'bg-[#6b9e84] hover:bg-[#5e8f76] text-white border-transparent shadow-[0_4px_12px_-8px_rgba(107,158,132,0.7)]',
  slate: 'bg-[#edf1f7] dark:bg-[#6a85a8]/[0.16] text-[#415a7e] dark:text-[#9eb1cc] border-[#dde5f0] dark:border-[#6a85a8]/[0.32] hover:bg-[#e1e9f4] dark:hover:bg-[#6a85a8]/[0.28]',
  tealTint: 'bg-[#e8f5f5] dark:bg-[#89bcbe]/[0.16] text-[#3f7376] dark:text-[#9fc7c9] border-[#cde9e9] dark:border-[#89bcbe]/[0.32] hover:bg-[#d8efef] dark:hover:bg-[#89bcbe]/[0.28]',
}
const BTN_BASE = 'h-[30px] px-2.5 rounded-[8px] text-[12px] font-semibold inline-flex items-center gap-1.5 border whitespace-nowrap transition-colors'
function ActBtn({ Icon, label, variant, onClick }: { Icon: LucideIcon; label: string; variant: Variant; onClick?: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick?.() }} className={cn(BTN_BASE, VAR[variant])}>
      <Icon className="w-[13px] h-[13px]" />{label}
    </button>
  )
}

// chip genérico (tipo / prazo)
function Chip({ Icon, children, className }: { Icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 h-[21px] px-2 rounded-md text-[10.5px] font-bold whitespace-nowrap', className)}>
      {Icon && <Icon className="w-[11px] h-[11px]" />}{children}
    </span>
  )
}

// ───────────────────────── linha da timeline ─────────────────────────
interface AgendaTimelineRowProps {
  item: AgendaItem
  first?: boolean
  last?: boolean
  onViewDetails: () => void
  onComplete?: () => void
  onReopen?: () => void
  onLancarHoras?: () => void
  onReschedule?: (newDate: Date) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
}

export default function AgendaTimelineRow({
  item, first, last, onViewDetails, onComplete, onReopen, onLancarHoras, onReschedule, onProcessoClick, onConsultivoClick,
}: AgendaTimelineRowProps) {
  const [otimista, setOtimista] = useState<'done' | 'open' | null>(null)
  const [calOpen, setCalOpen] = useState(false)
  useEffect(() => { setOtimista(null) }, [item.status])

  const kind = kindOf(item)
  const isTask = kind === 'tarefa'
  const realDone = COMPLETED.includes(item.status)
  const done = otimista === 'done' ? true : otimista === 'open' ? false : realDone
  const cancelled = CANCELLED.includes(item.status)
  const tipo = PD_TIPO[kind]

  const ini = parseDBDate(item.data_inicio)
  const prazo = isTask ? prazoInfo(item.prazo_data_limite) : null

  // horário no gutter — só eventos/audiências (tarefa mostra só o nó), igual ao design
  const hora = !isTask && !item.dia_inteiro ? formatBrazilTime(ini) : null

  // cor do nó: prioridade (tarefa) / tipo (evento)
  const nodeColor = done ? '#c2bdb1' : isTask ? (PRIOR_COR[item.prioridade || 'media'] || '#9aa1a8') : tipo.c

  const concluir = () => { setOtimista('done'); onComplete?.() }
  const reabrir = () => { setOtimista('open'); onReopen?.() }

  // ── trilho: encurta na primeira (começa no nó) e última (termina no nó) ──
  const railCls = cn(
    'absolute left-1/2 -translate-x-1/2 w-[2px] bg-[#ece9e2] dark:bg-[#253345]',
    first && last ? 'hidden' : first ? 'top-[18px] bottom-0' : last ? 'top-0 h-[18px]' : 'top-0 bottom-0',
  )

  const cardCls = cn(
    'rounded-[12px] border transition-all cursor-pointer',
    'border-[#e6e3da] dark:border-[#253345] hover:border-[#d4cfc2] dark:hover:border-[#34465c]',
    'hover:shadow-[0_6px_18px_-13px_rgba(15,23,42,0.3)]',
    done ? 'bg-[#f7f5ef] dark:bg-[#10151d] opacity-90' : 'bg-white dark:bg-[#151e2b]',
  )
  const tituloCls = cn(
    'text-[12.5px] font-semibold tracking-[-0.01em] truncate',
    done ? 'text-[#9aa1a8] dark:text-[#5a6675] line-through' : 'text-[#2c3e50] dark:text-[#edf1f7]',
  )

  // ── vínculo (processo / consultivo) ──
  const vinculo = item.processo_numero ? (
    <span className="inline-flex items-center gap-1.5 min-w-0 flex-shrink-0">
      <Scale className="w-3 h-3 text-[#9aa1a8] dark:text-[#5a6675] flex-shrink-0" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); item.processo_id && onProcessoClick?.(item.processo_id) }}
        className="font-mono text-[11.5px] font-medium text-[#89bcbe] hover:underline whitespace-nowrap"
      >
        {item.processo_numero}
      </button>
    </span>
  ) : item.consultivo_titulo ? (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <FileText className="w-3 h-3 text-[#9aa1a8] dark:text-[#5a6675] flex-shrink-0" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); item.consultivo_id && onConsultivoClick?.(item.consultivo_id) }}
        className="truncate text-left hover:underline"
      >
        {item.consultivo_titulo}
      </button>
    </span>
  ) : null

  return (
    <div className="flex items-stretch gap-3">
      {/* gutter: trilho + nó + horário */}
      <div className="relative flex-shrink-0 w-[54px] flex flex-col items-center pt-3">
        <span className={railCls} />
        {/* nó vazado (anel colorido) */}
        <span
          className="relative z-10 w-3 h-3 rounded-full border-2 bg-slate-50 dark:bg-[#101521] flex-shrink-0"
          style={{ borderColor: nodeColor }}
        />
        {hora && (
          <span className="relative z-10 mt-1.5 px-1 rounded bg-slate-50 dark:bg-[#101521] font-mono text-[11px] font-bold text-[#5a6775] dark:text-[#8a97a8] tracking-[-0.02em]">
            {hora}
          </span>
        )}
      </div>

      {/* card de uma linha */}
      <div className="flex-1 min-w-0 pb-5">
        <div className={cardCls} onClick={onViewDetails}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3 px-3.5 py-2.5">
            {/* conteúdo (chip + título / vínculo · partes) */}
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {isTask && <Check_ done={done} onClick={done ? reabrir : concluir} />}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Chip Icon={tipo.Icon} className={cn(tipo.chip, tipo.chipText, 'flex-shrink-0')}>{tipo.label}</Chip>
                  <span className={tituloCls}>{item.titulo}</span>
                </div>
                {(vinculo || item.caso_titulo) && (
                  <div className="flex items-center gap-2 min-w-0 text-[11.5px] text-[#5a6775] dark:text-[#8a97a8]">
                    {vinculo}
                    {vinculo && item.caso_titulo && <span className="text-[#dcd8cc] dark:text-[#2c3a4d] flex-shrink-0">·</span>}
                    {item.caso_titulo && <span className="truncate">{item.caso_titulo}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* cluster direito: prazo · resp · | · ações */}
            <div className="flex items-center gap-3 flex-wrap justify-end lg:flex-shrink-0 pl-[30px] lg:pl-0">
              {prazo && (
                <Chip Icon={Flag} className={cn(
                  'h-[22px]',
                  prazo.tone === 'danger' && 'text-[#a85a3e] bg-[#f9ebe6] dark:bg-[#a85a3e]/[0.16]',
                  prazo.tone === 'warning' && 'text-[#8a6438] bg-[#f7f0e7] dark:bg-[#8a6438]/[0.16]',
                  prazo.tone === 'calm' && 'text-[#5a6775] dark:text-[#8a97a8] bg-[#f1ede2] dark:bg-[#1d2a3c]',
                )}>
                  Prazo fatal {prazo.data}
                </Chip>
              )}
              <Resp nomes={item.todos_responsaveis || item.responsavel_nome || ''} />
              <div className="flex items-center gap-1.5 pl-3 border-l border-[#f0ede3] dark:border-[#253345]">
                {onReschedule && <ReagendarBtn onReschedule={onReschedule} onCustom={() => setCalOpen(true)} />}
                {onLancarHoras && <ActBtn Icon={CalendarClock} label="Horas" variant="tealTint" onClick={onLancarHoras} />}
                {done
                  ? onReopen && <ActBtn Icon={RotateCcw} label="Reabrir" variant="slate" onClick={reabrir} />
                  : onComplete && !cancelled && <ActBtn Icon={Check} label="Concluir" variant="success" onClick={concluir} />}
              </div>
            </div>
          </div>
        </div>

        {/* calendário de reagendamento (data customizada) */}
        {onReschedule && (
          <Dialog open={calOpen} onOpenChange={setCalOpen}>
            <DialogContent className="max-w-fit p-4" onClick={(e) => e.stopPropagation()}>
              <DialogTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione a nova data</DialogTitle>
              <CalendarComponent mode="single" selected={ini} onSelect={(d) => { if (d) { onReschedule(d); setCalOpen(false) } }} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// ── botão Reagendar (dropdown de datas rápidas, estilo V4) ──
function ReagendarBtn({ onReschedule, onCustom }: { onReschedule: (d: Date) => void; onCustom: () => void }) {
  const hoje = new Date()
  const opcoes: { label: string; date: Date }[] = [
    { label: 'Hoje', date: hoje },
    { label: 'Amanhã', date: addDays(hoje, 1) },
    { label: 'Próxima segunda', date: nextMonday(hoje) },
    { label: 'Daqui a 7 dias', date: addDays(hoje, 7) },
  ]
  const itemCls = 'rounded-lg px-2 py-1.5 cursor-pointer flex items-center justify-between gap-4 text-[12.5px] font-medium text-[#2c3e50] dark:text-[#d8e2ef] focus:bg-[#f4f1e8] dark:focus:bg-[#1d2a3c] focus:text-[#2c3e50] dark:focus:text-[#edf1f7]'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button type="button" className={cn(BTN_BASE, VAR.slate)}>
          <Calendar className="w-[14px] h-[14px]" />Reagendar
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-56 p-1.5 rounded-xl border border-[#e6e3da] dark:border-[#253345] bg-white dark:bg-[#151e2b] shadow-[0_16px_38px_-16px_rgba(15,23,42,0.4)]"
      >
        <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#9aa1a8] dark:text-[#5a6675]">Reagendar para</div>
        {opcoes.map((o) => (
          <DropdownMenuItem key={o.label} className={itemCls} onClick={(e) => { e.stopPropagation(); onReschedule(o.date) }}>
            <span>{o.label}</span>
            <span className="text-[11px] font-mono text-[#9aa1a8] dark:text-[#5a6675] capitalize">{format(o.date, 'EEEEEE dd/MM', { locale: ptBR })}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-[#f0ede3] dark:bg-[#253345]" />
        <DropdownMenuItem
          className="rounded-lg px-2 py-1.5 cursor-pointer flex items-center gap-2 text-[12.5px] font-medium text-[#3f7376] dark:text-[#9fc7c9] focus:bg-[#e8f5f5] dark:focus:bg-[#89bcbe]/[0.16]"
          onClick={(e) => { e.stopPropagation(); onCustom() }}
        >
          <CalendarDays className="w-3.5 h-3.5" />Escolher outra data…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
