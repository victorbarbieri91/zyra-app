/**
 * Cliente para API do Escavador v1 - Publicações em Diários Oficiais
 * Documentacao: https://api.escavador.com/v1/docs/
 *
 * Este módulo gerencia:
 * - Monitoramento por TERMO em diários oficiais
 * - Busca de aparições (publicações encontradas)
 * - Listagem de origens (diários disponíveis)
 */

// ============================================
// TIPOS
// ============================================

export interface EscavadorOrigem {
  id: number
  nome: string
  sigla: string
  tipo?: string
  uf?: string
}

export interface EscavadorAparicao {
  id: number
  data_publicacao: string
  texto: string
  diario: {
    id: number
    nome: string
    sigla: string
    data: string
  }
  pagina?: number
  caderno?: string
  url?: string
  created_at?: string
}

export interface EscavadorMonitoramentoDiario {
  id: number
  tipo: 'termo' | 'processo'
  termo?: string
  processo_id?: number
  origens?: EscavadorOrigem[]
  variacoes?: string[]
  status?: string
  total_aparicoes?: number
  ultima_aparicao?: string
  created_at?: string
}

export interface CriarMonitoramentoTermoRequest {
  termo: string
  origens_ids?: number[]
  estados_ids?: number[]
  variacoes?: string[]
  termos_auxiliares?: string[][]
  monitorar_em_todos_diarios?: boolean
}

export interface ResultadoMonitoramentoDiario {
  sucesso: boolean
  monitoramento_id?: number
  erro?: string
  creditos_utilizados?: number
}

export interface ResultadoAparicoes {
  sucesso: boolean
  aparicoes?: EscavadorAparicao[]
  total?: number
  erro?: string
  creditos_utilizados?: number
}

export interface ResultadoOrigens {
  sucesso: boolean
  origens?: EscavadorOrigem[]
  erro?: string
}

// ============================================
// CONFIGURACAO
// ============================================

const ESCAVADOR_V1_BASE_URL = 'https://api.escavador.com/api/v1'
const DEFAULT_TIMEOUT = 30000

/**
 * Obtem o token da API do Escavador
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

// ============================================
// ORIGENS (Diários Disponíveis)
// ============================================

/**
 * Lista todos os diários oficiais disponíveis para monitoramento
 * GET /api/v1/origens
 */
export async function listarOrigens(): Promise<ResultadoOrigens> {
  try {
    console.log('[Escavador Publicacoes] Listando origens disponiveis')

    const response = await fetch(
      `${ESCAVADOR_V1_BASE_URL}/origens`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error('[Escavador Publicacoes] Erro ao listar origens:', response.status)
      return {
        sucesso: false,
        erro: errorData?.error?.message || `Erro ${response.status}`
      }
    }

    const data = await response.json()

    // A API retorna { items: [...] } ou diretamente array
    const origens = data.items || data.data || data || []

    console.log(`[Escavador Publicacoes] ${origens.length} origens disponiveis`)

    return {
      sucesso: true,
      origens
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao listar origens:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// ============================================
// MONITORAMENTO POR TERMO
// ============================================

/**
 * Cria monitoramento por termo em diários oficiais
 * POST /api/v1/monitoramentos
 *
 * @param request Dados do monitoramento
 */
export async function criarMonitoramentoTermo(
  request: CriarMonitoramentoTermoRequest
): Promise<ResultadoMonitoramentoDiario> {
  try {
    console.log('[Escavador Publicacoes] Criando monitoramento para termo:', request.termo)

    // Construir body apenas com campos que têm valor
    // A API EXIGE pelo menos um de: origens_ids, estados_ids, ou monitorar_em_todos_diarios
    const body: Record<string, any> = {
      tipo: 'termo',
      termo: request.termo
    }

    // Verificar se tem origens ou estados específicos
    const temOrigens = request.origens_ids && request.origens_ids.length > 0
    const temEstados = request.estados_ids && request.estados_ids.length > 0

    // Se não tem origens nem estados específicos, monitorar em todos os diários
    if (!temOrigens && !temEstados) {
      body.monitorar_em_todos_diarios = request.monitorar_em_todos_diarios ?? true
    }

    // Só adiciona se tiver valores
    if (temOrigens) {
      body.origens_ids = request.origens_ids
    }
    if (temEstados) {
      body.estados_ids = request.estados_ids
    }
    if (request.variacoes && request.variacoes.length > 0) {
      body.variacoes = request.variacoes
    }
    if (request.termos_auxiliares && request.termos_auxiliares.length > 0) {
      body.termos_auxiliares = request.termos_auxiliares
    }

    console.log('[Escavador Publicacoes] Body da requisição:', JSON.stringify(body))
    console.log('[Escavador Publicacoes] URL:', `${ESCAVADOR_V1_BASE_URL}/monitoramentos`)

    const response = await fetch(
      `${ESCAVADOR_V1_BASE_URL}/monitoramentos`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      }
    )

    const creditosUtilizados = parseInt(
      response.headers.get('Creditos-Utilizados') || '0',
      10
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData = null
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Resposta não é JSON
      }

      console.error('[Escavador Publicacoes] Erro ao criar monitoramento:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        errorData
      })

      if (response.status === 422) {
        // Extrair mensagem de erro detalhada
        let erroDetalhado = 'Termo já está sendo monitorado ou dados inválidos'
        if (errorData?.errors && Array.isArray(errorData.errors)) {
          erroDetalhado = errorData.errors.join('. ')
        } else if (errorData?.message) {
          erroDetalhado = errorData.message
        } else if (errorData?.error?.message) {
          erroDetalhado = errorData.error.message
        }

        return {
          sucesso: false,
          erro: erroDetalhado,
          creditos_utilizados: creditosUtilizados
        }
      }

      if (response.status === 402) {
        return {
          sucesso: false,
          erro: 'Limite de monitoramentos atingido no plano atual',
          creditos_utilizados: creditosUtilizados
        }
      }

      if (response.status === 401) {
        return {
          sucesso: false,
          erro: 'Token da API Escavador inválido ou expirado',
          creditos_utilizados: creditosUtilizados
        }
      }

      return {
        sucesso: false,
        erro: errorData?.message || errorData?.error?.message || errorData?.error || `Erro ${response.status}: ${response.statusText}`,
        creditos_utilizados: creditosUtilizados
      }
    }

    const data = await response.json()
    console.log('[Escavador Publicacoes] Monitoramento criado com ID:', data.id)

    return {
      sucesso: true,
      monitoramento_id: data.id,
      creditos_utilizados: creditosUtilizados
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao criar monitoramento:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Lista todos os monitoramentos de diários do usuário
 * GET /api/v1/monitoramentos
 */
export async function listarMonitoramentosDiario(): Promise<{
  sucesso: boolean
  monitoramentos?: EscavadorMonitoramentoDiario[]
  erro?: string
}> {
  try {
    console.log('[Escavador Publicacoes] Listando monitoramentos de diarios')

    const response = await fetch(
      `${ESCAVADOR_V1_BASE_URL}/monitoramentos`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData?.error?.message || `Erro ${response.status}`
      }
    }

    const data = await response.json()
    console.log('[Escavador Publicacoes] Resposta bruta da API:', JSON.stringify(data, null, 2))

    const monitoramentos = data.items || data.data || data || []

    console.log(`[Escavador Publicacoes] ${monitoramentos.length} monitoramentos encontrados`)
    if (monitoramentos.length > 0) {
      console.log('[Escavador Publicacoes] Primeiro monitoramento:', JSON.stringify(monitoramentos[0], null, 2))
    }

    return {
      sucesso: true,
      monitoramentos
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao listar monitoramentos:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Busca detalhes de um monitoramento específico
 * GET /api/v1/monitoramentos/{id}
 */
export async function buscarMonitoramentoDiario(
  monitoramentoId: number
): Promise<{
  sucesso: boolean
  monitoramento?: EscavadorMonitoramentoDiario
  erro?: string
}> {
  try {
    const response = await fetch(
      `${ESCAVADOR_V1_BASE_URL}/monitoramentos/${monitoramentoId}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData?.error?.message || `Erro ${response.status}`
      }
    }

    const data = await response.json()

    return {
      sucesso: true,
      monitoramento: data
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao buscar monitoramento:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Edita um monitoramento existente
 * PUT /api/v1/monitoramentos/{id}
 */
export async function editarMonitoramentoDiario(
  monitoramentoId: number,
  dados: {
    variacoes?: string[]
    origens_ids?: number[]
  }
): Promise<ResultadoMonitoramentoDiario> {
  try {
    console.log('[Escavador Publicacoes] Editando monitoramento:', monitoramentoId)

    const response = await fetch(
      `${ESCAVADOR_V1_BASE_URL}/monitoramentos/${monitoramentoId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(dados)
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData?.error?.message || `Erro ${response.status}`
      }
    }

    console.log('[Escavador Publicacoes] Monitoramento editado com sucesso')

    return {
      sucesso: true,
      monitoramento_id: monitoramentoId
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao editar monitoramento:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Remove um monitoramento
 * DELETE /api/v1/monitoramentos/{id}
 */
export async function removerMonitoramentoDiario(
  monitoramentoId: number
): Promise<ResultadoMonitoramentoDiario> {
  try {
    console.log('[Escavador Publicacoes] Removendo monitoramento:', monitoramentoId)

    const response = await fetch(
      `${ESCAVADOR_V1_BASE_URL}/monitoramentos/${monitoramentoId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData?.error?.message || `Erro ${response.status}`
      }
    }

    console.log('[Escavador Publicacoes] Monitoramento removido com sucesso')

    return {
      sucesso: true
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao remover monitoramento:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// ============================================
// APARICOES (Publicações Encontradas)
// ============================================

/**
 * Busca as aparições (publicações) de um monitoramento
 * GET /api/v1/monitoramentos/{id}/aparicoes
 *
 * @param monitoramentoId ID do monitoramento
 * @param pagina Página de resultados (default: 1)
 */
export async function buscarAparicoes(
  monitoramentoId: number,
  pagina: number = 1
): Promise<ResultadoAparicoes> {
  try {
    console.log(`[Escavador Publicacoes] Buscando aparicoes do monitoramento ${monitoramentoId}, pagina ${pagina}`)

    const response = await fetch(
      `${ESCAVADOR_V1_BASE_URL}/monitoramentos/${monitoramentoId}/aparicoes?page=${pagina}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    )

    const creditosUtilizados = parseInt(
      response.headers.get('Creditos-Utilizados') || '0',
      10
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        sucesso: false,
        erro: errorData?.error?.message || `Erro ${response.status}`,
        creditos_utilizados: creditosUtilizados
      }
    }

    const data = await response.json()
    const aparicoes = data.items || data.data || data || []
    const total = data.paginator?.total || aparicoes.length

    console.log(`[Escavador Publicacoes] ${aparicoes.length} aparicoes encontradas (total: ${total})`)

    return {
      sucesso: true,
      aparicoes,
      total,
      creditos_utilizados: creditosUtilizados
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao buscar aparicoes:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Busca TODAS as aparições de um monitoramento (paginação automática)
 * Cuidado: pode consumir muitos créditos
 */
export async function buscarTodasAparicoes(
  monitoramentoId: number,
  limitePaginas: number = 10
): Promise<ResultadoAparicoes> {
  try {
    const todasAparicoes: EscavadorAparicao[] = []
    let pagina = 1
    let totalCreditos = 0
    let continuar = true

    while (continuar && pagina <= limitePaginas) {
      const resultado = await buscarAparicoes(monitoramentoId, pagina)

      if (!resultado.sucesso) {
        return {
          sucesso: false,
          erro: resultado.erro,
          creditos_utilizados: totalCreditos
        }
      }

      totalCreditos += resultado.creditos_utilizados || 0

      if (resultado.aparicoes && resultado.aparicoes.length > 0) {
        todasAparicoes.push(...resultado.aparicoes)
        pagina++
      } else {
        continuar = false
      }

      // Se já temos todas as aparições, para
      if (todasAparicoes.length >= (resultado.total || 0)) {
        continuar = false
      }
    }

    console.log(`[Escavador Publicacoes] Total de aparicoes carregadas: ${todasAparicoes.length}`)

    return {
      sucesso: true,
      aparicoes: todasAparicoes,
      total: todasAparicoes.length,
      creditos_utilizados: totalCreditos
    }
  } catch (error) {
    console.error('[Escavador Publicacoes] Erro ao buscar todas aparicoes:', error)
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// ============================================
// UTILS
// ============================================

/**
 * Extrai número CNJ do texto de uma publicação
 * Padrão: NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function extrairNumeroCNJ(texto: string): string | null {
  const regex = /\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g
  const matches = texto.match(regex)
  return matches?.[0] || null
}

/**
 * Normaliza uma aparição do Escavador para o formato interno
 */
export function normalizarAparicao(
  aparicao: EscavadorAparicao,
  monitoramentoId: number,
  escritorioId: string
): {
  escritorio_id: string
  source_type: 'escavador_termo'
  escavador_aparicao_id: string
  escavador_monitoramento_id: string
  data_publicacao: string
  data_captura: string
  tribunal: string
  texto_completo: string
  numero_processo: string | null
  status: 'pendente'
  urgente: boolean
} {
  const numeroCNJ = extrairNumeroCNJ(aparicao.texto)

  // Detecta urgência por palavras-chave
  const palavrasUrgentes = [
    'urgente', 'imediato', 'citação', 'intimação',
    'prazo fatal', 'último dia', 'mandado'
  ]
  const textoLower = aparicao.texto.toLowerCase()
  const urgente = palavrasUrgentes.some(p => textoLower.includes(p))

  return {
    escritorio_id: escritorioId,
    source_type: 'escavador_termo',
    escavador_aparicao_id: aparicao.id.toString(),
    escavador_monitoramento_id: monitoramentoId.toString(),
    data_publicacao: aparicao.data_publicacao || aparicao.diario?.data,
    data_captura: new Date().toISOString(),
    tribunal: aparicao.diario?.nome || aparicao.diario?.sigla || 'Diário Oficial',
    texto_completo: aparicao.texto,
    numero_processo: numeroCNJ,
    status: 'pendente',
    urgente
  }
}
