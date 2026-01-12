import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const JANELA_DIAS = 45 // ~1.5 meses à frente

interface Recorrencia {
  id: string
  escritorio_id: string
  template_nome: string
  template_descricao: string | null
  entidade_tipo: 'tarefa' | 'evento' | 'audiencia'
  template_dados: any
  regra_frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual'
  regra_intervalo: number
  regra_dia_mes: number | null
  regra_dias_semana: number[] | null
  regra_mes: number | null
  regra_hora: string
  ativo: boolean
  data_inicio: string
  data_fim: string | null
  proxima_execucao: string | null
  ultima_execucao: string | null
  total_criados: number
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    const hoje = startOfDay(new Date())
    const fimJanela = addDays(hoje, JANELA_DIAS)

    console.log(`[${new Date().toISOString()}] Processando recorrências...`)
    console.log(`Janela: ${formatDate(hoje)} até ${formatDate(fimJanela)}`)

    // 1. Buscar recorrências ativas
    const { data: recorrencias, error: recError } = await supabase
      .from('agenda_recorrencias')
      .select('*')
      .eq('ativo', true)
      .or(`data_fim.is.null,data_fim.gte.${formatDate(hoje)}`)

    if (recError) {
      console.error('Erro ao buscar recorrências:', recError)
      throw recError
    }

    console.log(`Encontradas ${recorrencias?.length || 0} recorrências ativas`)

    let totalCriadas = 0

    // 2. Processar cada recorrência
    for (const rec of recorrencias || []) {
      console.log(`\n[${rec.template_nome}] Processando...`)

      try {
        // Calcular próximas datas dentro da janela
        const proximasDatas = calcularProximasDatas(rec, hoje, fimJanela)
        console.log(`  → ${proximasDatas.length} datas calculadas`)

        if (proximasDatas.length === 0) continue

        // Buscar ocorrências já criadas
        const tabela = getTabelaPorTipo(rec.entidade_tipo)
        const { data: existentes } = await supabase
          .from(tabela)
          .select('data_inicio')
          .eq('recorrencia_id', rec.id)
          .gte('data_inicio', formatDateTime(hoje))
          .lte('data_inicio', formatDateTime(fimJanela))

        const datasExistentes = new Set(
          (existentes || []).map(e => formatDate(new Date(e.data_inicio)))
        )

        // Criar apenas as que faltam
        let criadasNesta = 0
        for (const data of proximasDatas) {
          const dataStr = formatDate(data)

          if (!datasExistentes.has(dataStr)) {
            await criarOcorrencia(supabase, rec, data)
            criadasNesta++
          }
        }

        console.log(`  → ${criadasNesta} ocorrências criadas`)
        totalCriadas += criadasNesta

        // Atualizar metadados da recorrência
        await supabase
          .from('agenda_recorrencias')
          .update({
            proxima_execucao: proximasDatas[0] ? formatDate(proximasDatas[0]) : null,
            ultima_execucao: formatDate(hoje),
            total_criados: rec.total_criados + criadasNesta,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rec.id)

      } catch (err) {
        console.error(`  ✗ Erro ao processar recorrência ${rec.template_nome}:`, err)
      }
    }

    console.log(`\n✓ Processo concluído: ${totalCriadas} ocorrências criadas`)

    return new Response(
      JSON.stringify({
        success: true,
        recorrenciasProcessadas: recorrencias?.length || 0,
        ocorrenciasCriadas: totalCriadas,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// ===== FUNÇÕES AUXILIARES =====

function getTabelaPorTipo(tipo: string): string {
  switch (tipo) {
    case 'tarefa': return 'agenda_tarefas'
    case 'evento': return 'agenda_eventos'
    case 'audiencia': return 'agenda_audiencias'
    default: throw new Error(`Tipo inválido: ${tipo}`)
  }
}

function calcularProximasDatas(rec: Recorrencia, inicio: Date, fim: Date): Date[] {
  const datas: Date[] = []
  let atual = new Date(rec.data_inicio)

  // Ajustar para a próxima data válida após 'inicio'
  while (atual < inicio) {
    atual = proximaData(rec, atual)
  }

  // Gerar datas dentro da janela
  while (atual <= fim) {
    // Verificar data_fim se existir
    if (rec.data_fim && atual > new Date(rec.data_fim)) {
      break
    }

    datas.push(new Date(atual))
    atual = proximaData(rec, atual)
  }

  return datas
}

function proximaData(rec: Recorrencia, dataAtual: Date): Date {
  switch (rec.regra_frequencia) {
    case 'diaria':
      return addDays(dataAtual, rec.regra_intervalo)

    case 'semanal':
      // Encontrar próximo dia da semana válido
      if (!rec.regra_dias_semana || rec.regra_dias_semana.length === 0) {
        return addDays(dataAtual, 7 * rec.regra_intervalo)
      }

      let proxima = addDays(dataAtual, 1)
      let tentativas = 0

      while (tentativas < 14) { // Máximo 2 semanas
        if (rec.regra_dias_semana.includes(proxima.getDay())) {
          return proxima
        }
        proxima = addDays(proxima, 1)
        tentativas++
      }

      return addDays(dataAtual, 7 * rec.regra_intervalo)

    case 'mensal':
      const proximoMes = addMonths(dataAtual, rec.regra_intervalo)
      if (rec.regra_dia_mes) {
        proximoMes.setDate(Math.min(rec.regra_dia_mes, getDaysInMonth(proximoMes)))
      }
      return proximoMes

    case 'anual':
      return addYears(dataAtual, rec.regra_intervalo)

    default:
      return addDays(dataAtual, 1)
  }
}

async function criarOcorrencia(supabase: any, rec: Recorrencia, data: Date) {
  const tabela = getTabelaPorTipo(rec.entidade_tipo)

  // Combinar data com hora padrão
  const dataHora = combineDateWithTime(data, rec.regra_hora)

  const dados: any = {
    ...rec.template_dados,
    escritorio_id: rec.escritorio_id,
    recorrencia_id: rec.id,
    data_inicio: dataHora.toISOString(),
  }

  // Calcular data_fim se tiver duração
  if (rec.template_dados.duracao_minutos) {
    dados.data_fim = addMinutes(dataHora, rec.template_dados.duracao_minutos).toISOString()
  } else if (rec.template_dados.data_fim) {
    // Para tarefas, copiar data_fim também
    const dataFim = combineDateWithTime(data, '23:59')
    dados.data_fim = dataFim.toISOString()
  }

  // Para audiências, usar data_hora
  if (rec.entidade_tipo === 'audiencia') {
    dados.data_hora = dataHora.toISOString()
    delete dados.data_inicio
  }

  const { error } = await supabase
    .from(tabela)
    .insert(dados)

  if (error) {
    console.error(`Erro ao criar ocorrência:`, error)
    throw error
  }
}

// ===== UTILITÁRIOS DE DATA =====

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateTime(date: Date): string {
  return date.toISOString()
}

function combineDateWithTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}
