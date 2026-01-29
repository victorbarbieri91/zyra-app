import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

/**
 * Edge Function: sync-indices-bcb
 *
 * Sincroniza índices econômicos do Banco Central do Brasil (BCB)
 * para uso em correção monetária de processos e contratos.
 *
 * Deve ser executada mensalmente (via cron job ou pg_cron) após o dia 15,
 * quando a maioria dos índices já está disponível.
 *
 * Índices sincronizados:
 * - INPC (188) - Padrão para processos
 * - IPCA (433) - Índice oficial de inflação
 * - IPCA-E (10764) - Tabelas judiciais
 * - IGP-M (189) - Contratos e aluguéis
 * - SELIC (11) - Processos tributários
 */

// Configuração dos índices a sincronizar
const INDICES_CONFIG = [
  { codigo: 188, nome: 'INPC', descricao: 'Índice Nacional de Preços ao Consumidor' },
  { codigo: 433, nome: 'IPCA', descricao: 'Índice de Preços ao Consumidor Amplo' },
  { codigo: 10764, nome: 'IPCA-E', descricao: 'IPCA Especial' },
  { codigo: 189, nome: 'IGP-M', descricao: 'Índice Geral de Preços do Mercado' },
  { codigo: 11, nome: 'SELIC', descricao: 'Taxa Selic' },
]

// Buscar últimos N meses de dados
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
    // Verificar método
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

    // Parâmetros opcionais do request
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

    // Sincronizar cada índice
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

        // Importar cada registro
        let importados = 0
        let ultimoMes: string | null = null

        for (const ponto of dados) {
          const resultado = await importarIndice(supabase, indice.codigo, indice.nome, ponto)
          if (resultado) {
            importados++
            ultimoMes = ponto.data
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

    // Atualizar valores dos processos se solicitado
    let processosAtualizados = 0
    if (atualizarProcessos && totalImportados > 0) {
      console.log(`\nAtualizando valores dos processos...`)

      if (escritorioId) {
        // Atualizar apenas um escritório específico
        const { data } = await supabase.rpc('atualizar_valores_processos_escritorio', {
          p_escritorio_id: escritorioId,
        })
        processosAtualizados = data?.atualizados || 0
      } else {
        // Atualizar todos os escritórios
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
  // Calcular data inicial (N meses atrás)
  const dataFinal = new Date()
  const dataInicial = new Date()
  dataInicial.setMonth(dataInicial.getMonth() - meses)

  const dataInicialStr = formatDateBCB(dataInicial)
  const dataFinalStr = formatDateBCB(dataFinal)

  // URL da API do BCB
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${dataInicialStr}&dataFinal=${dataFinalStr}`

  console.log(`  URL: ${url}`)

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
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
 * Importa um registro de índice no banco de dados
 */
async function importarIndice(
  supabase: any,
  codigo: number,
  nome: string,
  ponto: BCBDataPoint
): Promise<boolean> {
  try {
    // Converter data DD/MM/YYYY para Date
    const [dia, mes, ano] = ponto.data.split('/').map(Number)
    const competencia = new Date(ano, mes - 1, 1) // Primeiro dia do mês

    // Converter valor
    const valor = parseFloat(ponto.valor.replace(',', '.'))

    if (isNaN(valor)) {
      console.log(`    Valor inválido ignorado: ${ponto.valor}`)
      return false
    }

    // Chamar função de importação
    const { error } = await supabase.rpc('importar_indice_bcb', {
      p_codigo_bcb: codigo,
      p_nome: nome,
      p_competencia: competencia.toISOString().split('T')[0],
      p_valor: valor,
      p_variacao_mensal: null, // BCB não retorna variação, seria calculada
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
