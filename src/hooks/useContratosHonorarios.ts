'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'

// Tipos baseados nas tabelas do banco
export type FormaCobranca = 'fixo' | 'por_hora' | 'por_etapa' | 'misto' | 'por_pasta' | 'por_ato' | 'por_cargo'

export interface ContratoHonorario {
  id: string
  escritorio_id: string
  escritorio_cobranca_id?: string | null // Escritório que fatura (CNPJ na nota)
  escritorio_cobranca_nome?: string // Nome do escritório de cobrança
  escritorio_cobranca_cnpj?: string // CNPJ do escritório de cobrança
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
}

export interface ValorPorCargo {
  cargo_id: string
  cargo_nome: string
  valor_padrao: number | null
  valor_negociado: number | null
}

export interface AtoContrato {
  ato_tipo_id: string
  ato_nome?: string
  percentual_valor_causa?: number
  valor_fixo?: number
  ativo?: boolean // Para permitir excluir atos não usados
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
  valor_fixo?: number
  valor_hora?: number
  horas_estimadas?: number
  etapas_valores?: Record<string, number>
  percentual_exito?: number
  valor_minimo_exito?: number
  // Novos campos para por_pasta
  valor_por_processo?: number
  dia_cobranca?: number
  // Novos campos para por_cargo
  valores_por_cargo?: ValorPorCargo[]
  // Novos campos para por_ato
  area_juridica?: string
  atos_configurados?: AtoContrato[]
  // Multi-escritório: escritório que vai faturar (se diferente do ativo)
  escritorio_id?: string
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

export function useContratosHonorarios() {
  const supabase = createClient()
  const { escritorioAtivo } = useEscritorioAtivo()

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

  // Gerar próximo número de contrato
  const gerarNumeroContrato = useCallback(async (): Promise<string> => {
    if (!escritorioAtivo) return ''

    const ano = new Date().getFullYear()
    const { data } = await supabase
      .from('financeiro_contratos_honorarios')
      .select('numero_contrato')
      .eq('escritorio_id', escritorioAtivo)
      .ilike('numero_contrato', `CONT-${ano}-%`)
      .order('numero_contrato', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const ultimoNumero = data[0].numero_contrato
      const partes = ultimoNumero.split('-')
      const sequencial = parseInt(partes[2] || '0', 10) + 1
      return `CONT-${ano}-${String(sequencial).padStart(4, '0')}`
    }

    return `CONT-${ano}-0001`
  }, [escritorioAtivo, supabase])

  // Carregar todos os contratos com dados relacionados
  const loadContratos = useCallback(async () => {
    if (!escritorioAtivo) return

    setLoading(true)
    setError(null)

    try {
      // Buscar contratos com join em crm_pessoas (clientes), escritório de cobrança e receitas
      const { data: contratosData, error: contratosError } = await supabase
        .from('financeiro_contratos_honorarios')
        .select(`
          *,
          crm_pessoas (
            nome_completo
          ),
          escritorio_cobranca:escritorios!financeiro_contratos_honorarios_escritorio_cobranca_id_fkey (
            id,
            nome,
            cnpj
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
        .eq('escritorio_id', escritorioAtivo)
        .order('created_at', { ascending: false })

      if (contratosError) throw contratosError

      // Processar contratos com dados das receitas
      const contratosComDados: ContratoHonorario[] = (contratosData || []).map((contrato) => {
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

        // Verificar se o contrato está configurado baseado na forma de cobrança
        const configData = contrato.config as Record<string, unknown> | null
        let configurado = false

        if (configData && Object.keys(configData).length > 0) {
          const formaCobranca = contrato.forma_cobranca as FormaCobranca
          switch (formaCobranca) {
            case 'fixo':
              configurado = !!configData.valor_fixo
              break
            case 'por_hora':
              configurado = !!configData.valor_hora
              break
            case 'por_cargo':
              configurado = Array.isArray(configData.valores_por_cargo) &&
                (configData.valores_por_cargo as unknown[]).length > 0
              break
            case 'por_etapa':
              configurado = !!configData.etapas_valores &&
                Object.keys(configData.etapas_valores as object).length > 0
              break
            case 'por_pasta':
              configurado = !!configData.valor_por_processo
              break
            case 'por_ato':
              configurado = Array.isArray(configData.atos_configurados) &&
                (configData.atos_configurados as unknown[]).length > 0
              break
            case 'misto':
              // Para misto, precisa ter pelo menos uma configuração válida
              configurado = !!configData.valor_fixo ||
                !!configData.valor_hora ||
                !!configData.percentual_exito ||
                (!!configData.etapas_valores && Object.keys(configData.etapas_valores as object).length > 0)
              break
            default:
              configurado = false
          }
        }

        return {
          id: contrato.id,
          escritorio_id: contrato.escritorio_id,
          escritorio_cobranca_id: contrato.escritorio_cobranca_id,
          escritorio_cobranca_nome: contrato.escritorio_cobranca?.nome,
          escritorio_cobranca_cnpj: contrato.escritorio_cobranca?.cnpj,
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
          valor_total: valorTotal,
          valor_recebido: valorRecebido,
          valor_pendente: valorPendente,
          parcelas_pagas: parcelasPagas,
          total_parcelas: totalParcelas,
          inadimplente,
          dias_atraso: diasAtraso,
          proxima_parcela: proximaParcela,
          configurado,
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
  }, [escritorioAtivo, supabase])

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

        // Determinar escritório de cobrança (se diferente do ativo)
        const escritorioCobranca = data.escritorio_id && data.escritorio_id !== escritorioAtivo
          ? data.escritorio_id
          : null

        // Criar contrato
        const { data: novoContrato, error: contratoError } = await supabase
          .from('financeiro_contratos_honorarios')
          .insert({
            escritorio_id: escritorioAtivo,
            escritorio_cobranca_id: escritorioCobranca, // Escritório que fatura (CNPJ)
            numero_contrato: numeroContrato,
            titulo: data.titulo || null,
            cliente_id: data.cliente_id,
            tipo_contrato: data.tipo_servico,
            forma_cobranca: data.forma_cobranca,
            data_inicio: data.data_inicio,
            data_fim: data.data_fim || null,
            descricao: data.observacoes || null,
            ativo: true,
          })
          .select('id')
          .single()

        if (contratoError) throw contratoError

        // Salvar formas de cobrança e config como JSONB
        const formas = data.formas_selecionadas || [data.forma_cobranca]

        // Construir objeto de configuração JSONB
        const configJsonb: Record<string, unknown> = {}

        // Valor Fixo
        if ((formas.includes('fixo') || formas.includes('misto')) && data.valor_fixo) {
          configJsonb.valor_fixo = data.valor_fixo
        }

        // Por Hora
        if ((formas.includes('por_hora') || formas.includes('misto')) && data.valor_hora) {
          configJsonb.valor_hora = data.valor_hora
          if (data.horas_estimadas) configJsonb.horas_estimadas = data.horas_estimadas
        }

        // Por Etapa
        if ((formas.includes('por_etapa') || formas.includes('misto')) && data.etapas_valores) {
          configJsonb.etapas_valores = data.etapas_valores
        }

        // Percentual de Êxito
        if (formas.includes('misto') && data.percentual_exito) {
          configJsonb.percentual_exito = data.percentual_exito
          if (data.valor_minimo_exito) configJsonb.valor_minimo_exito = data.valor_minimo_exito
        }

        // Por Pasta
        if (formas.includes('por_pasta') && data.valor_por_processo) {
          configJsonb.valor_por_processo = data.valor_por_processo
          if (data.dia_cobranca) configJsonb.dia_cobranca = data.dia_cobranca
        }

        // Por Cargo
        if (formas.includes('por_cargo') && data.valores_por_cargo) {
          configJsonb.valores_por_cargo = data.valores_por_cargo
        }

        // Por Ato
        if (formas.includes('por_ato') && data.atos_configurados) {
          configJsonb.atos_configurados = data.atos_configurados.filter(
            (a) => a.ativo !== false && (a.percentual_valor_causa || a.valor_fixo)
          )
        }

        // Construir array de formas de pagamento JSONB
        const formasPagamentoJsonb = formas.map((forma, index) => ({
          forma,
          ordem: index,
        }))

        // Atualizar contrato com config e formas JSONB
        if (Object.keys(configJsonb).length > 0 || formasPagamentoJsonb.length > 0) {
          const { error: updateError } = await supabase
            .from('financeiro_contratos_honorarios')
            .update({
              config: Object.keys(configJsonb).length > 0 ? configJsonb : null,
              formas_pagamento: formasPagamentoJsonb.length > 0 ? formasPagamentoJsonb : null,
            })
            .eq('id', novoContrato.id)

          if (updateError) throw updateError
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
        // Atualizar escritório de cobrança se informado
        if (data.escritorio_id !== undefined) {
          updateData.escritorio_cobranca_id = data.escritorio_id !== escritorioAtivo
            ? data.escritorio_id
            : null
        }

        console.log('[updateContrato] Step 1: Atualizando dados básicos...', updateData)
        const { error: updateError } = await supabase
          .from('financeiro_contratos_honorarios')
          .update(updateData)
          .eq('id', id)
          .eq('escritorio_id', escritorioAtivo)

        if (updateError) {
          console.error('[updateContrato] Erro no Step 1:', updateError)
          throw updateError
        }

        // Atualizar formas de cobrança e config como JSONB
        const formas = data.formas_selecionadas || (data.forma_cobranca ? [data.forma_cobranca] : [])
        console.log('[updateContrato] Step 2: Atualizando config JSONB...', formas)

        // Construir objeto de configuração JSONB
        const configJsonb: Record<string, unknown> = {}

        // Valor Fixo
        if ((formas.includes('fixo') || formas.includes('misto')) && data.valor_fixo) {
          configJsonb.valor_fixo = data.valor_fixo
        }

        // Por Hora
        if ((formas.includes('por_hora') || formas.includes('misto')) && data.valor_hora) {
          configJsonb.valor_hora = data.valor_hora
          if (data.horas_estimadas) configJsonb.horas_estimadas = data.horas_estimadas
        }

        // Por Etapa
        if ((formas.includes('por_etapa') || formas.includes('misto')) && data.etapas_valores) {
          configJsonb.etapas_valores = data.etapas_valores
        }

        // Percentual de Êxito
        if (formas.includes('misto') && data.percentual_exito) {
          configJsonb.percentual_exito = data.percentual_exito
          if (data.valor_minimo_exito) configJsonb.valor_minimo_exito = data.valor_minimo_exito
        }

        // Por Pasta
        if (formas.includes('por_pasta') && data.valor_por_processo) {
          configJsonb.valor_por_processo = data.valor_por_processo
          if (data.dia_cobranca) configJsonb.dia_cobranca = data.dia_cobranca
        }

        // Por Cargo
        if (formas.includes('por_cargo') && data.valores_por_cargo) {
          configJsonb.valores_por_cargo = data.valores_por_cargo
        }

        // Por Ato
        if (formas.includes('por_ato') && data.atos_configurados) {
          configJsonb.atos_configurados = data.atos_configurados.filter(
            (a) => a.ativo !== false && (a.percentual_valor_causa || a.valor_fixo)
          )
        }

        // Construir array de formas de pagamento JSONB
        const formasPagamentoJsonb = formas.map((forma, index) => ({
          forma,
          ordem: index,
        }))

        // Atualizar contrato com config e formas JSONB
        const jsonbUpdateData: Record<string, unknown> = {}
        if (Object.keys(configJsonb).length > 0) {
          jsonbUpdateData.config = configJsonb
        }
        if (formasPagamentoJsonb.length > 0) {
          jsonbUpdateData.formas_pagamento = formasPagamentoJsonb
        }

        if (Object.keys(jsonbUpdateData).length > 0) {
          console.log('[updateContrato] Atualizando JSONB:', jsonbUpdateData)
          const { error: jsonbError } = await supabase
            .from('financeiro_contratos_honorarios')
            .update(jsonbUpdateData)
            .eq('id', id)
            .eq('escritorio_id', escritorioAtivo)

          if (jsonbError) {
            console.error('[updateContrato] Erro ao atualizar JSONB:', jsonbError)
            throw jsonbError
          }
        }

        // Nota: Tabelas auxiliares de cargo e atos foram removidas
        // Agora todos os dados ficam no JSONB config (já atualizado acima)

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
