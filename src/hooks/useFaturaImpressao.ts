import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export interface ItemFaturaImpressao {
  id: string
  tipo_item: 'honorario' | 'timesheet' | 'despesa'
  descricao: string
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number
  processo_id: string | null
  processo_numero: string | null
  processo_pasta: string | null
  partes_resumo: string | null
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

          return {
            id: `${faturaId}-item-${index}`,
            tipo_item: item.tipo === 'timesheet' ? 'timesheet' : item.tipo === 'honorario' ? 'honorario' : 'despesa',
            descricao: item.descricao || '',
            quantidade: item.horas || null,
            valor_unitario: item.valor_hora || null,
            valor_total: Number(item.valor) || 0,
            processo_id: item.processo_id || null,
            processo_numero: processo?.numero_cnj || null,
            processo_pasta: processo?.numero_pasta || null,
            partes_resumo:
              processo?.autor && processo?.reu
                ? `${processo.autor} vs ${processo.reu}`
                : null,
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

        // Extrair telefone e email do config do escritório (se existir)
        const config = escritorioData.config || {}

        return {
          escritorio: {
            id: escritorioData.id,
            nome: escritorioData.nome,
            cnpj: escritorioData.cnpj,
            logo_url: escritorioData.logo_url,
            endereco: escritorioData.endereco,
            telefone: config.telefone || null,
            email: config.email || null,
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
