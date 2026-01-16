'use client'

import { cn } from '@/lib/utils'
import { formatBrazilDateTime } from '@/lib/timezone'
import { CentroComandoMensagem, ToolResult } from '@/types/centro-comando'
import { User, Bot, AlertCircle, Loader2, Table, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResultsTable } from './ResultsTable'

interface ChatMessageProps {
  mensagem: CentroComandoMensagem
  onNavigate?: (path: string) => void
}

export function ChatMessage({ mensagem, onNavigate }: ChatMessageProps) {
  const isUser = mensagem.role === 'user'
  const isSystem = mensagem.role === 'system'
  const isLoading = mensagem.loading

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser ? 'bg-slate-100' : 'bg-white border border-slate-200',
        isSystem && 'bg-blue-50 border-blue-200',
        mensagem.erro && 'bg-red-50 border-red-200'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-[#34495e]' : 'bg-[#89bcbe]',
          isSystem && 'bg-blue-500',
          mensagem.erro && 'bg-red-500'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : mensagem.erro ? (
          <AlertCircle className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-slate-700">
            {isUser ? 'Você' : isSystem ? 'Sistema' : 'Zyra'}
          </span>
          <span className="text-xs text-slate-400">
            {formatBrazilDateTime(mensagem.timestamp)}
          </span>
        </div>

        {/* Mensagem */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Pensando...</span>
          </div>
        ) : (
          <>
            {/* Texto da mensagem */}
            {mensagem.content && (
              <div className="text-sm text-slate-600 whitespace-pre-wrap">
                {mensagem.content}
              </div>
            )}

            {/* Resultados de ferramentas */}
            {mensagem.tool_results && mensagem.tool_results.length > 0 && (
              <div className="mt-3 space-y-3">
                {mensagem.tool_results.map((result, index) => (
                  <ToolResultDisplay
                    key={index}
                    result={result}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}

            {/* Erro */}
            {mensagem.erro && (
              <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                Erro técnico: {mensagem.erro}
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
}: {
  result: ToolResult
  onNavigate?: (path: string) => void
}) {
  // Consulta com dados
  if (result.tool === 'consultar_dados' && result.dados) {
    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">
              {result.explicacao}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {result.total} {result.total === 1 ? 'registro' : 'registros'}
          </Badge>
        </div>
        {result.dados.length > 0 ? (
          <ResultsTable data={result.dados} />
        ) : (
          <div className="p-4 text-center text-sm text-slate-500">
            Nenhum registro encontrado
          </div>
        )}
      </div>
    )
  }

  // Erro
  if (result.erro) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Erro</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{result.erro}</p>
      </div>
    )
  }

  // Navegação
  if (result.tipo === 'navegacao' && result.caminho) {
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700 mb-2">{result.explicacao}</p>
        <Button
          size="sm"
          variant="outline"
          className="text-blue-600 border-blue-300"
          onClick={() => onNavigate?.(result.caminho!)}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Ir para página
        </Button>
      </div>
    )
  }

  // Ação pendente (preview)
  if (result.acao_pendente) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-700 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Aguardando confirmação</span>
        </div>
        <p className="text-sm text-amber-600">{result.explicacao}</p>
        {result.aviso && (
          <p className="text-xs text-red-600 mt-2 font-medium">{result.aviso}</p>
        )}
      </div>
    )
  }

  // Campos necessários
  if (result.aguardando_input && result.campos_necessarios) {
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700 mb-2">{result.contexto}</p>
        <div className="space-y-2">
          {result.campos_necessarios.map((campo, i) => (
            <div key={i} className="text-xs text-blue-600">
              • <span className="font-medium">{campo.descricao}</span>
              {campo.obrigatorio && <span className="text-red-500">*</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
