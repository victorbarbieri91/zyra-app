'use client'

import { useState } from 'react'
import { formatBrazilDateTime } from '@/lib/timezone'
import { CentroComandoMensagem, PendingInput, ToolResult } from '@/types/centro-comando'
import { ArrowRight, ChevronDown, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ResultsTable } from './ResultsTable'
import { MarkdownRenderer } from './MarkdownRenderer'
import { FormularioPendente } from './FormularioPendente'
import { FeedbackButtons, TipoFeedback } from './FeedbackButtons'

interface ChatMessageProps {
  mensagem: CentroComandoMensagem
  onNavigate?: (path: string) => void
  onOpenInputDialog?: (result: PendingInput | ToolResult) => void
  onFeedback?: (mensagemId: string, tipo: TipoFeedback) => void
  onCorrecao?: (mensagemId: string) => void
  onNegativoComRetry?: (mensagemId: string, correcao: string) => void
  feedbackEnviado?: TipoFeedback | null
  mostrarFeedback?: boolean
}

function sanitizarErroFrontend(erro: string): string {
  if (!erro) return 'Nao foi possivel completar a operacao.'
  const e = erro.toLowerCase()
  if (e.includes('permission') || e.includes('rls') || e.includes('policy')) return 'Voce nao tem permissao para esta operacao.'
  if (e.includes('constraint') || e.includes('violates') || e.includes('check_')) return 'Os dados informados nao sao validos. Tente novamente com valores diferentes.'
  if (e.includes('campo') && e.includes('obrigat')) return 'Alguns dados necessarios nao foram preenchidos.'
  if (!e.includes('error') && !e.includes('exception') && !e.includes('sql') && !e.includes('rpc') && !e.includes('function')) return erro
  return 'Nao foi possivel completar a operacao. Tente novamente.'
}

function filterToolResults(results: ToolResult[]): ToolResult[] {
  const temSucesso = results.some((r) => ((r.dados && !r.erro) || r.acao_pendente || r.aguardando_input || (r.tipo === 'navegacao' && r.caminho)))
  return temSucesso ? results.filter((r) => !r.erro) : results
}

export function ChatMessage({ mensagem, onNavigate, onOpenInputDialog, onFeedback, onCorrecao, onNegativoComRetry, feedbackEnviado, mostrarFeedback = false }: ChatMessageProps) {
  const [mostrarInlineCorrection, setMostrarInlineCorrection] = useState(false)
  const isUser = mensagem.role === 'user'
  const isSystem = mensagem.role === 'system'
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-[#34495e] text-white rounded-2xl rounded-br-md px-4 py-3">
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{mensagem.content}</div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex mb-4">
      <div className="max-w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[#89bcbe]">{isSystem ? 'Sistema' : 'Zyra'}</span>
          <span className="text-[10px] text-slate-400">{formatBrazilDateTime(mensagem.timestamp)}</span>
        </div>
        {mensagem.content && <MarkdownRenderer content={mensagem.content} />}
        {mensagem.pending_input && onOpenInputDialog && <FormularioPendente pendingInput={mensagem.pending_input} onAbrirFormulario={() => onOpenInputDialog(mensagem.pending_input!)} />}
        {mensagem.tool_results && mensagem.tool_results.length > 0 && (() => {
          const temTabelaMarkdown = mensagem.content?.includes('| ---') || mensagem.content?.includes('|---')
          const filteredResults = filterToolResults(mensagem.tool_results).filter((result) => !(temTabelaMarkdown && result.tool === 'consultar_dados' && result.dados))
          if (filteredResults.length === 0) return null
          return (
            <div className="mt-3 space-y-3">
              {filteredResults.map((result, index) => <ToolResultDisplay key={index} result={result} onNavigate={onNavigate} onOpenInputDialog={onOpenInputDialog} />)}
            </div>
          )
        })()}
        {mensagem.erro && <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">{sanitizarErroFrontend(mensagem.erro)}</div>}
        {!isUser && !isSystem && mostrarFeedback && onFeedback && onCorrecao && mensagem.id && (
          <FeedbackButtons
            mensagemId={mensagem.id}
            onFeedback={(tipo) => onFeedback(mensagem.id!, tipo)}
            onCorrecao={() => onCorrecao(mensagem.id!)}
            onNegativoComRetry={(correcao) => onNegativoComRetry?.(mensagem.id!, correcao)}
            feedbackEnviado={feedbackEnviado}
            mostrarInlineCorrection={mostrarInlineCorrection}
            onToggleInlineCorrection={() => setMostrarInlineCorrection((prev) => !prev)}
          />
        )}
      </div>
    </div>
  )
}

function ToolResultDisplay({ result, onNavigate, onOpenInputDialog }: { result: ToolResult; onNavigate?: (path: string) => void; onOpenInputDialog?: (result: PendingInput | ToolResult) => void }) {
  if (result.tool === 'consultar_dados' && result.dados) {
    return (
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">{result.explicacao}</span>
              <span className="text-[10px] text-slate-400">({result.total} registros)</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden">
            {result.dados.length > 0 ? <ResultsTable data={result.dados} /> : <div className="p-4 text-center text-sm text-slate-400">Nenhum registro encontrado</div>}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }
  if (result.erro) return <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg"><p className="text-sm text-amber-700">{sanitizarErroFrontend(result.erro)}</p></div>
  if (result.tipo === 'navegacao' && result.caminho) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-sm text-slate-600 flex-1">{result.explicacao}</p>
        <Button size="sm" variant="outline" className="text-slate-600 border-slate-300 text-xs" onClick={() => onNavigate?.(result.caminho!)}>
          <ArrowRight className="w-3.5 h-3.5 mr-1" />Ir
        </Button>
      </div>
    )
  }
  if ((result.campos_necessarios || result.aguardando_input) && onOpenInputDialog) {
    const pendingInput: PendingInput = { id: result.acao_id || `legacy-${Date.now()}`, tipo: 'collection', contexto: result.contexto || 'Preciso de mais informacoes.', schema: { fields: result.campos_necessarios || [] } }
    return <FormularioPendente pendingInput={pendingInput} onAbrirFormulario={() => onOpenInputDialog(pendingInput)} />
  }
  if (result.acao_pendente) return <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg"><p className="text-sm text-amber-700">{result.explicacao}</p>{result.aviso && <p className="text-xs text-red-500 mt-2">{result.aviso}</p>}</div>
  return null
}
