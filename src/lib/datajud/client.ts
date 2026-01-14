// ============================================
// CLIENTE HTTP PARA API DATAJUD (CNJ)
// ============================================

import type {
  DataJudResponse,
  ProcessoDataJud,
  TribunalInfo,
  ConsultaDataJudResult,
  MovimentacaoDataJud
} from '@/types/datajud'
import { DATAJUD_API_URL, DATAJUD_API_KEY, GRAU_PARA_INSTANCIA } from './constants'
import {
  extrairTribunalDoNumero,
  limparNumeroCNJ,
  validarNumeroCNJCompleto,
  formatarNumeroCNJ
} from './validators'

/**
 * Consulta a API publica do DataJud pelo numero CNJ
 *
 * @param numeroCNJ - Numero do processo no formato NNNNNNN-DD.AAAA.J.TR.OOOO
 * @returns Resultado da consulta com dados normalizados ou erro
 */
export async function consultarDataJud(numeroCNJ: string): Promise<ConsultaDataJudResult> {
  // Validar formato do numero
  const validacao = validarNumeroCNJCompleto(numeroCNJ)
  if (!validacao.valido) {
    return {
      sucesso: false,
      erro: validacao.erro || 'Numero CNJ invalido'
    }
  }

  // Extrair informacoes do tribunal
  const tribunal = extrairTribunalDoNumero(numeroCNJ)
  if (!tribunal) {
    return {
      sucesso: false,
      erro: 'Nao foi possivel identificar o tribunal pelo numero CNJ'
    }
  }

  // Preparar a requisicao
  const numeroLimpo = limparNumeroCNJ(numeroCNJ)
  const endpoint = `${DATAJUD_API_URL}/api_publica_${tribunal.alias}/_search`

  // Log para debug
  console.log('[DataJud Client] Endpoint:', endpoint)
  console.log('[DataJud Client] Numero limpo:', numeroLimpo)
  console.log('[DataJud Client] Numero original:', numeroCNJ)

  try {
    // A API DataJud usa query Elasticsearch
    // Primeiro tenta com numero limpo (20 digitos)
    const requestBody = {
      query: {
        match: {
          numeroProcesso: numeroLimpo
        }
      }
    }
    console.log('[DataJud Client] Request body:', JSON.stringify(requestBody))

    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `APIKey ${DATAJUD_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    })

    // Log da resposta bruta para debug
    const responseText = await response.text()
    console.log('[DataJud Client] Response status:', response.status)
    console.log('[DataJud Client] Response body (primeiros 500 chars):', responseText.substring(0, 500))

    // Parsear de volta para JSON
    let data: DataJudResponse
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error('[DataJud Client] Erro ao parsear resposta:', responseText.substring(0, 200))
      return {
        sucesso: false,
        erro: 'Resposta invalida da API DataJud'
      }
    }

    // Verificar status da resposta
    if (!response.ok) {
      console.error('Erro DataJud:', response.status, responseText.substring(0, 200))

      if (response.status === 401) {
        return {
          sucesso: false,
          erro: 'Erro de autenticacao na API DataJud. A chave pode ter sido alterada.'
        }
      }

      if (response.status === 404) {
        return {
          sucesso: false,
          erro: 'Endpoint do tribunal nao encontrado'
        }
      }

      return {
        sucesso: false,
        erro: `Erro na API DataJud: ${response.status}`
      }
    }

    console.log('[DataJud Client] Response total hits:', data.hits?.total?.value)
    console.log('[DataJud Client] Response hits count:', data.hits?.hits?.length)

    // Verificar se encontrou resultados
    if (data.hits.total.value === 0 || data.hits.hits.length === 0) {
      console.log('[DataJud Client] Nenhum resultado encontrado')
      return {
        sucesso: false,
        erro: 'Processo nao encontrado na base do CNJ. Processos recentes (2024-2025) podem levar semanas para serem indexados pelo DataJud.'
      }
    }

    // Pegar o primeiro resultado
    const hit = data.hits.hits[0]._source

    // Verificar sigilo
    if (hit.nivelSigilo > 0) {
      return {
        sucesso: false,
        erro: 'Este processo tramita em segredo de justica e nao pode ser consultado'
      }
    }

    // Normalizar os dados para o formato do sistema
    const dadosNormalizados = normalizarResposta(hit, numeroCNJ, tribunal)

    return {
      sucesso: true,
      dados: dadosNormalizados,
      tribunal,
      fonte: 'api'
    }

  } catch (error) {
    console.error('Erro ao consultar DataJud:', error)

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        sucesso: false,
        erro: 'Erro de conexao com a API DataJud. Verifique sua conexao com a internet.'
      }
    }

    return {
      sucesso: false,
      erro: 'Erro ao processar resposta da API DataJud'
    }
  }
}

/**
 * Normaliza a resposta da API DataJud para o formato do sistema
 */
function normalizarResposta(
  hit: DataJudResponse['hits']['hits'][0]['_source'],
  numeroCNJ: string,
  tribunal: TribunalInfo
): ProcessoDataJud {
  // Extrair assuntos como array de strings
  const assuntos = hit.assuntos?.map(a => a.nome) || []

  // Concatenar assuntos para objeto_acao
  const objetoAcao = assuntos.join('; ')

  // Mapear movimentacoes (ultimas 20)
  const movimentacoes: MovimentacaoDataJud[] = (hit.movimentos || [])
    .slice(0, 20)
    .map(m => ({
      codigo: m.codigo,
      descricao: m.nome,
      data: m.dataHora
    }))

  // Mapear grau para instancia
  const instancia = GRAU_PARA_INSTANCIA[hit.grau] || '1a'

  // Inferir area pela classe
  const classe = hit.classe?.nome || ''

  return {
    numero_cnj: formatarNumeroCNJ(hit.numeroProcesso) || numeroCNJ,
    tribunal: tribunal.nome,
    classe,
    classe_codigo: hit.classe?.codigo,
    orgao_julgador: hit.orgaoJulgador?.nome || '',
    orgao_julgador_codigo: hit.orgaoJulgador?.codigo,
    comarca_ibge: hit.orgaoJulgador?.codigoMunicipioIBGE,
    data_ajuizamento: hit.dataAjuizamento,
    grau: hit.grau,
    instancia,
    formato: hit.formato?.nome || 'Eletronico',
    assuntos,
    objeto_acao: objetoAcao,
    movimentacoes,
    sigilo: hit.nivelSigilo > 0,
    ultima_atualizacao: hit.dataHoraUltimaAtualizacao
  }
}

/**
 * Verifica se a API DataJud esta disponivel
 * Util para health check
 */
export async function verificarDisponibilidadeDataJud(): Promise<boolean> {
  try {
    const response = await fetch(`${DATAJUD_API_URL}/api_publica_tjsp/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `APIKey ${DATAJUD_API_KEY}`
      },
      body: JSON.stringify({
        query: {
          match_all: {}
        },
        size: 0
      })
    })

    return response.ok
  } catch {
    return false
  }
}
