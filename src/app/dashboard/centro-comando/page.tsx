'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquareCode,
  Sparkles,
  History,
  Star,
  Trash2,
  Plus,
  Bot,
  ChevronRight,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCentroComando } from '@/hooks/useCentroComando'
import { ChatMessage } from '@/components/centro-comando/ChatMessage'
import { ChatInput } from '@/components/centro-comando/ChatInput'
import { ConfirmationDialog } from '@/components/centro-comando/ConfirmationDialog'
import { ThinkingSteps } from '@/components/centro-comando/ThinkingSteps'
import { COMANDOS_SUGERIDOS } from '@/types/centro-comando'
import { formatBrazilDateTime } from '@/lib/timezone'

export default function CentroComandoPage() {
  const router = useRouter()
  const {
    mensagens,
    carregando,
    acoesPendentes,
    passos,
    sessoes,
    carregandoSessoes,
    sessaoId,
    enviarMensagem,
    confirmarAcao,
    cancelarAcao,
    limparChat,
    trocarSessao,
    messagesEndRef,
  } = useCentroComando()

  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  // Estado para ação sendo confirmada
  const [acaoConfirmando, setAcaoConfirmando] = useState<string | null>(null)

  // Encontrar ação atual
  const acaoAtual = acoesPendentes.find(a => a.id === acaoConfirmando) || acoesPendentes[0] || null

  // Abrir diálogo de confirmação quando houver ação pendente
  useEffect(() => {
    if (acoesPendentes.length > 0 && !acaoConfirmando) {
      setAcaoConfirmando(acoesPendentes[0].id)
    }
  }, [acoesPendentes, acaoConfirmando])

  // Handler de navegação
  const handleNavigate = (path: string) => {
    router.push(path)
  }

  // Handler de confirmação
  const handleConfirm = async (duplaConfirmacao?: boolean) => {
    if (!acaoAtual) return

    const sucesso = await confirmarAcao({
      acao_id: acaoAtual.id,
      dupla_confirmacao: duplaConfirmacao,
    })

    if (sucesso) {
      setAcaoConfirmando(null)
    }
  }

  // Handler de cancelamento
  const handleCancel = () => {
    if (acaoAtual) {
      cancelarAcao(acaoAtual.id)
    }
    setAcaoConfirmando(null)
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center">
              <MessageSquareCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#34495e]">
                Centro de Comando
              </h1>
              <p className="text-xs text-slate-500">
                Converse com a Zyra para gerenciar seus processos, clientes e agenda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setMostrarHistorico(!mostrarHistorico)}
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Histórico
              {sessoes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px]">
                  {sessoes.length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={limparChat}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nova conversa
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de histórico */}
        {mostrarHistorico && (
          <div className="w-72 border-r border-slate-200 bg-white flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <History className="w-4 h-4" />
                Conversas anteriores
              </h3>
            </div>
            <ScrollArea className="flex-1">
              {carregandoSessoes ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : sessoes.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  Nenhuma conversa anterior
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {sessoes.map((sessao) => (
                    <button
                      key={sessao.id}
                      onClick={() => {
                        trocarSessao(sessao.id)
                        setMostrarHistorico(false)
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        sessao.id === sessaoId
                          ? 'bg-[#89bcbe]/10 border border-[#89bcbe]/30'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate">
                            {sessao.titulo || 'Conversa sem título'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatBrazilDateTime(new Date(sessao.created_at))}
                          </p>
                        </div>
                        {sessao.ativo && (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">
                            Ativa
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Área do chat */}
        <div className="flex-1 flex flex-col">
          {/* Mensagens */}
          <ScrollArea className="flex-1 p-4">
            {mensagens.length === 0 ? (
              <WelcomeScreen onSelectCommand={enviarMensagem} />
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {mensagens.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    mensagem={msg}
                    onNavigate={handleNavigate}
                  />
                ))}
                {/* Passos do thinking em tempo real */}
                {passos.length > 0 && (
                  <ThinkingSteps passos={passos} />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto">
              <ChatInput
                onSend={enviarMensagem}
                disabled={carregando}
                placeholder="O que você gostaria de fazer? Ex: Mostre meus processos trabalhistas..."
              />
            </div>
          </div>
        </div>

        {/* Sidebar direita (opcional - pode ser habilitada depois) */}
        {/* <div className="w-72 border-l border-slate-200 bg-white p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Comandos favoritos
          </h3>
        </div> */}
      </div>

      {/* Diálogo de confirmação */}
      <ConfirmationDialog
        acao={acaoAtual}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={carregando}
      />
    </div>
  )
}

// ============================================
// TELA DE BOAS-VINDAS
// ============================================
function WelcomeScreen({ onSelectCommand }: { onSelectCommand: (cmd: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      {/* Logo/Ícone */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#34495e] to-[#46627f] flex items-center justify-center mb-6 shadow-lg">
        <Bot className="w-10 h-10 text-white" />
      </div>

      {/* Título */}
      <h2 className="text-2xl font-bold text-[#34495e] mb-2">
        Olá! Sou a Zyra
      </h2>
      <p className="text-slate-500 mb-8 max-w-md">
        Sua assistente jurídica inteligente. Posso ajudar você a consultar processos,
        criar tarefas, registrar horas e muito mais usando linguagem natural.
      </p>

      {/* Sugestões */}
      <div className="w-full max-w-2xl">
        <p className="text-sm text-slate-400 mb-4 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          Experimente um destes comandos:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMANDOS_SUGERIDOS.map((sugestao, index) => (
            <button
              key={index}
              onClick={() => onSelectCommand(sugestao.texto)}
              className="text-left p-4 bg-white border border-slate-200 rounded-lg hover:border-[#89bcbe] hover:shadow-md transition-all group"
            >
              <div className="text-sm font-medium text-slate-700 group-hover:text-[#34495e]">
                {sugestao.texto}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {sugestao.descricao}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dica */}
      <div className="mt-8 text-xs text-slate-400">
        Dica: Você pode usar <kbd className="px-1.5 py-0.5 bg-slate-100 rounded">Ctrl+K</kbd> para abrir o Centro de Comando de qualquer página
      </div>
    </div>
  )
}
