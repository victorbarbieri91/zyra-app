'use client'

import {
  Calendar, ArrowUpRight, Link2, Archive, Check, CheckSquare, Gavel,
  Loader2, Copy, FileText, Download, Undo2, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PublicacaoConversa from './PublicacaoConversa'
import {
  type Publicacao, statusUI, tipoChipClass, tipoLabel, partesLabel, formatDataHora,
} from './publicacoes-ui'

interface PublicacaoDetalheProps {
  pub: Publicacao
  texto: string | null
  textoLoading: boolean
  escritorioId: string
  conversaAberta: boolean
  onToggleConversa: () => void
  onAgendarTarefa: () => void
  onAgendarEvento: () => void
  onAgendarAudiencia: () => void
  onAbrirProcesso: () => void
  onVincular: () => void
  onArquivar: () => void
  onTratar: () => void
  onVoltarPendente: () => void
  onCopiar: () => void
}

const btnSecondary =
  'h-[34px] px-[13px] rounded-[9px] bg-[#ffffff] dark:bg-[#151e2b] text-[#2c3e50] dark:text-[#edf1f7] border border-[#e6e3da] dark:border-[#253345] text-[12px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap hover:border-[#89bcbe] transition-colors'

export default function PublicacaoDetalhe(props: PublicacaoDetalheProps) {
  const {
    pub, texto, textoLoading, escritorioId,
    conversaAberta, onToggleConversa, onAgendarTarefa, onAgendarEvento, onAgendarAudiencia,
    onAbrirProcesso, onVincular, onArquivar, onTratar, onVoltarPendente, onCopiar,
  } = props

  const st = statusUI(pub.status)
  const ehPendente = pub.status === 'pendente' || pub.status === 'em_analise'
  const temPasta = !!pub.processo_id
  const temNumero = !!pub.numero_processo

  const paragrafos = (texto || '')
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#fafaf7] dark:bg-[#0b0f14] min-h-0">
      {/* ---- cabeçalho do detalhe ---- */}
      <div className="px-[30px] pt-5 pb-4 border-b border-[#f0ede3] dark:border-[#1d2a3c] flex-shrink-0">
        {/* meta */}
        <div className="flex items-center gap-2 mb-[9px] flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 text-[10.5px] font-bold px-[9px] py-[3px] rounded-md', st.chip)}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: st.dot }} />
            {st.label}
          </span>
          <span className={cn('text-[10.5px] font-bold px-[9px] py-[3px] rounded-md', tipoChipClass(pub.tipo_publicacao))}>
            {tipoLabel(pub.tipo_publicacao)}
          </span>
          <span className="text-[11.5px] text-[#5a6775] dark:text-[#8a97a8]">
            {pub.tribunal}{pub.vara ? ` · ${pub.vara}` : ''}
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-[#9aa1a8] dark:bg-[#5a6675]" />
          <span className="text-[11.5px] text-[#9aa1a8] dark:text-[#5a6675]">{formatDataHora(pub.data_publicacao, pub.created_at)}</span>
        </div>

        {/* título (sozinho) */}
        <h2
          className="m-0 text-[24px] font-medium tracking-[-0.025em] text-[#2c3e50] dark:text-[#edf1f7] leading-[1.2]"
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          {partesLabel(pub)}
        </h2>

        {/* número do processo */}
        <div className="flex items-center gap-[9px] mt-1.5">
          {pub.numero_processo && (
            <span className="text-[12px] text-[#5a6775] dark:text-[#8a97a8] font-mono">{pub.numero_processo}</span>
          )}
          {!temPasta && temNumero && (
            <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-[5px] bg-[#f6efe4] text-[#9a6f3c] dark:bg-[rgba(194,149,107,0.16)] dark:text-[#d6a87a]">
              sem processo vinculado
            </span>
          )}
        </div>

        {/* ações (abaixo do número do processo) */}
        <div className="flex items-center gap-[7px] flex-wrap mt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={btnSecondary} title="Criar prazo/tarefa na agenda">
                <Calendar className="w-3.5 h-3.5" />Agendar<ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={onAgendarTarefa}><CheckSquare className="w-4 h-4 mr-2" />Criar tarefa</DropdownMenuItem>
              <DropdownMenuItem onClick={onAgendarEvento}><Calendar className="w-4 h-4 mr-2" />Criar compromisso</DropdownMenuItem>
              <DropdownMenuItem onClick={onAgendarAudiencia}><Gavel className="w-4 h-4 mr-2" />Criar audiência</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {temPasta ? (
            <button onClick={onAbrirProcesso} className={btnSecondary} title="Ir para o processo no sistema">
              <ArrowUpRight className="w-3.5 h-3.5" />Ir ao processo
            </button>
          ) : temNumero ? (
            <button
              onClick={onVincular}
              title="Vincular a um processo da carteira"
              className="h-[34px] px-[13px] rounded-[9px] bg-[#f6efe4] dark:bg-[rgba(194,149,107,0.16)] text-[#9a6f3c] dark:text-[#d6a87a] border border-[#e6d3b4] dark:border-[#6b5436] text-[12px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Link2 className="w-3.5 h-3.5" />Vincular processo
            </button>
          ) : null}

          <button onClick={onArquivar} className={btnSecondary} title="Arquivar publicação">
            <Archive className="w-3.5 h-3.5" />Arquivar
          </button>

          <div className="w-px h-[26px] bg-[#e6e3da] dark:bg-[#253345] mx-[1px]" />

          {ehPendente ? (
            <button
              onClick={onTratar}
              className="h-[34px] px-[14px] rounded-[9px] bg-gradient-to-br from-[#34495e] to-[#46627f] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-[0_4px_12px_-4px_rgba(52,73,94,0.4)] whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />Marcar como tratada
            </button>
          ) : (
            <div className="inline-flex items-center gap-2">
              <span className={cn('inline-flex items-center gap-1.5 text-[12px] font-semibold px-[13px] h-[34px] rounded-[9px]', st.chip)}>
                <Check className="w-3.5 h-3.5" />{st.label}
              </span>
              <button onClick={onVoltarPendente} className={btnSecondary} title="Voltar para pendente">
                <Undo2 className="w-3.5 h-3.5" />Reabrir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- corpo: leitura + conversa ---- */}
      <div className="flex-1 flex min-h-0">
        {/* LEITURA */}
        <div className="flex-1 min-w-0 overflow-auto flex justify-center px-9 pt-[30px] pb-14">
          <div className="w-full max-w-[720px]">
            {/* faixa: rótulo + origem + copiar */}
            <div className="flex items-center justify-between mb-[18px]">
              <span className="text-[10.5px] font-bold text-[#9aa1a8] dark:text-[#5a6675] tracking-[0.12em] uppercase">Texto da publicação</span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9aa1a8] dark:text-[#5a6675] inline-flex items-center gap-1.5">
                  <Download className="w-3 h-3" />Recebido via {pub.source === 'escavador' ? 'Escavador' : 'AASP'}
                </span>
                <button onClick={onCopiar} className="h-[26px] px-[9px] rounded-[7px] bg-[#ffffff] dark:bg-[#151e2b] text-[#5a6775] dark:text-[#8a97a8] border border-[#e6e3da] dark:border-[#253345] text-[11px] font-semibold inline-flex items-center gap-1.5" title="Copiar texto da publicação">
                  <Copy className="w-3 h-3" />Copiar
                </button>
              </div>
            </div>

            {pub.is_snippet && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-[#f6efe4] border border-[#e6d3b4] dark:bg-[rgba(194,149,107,0.12)] dark:border-[#6b5436] mb-5">
                <span className="text-[12px] text-[#9a6f3c] dark:text-[#d6a87a] leading-relaxed">
                  Texto parcial (trecho) recebido da fonte. O inteiro teor pode estar disponível no processo.
                </span>
              </div>
            )}

            {!ehPendente && pub.agendamento_id && (
              <div className="flex items-center gap-[9px] px-3.5 py-2.5 rounded-[10px] bg-[#eef5f0] border border-[#cfe5d8] dark:bg-[rgba(107,158,132,0.12)] dark:border-[#2c4a3a] mb-5">
                <Calendar className="w-3.5 h-3.5 text-[#3f6a54]" />
                <span className="text-[12px] text-[#2c3e50] dark:text-[#edf1f7]">
                  {pub.agendamento_tipo === 'audiencia' ? 'Audiência' : pub.agendamento_tipo === 'compromisso' ? 'Compromisso' : 'Tarefa'} criada e prazo lançado na agenda.
                </span>
              </div>
            )}

            {textoLoading ? (
              <div className="flex items-center gap-2 py-12 text-[#9aa1a8] dark:text-[#5a6675] text-[13px]">
                <Loader2 className="w-4 h-4 animate-spin" />Carregando texto…
              </div>
            ) : paragrafos.length === 0 ? (
              <div className="py-12 text-[13px] text-[#9aa1a8] dark:text-[#5a6675]">Texto da publicação não disponível.</div>
            ) : (
              <article style={{ fontFamily: 'var(--font-sans)' }}>
                {paragrafos.map((p, i) => (
                  <p
                    key={i}
                    className="m-0 mb-4 text-justify text-[#2f3e4d] dark:text-[#c4cedb]"
                    style={{ fontSize: 15, lineHeight: 1.82, hyphens: 'auto', letterSpacing: '-0.002em' }}
                  >
                    {p}
                  </p>
                ))}
              </article>
            )}

            {pub.pdf_url && (
              <div className="flex gap-2 mt-[26px] pt-5 border-t border-[#f0ede3] dark:border-[#1d2a3c]">
                <a href={pub.pdf_url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                  <FileText className="w-3.5 h-3.5" />Ver PDF original
                </a>
              </div>
            )}
          </div>
        </div>

        {/* CONVERSA */}
        <PublicacaoConversa
          key={pub.id}
          publicacaoId={pub.id}
          escritorioId={escritorioId}
          aberta={conversaAberta}
          onToggle={onToggleConversa}
        />
      </div>
    </div>
  )
}
