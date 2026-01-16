'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscritorioAtivo } from '@/hooks/useEscritorioAtivo'

// Tipos baseados nas tabelas do banco
export type FormaCobranca = 'fixo' | 'por_hora' | 'por_etapa' | 'misto' | 'por_pasta' | 'por_ato' | 'por_cargo'

export interface ContratoHonorario {
  id: string
  escritorio_id: string
  numero_contrato: string
  cliente_id: string
  cliente_nome?: string
  tipo_servico: 'processo' | 'consultoria' | 'avulso' | 'misto'
  forma_cobranca: FormaCobranca
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
      // Buscar contratos com join em crm_pessoas (clientes)
      const { data: contratosData, error: contratosError } = await supabase
        .from('financeiro_contratos_honorarios')
        .select(`
          *,
          crm_pessoas (
            nome_completo
          ),
          financeiro_contratos_honorarios_config (
            id,
            tipo_config,
            valor_fixo,
            valor_hora,
            valor_por_processo,
            dia_cobranca,
            descricao
          )
        `)
        .eq('escritorio_id', escritorioAtivo)
        .order('created_at', { ascending: false })

      if (contratosError) throw contratosError

      // Para cada contrato, buscar dados de honorários e parcelas
      const contratosComDados: ContratoHonorario[] = await Promise.all(
        (contratosData || []).map(async (contrato) => {
          // Buscar honorários do contrato
          const { data: honorariosData } = await supabase
            .from('financeiro_honorarios')
            .select(`
              id,
              valor_total,
              parcelado,
              numero_parcelas,
              financeiro_honorarios_parcelas (
                id,
                numero_parcela,
                valor,
                data_vencimento,
                valor_pago,
                status,
                dias_atraso
              )
            `)
            .eq('contrato_id', contrato.id)

          // Calcular valores
          let valorTotal = 0
          let valorRecebido = 0
          let valorPendente = 0
          let parcelasPagas = 0
          let totalParcelas = 0
          let inadimplente = false
          let diasAtraso = 0
          let proximaParcela: ContratoHonorario['proxima_parcela'] = undefined

          if (honorariosData && honorariosData.length > 0) {
            honorariosData.forEach((hon) => {
              valorTotal += Number(hon.valor_total) || 0

              if (hon.financeiro_honorarios_parcelas) {
                hon.financeiro_honorarios_parcelas.forEach((parcela) => {
                  totalParcelas++
                  if (parcela.status === 'pago') {
                    parcelasPagas++
                    valorRecebido += Number(parcela.valor_pago) || 0
                  } else if (parcela.status === 'pendente' || parcela.status === 'atrasado') {
                    valorPendente += Number(parcela.valor) || 0
                    if (parcela.status === 'atrasado') {
                      inadimplente = true
                      diasAtraso = Math.max(diasAtraso, Number(parcela.dias_atraso) || 0)
                    }
                    // Próxima parcela pendente
                    if (!proximaParcela) {
                      proximaParcela = {
                        numero: parcela.numero_parcela,
                        valor: Number(parcela.valor),
                        vencimento: parcela.data_vencimento,
                      }
                    }
                  }
                })
              }
            })
          }

          // Se não há honorários, calcular valor estimado da config
          if (valorTotal === 0 && contrato.financeiro_contratos_honorarios_config) {
            contrato.financeiro_contratos_honorarios_config.forEach((config: ContratoConfig) => {
              if (config.valor_fixo) {
                valorTotal += Number(config.valor_fixo)
              }
              if (config.valor_hora && config.horas_estimadas) {
                valorTotal += Number(config.valor_hora) * Number(config.horas_estimadas)
              }
              if (config.etapas_valores) {
                Object.values(config.etapas_valores).forEach((v) => {
                  valorTotal += Number(v) || 0
                })
              }
            })
            valorPendente = valorTotal
          }

          return {
            id: contrato.id,
            escritorio_id: contrato.escritorio_id,
            numero_contrato: contrato.numero_contrato,
            cliente_id: contrato.cliente_id,
            cliente_nome: contrato.crm_pessoas?.nome_completo || 'Cliente não encontrado',
            tipo_servico: contrato.tipo_contrato, // mapeia tipo_contrato do DB para tipo_servico da interface
            forma_cobranca: contrato.forma_cobranca,
            ativo: contrato.ativo,
            data_inicio: contrato.data_inicio,
            data_fim: contrato.data_fim,
            arquivo_contrato_url: null,
            observacoes: contrato.descricao, // mapeia descricao do DB para observacoes da interface
            created_at: contrato.created_at,
            updated_at: contrato.updated_at,
            config: contrato.financeiro_contratos_honorarios_config,
            valor_total: valorTotal,
            valor_recebido: valorRecebido,
            valor_pendente: valorPendente,
            parcelas_pagas: parcelasPagas,
            total_parcelas: totalParcelas,
            inadimplente,
            dias_atraso: diasAtraso,
            proxima_parcela: proximaParcela,
          }
        })
      )

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

        // Criar contrato
        const { data: novoContrato, error: contratoError } = await supabase
          .from('financeiro_contratos_honorarios')
          .insert({
            escritorio_id: escritorioAtivo,
            numero_contrato: numeroContrato,
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

        // Salvar MÚLTIPLAS formas de cobrança na tabela financeiro_contratos_formas
        const formas = data.formas_selecionadas || [data.forma_cobranca]
        if (formas.length > 0) {
          const formasToInsert = formas.map((forma, index) => ({
            contrato_id: novoContrato.id,
            forma_cobranca: forma,
            ativo: true,
            ordem: index,
          }))

          const { error: formasError } = await supabase
            .from('financeiro_contratos_formas')
            .insert(formasToInsert)

          if (formasError) throw formasError
        }

        // Criar configuração baseada nas formas selecionadas
        // Colunas disponíveis: contrato_id, tipo_config, valor_fixo, valor_hora, valor_por_processo, dia_cobranca, descricao, escritorio_id
        const configsToInsert: Array<{
          contrato_id: string
          escritorio_id: string
          tipo_config: string
          valor_fixo?: number | null
          valor_hora?: number | null
          valor_por_processo?: number | null
          dia_cobranca?: number | null
          descricao?: string | null
        }> = []

        // Valor Fixo
        if ((formas.includes('fixo') || formas.includes('misto')) && data.valor_fixo) {
          configsToInsert.push({
            contrato_id: novoContrato.id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'fixo',
            valor_fixo: data.valor_fixo,
          })
        }

        // Por Hora
        if ((formas.includes('por_hora') || formas.includes('misto')) && data.valor_hora) {
          configsToInsert.push({
            contrato_id: novoContrato.id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'hora',
            valor_hora: data.valor_hora,
            descricao: data.horas_estimadas ? `Horas estimadas: ${data.horas_estimadas}` : null,
          })
        }

        // Por Etapa - armazenar valores na descrição como JSON
        if ((formas.includes('por_etapa') || formas.includes('misto')) && data.etapas_valores) {
          const etapasValidas = Object.entries(data.etapas_valores).filter(([, v]) => v > 0)
          if (etapasValidas.length > 0) {
            configsToInsert.push({
              contrato_id: novoContrato.id,
              escritorio_id: escritorioAtivo,
              tipo_config: 'etapa',
              descricao: JSON.stringify(data.etapas_valores),
            })
          }
        }

        // Percentual de Êxito - armazenar na descrição
        if (formas.includes('misto') && data.percentual_exito) {
          configsToInsert.push({
            contrato_id: novoContrato.id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'exito',
            descricao: JSON.stringify({
              percentual: data.percentual_exito,
              valor_minimo: data.valor_minimo_exito || null,
            }),
          })
        }

        // Por Pasta - valor por processo e dia de cobrança
        if (formas.includes('por_pasta') && data.valor_por_processo) {
          configsToInsert.push({
            contrato_id: novoContrato.id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'pasta',
            valor_por_processo: data.valor_por_processo,
            dia_cobranca: data.dia_cobranca || null,
          })
        }

        // Inserir configurações
        if (configsToInsert.length > 0) {
          const { error: configError } = await supabase
            .from('financeiro_contratos_honorarios_config')
            .insert(configsToInsert)

          if (configError) throw configError
        }

        // Por Cargo - inserir valores negociados
        if (formas.includes('por_cargo') && data.valores_por_cargo) {
          const valoresCargo = data.valores_por_cargo
            .filter((v) => v.valor_negociado !== null && v.valor_negociado !== undefined)
            .map((v) => ({
              contrato_id: novoContrato.id,
              cargo_id: v.cargo_id,
              valor_hora_negociado: v.valor_negociado,
            }))

          if (valoresCargo.length > 0) {
            const { error: cargoError } = await supabase
              .from('financeiro_contratos_valores_cargo')
              .insert(valoresCargo)

            if (cargoError) throw cargoError
          }
        }

        // Por Ato - inserir configuração de atos
        if (formas.includes('por_ato') && data.atos_configurados) {
          const atosConfig = data.atos_configurados
            .filter((a) => a.ativo !== false && (a.percentual_valor_causa || a.valor_fixo))
            .map((a) => ({
              contrato_id: novoContrato.id,
              ato_tipo_id: a.ato_tipo_id,
              percentual_valor_causa: a.percentual_valor_causa || null,
              valor_fixo: a.valor_fixo || null,
            }))

          if (atosConfig.length > 0) {
            const { error: atoError } = await supabase
              .from('financeiro_contratos_atos')
              .insert(atosConfig)

            if (atoError) throw atoError
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
        if (data.tipo_servico) updateData.tipo_contrato = data.tipo_servico
        if (data.forma_cobranca) updateData.forma_cobranca = data.forma_cobranca
        if (data.data_inicio) updateData.data_inicio = data.data_inicio
        if (data.data_fim !== undefined) updateData.data_fim = data.data_fim || null
        if (data.observacoes !== undefined) updateData.descricao = data.observacoes || null

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

        // Atualizar formas de cobrança se foram alteradas
        const formas = data.formas_selecionadas || (data.forma_cobranca ? [data.forma_cobranca] : [])
        console.log('[updateContrato] Step 2: Atualizando formas de cobrança...', formas)

        if (formas.length > 0) {
          // Remover formas antigas
          const { error: deleteFormasError, count: deletedCount } = await supabase
            .from('financeiro_contratos_formas')
            .delete()
            .eq('contrato_id', id)

          console.log('[updateContrato] Delete formas result:', { deletedCount, deleteFormasError })

          if (deleteFormasError) {
            console.error('[updateContrato] Erro ao deletar formas antigas:', {
              message: deleteFormasError.message,
              code: deleteFormasError.code,
              details: deleteFormasError.details,
              hint: deleteFormasError.hint,
            })
            throw deleteFormasError
          }

          // Inserir novas formas
          const formasToInsert = formas.map((forma, index) => ({
            contrato_id: id,
            forma_cobranca: forma,
            ativo: true,
            ordem: index,
          }))

          console.log('[updateContrato] Inserindo formas:', JSON.stringify(formasToInsert))

          const { error: formasError, data: insertedFormas } = await supabase
            .from('financeiro_contratos_formas')
            .insert(formasToInsert)
            .select()

          console.log('[updateContrato] Insert formas result:', { insertedFormas, formasError })

          if (formasError) {
            console.error('[updateContrato] Erro ao inserir novas formas:', {
              message: formasError.message,
              code: formasError.code,
              details: formasError.details,
              hint: formasError.hint,
              name: formasError.name,
            })
            throw new Error(`Erro ao salvar formas de cobrança: ${formasError.message || formasError.code || 'Erro desconhecido'}`)
          }
        }

        // Remover configurações antigas e inserir novas
        console.log('[updateContrato] Step 3: Atualizando configurações...')
        const { error: deleteConfigError } = await supabase
          .from('financeiro_contratos_honorarios_config')
          .delete()
          .eq('contrato_id', id)

        if (deleteConfigError) {
          console.error('[updateContrato] Erro ao deletar configs antigas:', deleteConfigError)
          throw deleteConfigError
        }

        // Inserir novas configurações
        // Colunas disponíveis na tabela: contrato_id, escritorio_id, tipo_config, valor_fixo, valor_hora, valor_por_processo, dia_cobranca, descricao
        const configsToInsert: Array<{
          contrato_id: string
          escritorio_id: string
          tipo_config: string
          valor_fixo?: number | null
          valor_hora?: number | null
          valor_por_processo?: number | null
          dia_cobranca?: number | null
          descricao?: string | null
        }> = []

        // Valor Fixo
        if ((formas.includes('fixo') || formas.includes('misto')) && data.valor_fixo) {
          configsToInsert.push({
            contrato_id: id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'fixo',
            valor_fixo: data.valor_fixo,
          })
        }

        // Por Hora
        if ((formas.includes('por_hora') || formas.includes('misto')) && data.valor_hora) {
          configsToInsert.push({
            contrato_id: id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'hora',
            valor_hora: data.valor_hora,
            // Nota: horas_estimadas não existe na tabela, armazenar na descrição se necessário
            descricao: data.horas_estimadas ? `Horas estimadas: ${data.horas_estimadas}` : null,
          })
        }

        // Por Etapa - armazenar valores na descrição como JSON
        if ((formas.includes('por_etapa') || formas.includes('misto')) && data.etapas_valores) {
          const etapasValidas = Object.entries(data.etapas_valores).filter(([, v]) => v > 0)
          if (etapasValidas.length > 0) {
            configsToInsert.push({
              contrato_id: id,
              escritorio_id: escritorioAtivo,
              tipo_config: 'etapa',
              descricao: JSON.stringify(data.etapas_valores),
            })
          }
        }

        // Percentual de Êxito - armazenar na descrição
        if (formas.includes('misto') && data.percentual_exito) {
          configsToInsert.push({
            contrato_id: id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'exito',
            descricao: JSON.stringify({
              percentual: data.percentual_exito,
              valor_minimo: data.valor_minimo_exito || null,
            }),
          })
        }

        // Por Pasta
        if (formas.includes('por_pasta') && data.valor_por_processo) {
          configsToInsert.push({
            contrato_id: id,
            escritorio_id: escritorioAtivo,
            tipo_config: 'pasta',
            valor_por_processo: data.valor_por_processo,
            dia_cobranca: data.dia_cobranca || null,
          })
        }

        if (configsToInsert.length > 0) {
          console.log('[updateContrato] Inserindo configs:', configsToInsert)
          const { error: configError } = await supabase
            .from('financeiro_contratos_honorarios_config')
            .insert(configsToInsert)

          if (configError) {
            console.error('[updateContrato] Erro ao inserir configs:', configError)
            throw configError
          }
        }

        // Atualizar valores por cargo
        if (formas.includes('por_cargo')) {
          console.log('[updateContrato] Step 4: Atualizando valores por cargo...')
          // Remover valores antigos
          const { error: deleteCargoError } = await supabase
            .from('financeiro_contratos_valores_cargo')
            .delete()
            .eq('contrato_id', id)

          if (deleteCargoError) {
            console.error('[updateContrato] Erro ao deletar valores cargo antigos:', deleteCargoError)
            throw deleteCargoError
          }

          // Inserir novos valores
          if (data.valores_por_cargo && data.valores_por_cargo.length > 0) {
            const valoresCargo = data.valores_por_cargo
              .filter((v) => v.valor_negociado !== null && v.valor_negociado !== undefined)
              .map((v) => ({
                contrato_id: id,
                cargo_id: v.cargo_id,
                valor_hora_negociado: v.valor_negociado,
              }))

            if (valoresCargo.length > 0) {
              console.log('[updateContrato] Inserindo valores cargo:', valoresCargo)
              const { error: cargoError } = await supabase
                .from('financeiro_contratos_valores_cargo')
                .insert(valoresCargo)

              if (cargoError) {
                console.error('[updateContrato] Erro ao inserir valores cargo:', cargoError)
                throw cargoError
              }
            }
          }
        }

        // Atualizar atos configurados
        if (formas.includes('por_ato')) {
          console.log('[updateContrato] Step 5: Atualizando atos configurados...')
          // Remover atos antigos
          const { error: deleteAtosError } = await supabase
            .from('financeiro_contratos_atos')
            .delete()
            .eq('contrato_id', id)

          if (deleteAtosError) {
            console.error('[updateContrato] Erro ao deletar atos antigos:', deleteAtosError)
            throw deleteAtosError
          }

          // Inserir novos atos (apenas os ativos)
          if (data.atos_configurados && data.atos_configurados.length > 0) {
            const atosConfig = data.atos_configurados
              .filter((a) => a.ativo !== false && (a.percentual_valor_causa || a.valor_fixo))
              .map((a) => ({
                contrato_id: id,
                ato_tipo_id: a.ato_tipo_id,
                percentual_valor_causa: a.percentual_valor_causa || null,
                valor_fixo: a.valor_fixo || null,
              }))

            if (atosConfig.length > 0) {
              console.log('[updateContrato] Inserindo atos:', atosConfig)
              const { error: atoError } = await supabase
                .from('financeiro_contratos_atos')
                .insert(atosConfig)

              if (atoError) {
                console.error('[updateContrato] Erro ao inserir atos:', atoError)
                throw atoError
              }
            }
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
