import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ConfiguracaoFiscal,
  ImpostosCalculados,
  calcularImpostosLucroPresumido,
  ALIQUOTAS_LUCRO_PRESUMIDO,
  REGIME_TRIBUTARIO_LABELS,
} from '@/types/escritorio'

export interface EscritorioImpressao {
  id: string
  nome: string
  cnpj: string | null
  logo_url: string | null
  endereco: {
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    uf?: string
    cep?: string
  } | null
  telefone: string | null
  email: string | null
  config_fiscal: ConfiguracaoFiscal | null
}

export interface ClienteImpressao {
  id: string
  nome_completo: string
  nome_fantasia: string | null
  tipo_pessoa: 'pf' | 'pj'
  cpf_cnpj: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  email_principal: string | null
  telefone_principal: string | null
}

export interface FaturaImpressao {
  id: string
  numero_fatura: string
  data_emissao: string
  data_vencimento: string
  valor_total: number
  status: string
  observacoes: string | null
  total_honorarios: number
  total_horas: number
  soma_horas: number
}

// Processo para anexo do fechamento por pasta
export interface ProcessoAnexo {
  id: string
  numero_cnj: string | null
  numero_pasta: string | null
  titulo: string | null
  cliente_nome: string | null
}

export interface ItemFaturaImpressao {
  id: string
  tipo_item: 'honorario' | 'timesheet' | 'despesa' | 'pasta'
  descricao: string
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number
  processo_id: string | null
  processo_numero: string | null
  processo_pasta: string | null
  partes_resumo: string | null
  caso_titulo: string | null // "Autor x Réu" ou título da consulta
  // Campos de profissional (para timesheet)
  profissional_nome: string | null
  cargo_nome: string | null
  data_trabalho: string | null
  user_id: string | null
  // Campos para itens do tipo 'pasta' (fechamento mensal)
  competencia: string | null
  processos_lista: ProcessoAnexo[] | null
}

export interface FaturaImpressaoData {
  escritorio: EscritorioImpressao
  fatura: FaturaImpressao
  cliente: ClienteImpressao
  itens: ItemFaturaImpressao[]
  totais: {
    subtotal_honorarios: number
    subtotal_horas: number
    subtotal_despesas: number
    soma_horas: number
    valor_total: number
  }
  impostos: ImpostosCalculados | null
  regime_tributario_label: string | null
}

export function useFaturaImpressao() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFaturaCompleta = useCallback(
    async (faturaId: string): Promise<FaturaImpressaoData | null> => {
      try {
        setLoading(true)
        setError(null)

        // 1. Buscar fatura
        const { data: faturaData, error: faturaError } = await supabase
          .from('financeiro_faturamento_faturas')
          .select('*')
          .eq('id', faturaId)
          .single()

        if (faturaError) throw new Error('Fatura não encontrada')

        // 2. Buscar escritório
        const { data: escritorioData, error: escritorioError } = await supabase
          .from('escritorios')
          .select('id, nome, cnpj, logo_url, endereco, config')
          .eq('id', faturaData.escritorio_id)
          .single()

        if (escritorioError) throw new Error('Escritório não encontrado')

        // 3. Buscar cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from('crm_pessoas')
          .select(`
            id, nome_completo, nome_fantasia, tipo_pessoa, cpf_cnpj,
            logradouro, numero, complemento, bairro, cidade, uf, cep,
            email, telefone
          `)
          .eq('id', faturaData.cliente_id)
          .single()

        if (clienteError) throw new Error('Cliente não encontrado')

        // 4. Itens estão em JSONB na fatura
        const itensJsonb = faturaData.itens || []

        // Buscar dados de processos para os itens que têm processo_id
        const processosIds = itensJsonb
          .filter((item: any) => item.processo_id)
          .map((item: any) => item.processo_id)

        let processosMap: Record<string, any> = {}

        if (processosIds.length > 0) {
          const { data: processos } = await supabase
            .from('processos_processos')
            .select('id, numero_cnj, numero_pasta, autor, reu')
            .in('id', processosIds)

          processos?.forEach((p) => {
            processosMap[p.id] = p
          })
        }

        // Mapear itens JSONB para o formato de impressão
        const itens: ItemFaturaImpressao[] = itensJsonb.map((item: any, index: number) => {
          const processo = item.processo_id ? processosMap[item.processo_id] : null

          // Determinar tipo do item
          let tipoItem: ItemFaturaImpressao['tipo_item'] = 'despesa'
          if (item.tipo === 'timesheet') tipoItem = 'timesheet'
          else if (item.tipo === 'honorario') tipoItem = 'honorario'
          else if (item.tipo === 'pasta') tipoItem = 'pasta'

          return {
            id: `${faturaId}-item-${index}`,
            tipo_item: tipoItem,
            descricao: item.descricao || '',
            quantidade: tipoItem === 'pasta' ? (item.qtd_processos || null) : (item.horas || null),
            valor_unitario: tipoItem === 'pasta' ? (item.valor_unitario || null) : (item.valor_hora || null),
            valor_total: Number(item.valor) || 0,
            processo_id: item.processo_id || null,
            processo_numero: processo?.numero_cnj || null,
            processo_pasta: processo?.numero_pasta || null,
            partes_resumo:
              item.partes_resumo || (processo?.autor && processo?.reu
                ? `${processo.autor} vs ${processo.reu}`
                : null),
            caso_titulo: item.caso_titulo || item.partes_resumo || (processo?.autor && processo?.reu
                ? `${processo.autor} x ${processo.reu}`
                : null),
            // Campos de profissional (para timesheet)
            profissional_nome: item.profissional_nome || null,
            cargo_nome: item.cargo_nome || null,
            data_trabalho: item.data_trabalho || null,
            user_id: item.user_id || null,
            // Campos específicos para 'pasta'
            competencia: item.competencia || null,
            processos_lista: item.processos || null,
          }
        })

        // Calcular totais
        const subtotal_honorarios = itens
          .filter((i) => i.tipo_item === 'honorario')
          .reduce((sum, i) => sum + Number(i.valor_total), 0)

        const subtotal_horas = itens
          .filter((i) => i.tipo_item === 'timesheet')
          .reduce((sum, i) => sum + Number(i.valor_total), 0)

        const subtotal_despesas = itens
          .filter((i) => i.tipo_item === 'despesa')
          .reduce((sum, i) => sum + Number(i.valor_total), 0)

        const soma_horas = itens
          .filter((i) => i.tipo_item === 'timesheet')
          .reduce((sum, i) => sum + Number(i.quantidade || 0), 0)

        // Extrair telefone, email e config fiscal do escritório
        const config = escritorioData.config || {}
        const configFiscal: ConfiguracaoFiscal | null = config.fiscal || null

        // Calcular impostos baseado na configuração fiscal
        let impostosCalculados: ImpostosCalculados | null = null
        let regimeTributarioLabel: string | null = null

        if (configFiscal && configFiscal.exibir_impostos_fatura) {
          const valorTotal = Number(faturaData.valor_total)
          regimeTributarioLabel = REGIME_TRIBUTARIO_LABELS[configFiscal.regime_tributario]

          if (configFiscal.regime_tributario === 'lucro_presumido') {
            const impostos = configFiscal.lucro_presumido?.impostos || ALIQUOTAS_LUCRO_PRESUMIDO
            impostosCalculados = calcularImpostosLucroPresumido(valorTotal, impostos)
          } else if (configFiscal.regime_tributario === 'simples_nacional') {
            // No Simples Nacional, geralmente não há retenções na fatura
            // A tributação é paga pelo prestador via DAS
            const aliquotaEfetiva = configFiscal.simples_nacional?.aliquota_efetiva || 0
            impostosCalculados = {
              base_calculo: valorTotal,
              irrf: { aliquota: 0, valor: 0, retido: false },
              pis: { aliquota: 0, valor: 0, retido: false },
              cofins: { aliquota: 0, valor: 0, retido: false },
              csll: { aliquota: 0, valor: 0, retido: false },
              iss: { aliquota: 0, valor: 0, retido: false },
              inss: { aliquota: 0, valor: 0, retido: false },
              total_retencoes: 0,
              valor_liquido: valorTotal,
            }
          }
        }

        return {
          escritorio: {
            id: escritorioData.id,
            nome: escritorioData.nome,
            cnpj: escritorioData.cnpj,
            logo_url: escritorioData.logo_url,
            endereco: escritorioData.endereco,
            telefone: config.telefone || null,
            email: config.email || null,
            config_fiscal: configFiscal,
          },
          fatura: {
            id: faturaData.id,
            numero_fatura: faturaData.numero_fatura,
            data_emissao: faturaData.data_emissao,
            data_vencimento: faturaData.data_vencimento,
            valor_total: Number(faturaData.valor_total),
            status: faturaData.status,
            observacoes: faturaData.observacoes,
            total_honorarios: Number(faturaData.total_honorarios || 0),
            total_horas: Number(faturaData.total_horas || 0),
            soma_horas: Number(faturaData.soma_horas || 0),
          },
          cliente: {
            id: clienteData.id,
            nome_completo: clienteData.nome_completo,
            nome_fantasia: clienteData.nome_fantasia,
            tipo_pessoa: clienteData.tipo_pessoa,
            cpf_cnpj: clienteData.cpf_cnpj,
            logradouro: clienteData.logradouro,
            numero: clienteData.numero,
            complemento: clienteData.complemento,
            bairro: clienteData.bairro,
            cidade: clienteData.cidade,
            uf: clienteData.uf,
            cep: clienteData.cep,
            email_principal: clienteData.email,
            telefone_principal: clienteData.telefone,
          },
          itens,
          totais: {
            subtotal_honorarios,
            subtotal_horas,
            subtotal_despesas,
            soma_horas,
            valor_total: Number(faturaData.valor_total),
          },
          impostos: impostosCalculados,
          regime_tributario_label: regimeTributarioLabel,
        }
      } catch (err: any) {
        setError(err.message)
        console.error('Erro ao carregar fatura para impressão:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  return {
    loading,
    error,
    loadFaturaCompleta,
  }
}
