/**
 * Cliente para API do Escavador v2
 * Documentacao: https://api.escavador.com/v2/docs/
 */

import type {
  EscavadorProcessoResponse,
  EscavadorMonitoramentoResponse,
  EscavadorCriarMonitoramentoRequest,
  EscavadorEnvolvido,
  EscavadorErro,
  ResultadoConsultaEscavador,
  ResultadoMonitoramento
} from './types'
import { normalizarProcessoEscavador } from './normalizer'

// ============================================
// CONFIGURACAO
// ============================================

const ESCAVADOR_BASE_URL = 'https://api.escavador.com/api/v2'
const DEFAULT_TIMEOUT = 30000 // 30 segundos

/**
 * Obtem o token da API do Escavador
 * Em producao, deve vir do Supabase Vault ou variavel de ambiente
 */
function getApiToken(): string {
  const token = process.env.ESCAVADOR_API_TOKEN
  if (!token) {
    throw new Error('ESCAVADOR_API_TOKEN nao configurado')
  }
  return token
}

/**
 * Headers padrao para requisicoes
 */
function getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${getApiToken()}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

/**
 * Trata erros da API
 */
function handleApiError(error: EscavadorErro): string {
  if (error?.error?.message) {
    return error.error.message
  }
  return 'Erro desconhecido na API do Escavador'
}

// ============================================
// FUNCOES DE CONSULTA
// ============================================

/**
 * Busca envolvidos de um processo
 * GET /api/v2/processos/numero_cnj/{numero}/envolvidos
 */
async function buscarEnvolvidos(
  numeroLimpo: string
): Promise<EscavadorEnvolvido[]> {
  try {
    console.log('[Escavador] Buscando envolvidos do processo')

    const response = await fetch(
      `${ESCAVADOR_BASE_URL}/processos/numero_cnj/${numeroLimpo}/envolvidos`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      console.log('[Escavador] Nao foi possivel buscar envolvidos:', response.status)
      return []
    }

    const data = await response.json()
    console.log('[Escavador] Envolvidos encontrados:', data.data?.length || 0)

    // A API retorna { data: [...envolvidos] }
    return data.data || []
  } catch (error) {
    console.error('[Escavador] Erro ao buscar envolvidos:', error)
    return []
  }
}

/**
 * Busca processo por numero CNJ
 * GET /api/v2/processos/numero_cnj/{numero}
 */
export async function buscarProcessoPorCNJ(
  numeroCNJ: string
): Promise<ResultadoConsultaEscavador> {
  try {
    // Remove formatacao do numero CNJ para a URL
    const numeroLimpo = numeroCNJ.replace(/[.-]/g, '')

    console.log('[Escavador] Buscando processo:', numeroCNJ)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

    const response = await fetch(
      `${ESCAVADOR_BASE_URL}/processos/numero_cnj/${numeroLimpo}`,
      {
        method: 'GET',
        headers: getHeaders(),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    // Extrai creditos utilizados do header
    let creditosUtilizados = parseInt(
      response.headers.get('Creditos-Utilizados') || '0',
      10
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)

      if (response.status === 404) {
        console.log('[Escavador] Processo nao encontrado')
        return {
          sucesso: false,
          erro: 'Processo nao encontrado no Escavador',
          creditos_utilizados: creditosUtilizados
        }
      }

      if (response.status === 401) {
        console.error('[Escavador] Token invalido ou expirado')
        return {
          sucesso: false,
          erro: 'Token da API invalido ou expirado',
          creditos_utilizados: creditosUtilizados
        }
      }

      if (response.status === 429) {
        console.error('[Escavador] Rate limit excedido')
        return {
          sucesso: false,
          erro: 'Limite de requisicoes excedido. Tente novamente em alguns minutos.',
          creditos_utilizados: creditosUtilizados
        }
      }

      console.error('[Escavador] Erro na API:', response.status, errorData)
      return {
        sucesso: false,
        erro: errorData ? handleApiError(errorData) : `Erro ${response.status}`,
        creditos_utilizados: creditosUtilizados
      }
    }

    // A API Escavador pode retornar { data: {...} } ou diretamente o objeto
    const responseJson = await response.json()
    const data: EscavadorProcessoResponse = responseJson.data || responseJson

    // DEBUG: Log da estrutura recebida
    console.log('[Escavador] Response keys:', Object.keys(responseJson))
    console.log('[Escavador] Processo encontrado:', data.numero_cnj)
    console.log('[Escavador] titulo_polo_ativo:', data.titulo_polo_ativo)
    console.log('[Escavador] titulo_polo_passivo:', data.titulo_polo_passivo)
    console.log('[Escavador] Fontes:', data.fontes?.length || 0)
    if (data.fontes?.[0]) {
      console.log('[Escavador] Fonte[0].capa:', data.fontes[0].capa ? 'existe' : 'null')
      console.log('[Escavador] Fonte[0].envolvidos:', data.fontes[0].envolvidos?.length || 0)
    }

    // Verifica se tem envolvidos na fonte principal ou no root
    const fontePrincipal = data.fontes?.find(f => f.tipo === 'TRIBUNAL') || data.fontes?.[0]
    const temEnvolvidosNaFonte = fontePrincipal?.envolvidos && fontePrincipal.envolvidos.length > 0
    const temEnvolvidosNoRoot = (data as unknown as { envolvidos?: EscavadorEnvolvido[] }).envolvidos?.length

    console.log('[Escavador] Envolvidos na fonte:', fontePrincipal?.envolvidos?.length || 0)
    console.log('[Escavador] Envolvidos no root:', temEnvolvidosNoRoot || 0)

    // Se nao veio envolvidos em nenhum lugar, busca separadamente
    if (!temEnvolvidosNaFonte && !temEnvolvidosNoRoot) {
      console.log('[Escavador] Buscando envolvidos via endpoint separado...')
      const envolvidos = await buscarEnvolvidos(numeroLimpo)
      console.log('[Escavador] Envolvidos retornados:', envolvidos.length)
      // Adiciona os envolvidos na fonte principal se existir, ou no root
      if (fontePrincipal) {
        fontePrincipal.envolvidos = envolvidos
      } else {
        // Fallback: adiciona no root (o normalizer tem fallback para isso)
        (data as unknown as { envolvidos: EscavadorEnvolvido[] }).envolvidos = envolvidos
      }
      // Adiciona mais creditos estimados pela chamada adicional
      creditosUtilizados += 1
    }

    // Normaliza os dados para o formato do sistema
    const dadosNormalizados = normalizarProcessoEscavador(data)

    return {
      sucesso: true,
      dados: dadosNormalizados,
      creditos_utilizados: creditosUtilizados
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[Escavador] Timeout na requisicao')
        return {
          sucesso: false,
          erro: 'Tempo limite excedido. Tente novamente.'
        }
      }
      console.error('[Escavador] Erro:', error.message)
      return {
        sucesso: false,
        erro: error.message
      }
    }

    console.error('[Escavador] Erro desconhecido:', error)
    return {
      sucesso: false,
      erro: 'Erro ao consultar Escavador'
    }
  }
}

/**
 * Busca movimentacoes de um processo
 * GET /api/v2/processos/numero_cnj/{numero}/movimentacoes
 */
export async function buscarMovimentacoes(
  numeroCNJ: string,
  pagina: number = 1,
  limite: number = 50
): Promise<{
  sucesso: boolean
  movimentacoes?: Array<{
    data: string
    titulo: string
    conteudo: string
    fonte: string | null
  }>
  total?: number
  erro?: string
}> {
  try {
    const numeroLimpo = numeroCNJ.replace(/[.-]/g, '')

    const response = await fetch(
      `${ESCAVADOR_BASE_URL}/processos/numero_cnj/${numeroLimpo}/movimentacoes?page=${pagina}&per_page=${limite}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData ? handleApiError(errorData) : `Erro ${response.status}`
      }
    }

    const data = await response.json()

    const movimentacoes = (data.data || []).map((mov: Record<string, unknown>) => ({
      data: mov.data as string,
      titulo: (mov.titulo || mov.tipo || '') as string,
      conteudo: (mov.conteudo || '') as string,
      fonte: (mov.fonte_sigla || mov.fonte_nome || null) as string | null
    }))

    return {
      sucesso: true,
      movimentacoes,
      total: data.total || movimentacoes.length
    }
  } catch (error) {
    console.error('[Escavador] Erro ao buscar movimentacoes:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// ============================================
// FUNCOES DE MONITORAMENTO
// ============================================

/**
 * Cria monitoramento para um processo
 * POST /api/v2/monitoramentos/processos
 */
export async function criarMonitoramento(
  request: EscavadorCriarMonitoramentoRequest
): Promise<ResultadoMonitoramento> {
  try {
    console.log('[Escavador] Criando monitoramento para:', request.numero_cnj)

    const response = await fetch(
      `${ESCAVADOR_BASE_URL}/monitoramentos/processos`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(request)
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)

      if (response.status === 422) {
        // Processo ja monitorado ou dados invalidos
        return {
          sucesso: false,
          erro: 'Processo ja esta sendo monitorado ou dados invalidos'
        }
      }

      return {
        sucesso: false,
        erro: errorData ? handleApiError(errorData) : `Erro ${response.status}`
      }
    }

    const data: EscavadorMonitoramentoResponse = await response.json()
    console.log('[Escavador] Monitoramento criado:', data.id)

    return {
      sucesso: true,
      monitoramento_id: data.id,
      status: data.status
    }
  } catch (error) {
    console.error('[Escavador] Erro ao criar monitoramento:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Lista todos os monitoramentos ativos
 * GET /api/v2/monitoramentos/processos
 */
export async function listarMonitoramentos(
  pagina: number = 1,
  limite: number = 50
): Promise<{
  sucesso: boolean
  monitoramentos?: EscavadorMonitoramentoResponse[]
  total?: number
  erro?: string
}> {
  try {
    const response = await fetch(
      `${ESCAVADOR_BASE_URL}/monitoramentos/processos?page=${pagina}&per_page=${limite}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData ? handleApiError(errorData) : `Erro ${response.status}`
      }
    }

    const data = await response.json()

    return {
      sucesso: true,
      monitoramentos: data.data || [],
      total: data.total || 0
    }
  } catch (error) {
    console.error('[Escavador] Erro ao listar monitoramentos:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Remove monitoramento de um processo
 * DELETE /api/v2/monitoramentos/processos/{id}
 */
export async function removerMonitoramento(
  monitoramentoId: number
): Promise<ResultadoMonitoramento> {
  try {
    console.log('[Escavador] Removendo monitoramento:', monitoramentoId)

    const response = await fetch(
      `${ESCAVADOR_BASE_URL}/monitoramentos/processos/${monitoramentoId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData ? handleApiError(errorData) : `Erro ${response.status}`
      }
    }

    console.log('[Escavador] Monitoramento removido com sucesso')
    return {
      sucesso: true
    }
  } catch (error) {
    console.error('[Escavador] Erro ao remover monitoramento:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Verifica status de um monitoramento
 * GET /api/v2/monitoramentos/processos/{id}
 */
export async function verificarStatusMonitoramento(
  monitoramentoId: number
): Promise<{
  sucesso: boolean
  monitoramento?: EscavadorMonitoramentoResponse
  erro?: string
}> {
  try {
    const response = await fetch(
      `${ESCAVADOR_BASE_URL}/monitoramentos/processos/${monitoramentoId}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData ? handleApiError(errorData) : `Erro ${response.status}`
      }
    }

    const data: EscavadorMonitoramentoResponse = await response.json()

    return {
      sucesso: true,
      monitoramento: data
    }
  } catch (error) {
    console.error('[Escavador] Erro ao verificar monitoramento:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}
