'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  History,
  Plus,
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
import { InformationCollectionDialog } from '@/components/centro-comando/InformationCollectionDialog'
import { ThinkingSteps } from '@/components/centro-comando/ThinkingSteps'
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
    camposPendentes,
    enviarMensagem,
    confirmarAcao,
    cancelarAcao,
    limparChat,
    trocarSessao,
    abrirFormularioInput,
    fecharFormularioInput,
    responderCamposNecessarios,
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
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-2xl font-semibold text-[#34495e]">
              Centro de Comando
            </h1>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 hidden md:block">
              Converse com a Zyra para gerenciar seus processos
            </p>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setMostrarHistorico(!mostrarHistorico)}
            >
              <History className="w-3.5 h-3.5 md:mr-1.5" />
              <span className="hidden md:inline">Histórico</span>
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

        {/* Área do chat - Layout condicional */}
        <div className="flex-1 flex flex-col">
          {mensagens.length === 0 ? (
            /* Tela inicial - Input centralizado (estilo ChatGPT/Claude) */
            <WelcomeScreen
              onSend={enviarMensagem}
              disabled={carregando}
            />
          ) : (
            /* Conversa ativa - Input no rodapé */
            <>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {mensagens.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      mensagem={msg}
                      onNavigate={handleNavigate}
                      onOpenInputDialog={abrirFormularioInput}
                    />
                  ))}
                  {/* Passos do thinking em tempo real */}
                  {passos.length > 0 && (
                    <ThinkingSteps passos={passos} />
                  )}
                  <div ref={messagesEndRef} className="h-1" />
                </div>
              </div>

              {/* Input no rodapé */}
              <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200">
                <div className="max-w-4xl mx-auto">
                  <ChatInput
                    onSend={enviarMensagem}
                    disabled={carregando}
                    placeholder="Continue a conversa..."
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Diálogo de confirmação */}
      <ConfirmationDialog
        acao={acaoAtual}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={carregando}
      />

      {/* Diálogo de coleta de informações */}
      <InformationCollectionDialog
        toolResult={camposPendentes}
        onSubmit={responderCamposNecessarios}
        onCancel={fecharFormularioInput}
        loading={carregando}
      />
    </div>
  )
}

// ============================================
// TELA DE BOAS-VINDAS - Estilo ChatGPT/Claude
// ============================================
interface WelcomeScreenProps {
  onSend: (message: string) => void
  disabled?: boolean
}

function WelcomeScreen({ onSend, disabled }: WelcomeScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      {/* Container principal centralizado */}
      <div className="w-full max-w-2xl">
        {/* Logo e saudação */}
        <div className="text-center mb-8">
          {/* Logo Zyra */}
          <div className="flex justify-center mb-6">
            <Image
              src="/zyra.logo.png"
              alt="Zyra"
              width={130}
              height={130}
              className="rounded-2xl"
              priority
            />
          </div>

          {/* Saudação única */}
          <h2 className="text-2xl font-semibold text-[#34495e]">
            Como posso ajudar?
          </h2>
        </div>

        {/* Input centralizado - clean */}
        <div className="w-full">
          <ChatInput
            onSend={onSend}
            disabled={disabled}
            placeholder="Digite sua mensagem ou escolha uma sugestão..."
          />
        </div>

        {/* Dica sutil */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Enter</kbd> para enviar
        </p>
      </div>
    </div>
  )
}
