import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

/**
 * Edge Function: sync-indices-bcb
 *
 * Sincroniza índices econômicos do Banco Central do Brasil (BCB)
 * para uso em correção monetária de processos e contratos.
 *
 * NOTA: A execução automática é feita via pg_cron (SQL function sync_e_atualizar_correcao_monetaria).
 * Esta Edge Function serve como alternativa manual ou para chamadas externas (n8n, etc).
 *
 * Índices sincronizados:
 * - INPC (188) - Padrão para processos cíveis (variação mensal %)
 * - SELIC (11) - Processos trabalhistas e tributários (taxa diária → acumulada mensal %)
 *
 * IMPORTANTE: Os valores armazenados são VARIAÇÕES MENSAIS em %,
 * não números-índice acumulados. A correção usa fórmula de composição:
 * fator = ∏(1 + taxa_i/100) para cada mês no período.
 */

// Apenas INPC e SELIC (índices efetivamente usados)
const INDICES_CONFIG = [
  { codigo: 188, nome: 'INPC', tipo: 'mensal' as const },
  { codigo: 11, nome: 'SELIC', tipo: 'diario' as const },
]

const MESES_HISTORICO = 24

interface BCBDataPoint {
  data: string // formato DD/MM/YYYY
  valor: string
}

interface IndiceResult {
  codigo: number
  nome: string
  registros_importados: number
  ultimo_mes: string | null
  erro?: string
}

Deno.serve(async (req) => {
  const startTime = Date.now()

  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`[${new Date().toISOString()}] Iniciando sincronização de índices BCB...`)

    let atualizarProcessos = true
    let escritorioId: string | null = null

    try {
      const body = await req.json()
      atualizarProcessos = body.atualizar_processos !== false
      escritorioId = body.escritorio_id || null
    } catch {
      // Sem body, usar defaults
    }

    const resultados: IndiceResult[] = []
    let totalImportados = 0

    for (const indice of INDICES_CONFIG) {
      console.log(`\n[${indice.nome}] Buscando dados do BCB...`)

      try {
        const dados = await buscarIndiceBCB(indice.codigo, MESES_HISTORICO)

        if (!dados || dados.length === 0) {
          console.log(`  → Nenhum dado retornado`)
          resultados.push({
            codigo: indice.codigo,
            nome: indice.nome,
            registros_importados: 0,
            ultimo_mes: null,
            erro: 'Nenhum dado retornado pela API',
          })
          continue
        }

        console.log(`  → ${dados.length} registros recebidos`)

        let importados = 0
        let ultimoMes: string | null = null

        if (indice.tipo === 'diario') {
          // SELIC: acumular taxas diárias em taxas mensais compostas
          const mensais = acumularDiarioParaMensal(dados)
          console.log(`  → ${mensais.length} meses acumulados de ${dados.length} registros diários`)

          for (const { competencia, taxaMensal } of mensais) {
            const { error } = await supabase.rpc('importar_indice_bcb', {
              p_codigo_bcb: indice.codigo,
              p_nome: indice.nome,
              p_competencia: competencia,
              p_valor: taxaMensal,
              p_variacao_mensal: null,
            })

            if (!error) {
              importados++
              ultimoMes = competencia
            } else {
              console.log(`    Erro ao importar ${competencia}: ${error.message}`)
            }
          }
        } else {
          // INPC: valores mensais diretos (variação % mensal)
          for (const ponto of dados) {
            const resultado = await importarIndiceMensal(supabase, indice.codigo, indice.nome, ponto)
            if (resultado) {
              importados++
              ultimoMes = ponto.data
            }
          }
        }

        console.log(`  → ${importados} registros importados/atualizados`)
        totalImportados += importados

        resultados.push({
          codigo: indice.codigo,
          nome: indice.nome,
          registros_importados: importados,
          ultimo_mes: ultimoMes,
        })
      } catch (error) {
        console.error(`  ✗ Erro ao processar ${indice.nome}:`, error)
        resultados.push({
          codigo: indice.codigo,
          nome: indice.nome,
          registros_importados: 0,
          ultimo_mes: null,
          erro: error.message,
        })
      }
    }

    // Atualizar valores dos processos
    let processosAtualizados = 0
    if (atualizarProcessos && totalImportados > 0) {
      console.log(`\nAtualizando valores dos processos...`)

      if (escritorioId) {
        const { data } = await supabase.rpc('atualizar_valores_processos_escritorio', {
          p_escritorio_id: escritorioId,
        })
        processosAtualizados = data?.atualizados || 0
      } else {
        const { data: escritorios } = await supabase
          .from('escritorios')
          .select('id')

        for (const esc of escritorios || []) {
          const { data } = await supabase.rpc('atualizar_valores_processos_escritorio', {
            p_escritorio_id: esc.id,
          })
          processosAtualizados += data?.atualizados || 0
        }
      }

      console.log(`  → ${processosAtualizados} processos atualizados`)
    }

    const duracao = Date.now() - startTime

    console.log(`\n✓ Sincronização concluída em ${duracao}ms`)
    console.log(`  Total de índices importados: ${totalImportados}`)
    console.log(`  Total de processos atualizados: ${processosAtualizados}`)

    return new Response(
      JSON.stringify({
        success: true,
        indices: resultados,
        total_importados: totalImportados,
        processos_atualizados: processosAtualizados,
        duracao_ms: duracao,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      }
    )
  }
})

/**
 * Busca dados de um índice na API do BCB
 */
async function buscarIndiceBCB(codigo: number, meses: number): Promise<BCBDataPoint[]> {
  const dataFinal = new Date()
  const dataInicial = new Date()
  dataInicial.setMonth(dataInicial.getMonth() - meses)

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${formatDateBCB(dataInicial)}&dataFinal=${formatDateBCB(dataFinal)}`

  console.log(`  URL: ${url}`)

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`API BCB retornou status ${response.status}`)
  }

  const dados = await response.json()

  if (!Array.isArray(dados)) {
    throw new Error('Resposta da API não é um array')
  }

  return dados
}

/**
 * Acumula taxas diárias da SELIC em taxas mensais compostas.
 * Formula: taxa_mensal = (∏(1 + taxa_diaria/100) - 1) × 100
 */
function acumularDiarioParaMensal(dados: BCBDataPoint[]): Array<{ competencia: string; taxaMensal: number }> {
  const porMes = new Map<string, number[]>()

  for (const ponto of dados) {
    const [, mes, ano] = ponto.data.split('/').map(Number)
    const chave = `${ano}-${String(mes).padStart(2, '0')}-01`
    const valor = parseFloat(ponto.valor.replace(',', '.'))

    if (isNaN(valor) || valor <= 0) continue

    if (!porMes.has(chave)) porMes.set(chave, [])
    porMes.get(chave)!.push(valor)
  }

  const resultado: Array<{ competencia: string; taxaMensal: number }> = []

  for (const [competencia, taxasDiarias] of porMes) {
    // Compor taxas diárias: ∏(1 + r_i/100) - 1
    const fator = taxasDiarias.reduce((acc, taxa) => acc * (1 + taxa / 100), 1)
    const taxaMensal = (fator - 1) * 100
    resultado.push({ competencia, taxaMensal })
  }

  return resultado.sort((a, b) => a.competencia.localeCompare(b.competencia))
}

/**
 * Importa um registro mensal de índice (INPC, IPCA, etc)
 */
async function importarIndiceMensal(
  supabase: any,
  codigo: number,
  nome: string,
  ponto: BCBDataPoint
): Promise<boolean> {
  try {
    const [, mes, ano] = ponto.data.split('/').map(Number)
    const competencia = `${ano}-${String(mes).padStart(2, '0')}-01`

    const valor = parseFloat(ponto.valor.replace(',', '.'))
    if (isNaN(valor)) {
      console.log(`    Valor inválido ignorado: ${ponto.valor}`)
      return false
    }

    const { error } = await supabase.rpc('importar_indice_bcb', {
      p_codigo_bcb: codigo,
      p_nome: nome,
      p_competencia: competencia,
      p_valor: valor,
      p_variacao_mensal: null,
    })

    if (error) {
      console.log(`    Erro ao importar: ${error.message}`)
      return false
    }

    return true
  } catch (error) {
    console.log(`    Erro ao processar ponto: ${error.message}`)
    return false
  }
}

/**
 * Formata data para o padrão da API BCB (DD/MM/YYYY)
 */
function formatDateBCB(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const ano = date.getFullYear()
  return `${dia}/${mes}/${ano}`
}
