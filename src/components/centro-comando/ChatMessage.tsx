'use client'

import { cn } from '@/lib/utils'
import { formatBrazilDateTime } from '@/lib/timezone'
import { CentroComandoMensagem, ToolResult } from '@/types/centro-comando'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResultsTable } from './ResultsTable'
import { FormularioPendente } from './FormularioPendente'

interface ChatMessageProps {
  mensagem: CentroComandoMensagem
  onNavigate?: (path: string) => void
  onOpenInputDialog?: (result: ToolResult) => void
}

// Filtrar resultados de ferramentas:
// - Se houver resultados com dados bem sucedidos, esconde erros intermediários
// - Mantém erros apenas se TODOS os resultados falharam
function filterToolResults(results: ToolResult[]): ToolResult[] {
  // Verificar se há algum resultado bem sucedido (com dados ou ação pendente)
  const temSucesso = results.some(r =>
    (r.dados && r.dados.length >= 0 && !r.erro) ||
    r.acao_pendente ||
    r.aguardando_input ||
    (r.tipo === 'navegacao' && r.caminho)
  )

  // Se tem sucesso, filtrar apenas os erros (manter os sucessos)
  if (temSucesso) {
    return results.filter(r => !r.erro)
  }

  // Se não tem sucesso, mostrar tudo (incluindo erros)
  return results
}

export function ChatMessage({ mensagem, onNavigate, onOpenInputDialog }: ChatMessageProps) {
  const isUser = mensagem.role === 'user'
  const isSystem = mensagem.role === 'system'
  const isLoading = mensagem.loading

  // Mensagem do usuário - alinhada à direita
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-[#34495e] text-white rounded-2xl rounded-br-md px-4 py-3">
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {mensagem.content}
          </div>
        </div>
      </div>
    )
  }

  // Mensagem da Zyra ou sistema
  return (
    <div className="flex mb-4">
      <div className="max-w-[85%]">
        {/* Header com nome e timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[#89bcbe]">
            {isSystem ? 'Sistema' : 'Zyra'}
          </span>
          <span className="text-[10px] text-slate-400">
            {formatBrazilDateTime(mensagem.timestamp)}
          </span>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-2">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] animate-pulse [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#89bcbe] animate-pulse [animation-delay:0.4s]" />
            </div>
            <span className="text-xs">Processando...</span>
          </div>
        ) : (
          <>
            {/* Texto da mensagem */}
            {mensagem.content && (
              <div className={cn(
                'text-sm text-slate-700 leading-relaxed whitespace-pre-wrap',
                mensagem.erro && 'text-red-600'
              )}>
                {mensagem.content}
              </div>
            )}

            {/* Resultados de ferramentas */}
            {mensagem.tool_results && mensagem.tool_results.length > 0 && (
              <div className="mt-3 space-y-3">
                {filterToolResults(mensagem.tool_results).map((result, index) => (
                  <ToolResultDisplay
                    key={index}
                    result={result}
                    onNavigate={onNavigate}
                    onOpenInputDialog={onOpenInputDialog}
                  />
                ))}
              </div>
            )}

            {/* Erro */}
            {mensagem.erro && (
              <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                {mensagem.erro}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE DE RESULTADO DE FERRAMENTA
// ============================================
function ToolResultDisplay({
  result,
  onNavigate,
  onOpenInputDialog,
}: {
  result: ToolResult
  onNavigate?: (path: string) => void
  onOpenInputDialog?: (result: ToolResult) => void
}) {
  // Consulta com dados
  if (result.tool === 'consultar_dados' && result.dados) {
    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
          <span className="text-xs text-slate-500">{result.explicacao}</span>
          <span className="text-xs text-slate-400 ml-2">• {result.total} registros</span>
        </div>
        {result.dados.length > 0 ? (
          <ResultsTable data={result.dados} />
        ) : (
          <div className="p-4 text-center text-sm text-slate-400">
            Nenhum registro encontrado
          </div>
        )}
      </div>
    )
  }

  // Erro
  if (result.erro) {
    return (
      <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
        <p className="text-sm text-red-600">{result.erro || 'Erro ao processar solicitação'}</p>
      </div>
    )
  }

  // Navegação
  if (result.tipo === 'navegacao' && result.caminho) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-sm text-slate-600 flex-1">{result.explicacao}</p>
        <Button
          size="sm"
          variant="outline"
          className="text-slate-600 border-slate-300 text-xs"
          onClick={() => onNavigate?.(result.caminho!)}
        >
          <ArrowRight className="w-3.5 h-3.5 mr-1" />
          Ir
        </Button>
      </div>
    )
  }

  // Ação pendente (preview)
  if (result.acao_pendente) {
    return (
      <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg">
        <p className="text-sm text-amber-700">{result.explicacao}</p>
        {result.aviso && (
          <p className="text-xs text-red-500 mt-2">{result.aviso}</p>
        )}
      </div>
    )
  }

  // Campos necessarios - abre modal de coleta
  if (result.aguardando_input && result.campos_necessarios) {
    return (
      <FormularioPendente
        contexto={result.contexto}
        campos={result.campos_necessarios}
        onAbrirFormulario={() => onOpenInputDialog?.(result)}
      />
    )
  }

  return null
}
