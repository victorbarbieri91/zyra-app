'use client'

import { useState } from 'react'
import { Check, Calendar, Archive, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type Publicacao,
  statusUI,
  tipoChipClass,
  tipoLabel,
  tribunalCurto,
  partesLabel,
  formatDataCurta,
} from './publicacoes-ui'

interface PublicacaoListItemProps {
  pub: Publicacao
  selected: boolean
  selecionada: boolean // marcada para ação em massa
  modoSelecao: boolean // há alguma seleção ativa → mostrar checkbox sempre
  onClick: () => void
  onToggleSelecao: () => void
  onTratar: () => void
  onPrazo: () => void
  onArquivar: () => void
}

export default function PublicacaoListItem({
  pub,
  selected,
  selecionada,
  modoSelecao,
  onClick,
  onToggleSelecao,
  onTratar,
  onPrazo,
  onArquivar,
}: PublicacaoListItemProps) {
  const [hover, setHover] = useState(false)
  const st = statusUI(pub.status)
  const semPasta = !pub.processo_id && !!pub.numero_processo
  const ehPendente = pub.status === 'pendente' || pub.status === 'em_analise'
  const mostrarAcoes = (hover || selected) && ehPendente && !modoSelecao
  const mostrarCheck = modoSelecao || hover || selected

  const quickBtn =
    'w-[26px] h-[26px] rounded-[7px] border border-[#e2ddd2] dark:border-[#2a3544] bg-[#ffffff] dark:bg-[#1c2530] flex items-center justify-center transition-colors'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'relative cursor-pointer rounded-[10px] pl-[15px] pr-3 py-[11px] border transition-colors',
        selected
          ? 'bg-[#ffffff] dark:bg-[#1a2531] border-[#dfe6e6] dark:border-[#2a3a4d] shadow-[0_2px_8px_-3px_rgba(52,73,94,0.12)]'
          : 'border-transparent hover:bg-[#f5f3ec] dark:hover:bg-[#141b25]'
      )}
    >
      {selected && (
        <div className="absolute left-0 top-[9px] bottom-[9px] w-[3px] rounded-[3px] bg-gradient-to-b from-[#89bcbe] to-[#6ba9ab]" />
      )}

      {/* linha 1: dot + data + tipo + tribunal + (sem pasta) + comentários/checkbox */}
      <div className="flex items-center gap-[7px] mb-1">
        {mostrarCheck ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleSelecao() }}
            title="Selecionar"
            className={cn(
              'w-[14px] h-[14px] rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors',
              selecionada
                ? 'bg-[#34495e] border-[#34495e] text-white'
                : 'border-[#c4c0b4] dark:border-[#3a4452] bg-transparent'
            )}
          >
            {selecionada && <Check className="w-2.5 h-2.5" />}
          </button>
        ) : (
          <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: st.dot }} />
        )}
        <span className="text-[10px] font-semibold text-[#9aa1a8] dark:text-[#5a6675] font-mono">{formatDataCurta(pub.data_publicacao)}</span>
        <span className={cn('text-[10px] font-bold px-[6px] py-[1.5px] rounded-[5px]', tipoChipClass(pub.tipo_publicacao))}>
          {tipoLabel(pub.tipo_publicacao)}
        </span>
        <span className="text-[10px] font-semibold text-[#9aa1a8] dark:text-[#5a6675]">{tribunalCurto(pub.tribunal)}</span>
        <div className="flex-1" />
        {semPasta && (
          <span className="text-[9px] font-bold px-[6px] py-[1.5px] rounded-[5px] bg-[#f6efe4] text-[#9a6f3c] dark:bg-[rgba(194,149,107,0.16)] dark:text-[#d6a87a]">
            sem pasta
          </span>
        )}
        {!!pub.comentarios_count && pub.comentarios_count > 0 && (
          <span className="inline-flex items-center gap-[3px] text-[10px] font-semibold text-[#9aa1a8] dark:text-[#5a6675]">
            <MessageSquare className="w-[11px] h-[11px]" />
            {pub.comentarios_count}
          </span>
        )}
      </div>

      {/* partes */}
      <div className="text-[12.5px] font-semibold text-[#2c3e50] dark:text-[#edf1f7] leading-[1.35] tracking-[-0.01em] mb-[3px] line-clamp-2">
        {partesLabel(pub)}
      </div>

      {/* snippet + CNJ + ações rápidas */}
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          {pub.resumo && (
            <div className="text-[11.5px] text-[#5a6775] dark:text-[#8a97a8] leading-[1.4] line-clamp-1">{pub.resumo}</div>
          )}
          {pub.numero_processo && (
            <div className="text-[9.5px] text-[#9aa1a8] dark:text-[#5a6675] font-mono mt-[3px]">{pub.numero_processo}</div>
          )}
        </div>
        {mostrarAcoes && (
          <div className="flex gap-[2px] flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); onTratar() }} title="Marcar como tratada" className={cn(quickBtn, 'text-[#6b9e84]')}>
              <Check className="w-[13px] h-[13px]" />
            </button>
            <button onClick={e => { e.stopPropagation(); onPrazo() }} title="Criar prazo/tarefa" className={cn(quickBtn, 'text-[#5a6775] dark:text-[#aab4c0]')}>
              <Calendar className="w-[13px] h-[13px]" />
            </button>
            <button onClick={e => { e.stopPropagation(); onArquivar() }} title="Arquivar" className={cn(quickBtn, 'text-[#5a6775] dark:text-[#aab4c0]')}>
              <Archive className="w-[13px] h-[13px]" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
