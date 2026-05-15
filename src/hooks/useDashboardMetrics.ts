'use client'

import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from './useEscritorioAtivo'
import { useEscritoriosDoGrupoUsuario } from './useEscritoriosDoGrupoUsuario'

// Meta dinâmica do painel "Meus Números":
// meta_mes = max(piso_minimo, realizado_mes_passado * (1 + percentual / 100))
// O piso evita metas desmotivadoras quando o mês anterior teve volume baixo
// (e cobre também o caso de usuário sem histórico).
const PERCENTUAL_CRESCIMENTO_DEFAULT = 20
const PISO_HORAS_META = 15
const PISO_RECEITA_META = 10000

export interface DashboardMetrics {
  // KPIs
  processos_ativos: number
  processos_novos_semana: number
  clientes_ativos: number
  clientes_novos_mes: number
  consultas_abertas: number

  // Financeiro - "Meus Números" (dados do USUÁRIO logado)
  // Horas: filtrado por user_id no timesheet
  // Honorários: filtrado por responsavel_id em financeiro_receitas
  horas_cobraveis_usuario: number    // Todas horas faturavel=true do usuário (produção cobrável)
  horas_ja_faturadas_usuario: number // Horas faturavel=true AND faturado=true (já em faturas)
  honorarios_mes: number             // Honorários do usuário via responsavel_id + data_competencia
  a_receber: number
  horas_nao_cobraveis: number // Horas com faturavel=false
  valor_horas_nao_cobraveis: number // Calculado com valor_hora do usuário
  valor_hora_usuario: number // Valor/hora do cargo do usuário
  horas_meta: number
  receita_meta: number

  // Horas cobráveis (do escritório, para KPI) - total de horas com faturavel=true
  horas_cobraveis: number
  horas_cobraveis_trend_percent: number // % vs mesmo dia mês passado

  // Tendências em quantidade absoluta (novos - saídas do mês)
  processos_trend_qtd: number // +2, -1, etc.
  clientes_trend_qtd: number
  consultas_trend_qtd: number
  horas_trend_valor: number

  // Publicações
  publicacoes_pendentes: number
}

const defaultMetrics: DashboardMetrics = {
  processos_ativos: 0,
  processos_novos_semana: 0,
  clientes_ativos: 0,
  clientes_novos_mes: 0,
  consultas_abertas: 0,
  horas_cobraveis_usuario: 0,
  horas_ja_faturadas_usuario: 0,
  honorarios_mes: 0,
  a_receber: 0,
  horas_nao_cobraveis: 0,
  valor_horas_nao_cobraveis: 0,
  valor_hora_usuario: 0,
  horas_meta: PISO_HORAS_META, // Meta dinâmica: mes_anterior * (1+%); fallback quando sem histórico
  receita_meta: PISO_RECEITA_META, // Idem para honorários
  horas_cobraveis: 0,
  horas_cobraveis_trend_percent: 0,
  processos_trend_qtd: 0,
  clientes_trend_qtd: 0,
  consultas_trend_qtd: 0,
  horas_trend_valor: 0,
  publicacoes_pendentes: 0,
}

async function fetchDashboardMetrics(
  supabase: ReturnType<typeof createClient>,
  escritoriosIds: string[],
  percentualCrescimento: number
): Promise<DashboardMetrics> {
  // Garante que sempre tem ao menos 1 ID — evita query inválida `.in('id', [])`.
  if (escritoriosIds.length === 0) return defaultMetrics
  // Obter usuário logado para filtrar "Seus Números do Mês"
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - 7)

  const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)

  // Para comparação de horas faturáveis: mesmo dia do mês passado
  const diaAtual = hoje.getDate()
  const mesmoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, diaAtual)

  // Executar queries em paralelo para melhor performance
  const [
    processosResult,
    processosNovosResult,
    processosNovosEsteMesResult,
    processosEncerradosEsteMesResult,
    clientesResult,
    clientesNovosResult,
    clientesNovosEsteMesResult,
    consultasResult,
    consultasNovasEsteMesResult,
    consultasFinalizadasEsteMesResult,
    publicacoesResult,
    timesheetFaturadoResult,
    timesheetMesAnteriorResult,
    horasNaoCobraveisResult,
    horasCobraveisEsteMesResult,
    horasCobraveisAteDiaMesPassadoResult,
    receitasGeradasResult,
    receitasMesAnteriorResult,
    valorHoraResult,
    aReceberResult,
  ] = await Promise.all([
    // Processos ativos
    supabase
      .from('processos_processos')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .in('status', ['ativo', 'em_andamento', 'aguardando']),

    // Processos novos na semana
    supabase
      .from('processos_processos')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .gte('created_at', inicioSemana.toISOString()),

    // Processos novos ESTE MÊS (entradas)
    supabase
      .from('processos_processos')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .gte('created_at', inicioMes.toISOString()),

    // Processos encerrados ESTE MÊS (saídas) - status arquivado/encerrado com updated_at este mês
    supabase
      .from('processos_processos')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .in('status', ['arquivado', 'encerrado', 'baixado'])
      .gte('updated_at', inicioMes.toISOString()),

    // Clientes ativos (apenas tipo_cadastro = 'cliente')
    supabase
      .from('crm_pessoas')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .eq('tipo_cadastro', 'cliente')
      .eq('status', 'ativo'),

    // Clientes novos no mês (apenas tipo_cadastro = 'cliente')
    supabase
      .from('crm_pessoas')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .eq('tipo_cadastro', 'cliente')
      .gte('created_at', inicioMes.toISOString()),

    // Clientes novos ESTE MÊS (para trend)
    supabase
      .from('crm_pessoas')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .eq('tipo_cadastro', 'cliente')
      .gte('created_at', inicioMes.toISOString()),

    // Consultas abertas (status 'ativo' = em andamento)
    supabase
      .from('consultivo_consultas')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .eq('status', 'ativo'),

    // Consultas novas ESTE MÊS
    supabase
      .from('consultivo_consultas')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .gte('created_at', inicioMes.toISOString()),

    // Consultas finalizadas ESTE MÊS (status existentes: ativo, arquivado)
    supabase
      .from('consultivo_consultas')
      .select('id', { count: 'exact', head: true })
      .in('escritorio_id', escritoriosIds)
      .eq('status', 'arquivado')
      .gte('updated_at', inicioMes.toISOString()),

    // Publicações - usar a view (uma linha por escritório; somamos no agregador).
    supabase
      .from('v_publicacoes_dashboard')
      .select('*')
      .in('escritorio_id', escritoriosIds),

    // Horas COBRÁVEIS no mês DO USUÁRIO LOGADO (faturavel=true, independente de faturado)
    userId ? supabase
      .from('financeiro_timesheet')
      .select('horas, faturado')
      .in('escritorio_id', escritoriosIds)
      .eq('user_id', userId)
      .eq('faturavel', true)
      .gte('data_trabalho', inicioMes.toISOString().split('T')[0])
    : Promise.resolve({ data: [] }),

    // Horas cobráveis do mês anterior DO USUÁRIO LOGADO (para tendência)
    userId ? supabase
      .from('financeiro_timesheet')
      .select('horas')
      .in('escritorio_id', escritoriosIds)
      .eq('user_id', userId)
      .eq('faturavel', true)
      .gte('data_trabalho', inicioMesAnterior.toISOString().split('T')[0])
      .lte('data_trabalho', fimMesAnterior.toISOString().split('T')[0])
    : Promise.resolve({ data: [] }),

    // Horas NÃO COBRÁVEIS DO USUÁRIO LOGADO (faturavel=false).
    // IMPORTANTE: lê de v_timesheet_profissional para não inflar com horas
    // lançadas contra tarefas/eventos pessoais (ex: Aula de francês).
    // Ver supabase/migrations/20260413000002_view_timesheet_profissional.sql
    userId ? supabase
      .from('v_timesheet_profissional' as any)
      .select('horas')
      .in('escritorio_id', escritoriosIds)
      .eq('user_id', userId)
      .eq('faturavel', false)
      .gte('data_trabalho', inicioMes.toISOString().split('T')[0])
    : Promise.resolve({ data: [] }),

    // Horas COBRÁVEIS este mês (faturavel=true, independente de faturado)
    supabase
      .from('financeiro_timesheet')
      .select('horas')
      .in('escritorio_id', escritoriosIds)
      .eq('faturavel', true)
      .gte('data_trabalho', inicioMes.toISOString().split('T')[0])
      .lte('data_trabalho', hoje.toISOString().split('T')[0]),

    // Horas COBRÁVEIS até o mesmo dia do mês passado (para comparação %)
    supabase
      .from('financeiro_timesheet')
      .select('horas')
      .in('escritorio_id', escritoriosIds)
      .eq('faturavel', true)
      .gte('data_trabalho', inicioMesAnterior.toISOString().split('T')[0])
      .lte('data_trabalho', mesmoDiaMesPassado.toISOString().split('T')[0]),

    // Honorários do mês DO USUÁRIO LOGADO (por data_competencia, anti-duplicação no processamento)
    userId ? supabase
      .from('financeiro_receitas')
      .select('valor, tipo')
      .in('escritorio_id', escritoriosIds)
      .eq('responsavel_id', userId)
      .neq('status', 'cancelado')
      .gte('data_competencia', inicioMes.toISOString().split('T')[0])
      .lt('data_competencia', inicioProximoMes.toISOString().split('T')[0])
    : Promise.resolve({ data: [] }),

    // Honorários do MÊS ANTERIOR DO USUÁRIO LOGADO — base da meta dinâmica
    userId ? supabase
      .from('financeiro_receitas')
      .select('valor, tipo')
      .in('escritorio_id', escritoriosIds)
      .eq('responsavel_id', userId)
      .neq('status', 'cancelado')
      .gte('data_competencia', inicioMesAnterior.toISOString().split('T')[0])
      .lte('data_competencia', fimMesAnterior.toISOString().split('T')[0])
    : Promise.resolve({ data: [] }),

    // Valor/hora do usuário logado (direto ou via cargo).
    // Pega o PRIMEIRO registro do usuário no grupo de escritórios — assumimos
    // que o valor_hora é consistente entre escritórios do mesmo grupo.
    userId ? supabase
      .from('escritorios_usuarios')
      .select('valor_hora, cargo:cargo_id(valor_hora_padrao)')
      .in('escritorio_id', escritoriosIds)
      .eq('user_id', userId)
      .eq('ativo', true)
      .limit(1)
    : Promise.resolve({ data: [] }),

    // A receber DO USUÁRIO LOGADO (receitas pendentes)
    userId ? supabase
      .from('financeiro_receitas')
      .select('valor, valor_pago')
      .in('escritorio_id', escritoriosIds)
      .eq('responsavel_id', userId)
      .in('status', ['pendente', 'atrasado', 'parcial'])
    : Promise.resolve({ data: [] }),
  ])

  // Processar resultados - Horas do USUÁRIO LOGADO
  const todasCobraveis = timesheetFaturadoResult.data || []
  const horasCobraveisUsuario = todasCobraveis.reduce(
    (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
    0
  )
  const horasJaFaturadasUsuario = todasCobraveis
    .filter((item: { faturado?: boolean | null }) => item.faturado === true)
    .reduce((acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0), 0)

  const horasMesAnterior = timesheetMesAnteriorResult.data?.reduce(
    (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
    0
  ) || 0

  const horasNaoCobraveis = horasNaoCobraveisResult.data?.reduce(
    (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
    0
  ) || 0

  // Valor/hora do usuário (direto ou via cargo)
  const valorHoraRow = (valorHoraResult.data || [])[0] as
    | { valor_hora?: number; cargo?: { valor_hora_padrao?: number } | null }
    | undefined
  const valorHoraDireto = Number(valorHoraRow?.valor_hora) || 0
  const valorHoraCargo = Number(valorHoraRow?.cargo?.valor_hora_padrao) || 0
  const valorHoraUsuario = valorHoraDireto > 0 ? valorHoraDireto : valorHoraCargo

  // Horas COBRÁVEIS do escritório (faturavel=true, independente de faturado)
  const horasCobraveisEsteMes = horasCobraveisEsteMesResult.data?.reduce(
    (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
    0
  ) || 0

  const horasCobraveisAteDiaMesPassado = horasCobraveisAteDiaMesPassadoResult.data?.reduce(
    (acc: number, item: { horas: number | null }) => acc + (Number(item.horas) || 0),
    0
  ) || 0

  // Calcular tendência em % de horas cobráveis (vs mesmo dia mês passado)
  const horasCobraveis = horasCobraveisEsteMes
  const horasCobraveisPercent = horasCobraveisAteDiaMesPassado > 0
    ? Math.round(((horasCobraveisEsteMes - horasCobraveisAteDiaMesPassado) / horasCobraveisAteDiaMesPassado) * 100)
    : (horasCobraveisEsteMes > 0 ? 100 : 0)

  // Calcular honorários do mês (excluir saldos já contabilizados)
  const honorariosMes = receitasGeradasResult.data?.reduce(
    (acc: number, item: { valor: number | null; tipo: string | null }) => {
      // Pular saldo (já contabilizado na receita original)
      if (item.tipo === 'saldo') return acc
      return acc + (Number(item.valor) || 0)
    },
    0
  ) || 0

  // Honorários do mês ANTERIOR (mesma regra: exclui tipo='saldo') — base da meta dinâmica
  const honorariosMesAnterior = receitasMesAnteriorResult.data?.reduce(
    (acc: number, item: { valor: number | null; tipo: string | null }) => {
      if (item.tipo === 'saldo') return acc
      return acc + (Number(item.valor) || 0)
    },
    0
  ) || 0

  // Meta dinâmica: realizado_mes_anterior * (1 + percentual/100), com piso mínimo
  // que evita metas desmotivadoras quando o mês passado teve volume baixo (ou zero).
  const fatorCrescimento = 1 + (percentualCrescimento / 100)
  const horasMetaCalculada = Math.round(horasMesAnterior * fatorCrescimento * 10) / 10
  const receitaMetaCalculada = Math.round(honorariosMesAnterior * fatorCrescimento)
  const horasMeta = Math.max(horasMetaCalculada, PISO_HORAS_META)
  const receitaMeta = Math.max(receitaMetaCalculada, PISO_RECEITA_META)

  // Calcular total a receber (valor pendente das receitas)
  const totalAReceber = aReceberResult.data?.reduce(
    (acc: number, item: { valor: number | null; valor_pago: number | null }) => acc + (Number(item.valor) || 0) - (Number(item.valor_pago) || 0),
    0
  ) || 0

  // Calcular tendências em QUANTIDADE ABSOLUTA (novos - saídas do mês)
  const processosAtivos = processosResult.count || 0
  const processosNovosEsteMes = processosNovosEsteMesResult.count || 0
  const processosEncerradosEsteMes = processosEncerradosEsteMesResult.count || 0
  const processosTrendQtd = processosNovosEsteMes - processosEncerradosEsteMes

  const clientesNovos = clientesNovosResult.count || 0
  // Para clientes, consideramos apenas os novos (não temos status "inativo" consistente)
  const clientesTrendQtd = clientesNovosEsteMesResult.count || 0

  // Consultas: novos - finalizados
  const consultasNovasEsteMes = consultasNovasEsteMesResult.count || 0
  const consultasFinalizadasEsteMes = consultasFinalizadasEsteMesResult.count || 0
  const consultasTrendQtd = consultasNovasEsteMes - consultasFinalizadasEsteMes

  const horasTrend = Math.round((horasCobraveisUsuario - horasMesAnterior) * 10) / 10

  return {
    processos_ativos: processosAtivos,
    processos_novos_semana: processosNovosResult.count || 0,
    clientes_ativos: clientesResult.count || 0,
    clientes_novos_mes: clientesNovos,
    consultas_abertas: consultasResult.count || 0,
    horas_cobraveis_usuario: horasCobraveisUsuario,
    horas_ja_faturadas_usuario: horasJaFaturadasUsuario,
    honorarios_mes: honorariosMes,
    a_receber: totalAReceber,
    horas_nao_cobraveis: horasNaoCobraveis,
    valor_horas_nao_cobraveis: horasNaoCobraveis * valorHoraUsuario,
    valor_hora_usuario: valorHoraUsuario,
    horas_meta: horasMeta,
    receita_meta: receitaMeta,
    horas_cobraveis: horasCobraveis,
    horas_cobraveis_trend_percent: horasCobraveisPercent,
    processos_trend_qtd: processosTrendQtd,
    clientes_trend_qtd: clientesTrendQtd,
    consultas_trend_qtd: consultasTrendQtd,
    horas_trend_valor: horasTrend,
    publicacoes_pendentes: (publicacoesResult.data || []).reduce(
      (acc: number, row: { pendentes?: number | null }) => acc + (Number(row.pendentes) || 0),
      0,
    ),
  }
}

export function useDashboardMetrics() {
  const { escritorioAtivoData } = useEscritorioAtivo()
  const { escritoriosIds } = useEscritoriosDoGrupoUsuario()
  const supabaseRef = useRef(createClient())
  const queryClient = useQueryClient()

  // Percentual configurado pelo escritório (default 20%).
  const percentualCrescimento =
    escritorioAtivoData?.config?.metas?.percentual_crescimento ??
    PERCENTUAL_CRESCIMENTO_DEFAULT

  // Chave estável (sorted) pra garantir cache hit independente da ordem.
  const queryKey = ['dashboard', 'metrics', [...escritoriosIds].sort().join(','), percentualCrescimento]

  const { data: metrics = defaultMetrics, isLoading: loading, error } = useQuery({
    queryKey,
    queryFn: () => fetchDashboardMetrics(supabaseRef.current, escritoriosIds, percentualCrescimento),
    enabled: escritoriosIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
  }

  return {
    metrics,
    loading,
    error: error as Error | null,
    refresh,
    isEmpty: !loading && metrics.processos_ativos === 0 &&
             metrics.clientes_ativos === 0 &&
             metrics.publicacoes_pendentes === 0,
  }
}
