'use client'

import Link from 'next/link'
import { ArrowUp, ArrowDown, ChevronsUpDown, ChevronDown, Check, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type ConsultaLinha, type SortKey, type SortDir,
  tipoLabel, tipoChipClass, areaLabel, areaChipClass, statusLabel, statusDot,
  getInitials, avatarColor,
} from './consultivo-ui'

const GRID = 'grid grid-cols-[132px_minmax(0,1.9fr)_minmax(0,1.3fr)_110px_168px_104px_52px] items-center gap-4'

interface Opt { value: string; label: string }

interface ConsultivoTabelaProps {
  consultas: ConsultaLinha[]
  loading: boolean
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
  area: string
  onArea: (a: string) => void
  areaOptions: Opt[]
  tipo: string
  onTipo: (t: string) => void
  tipoOptions: Opt[]
  resp: string
  onResp: (r: string) => void
  respOptions: Opt[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
}

function SortTH({ label, k, sort, onSort }: { label: string; k: SortKey; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void }) {
  const active = sort.key === k
  return (
    <button
      onClick={() => onSort(k)}
      className={cn('inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.08em] transition-colors', active ? 'text-[#2c3e50] dark:text-[#d8e2ef]' : 'text-[#9aa1a8] dark:text-[#5a6675] hover:text-[#5a6775]')}
    >
      {label}
      {active ? (sort.dir === 'asc' ? <ArrowUp className="w-[11px] h-[11px] text-[#89bcbe]" /> : <ArrowDown className="w-[11px] h-[11px] text-[#89bcbe]" />) : <ChevronsUpDown className="w-[11px] h-[11px] opacity-40" />}
    </button>
  )
}

function FilterTH({ label, value, options, active, align, onSelect }: { label: string; value: string | null; options: Opt[]; active: boolean; align: 'start' | 'end'; onSelect: (v: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn('inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.08em]', align === 'end' && 'justify-self-start', active ? 'text-[#2c3e50] dark:text-[#d8e2ef]' : 'text-[#9aa1a8] dark:text-[#5a6675]')}>
          {value || label}
          <ChevronDown className={cn('w-[11px] h-[11px]', active ? 'text-[#89bcbe]' : 'opacity-50')} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="max-h-72 overflow-auto">
        {options.map(o => (
          <DropdownMenuItem key={o.value} onClick={() => onSelect(o.value)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ConsultivoTabela(props: ConsultivoTabelaProps) {
  const { consultas, loading, sort, onSort, area, onArea, areaOptions, tipo, onTipo, tipoOptions, resp, onResp, respOptions, selectedIds, onToggle, onToggleAll } = props
  const allSel = consultas.length > 0 && consultas.every(c => selectedIds.has(c.id))
  const areaLbl = area !== 'todas' ? areaLabel(area) : null
  const tipoLbl = tipo !== 'todos' ? tipoLabel(tipo) : null
  const respLbl = resp !== 'todos' ? (respOptions.find(r => r.value === resp)?.label) : null

  return (
    <div className="bg-[#ffffff] dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] rounded-[13px] overflow-hidden">
      {/* cabeçalho */}
      <div className={cn(GRID, 'pl-5 pr-5 py-[11px] border-b border-[#e6e3da] dark:border-[#253345] bg-[#faf8f2] dark:bg-[#0f141c]')}>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleAll}
            title="Selecionar todas"
            className={cn('w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center transition-colors flex-shrink-0', allSel ? 'bg-[#34495e] border-[#34495e] text-white' : 'border-[#c4c0b4] dark:border-[#3a4452]')}
          >
            {allSel && <Check className="w-2.5 h-2.5" />}
          </button>
          <SortTH label="Nº" k="num" sort={sort} onSort={onSort} />
        </div>
        <SortTH label="Título" k="titulo" sort={sort} onSort={onSort} />
        <SortTH label="Cliente" k="cliente" sort={sort} onSort={onSort} />
        <FilterTH label="Área" value={areaLbl} active={area !== 'todas'} align="start" options={areaOptions} onSelect={onArea} />
        <FilterTH label="Tipo" value={tipoLbl} active={tipo !== 'todos'} align="start" options={tipoOptions} onSelect={onTipo} />
        <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-[#5a6675]">Status</span>
        <FilterTH label="Resp." value={respLbl ? getInitials(respLbl) : null} active={resp !== 'todos'} align="end" options={respOptions} onSelect={onResp} />
      </div>

      {/* linhas */}
      {consultas.map((c, i) => {
        const sel = selectedIds.has(c.id)
        return (
          <Link
            key={c.id}
            href={`/dashboard/consultivo/${c.id}`}
            className={cn(
              GRID, 'pl-5 pr-5 py-[14px] transition-colors',
              i < consultas.length - 1 && 'border-b border-[#f0ede3] dark:border-[#1d2a3c]',
              sel ? 'bg-[#f7fbfb] dark:bg-[rgba(137,188,190,0.06)]' : 'hover:bg-[#fbfaf6] dark:hover:bg-[rgba(137,188,190,0.05)]'
            )}
          >
            {/* checkbox + Nº */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(c.id) }}
                className={cn('w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors', sel ? 'bg-[#34495e] border-[#34495e] text-white' : 'border-[#c4c0b4] dark:border-[#3a4452]')}
              >
                {sel && <Check className="w-2.5 h-2.5" />}
              </button>
              <span className="text-[11.5px] font-semibold text-[#5a6775] dark:text-[#8a97a8] font-mono tracking-[-0.02em] truncate">{c.numero || '—'}</span>
            </div>
            {/* Título */}
            <span className="text-[13.5px] font-semibold text-[#2c3e50] dark:text-[#d8e2ef] truncate tracking-[-0.01em]">{c.titulo}</span>
            {/* Cliente */}
            <span className="text-[12.5px] text-[#5a6775] dark:text-[#8a97a8] truncate">{c.cliente_nome || '—'}</span>
            {/* Área */}
            <span>{c.area && <span className={cn('text-[10.5px] font-semibold px-[9px] py-[3px] rounded-md', areaChipClass(c.area))}>{areaLabel(c.area)}</span>}</span>
            {/* Tipo */}
            <span className="min-w-0">
              <span className={cn('inline-block max-w-full text-[10.5px] font-semibold px-[9px] py-[3px] rounded-md truncate align-middle', tipoChipClass(c.tipo))}>{tipoLabel(c.tipo)}</span>
            </span>
            {/* Status */}
            <span className="inline-flex items-center gap-[7px]">
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: statusDot(c.status) }} />
              <span className="text-[12px] text-[#5a6775] dark:text-[#8a97a8]">{statusLabel(c.status)}</span>
            </span>
            {/* Resp */}
            <span className="justify-self-start">
              {c.responsavel_nome && (
                <span className="w-[27px] h-[27px] rounded-full text-white text-[10px] font-semibold flex items-center justify-center" style={{ background: avatarColor(c.responsavel_nome) }} title={c.responsavel_nome}>
                  {getInitials(c.responsavel_nome)}
                </span>
              )}
            </span>
          </Link>
        )
      })}

      {consultas.length === 0 && (
        <div className="px-5 py-[52px] text-center">
          <Scale className="w-[26px] h-[26px] text-[#9aa1a8] dark:text-[#5a6675] mx-auto mb-2.5" />
          <div className="text-[14px] font-semibold text-[#5a6775] dark:text-[#8a97a8]">{loading ? 'Carregando…' : 'Nenhuma consulta encontrada'}</div>
          {!loading && <div className="text-[12.5px] text-[#9aa1a8] dark:text-[#5a6675] mt-[3px]">Ajuste a busca ou os filtros.</div>}
        </div>
      )}
    </div>
  )
}
