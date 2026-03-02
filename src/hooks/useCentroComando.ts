'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'
import { captureOperationError } from '@/lib/logger'
import {
  AcaoPendente,
  CentroComandoExecutionState,
  CentroComandoMensagem,
  CentroComandoResponse,
  CentroComandoState,
  ConfirmarAcaoParams,
  PassoThinking,
  PendingInput,
  ResponderInputParams,
  StreamEvent,
  ToolResult,
} from '@/types/centro-comando'

interface Sessao {
  id: string
  created_at: string
  titulo?: string
  ativo: boolean
}

const STREAM_TIMEOUT_MS = 65000

export function useCentroComando() {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()
  const [state, setState] = useState<CentroComandoState>({
    mensagens: [],
    sessaoId: null,
    carregando: false,
    erro: null,
    acoesPendentes: [],
    pendingInput: null,
    execution: null,
    passos: [],
  })
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [carregandoSessoes, setCarregandoSessoes] = useState(true)
  const [feedbackPorMensagem, setFeedbackPorMensagem] = useState<Record<string, 'positivo' | 'negativo' | 'correcao'>>({})
  const [enviandoFeedback, setEnviandoFeedback] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const gerarId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  const scrollParaFim = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    scrollParaFim()
  }, [state.mensagens, state.passos, scrollParaFim])

  useEffect(() => {
    if (!escritorioAtivo) return
    const carregarSessoes = async () => {
      setCarregandoSessoes(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data, error } = await supabase
          .from('centro_comando_sessoes')
          .select('id, created_at, titulo, ativo')
          .eq('escritorio_id', escritorioAtivo)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (error) throw error
        setSessoes(data || [])
      } catch (err) {
        captureOperationError(err, { module: 'CentroComando', operation: 'buscar', table: 'centro_comando_sessoes' })
      } finally {
        setCarregandoSessoes(false)
      }
    }
    carregarSessoes()
  }, [escritorioAtivo, supabase])

  const carregarHistoricoDaSessao = useCallback(async (sessaoId: string) => {
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
        content: h.content || '',
        timestamp: new Date(h.created_at),
        tool_results: h.tool_results || undefined,
        run_id: h.run_id || undefined,
        erro: h.erro || undefined,
      }))
      setState((prev) => ({ ...prev, mensagens, sessaoId, pendingInput: null, acoesPendentes: [], execution: null }))
    } catch (err) {
      captureOperationError(err, { module: 'CentroComando', operation: 'buscar', table: 'centro_comando_historico' })
    }
  }, [escritorioAtivo, supabase])

  const adicionarPasso = useCallback((message: string, type: PassoThinking['type'], tool?: string) => {
    const passo: PassoThinking = { id: gerarId(), type, tool, message, timestamp: new Date() }
    setState((prev) => ({ ...prev, passos: [...prev.passos, passo] }))
  }, [])

  const atualizarExecucao = useCallback((patch: Partial<CentroComandoExecutionState> & { runId?: string | null }) => {
    setState((prev) => {
      const current = prev.execution
      const next: CentroComandoExecutionState = {
        runId: patch.runId ?? current?.runId ?? null,
        flowType: patch.flowType ?? current?.flowType ?? 'unknown',
        terminationReason: patch.terminationReason ?? current?.terminationReason,
        startedAt: current?.startedAt ?? new Date(),
        lastEventAt: patch.lastEventAt ?? new Date(),
        terminal: patch.terminal ?? current?.terminal ?? false,
      }
      return { ...prev, execution: next }
    })
  }, [])

  const criarMensagemSistema = useCallback((content: string, erro?: string) => {
    const mensagem: CentroComandoMensagem = { id: gerarId(), role: 'system', content, timestamp: new Date(), erro }
    setState((prev) => ({ ...prev, mensagens: [...prev.mensagens, mensagem] }))
  }, [])

  const garantirSessao = useCallback(async (texto: string) => {
    let sessaoAtual = state.sessaoId
    if (sessaoAtual) return sessaoAtual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !escritorioAtivo) return null
    const { data, error } = await supabase
      .from('centro_comando_sessoes')
      .insert({ user_id: user.id, escritorio_id: escritorioAtivo, ativo: true, titulo: texto.trim().slice(0, 50) })
      .select()
      .single()
    if (error) throw error
    setState((prev) => ({ ...prev, sessaoId: data.id }))
    setSessoes((prev) => [data, ...prev])
    return data.id as string
  }, [escritorioAtivo, state.sessaoId, supabase])

  const aplicarRespostaFinal = useCallback((data: CentroComandoResponse) => {
    const mensagemResposta: CentroComandoMensagem = {
      id: gerarId(),
      role: 'assistant',
      content: data.resposta || '',
      timestamp: new Date(),
      tool_results: data.tool_results,
      acoes_pendentes: data.acoes_pendentes,
      pending_input: data.pending_input,
      run_id: data.run_id,
    }
    setState((prev) => ({
      ...prev,
      mensagens: [...prev.mensagens, mensagemResposta],
      sessaoId: data.sessao_id || prev.sessaoId,
      carregando: false,
      erro: null,
      acoesPendentes: data.acoes_pendentes || prev.acoesPendentes,
      pendingInput: data.pending_input || null,
      passos: [...prev.passos, { id: gerarId(), type: 'terminal', message: data.termination_reason || 'final', timestamp: new Date(), concluido: true }],
      execution: prev.execution ? { ...prev.execution, terminal: true, terminationReason: data.termination_reason, flowType: data.flow_type || prev.execution.flowType, runId: data.run_id || prev.execution.runId, lastEventAt: new Date() } : prev.execution,
    }))
  }, [])
  const processarStreamSSE = useCallback(async (response: Response, fallbackSessaoId: string | null) => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Nao foi possivel ler o stream')
    const decoder = new TextDecoder()
    let buffer = ''
    let terminalEventReceived = false
    const startedAt = Date.now()

    const handleEvent = (evento: StreamEvent['event'], parsedData: any) => {
      const now = new Date()
      if (evento === 'status') {
        atualizarExecucao({ runId: parsedData.run_id || null, flowType: parsedData.flow_type || 'unknown', lastEventAt: now, terminal: false })
        adicionarPasso(parsedData.message || 'Processando...', parsedData.type === 'terminal' ? 'terminal' : 'status', parsedData.tool)
        return
      }
      if (evento === 'heartbeat') {
        atualizarExecucao({ lastEventAt: now })
        adicionarPasso('Conexao ativa...', 'heartbeat')
        return
      }
      if (evento === 'input_required') {
        const pendingInput = parsedData.pending_input as PendingInput
        setState((prev) => ({
          ...prev,
          pendingInput,
          sessaoId: parsedData.sessao_id || prev.sessaoId || fallbackSessaoId,
          mensagens: parsedData.message ? [...prev.mensagens, { id: gerarId(), role: 'assistant', content: parsedData.message, timestamp: new Date(), pending_input: pendingInput, run_id: parsedData.run_id }] : prev.mensagens,
        }))
        atualizarExecucao({ runId: parsedData.run_id || null, flowType: parsedData.flow_type || 'unknown', lastEventAt: now })
        return
      }
      if (evento === 'action_required') {
        const acoes = parsedData.acoes_pendentes ? parsedData.acoes_pendentes as AcaoPendente[] : parsedData.acao ? [parsedData.acao as AcaoPendente] : []
        setState((prev) => ({
          ...prev,
          acoesPendentes: acoes,
          sessaoId: parsedData.sessao_id || prev.sessaoId || fallbackSessaoId,
          mensagens: parsedData.message ? [...prev.mensagens, { id: gerarId(), role: 'assistant', content: parsedData.message, timestamp: new Date(), acoes_pendentes: acoes, run_id: parsedData.run_id }] : prev.mensagens,
        }))
        atualizarExecucao({ runId: parsedData.run_id || null, flowType: parsedData.flow_type || 'unknown', lastEventAt: now })
        return
      }
      if (evento === 'final') {
        terminalEventReceived = true
        aplicarRespostaFinal(parsedData as CentroComandoResponse)
        return
      }
      if (evento === 'error') {
        terminalEventReceived = true
        atualizarExecucao({ runId: parsedData.run_id || null, terminationReason: parsedData.termination_reason || 'error', terminal: true, lastEventAt: now })
        throw new Error(parsedData.erro || 'Erro desconhecido')
      }
    }

    try {
      while (true) {
        if (Date.now() - startedAt > STREAM_TIMEOUT_MS) {
          throw new Error('Tempo limite excedido durante a leitura do stream')
        }
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocos = buffer.split('\n\n')
        buffer = blocos.pop() || ''
        for (const bloco of blocos) {
          if (!bloco.trim()) continue
          const linhas = bloco.split('\n')
          let evento = ''
          let dados = ''
          for (const linha of linhas) {
            if (linha.startsWith('event: ')) evento = linha.slice(7)
            if (linha.startsWith('data: ')) dados += linha.slice(6)
          }
          if (!evento || !dados) continue
          try {
            handleEvent(evento as StreamEvent['event'], JSON.parse(dados))
          } catch (parseOrEventError) {
            if (parseOrEventError instanceof Error && (evento === 'error' || parseOrEventError.message)) throw parseOrEventError
            captureOperationError(parseOrEventError, { module: 'CentroComando', operation: 'parsear_sse', details: { evento, dados } })
          }
        }
      }
      if (!terminalEventReceived) {
        setState((prev) => ({ ...prev, carregando: false, erro: 'stream_closed_without_terminal_event' }))
        atualizarExecucao({ terminationReason: 'stream_closed_without_terminal_event', terminal: true, lastEventAt: new Date() })
        criarMensagemSistema('A conexao foi encerrada antes da resposta final. Tente novamente.', 'stream_closed_without_terminal_event')
      }
    } finally {
      reader.releaseLock()
    }
  }, [adicionarPasso, atualizarExecucao, aplicarRespostaFinal, criarMensagemSistema])

  const enviarMensagem = useCallback(async (texto: string) => {
    if (!texto.trim() || !escritorioAtivo) return
    const mensagemUsuario: CentroComandoMensagem = { id: gerarId(), role: 'user', content: texto.trim(), timestamp: new Date() }
    setState((prev) => ({ ...prev, mensagens: [...prev.mensagens, mensagemUsuario], carregando: true, erro: null, passos: [], pendingInput: null, execution: { runId: null, flowType: 'unknown', startedAt: new Date(), lastEventAt: new Date(), terminal: false } }))
    try {
      const sessaoAtual = await garantirSessao(texto)
      const historicoParaEnviar = state.mensagens.filter((m) => !m.loading).slice(-20).map((m) => ({ role: m.role, content: m.content }))
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!accessToken) {
        throw new Error('Sessao expirada. Faca login novamente para usar o Centro de Comando.')
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/centro-comando-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: anonKey || '' },
        body: JSON.stringify({ mensagem: texto.trim(), sessao_id: sessaoAtual, historico_mensagens: historicoParaEnviar, streaming: true }),
      })
      if (!response.ok) throw new Error(`Erro na requisicao: ${response.status}`)
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) await processarStreamSSE(response, sessaoAtual)
      else {
        const data = await response.json() as CentroComandoResponse
        if (!data.sucesso) throw new Error(data.erro || 'Erro desconhecido')
        aplicarRespostaFinal(data)
      }
    } catch (err: any) {
      captureOperationError(err, { module: 'CentroComando', operation: 'enviar_mensagem' })
      setState((prev) => ({ ...prev, carregando: false, erro: err.message, execution: prev.execution ? { ...prev.execution, terminal: true, terminationReason: 'error', lastEventAt: new Date() } : prev.execution }))
      criarMensagemSistema('Desculpe, ocorreu um erro ao processar sua solicitacao. Tente novamente.', err.message)
    }
  }, [aplicarRespostaFinal, criarMensagemSistema, escritorioAtivo, garantirSessao, processarStreamSSE, state.mensagens, supabase])

  const confirmarAcao = useCallback(async (params: ConfirmarAcaoParams) => {
    if (!state.sessaoId) return false
    setState((prev) => ({ ...prev, carregando: true, erro: null }))
    try {
      const { data, error } = await supabase.functions.invoke('centro-comando-ia', {
        body: { sessao_id: state.sessaoId, confirmar_acao: true, acao_id: params.acao_id, dados_adicionais: { dupla_confirmacao: params.dupla_confirmacao, ...params.dados_adicionais } },
      })
      if (error) throw error
      const response = data as CentroComandoResponse
      if (!response.sucesso) throw new Error(response.erro || 'Erro ao confirmar acao')
      criarMensagemSistema('Acao executada com sucesso.')
      setState((prev) => ({ ...prev, carregando: false, acoesPendentes: prev.acoesPendentes.filter((a) => a.id !== params.acao_id) }))
      return true
    } catch (err: any) {
      captureOperationError(err, { module: 'CentroComando', operation: 'confirmar_acao' })
      setState((prev) => ({ ...prev, carregando: false, erro: err.message }))
      criarMensagemSistema('Nao foi possivel executar a acao pendente.', err.message)
      return false
    }
  }, [criarMensagemSistema, state.sessaoId, supabase])
  const cancelarAcao = useCallback((acaoId: string) => {
    setState((prev) => ({ ...prev, acoesPendentes: prev.acoesPendentes.filter((a) => a.id !== acaoId) }))
    criarMensagemSistema('Acao cancelada.')
  }, [criarMensagemSistema])

  const limparChat = useCallback(async () => {
    if (state.sessaoId) await supabase.from('centro_comando_sessoes').update({ ativo: false }).eq('id', state.sessaoId)
    setState({ mensagens: [], sessaoId: null, carregando: false, erro: null, acoesPendentes: [], pendingInput: null, execution: null, passos: [] })
  }, [state.sessaoId, supabase])

  const trocarSessao = useCallback(async (sessaoId: string) => {
    if (state.sessaoId) await supabase.from('centro_comando_sessoes').update({ ativo: false }).eq('id', state.sessaoId)
    await supabase.from('centro_comando_sessoes').update({ ativo: true }).eq('id', sessaoId)
    await carregarHistoricoDaSessao(sessaoId)
  }, [carregarHistoricoDaSessao, state.sessaoId, supabase])

  const carregarHistorico = useCallback(async (sessaoId: string) => {
    await carregarHistoricoDaSessao(sessaoId)
  }, [carregarHistoricoDaSessao])

  const novaSessao = useCallback(async () => {
    if (!escritorioAtivo) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    try {
      const { data, error } = await supabase.from('centro_comando_sessoes').insert({ user_id: user.id, escritorio_id: escritorioAtivo, ativo: true }).select().single()
      if (error) throw error
      setState((prev) => ({ ...prev, sessaoId: data.id, mensagens: [], pendingInput: null, acoesPendentes: [], execution: null }))
      return data.id as string
    } catch (err) {
      captureOperationError(err, { module: 'CentroComando', operation: 'criar', table: 'centro_comando_sessoes' })
      return null
    }
  }, [escritorioAtivo, supabase])

  const abrirFormularioInput = useCallback((input: PendingInput | ToolResult) => {
    const pendingInput = (input as PendingInput).schema
      ? input as PendingInput
      : { id: gerarId(), tipo: 'collection' as const, contexto: (input as ToolResult).contexto || 'Preciso de mais informacoes.', schema: { fields: (input as ToolResult).campos_necessarios || [] } }
    setState((prev) => ({ ...prev, pendingInput }))
  }, [])

  const fecharFormularioInput = useCallback(() => {
    setState((prev) => ({ ...prev, pendingInput: null }))
  }, [])

  const responderCamposNecessarios = useCallback(async (dados: Record<string, any>) => {
    if (!state.pendingInput || !state.sessaoId) return
    setState((prev) => ({ ...prev, carregando: true, erro: null, pendingInput: null }))
    try {
      const payload: ResponderInputParams = { pending_input_id: state.pendingInput.id, input_values: dados }
      const { data, error } = await supabase.functions.invoke('centro-comando-ia', { body: { sessao_id: state.sessaoId, ...payload } })
      if (error) throw error
      const response = data as CentroComandoResponse
      if (!response.sucesso) throw new Error(response.erro || 'Erro ao responder formulario')
      aplicarRespostaFinal(response)
    } catch (err: any) {
      captureOperationError(err, { module: 'CentroComando', operation: 'responder_input' })
      setState((prev) => ({ ...prev, carregando: false, erro: err.message }))
      criarMensagemSistema('Nao foi possivel enviar as informacoes solicitadas.', err.message)
    }
  }, [aplicarRespostaFinal, criarMensagemSistema, state.pendingInput, state.sessaoId, supabase])

  const enviarFeedback = useCallback(async (mensagemId: string, tipo: 'positivo' | 'negativo' | 'correcao', dados?: { comentario?: string; respostaEsperada?: string }) => {
    if (!escritorioAtivo || !state.sessaoId) return false
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    setEnviandoFeedback(true)
    try {
      const mensagemIndex = state.mensagens.findIndex((m) => m.id === mensagemId)
      const mensagemAssistente = state.mensagens[mensagemIndex]
      const mensagemUsuario = mensagemIndex > 0 ? state.mensagens[mensagemIndex - 1] : null
      const { error } = await supabase.from('centro_comando_feedback').insert({ escritorio_id: escritorioAtivo, user_id: user.id, sessao_id: state.sessaoId, mensagem_id: mensagemId, tipo_feedback: tipo, comentario: dados?.comentario || null, user_message: mensagemUsuario?.role === 'user' ? mensagemUsuario.content : null, assistant_response: mensagemAssistente?.content || null, tool_calls: mensagemAssistente?.tool_results ? JSON.stringify(mensagemAssistente.tool_results) : null, resposta_esperada: dados?.respostaEsperada || null })
      if (error) throw error
      setFeedbackPorMensagem((prev) => ({ ...prev, [mensagemId]: tipo }))
      return true
    } catch (err) {
      captureOperationError(err, { module: 'CentroComando', operation: 'criar', table: 'centro_comando_feedback' })
      return false
    } finally {
      setEnviandoFeedback(false)
    }
  }, [escritorioAtivo, state.mensagens, state.sessaoId, supabase])

  const reenviarComCorrecao = useCallback(async (mensagemId: string, correcao: string) => {
    const idx = state.mensagens.findIndex((m) => m.id === mensagemId)
    if (idx < 0) return
    const msgUsuario = state.mensagens.slice(0, idx).reverse().find((m) => m.role === 'user')
    if (!msgUsuario) return
    await enviarFeedback(mensagemId, 'negativo', { comentario: correcao, respostaEsperada: correcao })
    await enviarMensagem(`[CORRECAO] Minha pergunta original: "${msgUsuario.content}"\nProblema: ${correcao}\nTente novamente com abordagem diferente.`)
  }, [enviarFeedback, enviarMensagem, state.mensagens])

  const getFeedbackMensagem = useCallback((mensagemId: string) => feedbackPorMensagem[mensagemId] || null, [feedbackPorMensagem])

  return {
    mensagens: state.mensagens,
    sessaoId: state.sessaoId,
    carregando: state.carregando,
    erro: state.erro,
    acoesPendentes: state.acoesPendentes,
    pendingInput: state.pendingInput,
    execution: state.execution,
    passos: state.passos,
    sessoes,
    carregandoSessoes,
    camposPendentes: state.pendingInput,
    enviarMensagem,
    confirmarAcao,
    cancelarAcao,
    limparChat,
    carregarHistorico,
    novaSessao,
    trocarSessao,
    abrirFormularioInput,
    fecharFormularioInput,
    responderCamposNecessarios,
    enviarFeedback,
    getFeedbackMensagem,
    enviandoFeedback,
    reenviarComCorrecao,
    messagesEndRef,
  }
}
