'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown, ChevronsUpDown, ChevronDown, Check, Copy, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type ProcessoLinha, type SortKey, type SortDir,
  areaLabel, areaChipClass, statusLabel, statusDot, getInitials, avatarColor, formatUltMov,
} from './processos-ui'

const GRID = 'grid grid-cols-[36px_76px_minmax(0,1.3fr)_minmax(0,1.2fr)_190px_minmax(0,1.4fr)_96px_92px_52px] items-center gap-4'

interface RespOption { value: string; label: string }

interface ProcessosTabelaProps {
  processos: ProcessoLinha[]
  loading: boolean
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
  area: string
  onArea: (a: string) => void
  areaOptions: { value: string; label: string }[]
  resp: string
  onResp: (r: string) => void
  respOptions: RespOption[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
}

function CopyCnj({ cnj }: { cnj: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <span className="flex items-center gap-1.5 min-w-0 w-full">
      <span className="text-[11px] text-[#5a6775] dark:text-[#8a97a8] font-mono tracking-[-0.01em] truncate">{cnj}</span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); try { navigator.clipboard?.writeText(cnj) } catch {} ; setCopiado(true); setTimeout(() => setCopiado(false), 1400) }}
        title={copiado ? 'Copiado' : 'Copiar número CNJ'}
        className={cn(
          'inline-flex items-center justify-center w-[22px] h-[22px] rounded-md flex-shrink-0 transition-colors',
          copiado ? 'text-[#3f7376] dark:text-[#9fc7c9] bg-[#e9f3f3] dark:bg-[rgba(137,188,190,0.18)]' : 'text-[#9aa1a8] dark:text-[#5a6675] hover:text-[#5a6775]'
        )}
      >
        {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </span>
  )
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

export default function ProcessosTabela(props: ProcessosTabelaProps) {
  const { processos, loading, sort, onSort, area, onArea, areaOptions, resp, onResp, respOptions, selectedIds, onToggle, onToggleAll } = props
  const allSel = processos.length > 0 && processos.every(p => selectedIds.has(p.id))
  const respLabel = respOptions.find(r => r.value === resp)?.label

  return (
    <div className="bg-[#ffffff] dark:bg-[#151e2b] border border-[#e6e3da] dark:border-[#253345] rounded-[13px] overflow-hidden">
      {/* cabeçalho */}
      <div className={cn(GRID, 'px-5 py-[11px] border-b border-[#e6e3da] dark:border-[#253345] bg-[#faf8f2] dark:bg-[#0f141c]')}>
        <button
          onClick={onToggleAll}
          className={cn('w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center transition-colors', allSel ? 'bg-[#34495e] border-[#34495e] text-white' : 'border-[#c4c0b4] dark:border-[#3a4452]')}
          title="Selecionar todos"
        >
          {allSel && <Check className="w-2.5 h-2.5" />}
        </button>
        <SortTH label="Pasta" k="pasta" sort={sort} onSort={onSort} />
        <SortTH label="Cliente" k="cliente" sort={sort} onSort={onSort} />
        <SortTH label="Parte contrária" k="contraria" sort={sort} onSort={onSort} />
        <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-[#5a6675]">Número CNJ</span>
        <SortTH label="Última mov." k="mov" sort={sort} onSort={onSort} />
        {/* Área (filtro) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn('inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.08em]', area !== 'todas' ? 'text-[#2c3e50] dark:text-[#d8e2ef]' : 'text-[#9aa1a8] dark:text-[#5a6675]')}>
              {area !== 'todas' ? areaLabel(area) : 'Área'}
              <ChevronDown className={cn('w-[11px] h-[11px]', area !== 'todas' ? 'text-[#89bcbe]' : 'opacity-50')} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
            {areaOptions.map(o => (
              <DropdownMenuItem key={o.value} onClick={() => onArea(o.value)}>
                {o.label}{area === o.value && <Check className="w-3.5 h-3.5 ml-auto text-[#89bcbe]" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9aa1a8] dark:text-[#5a6675]">Status</span>
        {/* Resp (filtro) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn('inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.08em] justify-self-start', resp !== 'todos' ? 'text-[#2c3e50] dark:text-[#d8e2ef]' : 'text-[#9aa1a8] dark:text-[#5a6675]')}>
              {resp !== 'todos' ? (respLabel ? getInitials(respLabel) : 'Resp.') : 'Resp.'}
              <ChevronDown className={cn('w-[11px] h-[11px]', resp !== 'todos' ? 'text-[#89bcbe]' : 'opacity-50')} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
            {respOptions.map(o => (
              <DropdownMenuItem key={o.value} onClick={() => onResp(o.value)}>
                {o.value !== 'todos' && (
                  <span className="w-[22px] h-[22px] rounded-full text-white text-[9px] font-bold flex items-center justify-center mr-2" style={{ background: avatarColor(o.label) }}>{getInitials(o.label)}</span>
                )}
                {o.label}{resp === o.value && <Check className="w-3.5 h-3.5 ml-auto text-[#89bcbe]" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* linhas */}
      {processos.map((p, i) => {
        const sel = selectedIds.has(p.id)
        return (
          <Link
            key={p.id}
            href={`/dashboard/processos/${p.id}`}
            className={cn(
              GRID, 'px-5 py-[14px] transition-colors',
              i < processos.length - 1 && 'border-b border-[#f0ede3] dark:border-[#1d2a3c]',
              sel ? 'bg-[#f7fbfb] dark:bg-[rgba(137,188,190,0.06)]' : 'hover:bg-[#fbfaf6] dark:hover:bg-[rgba(137,188,190,0.05)]'
            )}
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(p.id) }}
              className={cn('w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors', sel ? 'bg-[#34495e] border-[#34495e] text-white' : 'border-[#c4c0b4] dark:border-[#3a4452]')}
            >
              {sel && <Check className="w-2.5 h-2.5" />}
            </button>
            <span className="text-[11.5px] font-semibold text-[#5a6775] dark:text-[#8a97a8] font-mono tracking-[-0.02em]">{p.numero_pasta || '—'}</span>
            <span className="text-[13.5px] font-semibold text-[#2c3e50] dark:text-[#d8e2ef] truncate tracking-[-0.01em]">{p.cliente_nome || '—'}</span>
            <span className="text-[13px] text-[#5a6775] dark:text-[#8a97a8] truncate">{p.parte_contraria || '—'}</span>
            <span className="min-w-0 pr-3">{p.numero_cnj ? <CopyCnj cnj={p.numero_cnj} /> : <span className="text-[11px] text-[#9aa1a8] dark:text-[#5a6675]">—</span>}</span>
            <span className="min-w-0">
              <span className="block text-[12.5px] text-[#2c3e50] dark:text-[#d8e2ef] truncate leading-[1.35]">
                {p.ultima_mov_descricao || p.ultima_mov_tipo || 'Sem movimentações'}
              </span>
              <span className="block text-[10.5px] text-[#9aa1a8] dark:text-[#5a6675] font-mono mt-0.5">{formatUltMov(p.ultima_movimentacao)}</span>
            </span>
            <span>{p.area && <span className={cn('text-[10.5px] font-semibold px-[9px] py-[3px] rounded-md', areaChipClass(p.area))}>{areaLabel(p.area)}</span>}</span>
            <span className="inline-flex items-center gap-[7px]">
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: statusDot(p.status) }} />
              <span className="text-[12px] text-[#5a6775] dark:text-[#8a97a8]">{statusLabel(p.status)}</span>
            </span>
            <span className="justify-self-start">
              {p.responsavel_nome && (
                <span className="w-[27px] h-[27px] rounded-full text-white text-[10px] font-semibold flex items-center justify-center" style={{ background: avatarColor(p.responsavel_nome) }} title={p.responsavel_nome}>
                  {getInitials(p.responsavel_nome)}
                </span>
              )}
            </span>
          </Link>
        )
      })}

      {processos.length === 0 && (
        <div className="px-5 py-[52px] text-center">
          <Search className="w-[26px] h-[26px] text-[#9aa1a8] dark:text-[#5a6675] mx-auto mb-2.5" />
          <div className="text-[14px] font-semibold text-[#5a6775] dark:text-[#8a97a8]">{loading ? 'Carregando…' : 'Nenhum processo encontrado'}</div>
          {!loading && <div className="text-[12.5px] text-[#9aa1a8] dark:text-[#5a6675] mt-[3px]">Ajuste a busca, a área ou o responsável.</div>}
        </div>
      )}
    </div>
  )
}
