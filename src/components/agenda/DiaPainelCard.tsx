'use client'

import { useState, useEffect, type ReactNode } from 'react'
import {
  Scale, Users, Check, Calendar, CalendarClock, CalendarDays, FileText,
  MapPin, Link2, Phone, RotateCcw, type LucideIcon,
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
import { getTipoLabel } from '@/lib/constants/tarefa-tipos'
import type { AgendaItem } from '@/hooks/useAgendaConsolidada'

// ───────────────────────── tipo do item no painel ─────────────────────────
type Kind = 'tarefa' | 'audiencia' | 'compromisso'
function kindOf(item: AgendaItem): Kind {
  if (item.tipo_entidade === 'tarefa') return 'tarefa'
  if (item.tipo_entidade === 'audiencia') return 'audiencia'
  return 'compromisso'
}

// ───────────────────────── tokens (paleta quente V4) ─────────────────────────
const PD_TIPO: Record<Kind, { label: string; Icon: LucideIcon; chip: string; chipText: string }> = {
  audiencia:   { label: 'Audiência',   Icon: Scale, chip: 'bg-[#f9ebe6] dark:bg-[#a85a3e]/[0.20]', chipText: 'text-[#a85a3e] dark:text-[#e0a085]' },
  compromisso: { label: 'Compromisso', Icon: Users, chip: 'bg-[#e8f5f5] dark:bg-[#3f7376]/[0.20]', chipText: 'text-[#3f7376] dark:text-[#7fb8ba]' },
  tarefa:      { label: 'Tarefa',      Icon: Check, chip: 'bg-[#edf1f7] dark:bg-[#415a7e]/[0.20]', chipText: 'text-[#415a7e] dark:text-[#9bb3d4]' },
}
const PD_PRIOR: Record<string, { l: string; text: string; dot: string }> = {
  alta:  { l: 'Alta',  text: 'text-[#a85a3e] dark:text-[#e0a085]', dot: 'bg-[#a85a3e]' },
  media: { l: 'Média', text: 'text-[#8a6438] dark:text-[#d4a574]', dot: 'bg-[#8a6438]' },
  baixa: { l: 'Baixa', text: 'text-[#3f7376] dark:text-[#7fb8ba]', dot: 'bg-[#3f7376]' },
}

const COMPLETED = ['concluida', 'realizada', 'realizado', 'concluido']
const CANCELLED = ['cancelada', 'cancelado']

const SUBTIPO_EVENTO: Record<string, string> = {
  prazo_processual: 'Prazo processual', compromisso: 'Compromisso', reuniao: 'Reunião',
  inicial: 'Inicial', instrucao: 'Instrução', conciliacao: 'Conciliação',
  julgamento: 'Julgamento', una: 'Una', outra: 'Outra',
}

// ───────────────────────── helpers ─────────────────────────
function inferModalidade(local?: string): { mod: 'Virtual' | 'Telefone' | 'Presencial'; link: string | null } {
  if (!local) return { mod: 'Presencial', link: null }
  const l = local.toLowerCase()
  if (/https?:\/\/|meet\.|zoom|teams|hangout|webex|whereby|\.com\/j\//.test(l)) return { mod: 'Virtual', link: local.trim() }
  if (/telefone|fone|ligar|liga[çc][aã]o|\bcall\b|whats/.test(l)) return { mod: 'Telefone', link: null }
  return { mod: 'Presencial', link: null }
}
function durLabel(ini: Date, fim?: Date | null): string | null {
  if (!fim) return null
  const min = Math.round((fim.getTime() - ini.getTime()) / 60000)
  if (min <= 0) return null
  const h = Math.floor(min / 60), m = min % 60
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`
  if (h) return `${h}h`
  return `${m}min`
}
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

function Meta({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-[11.5px] text-[#5a6775] dark:text-[#8a97a8] leading-snug">
      <Icon className="w-3 h-3 text-[#9aa1a8] dark:text-[#5a6675] flex-shrink-0 mt-0.5" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

function Resp({ nomes }: { nomes: string }) {
  const lista = nomes.split(',').map(n => n.trim()).filter(Boolean)
  if (lista.length === 0) return <span />
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex">
        {lista.map((n, i) => (
          <span
            key={n + i}
            title={n}
            className="w-[18px] h-[18px] rounded-full text-white text-[8px] font-bold flex items-center justify-center border border-white dark:border-[#151e2b]"
            style={{ background: avatarCor(n), marginLeft: i ? -5 : 0, zIndex: lista.length - i }}
          >
            {iniciais(n)}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-[#5a6775] dark:text-[#8a97a8] truncate">{lista.join(', ')}</span>
    </div>
  )
}

type Variant = 'success' | 'teal' | 'slate' | 'tealTint'
const VAR: Record<Variant, string> = {
  success: 'bg-[#6b9e84] hover:bg-[#5e8f76] text-white border-transparent',
  teal: 'bg-gradient-to-r from-[#89bcbe] to-[#6ba9ab] hover:from-[#7bb1b3] hover:to-[#5d9b9d] text-white border-transparent',
  slate: 'bg-[#edf1f7] dark:bg-[#6a85a8]/[0.16] text-[#415a7e] dark:text-[#9eb1cc] border-[#dde5f0] dark:border-[#6a85a8]/[0.32] hover:bg-[#e1e9f4] dark:hover:bg-[#6a85a8]/[0.28]',
  tealTint: 'bg-[#e8f5f5] dark:bg-[#89bcbe]/[0.16] text-[#3f7376] dark:text-[#9fc7c9] border-[#cde9e9] dark:border-[#89bcbe]/[0.32] hover:bg-[#d8efef] dark:hover:bg-[#89bcbe]/[0.28]',
}
const BTN_BASE = 'h-[28px] px-2.5 rounded-[7px] text-[11.5px] font-semibold inline-flex items-center gap-1 border whitespace-nowrap transition-colors'
function ActBtn({ Icon, label, variant, onClick }: { Icon: LucideIcon; label: string; variant: Variant; onClick?: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick?.() }} className={cn(BTN_BASE, VAR[variant])}>
      <Icon className="w-[13px] h-[13px]" />{label}
    </button>
  )
}

// chip genérico (modalidade / prazo / tipo)
function Chip({ Icon, children, className }: { Icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 h-[19px] px-2 rounded-md text-[10.5px] font-bold whitespace-nowrap', className)}>
      {Icon && <Icon className="w-[10px] h-[10px]" />}{children}
    </span>
  )
}

// ───────────────────────── card principal ─────────────────────────
interface DiaPainelCardProps {
  item: AgendaItem
  onViewDetails: () => void
  onComplete?: () => void
  onReopen?: () => void
  onLancarHoras?: () => void
  onReschedule?: (newDate: Date) => void
  onProcessoClick?: (processoId: string) => void
  onConsultivoClick?: (consultivoId: string) => void
}

export default function DiaPainelCard({
  item, onViewDetails, onComplete, onReopen, onLancarHoras, onReschedule, onProcessoClick, onConsultivoClick,
}: DiaPainelCardProps) {
  const [otimista, setOtimista] = useState<'done' | 'open' | null>(null)
  const [calOpen, setCalOpen] = useState(false)
  useEffect(() => { setOtimista(null) }, [item.status])

  const kind = kindOf(item)
  const realDone = COMPLETED.includes(item.status)
  const done = otimista === 'done' ? true : otimista === 'open' ? false : realDone
  const cancelled = CANCELLED.includes(item.status)
  const tipo = PD_TIPO[kind]

  const ini = parseDBDate(item.data_inicio)
  const fim = item.data_fim ? parseDBDate(item.data_fim) : null
  const hasVinculo = !!(item.processo_id || item.consultivo_id)

  const concluir = () => { setOtimista('done'); onComplete?.() }
  const reabrir = () => { setOtimista('open'); onReopen?.() }
  const labelConcluir = kind === 'tarefa' ? 'Concluir' : kind === 'audiencia' ? 'Realizada' : 'Cumprido'

  const cardCls = 'rounded-[11px] border bg-white dark:bg-[#151e2b] overflow-hidden transition-all cursor-pointer border-[#e6e3da] dark:border-[#253345] hover:border-[#d4cfc2] dark:hover:border-[#34465c] hover:shadow-[0_6px_18px_-13px_rgba(15,23,42,0.3)]'
  const footerCls = 'flex items-center justify-between gap-2.5 px-4 py-3 border-t border-[#f0ede3] dark:border-[#253345] bg-[#fcfbf7] dark:bg-white/[0.018] flex-wrap'
  const tituloCls = 'text-[13.5px] font-semibold text-[#2c3e50] dark:text-[#edf1f7] tracking-[-0.01em] leading-[1.35] [text-wrap:pretty]'

  // ── estado concluído: linha compacta ──
  if (done) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-[#f0ede3] dark:border-[#253345] bg-[#f7f5ef] dark:bg-[#10151d] opacity-90">
        <Check_ done onClick={reabrir} />
        <span className="flex-1 min-w-0 text-[12px] font-medium text-[#9aa1a8] dark:text-[#5a6675] line-through truncate">{item.titulo}</span>
        <span className="text-[10.5px] text-[#9aa1a8] dark:text-[#5a6675] flex-shrink-0 hidden sm:inline">{tipo.label}</span>
        {onReopen && <ActBtn Icon={RotateCcw} label="Reabrir" variant="slate" onClick={reabrir} />}
      </div>
    )
  }

  // ── processo / consultivo ──
  const vinculo = item.processo_numero ? (
    <Meta Icon={Scale}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); item.processo_id && onProcessoClick?.(item.processo_id) }}
        className="font-mono text-[11.5px] font-medium text-[#89bcbe] hover:underline whitespace-nowrap"
      >
        {item.processo_numero}
      </button>
    </Meta>
  ) : item.consultivo_titulo ? (
    <Meta Icon={FileText}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); item.consultivo_id && onConsultivoClick?.(item.consultivo_id) }}
        className="text-left hover:underline"
      >
        {item.consultivo_titulo}
      </button>
    </Meta>
  ) : null

  // ════════ TAREFA ════════
  if (kind === 'tarefa') {
    const pri = item.prioridade ? PD_PRIOR[item.prioridade] : null
    const prazo = prazoInfo(item.prazo_data_limite)
    const subtipoLabel = item.subtipo ? getTipoLabel(item.subtipo) : null
    return (
      <div className={cardCls} onClick={onViewDetails}>
        <div className="flex gap-2.5 p-4 pb-3.5">
          <Check_ done={false} onClick={concluir} />
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            {/* leitura rápida: prioridade · subtipo  |  prazo */}
            <div className="flex items-center justify-between gap-2 gap-y-1 flex-wrap">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {pri && (
                  <span className="inline-flex items-center gap-1">
                    <span className={cn('w-1.5 h-1.5 rounded-full', pri.dot)} />
                    <span className={cn('text-[11px] font-bold', pri.text)}>{pri.l}</span>
                  </span>
                )}
                {pri && subtipoLabel && <span className="w-[3px] h-[3px] rounded-full bg-[#9aa1a8] opacity-60" />}
                {subtipoLabel && <span className="text-[10px] font-semibold text-[#9aa1a8] dark:text-[#5a6675] uppercase tracking-[0.06em] whitespace-nowrap">{subtipoLabel}</span>}
              </div>
              {prazo && (
                <Chip className={cn(
                  prazo.tone === 'danger' && 'text-[#a85a3e] bg-[#f9ebe6] dark:bg-[#a85a3e]/[0.16]',
                  prazo.tone === 'warning' && 'text-[#8a6438] bg-[#f7f0e7] dark:bg-[#8a6438]/[0.16]',
                  prazo.tone === 'calm' && 'text-[#5a6775] dark:text-[#8a97a8] bg-[#f1ede2] dark:bg-[#1d2a3c]',
                )}>
                  Prazo Fatal: {prazo.data}
                </Chip>
              )}
            </div>
            <div className={tituloCls}>{item.titulo}</div>
            {(vinculo || item.caso_titulo) && (
              <div className="flex flex-col gap-1.5">
                {vinculo}
                {item.caso_titulo && <Meta Icon={Users}><span className="text-[#2c3e50] dark:text-[#d8e2ef]">{item.caso_titulo}</span></Meta>}
              </div>
            )}
          </div>
        </div>
        <div className={footerCls}>
          <Resp nomes={item.todos_responsaveis || item.responsavel_nome || ''} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onReschedule && item.subtipo !== 'fixa' && (
              <ReagendarBtn onReschedule={onReschedule} onCustom={() => setCalOpen(true)} />
            )}
            {onLancarHoras && hasVinculo && (
              <ActBtn Icon={CalendarClock} label="Horas" variant="tealTint" onClick={onLancarHoras} />
            )}
            {onComplete && !cancelled && (
              <ActBtn Icon={Check} label={labelConcluir} variant="success" onClick={concluir} />
            )}
          </div>
        </div>
        {onReschedule && (
          <Dialog open={calOpen} onOpenChange={setCalOpen}>
            <DialogContent className="max-w-fit p-4" onClick={(e) => e.stopPropagation()}>
              <DialogTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione a nova data</DialogTitle>
              <CalendarComponent mode="single" selected={ini} onSelect={(d) => { if (d) { onReschedule(d); setCalOpen(false) } }} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  // ════════ AUDIÊNCIA / COMPROMISSO ════════
  const { mod, link } = inferModalidade(item.local)
  const ModIcon = mod === 'Virtual' ? Link2 : mod === 'Telefone' ? Phone : MapPin
  const subtipoLabel = item.subtipo ? (SUBTIPO_EVENTO[item.subtipo] || item.subtipo) : null
  const hora = item.dia_inteiro ? null : formatBrazilTime(ini)
  const dur = durLabel(ini, fim)

  return (
    <div className={cardCls} onClick={onViewDetails}>
      <div className="flex gap-3 p-4 pb-3.5">
        {/* coluna de horário */}
        <div className="flex-shrink-0 w-[48px] flex flex-col items-center gap-1 pt-px">
          <span className={cn('w-[28px] h-[28px] rounded-[8px] flex items-center justify-center', tipo.chip, tipo.chipText)}>
            <tipo.Icon className="w-[14px] h-[14px]" />
          </span>
          <div className="text-center">
            {hora
              ? <div className="text-[13px] font-bold text-[#2c3e50] dark:text-[#edf1f7] font-mono tracking-[-0.03em] leading-none">{hora}</div>
              : <div className="text-[9px] font-bold text-[#9aa1a8] font-mono leading-tight">dia<br />todo</div>}
            {dur && <div className="text-[9px] text-[#9aa1a8] dark:text-[#5a6675] font-mono mt-0.5">{dur}</div>}
          </div>
        </div>
        <div className="w-px self-stretch bg-[#f0ede3] dark:bg-[#253345] flex-shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 gap-y-1 flex-wrap">
            <Chip Icon={ModIcon} className={mod === 'Virtual'
              ? 'text-[#3d8a8c] dark:text-[#7fc4c6] bg-[#eef6f6] dark:bg-[#89bcbe]/[0.16]'
              : 'text-[#5a6775] dark:text-[#8a97a8] bg-[#f1ede2] dark:bg-[#1d2a3c]'}>{mod}</Chip>
            <Chip Icon={tipo.Icon} className={cn(tipo.chip, tipo.chipText)}>{tipo.label}</Chip>
          </div>
          <div>
            <div className={tituloCls}>{item.titulo}</div>
            {item.descricao && <div className="text-[11.5px] text-[#5a6775] dark:text-[#8a97a8] mt-0.5 leading-snug line-clamp-2">{item.descricao}</div>}
          </div>
          <div className="flex flex-col gap-1">
            {item.local && <Meta Icon={ModIcon}>{item.local}</Meta>}
            {vinculo}
            {item.caso_titulo && <Meta Icon={Users}><span className="text-[#2c3e50] dark:text-[#d8e2ef]">{item.caso_titulo}</span></Meta>}
            {subtipoLabel && kind === 'audiencia' && <Meta Icon={Scale}>{subtipoLabel}</Meta>}
          </div>
        </div>
      </div>
      <div className={footerCls}>
        <Resp nomes={item.todos_responsaveis || item.responsavel_nome || ''} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {link && <ActBtn Icon={Link2} label="Entrar" variant="teal" onClick={() => window.open(link, '_blank', 'noopener')} />}
          {onComplete && !cancelled && (
            <ActBtn Icon={Check} label={labelConcluir} variant="success" onClick={concluir} />
          )}
          <ActBtn
            Icon={item.processo_id ? Scale : item.consultivo_id ? FileText : Calendar}
            label="Abrir"
            variant="tealTint"
            onClick={() => {
              if (item.processo_id) onProcessoClick?.(item.processo_id)
              else if (item.consultivo_id) onConsultivoClick?.(item.consultivo_id)
              else onViewDetails()
            }}
          />
        </div>
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
          <Calendar className="w-[13px] h-[13px]" />Reagendar
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
