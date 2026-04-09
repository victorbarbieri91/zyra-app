'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { captureOperationError } from '@/lib/logger'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'

// Tipos baseados nas tabelas do banco
export type FormaCobranca = 'fixo' | 'por_hora' | 'misto' | 'por_pasta' | 'por_ato' | 'por_cargo' | 'por_etapa' | 'pro_bono'

export interface ContratoHonorario {
  id: string
  escritorio_id: string
  escritorio_nome?: string // Nome do escritório (para visualização multi-escritório)
  numero_contrato: string
  titulo?: string | null // Título/referência do contrato
  cliente_id: string
  cliente_nome?: string
  tipo_servico: 'processo' | 'consultoria' | 'avulso' | 'misto'
  forma_cobranca: FormaCobranca
  formas_disponiveis?: FormaCobranca[] // TODAS as formas configuradas
  ativo: boolean
  data_inicio: string
  data_fim?: string | null
  arquivo_contrato_url?: string | null
  observacoes?: string | null
  created_at: string
  updated_at: string
  // Configuração de valores (join com contratos_honorarios_config)
  config?: ContratoConfig[]
  // Para contratos misto: define se horas trabalhadas são cobráveis
  // Usado pelo trigger trg_timesheet_set_faturavel para calcular faturavel automaticamente
  horas_faturaveis?: boolean | null
  // Dados calculados
  valor_total?: number
  valor_recebido?: number
  valor_pendente?: number
  parcelas_pagas?: number
  total_parcelas?: number
  inadimplente?: boolean
  dias_atraso?: number
  proxima_parcela?: {
    numero: number
    valor: number
    vencimento: string
  }
  // Indica se o contrato tem configuração de valores preenchida
  configurado?: boolean
  // Formas de cobrança que realmente têm configuração válida
  formas_configuradas?: FormaCobranca[]
  // Grupo de clientes (grupo econômico)
  grupo_clientes?: GrupoClientes | null
  // Reajuste monetário (contratos fixos)
  reajuste_ativo?: boolean
  valor_atualizado?: number | null
  data_ultimo_reajuste?: string | null
  indice_reajuste?: string | null // INPC, IPCA, IGP-M, SELIC
}

export interface ContratoConfig {
  id: string
  contrato_id: string
  tipo_config: 'fixo' | 'hora' | 'etapa' | 'exito' | 'pasta' | 'cargo'
  valor_fixo?: number | null
  valor_hora?: number | null
  horas_estimadas?: number | null
  etapas_valores?: Record<string, number> | null
  percentual_exito?: number | null
  valor_minimo_exito?: number | null
  // Novos campos para por_pasta
  valor_por_processo?: number | null
  dia_cobranca?: number | null
  // Campos de controle de meses
  meses_cobrados?: number | null
  limite_meses?: number | null
}

export interface ValorPorCargo {
  cargo_id: string
  cargo_nome: string
  valor_padrao: number | null
  valor_negociado: number | null
}

export type ModoCobrancaAto = 'percentual' | 'por_hora'

export interface AtoContrato {
  ato_tipo_id: string
  ato_nome?: string
  // Modo de cobrança: percentual (padrão) ou por_hora (novo)
  modo_cobranca?: ModoCobrancaAto
  // Campos para modo percentual (existentes)
  percentual_valor_causa?: number
  valor_fixo?: number // Valor mínimo para modo percentual
  // Campos para modo por_hora (novos)
  valor_hora?: number
  horas_minimas?: number
  horas_maximas?: number
  // Controle de ativação
  ativo?: boolean // Para permitir excluir atos não usados
}

// Valor fixo individual (para múltiplos valores fixos por contrato)
export interface ValorFixoItem {
  id: string // UUID temporário para identificação no frontend
  descricao: string // Ex: "Inicial", "Sentença", "Recurso"
  valor: number
  atualizacao_monetaria?: boolean
  atualizacao_indice?: 'ipca' | 'ipca_e' | 'inpc' | 'igpm'
  // Periodicidade: undefined = avulso (sem recorrência)
  periodicidade?: 'mensal_fixo' | 'parcelado'
  dia_vencimento?: number // 1-31
  numero_parcelas?: number // apenas quando periodicidade === 'parcelado'
  data_inicio_cobranca?: string // formato 'YYYY-MM', mês/ano de início da cobrança
}

// Cliente no grupo econômico
export interface ClienteGrupo {
  cliente_id: string
  nome: string
}

// Configuração de grupo de clientes para faturamento consolidado
export interface GrupoClientes {
  habilitado: boolean
  cliente_pagador_id: string // CNPJ que constará na fatura
  clientes: ClienteGrupo[] // Lista de clientes do grupo
}

export interface ContratoFormData {
  cliente_id: string
  titulo?: string // Título/referência do contrato
  tipo_servico: 'processo' | 'consultoria' | 'avulso' | 'misto'
  forma_cobranca: FormaCobranca
  formas_selecionadas?: string[] // MÚLTIPLAS formas de cobrança
  data_inicio: string
  data_fim?: string
  observacoes?: string
  // Configuração de valores baseada na forma de cobrança
  valor_fixo?: number // DEPRECATED: usar valores_fixos para múltiplos valores
  valores_fixos?: ValorFixoItem[] // Array de valores fixos (novo)
  valor_hora?: number
  horas_estimadas?: number
  etapas_valores?: Record<string, number>
  percentual_exito?: number
  valor_minimo_exito?: number
  // Novos campos para por_pasta
  valor_por_processo?: number
  dia_cobranca?: number
  limite_meses?: number // Limite de meses para fechamento mensal (padrão: 24)
  // Novos campos para por_cargo
  valores_por_cargo?: ValorPorCargo[]
  // Novos campos para por_ato
  area_juridica?: string
  atos_configurados?: AtoContrato[]
  // Para contratos misto: define se horas são cobráveis (default: true)
  horas_faturaveis?: boolean
  // Multi-escritório: escritório dono do contrato (se diferente do ativo)
  escritorio_contrato_id?: string
  // Limites mensais para contratos por_hora e por_cargo
  valor_minimo_mensal?: number | null
  valor_maximo_mensal?: number | null
  // DEPRECATED: atualização monetária agora fica em cada ValorFixoItem
  atualizacao_monetaria?: boolean
  atualizacao_indice?: 'ipca' | 'ipca_e' | 'inpc' | 'igpm'
  atualizacao_data_base?: string
  // Grupo de clientes (grupo econômico)
  grupo_habilitado?: boolean
  grupo_clientes?: ClienteGrupo[]
  cliente_pagador_id?: string
}

export interface ContratosMetrics {
  total_contratos: number
  contratos_ativos: number
  valor_total_contratos: number
  valor_recebido: number
  valor_pendente: number
  inadimplentes: number
  valor_inadimplente: number
}

export function useContratosHonorarios(escritorioIds?: string[]) {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

  // Usar escritorioIds se fornecido, senão usar escritorioAtivo como array
  const idsParaConsulta = escritorioIds && escritorioIds.length > 0
    ? escritorioIds
    : (escritorioAtivo ? [escritorioAtivo] : [])

  const [contratos, setContratos] = useState<ContratoHonorario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ContratosMetrics>({
    total_contratos: 0,
    contratos_ativos: 0,
    valor_total_contratos: 0,
    valor_recebido: 0,
    valor_pendente: 0,
    inadimplentes: 0,
    valor_inadimplente: 0,
  })

  // Gerar próximo número de contrato (formato: CONT-0001)
  const gerarNumeroContrato = useCallback(async (): Promise<string> => {
    if (!escritorioAtivo) return ''

    const { data } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('numero_contrato')
      .eq('escritorio_id', escritorioAtivo)
      .ilike('numero_contrato', 'CONT-%')
      .order('numero_contrato', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const ultimoNumero = data[0].numero_contrato
      // Extrair número sequencial (último segmento após CONT-)
      const partes = ultimoNumero.split('-')
      const ultimaParte = partes[partes.length - 1]
      const sequencial = parseInt(ultimaParte || '0', 10) + 1
      return `CONT-${String(sequencial).padStart(4, '0')}`
    }

    return 'CONT-0001'
  }, [escritorioAtivo, supabase])

  // Carregar todos os contratos com dados relacionados
  const loadContratos = useCallback(async () => {
    if (idsParaConsulta.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Buscar contratos com join em crm_pessoas (clientes), escritório de cobrança, escritório e receitas
      const { data: contratosData, error: contratosError } = await supabase
        .from('financeiro_contratos_honorarios')
        .select(`
          *,
          crm_pessoas (
            nome_completo
          ),
          escritorios:escritorio_id (
            nome
          ),
          financeiro_receitas (
            id,
            tipo,
            valor,
            valor_pago,
            status,
            data_vencimento,
            numero_parcela,
            dias_atraso
          )
        `)
        .in('escritorio_id', idsParaConsulta)
        .order('created_at', { ascending: false })

      if (contratosError) throw contratosError

      // Processar contratos com dados das receitas
      const contratosComDados: ContratoHonorario[] = (contratosData || []).map((contrato: Record<string, any>) => {
        // Calcular valores das receitas vinculadas ao contrato
        let valorTotal = 0
        let valorRecebido = 0
        let valorPendente = 0
        let parcelasPagas = 0
        let totalParcelas = 0
        let inadimplente = false
        let diasAtraso = 0
        let proximaParcela: ContratoHonorario['proxima_parcela'] = undefined

        const receitas = contrato.financeiro_receitas || []

        receitas.forEach((receita: {
          tipo: string
          valor: number
          valor_pago: number | null
          status: string
          data_vencimento: string
          numero_parcela: number | null
          dias_atraso: number | null
        }) => {
          // Somar valor total (apenas honorários e parcelas, não saldos)
          if (receita.tipo === 'honorario' || receita.tipo === 'parcela') {
            valorTotal += Number(receita.valor) || 0
            totalParcelas++

            if (receita.status === 'pago') {
              parcelasPagas++
              valorRecebido += Number(receita.valor_pago) || Number(receita.valor) || 0
            } else if (receita.status === 'parcial') {
              valorRecebido += Number(receita.valor_pago) || 0
              valorPendente += (Number(receita.valor) - Number(receita.valor_pago || 0))
            } else if (receita.status === 'pendente' || receita.status === 'atrasado') {
              valorPendente += Number(receita.valor) || 0
              if (receita.status === 'atrasado') {
                inadimplente = true
                diasAtraso = Math.max(diasAtraso, Number(receita.dias_atraso) || 0)
              }
              // Próxima parcela pendente
              if (!proximaParcela && receita.tipo === 'parcela') {
                proximaParcela = {
                  numero: receita.numero_parcela || 1,
                  valor: Number(receita.valor),
                  vencimento: receita.data_vencimento,
                }
              }
            }
          }
        })

        // Se não há receitas, calcular valor estimado da config JSONB
        if (valorTotal === 0 && contrato.config) {
          const config = contrato.config as Record<string, unknown>
          if (config.valor_fixo) {
            valorTotal += Number(config.valor_fixo)
          }
          if (config.valor_hora && config.horas_estimadas) {
            valorTotal += Number(config.valor_hora) * Number(config.horas_estimadas)
          }
          valorPendente = valorTotal
        }

        // Extrair formas de cobrança do JSONB ou usar forma_cobranca principal
        const formasDisponiveis: FormaCobranca[] = contrato.formas_pagamento
          ? (contrato.formas_pagamento as Array<{ forma: FormaCobranca }>).map(f => f.forma)
          : [contrato.forma_cobranca]

        // Verificar se o contrato está configurado baseado nas formas de cobrança
        const configData = contrato.config as Record<string, unknown> | null
        let configurado = false
        let formasConfiguradas: FormaCobranca[] = []

        // Pro-bono é sempre considerado configurado (não precisa de valores)
        if (formasDisponiveis.includes('pro_bono')) {
          configurado = true
          formasConfiguradas.push('pro_bono')
        }

        if (configData && Object.keys(configData).length > 0) {
          // Verificar todas as formas configuradas, não só a principal
          const formasParaVerificar = formasDisponiveis.length > 0
            ? formasDisponiveis
            : [contrato.forma_cobranca as FormaCobranca]

          const verificarForma = (forma: FormaCobranca): boolean => {
            switch (forma) {
              case 'fixo':
                return (Array.isArray(configData.valores_fixos) && (configData.valores_fixos as unknown[]).length > 0) ||
                  !!configData.valor_fixo
              case 'por_hora':
                return !!configData.valor_hora
              case 'por_cargo':
                return Array.isArray(configData.valores_por_cargo) &&
                  (configData.valores_por_cargo as unknown[]).length > 0
              case 'por_pasta':
                return !!configData.valor_por_processo
              case 'por_ato':
                return Array.isArray(configData.atos_configurados) &&
                  (configData.atos_configurados as unknown[]).length > 0
              case 'misto':
                return !!configData.valor_fixo ||
                  !!configData.valor_hora ||
                  !!configData.percentual_exito ||
                  (!!configData.etapas_valores && Object.keys(configData.etapas_valores as object).length > 0)
              case 'pro_bono':
                return true
              default:
                return false
            }
          }

          // Filtrar apenas as formas que realmente têm config válida
          formasConfiguradas = formasParaVerificar.filter(verificarForma)
          configurado = formasConfiguradas.length > 0
        }

        return {
          id: contrato.id,
          escritorio_id: contrato.escritorio_id,
          escritorio_nome: contrato.escritorios?.nome,
          numero_contrato: contrato.numero_contrato,
          titulo: contrato.titulo,
          cliente_id: contrato.cliente_id,
          cliente_nome: contrato.crm_pessoas?.nome_completo || 'Cliente não encontrado',
          tipo_servico: contrato.tipo_contrato,
          forma_cobranca: contrato.forma_cobranca,
          formas_disponiveis: formasDisponiveis.length > 0 ? formasDisponiveis : [contrato.forma_cobranca],
          ativo: contrato.ativo,
          data_inicio: contrato.data_inicio,
          data_fim: contrato.data_fim,
          arquivo_contrato_url: null,
          observacoes: contrato.descricao,
          created_at: contrato.created_at,
          updated_at: contrato.updated_at,
          config: contrato.config ? [contrato.config as ContratoConfig] : [],
          // Para contratos misto: define se horas são cobráveis
          horas_faturaveis: contrato.horas_faturaveis ?? true,
          valor_total: valorTotal,
          valor_recebido: valorRecebido,
          valor_pendente: valorPendente,
          parcelas_pagas: parcelasPagas,
          total_parcelas: totalParcelas,
          inadimplente,
          dias_atraso: diasAtraso,
          proxima_parcela: proximaParcela,
          configurado,
          formas_configuradas: formasConfiguradas,
          // Grupo de clientes (carregado do campo JSONB)
          grupo_clientes: contrato.grupo_clientes as GrupoClientes | null,
        }
      })

      setContratos(contratosComDados)

      // Calcular métricas
      const metricsCalculadas: ContratosMetrics = {
        total_contratos: contratosComDados.length,
        contratos_ativos: contratosComDados.filter((c) => c.ativo).length,
        valor_total_contratos: contratosComDados.reduce((sum, c) => sum + (c.valor_total || 0), 0),
        valor_recebido: contratosComDados.reduce((sum, c) => sum + (c.valor_recebido || 0), 0),
        valor_pendente: contratosComDados.reduce((sum, c) => sum + (c.valor_pendente || 0), 0),
        inadimplentes: contratosComDados.filter((c) => c.inadimplente).length,
        valor_inadimplente: contratosComDados
          .filter((c) => c.inadimplente)
          .reduce((sum, c) => sum + (c.valor_pendente || 0), 0),
      }
      setMetrics(metricsCalculadas)
    } catch (err) {
      console.error('Erro ao carregar contratos:', err)
      setError('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }, [idsParaConsulta, supabase])

  // Helper: calcular data de vencimento baseada na data início e dia preferido
  const calcularDataVencimento = (dataInicio: string, diaVencimento?: number): string => {
    const [ano, mes] = dataInicio.split('-').map(Number)
    const ultimoDiaMes = new Date(ano, mes, 0).getDate()
    const dia = Math.min(diaVencimento || 10, ultimoDiaMes)
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  // Criar novo contrato
  const createContrato = useCallback(
    async (data: ContratoFormData): Promise<string | null> => {
      if (!escritorioAtivo) {
        setError('Escritório não selecionado')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        // Gerar número do contrato
        const numeroContrato = await gerarNumeroContrato()

        // Determinar escritório dono do contrato (pode ser filial mesmo com ativo na matriz)
        const ownerEscritorioId = data.escritorio_contrato_id || escritorioAtivo

        // Criar contrato
        const { data: novoContrato, error: contratoError } = await supabase
          .from('financeiro_contratos_honorarios')
          .insert({
            escritorio_id: ownerEscritorioId,
            numero_contrato: numeroContrato,
            titulo: data.titulo || null,
            cliente_id: data.cliente_id,
            tipo_contrato: data.tipo_servico,
            forma_cobranca: data.forma_cobranca,
            data_inicio: data.data_inicio,
            data_fim: data.data_fim || null,
            descricao: data.observacoes || null,
            ativo: true,
            // Para contratos misto: define se horas são cobráveis (usado pelo trigger de timesheet)
            horas_faturaveis: data.forma_cobranca === 'misto' ? (data.horas_faturaveis ?? true) : null,
          })
          .select('id')
          .single()

        if (contratoError) throw contratoError

        // Salvar formas de cobrança e config como JSONB
        const formas = data.formas_selecionadas || [data.forma_cobranca]

        // Construir objeto de configuração JSONB
        const configJsonb: Record<string, unknown> = {}

        // Valores Fixos (array com atualização monetária individual)
        // Contratos por_hora podem ter valores fixos mensais adicionais (ex: mensalidade + horas)
        if ((formas.includes('fixo') || formas.includes('misto') || formas.includes('por_hora')) && data.valores_fixos && data.valores_fixos.length > 0) {
          configJsonb.valores_fixos = data.valores_fixos.filter(v => v.valor > 0)
        }
        // Compatibilidade: valor_fixo único (deprecated)
        if ((formas.includes('fixo') || formas.includes('misto')) && data.valor_fixo && !data.valores_fixos?.length) {
          configJsonb.valor_fixo = data.valor_fixo
        }

        // Por Hora
        if ((formas.includes('por_hora') || formas.includes('misto')) && data.valor_hora) {
          configJsonb.valor_hora = data.valor_hora
          if (data.horas_estimadas) configJsonb.horas_estimadas = data.horas_estimadas
        }

        // Etapas para compatibilidade (apenas em misto)
        if (formas.includes('misto') && data.etapas_valores) {
          configJsonb.etapas_valores = data.etapas_valores
        }

        // Percentual de Êxito
        if (formas.includes('misto') && data.percentual_exito) {
          configJsonb.percentual_exito = data.percentual_exito
          if (data.valor_minimo_exito) configJsonb.valor_minimo_exito = data.valor_minimo_exito
        }

        // Por Pasta (disponível como adicional em contratos por_ato)
        if ((formas.includes('por_pasta') || formas.includes('por_ato')) && data.valor_por_processo) {
          configJsonb.valor_por_processo = data.valor_por_processo
          configJsonb.dia_cobranca = data.dia_cobranca || 1
          configJsonb.limite_meses = data.limite_meses || 24
          configJsonb.meses_cobrados = 0 // Inicializa contador para novos contratos
        }

        // Por Cargo
        if (formas.includes('por_cargo') && data.valores_por_cargo) {
          configJsonb.valores_por_cargo = data.valores_por_cargo
        }

        // Limites mensais (para por_hora e por_cargo)
        if (formas.includes('por_hora') || formas.includes('por_cargo')) {
          if (data.valor_minimo_mensal !== undefined && data.valor_minimo_mensal !== null) {
            configJsonb.valor_minimo_mensal = data.valor_minimo_mensal
          }
          if (data.valor_maximo_mensal !== undefined && data.valor_maximo_mensal !== null) {
            configJsonb.valor_maximo_mensal = data.valor_maximo_mensal
          }
        }

        // Por Ato
        if (formas.includes('por_ato') && data.atos_configurados) {
          configJsonb.atos_configurados = data.atos_configurados.filter(
            (a) => a.ativo !== false && (
              // Modo percentual: precisa ter percentual ou valor fixo
              (a.modo_cobranca !== 'por_hora' && (a.percentual_valor_causa || a.valor_fixo)) ||
              // Modo por_hora: precisa ter valor_hora
              (a.modo_cobranca === 'por_hora' && a.valor_hora)
            )
          )
        }

        // Atualização Monetária (para valores fixos)
        if (data.atualizacao_monetaria) {
          configJsonb.atualizacao_monetaria = {
            habilitada: true,
            indice: data.atualizacao_indice || 'ipca',
            data_base: data.atualizacao_data_base || data.data_inicio,
          }
        }

        // Construir array de formas de pagamento JSONB
        const formasPagamentoJsonb = formas.map((forma, index) => ({
          forma,
          ordem: index,
        }))

        // Grupo de Clientes (grupo econômico)
        let grupoClientesData: GrupoClientes | null = null
        if (data.grupo_habilitado && data.grupo_clientes && data.grupo_clientes.length > 0 && data.cliente_pagador_id) {
          grupoClientesData = {
            habilitado: true,
            cliente_pagador_id: data.cliente_pagador_id,
            clientes: data.grupo_clientes,
          }
        }

        // Atualizar contrato com config, formas e grupo JSONB
        if (Object.keys(configJsonb).length > 0 || formasPagamentoJsonb.length > 0 || grupoClientesData) {
          const { error: updateError } = await supabase
            .from('financeiro_contratos_honorarios')
            .update({
              config: Object.keys(configJsonb).length > 0 ? configJsonb : null,
              formas_pagamento: formasPagamentoJsonb.length > 0 ? formasPagamentoJsonb : null,
              grupo_clientes: grupoClientesData,
            })
            .eq('id', novoContrato.id)

          if (updateError) throw updateError
        }

        // Criar regras de recorrência e gerar receitas vinculadas
        const valoresComPeriodicidade = (data.valores_fixos || []).filter(
          v => v.valor > 0 && v.periodicidade
        )

        if (valoresComPeriodicidade.length > 0) {
          const { data: userData } = await supabase.auth.getUser()
          const userId = userData?.user?.id

          for (const valorFixo of valoresComPeriodicidade) {
            const mesInicio = valorFixo.data_inicio_cobranca || data.data_inicio.substring(0, 7)
            const [anoInicio, mesInicioNum] = mesInicio.split('-').map(Number)
            const dia = valorFixo.dia_vencimento || 10
            const isParcelado = valorFixo.periodicidade === 'parcelado'
            const numParcelas = isParcelado ? (valorFixo.numero_parcelas || 6) : null
            const valorParcela = isParcelado
              ? Math.round((valorFixo.valor / (numParcelas || 6)) * 100) / 100
              : valorFixo.valor
            const descricao = valorFixo.descricao || (isParcelado ? 'Honorário' : 'Mensalidade')

            // Calcular vigencia_inicio (YYYY-MM-DD)
            const ultimoDiaInicio = new Date(anoInicio, mesInicioNum, 0).getDate()
            const diaInicio = Math.min(dia, ultimoDiaInicio)
            const vigenciaInicio = `${anoInicio}-${String(mesInicioNum).padStart(2, '0')}-${String(diaInicio).padStart(2, '0')}`

            // Calcular vigencia_fim para parcelado
            let vigenciaFim: string | null = data.data_fim || null
            if (isParcelado && numParcelas) {
              const fimDate = new Date(anoInicio, mesInicioNum - 1 + numParcelas - 1, 1)
              const anoFim = fimDate.getFullYear()
              const mesFim = fimDate.getMonth() + 1
              const ultimoDiaFim = new Date(anoFim, mesFim, 0).getDate()
              const diaFim = Math.min(dia, ultimoDiaFim)
              vigenciaFim = `${anoFim}-${String(mesFim).padStart(2, '0')}-${String(diaFim).padStart(2, '0')}`
            }

            // 1. Criar regra de recorrência
            const { data: regra, error: regraError } = await supabase
              .from('financeiro_regras_recorrencia')
              .insert({
                escritorio_id: ownerEscritorioId,
                tipo_entidade: 'receita',
                descricao,
                categoria: 'honorarios',
                valor_atual: valorParcela,
                valor_total_original: isParcelado ? valorFixo.valor : null,
                cliente_id: data.cliente_id,
                contrato_id: novoContrato.id,
                frequencia: 'mensal',
                dia_vencimento: dia,
                vigencia_inicio: vigenciaInicio,
                vigencia_fim: vigenciaFim,
                ativo: true,
                is_parcelamento: isParcelado,
                parcela_total: numParcelas,
                parcela_inicio: 1,
                created_by: userId,
              })
              .select('id')
              .single()

            if (regraError) {
              console.error('[criarContrato] Erro ao criar regra de recorrência:', regraError)
              continue
            }

            // 2. Gerar batch inicial de receitas vinculadas à regra
            const totalMeses = isParcelado ? (numParcelas || 6) : 12
            const receitas = []

            for (let i = 0; i < totalMeses; i++) {
              const date = new Date(anoInicio, mesInicioNum - 1 + i, 1)
              const ano = date.getFullYear()
              const mes = date.getMonth() + 1
              const ultimoDia = new Date(ano, mes, 0).getDate()
              const diaReal = Math.min(dia, ultimoDia)
              const dataVenc = `${ano}-${String(mes).padStart(2, '0')}-${String(diaReal).padStart(2, '0')}`
              const dataComp = `${ano}-${String(mes).padStart(2, '0')}-01`
              const periodoRef = `${ano}-${String(mes).padStart(2, '0')}`

              // Calcular valor da parcela (última ajustada para arredondamento)
              let valor = valorParcela
              if (isParcelado && numParcelas) {
                valor = i === numParcelas - 1
                  ? Math.round((valorFixo.valor - valorParcela * (numParcelas - 1)) * 100) / 100
                  : valorParcela
              }

              const descricaoReceita = isParcelado
                ? `Parcela ${i + 1}/${numParcelas} - ${descricao}`
                : descricao

              receitas.push({
                escritorio_id: ownerEscritorioId,
                tipo: 'honorario',
                cliente_id: data.cliente_id,
                contrato_id: novoContrato.id,
                descricao: descricaoReceita,
                categoria: 'honorarios',
                valor,
                data_competencia: dataComp,
                data_vencimento: dataVenc,
                status: 'pendente',
                regra_recorrencia_id: regra.id,
                periodo_referencia: periodoRef,
                responsavel_id: userId,
                created_by: userId,
              })
            }

            const { error: receitaError } = await supabase.from('financeiro_receitas').insert(receitas)
            if (receitaError) {
              console.error('[criarContrato] Erro ao criar receitas:', receitaError)
            }
          }
        }

        // Recarregar lista
        await loadContratos()

        return novoContrato.id
      } catch (err) {
        console.error('Erro ao criar contrato:', err)
        setError('Erro ao criar contrato')
        return null
      } finally {
        setLoading(false)
      }
    },
    [escritorioAtivo, supabase, gerarNumeroContrato, loadContratos]
  )

  // Atualizar contrato existente
  const updateContrato = useCallback(
    async (id: string, data: Partial<ContratoFormData>): Promise<boolean> => {
      console.log('[updateContrato] Iniciando atualização...', {
        id,
        escritorioAtivo,
        data: JSON.stringify(data, null, 2),
      })

      if (!escritorioAtivo) {
        setError('Escritório não selecionado')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        // Atualizar dados básicos do contrato
        const updateData: Record<string, unknown> = {}
        if (data.cliente_id) updateData.cliente_id = data.cliente_id
        if (data.titulo !== undefined) updateData.titulo = data.titulo || null
        if (data.tipo_servico) updateData.tipo_contrato = data.tipo_servico
        if (data.forma_cobranca) updateData.forma_cobranca = data.forma_cobranca
        if (data.data_inicio) updateData.data_inicio = data.data_inicio
        if (data.data_fim !== undefined) updateData.data_fim = data.data_fim || null
        if (data.observacoes !== undefined) updateData.descricao = data.observacoes || null
        // Atualizar escritório dono do contrato se informado
        if (data.escritorio_contrato_id !== undefined) {
          updateData.escritorio_id = data.escritorio_contrato_id
        }
        // Para contratos misto: atualizar se horas são cobráveis
        if (data.horas_faturaveis !== undefined) {
          updateData.horas_faturaveis = data.forma_cobranca === 'misto' ? data.horas_faturaveis : null
        }

        console.log('[updateContrato] Step 1: Atualizando dados básicos...', updateData)
        const { error: updateError } = await supabase
          .from('financeiro_contratos_honorarios')
          .update(updateData)
          .eq('id', id)
          .in('escritorio_id', idsParaConsulta)

        if (updateError) {
          console.error('[updateContrato] Erro no Step 1:', updateError)
          throw updateError
        }

        // Atualizar formas de cobrança e config como JSONB
        const formas = data.formas_selecionadas || (data.forma_cobranca ? [data.forma_cobranca] : [])
        console.log('[updateContrato] Step 2: Atualizando config JSONB...', formas)

        // Construir objeto de configuração JSONB
        const configJsonb: Record<string, unknown> = {}

        // Valores Fixos (array com atualização monetária individual)
        // Contratos por_hora podem ter valores fixos mensais adicionais (ex: mensalidade + horas)
        if ((formas.includes('fixo') || formas.includes('misto') || formas.includes('por_hora')) && data.valores_fixos && data.valores_fixos.length > 0) {
          configJsonb.valores_fixos = data.valores_fixos.filter(v => v.valor > 0)
        }
        // Compatibilidade: valor_fixo único (deprecated)
        if ((formas.includes('fixo') || formas.includes('misto')) && data.valor_fixo && !data.valores_fixos?.length) {
          configJsonb.valor_fixo = data.valor_fixo
        }

        // Por Hora
        if ((formas.includes('por_hora') || formas.includes('misto')) && data.valor_hora) {
          configJsonb.valor_hora = data.valor_hora
          if (data.horas_estimadas) configJsonb.horas_estimadas = data.horas_estimadas
        }

        // Etapas para compatibilidade (apenas em misto)
        if (formas.includes('misto') && data.etapas_valores) {
          configJsonb.etapas_valores = data.etapas_valores
        }

        // Percentual de Êxito
        if (formas.includes('misto') && data.percentual_exito) {
          configJsonb.percentual_exito = data.percentual_exito
          if (data.valor_minimo_exito) configJsonb.valor_minimo_exito = data.valor_minimo_exito
        }

        // Por Pasta (disponível como adicional em contratos por_ato)
        if ((formas.includes('por_pasta') || formas.includes('por_ato')) && data.valor_por_processo) {
          configJsonb.valor_por_processo = data.valor_por_processo
          configJsonb.dia_cobranca = data.dia_cobranca || 1
          configJsonb.limite_meses = data.limite_meses || 24
          // Nota: meses_cobrados NÃO é resetado na atualização - controlado pelo sistema de fechamento
        }

        // Por Cargo
        if (formas.includes('por_cargo') && data.valores_por_cargo) {
          configJsonb.valores_por_cargo = data.valores_por_cargo
        }

        // Limites mensais (para por_hora e por_cargo)
        if (formas.includes('por_hora') || formas.includes('por_cargo')) {
          if (data.valor_minimo_mensal !== undefined && data.valor_minimo_mensal !== null) {
            configJsonb.valor_minimo_mensal = data.valor_minimo_mensal
          }
          if (data.valor_maximo_mensal !== undefined && data.valor_maximo_mensal !== null) {
            configJsonb.valor_maximo_mensal = data.valor_maximo_mensal
          }
        }

        // Por Ato
        if (formas.includes('por_ato') && data.atos_configurados) {
          configJsonb.atos_configurados = data.atos_configurados.filter(
            (a) => a.ativo !== false && (
              // Modo percentual: precisa ter percentual ou valor fixo
              (a.modo_cobranca !== 'por_hora' && (a.percentual_valor_causa || a.valor_fixo)) ||
              // Modo por_hora: precisa ter valor_hora
              (a.modo_cobranca === 'por_hora' && a.valor_hora)
            )
          )
        }

        // Atualização Monetária (para valores fixos)
        if (data.atualizacao_monetaria) {
          configJsonb.atualizacao_monetaria = {
            habilitada: true,
            indice: data.atualizacao_indice || 'ipca',
            data_base: data.atualizacao_data_base || data.data_inicio,
          }
        }

        // Construir array de formas de pagamento JSONB
        const formasPagamentoJsonb = formas.map((forma, index) => ({
          forma,
          ordem: index,
        }))

        // Grupo de Clientes (grupo econômico)
        let grupoClientesData: GrupoClientes | null = null
        if (data.grupo_habilitado && data.grupo_clientes && data.grupo_clientes.length > 0 && data.cliente_pagador_id) {
          grupoClientesData = {
            habilitado: true,
            cliente_pagador_id: data.cliente_pagador_id,
            clientes: data.grupo_clientes,
          }
        }

        // Atualizar contrato com config, formas e grupo JSONB
        const jsonbUpdateData: Record<string, unknown> = {}
        // Se pro_bono é a única forma, limpar config antiga (não precisa de valores)
        if (formas.length === 1 && formas[0] === 'pro_bono') {
          jsonbUpdateData.config = {}
        } else if (Object.keys(configJsonb).length > 0) {
          jsonbUpdateData.config = configJsonb
        }
        if (formasPagamentoJsonb.length > 0) {
          jsonbUpdateData.formas_pagamento = formasPagamentoJsonb
        }
        // Sempre atualizar grupo_clientes (pode ser null para remover)
        if (data.grupo_habilitado !== undefined) {
          jsonbUpdateData.grupo_clientes = grupoClientesData
        }

        if (Object.keys(jsonbUpdateData).length > 0) {
          console.log('[updateContrato] Atualizando JSONB:', jsonbUpdateData)
          const { error: jsonbError } = await supabase
            .from('financeiro_contratos_honorarios')
            .update(jsonbUpdateData)
            .eq('id', id)
            .in('escritorio_id', idsParaConsulta)

          if (jsonbError) {
            console.error('[updateContrato] Erro ao atualizar JSONB:', jsonbError)
            throw jsonbError
          }
        }

        // Nota: Tabelas auxiliares de cargo e atos foram removidas
        // Agora todos os dados ficam no JSONB config (já atualizado acima)

        // Sincronizar regras de recorrência com valores fixos do contrato
        const valoresComPeriodicidade = (data.valores_fixos || []).filter(
          v => v.valor > 0 && v.periodicidade
        )

        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id
        const ownerEscritorioId = data.escritorio_contrato_id || escritorioAtivo

        // Buscar regras ativas existentes para este contrato
        const { data: regrasExistentes } = await supabase
          .from('financeiro_regras_recorrencia')
          .select('id, descricao, valor_atual, dia_vencimento, ativo')
          .eq('contrato_id', id)
          .eq('ativo', true)

        const regrasMap = new Map(
          (regrasExistentes || []).map((r: { id: string; descricao: string; valor_atual: number; dia_vencimento: number }) => [r.descricao, r])
        )
        const descricoesMantidas = new Set<string>()

        for (const valorFixo of valoresComPeriodicidade) {
          const isParcelado = valorFixo.periodicidade === 'parcelado'
          const descricao = valorFixo.descricao || (isParcelado ? 'Honorário' : 'Mensalidade')
          const numParcelas = isParcelado ? (valorFixo.numero_parcelas || 6) : null
          const valorParcela = isParcelado
            ? Math.round((valorFixo.valor / (numParcelas || 6)) * 100) / 100
            : valorFixo.valor
          const dia = valorFixo.dia_vencimento || 10
          descricoesMantidas.add(descricao)

          const regraExistente = regrasMap.get(descricao) as { id: string; valor_atual: number; dia_vencimento: number } | undefined

          if (regraExistente) {
            // Regra já existe — atualizar valor e dia se mudaram
            const updates: Record<string, unknown> = {}
            if (Number(regraExistente.valor_atual) !== valorParcela) updates.valor_atual = valorParcela
            if (regraExistente.dia_vencimento !== dia) updates.dia_vencimento = dia

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('financeiro_regras_recorrencia')
                .update(updates)
                .eq('id', regraExistente.id)
            }
          } else {
            // Regra nova — criar regra + batch inicial de receitas
            const mesInicio = valorFixo.data_inicio_cobranca || (data.data_inicio || new Date().toISOString().split('T')[0]).substring(0, 7)
            const [anoInicio, mesInicioNum] = mesInicio.split('-').map(Number)

            const ultimoDiaInicio = new Date(anoInicio, mesInicioNum, 0).getDate()
            const diaInicio = Math.min(dia, ultimoDiaInicio)
            const vigenciaInicio = `${anoInicio}-${String(mesInicioNum).padStart(2, '0')}-${String(diaInicio).padStart(2, '0')}`

            let vigenciaFim: string | null = data.data_fim || null
            if (isParcelado && numParcelas) {
              const fimDate = new Date(anoInicio, mesInicioNum - 1 + numParcelas - 1, 1)
              const anoFim = fimDate.getFullYear()
              const mesFim = fimDate.getMonth() + 1
              const ultimoDiaFim = new Date(anoFim, mesFim, 0).getDate()
              const diaFim = Math.min(dia, ultimoDiaFim)
              vigenciaFim = `${anoFim}-${String(mesFim).padStart(2, '0')}-${String(diaFim).padStart(2, '0')}`
            }

            const { data: regra, error: regraError } = await supabase
              .from('financeiro_regras_recorrencia')
              .insert({
                escritorio_id: ownerEscritorioId,
                tipo_entidade: 'receita',
                descricao,
                categoria: 'honorarios',
                valor_atual: valorParcela,
                valor_total_original: isParcelado ? valorFixo.valor : null,
                cliente_id: data.cliente_id,
                contrato_id: id,
                frequencia: 'mensal',
                dia_vencimento: dia,
                vigencia_inicio: vigenciaInicio,
                vigencia_fim: vigenciaFim,
                ativo: true,
                is_parcelamento: isParcelado,
                parcela_total: numParcelas,
                parcela_inicio: 1,
                created_by: userId,
              })
              .select('id')
              .single()

            if (regraError) {
              console.error('[editarContrato] Erro ao criar regra de recorrência:', regraError)
              continue
            }

            // Gerar batch inicial de receitas
            const totalMeses = isParcelado ? (numParcelas || 6) : 12
            const receitas = []

            for (let i = 0; i < totalMeses; i++) {
              const date = new Date(anoInicio, mesInicioNum - 1 + i, 1)
              const ano = date.getFullYear()
              const mes = date.getMonth() + 1
              const ultimoDia = new Date(ano, mes, 0).getDate()
              const diaReal = Math.min(dia, ultimoDia)
              const dataVenc = `${ano}-${String(mes).padStart(2, '0')}-${String(diaReal).padStart(2, '0')}`
              const dataComp = `${ano}-${String(mes).padStart(2, '0')}-01`
              const periodoRef = `${ano}-${String(mes).padStart(2, '0')}`

              let valor = valorParcela
              if (isParcelado && numParcelas) {
                valor = i === numParcelas - 1
                  ? Math.round((valorFixo.valor - valorParcela * (numParcelas - 1)) * 100) / 100
                  : valorParcela
              }

              const descricaoReceita = isParcelado
                ? `Parcela ${i + 1}/${numParcelas} - ${descricao}`
                : descricao

              receitas.push({
                escritorio_id: ownerEscritorioId,
                tipo: 'honorario',
                cliente_id: data.cliente_id,
                contrato_id: id,
                descricao: descricaoReceita,
                categoria: 'honorarios',
                valor,
                data_competencia: dataComp,
                data_vencimento: dataVenc,
                status: 'pendente',
                regra_recorrencia_id: regra.id,
                periodo_referencia: periodoRef,
                responsavel_id: userId,
                created_by: userId,
              })
            }

            const { error: receitaError } = await supabase.from('financeiro_receitas').insert(receitas)
            if (receitaError) {
              console.error('[editarContrato] Erro ao criar receitas:', receitaError)
            }
          }
        }

        // Desativar regras que não têm mais valor fixo correspondente
        for (const [desc, regra] of regrasMap) {
          if (!descricoesMantidas.has(desc as string)) {
            await supabase
              .from('financeiro_regras_recorrencia')
              .update({ ativo: false })
              .eq('id', (regra as { id: string }).id)
          }
        }

        console.log('[updateContrato] Sucesso! Recarregando lista...')
        // Recarregar lista
        await loadContratos()

        return true
      } catch (err: unknown) {
        const error = err as { message?: string; code?: string; details?: string; hint?: string }
        console.error('[updateContrato] ERRO COMPLETO:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          fullError: JSON.stringify(err, null, 2),
        })
        setError(error?.message || 'Erro ao atualizar contrato')
        return false
      } finally {
        setLoading(false)
      }
    },
    [escritorioAtivo, supabase, loadContratos]
  )

  // Encerrar/desativar contrato (soft delete)
  const deleteContrato = useCallback(
    async (id: string): Promise<boolean> => {
      if (!escritorioAtivo) {
        setError('Escritório não selecionado')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase
          .from('financeiro_contratos_honorarios')
          .update({ ativo: false })
          .eq('id', id)
          .eq('escritorio_id', escritorioAtivo)

        if (deleteError) throw deleteError

        // Recarregar lista
        await loadContratos()

        return true
      } catch (err) {
        console.error('Erro ao encerrar contrato:', err)
        setError('Erro ao encerrar contrato')
        return false
      } finally {
        setLoading(false)
      }
    },
    [escritorioAtivo, supabase, loadContratos]
  )

  // Reativar contrato
  const reativarContrato = useCallback(
    async (id: string): Promise<boolean> => {
      if (!escritorioAtivo) {
        setError('Escritório não selecionado')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: reativarError } = await supabase
          .from('financeiro_contratos_honorarios')
          .update({ ativo: true })
          .eq('id', id)
          .eq('escritorio_id', escritorioAtivo)

        if (reativarError) throw reativarError

        // Recarregar lista
        await loadContratos()

        return true
      } catch (err) {
        console.error('Erro ao reativar contrato:', err)
        setError('Erro ao reativar contrato')
        return false
      } finally {
        setLoading(false)
      }
    },
    [escritorioAtivo, supabase, loadContratos]
  )

  return {
    contratos,
    loading,
    error,
    metrics,
    loadContratos,
    createContrato,
    updateContrato,
    deleteContrato,
    reativarContrato,
    gerarNumeroContrato,
  }
}
