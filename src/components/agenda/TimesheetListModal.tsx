'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Clock, Plus, Pencil } from 'lucide-react'
import { cn, formatHoras } from '@/lib/utils'
import { parseDBDate } from '@/lib/timezone'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TimesheetEntryRecente } from '@/hooks/useTimesheetRecentes'

interface TimesheetListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: TimesheetEntryRecente[]
  tituloTarefa?: string
  onEditEntry: (entry: TimesheetEntryRecente) => void
  onNewEntry?: () => void
}

// avatar helper (mesmo padrão V4 do resto da agenda)
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
const semPonto = (s: string) => s.replace(/\.$/, '')

function HoraRow({ entry, onEdit }: { entry: TimesheetEntryRecente; onEdit: () => void }) {
  const d = parseDBDate(entry.data_trabalho)
  const dia = format(d, 'dd')
  const mes = semPonto(format(d, 'MMM', { locale: ptBR }))
  const semana = semPonto(format(d, 'EEEEEE', { locale: ptBR }))
  const resp = entry.colaborador_nome?.trim()

  return (
    <button
      onClick={onEdit}
      className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-left hover:bg-[#f7f6f2] dark:hover:bg-[#1b2536] transition-colors"
    >
      {/* data */}
      <div className="w-11 flex-shrink-0 text-center">
        <div className="font-mono text-[15px] font-bold text-[#2c3e50] dark:text-[#edf1f7] leading-none">{dia}</div>
        <div className="text-[9.5px] text-[#9aa1a8] dark:text-[#5a6675] uppercase tracking-[0.04em] mt-1">{mes} · {semana}</div>
      </div>

      {/* avatar do colaborador */}
      {resp ? (
        <span
          title={resp}
          className="w-[26px] h-[26px] flex-shrink-0 rounded-full text-white text-[9.5px] font-bold flex items-center justify-center"
          style={{ background: avatarCor(resp) }}
        >
          {iniciais(resp)}
        </span>
      ) : (
        <span className="w-[26px] h-[26px] flex-shrink-0 rounded-full bg-[#f1ede2] dark:bg-[#1d2a3c]" />
      )}

      {/* atividade + pílula cobrável/interno */}
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-[#2c3e50] dark:text-[#edf1f7] leading-tight truncate">
          {entry.atividade || 'Sem descrição'}
        </div>
        <span className={cn(
          'inline-flex items-center gap-1.5 mt-1.5 h-[18px] px-2 rounded-full text-[10px] font-semibold',
          entry.faturavel
            ? 'text-[#3f7376] bg-[#e8f5f5] dark:text-[#7fb8ba] dark:bg-[#3f7376]/[0.18]'
            : 'text-[#9aa1a8] dark:text-[#5a6675] bg-[#f1ede2] dark:bg-[#1d2a3c]',
        )}>
          <span className={cn('w-[5px] h-[5px] rounded-full', entry.faturavel ? 'bg-[#89bcbe] dark:bg-[#7fb8ba]' : 'bg-[#9aa1a8]')} />
          {entry.faturavel ? 'Cobrável' : 'Interno'}
        </span>
      </div>

      {/* horas */}
      <div className="font-mono text-[14px] font-bold text-[#1a2330] dark:text-[#e8ecf2] flex-shrink-0">
        {formatHoras(Number(entry.horas), 'curto')}
      </div>
      <Pencil className="w-3.5 h-3.5 text-transparent group-hover:text-[#5a6775] dark:group-hover:text-[#8a97a8] flex-shrink-0 transition-colors" />
    </button>
  )
}

export default function TimesheetListModal({
  open,
  onOpenChange,
  entries,
  tituloTarefa,
  onEditEntry,
  onNewEntry,
}: TimesheetListModalProps) {
  const totalHoras = entries.reduce((s, e) => s + (Number(e.horas) || 0), 0)
  const cobrHoras = entries.filter((e) => e.faturavel).reduce((s, e) => s + (Number(e.horas) || 0), 0)
  const internoHoras = totalHoras - cobrHoras
  const cobrPct = totalHoras > 0 ? Math.round((cobrHoras / totalHoras) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden border border-[#e6e3da] dark:border-[#2e3a52] rounded-[18px] bg-white dark:bg-[#151e2b] dark:dark-dialog-glow">
        {/* header */}
        <div className="px-5 py-4 border-b border-[#f0ede3] dark:border-[#253345]">
          <DialogTitle asChild>
            <h2 className="text-[18px] font-semibold text-[#1a2330] dark:text-[#e8ecf2] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-fraunces)' }}>
              Horas lançadas
            </h2>
          </DialogTitle>
          {tituloTarefa && (
            <p className="text-[12px] text-[#5a6775] dark:text-[#8a97a8] truncate mt-0.5">{tituloTarefa}</p>
          )}
        </div>

        {/* resumo */}
        <div className="px-5 py-4 border-b border-[#f0ede3] dark:border-[#253345] bg-[#fbfaf7] dark:bg-white/[0.018]">
          <div className="flex items-end gap-4 mb-3 flex-wrap">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9aa1a8] dark:text-[#5a6675] mb-1">Total lançado</div>
              <div className="text-[26px] font-bold text-[#1a2330] dark:text-[#e8ecf2] leading-none tracking-[-0.02em]" style={{ fontFamily: 'var(--font-fraunces)' }}>
                {formatHoras(totalHoras, 'curto')}
              </div>
            </div>
            <div className="text-[12px] text-[#5a6775] dark:text-[#8a97a8] pb-1">
              {entries.length} {entries.length === 1 ? 'lançamento' : 'lançamentos'}
            </div>
            <div className="flex-1" />
            <div className="flex flex-col gap-1.5 pb-0.5">
              <span className="inline-flex items-center gap-2 text-[12px] text-[#5a6775] dark:text-[#8a97a8]">
                <span className="w-[7px] h-[7px] rounded-full bg-[#89bcbe] dark:bg-[#7fb8ba]" />
                Cobrável <strong className="font-mono font-semibold text-[#2c3e50] dark:text-[#edf1f7]">{formatHoras(cobrHoras, 'curto')}</strong>
              </span>
              <span className="inline-flex items-center gap-2 text-[12px] text-[#5a6775] dark:text-[#8a97a8]">
                <span className="w-[7px] h-[7px] rounded-full bg-[#9aa1a8]" />
                Interno <strong className="font-mono font-semibold text-[#2c3e50] dark:text-[#edf1f7]">{formatHoras(internoHoras, 'curto')}</strong>
              </span>
            </div>
          </div>
          <div className="h-[7px] rounded-full overflow-hidden flex bg-[#ece9e2] dark:bg-[#253345]" title={`${cobrPct}% cobrável`}>
            <div className="bg-[#89bcbe] dark:bg-[#7fb8ba]" style={{ width: `${cobrPct}%` }} />
          </div>
        </div>

        {/* lista */}
        <div className="px-2 py-2 max-h-[44vh] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#5a6775] dark:text-[#8a97a8]">Nenhuma hora lançada nesta tarefa.</div>
          ) : (
            entries.map((entry) => (
              <HoraRow key={entry.id} entry={entry} onEdit={() => onEditEntry(entry)} />
            ))
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-t border-[#f0ede3] dark:border-[#253345] bg-[#faf9f5] dark:bg-white/[0.018]">
          {onNewEntry && (
            <button
              onClick={onNewEntry}
              className="h-9 px-3.5 rounded-[10px] text-[12.5px] font-semibold inline-flex items-center gap-2 border border-[#cde9e9] dark:border-[#89bcbe]/[0.32] bg-[#e8f5f5] dark:bg-[#89bcbe]/[0.16] text-[#3f7376] dark:text-[#9fc7c9] hover:bg-[#d8efef] dark:hover:bg-[#89bcbe]/[0.28] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo lançamento
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-[10px] text-[12.5px] font-semibold border border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] hover:bg-[#f3f1ea] dark:hover:bg-[#1b2536] transition-colors inline-flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
