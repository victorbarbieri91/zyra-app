'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { captureOperationError } from '@/lib/logger'
import {
  CentroComandoMensagem,
  CentroComandoResponse,
  AcaoPendente,
  CentroComandoState,
  ConfirmarAcaoParams,
  PassoThinking,
  ToolResult,
} from '@/types/centro-comando'

// ============================================
// HOOK: useCentroComando
// ============================================
// Gerencia o estado do chat do Centro de Comando,
// envio de mensagens para a Edge Function e
// confirmação de ações.

// Interface para sessão
interface Sessao {
  id: string
  created_at: string
  titulo?: string
  ativo: boolean
}

export function useCentroComando() {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  const [state, setState] = useState<CentroComandoState>({
    mensagens: [],
    sessaoId: null,
    carregando: false,
    erro: null,
    acoesPendentes: [],
    passos: [], // Passos do thinking em tempo real
  })

  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [carregandoSessoes, setCarregandoSessoes] = useState(true)

  // Estado para campos pendentes (modal de coleta de informacoes)
  const [camposPendentes, setCamposPendentes] = useState<ToolResult | null>(null)

  // Estado para feedback por mensagem
  const [feedbackPorMensagem, setFeedbackPorMensagem] = useState<Record<string, 'positivo' | 'negativo' | 'correcao'>>({})
  const [enviandoFeedback, setEnviandoFeedback] = useState(false)

  // Ref para scroll automático
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Gerar ID único para mensagens locais
  const gerarId = () => `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Scroll para última mensagem
  const scrollParaFim = useCallback(() => {
    // Usar setTimeout para garantir que o DOM foi atualizado
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }, [])

  // Efeito para scroll automático - reage a mensagens E passos
  useEffect(() => {
    scrollParaFim()
  }, [state.mensagens, state.passos, scrollParaFim])

  // ========================================
  // CARREGAR SESSÕES AO MONTAR
  // ========================================
  useEffect(() => {
    if (!escritorioAtivo) return

    const carregarSessoes = async () => {
      setCarregandoSessoes(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Buscar sessões do usuário (últimas 20)
        const { data, error } = await supabase
          .from('centro_comando_sessoes')
          .select('id, created_at, titulo, ativo')
          .eq('escritorio_id', escritorioAtivo)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error

        setSessoes(data || [])

        // Sempre iniciar com nova conversa
        // O usuário pode acessar conversas anteriores pelo histórico
      } catch (err) {
        captureOperationError(err, { module: 'CentroComando', operation: 'buscar', table: 'centro_comando_sessoes' })
      } finally {
        setCarregandoSessoes(false)
      }
    }

    carregarSessoes()
  }, [escritorioAtivo])

  // ========================================
  // CARREGAR HISTÓRICO DE UMA SESSÃO
  // ========================================
  const carregarHistoricoDaSessao = async (sessaoId: string) => {
    if (!escritorioAtivo) return

    try {
      const { data, error } = await supabase
        .from('centro_comando_historico')
        .select('*')
        .eq('sessao_id', sessaoId)
        .eq('escritorio_id', escritorioAtivo)
        .order('created_at', { ascending: true })

      if (error) throw error

      const mensagens: CentroComandoMensagem[] = (data || []).map((h: any) => ({
        id: h.id,
        role: h.role,
        content: h.content,
        timestamp: new Date(h.created_at),
        tool_results: h.tool_results,
        erro: h.erro,
      }))

      setState(prev => ({
        ...prev,
        mensagens,
        sessaoId,
      }))
    } catch (err) {
      captureOperationError(err, { module: 'CentroComando', operation: 'buscar', table: 'centro_comando_historico' })
    }
  }

  // ========================================
  // ENVIAR MENSAGEM COM STREAMING
  // ========================================
  const enviarMensagem = useCallback(async (texto: string) => {
    if (!texto.trim() || !escritorioAtivo) {
      return
    }

    // Buscar usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[useCentroComando] Usuário não autenticado')
      return
    }

    // Criar sessão se não existir
    let sessaoAtual = state.sessaoId
    if (!sessaoAtual) {
      const { data: novaSessao, error: erroSessao } = await supabase
        .from('centro_comando_sessoes')
        .insert({
          user_id: user.id,
          escritorio_id: escritorioAtivo,
          ativo: true,
          titulo: texto.trim().substring(0, 50),
        })
        .select()
        .single()

      if (erroSessao) {
        captureOperationError(erroSessao, { module: 'CentroComando', operation: 'criar', table: 'centro_comando_sessoes' })
      } else {
        sessaoAtual = novaSessao.id
        setState(prev => ({ ...prev, sessaoId: novaSessao.id }))
        setSessoes(prev => [novaSessao, ...prev])
      }
    }

    const mensagemUsuario: CentroComandoMensagem = {
      id: gerarId(),
      role: 'user',
      content: texto.trim(),
      timestamp: new Date(),
    }

    // Adicionar mensagem do usuário e limpar passos
    setState(prev => ({
      ...prev,
      mensagens: [...prev.mensagens, mensagemUsuario],
      carregando: true,
      erro: null,
      passos: [], // Limpar passos anteriores
    }))

    try {
      // Preparar histórico para contexto - INCLUINDO tool_results para memória
      const historicoParaEnviar = state.mensagens
        .filter(m => !m.loading)
        .slice(-10)
        .map(m => ({
          role: m.role,
          content: m.content,
          tool_results: m.tool_results, // ✅ Incluir para a IA ter memória
        }))

      // Buscar token de autenticação
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // URL da Edge Function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // Chamar Edge Function com streaming
      const response = await fetch(`${supabaseUrl}/functions/v1/centro-comando-ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || anonKey}`,
          'apikey': anonKey || '',
        },
        body: JSON.stringify({
          mensagem: texto.trim(),
          escritorio_id: escritorioAtivo,
          user_id: user.id,
          sessao_id: sessaoAtual,
          historico_mensagens: historicoParaEnviar,
          streaming: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`)
      }

      // Verificar se é streaming (text/event-stream)
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        // Processar stream SSE
        await processarStreamSSE(response, sessaoAtual)
      } else {
        // Fallback: resposta JSON normal
        const data = await response.json() as CentroComandoResponse

        if (!data.sucesso) {
          throw new Error(data.erro || 'Erro desconhecido')
        }

        const mensagemResposta: CentroComandoMensagem = {
          id: gerarId(),
          role: 'assistant',
          content: data.resposta || '',
          timestamp: new Date(),
          tool_results: data.tool_results,
          acoes_pendentes: data.acoes_pendentes,
        }

        setState(prev => ({
          ...prev,
          mensagens: [...prev.mensagens, mensagemResposta],
          sessaoId: data.sessao_id || prev.sessaoId,
          carregando: false,
          acoesPendentes: data.acoes_pendentes || [],
          passos: [],
        }))
      }

    } catch (err: any) {
      captureOperationError(err, { module: 'CentroComando', operation: 'enviar_mensagem' })

      const mensagemErro: CentroComandoMensagem = {
        id: gerarId(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
        timestamp: new Date(),
        erro: err.message,
      }

      setState(prev => ({
        ...prev,
        mensagens: [...prev.mensagens, mensagemErro],
        carregando: false,
        erro: err.message,
        passos: [],
      }))
    }
  }, [escritorioAtivo, state.sessaoId, state.mensagens, supabase])

  // ========================================
  // PROCESSAR STREAM SSE
  // ========================================
  const processarStreamSSE = async (response: Response, sessaoAtual: string | null) => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Não foi possível ler o stream')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Processar eventos completos no buffer
        const linhas = buffer.split('\n\n')
        buffer = linhas.pop() || '' // Guardar linha incompleta

        for (const bloco of linhas) {
          if (!bloco.trim()) continue

          // Parse do evento SSE
          const linhasEvento = bloco.split('\n')
          let evento = ''
          let dados = ''

          for (const linha of linhasEvento) {
            if (linha.startsWith('event: ')) {
              evento = linha.slice(7)
            } else if (linha.startsWith('data: ')) {
              dados = linha.slice(6)
            }
          }

          if (!evento || !dados) continue

          try {
            const parsedData = JSON.parse(dados)

            switch (evento) {
              case 'thinking': {
                // Adicionar passo de "pensando"
                const novoPasso: PassoThinking = {
                  id: gerarId(),
                  type: 'thinking',
                  message: parsedData.message,
                  timestamp: new Date(),
                }
                setState(prev => ({
                  ...prev,
                  passos: [...prev.passos, novoPasso],
                }))
                break
              }

              case 'step': {
                // Passo de tool (início ou fim)
                const novoPasso: PassoThinking = {
                  id: gerarId(),
                  type: parsedData.type,
                  tool: parsedData.tool,
                  message: parsedData.message,
                  timestamp: new Date(),
                  resultado: parsedData.resultado,
                  concluido: parsedData.type === 'tool_end',
                }
                setState(prev => ({
                  ...prev,
                  passos: [...prev.passos, novoPasso],
                }))
                break
              }

              case 'done': {
                // Resposta final
                const mensagemResposta: CentroComandoMensagem = {
                  id: gerarId(),
                  role: 'assistant',
                  content: parsedData.resposta || '',
                  timestamp: new Date(),
                  tool_results: parsedData.tool_results,
                  acoes_pendentes: parsedData.acoes_pendentes,
                }

                setState(prev => ({
                  ...prev,
                  mensagens: [...prev.mensagens, mensagemResposta],
                  sessaoId: parsedData.sessao_id || prev.sessaoId,
                  carregando: false,
                  acoesPendentes: parsedData.acoes_pendentes || [],
                  // Manter os passos visíveis por um momento
                }))

                // Limpar passos após alguns segundos
                setTimeout(() => {
                  setState(prev => ({ ...prev, passos: [] }))
                }, 3000)
                break
              }

              case 'error': {
                throw new Error(parsedData.erro || 'Erro desconhecido')
              }
            }
          } catch (parseError) {
            captureOperationError(parseError, { module: 'CentroComando', operation: 'parsear_sse', details: { dados } })
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // ========================================
  // CONFIRMAR AÇÃO
  // ========================================
  const confirmarAcao = useCallback(async (params: ConfirmarAcaoParams) => {
    if (!escritorioAtivo) return

    // Buscar usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[useCentroComando] Usuário não autenticado')
      return false
    }

    setState(prev => ({ ...prev, carregando: true }))

    try {
      const { data, error } = await supabase.functions.invoke('centro-comando-ia', {
        body: {
          escritorio_id: escritorioAtivo,
          user_id: user.id,
          sessao_id: state.sessaoId,
          confirmar_acao: true,
          acao_id: params.acao_id,
          dados_adicionais: {
            dupla_confirmacao: params.dupla_confirmacao,
            ...params.dados_adicionais,
          },
        },
      })

      if (error) throw error

      const response = data as CentroComandoResponse

      // Mensagem de resultado
      const mensagemResultado: CentroComandoMensagem = {
        id: gerarId(),
        role: 'system',
        content: response.sucesso
          ? `Ação executada com sucesso!`
          : `Erro: ${response.erro}`,
        timestamp: new Date(),
        erro: response.sucesso ? undefined : response.erro,
      }

      setState(prev => ({
        ...prev,
        mensagens: [...prev.mensagens, mensagemResultado],
        carregando: false,
        acoesPendentes: prev.acoesPendentes.filter(a => a.id !== params.acao_id),
      }))

      return response.sucesso

    } catch (err: any) {
      captureOperationError(err, { module: 'CentroComando', operation: 'confirmar_acao' })

      setState(prev => ({
        ...prev,
        carregando: false,
        erro: err.message,
      }))

      return false
    }
  }, [escritorioAtivo, state.sessaoId, supabase])

  // ========================================
  // CANCELAR AÇÃO
  // ========================================
  const cancelarAcao = useCallback((acaoId: string) => {
    setState(prev => ({
      ...prev,
      acoesPendentes: prev.acoesPendentes.filter(a => a.id !== acaoId),
    }))

    // Adicionar mensagem de cancelamento
    const mensagemCancelamento: CentroComandoMensagem = {
      id: gerarId(),
      role: 'system',
      content: 'Ação cancelada.',
      timestamp: new Date(),
    }

    setState(prev => ({
      ...prev,
      mensagens: [...prev.mensagens, mensagemCancelamento],
    }))
  }, [])

  // ========================================
  // LIMPAR CHAT / NOVA CONVERSA
  // ========================================
  const limparChat = useCallback(async () => {
    // Desativar sessão atual se existir
    if (state.sessaoId) {
      await supabase
        .from('centro_comando_sessoes')
        .update({ ativo: false })
        .eq('id', state.sessaoId)
    }

    setState({
      mensagens: [],
      sessaoId: null,
      carregando: false,
      erro: null,
      acoesPendentes: [],
      passos: [],
    })
  }, [state.sessaoId, supabase])

  // ========================================
  // TROCAR PARA SESSÃO EXISTENTE
  // ========================================
  const trocarSessao = useCallback(async (sessaoId: string) => {
    // Desativar sessão atual
    if (state.sessaoId) {
      await supabase
        .from('centro_comando_sessoes')
        .update({ ativo: false })
        .eq('id', state.sessaoId)
    }

    // Ativar nova sessão
    await supabase
      .from('centro_comando_sessoes')
      .update({ ativo: true })
      .eq('id', sessaoId)

    // Carregar histórico
    await carregarHistoricoDaSessao(sessaoId)
  }, [state.sessaoId, supabase])

  // ========================================
  // CARREGAR HISTÓRICO
  // ========================================
  const carregarHistorico = useCallback(async (sessaoId: string) => {
    if (!escritorioAtivo) return

    try {
      const { data, error } = await supabase
        .from('centro_comando_historico')
        .select('*')
        .eq('sessao_id', sessaoId)
        .eq('escritorio_id', escritorioAtivo)
        .order('created_at', { ascending: true })

      if (error) throw error

      const mensagens: CentroComandoMensagem[] = (data || []).map((h: any) => ({
        id: h.id,
        role: h.role,
        content: h.content,
        timestamp: new Date(h.created_at),
        tool_results: h.tool_results,
        erro: h.erro,
      }))

      setState(prev => ({
        ...prev,
        mensagens,
        sessaoId,
      }))

    } catch (err) {
      captureOperationError(err, { module: 'CentroComando', operation: 'buscar', table: 'centro_comando_historico' })
    }
  }, [escritorioAtivo, supabase])

  // ========================================
  // NOVA SESSÃO
  // ========================================
  const novaSessao = useCallback(async () => {
    if (!escritorioAtivo) return null

    // Buscar usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[useCentroComando] Usuário não autenticado')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('centro_comando_sessoes')
        .insert({
          user_id: user.id,
          escritorio_id: escritorioAtivo,
          ativo: true,
        })
        .select()
        .single()

      if (error) throw error

      setState(prev => ({
        ...prev,
        sessaoId: data.id,
        mensagens: [],
      }))

      return data.id

    } catch (err) {
      captureOperationError(err, { module: 'CentroComando', operation: 'criar', table: 'centro_comando_sessoes' })
      return null
    }
  }, [escritorioAtivo, supabase])

  // ========================================
  // ABRIR FORMULARIO DE COLETA DE INFORMACOES
  // ========================================
  const abrirFormularioInput = useCallback((result: ToolResult) => {
    setCamposPendentes(result)
  }, [])

  // ========================================
  // FECHAR FORMULARIO DE COLETA
  // ========================================
  const fecharFormularioInput = useCallback(() => {
    setCamposPendentes(null)
  }, [])

  // ========================================
  // RESPONDER CAMPOS NECESSARIOS
  // ========================================
  const responderCamposNecessarios = useCallback(async (dados: Record<string, any>) => {
    if (!camposPendentes) return

    // Formatar os dados como mensagem do usuario
    const textoResposta = Object.entries(dados)
      .map(([campo, valor]) => {
        const campoInfo = camposPendentes.campos_necessarios?.find(c => c.campo === campo)
        return `${campoInfo?.descricao || campo}: ${valor}`
      })
      .join('\n')

    // Fechar o dialog
    setCamposPendentes(null)

    // Enviar como nova mensagem
    await enviarMensagem(`Aqui estao as informacoes:\n${textoResposta}`)
  }, [camposPendentes, enviarMensagem])

  // ========================================
  // ENVIAR FEEDBACK SOBRE UMA MENSAGEM
  // ========================================
  const enviarFeedback = useCallback(async (
    mensagemId: string,
    tipo: 'positivo' | 'negativo' | 'correcao',
    dados?: { comentario?: string; respostaEsperada?: string }
  ) => {
    if (!escritorioAtivo || !state.sessaoId) return false

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    setEnviandoFeedback(true)

    try {
      // Buscar a mensagem original e a mensagem do usuario anterior
      const mensagemIndex = state.mensagens.findIndex(m => m.id === mensagemId)
      const mensagemAssistente = state.mensagens[mensagemIndex]
      const mensagemUsuario = mensagemIndex > 0 ? state.mensagens[mensagemIndex - 1] : null

      // Inserir feedback no banco
      const { error } = await supabase
        .from('centro_comando_feedback')
        .insert({
          escritorio_id: escritorioAtivo,
          user_id: user.id,
          sessao_id: state.sessaoId,
          mensagem_id: mensagemId,
          tipo_feedback: tipo,
          comentario: dados?.comentario || null,
          user_message: mensagemUsuario?.role === 'user' ? mensagemUsuario.content : null,
          assistant_response: mensagemAssistente?.content || null,
          tool_calls: mensagemAssistente?.tool_results ? JSON.stringify(mensagemAssistente.tool_results) : null,
          resposta_esperada: dados?.respostaEsperada || null,
        })

      if (error) throw error

      // Atualizar estado local
      setFeedbackPorMensagem(prev => ({
        ...prev,
        [mensagemId]: tipo,
      }))

      return true
    } catch (err) {
      captureOperationError(err, { module: 'CentroComando', operation: 'criar', table: 'centro_comando_feedback' })
      return false
    } finally {
      setEnviandoFeedback(false)
    }
  }, [escritorioAtivo, state.sessaoId, state.mensagens, supabase])

  // ========================================
  // OBTER FEEDBACK DE UMA MENSAGEM
  // ========================================
  const getFeedbackMensagem = useCallback((mensagemId: string) => {
    return feedbackPorMensagem[mensagemId] || null
  }, [feedbackPorMensagem])

  return {
    // Estado
    mensagens: state.mensagens,
    sessaoId: state.sessaoId,
    carregando: state.carregando,
    erro: state.erro,
    acoesPendentes: state.acoesPendentes,
    passos: state.passos, // Passos do thinking em tempo real

    // Sessões
    sessoes,
    carregandoSessoes,

    // Campos pendentes (formulario de coleta)
    camposPendentes,

    // Ações
    enviarMensagem,
    confirmarAcao,
    cancelarAcao,
    limparChat,
    carregarHistorico,
    novaSessao,
    trocarSessao,

    // Coleta de informacoes
    abrirFormularioInput,
    fecharFormularioInput,
    responderCamposNecessarios,

    // Feedback
    enviarFeedback,
    getFeedbackMensagem,
    enviandoFeedback,

    // Refs
    messagesEndRef,
  }
}
