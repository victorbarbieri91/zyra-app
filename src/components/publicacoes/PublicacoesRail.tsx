'use client'

import { Settings, Search, Check, Archive, Undo2, X, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import PublicacaoListItem from './PublicacaoListItem'
import { type Publicacao, type AbaPub, tempoRelativo } from './publicacoes-ui'

interface PublicacoesRailProps {
  lista: Publicacao[]
  tab: AbaPub
  onTab: (t: AbaPub) => void
  counts: { pendentes: number; tratadas: number; todas: number; arquivadas: number }
  busca: string
  onBusca: (v: string) => void
  selId: string | null
  onSelect: (id: string) => void
  selecionados: Set<string>
  onToggleSelecao: (id: string) => void
  onLimparSelecao: () => void
  onBulkTratar: () => void
  onBulkArquivar: () => void
  onBulkVoltar: () => void
  onTratarItem: (id: string) => void
  onPrazoItem: (pub: Publicacao) => void
  onArquivarItem: (id: string) => void
  ultimaSync: string | null
  onConfig: () => void
}

const TABS: { v: AbaPub; l: string }[] = [
  { v: 'pendentes', l: 'Pendentes' },
  { v: 'tratadas', l: 'Tratadas' },
  { v: 'todas', l: 'Todas' },
  { v: 'arquivadas', l: 'Arquiv.' },
]

export default function PublicacoesRail(props: PublicacoesRailProps) {
  const {
    lista, tab, onTab, counts, busca, onBusca, selId, onSelect,
    selecionados, onToggleSelecao, onLimparSelecao, onBulkTratar, onBulkArquivar, onBulkVoltar,
    onTratarItem, onPrazoItem, onArquivarItem, ultimaSync, onConfig,
  } = props

  const modoSelecao = selecionados.size > 0
  const syncTxt = tempoRelativo(ultimaSync)

  return (
    <div className="w-[392px] flex-shrink-0 border-r border-[#e6e3da] dark:border-[#253345] bg-[#fbfaf6] dark:bg-[#0e141d] flex flex-col min-h-0">
      {/* cabeçalho */}
      <div className="px-[22px] pt-[22px] pb-[14px]">
        <div className="flex items-end justify-between">
          <h1
            className="m-0 text-[27px] font-medium tracking-[-0.03em] text-[#2c3e50] dark:text-[#edf1f7] leading-none"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Publicações
          </h1>
          <button
            onClick={onConfig}
            title="Configurar triagem"
            className="w-[34px] h-[34px] rounded-[9px] border border-[#e6e3da] dark:border-[#253345] text-[#5a6775] dark:text-[#8a97a8] flex items-center justify-center hover:border-[#89bcbe] transition-colors"
          >
            <Settings className="w-[15px] h-[15px]" />
          </button>
        </div>
        <p className="mt-[7px] text-[12px] text-[#5a6775] dark:text-[#8a97a8]">
          <span className="text-[#c2956b] font-semibold">{counts.pendentes} aguardando análise</span>
          {syncTxt && <> · sincronizado {syncTxt} com AASP</>}
        </p>
      </div>

      {/* barra de seleção em massa */}
      {modoSelecao && (
        <div className="mx-[22px] mb-[10px] px-3 py-2 rounded-[10px] bg-[#34495e] text-white flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold">{selecionados.size} selecionada(s)</span>
          <div className="flex-1" />
          <button onClick={onBulkTratar} title="Marcar como tratadas" className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-[11.5px] font-semibold transition-colors">
            <Check className="w-3.5 h-3.5" />Tratar
          </button>
          <button onClick={onBulkArquivar} title="Arquivar" className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-[11.5px] font-semibold transition-colors">
            <Archive className="w-3.5 h-3.5" />Arquivar
          </button>
          <button onClick={onBulkVoltar} title="Voltar para pendente" className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-[11.5px] font-semibold transition-colors">
            <Undo2 className="w-3.5 h-3.5" />Voltar
          </button>
          <button onClick={onLimparSelecao} title="Limpar seleção" className="w-7 h-7 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* filtros */}
      <div className="px-[22px] pb-[10px]">
        <div className="flex gap-1 bg-[#efece4] dark:bg-[#161d28] p-1 rounded-[11px]">
          {TABS.map(t => {
            const active = tab === t.v
            return (
              <button
                key={t.v}
                onClick={() => onTab(t.v)}
                className={cn(
                  'flex-1 py-[7px] px-1 rounded-[7px] text-[11.5px] font-semibold flex items-center justify-center gap-[5px] transition-colors',
                  active
                    ? 'bg-[#ffffff] dark:bg-[#26303d] text-[#34495e] dark:text-[#e2e8f0] shadow-sm'
                    : 'text-[#857f73] dark:text-[#8a97a8] hover:text-[#34495e] dark:hover:text-slate-300'
                )}
              >
                {t.l}
                {t.v === 'pendentes' && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-[5px] py-[1px] rounded-[6px] font-mono',
                      active ? 'bg-[#f1e4d2] text-[#9a6f3c]' : 'text-[#9aa1a8] dark:text-[#5a6675]'
                    )}
                  >
                    {counts.pendentes}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="relative mt-[9px]">
          <Search className="w-[13px] h-[13px] text-[#9aa1a8] dark:text-[#5a6675] absolute left-[11px] top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={e => onBusca(e.target.value)}
            placeholder="Buscar cliente, parte ou CNJ"
            className="w-full h-[34px] pl-8 pr-3 rounded-[9px] bg-[#ffffff] dark:bg-[#10161f] border border-[#e6e3da] dark:border-[#253345] text-[12.5px] text-[#2c3e50] dark:text-[#edf1f7] placeholder:text-[#9aa1a8] dark:placeholder:text-[#5a6675] outline-none focus:border-[#89bcbe]"
          />
        </div>
      </div>

      {/* lista */}
      <div className="flex-1 overflow-auto min-h-0 px-[14px] pt-0.5 pb-4">
        {lista.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Inbox className="w-[26px] h-[26px] text-[#6b9e84] mx-auto mb-2" />
            <div className="text-[13px] font-semibold text-[#5a6775] dark:text-[#8a97a8]">Tudo em dia</div>
            <div className="text-[12px] text-[#9aa1a8] dark:text-[#5a6675] mt-[3px]">
              Nenhuma publicação {tab === 'pendentes' ? 'pendente' : 'aqui'}.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {lista.map(p => (
              <PublicacaoListItem
                key={p.id}
                pub={p}
                selected={p.id === selId}
                selecionada={selecionados.has(p.id)}
                modoSelecao={modoSelecao}
                onClick={() => onSelect(p.id)}
                onToggleSelecao={() => onToggleSelecao(p.id)}
                onTratar={() => onTratarItem(p.id)}
                onPrazo={() => onPrazoItem(p)}
                onArquivar={() => onArquivarItem(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
