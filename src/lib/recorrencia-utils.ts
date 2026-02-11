/**
 * Utilitário para expansão de recorrências no frontend.
 *
 * Em vez de pré-gerar instâncias no banco de dados, este módulo calcula
 * "instâncias virtuais" a partir das regras de recorrência para qualquer
 * range de datas solicitado. Instâncias virtuais são exibidas no calendário
 * e materializadas no banco apenas quando o usuário interage (concluir, editar, etc.).
 */

import type { AgendaItem } from '@/hooks/useAgendaConsolidada'

// ===== TIPOS =====

export interface RecorrenciaRegra {
  id: string
  escritorio_id: string
  template_nome: string
  template_descricao: string | null
  entidade_tipo: 'tarefa' | 'evento'
  template_dados: any
  regra_frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual'
  regra_intervalo: number
  regra_dias_semana: number[] | null
  regra_dia_mes: number | null
  regra_mes: number | null
  regra_hora: string
  regra_apenas_uteis: boolean
  ativo: boolean
  data_inicio: string
  data_fim: string | null
  max_ocorrencias: number | null
  total_criados: number
  exclusoes?: string[] // datas YYYY-MM-DD excluídas pelo usuário
}

interface InstanciaExistente {
  recorrencia_id: string
  data_inicio: string // ISO string ou YYYY-MM-DD
}

// ===== FUNÇÃO PRINCIPAL =====

/**
 * Expande regras de recorrência em instâncias virtuais (AgendaItem[])
 * para um range de datas, excluindo datas que já têm instância real no banco.
 */
export function expandirRecorrencias(
  regras: RecorrenciaRegra[],
  rangeInicio: Date,
  rangeFim: Date,
  instanciasExistentes: InstanciaExistente[]
): AgendaItem[] {
  const virtuais: AgendaItem[] = []

  // Indexar instâncias existentes por recorrencia_id + data
  const existentesSet = new Set(
    instanciasExistentes.map(i => `${i.recorrencia_id}_${extrairData(i.data_inicio)}`)
  )

  for (const regra of regras) {
    if (!regra.ativo) continue

    // Indexar exclusões desta regra
    const exclusoesSet = new Set(regra.exclusoes || [])

    // Calcular datas no range
    const datas = calcularProximasDatas(regra, rangeInicio, rangeFim)

    for (const data of datas) {
      const dateStr = formatarData(data)
      const chave = `${regra.id}_${dateStr}`

      // Pular se já existe instância real para esta data
      if (existentesSet.has(chave)) continue

      // Pular datas excluídas pelo usuário
      if (exclusoesSet.has(dateStr)) continue

      // Criar instância virtual
      virtuais.push(criarInstanciaVirtual(regra, dateStr))
    }
  }

  return virtuais
}

// ===== CÁLCULO DE DATAS =====

/**
 * Calcula todas as datas de ocorrência dentro de um range.
 */
export function calcularProximasDatas(
  regra: RecorrenciaRegra,
  rangeInicio: Date,
  rangeFim: Date
): Date[] {
  const datas: Date[] = []
  const dataInicioRegra = parseData(regra.data_inicio)
  const dataFimRegra = regra.data_fim ? parseData(regra.data_fim) : null

  // Começar da data de início da regra
  let atual = new Date(dataInicioRegra)
  let contadorTotal = 0

  // Avançar até o início do range
  while (atual < rangeInicio) {
    atual = proximaData(regra, atual)
    contadorTotal++

    // Safety: evitar loop infinito
    if (contadorTotal > 10000) break
  }

  // Gerar datas dentro do range
  while (atual <= rangeFim) {
    // Verificar data_fim da regra
    if (dataFimRegra && atual > dataFimRegra) break

    // Verificar max_ocorrencias
    if (regra.max_ocorrencias && (regra.total_criados + contadorTotal) >= regra.max_ocorrencias) break

    datas.push(new Date(atual))
    atual = proximaData(regra, atual)
    contadorTotal++

    // Safety
    if (datas.length > 500) break
  }

  return datas
}

/**
 * Calcula a próxima data de ocorrência a partir da data atual.
 */
function proximaData(regra: RecorrenciaRegra, dataAtual: Date): Date {
  switch (regra.regra_frequencia) {
    case 'diaria':
      return proximaDataDiaria(regra, dataAtual)

    case 'semanal':
      return proximaDataSemanal(regra, dataAtual)

    case 'mensal':
      return proximaDataMensal(regra, dataAtual)

    case 'anual':
      return proximaDataAnual(regra, dataAtual)

    default:
      return addDias(dataAtual, 1)
  }
}

function proximaDataDiaria(regra: RecorrenciaRegra, dataAtual: Date): Date {
  let proxima = addDias(dataAtual, regra.regra_intervalo)

  // Pular fins de semana se apenasUteis
  if (regra.regra_apenas_uteis) {
    while (isFimDeSemana(proxima)) {
      proxima = addDias(proxima, 1)
    }
  }

  return proxima
}

function proximaDataSemanal(regra: RecorrenciaRegra, dataAtual: Date): Date {
  const diasSemana = regra.regra_dias_semana
  if (!diasSemana || diasSemana.length === 0) {
    return addDias(dataAtual, 7 * regra.regra_intervalo)
  }

  const diasOrdenados = [...diasSemana].sort((a, b) => a - b)
  const diaAtual = dataAtual.getDay()

  // Procurar próximo dia válido na mesma semana
  const proximoDiaNaSemana = diasOrdenados.find(d => d > diaAtual)

  if (proximoDiaNaSemana !== undefined) {
    // Ainda tem dia válido nesta semana
    return addDias(dataAtual, proximoDiaNaSemana - diaAtual)
  }

  // Pular para o primeiro dia válido da próxima semana (respeitando intervalo)
  // Calcular dias até o próximo domingo (início da próxima semana)
  const diasAteDomingo = 7 - diaAtual
  // Pular semanas adicionais se intervalo > 1
  const semanasExtra = (regra.regra_intervalo - 1) * 7
  const primeiroDiaProximoCiclo = diasOrdenados[0]

  return addDias(dataAtual, diasAteDomingo + semanasExtra + primeiroDiaProximoCiclo)
}

function proximaDataMensal(regra: RecorrenciaRegra, dataAtual: Date): Date {
  const proximoMes = addMeses(dataAtual, regra.regra_intervalo)
  const diaMes = regra.regra_dia_mes || dataAtual.getDate()

  if (diaMes === 99) {
    // Último dia do mês
    return new Date(proximoMes.getFullYear(), proximoMes.getMonth() + 1, 0)
  }

  // Ajustar para o último dia do mês se necessário
  const diasNoMes = new Date(proximoMes.getFullYear(), proximoMes.getMonth() + 1, 0).getDate()
  proximoMes.setDate(Math.min(diaMes, diasNoMes))
  return proximoMes
}

function proximaDataAnual(regra: RecorrenciaRegra, dataAtual: Date): Date {
  const proximoAno = new Date(dataAtual)
  proximoAno.setFullYear(proximoAno.getFullYear() + regra.regra_intervalo)

  if (regra.regra_mes) {
    proximoAno.setMonth(regra.regra_mes - 1) // 1-indexed → 0-indexed
  }
  if (regra.regra_dia_mes) {
    const diasNoMes = new Date(proximoAno.getFullYear(), proximoAno.getMonth() + 1, 0).getDate()
    proximoAno.setDate(Math.min(regra.regra_dia_mes, diasNoMes))
  }

  return proximoAno
}

// ===== CRIAÇÃO DE INSTÂNCIA VIRTUAL =====

function criarInstanciaVirtual(regra: RecorrenciaRegra, dateStr: string): AgendaItem {
  const template = regra.template_dados || {}
  const display = template._display || {}

  return {
    id: `virtual_${regra.id}_${dateStr}`,
    tipo_entidade: regra.entidade_tipo as 'tarefa' | 'evento',
    titulo: regra.template_nome,
    descricao: regra.template_descricao || template.descricao || undefined,
    data_inicio: dateStr,
    data_fim: undefined,
    dia_inteiro: template.dia_inteiro || false,
    cor: template.cor || undefined,
    status: 'pendente',
    prioridade: template.prioridade || 'media',
    subtipo: template.tipo || 'outro',
    responsavel_id: template.responsavel_id || (template.responsaveis_ids?.[0]) || undefined,
    responsavel_nome: display.responsavel_nome || undefined,
    responsaveis_ids: template.responsaveis_ids || [],
    local: template.local || undefined,
    processo_id: template.processo_id || undefined,
    processo_numero: display.processo_numero || undefined,
    caso_titulo: display.caso_titulo || undefined,
    consultivo_id: template.consultivo_id || undefined,
    consultivo_titulo: display.consultivo_titulo || undefined,
    recorrencia_id: regra.id,
    is_virtual: true,
    escritorio_id: regra.escritorio_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as AgendaItem
}

// ===== UTILITÁRIOS DE DATA =====

function addDias(data: Date, dias: number): Date {
  const resultado = new Date(data)
  resultado.setDate(resultado.getDate() + dias)
  return resultado
}

function addMeses(data: Date, meses: number): Date {
  const resultado = new Date(data)
  resultado.setMonth(resultado.getMonth() + meses)
  return resultado
}

function isFimDeSemana(data: Date): boolean {
  const dia = data.getDay()
  return dia === 0 || dia === 6 // Domingo ou Sábado
}

function formatarData(data: Date): string {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseData(dateStr: string): Date {
  // Parse YYYY-MM-DD sem problemas de timezone
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Extrai a parte YYYY-MM-DD de um ISO string ou YYYY-MM-DD.
 */
function extrairData(dateStr: string): string {
  return dateStr.split('T')[0]
}

// ===== RESUMO LEGÍVEL =====

const DIAS_NOMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}

/**
 * Gera um resumo legível de uma configuração de recorrência.
 * Ex: "Toda semana: Segunda, Quarta, Sexta às 09:00"
 */
export function getRecorrenciaSummary(data: {
  frequencia: string
  intervalo: number
  diasSemana?: number[]
  diaMes?: number
  mes?: number
  apenasUteis?: boolean
  horaPadrao: string
  terminoTipo?: string
  dataFim?: string
  numeroOcorrencias?: number
}): string {
  const { frequencia, intervalo, diasSemana, diaMes, mes, apenasUteis, horaPadrao, terminoTipo, dataFim, numeroOcorrencias } = data

  let base = ''

  switch (frequencia) {
    case 'diaria':
      if (intervalo === 1) {
        base = apenasUteis ? 'Todo dia útil' : 'Todo dia'
      } else {
        base = `A cada ${intervalo} dias${apenasUteis ? ' úteis' : ''}`
      }
      break

    case 'semanal': {
      const nomes = (diasSemana || [])
        .sort((a, b) => a - b)
        .map(d => DIAS_NOMES[d] || '')
        .filter(Boolean)
      const diasStr = nomes.length > 0 ? nomes.join(', ') : 'Sem dias selecionados'

      if (intervalo === 1) {
        base = `Toda semana: ${diasStr}`
      } else {
        base = `A cada ${intervalo} semanas: ${diasStr}`
      }
      break
    }

    case 'mensal': {
      const diaLabel = diaMes === 99 ? 'último dia' : `dia ${diaMes || 1}`
      if (intervalo === 1) {
        base = `Todo mês, ${diaLabel}`
      } else {
        base = `A cada ${intervalo} meses, ${diaLabel}`
      }
      break
    }

    case 'anual': {
      const mesNome = MESES_NOMES[mes || 1] || ''
      base = `Todo ano, ${diaMes || 1} de ${mesNome}`
      break
    }

    default:
      base = 'Recorrência configurada'
  }

  const hora = `às ${horaPadrao || '09:00'}`

  let termino = ''
  if (terminoTipo === 'data' && dataFim) {
    const [y, m, d] = dataFim.split('-')
    termino = ` até ${d}/${m}/${y}`
  } else if (terminoTipo === 'ocorrencias' && numeroOcorrencias) {
    termino = ` (${numeroOcorrencias}x)`
  }

  return `${base} ${hora}${termino}`
}
